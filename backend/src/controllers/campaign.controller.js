const { pool } = require("../db");
// PDF export (server-side)
let PDFDocument;
try {
  // pdfkit is a lightweight dependency; install with: npm i pdfkit
  // eslint-disable-next-line global-require
  PDFDocument = require("pdfkit");
} catch (e) {
  PDFDocument = null;
}

// ======================
// Quarentena de Itens (estado por campanha)
// ======================
const QUARANTINE_STATUS = new Set(["pending", "approved", "blocked"]);

// ======================
// Acesso / Visibilidade da Campanha
// access_type: 'open' | 'invite_only' | 'request_approval'
// ======================
const ACCESS_TYPES = new Set(["open", "invite_only", "request_approval"]);

/**
 * Garante que o schema mínimo para compartilhamento existe.
 * - campaigns.access_type
 * - campaign_members
 * - campaign_join_requests
 * Observação: é idempotente e seguro para rodar em runtime (ambiente dev / MVP).
 */
async function ensureCampaignAccessSchema(db = pool) {
  // 1) access_type na tabela campaigns
  await db.query(`
    ALTER TABLE campaigns
    ADD COLUMN IF NOT EXISTS access_type TEXT NOT NULL DEFAULT 'invite_only'
  `);

  // 2) Tabela de membros (entrada sem personagem)
  await db.query(`
    CREATE TABLE IF NOT EXISTS campaign_members (
      campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role TEXT NOT NULL DEFAULT 'player' CHECK (role IN ('master','player')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (campaign_id, user_id)
    )
  `);

  // 3) Tabela de solicitações (modo request_approval)
  await db.query(`
    CREATE TABLE IF NOT EXISTS campaign_join_requests (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      resolved_at TIMESTAMPTZ,
      resolved_by UUID REFERENCES users(id),
      UNIQUE (campaign_id, user_id)
    )
  `);
}


// ==========================================
// NOVO: Participantes da campanha (para Chat/Dropdown/Presence)
// GET /campaigns/:id/participants (e alias /players)
// - Retorna owner + membros + donos de personagens vinculados + convites aceitos (compat)
// ==========================================
exports.getParticipants = async (req, res) => {
  const { id: campaignId } = req.params;
  const userId = req.userId;

  try {
    await ensureCampaignAccessSchema();

    // campanha + owner
    const campRes = await pool.query(
      `SELECT id, owner_id, access_type, is_active FROM campaigns WHERE id = $1`,
      [campaignId]
    );

    if (campRes.rowCount === 0) {
      return res.status(404).json({ error: "Campanha não encontrada." });
    }

    const ownerId = String(campRes.rows[0].owner_id);

    // Permissão mínima: GM ou participante (member, convite aceito, ou personagem vinculado)
    const permRes = await pool.query(
      `
      SELECT
        CASE
          WHEN c.owner_id = $2 THEN true
          WHEN EXISTS (
            SELECT 1 FROM campaign_members cm
            WHERE cm.campaign_id = c.id AND cm.user_id = $2
          ) THEN true
          WHEN EXISTS (
            SELECT 1 FROM campaign_invitations ci
            WHERE ci.campaign_id = c.id AND ci.to_user_id = $2 AND ci.status = 'accepted'
          ) THEN true
          WHEN EXISTS (
            SELECT 1
              FROM campaign_characters cc
              JOIN characters ch ON ch.id = cc.character_id
             WHERE cc.campaign_id = c.id AND ch.user_id = $2
          ) THEN true
          ELSE false
        END AS allowed
      FROM campaigns c
      WHERE c.id = $1
      LIMIT 1
      `,
      [campaignId, userId]
    );

    if (!permRes.rowCount || permRes.rows[0].allowed !== true) {
      return res.status(403).json({ error: "Sem permissão para ver participantes." });
    }

    // Consolida participantes
    const q = await pool.query(
      `
      WITH ids AS (
        -- GM (owner)
        SELECT c.owner_id::uuid AS user_id
          FROM campaigns c
         WHERE c.id = $1

        UNION

        -- Membros
        SELECT cm.user_id::uuid AS user_id
          FROM campaign_members cm
         WHERE cm.campaign_id = $1

        UNION

        -- Donos de personagens vinculados (compat)
        SELECT ch.user_id::uuid AS user_id
          FROM campaign_characters cc
          JOIN characters ch ON ch.id = cc.character_id
         WHERE cc.campaign_id = $1

        UNION

        -- Convites aceitos (compat)
        SELECT ci.to_user_id::uuid AS user_id
          FROM campaign_invitations ci
         WHERE ci.campaign_id = $1 AND ci.status = 'accepted'
      )
      SELECT
        u.id,
        u.username,
        u.email,
        CASE
          WHEN u.id = (SELECT owner_id FROM campaigns WHERE id = $1) THEN 'master'
          ELSE 'player'
        END AS role
      FROM ids
      JOIN users u ON u.id = ids.user_id
      GROUP BY u.id, u.username, u.email
      ORDER BY
        CASE WHEN u.id = (SELECT owner_id FROM campaigns WHERE id = $1) THEN 0 ELSE 1 END,
        u.username ASC
      `,
      [campaignId]
    );

    const participants = q.rows.map((r) => ({
      id: String(r.id),
      name: r.username || r.email || String(r.id).slice(0, 8),
      role: r.role,
    }));

    return res.json({
      campaignId: String(campaignId),
      owner_id: ownerId,
      participants,
    });
  } catch (error) {
    console.error("Erro getParticipants:", error);
    return res.status(500).json({ error: "Erro ao buscar participantes." });
  }
};

async function bootstrapQuarantine(client, campaignId, characterId, sheetData) {
  const inv = Array.isArray(sheetData?.inventory) ? sheetData.inventory : [];
  const itemIds = inv
    .map((it) => (it?.id !== undefined && it?.id !== null ? String(it.id) : null))
    .filter(Boolean);

  if (itemIds.length === 0) return;

  // Reutiliza decisões anteriores: não sobrescreve status existente
  await client.query(
    `INSERT INTO campaign_character_item_state (campaign_id, character_id, item_id, status)
     SELECT $1, $2, UNNEST($3::text[]), 'pending'
     ON CONFLICT (campaign_id, character_id, item_id) DO NOTHING`,
    [campaignId, characterId, itemIds]
  );
}

// ==========================================
// 1. CRIAR CAMPANHA
// ==========================================
exports.create = async (req, res) => {
  try {
    const { name, description, access_type } = req.body;
    const accessType = ACCESS_TYPES.has(access_type) ? access_type : "invite_only";

    await ensureCampaignAccessSchema();

    const ownerId = req.userId;

    if (!name) return res.status(400).json({ error: "Nome é obrigatório." });

    const result = await pool.query(
      `INSERT INTO campaigns (id, owner_id, name, description, access_type, created_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW())
       RETURNING *`,
      [ownerId, name, description, accessType]
    );

    // (Opcional, mas útil) GM como membro também, para facilitar fluxo novo
    try {
      await pool.query(
        `INSERT INTO campaign_members (campaign_id, user_id, role)
         VALUES ($1, $2, 'master')
         ON CONFLICT (campaign_id, user_id) DO NOTHING`,
        [result.rows[0].id, ownerId]
      );
    } catch (e) {
      // Sem erro fatal: caso tabela não exista (mas ensure já garante), ou ambientes antigos.
    }

    return res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Erro ao criar campanha:", error);
    return res.status(500).json({ error: "Erro ao criar campanha." });
  }
};

// ==========================================
// 2. LISTAR CAMPANHAS (MESTRE, MEMBRO, PÚBLICAS)
// ==========================================
exports.list = async (req, res) => {
  try {
    const userId = req.userId;
    console.log(`[DEBUG] Listando campanhas para usuário: ${userId}`);

    await ensureCampaignAccessSchema();

    // Retorna:
    // - campanhas onde sou mestre (owner_id)
    // - campanhas onde sou membro (campaign_members) OU convite aceito (compat)
    // - campanhas públicas (open/request_approval) exceto se fui rejeitado
    // Também devolve join_request_status para UI (pending/approved/rejected)
    const query = `
      SELECT
        c.*,
        CASE
          WHEN c.owner_id = $1 THEN 'master'
          WHEN cm.user_id IS NOT NULL THEN 'player'
          WHEN ci.to_user_id IS NOT NULL THEN 'player'
          ELSE NULL
        END AS my_role,
        jr.status AS join_request_status
      FROM campaigns c
      LEFT JOIN campaign_members cm
        ON cm.campaign_id = c.id AND cm.user_id = $1
      LEFT JOIN campaign_invitations ci
        ON ci.campaign_id = c.id AND ci.to_user_id = $1 AND ci.status = 'accepted'
      LEFT JOIN campaign_join_requests jr
        ON jr.campaign_id = c.id AND jr.user_id = $1
      WHERE
        c.owner_id = $1
        OR cm.user_id IS NOT NULL
        OR ci.to_user_id IS NOT NULL
        OR (
          c.access_type IN ('open','request_approval')
          AND COALESCE(jr.status, '') <> 'rejected'
        )
      ORDER BY c.created_at DESC
    `;

    const result = await pool.query(query, [userId]);
    return res.json({ campaigns: result.rows });
  } catch (error) {
    console.error("Erro ao listar campanhas:", error);
    return res.status(500).json({ error: "Erro ao listar campanhas." });
  }
};

// ==========================================
// 3. BUSCAR CAMPANHA POR ID
// ==========================================
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`SELECT * FROM campaigns WHERE id = $1`, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Campanha não encontrada." });
    }
    const campaign = result.rows[0];
    return res.json({ campaign });
  } catch (error) {
    console.error("Erro getById:", error);
    return res.status(500).json({ error: "Erro ao buscar campanha." });
  }
};

// ==========================================
// 4. ATUALIZAR CAMPANHA (Genérico)
// ==========================================
exports.updateCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, access_type } = req.body;
    const userId = req.userId;

    await ensureCampaignAccessSchema();

    const check = await pool.query(`SELECT owner_id FROM campaigns WHERE id = $1`, [id]);
    if (check.rows.length === 0) return res.status(404).json({ error: "Campanha não encontrada." });
    if (check.rows[0].owner_id !== userId) return res.status(403).json({ error: "Sem permissão." });

    const accessType = ACCESS_TYPES.has(access_type) ? access_type : null;

    const result = await pool.query(
      `UPDATE campaigns
         SET name = COALESCE($1, name),
             description = COALESCE($2, description),
             access_type = COALESCE($3, access_type)
       WHERE id = $4
       RETURNING *`,
      [name, description, accessType, id]
    );

    return res.json(result.rows[0]);
  } catch (error) {
    console.error("Erro updateCampaign:", error);
    return res.status(500).json({ error: "Erro ao atualizar campanha." });
  }
};

// ==========================================
// 5. DELETAR CAMPANHA
// ==========================================
exports.deleteCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const check = await pool.query(`SELECT owner_id FROM campaigns WHERE id = $1`, [id]);
    if (check.rows.length === 0) return res.status(404).json({ error: "Campanha não encontrada." });
    if (check.rows[0].owner_id !== userId) return res.status(403).json({ error: "Sem permissão." });

    await pool.query(`DELETE FROM campaign_characters WHERE campaign_id = $1`, [id]);
    await pool.query(`DELETE FROM campaign_invitations WHERE campaign_id = $1`, [id]);

    // Novas tabelas (se existirem)
    try {
      await pool.query(`DELETE FROM campaign_members WHERE campaign_id = $1`, [id]);
      await pool.query(`DELETE FROM campaign_join_requests WHERE campaign_id = $1`, [id]);
    } catch (e) {}

    await pool.query(`DELETE FROM campaigns WHERE id = $1`, [id]);

    return res.json({ message: "Campanha excluída." });
  } catch (error) {
    console.error("Erro deleteCampaign:", error);
    return res.status(500).json({ error: "Erro ao excluir campanha." });
  }
};

// ==========================================
// 5.1 ENTRAR EM CAMPANHA ABERTA (SEM PERSONAGEM)
// POST /campaigns/:id/join
// ==========================================
exports.joinOpenCampaign = async (req, res) => {
  const userId = req.userId;
  const { id: campaignId } = req.params;

  try {
    await ensureCampaignAccessSchema();

    const cRes = await pool.query(
      `SELECT id, owner_id, access_type, is_active FROM campaigns WHERE id = $1`,
      [campaignId]
    );

    if (cRes.rowCount === 0) return res.status(404).json({ message: "Campanha não encontrada." });

    const camp = cRes.rows[0];
    if (camp.is_active === false) return res.status(409).json({ message: "Campanha finalizada/inativa." });

    if (String(camp.owner_id) === String(userId)) {
      return res.json({ ok: true, role: "master" });
    }

    if (camp.access_type !== "open") {
      return res.status(403).json({ message: "Esta campanha não permite entrada direta." });
    }

    await pool.query(
      `INSERT INTO campaign_members (campaign_id, user_id, role)
       VALUES ($1, $2, 'player')
       ON CONFLICT (campaign_id, user_id) DO NOTHING`,
      [campaignId, userId]
    );

    return res.json({ ok: true, role: "player" });
  } catch (error) {
    console.error("Erro joinOpenCampaign:", error);
    return res.status(500).json({ message: "Erro ao entrar na campanha." });
  }
};

// ==========================================
// 5.2 SOLICITAR ENTRADA (CAMPANHA POR APROVAÇÃO)
// POST /campaigns/:id/join-requests
// ==========================================
exports.createJoinRequest = async (req, res) => {
  const userId = req.userId;
  const { id: campaignId } = req.params;

  try {
    await ensureCampaignAccessSchema();

    const cRes = await pool.query(
      `SELECT id, owner_id, access_type, is_active FROM campaigns WHERE id = $1`,
      [campaignId]
    );

    if (cRes.rowCount === 0) return res.status(404).json({ message: "Campanha não encontrada." });

    const camp = cRes.rows[0];
    if (camp.is_active === false) return res.status(409).json({ message: "Campanha finalizada/inativa." });

    if (String(camp.owner_id) === String(userId)) {
      return res.status(400).json({ message: "Você já é o mestre desta campanha." });
    }

    if (camp.access_type !== "request_approval") {
      return res.status(403).json({ message: "Esta campanha não aceita solicitações." });
    }

    // Se já for membro, ok
    const mRes = await pool.query(
      `SELECT 1 FROM campaign_members WHERE campaign_id = $1 AND user_id = $2`,
      [campaignId, userId]
    );
    if (mRes.rowCount > 0) {
      return res.json({ ok: true, status: "approved" });
    }

    // Se já tem request, aplica regras
    const jrRes = await pool.query(
      `SELECT id, status FROM campaign_join_requests WHERE campaign_id = $1 AND user_id = $2`,
      [campaignId, userId]
    );

    if (jrRes.rowCount > 0) {
      const status = jrRes.rows[0].status;
      if (status === "rejected") {
        // Sua regra: rejeitado não vê mais a campanha
        return res.status(403).json({ message: "Solicitação rejeitada. Esta campanha não está disponível para você." });
      }
      return res.json({ ok: true, status });
    }

    const ins = await pool.query(
      `INSERT INTO campaign_join_requests (campaign_id, user_id, status)
       VALUES ($1, $2, 'pending')
       RETURNING id, status, created_at`,
      [campaignId, userId]
    );

    // Notificação em tempo real para o GM (padrão: sala do usuário)
    if (req.io) {
      req.io.to(`user:${camp.owner_id}`).emit("campaign_join_request_update");
    }

    return res.status(201).json({ ok: true, request: ins.rows[0] });
  } catch (error) {
    console.error("Erro createJoinRequest:", error);
    return res.status(500).json({ message: "Erro ao criar solicitação." });
  }
};

// ==========================================
// 5.3 LISTAR SOLICITAÇÕES PENDENTES (GM)
// GET /campaigns/:id/join-requests
// ==========================================
exports.listJoinRequests = async (req, res) => {
  const userId = req.userId;
  const { id: campaignId } = req.params;

  try {
    await ensureCampaignAccessSchema();

    const cRes = await pool.query(
      `SELECT owner_id FROM campaigns WHERE id = $1`,
      [campaignId]
    );
    if (cRes.rowCount === 0) return res.status(404).json({ message: "Campanha não encontrada." });

    if (String(cRes.rows[0].owner_id) !== String(userId)) {
      return res.status(403).json({ message: "Apenas o mestre pode ver solicitações." });
    }

    const r = await pool.query(
      `SELECT
         jr.id,
         jr.user_id,
         jr.status,
         jr.created_at,
         u.username,
         u.email
       FROM campaign_join_requests jr
       JOIN users u ON u.id = jr.user_id
       WHERE jr.campaign_id = $1 AND jr.status = 'pending'
       ORDER BY jr.created_at ASC`,
      [campaignId]
    );

    return res.json({ requests: r.rows });
  } catch (error) {
    console.error("Erro listJoinRequests:", error);
    return res.status(500).json({ message: "Erro ao listar solicitações." });
  }
};

// ==========================================
// 5.4 APROVAR SOLICITAÇÃO (GM)
// POST /campaigns/join-requests/:requestId/approve
// ==========================================
exports.approveJoinRequest = async (req, res) => {
  const userId = req.userId;
  const { requestId } = req.params;

  const client = await pool.connect();
  try {
    await ensureCampaignAccessSchema(client);

    await client.query("BEGIN");

    const rRes = await client.query(
      `SELECT jr.id, jr.campaign_id, jr.user_id, jr.status, c.owner_id
       FROM campaign_join_requests jr
       JOIN campaigns c ON c.id = jr.campaign_id
       WHERE jr.id = $1
       FOR UPDATE`,
      [requestId]
    );

    if (rRes.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Solicitação não encontrada." });
    }

    const row = rRes.rows[0];
    if (String(row.owner_id) !== String(userId)) {
      await client.query("ROLLBACK");
      return res.status(403).json({ message: "Apenas o mestre pode aprovar." });
    }

    if (row.status !== "pending") {
      await client.query("ROLLBACK");
      return res.json({ ok: true, status: row.status });
    }

    await client.query(
      `UPDATE campaign_join_requests
       SET status = 'approved', resolved_at = now(), resolved_by = $1
       WHERE id = $2`,
      [userId, requestId]
    );

    await client.query(
      `INSERT INTO campaign_members (campaign_id, user_id, role)
       VALUES ($1, $2, 'player')
       ON CONFLICT (campaign_id, user_id) DO NOTHING`,
      [row.campaign_id, row.user_id]
    );

    await client.query("COMMIT");

    if (req.io) {
      req.io.to(`user:${row.user_id}`).emit("campaign_join_request_update");
    }

    return res.json({ ok: true, status: "approved" });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Erro approveJoinRequest:", error);
    return res.status(500).json({ message: "Erro ao aprovar solicitação." });
  } finally {
    client.release();
  }
};

// ==========================================
// 5.5 REJEITAR SOLICITAÇÃO (GM)
// POST /campaigns/join-requests/:requestId/reject
// ==========================================
exports.rejectJoinRequest = async (req, res) => {
  const userId = req.userId;
  const { requestId } = req.params;

  try {
    await ensureCampaignAccessSchema();

    const rRes = await pool.query(
      `SELECT jr.id, jr.campaign_id, jr.user_id, jr.status, c.owner_id
       FROM campaign_join_requests jr
       JOIN campaigns c ON c.id = jr.campaign_id
       WHERE jr.id = $1`,
      [requestId]
    );

    if (rRes.rowCount === 0) return res.status(404).json({ message: "Solicitação não encontrada." });

    const row = rRes.rows[0];
    if (String(row.owner_id) !== String(userId)) {
      return res.status(403).json({ message: "Apenas o mestre pode rejeitar." });
    }

    if (row.status !== "pending") return res.json({ ok: true, status: row.status });

    await pool.query(
      `UPDATE campaign_join_requests
       SET status = 'rejected', resolved_at = now(), resolved_by = $1
       WHERE id = $2`,
      [userId, requestId]
    );

    if (req.io) {
      req.io.to(`user:${row.user_id}`).emit("campaign_join_request_update");
    }

    return res.json({ ok: true, status: "rejected" });
  } catch (error) {
    console.error("Erro rejectJoinRequest:", error);
    return res.status(500).json({ message: "Erro ao rejeitar solicitação." });
  }
};

// ==========================================
// 6. LISTAR PERSONAGENS DA CAMPANHA
// ==========================================
exports.getCharacters = async (req, res) => {
  try {
    const { id } = req.params;
    const charsResult = await pool.query(
      `
      SELECT 
        cc.campaign_id, cc.character_id, cc.role,
        c.id, c.name, c.class, c.race, c.level, c.user_id,
        COALESCE(cc.sheet_data, c.sheet_data) as sheet_data,
        COALESCE(qs.quarantine_map, '{}'::jsonb) as quarantine_map,
        u.username, u.email
      FROM campaign_characters cc
      JOIN characters c ON cc.character_id = c.id
      JOIN users u ON c.user_id = u.id
      LEFT JOIN LATERAL (
        SELECT jsonb_object_agg(item_id, status) AS quarantine_map
        FROM campaign_character_item_state
        WHERE campaign_id = cc.campaign_id AND character_id = cc.character_id
      ) qs ON TRUE
      WHERE cc.campaign_id = $1
    `,
      [id]
    );

    return res.json(charsResult.rows);
  } catch (error) {
    console.error("Erro getCharacters:", error);
    return res.status(500).json({ error: "Erro ao listar personagens." });
  }
};

// ==========================================
// 7. VINCULAR PERSONAGEM (joinCampaign)
// ==========================================
exports.joinCampaign = async (req, res) => {
  const { id: campaignId } = req.params; // ID da campanha
  const { characterId } = req.body;
  const userId = req.userId;

  if (!characterId) return res.status(400).json({ message: "Character ID obrigatório." });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 0) Campanha precisa estar ativa
    const campRes = await client.query("SELECT id, is_active, owner_id, access_type FROM campaigns WHERE id = $1", [campaignId]);
    if (campRes.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Campanha não encontrada." });
    }
    if (campRes.rows[0].is_active === false) {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "Campanha finalizada/inativa. Não é possível entrar." });
    }

    // 0.1) Regras de acesso: preciso ser GM ou membro para vincular personagem
    await ensureCampaignAccessSchema(client);

    const accessType = campRes.rows[0].access_type || "invite_only";
    const isGM = String(campRes.rows[0].owner_id) === String(userId);

    // Já é membro?
    const memRes = await client.query(
      "SELECT 1 FROM campaign_members WHERE campaign_id = $1 AND user_id = $2",
      [campaignId, userId]
    );

    // Compatibilidade: convite aceito (projetos antigos)
    const invRes = await client.query(
      "SELECT 1 FROM campaign_invitations WHERE campaign_id = $1 AND to_user_id = $2 AND status = 'accepted'",
      [campaignId, userId]
    );

    const isMember = memRes.rowCount > 0 || invRes.rowCount > 0;

    if (!isGM && !isMember) {
      // Se for aberta, você precisa primeiro "entrar" (POST /campaigns/:id/join)
      if (accessType === "open") {
        await client.query("ROLLBACK");
        return res.status(403).json({ error: "Entre na campanha antes de vincular um personagem." });
      }

      // Se for por aprovação, precisa estar aprovado
      if (accessType === "request_approval") {
        const jr = await client.query(
          "SELECT status FROM campaign_join_requests WHERE campaign_id = $1 AND user_id = $2",
          [campaignId, userId]
        );
        const st = jr.rowCount ? jr.rows[0].status : null;
        await client.query("ROLLBACK");
        return res.status(403).json({ error: st === "pending" ? "Solicitação pendente de aprovação do mestre." : "Sem permissão para entrar nesta campanha." });
      }

      // invite_only
      await client.query("ROLLBACK");
      return res.status(403).json({ error: "Apenas convidados podem entrar nesta campanha." });
    }

    // Se veio por convite aceito, garante membership (normaliza para a UI nova)
    if (!isGM && invRes.rowCount > 0 && memRes.rowCount === 0) {
      await client.query(
        `INSERT INTO campaign_members (campaign_id, user_id, role)
         VALUES ($1, $2, 'player')
         ON CONFLICT (campaign_id, user_id) DO NOTHING`,
        [campaignId, userId]
      );
    }

    // 1) Verifica se o personagem pertence ao usuário e pega a ficha (snapshot)
    const charCheck = await client.query(
      "SELECT sheet_data, level, user_id FROM characters WHERE id = $1 AND user_id = $2",
      [characterId, userId]
    );

    if (charCheck.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(403).json({ message: "Personagem não pertence a você ou não existe." });
    }

    const originalSheet = charCheck.rows[0].sheet_data || {};

    // 2) Verifica se já está na campanha
    const existing = await client.query(
      "SELECT 1 FROM campaign_characters WHERE campaign_id = $1 AND character_id = $2",
      [campaignId, characterId]
    );

    if (existing.rowCount > 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({ message: "Este personagem já está nesta campanha." });
    }

    // 3) Vincula personagem (snapshot da ficha dentro da campanha)
    await client.query(
      `INSERT INTO campaign_characters (campaign_id, character_id, role, sheet_data)
       VALUES ($1, $2, $3, $4)`,
      [campaignId, characterId, "PLAYER", originalSheet]
    );

    // 4) Quarentena: TODOS os itens ficam pendentes/bloqueados até o GM aprovar
    await bootstrapQuarantine(client, campaignId, characterId, originalSheet);

    await client.query("COMMIT");
    return res.status(201).json({ message: "Vinculado com sucesso! Itens em quarentena aguardando aprovação do GM." });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Erro ao entrar na campanha:", error);
    return res.status(500).json({ error: "Erro ao vincular." });
  } finally {
    client.release();
  }
};
exports.attachCharacterToCampaign = exports.joinCampaign;

// ==========================================
// 8. DESVINCULAR PERSONAGEM
// ==========================================
exports.removeCharacter = async (req, res) => {
  try {
    const { id, characterId } = req.params;
    const userId = req.userId;

    // Verifica permissões (Dono da Campanha OU Dono do Personagem)
    const checkPerms = await pool.query(
      `
      SELECT 
        c.owner_id as campaign_owner, 
        char.user_id as char_owner
      FROM campaigns c
      LEFT JOIN characters char ON char.id = $2
      WHERE c.id = $1
    `,
      [id, characterId]
    );

    if (checkPerms.rows.length === 0) return res.status(404).json({ error: "Campanha não encontrada." });

    const { campaign_owner, char_owner } = checkPerms.rows[0];

    if (userId !== campaign_owner && userId !== char_owner) {
      return res.status(403).json({ error: "Sem permissão." });
    }

    await pool.query(`DELETE FROM campaign_characters WHERE campaign_id = $1 AND character_id = $2`, [id, characterId]);

    return res.json({ message: "Personagem removido da campanha." });
  } catch (error) {
    console.error("Erro removeCharacter:", error);
    return res.status(500).json({ error: "Erro ao remover personagem." });
  }
};
exports.detachCharacterFromCampaign = exports.removeCharacter;

// ==========================================
// 9. SALVAR SESSÃO (MAPA/MARCADORES/FOG/INICIATIVA)
// ==========================================
exports.saveSession = async (req, res) => {
  const { id } = req.params;
  const { session_state } = req.body;
  const userId = req.userId;

  try {
    // Verifica se é o dono
    const check = await pool.query("SELECT id FROM campaigns WHERE id = $1 AND owner_id = $2", [id, userId]);

    if (check.rows.length === 0) {
      return res.status(403).json({ message: "Apenas o Mestre pode salvar." });
    }

    // Sanitização mínima: garante objeto (ou null)
    const toSave = session_state && typeof session_state === "object" ? session_state : null;

    await pool.query("UPDATE campaigns SET session_state = $1 WHERE id = $2", [toSave, id]);

    return res.json({ message: "Sessão salva com sucesso!" });
  } catch (error) {
    console.error("Erro ao salvar sessão:", error);
    return res.status(500).json({ message: "Erro ao salvar sessão." });
  }
};

// ==========================================
// 9.1 BUSCAR SESSÃO (NOVO - PARA PERSISTÊNCIA/BOOTSTRAP)
// ==========================================
exports.getSession = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(`SELECT session_state FROM campaigns WHERE id = $1`, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Campanha não encontrada." });
    }

    // Se não existir ainda, retorna objeto vazio
    const session_state = result.rows[0]?.session_state ?? null;
    return res.json({ session_state });
  } catch (error) {
    console.error("Erro getSession:", error);
    return res.status(500).json({ error: "Erro ao buscar sessão." });
  }
};

// ==========================================
// 10. ATUALIZAR FICHA DENTRO DA CAMPANHA
// ==========================================
exports.updateCampaignCharacter = async (req, res) => {
  try {
    const { id, characterId } = req.params;
    const { sheet_data } = req.body;
    const userId = req.userId;

    // 1. Verifica se é o Mestre da campanha OU o Dono do personagem
    const checkPerms = await pool.query(
      `
        SELECT c.owner_id as campaign_owner, char.user_id as char_owner
        FROM campaigns c
        JOIN characters char ON char.id = $2
        WHERE c.id = $1
    `,
      [id, characterId]
    );

    if (checkPerms.rows.length === 0) return res.status(404).json({ error: "Não encontrado." });

    const { campaign_owner, char_owner } = checkPerms.rows[0];

    if (userId !== campaign_owner && userId !== char_owner) {
      return res.status(403).json({ error: "Sem permissão para editar esta ficha na campanha." });
    }

    // 2. Atualiza APENAS na tabela de vínculo
    await pool.query(
      `UPDATE campaign_characters 
       SET sheet_data = $1 
       WHERE campaign_id = $2 AND character_id = $3`,
      [sheet_data, id, characterId]
    );

    return res.json({ message: "Ficha da campanha atualizada!" });
  } catch (error) {
    console.error("Erro updateCampaignCharacter:", error);
    return res.status(500).json({ error: "Erro ao atualizar." });
  }
};

// ==========================================
// 13. QUARENTENA (GM) - listar itens pendentes/bloqueados/aprovados por personagem
// ==========================================
exports.getQuarantine = async (req, res) => {
  const { id: campaignId } = req.params;
  const userId = req.userId;

  try {
    // GM only
    const campRes = await pool.query("SELECT owner_id FROM campaigns WHERE id = $1", [campaignId]);
    if (campRes.rowCount === 0) return res.status(404).json({ error: "Campanha não encontrada." });
    if (campRes.rows[0].owner_id !== userId) return res.status(403).json({ error: "Apenas o GM pode acessar a quarentena." });

    const qRes = await pool.query(
      `SELECT
         cc.character_id,
         c.name AS character_name,
         COALESCE(cc.sheet_data, c.sheet_data) AS sheet_data,
         COALESCE(qs.quarantine_map, '{}'::jsonb) AS quarantine_map
       FROM campaign_characters cc
       JOIN characters c ON c.id = cc.character_id
       LEFT JOIN LATERAL (
         SELECT jsonb_object_agg(item_id, status) AS quarantine_map
         FROM campaign_character_item_state
         WHERE campaign_id = cc.campaign_id AND character_id = cc.character_id
       ) qs ON TRUE
       WHERE cc.campaign_id = $1
       ORDER BY c.name ASC`,
      [campaignId]
    );

    return res.json({ campaignId, characters: qRes.rows });
  } catch (err) {
    console.error("Erro getQuarantine:", err);
    return res.status(500).json({ error: "Erro ao buscar quarentena." });
  }
};

// ==========================================
// 14. QUARENTENA (GM) - aprovar/vetar itens
// Body: { decisions: [{ characterId, itemId, status, note? }, ...] }
// status: approved | blocked
// ==========================================
exports.updateQuarantine = async (req, res) => {
  const { id: campaignId } = req.params;
  const userId = req.userId;
  const { decisions } = req.body;

  if (!Array.isArray(decisions) || decisions.length === 0) {
    return res.status(400).json({ error: "Decisions obrigatório (array)." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // GM only
    const campRes = await client.query("SELECT owner_id FROM campaigns WHERE id = $1", [campaignId]);
    if (campRes.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Campanha não encontrada." });
    }
    if (campRes.rows[0].owner_id !== userId) {
      await client.query("ROLLBACK");
      return res.status(403).json({ error: "Apenas o GM pode atualizar a quarentena." });
    }

    // Sanitiza e aplica
    const values = [];
    const params = [];
    let p = 1;

    for (const d of decisions) {
      const characterId = d?.characterId;
      const itemId = d?.itemId !== undefined && d?.itemId !== null ? String(d.itemId) : null;
      const status = d?.status;

      if (!characterId || !itemId) continue;
      if (status !== "approved" && status !== "blocked") continue;

      values.push(`($${p++}, $${p++}, $${p++}, $${p++})`);
      params.push(campaignId, characterId, itemId, status);
    }

    if (values.length === 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Nenhuma decisão válida para aplicar." });
    }

    await client.query(
      `INSERT INTO campaign_character_item_state (campaign_id, character_id, item_id, status)
       VALUES ${values.join(", ")}
       ON CONFLICT (campaign_id, character_id, item_id)
       DO UPDATE SET status = EXCLUDED.status, updated_at = now()`,
      params
    );

    await client.query("COMMIT");
    return res.json({ ok: true, updated: values.length });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Erro updateQuarantine:", err);
    return res.status(500).json({ error: "Erro ao atualizar quarentena." });
  } finally {
    client.release();
  }
};

// ======================
// Legado Automático ao Finalizar Campanha (Draft + Apply)
// ======================

async function assertCampaignGM(client, campaignId, userId) {
  const campRes = await client.query("SELECT owner_id, is_active FROM campaigns WHERE id = $1", [campaignId]);
  if (campRes.rowCount === 0) {
    const err = new Error("Campanha não encontrada.");
    err.status = 404;
    throw err;
  }
  if (campRes.rows[0].owner_id !== userId) {
    const err = new Error("Apenas o GM pode executar esta ação.");
    err.status = 403;
    throw err;
  }
  return campRes.rows[0];
}

function buildLegacyDraftPayload({ campaignId, characterIds }) {
  const now = new Date().toISOString();
  return {
    campaignId,
    generatedAt: now,
    characters: characterIds.map((characterId) => ({
      characterId,
      suggestions: {
        marks: [
          {
            label: "Marca de Campanha",
            description: "Carrega as consequências do que foi vivido nesta campanha.",
            sourceCampaignId: campaignId,
            createdAt: now,
          },
        ],
        titles: [
          {
            name: "Veterano da Campanha",
            note: "Reconhecido por ter sobrevivido até o fim.",
            sourceCampaignId: campaignId,
            createdAt: now,
          },
        ],
        hooks: [
          {
            hook: "Algo ficou inacabado e retornará para cobrar seu preço.",
            scope: "future",
            sourceCampaignId: campaignId,
            createdAt: now,
          },
        ],
        burdens: [],
      },
      approved: { marks: [], titles: [], hooks: [], burdens: [] },
    })),
  };
}

async function appendLegacyJSONB(client, characterId, patch) {
  // patch = { marks: [], titles: [], hooks: [], burdens: [] }
  // Append em arrays JSONB, sem sobrescrever histórico.
  await client.query(
    `
    INSERT INTO character_narrative_legacy (character_id, reputation, marks, titles, burdens, hooks)
    VALUES ($1, '{}'::jsonb, $2::jsonb, $3::jsonb, $4::jsonb, $5::jsonb)
    ON CONFLICT (character_id)
    DO UPDATE SET
      marks   = COALESCE(character_narrative_legacy.marks,   '[]'::jsonb) || EXCLUDED.marks,
      titles  = COALESCE(character_narrative_legacy.titles,  '[]'::jsonb) || EXCLUDED.titles,
      burdens = COALESCE(character_narrative_legacy.burdens, '[]'::jsonb) || EXCLUDED.burdens,
      hooks   = COALESCE(character_narrative_legacy.hooks,   '[]'::jsonb) || EXCLUDED.hooks
    `,
    [
      characterId,
      JSON.stringify(Array.isArray(patch?.marks) ? patch.marks : []),
      JSON.stringify(Array.isArray(patch?.titles) ? patch.titles : []),
      JSON.stringify(Array.isArray(patch?.burdens) ? patch.burdens : []),
      JSON.stringify(Array.isArray(patch?.hooks) ? patch.hooks : []),
    ]
  );
}

// POST /campaigns/:id/finish
// - Finaliza campanha (is_active=false)
// - Gera/atualiza rascunho (draft) em campaign_legacy_drafts
exports.finishCampaignAndGenerateLegacyDraft = async (req, res) => {
  const { id: campaignId } = req.params;
  const userId = req.userId;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await assertCampaignGM(client, campaignId, userId);

    // Finaliza/inativa a campanha (se já estiver inativa, não tem problema)
    await client.query("UPDATE campaigns SET is_active = false WHERE id = $1", [campaignId]);

    // Personagens vinculados via campaign_characters
    const charsRes = await client.query(
      "SELECT character_id FROM campaign_characters WHERE campaign_id = $1",
      [campaignId]
    );
    const characterIds = charsRes.rows.map((r) => r.character_id);

    const payload = buildLegacyDraftPayload({ campaignId, characterIds });

    const draftRes = await client.query(
      `
      INSERT INTO campaign_legacy_drafts (campaign_id, status, payload, created_by)
      VALUES ($1, 'draft', $2::jsonb, $3)
      ON CONFLICT (campaign_id)
      DO UPDATE SET payload = EXCLUDED.payload, status = 'draft', updated_at = now()
      RETURNING id, campaign_id, status, payload
      `,
      [campaignId, JSON.stringify(payload), userId]
    );

    await client.query("COMMIT");
    return res.json(draftRes.rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Erro finishCampaignAndGenerateLegacyDraft:", err);
    return res.status(err.status || 500).json({ error: err.message || "Erro ao finalizar campanha." });
  } finally {
    client.release();
  }
};

// GET /campaigns/:id/legacy-draft
exports.getLegacyDraft = async (req, res) => {
  const { id: campaignId } = req.params;
  const userId = req.userId;

  const client = await pool.connect();
  try {
    await assertCampaignGM(client, campaignId, userId);

    const draftRes = await client.query(
      "SELECT id, campaign_id, status, payload FROM campaign_legacy_drafts WHERE campaign_id = $1",
      [campaignId]
    );

    if (draftRes.rowCount === 0) return res.status(404).json({ error: "Rascunho não encontrado." });
    return res.json(draftRes.rows[0]);
  } catch (err) {
    console.error("Erro getLegacyDraft:", err);
    return res.status(err.status || 500).json({ error: err.message || "Erro ao buscar rascunho." });
  } finally {
    client.release();
  }
};

// PUT /campaigns/:id/legacy-draft
exports.updateLegacyDraft = async (req, res) => {
  const { id: campaignId } = req.params;
  const userId = req.userId;

  const client = await pool.connect();
  try {
    await assertCampaignGM(client, campaignId, userId);

    const payload = req.body?.payload ?? req.body;

    const upd = await client.query(
      `
      UPDATE campaign_legacy_drafts
      SET payload = $2::jsonb, updated_at = now()
      WHERE campaign_id = $1
      RETURNING id, campaign_id, status, payload
      `,
      [campaignId, JSON.stringify(payload)]
    );

    if (upd.rowCount === 0) return res.status(404).json({ error: "Rascunho não encontrado." });
    return res.json(upd.rows[0]);
  } catch (err) {
    console.error("Erro updateLegacyDraft:", err);
    return res.status(err.status || 500).json({ error: err.message || "Erro ao salvar rascunho." });
  } finally {
    client.release();
  }
};

// POST /campaigns/:id/legacy-draft/apply
exports.applyLegacyDraft = async (req, res) => {
  const { id: campaignId } = req.params;
  const userId = req.userId;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await assertCampaignGM(client, campaignId, userId);

    const draftRes = await client.query(
      "SELECT id, status, payload FROM campaign_legacy_drafts WHERE campaign_id = $1",
      [campaignId]
    );
    if (draftRes.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Rascunho não encontrado." });
    }

    const payload = draftRes.rows[0].payload || {};
    const chars = Array.isArray(payload.characters) ? payload.characters : [];

    let appliedCount = 0;
    for (const ch of chars) {
      const characterId = ch?.characterId;
      if (!characterId) continue;
      const patch = ch?.approved !== undefined ? (ch?.approved || {}) : (ch?.suggestions || {});
      await appendLegacyJSONB(client, characterId, patch);
      appliedCount++;
    }

    await client.query(
      "UPDATE campaign_legacy_drafts SET status = 'applied', updated_at = now() WHERE campaign_id = $1",
      [campaignId]
    );

    await client.query("COMMIT");
    return res.json({ ok: true, appliedCount });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Erro applyLegacyDraft:", err);
    return res.status(err.status || 500).json({ error: err.message || "Erro ao aplicar rascunho." });
  } finally {
    client.release();
  }
};

// ======================
// Diário da Campanha (manual por enquanto) + Export (PDF)
// ======================

async function assertCampaignMemberOrGM(campaignId, userId) {
  const r = await pool.query(
    `
    SELECT 
      c.owner_id,
      EXISTS(SELECT 1 FROM campaign_characters cc 
             JOIN characters ch ON ch.id = cc.character_id
             WHERE cc.campaign_id = c.id AND ch.user_id = $2) AS is_player
    FROM campaigns c
    WHERE c.id = $1
    `,
    [campaignId, userId]
  );

  if (r.rowCount === 0) {
    const err = new Error("Campanha não encontrada.");
    err.status = 404;
    throw err;
  }
  const isGM = r.rows[0].owner_id === userId;
  const isPlayer = r.rows[0].is_player === true;
  if (!isGM && !isPlayer) {
    const err = new Error("Sem permissão.");
    err.status = 403;
    throw err;
  }
  return { isGM, isPlayer };
}

exports.addDiaryEntry = async (req, res) => {
  const { id: campaignId } = req.params;
  const userId = req.userId;
  const { entry_text } = req.body || {};

  try {
    await assertCampaignMemberOrGM(campaignId, userId);

    const text = String(entry_text || "").trim();
    if (!text) return res.status(400).json({ error: "entry_text é obrigatório." });

    const ins = await pool.query(
      `
      INSERT INTO campaign_diary_entries (campaign_id, author_id, entry_text)
      VALUES ($1, $2, $3)
      RETURNING id, campaign_id, author_id, entry_text, created_at
      `,
      [campaignId, userId, text]
    );

    return res.status(201).json(ins.rows[0]);
  } catch (err) {
    console.error("Erro addDiaryEntry:", err);
    return res.status(err.status || 500).json({ error: err.message || "Erro ao adicionar entrada." });
  }
};

exports.listDiaryEntries = async (req, res) => {
  const { id: campaignId } = req.params;
  const userId = req.userId;

  try {
    await assertCampaignMemberOrGM(campaignId, userId);

    const q = await pool.query(
      `
      SELECT e.id, e.campaign_id, e.author_id, u.username, e.entry_text, e.created_at
      FROM campaign_diary_entries e
      JOIN users u ON u.id = e.author_id
      WHERE e.campaign_id = $1
      ORDER BY e.created_at ASC
      `,
      [campaignId]
    );

    return res.json({ entries: q.rows });
  } catch (err) {
    console.error("Erro listDiaryEntries:", err);
    return res.status(err.status || 500).json({ error: err.message || "Erro ao listar diário." });
  }
};

exports.exportDiary = async (req, res) => {
  const { id: campaignId } = req.params;
  const userId = req.userId;

  try {
    const format = (req.query.format || "pdf").toLowerCase();
    if (format !== "pdf") {
      return res.status(400).json({ error: "Formato não suportado neste endpoint. Use ?format=pdf" });
    }

    // Permissão: GM (owner) da campanha
    const campRes = await pool.query(`SELECT id, name, owner_id FROM campaigns WHERE id = $1`, [campaignId]);
    if (campRes.rowCount === 0) return res.status(404).json({ error: "Campanha não encontrada." });

    const campaign = campRes.rows[0];
    if (campaign.owner_id !== userId) return res.status(403).json({ error: "Apenas o GM pode exportar o diário em PDF." });

    // Entradas do diário (se existir tabela)
    const entriesRes = await pool.query(
      `
      SELECT e.entry_text, e.created_at, e.author_id
      FROM campaign_diary_entries e
      WHERE e.campaign_id = $1
      ORDER BY e.created_at ASC
      `,
      [campaignId]
    );

    const entries = entriesRes.rows || [];

    // Consequências aplicadas (opcional)
    const draftRes = await pool.query(
      `SELECT status, payload FROM campaign_legacy_drafts WHERE campaign_id = $1`,
      [campaignId]
    );
    const draft = draftRes.rowCount ? draftRes.rows[0] : null;
    const consequencesPayload = (draft && draft.status === "applied") ? draft.payload : null;

    const PDFDocument = require("pdfkit");
    const { PassThrough } = require("stream");

    const stream = new PassThrough();
    const chunks = [];
    stream.on("data", (c) => chunks.push(c));

    const doc = new PDFDocument({
      size: "A4",
      margin: 56,
      info: { Title: `Diário de Campanha: ${campaign.name}`, Author: "DND Web" }
    });

    doc.pipe(stream);

    const pdfReady = new Promise((resolve, reject) => {
      stream.on("end", () => resolve(Buffer.concat(chunks)));
      stream.on("error", reject);
      doc.on("error", reject);
    });

    const COLORS = {
      bg: "#121214",
      bg2: "#18181c",
      frame: "#6a5a3a",
      frame2: "#3a3326",
      title: "#c9a85a",
      text: "#f1eadf",
      muted: "#b9b0a2",
      rule: "#6a5a3a",
    };

    const pad2 = (n) => String(n).padStart(2, "0");
    const fmtDate = (d) => {
      const dt = new Date(d);
      return `${pad2(dt.getDate())}/${pad2(dt.getMonth() + 1)}/${dt.getFullYear()} ${pad2(dt.getHours())}:${pad2(dt.getMinutes())}`;
    };

    const roman = (num) => {
      const map = [
        [1000, "m"], [900, "cm"], [500, "d"], [400, "cd"],
        [100, "c"], [90, "xc"], [50, "l"], [40, "xl"],
        [10, "x"], [9, "ix"], [5, "v"], [4, "iv"], [1, "i"],
      ];
      let n = num;
      let out = "";
      for (const [v, s] of map) {
        while (n >= v) { out += s; n -= v; }
      }
      return out || "i";
    };

    const drawBackground = () => {
      const w = doc.page.width;
      const h = doc.page.height;

      // Fundo escuro em camadas (simula textura)
      doc.save();
      doc.rect(0, 0, w, h).fill(COLORS.bg);
      doc.opacity(0.12);
      for (let y = 0; y < h; y += 6) {
        doc.rect(0, y, w, 3).fill(COLORS.bg2);
      }
      doc.restore();
      doc.opacity(1);
    };

    const drawFrame = () => {
      const w = doc.page.width;
      const h = doc.page.height;
      const m = 22;

      doc.save();
      doc.lineWidth(1).strokeColor(COLORS.frame).opacity(0.85);
      doc.rect(m, m, w - m * 2, h - m * 2).stroke();

      doc.lineWidth(0.5).strokeColor(COLORS.frame2).opacity(0.9);
      doc.rect(m + 6, m + 6, w - (m + 6) * 2, h - (m + 6) * 2).stroke();
      doc.restore();
      doc.opacity(1);
    };

    let pageCount = 0;
    const addPage = () => {
      if (pageCount > 0) doc.addPage();
      pageCount += 1;
      drawBackground();
      drawFrame();
    };

    const headerFooter = (isRoman = false) => {
      const w = doc.page.width;
      const h = doc.page.height;
      const m = 56;

      doc.save();
      // Header
      doc.font("Times-Italic").fontSize(9).fillColor(COLORS.muted);
      doc.text(`${campaign.name} — Diário de Campanha`, m, 34, { width: w - m * 2, align: "left" });

      // Footer
      const pg = isRoman ? roman(pageCount) : String(pageCount);
      doc.text(pg, m, h - 40, { width: w - m * 2, align: "center" });
      doc.restore();
    };

    const hr = () => {
      const m = 56;
      const y = doc.y + 8;
      doc.save();
      doc.moveTo(m, y).lineTo(doc.page.width - m, y).lineWidth(0.8).strokeColor(COLORS.rule).opacity(0.8).stroke();
      doc.restore();
      doc.opacity(1);
      doc.moveDown(1.2);
    };

    const epigraph = () => {
      // Epígrafe determinística baseada no campaignId (sem IA)
      const bank = [
        "Toda vitória cobra seu tributo em silêncio.",
        "O passado não morre — apenas aprende a esperar.",
        "Glória e ruína bebem do mesmo cálice.",
        "Há promessas que sobrevivem aos heróis… e os condenam.",
        "A história lembra. E, às vezes, vinga.",
      ];
      let acc = 0;
      for (let i = 0; i < campaignId.length; i++) acc = (acc + campaignId.charCodeAt(i) * (i + 1)) % 9973;
      return bank[acc % bank.length];
    };

    // --------- CAPA ----------
    addPage();
    doc.y = 150;
    doc.font("Times-Bold").fontSize(26).fillColor(COLORS.title).text("DIÁRIO DE CAMPANHA", { align: "center" });
    doc.moveDown(0.8);
    doc.font("Times-Bold").fontSize(22).fillColor(COLORS.text).text(campaign.name, { align: "center" });
    doc.moveDown(1.2);
    doc.font("Times-Italic").fontSize(12).fillColor(COLORS.muted).text("Crônicas de feitos, perdas e consequências", { align: "center" });
    doc.moveDown(2.0);
    doc.font("Times-Italic").fontSize(12).fillColor(COLORS.title).text(`“${epigraph()}”`, { align: "center" });
    doc.moveDown(2.5);
    doc.font("Times-Roman").fontSize(10).fillColor(COLORS.muted).text(`ID: ${campaignId}`, { align: "center" });
    headerFooter(true);

    // --------- SUMÁRIO ----------
    addPage();
    doc.font("Times-Bold").fontSize(18).fillColor(COLORS.title).text("SUMÁRIO", { align: "left" });
    hr();

    if (!entries.length) {
      doc.font("Times-Roman").fontSize(12).fillColor(COLORS.text).text("Nenhuma entrada de diário foi registrada para esta campanha.");
      headerFooter(true);
    } else {
      doc.font("Times-Roman").fontSize(11).fillColor(COLORS.text);
      entries.forEach((e, idx) => {
        doc.text(`Capítulo ${idx + 1} — ${fmtDate(e.created_at)} — ${(e.author_id ? String(e.author_id).slice(0, 8) : "Autor")}`);
      });
      headerFooter(true);
    }

    // --------- CAPÍTULOS ----------
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      addPage();

      doc.font("Times-Bold").fontSize(16).fillColor(COLORS.title).text(`CAPÍTULO ${i + 1}`, { align: "left" });
      doc.font("Times-Bold").fontSize(14).fillColor(COLORS.text).text(`${fmtDate(e.created_at)} — ${(e.author_id ? String(e.author_id).slice(0, 8) : "Autor")}`, { align: "left" });
      hr();

      const text = String(e.entry_text || "").trim();
      if (!text) {
        doc.font("Times-Italic").fontSize(12).fillColor(COLORS.muted).text("Entrada vazia.");
      } else {
        // Capitular simples
        const first = text[0];
        const rest = text.slice(1);

        doc.font("Times-Bold").fontSize(44).fillColor(COLORS.title).text(first, { continued: true });
        doc.font("Times-Roman").fontSize(12).fillColor(COLORS.text).text(rest, { align: "justify" });
      }

      headerFooter(false);
    }

    // --------- CONSEQUÊNCIAS ----------
    addPage();
    doc.font("Times-Bold").fontSize(18).fillColor(COLORS.title).text("CONSEQUÊNCIAS QUE ECOAM", { align: "left" });
    hr();

    const writeBlock = (label, items, formatter) => {
      if (!items || !items.length) return;
      doc.font("Times-Bold").fontSize(12).fillColor(COLORS.text).text(label);
      doc.moveDown(0.3);
      doc.font("Times-Roman").fontSize(11).fillColor(COLORS.text);
      items.forEach((it) => doc.text(`• ${formatter(it)}`, { indent: 10 }));
      doc.moveDown(0.8);
    };

    if (!consequencesPayload || !Array.isArray(consequencesPayload.characters) || consequencesPayload.characters.length === 0) {
      doc.font("Times-Italic").fontSize(12).fillColor(COLORS.muted).text(
        "Nenhuma consequência aplicada foi encontrada para esta campanha. (Ou o rascunho ainda não foi aplicado.)"
      );
    } else {
      for (const ch of consequencesPayload.characters) {
        const charId = ch.characterId;
        const src = ch.approved && (ch.approved.marks || ch.approved.titles || ch.approved.hooks || ch.approved.burdens)
          ? ch.approved
          : (ch.suggestions || {});

        const marks = Array.isArray(src.marks) ? src.marks : [];
        const titles = Array.isArray(src.titles) ? src.titles : [];
        const hooks = Array.isArray(src.hooks) ? src.hooks : [];
        const burdens = Array.isArray(src.burdens) ? src.burdens : [];

        doc.font("Times-Bold").fontSize(13).fillColor(COLORS.text).text(`Personagem: ${charId}`);
        doc.moveDown(0.3);

        writeBlock("Títulos", titles, (t) => t.name || t.title || JSON.stringify(t));
        writeBlock("Marcas", marks, (m) => m.label || m.name || JSON.stringify(m));
        writeBlock("Fardos", burdens, (b) => b.label || b.name || JSON.stringify(b));
        writeBlock("Ganchos", hooks, (h) => h.hook || h.label || JSON.stringify(h));

        doc.font("Times-Roman").fontSize(9).fillColor(COLORS.muted).text("—", { align: "left" });
        doc.moveDown(0.6);
      }
    }

    headerFooter(false);

    doc.end();
    const pdfBuffer = await pdfReady;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="diario_${campaignId}.pdf"`);
    return res.status(200).send(pdfBuffer);
  } catch (err) {
    console.error("Erro exportDiary:", err);
    return res.status(500).json({ error: err.message || "Erro ao exportar diário." });
  }
};

// ==========================================
// FEED DE EVENTOS (Timeline de Sessão)
// ==========================================

async function getCampaignRole(client, campaignId, userId) {
  // GM se for owner_id da campanha
  const gm = await client.query(
    `SELECT 1 FROM campaigns WHERE id = $1 AND owner_id = $2`,
    [campaignId, userId]
  );
  if (gm.rowCount > 0) return "GM";

  // Player se possuir personagem vinculado à campanha
  const player = await client.query(
    `
    SELECT 1
      FROM campaign_characters cc
      JOIN characters ch ON ch.id = cc.character_id
     WHERE cc.campaign_id = $1
       AND ch.user_id = $2
     LIMIT 1
    `,
    [campaignId, userId]
  );
  if (player.rowCount > 0) return "PLAYER";

  return "NONE";
}

function normalizeTags(tags) {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags.map(String).map((t) => t.trim()).filter(Boolean).slice(0, 20);
  if (typeof tags === "string") {
    return tags.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 20);
  }
  return [];
}

exports.listEvents = async (req, res) => {
  const campaignId = req.params.id;
  const userId = req.userId;

  const {
    session_number,
    type,
    tags,
    visibility,
    from,
    to
  } = req.query;

  const client = await pool.connect();
  try {
    const role = await getCampaignRole(client, campaignId, userId);
    if (role === "NONE") return res.status(403).json({ error: "Sem permissão." });

    const params = [campaignId];
    const where = ["campaign_id = $1"];

    // Visibilidade: player só enxerga players; GM pode filtrar ou ver tudo
    if (role !== "GM") {
      where.push(`visibility = 'players'`);
    } else if (visibility && visibility !== "all") {
      params.push(String(visibility));
      where.push(`visibility = $${params.length}`);
    }

    if (session_number !== undefined && session_number !== "" && session_number !== null) {
      params.push(Number(session_number));
      where.push(`session_number = $${params.length}`);
    }

    if (type) {
      params.push(String(type));
      where.push(`event_type = $${params.length}`);
    }

    // tags=tag1,tag2 -> qualquer tag (overlap)
    if (tags) {
      const t = normalizeTags(tags);
      if (t.length) {
        params.push(t);
        where.push(`tags && $${params.length}::text[]`);
      }
    }

    if (from) {
      params.push(String(from));
      where.push(`created_at >= $${params.length}::timestamptz`);
    }
    if (to) {
      params.push(String(to));
      where.push(`created_at <= $${params.length}::timestamptz`);
    }

    const sql = `
      SELECT
        id, campaign_id, session_number, session_date,
        author_id, visibility, event_type, tags,
        title, content, metadata,
        created_at, updated_at
      FROM campaign_session_events
      WHERE ${where.join(" AND ")}
      ORDER BY
        CASE WHEN (metadata->>'pinned') = 'true' THEN 0 ELSE 1 END,
        created_at DESC
      LIMIT 500
    `;

    const result = await client.query(sql, params);
    return res.json({ events: result.rows, role });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro ao listar eventos." });
  } finally {
    client.release();
  }
};

exports.createEvent = async (req, res) => {
  const campaignId = req.params.id;
  const userId = req.userId;

  const {
    session_number = null,
    session_date = null,
    visibility = "gm_only",
    event_type = "note",
    tags = [],
    title = null,
    content,
    metadata = {}
  } = req.body || {};

  if (!content || !String(content).trim()) {
    return res.status(400).json({ error: "Conteúdo do evento é obrigatório." });
  }

  const client = await pool.connect();
  try {
    const role = await getCampaignRole(client, campaignId, userId);
    if (role !== "GM") return res.status(403).json({ error: "Apenas o GM pode criar eventos." });

    const cleanTags = normalizeTags(tags);

    const result = await client.query(
      `
      INSERT INTO campaign_session_events (
        campaign_id, session_number, session_date,
        author_id, visibility, event_type, tags,
        title, content, metadata
      ) VALUES (
        $1, $2, $3,
        $4, $5, $6, $7,
        $8, $9, $10::jsonb
      )
      RETURNING *
      `,
      [
        campaignId,
        session_number === "" ? null : session_number,
        session_date || null,
        userId,
        String(visibility || "gm_only"),
        String(event_type || "note"),
        cleanTags,
        title ? String(title).trim() : null,
        String(content).trim(),
        JSON.stringify(metadata || {})
      ]
    );

    const event = result.rows[0];

    const io = req.app.get("io");
    if (io) io.to(`campaign:${campaignId}`).emit("events:created", event);

    return res.status(201).json({ event });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro ao criar evento." });
  } finally {
    client.release();
  }
};

exports.updateEvent = async (req, res) => {
  const campaignId = req.params.id;
  const eventId = req.params.eventId;
  const userId = req.userId;

  const {
    session_number = null,
    session_date = null,
    visibility,
    event_type,
    tags,
    title,
    content,
    metadata
  } = req.body || {};

  const client = await pool.connect();
  try {
    const role = await getCampaignRole(client, campaignId, userId);
    if (role !== "GM") return res.status(403).json({ error: "Apenas o GM pode editar eventos." });

    // Carrega existente para merge de metadata
    const existing = await client.query(
      `SELECT * FROM campaign_session_events WHERE id = $1 AND campaign_id = $2`,
      [eventId, campaignId]
    );
    if (existing.rowCount === 0) return res.status(404).json({ error: "Evento não encontrado." });

    const cur = existing.rows[0];
    const newTags = tags !== undefined ? normalizeTags(tags) : cur.tags;
    const newMeta = metadata !== undefined ? Object.assign({}, cur.metadata || {}, metadata || {}) : cur.metadata;

    const result = await client.query(
      `
      UPDATE campaign_session_events
         SET session_number = COALESCE($3, session_number),
             session_date = COALESCE($4, session_date),
             visibility = COALESCE($5, visibility),
             event_type = COALESCE($6, event_type),
             tags = $7,
             title = $8,
             content = COALESCE($9, content),
             metadata = $10::jsonb,
             updated_at = NOW()
       WHERE id = $1 AND campaign_id = $2
       RETURNING *
      `,
      [
        eventId,
        campaignId,
        session_number === "" ? null : session_number,
        session_date || null,
        visibility !== undefined ? String(visibility) : null,
        event_type !== undefined ? String(event_type) : null,
        newTags,
        title === undefined ? cur.title : (title ? String(title).trim() : null),
        content !== undefined ? String(content).trim() : null,
        JSON.stringify(newMeta || {})
      ]
    );

    const event = result.rows[0];
    const io = req.app.get("io");
    if (io) io.to(`campaign:${campaignId}`).emit("events:updated", event);

    return res.json({ event });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro ao atualizar evento." });
  } finally {
    client.release();
  }
};

exports.deleteEvent = async (req, res) => {
  const campaignId = req.params.id;
  const eventId = req.params.eventId;
  const userId = req.userId;

  const client = await pool.connect();
  try {
    const role = await getCampaignRole(client, campaignId, userId);
    if (role !== "GM") return res.status(403).json({ error: "Apenas o GM pode excluir eventos." });

    const result = await client.query(
      `DELETE FROM campaign_session_events WHERE id = $1 AND campaign_id = $2 RETURNING id`,
      [eventId, campaignId]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: "Evento não encontrado." });

    const io = req.app.get("io");
    if (io) io.to(`campaign:${campaignId}`).emit("events:deleted", { id: eventId });

    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro ao excluir evento." });
  } finally {
    client.release();
  }
};

// Publicação em lote: gm_only -> players (padrão: campanha inteira; opcional por sessão)
exports.publishEventsBatch = async (req, res) => {
  const campaignId = req.params.id;
  const userId = req.userId;

  const { session_number = null } = req.body || {};

  const client = await pool.connect();
  try {
    const role = await getCampaignRole(client, campaignId, userId);
    if (role !== "GM") return res.status(403).json({ error: "Apenas o GM pode publicar eventos." });

    const params = [campaignId];
    let where = `campaign_id = $1 AND visibility = 'gm_only'`;

    if (session_number !== null && session_number !== "" && session_number !== undefined) {
      params.push(Number(session_number));
      where += ` AND session_number = $${params.length}`;
    }

    const result = await client.query(
      `
      UPDATE campaign_session_events
         SET visibility = 'players',
             updated_at = NOW()
       WHERE ${where}
       RETURNING *
      `,
      params
    );

    const io = req.app.get("io");
    if (io) {
      for (const ev of result.rows) {
        io.to(`campaign:${campaignId}`).emit("events:updated", ev);
      }
    }

    return res.json({ ok: true, published: result.rowCount });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro ao publicar eventos." });
  } finally {
    client.release();
  }
};

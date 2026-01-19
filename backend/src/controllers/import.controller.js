// backend/controllers/import.controller.js
const { pool } = require("../db");

/**
 * Importa um export JSON de campanha (gerado pelo UmbralTable) e recria:
 * - campaigns (nova campanha)
 * - campaign_members (adiciona o importador como master)
 * - characters (cria novos personagens)
 * - campaign_characters (vincula na campanha)
 * - campaign_session_events (opcional)
 * - campaign_diary_entries (opcional)
 *
 * Regras de segurança:
 * - O usuário importador vira o owner/GM da campanha importada.
 * - Participantes NÃO são adicionados automaticamente como membros.
 * - ADMIN passa pelo gate e também pode importar; ainda assim owner padrão é o importador.
 */

function asText(v, maxLen = 20000) {
  const s = String(v ?? "").trim();
  if (!s) return null;
  return s.length > maxLen ? s.slice(0, maxLen) : s;
}

function asJson(v) {
  if (v == null) return {};
  if (typeof v === "object") return v;
  try {
    return JSON.parse(String(v));
  } catch {
    return {};
  }
}

async function ensureAccessSchema(client) {
  // campanhas.access_type + campaign_members (compat com campaign.controller)
  await client.query(`
    ALTER TABLE campaigns
    ADD COLUMN IF NOT EXISTS access_type TEXT NOT NULL DEFAULT 'invite_only'
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS campaign_members (
      campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role TEXT NOT NULL DEFAULT 'player' CHECK (role IN ('master','player')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (campaign_id, user_id)
    )
  `);
}

async function resolveUserIdByEmail(client, email) {
  const e = String(email || "").trim().toLowerCase();
  if (!e) return null;
  try {
    const r = await client.query(`SELECT id FROM users WHERE LOWER(email) = $1 LIMIT 1`, [e]);
    return r.rowCount ? r.rows[0].id : null;
  } catch {
    return null;
  }
}

/**
 * Insere personagem tentando diferentes combinações de colunas,
 * para manter compatibilidade com schemas diferentes.
 */
async function insertCharacterFlexible(client, { ownerId, name, sheetData }) {
  const payload = JSON.stringify(sheetData || {});

  const attempts = [
    {
      sql: `INSERT INTO characters (id, user_id, name, sheet_data, created_at)
            VALUES (gen_random_uuid(), $1, $2, $3::jsonb, NOW())
            RETURNING id`,
      params: [ownerId, name, payload],
    },
    {
      sql: `INSERT INTO characters (user_id, name, sheet_data, created_at)
            VALUES ($1, $2, $3::jsonb, NOW())
            RETURNING id`,
      params: [ownerId, name, payload],
    },
    {
      // fallback: sem created_at explícito
      sql: `INSERT INTO characters (user_id, name, sheet_data)
            VALUES ($1, $2, $3::jsonb)
            RETURNING id`,
      params: [ownerId, name, payload],
    },
    {
      // fallback extremo: sem sheet_data
      sql: `INSERT INTO characters (user_id, name)
            VALUES ($1, $2)
            RETURNING id`,
      params: [ownerId, name],
    },
  ];

  let lastErr = null;
  for (const a of attempts) {
    try {
      const r = await client.query(a.sql, a.params);
      return r.rows[0].id;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}

exports.importCampaignData = async (req, res) => {
  const userId = req.userId;
  const body = req.body || {};

  const meta = body.meta || {};
  const type = String(meta.type || "").trim();
  if (type && type !== "campaign_export") {
    return res.status(400).json({ error: "INVALID_EXPORT", message: "Arquivo de export inválido." });
  }

  const campaignIn = body.campaign || {};
  const name = asText(campaignIn.name, 200) || "Campanha Importada";
  const description = asText(campaignIn.description, 5000);

  const accessTypeRaw = String(campaignIn.access_type || "invite_only").trim();
  const access_type = ["open", "invite_only", "request_approval"].includes(accessTypeRaw)
    ? accessTypeRaw
    : "invite_only";

  const characters = Array.isArray(body.characters) ? body.characters : [];
  const events = Array.isArray(body.events) ? body.events : [];
  const diary = Array.isArray(body.diary) ? body.diary : [];

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await ensureAccessSchema(client);

    // 1) cria campanha nova (importador vira owner/GM)
    const campIns = await client.query(
      `
      INSERT INTO campaigns (id, owner_id, name, description, access_type, created_at)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW())
      RETURNING *
      `,
      [userId, name, description, access_type]
    );

    const newCampaign = campIns.rows[0];
    const newCampaignId = newCampaign.id;

    // 2) adiciona o importador como master na campaign_members
    await client.query(
      `
      INSERT INTO campaign_members (campaign_id, user_id, role)
      VALUES ($1, $2, 'master')
      ON CONFLICT (campaign_id, user_id) DO NOTHING
      `,
      [newCampaignId, userId]
    );

    // 3) importa personagens
    let charactersImported = 0;

    for (const ch of characters) {
      const chName = asText(ch.name, 200) || asText(ch.character_name, 200) || "Personagem";
      const sheet = asJson(ch.sheet_data || ch.sheetData || ch.sheet || ch.data);

      // tenta preservar o dono por email (se existir), senão fica com o importador
      let ownerId = userId;
      const maybeEmail = ch.owner_email || ch.ownerEmail || ch.email;
      const resolvedOwner = await resolveUserIdByEmail(client, maybeEmail);
      if (resolvedOwner) ownerId = resolvedOwner;

      const newCharId = await insertCharacterFlexible(client, {
        ownerId,
        name: chName,
        sheetData: sheet,
      });

      // vincula na campanha (snapshot da ficha dentro da campanha)
      // role padrão PLAYER (GM ajusta depois se quiser)
      await client.query(
        `
        INSERT INTO campaign_characters (campaign_id, character_id, role, sheet_data)
        VALUES ($1, $2, $3, $4::jsonb)
        `,
        [newCampaignId, newCharId, "PLAYER", JSON.stringify(sheet || {})]
      );

      charactersImported += 1;
    }

    // 4) importa eventos (se tabela existir)
    let eventsImported = 0;
    try {
      for (const ev of events) {
        const content = asText(ev.content, 20000);
        if (!content) continue;

        const session_number = ev.session_number ?? null;
        const session_date = ev.session_date ?? null;
        const visibility = asText(ev.visibility, 32) || "gm_only";
        const event_type = asText(ev.event_type, 32) || "note";
        const tags = Array.isArray(ev.tags) ? ev.tags : [];
        const title = asText(ev.title, 300);
        const metadata = asJson(ev.metadata);

        await client.query(
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
          `,
          [
            newCampaignId,
            session_number === "" ? null : session_number,
            session_date || null,
            userId,
            String(visibility || "gm_only"),
            String(event_type || "note"),
            tags,
            title ? String(title).trim() : null,
            String(content).trim(),
            JSON.stringify(metadata || {}),
          ]
        );
        eventsImported += 1;
      }
    } catch {
      eventsImported = 0;
    }

    // 5) importa diário (se tabela existir)
    let diaryImported = 0;
    try {
      for (const d of diary) {
        const entry_text = asText(d.entry_text || d.text, 20000);
        if (!entry_text) continue;
        await client.query(
          `INSERT INTO campaign_diary_entries (campaign_id, author_id, entry_text)
           VALUES ($1, $2, $3)`,
          [newCampaignId, userId, entry_text]
        );
        diaryImported += 1;
      }
    } catch {
      diaryImported = 0;
    }

    await client.query("COMMIT");

    return res.status(201).json({
      message: "Import concluído.",
      campaign: {
        id: String(newCampaignId),
        name: newCampaign.name,
        access_type: newCampaign.access_type,
      },
      imported: {
        characters: charactersImported,
        events: eventsImported,
        diary: diaryImported,
      },
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("[importCampaignData]", err);
    return res.status(500).json({ error: "INTERNAL_ERROR", message: "Falha ao importar campanha." });
  } finally {
    client.release();
  }
};

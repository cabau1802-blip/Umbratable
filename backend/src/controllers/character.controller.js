const { pool } = require('../db');

// ==========================================
// 1. LISTAR MEUS PERSONAGENS
// ==========================================
exports.listMyCharacters = async (req, res) => {
  try {
    const userId = req.userId;
    const result = await pool.query(
      `SELECT * FROM characters WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );
    return res.json(result.rows);
  } catch (error) {
    console.error("Erro listMyCharacters:", error);
    return res.status(500).json({ error: 'Erro ao listar personagens.' });
  }
};

// ==========================================
// 2. CRIAR PERSONAGEM (CORRIGIDO)
// ==========================================
exports.create = async (req, res) => {
  const client = await pool.connect();

  try {
    const userId = req.userId;
    // Pega os dados do corpo (incluindo o ID da campanha se houver)
    const { name, class: charClass, race, level, sheet_data, campaignId } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Nome do personagem é obrigatório.' });
    }

    await client.query('BEGIN'); // Inicia transação

    // 1. INSERE NA TABELA DE PERSONAGENS (CHARACTERS)
    // Se estivesse inserindo em 'campaigns', o erro estaria aqui.
    const charResult = await client.query(
      `INSERT INTO characters (id, user_id, name, class, race, level, sheet_data, created_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW())
       RETURNING *`,
      [userId, name, charClass || 'Aventureiro', race || 'Humano', level || 1, sheet_data || {}]
    );

    const newChar = charResult.rows[0];

    // 1.1) Cria o legado narrativo do personagem (sempre)
    await client.query(
      `INSERT INTO character_narrative_legacy (character_id)
       VALUES ($1)
       ON CONFLICT (character_id) DO NOTHING`,
      [newChar.id]
    );


    // 2. VINCULA À CAMPANHA (SE HOUVER ID)
    if (campaignId) {
      // Verifica se a campanha existe
      const campCheck = await client.query('SELECT id FROM campaigns WHERE id = $1', [campaignId]);
      
      if (campCheck.rows.length > 0) {
        await client.query(
          `INSERT INTO campaign_characters (campaign_id, character_id) VALUES ($1, $2)`,
          [campaignId, newChar.id]
        );
      }
    }

    await client.query('COMMIT'); // Salva tudo
    return res.status(201).json(newChar);

  } catch (error) {
    await client.query('ROLLBACK'); // Desfaz se der erro
    console.error("Erro createCharacter:", error);
    return res.status(500).json({ error: 'Erro ao criar personagem.' });
  } finally {
    client.release();
  }
};

// ==========================================
// 3. BUSCAR POR ID
// ==========================================
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`SELECT * FROM characters WHERE id = $1`, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Personagem não encontrado.' });
    }
    
    return res.json({ character: result.rows[0] });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao buscar personagem.' });
  }
};

// ==========================================
// 4. ATUALIZAR
// ==========================================
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const { name, class: charClass, race, level, sheet_data } = req.body;

    // Verifica permissão
    const charRes = await pool.query(`SELECT user_id FROM characters WHERE id = $1`, [id]);
    if (charRes.rows.length === 0) return res.status(404).json({ error: 'Não encontrado.' });
    
    const ownerId = charRes.rows[0].user_id;
    let canEdit = (userId === ownerId);

    if (!canEdit) {
      // Verifica se é Mestre
      const masterCheck = await pool.query(
        `SELECT 1 FROM campaign_characters cc
         JOIN campaigns c ON c.id = cc.campaign_id
         WHERE cc.character_id = $1 AND c.owner_id = $2`,
        [id, userId]
      );
      if (masterCheck.rows.length > 0) canEdit = true;
    }

    if (!canEdit) return res.status(403).json({ error: 'Sem permissão.' });

    const result = await pool.query(
      `UPDATE characters 
       SET name = COALESCE($1, name), 
           class = COALESCE($2, class), 
           race = COALESCE($3, race), 
           level = COALESCE($4, level),
           sheet_data = COALESCE($5, sheet_data)
       WHERE id = $6 
       RETURNING *`,
      [name, charClass, race, level, sheet_data, id]
    );

    return res.json({ character: result.rows[0] });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao atualizar.' });
  }
};

// ==========================================
// 5. DELETAR
// ==========================================
exports.deleteCharacter = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const check = await pool.query(`SELECT user_id FROM characters WHERE id = $1`, [id]);
    if (check.rows.length === 0) return res.status(404).json({ error: 'Não encontrado.' });
    if (check.rows[0].user_id !== userId) return res.status(403).json({ error: 'Sem permissão.' });

    await pool.query(`DELETE FROM campaign_characters WHERE character_id = $1`, [id]);
    await pool.query(`DELETE FROM characters WHERE id = $1`, [id]);

    return res.json({ message: 'Personagem excluído.' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao excluir.' });
  }
};

// ==========================================
// 6. LISTAR CAMPANHAS DO PERSONAGEM
// ==========================================
exports.listCharacterCampaigns = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT c.id, c.name, c.owner_id, c.description
      FROM campaign_characters cc
      JOIN campaigns c ON cc.campaign_id = c.id
      WHERE cc.character_id = $1
    `, [id]);

    return res.json(result.rows);
  } catch (error) {
    console.error("Erro listCharacterCampaigns:", error);
    return res.status(500).json({ error: "Erro interno." });
  }
};
// ==========================================
// 7. LEGADO NARRATIVO (GET /characters/:id/legacy)
// ==========================================
exports.getLegacy = async (req, res) => {
  try {
    const { id: characterId } = req.params;
    const userId = req.userId;

    // 1) Permissão: dono do personagem OU GM em alguma campanha onde o personagem está vinculado
    const charRes = await pool.query(
      `SELECT user_id FROM characters WHERE id = $1`,
      [characterId]
    );

    if (charRes.rows.length === 0) {
      return res.status(404).json({ error: "Personagem não encontrado." });
    }

    const ownerId = charRes.rows[0].user_id;
    let canView = (String(userId) === String(ownerId));

    if (!canView) {
      const gmCheck = await pool.query(
        `
        SELECT 1
        FROM campaign_characters cc
        JOIN campaigns c ON c.id = cc.campaign_id
        WHERE cc.character_id = $1
          AND c.owner_id = $2
        LIMIT 1
        `,
        [characterId, userId]
      );
      if (gmCheck.rows.length > 0) canView = true;
    }

    if (!canView) {
      return res.status(403).json({ error: "Sem permissão para acessar o legado deste personagem." });
    }

    // 2) Lazy insert: garante que sempre existe linha de legado
    await pool.query(
      `
      INSERT INTO character_narrative_legacy (character_id)
      VALUES ($1)
      ON CONFLICT (character_id) DO NOTHING
      `,
      [characterId]
    );

    // 3) Busca legado
    const legacyRes = await pool.query(
      `
      SELECT reputation, marks, titles, burdens, hooks, created_at, updated_at
      FROM character_narrative_legacy
      WHERE character_id = $1
      LIMIT 1
      `,
      [characterId]
    );

    const row = legacyRes.rows[0] || {
      reputation: {},
      marks: [],
      titles: [],
      burdens: [],
      hooks: [],
      created_at: null,
      updated_at: null,
    };

    return res.json({ legacy: row });
  } catch (error) {
    console.error("Erro getLegacy:", error);
    return res.status(500).json({ error: "Erro ao buscar legado." });
  }
};
// ==========================================
// 8. LEGADO NARRATIVO (PUT /characters/:id/legacy)
// Payload:
// {
//   "append": { "marks": [], "titles": [], "burdens": [], "hooks": [] },
//   "reputation": { "heroism": 1, "honor": -1 }
// }
// ==========================================
exports.updateLegacy = async (req, res) => {
  try {
    const { id: characterId } = req.params;
    const userId = req.userId;

    const { append = {}, reputation = null } = req.body || {};
    const appendMarks = Array.isArray(append.marks) ? append.marks : [];
    const appendTitles = Array.isArray(append.titles) ? append.titles : [];
    const appendBurdens = Array.isArray(append.burdens) ? append.burdens : [];
    const appendHooks = Array.isArray(append.hooks) ? append.hooks : [];

    // 1) Permissão: dono OU GM em alguma campanha vinculada ao personagem
    const charRes = await pool.query(
      `SELECT user_id FROM characters WHERE id = $1`,
      [characterId]
    );
    if (charRes.rows.length === 0) {
      return res.status(404).json({ error: "Personagem não encontrado." });
    }

    const ownerId = charRes.rows[0].user_id;
    let canEdit = (String(userId) === String(ownerId));

    if (!canEdit) {
      const gmCheck = await pool.query(
        `
        SELECT 1
        FROM campaign_characters cc
        JOIN campaigns c ON c.id = cc.campaign_id
        WHERE cc.character_id = $1
          AND c.owner_id = $2
        LIMIT 1
        `,
        [characterId, userId]
      );
      if (gmCheck.rows.length > 0) canEdit = true;
    }

    if (!canEdit) {
      return res.status(403).json({ error: "Sem permissão para editar o legado deste personagem." });
    }

    // 2) Garante linha
    await pool.query(
      `
      INSERT INTO character_narrative_legacy (character_id)
      VALUES ($1)
      ON CONFLICT (character_id) DO NOTHING
      `,
      [characterId]
    );

    // 3) Atualiza com concat em arrays + merge em reputation
    // Arrays: jsonb || jsonb funciona como concat para arrays
    // reputation: merge simples (sobrescreve chaves informadas)
    const repObj = (reputation && typeof reputation === "object") ? reputation : null;

    const updateRes = await pool.query(
      `
      UPDATE character_narrative_legacy
      SET
        marks   = COALESCE(marks, '[]'::jsonb)   || $2::jsonb,
        titles  = COALESCE(titles, '[]'::jsonb)  || $3::jsonb,
        burdens = COALESCE(burdens, '[]'::jsonb) || $4::jsonb,
        hooks   = COALESCE(hooks, '[]'::jsonb)   || $5::jsonb,
        reputation = CASE
          WHEN $6::jsonb IS NULL THEN reputation
          ELSE COALESCE(reputation, '{}'::jsonb) || $6::jsonb
        END
      WHERE character_id = $1
      RETURNING reputation, marks, titles, burdens, hooks, created_at, updated_at
      `,
      [
        characterId,
        JSON.stringify(appendMarks),
        JSON.stringify(appendTitles),
        JSON.stringify(appendBurdens),
        JSON.stringify(appendHooks),
        repObj ? JSON.stringify(repObj) : null,
      ]
    );

    return res.json({ legacy: updateRes.rows[0] });
  } catch (error) {
    console.error("Erro updateLegacy:", error);
    return res.status(500).json({ error: "Erro ao atualizar legado." });
  }
};

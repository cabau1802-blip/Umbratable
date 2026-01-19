// backend/controllers/export.controller.js
const { pool } = require("../db");

/**
 * Exporta uma campanha inteira (backup) em JSON.
 * Inclui:
 * - campaign (campaigns)
 * - participants (owner + campaign_members + campaign_invitations aceitos + donos de personagens vinculados)
 * - characters (campaign_characters + characters + users)
 * - events (campaign_session_events)
 * - diary (campaign_diary_entries)
 *
 * Regras:
 * - Apenas o GM (owner_id) pode exportar sua campanha.
 * - ADMIN pode exportar qualquer campanha.
 */
async function exportCampaignData(req, res) {
  try {
    const campaignId = String(req.params?.id || "").trim();
    if (!campaignId) {
      return res.status(400).json({ error: "INVALID_ID", message: "campaign id ausente." });
    }

    const userId = req.userId;
    const roleRaw = req.user?.role ?? req.jwt?.role ?? null;
    const role = String(roleRaw || "").trim().toUpperCase();
    const isAdmin = role === "ADMIN";

    // 1) Campanha (GM ou Admin)
    const campaignQuery = isAdmin
      ? `SELECT * FROM campaigns WHERE id = $1 LIMIT 1`
      : `SELECT * FROM campaigns WHERE id = $1 AND owner_id = $2 LIMIT 1`;

    const campaignParams = isAdmin ? [campaignId] : [campaignId, userId];

    const campaignRes = await pool.query(campaignQuery, campaignParams);
    if (campaignRes.rows.length === 0) {
      return res
        .status(404)
        .json({ error: "NOT_FOUND", message: "Campanha não encontrada (ou sem permissão)." });
    }

    const campaign = campaignRes.rows[0];

    // 2) Participants (consolidados)
    let participants = [];
    try {
      const partsRes = await pool.query(
        `
        WITH ids AS (
          SELECT c.owner_id::uuid AS user_id
            FROM campaigns c
           WHERE c.id = $1

          UNION

          SELECT cm.user_id::uuid AS user_id
            FROM campaign_members cm
           WHERE cm.campaign_id = $1

          UNION

          SELECT ch.user_id::uuid AS user_id
            FROM campaign_characters cc
            JOIN characters ch ON ch.id = cc.character_id
           WHERE cc.campaign_id = $1

          UNION

          SELECT ci.to_user_id::uuid AS user_id
            FROM campaign_invitations ci
           WHERE ci.campaign_id = $1 AND ci.status = 'accepted'
        )
        SELECT
          u.id AS user_id,
          u.email,
          u.username,
          CASE
            WHEN u.id = (SELECT owner_id FROM campaigns WHERE id = $1) THEN 'master'
            ELSE 'player'
          END AS role
        FROM ids
        JOIN users u ON u.id = ids.user_id
        GROUP BY u.id, u.email, u.username
        ORDER BY
          CASE WHEN u.id = (SELECT owner_id FROM campaigns WHERE id = $1) THEN 0 ELSE 1 END,
          u.username ASC
        `,
        [campaignId]
      );
      participants = partsRes.rows;
    } catch {
      participants = [];
    }

    // 3) Characters vinculados
    let characters = [];
    try {
      const charsRes = await pool.query(
        `
        SELECT
          cc.campaign_id,
          cc.character_id,
          cc.role AS campaign_role,
          c.*,
          u.username AS owner_username,
          u.email AS owner_email
        FROM campaign_characters cc
        JOIN characters c ON cc.character_id = c.id
        JOIN users u ON c.user_id = u.id
        WHERE cc.campaign_id = $1
        ORDER BY cc.role DESC, c.created_at ASC NULLS LAST
        `,
        [campaignId]
      );
      characters = charsRes.rows;
    } catch {
      characters = [];
    }

    // 4) Events
    let events = [];
    try {
      const evRes = await pool.query(
        `
        SELECT *
          FROM campaign_session_events
         WHERE campaign_id = $1
         ORDER BY created_at ASC
        `,
        [campaignId]
      );
      events = evRes.rows;
    } catch {
      events = [];
    }

    // 5) Diary
    let diary = [];
    try {
      const diaryRes = await pool.query(
        `
        SELECT *
          FROM campaign_diary_entries
         WHERE campaign_id = $1
         ORDER BY created_at ASC
        `,
        [campaignId]
      );
      diary = diaryRes.rows;
    } catch {
      diary = [];
    }

    const payload = {
      meta: {
        exportedAt: new Date().toISOString(),
        version: "1.0",
        type: "campaign_export",
      },
      campaign,
      participants,
      characters,
      events,
      diary,
    };

    const filename = `umbraltable-campaign-${campaignId}.json`;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.status(200).send(JSON.stringify(payload, null, 2));
  } catch (err) {
    console.error("[exportCampaignData]", err);
    return res.status(500).json({ error: "INTERNAL_ERROR", message: "Falha ao exportar campanha." });
  }
}

module.exports = { exportCampaignData };

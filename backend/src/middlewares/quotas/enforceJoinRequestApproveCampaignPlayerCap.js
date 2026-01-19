// backend/src/middlewares/quotas/enforceJoinRequestApproveCampaignPlayerCap.js
const { pool } = require("../../db");
const { isAdminReq, getUserLimits, getCampaignOwnerId, getCampaignPlayerCount } = require("../../services/userLimits.service");
const { quotaExceeded } = require("./quotaUtils");

/**
 * Usado no fluxo: POST /campaigns/join-requests/:requestId/approve
 * Resolve campaign_id a partir de campaign_join_requests e valida capacidade da campanha.
 *
 * Importante:
 * - Não bloqueia ADMIN
 * - Não bloqueia o GM (owner_id) por capacidade
 */
async function enforceJoinRequestApproveCampaignPlayerCap(req, res, next) {
  try {
    if (isAdminReq(req)) return next();

    const userId = req.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const requestId = String(req.params?.requestId || "").trim();
    if (!requestId) return res.status(400).json({ message: "requestId ausente." });

    const rq = await pool.query(
      `SELECT campaign_id FROM campaign_join_requests WHERE id = $1 LIMIT 1`,
      [requestId]
    );
    if (!rq.rows?.length) return res.status(404).json({ message: "Solicitação não encontrada." });

    const campaignId = String(rq.rows[0].campaign_id);

    const ownerId = await getCampaignOwnerId(campaignId);
    if (!ownerId) return res.status(404).json({ message: "Campanha não encontrada." });

    // GM não é bloqueado por capacidade
    if (String(ownerId) === String(userId)) return next();

    const gmLimits = await getUserLimits(ownerId);
    const limit = Number(gmLimits.max_players_per_campaign || 0);
    const current = await getCampaignPlayerCount(campaignId);

    if (current >= limit) {
      return quotaExceeded(res, { limit, current, resource: "players_per_campaign" });
    }

    return next();
  } catch (err) {
    console.error("[quota] enforceJoinRequestApproveCampaignPlayerCap error:", err);
    return res.status(500).json({ message: "Erro interno do servidor." });
  }
}

module.exports = { enforceJoinRequestApproveCampaignPlayerCap };

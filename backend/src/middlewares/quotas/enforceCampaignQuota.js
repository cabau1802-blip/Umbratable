// backend/src/middlewares/quotas/enforceCampaignQuota.js
const { pool } = require("../../db");
const { isAdminReq, getUserLimits } = require("../../services/userLimits.service");
const { quotaExceeded } = require("./quotaUtils");

async function enforceCampaignQuota(req, res, next) {
  try {
    if (isAdminReq(req)) return next();

    const userId = req.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const limits = await getUserLimits(userId);

    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS c FROM campaigns WHERE owner_id = $1`,
      [String(userId)]
    );
    const current = Number(rows?.[0]?.c || 0);
    const limit = Number(limits.max_campaigns_created || 0);

    if (current >= limit) {
      return quotaExceeded(res, { limit, current, resource: "campaigns" });
    }

    return next();
  } catch (err) {
    console.error("[quota] enforceCampaignQuota error:", err);
    return res.status(500).json({ message: "Erro interno do servidor." });
  }
}

module.exports = { enforceCampaignQuota };

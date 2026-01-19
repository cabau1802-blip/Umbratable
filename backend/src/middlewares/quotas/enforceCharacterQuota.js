// backend/src/middlewares/quotas/enforceCharacterQuota.js
const { pool } = require("../../db");
const { isAdminReq, getCharacterLimitForUser } = require("../../services/userLimits.service");
const { quotaExceeded } = require("./quotaUtils");

async function enforceCharacterQuota(req, res, next) {
  try {
    if (isAdminReq(req)) return next();

    const userId = req.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { maxCharacters } = await getCharacterLimitForUser(userId);

    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS c FROM characters WHERE user_id = $1`,
      [String(userId)]
    );
    const current = Number(rows?.[0]?.c || 0);
    const limit = Number(maxCharacters || 0);

    if (current >= limit) {
      return quotaExceeded(res, { limit, current, resource: "characters" });
    }

    return next();
  } catch (err) {
    console.error("[quota] enforceCharacterQuota error:", err);
    return res.status(500).json({ message: "Erro interno do servidor." });
  }
}

module.exports = { enforceCharacterQuota };

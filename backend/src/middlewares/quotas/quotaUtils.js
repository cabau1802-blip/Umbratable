// backend/src/middlewares/quotas/quotaUtils.js
function quotaExceeded(res, { limit, current, resource }) {
  return res.status(409).json({
    error: "QUOTA_EXCEEDED",
    message: "Você atingiu o limite do seu plano.",
    details: {
      limit: Number(limit ?? 0),
      current: Number(current ?? 0),
      resource: String(resource || ""),
    },
  });
}

module.exports = { quotaExceeded };

// backend/src/middlewares/quotas/enforceJoinedCampaignQuota.js
const {
  isAdminReq,
  getUserLimits,
  getCampaignOwnerId,
  isUserAlreadyInCampaignAsPlayer,
  countJoinedCampaignsAsPlayer,
} = require("../../services/userLimits.service");
const { quotaExceeded } = require("./quotaUtils");

/**
 * Bloqueia quando o usuário (não-admin) tenta ENTRAR como player em uma nova campanha
 * e já está no limite de campanhas como player.
 *
 * Uso:
 *   router.post("/:id/join", enforceJoinedCampaignQuota({ campaignIdParam: "id" }), controller.joinOpenCampaign)
 */
function enforceJoinedCampaignQuota(opts = {}) {
  const campaignIdParam = opts.campaignIdParam || "id";

  return async function (req, res, next) {
    try {
      if (isAdminReq(req)) return next();

      const userId = req.userId;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const campaignId = req.params?.[campaignIdParam];
      if (!campaignId) return res.status(400).json({ message: "campaignId ausente." });

      const ownerId = await getCampaignOwnerId(campaignId);
      if (!ownerId) return res.status(404).json({ message: "Campanha não encontrada." });

      // Se ele é o GM desta campanha, não aplica limite de player-joins
      if (String(ownerId) === String(userId)) return next();

      // Se já está na campanha, não conta como nova entrada
      const already = await isUserAlreadyInCampaignAsPlayer(userId, campaignId);
      if (already) return next();

      const limits = await getUserLimits(userId);
      const limit = Number(limits.max_joined_campaigns || 0);

      const current = await countJoinedCampaignsAsPlayer(userId);

      if (current >= limit) {
        return quotaExceeded(res, { limit, current, resource: "joined_campaigns" });
      }

      return next();
    } catch (err) {
      console.error("[quota] enforceJoinedCampaignQuota error:", err);
      return res.status(500).json({ message: "Erro interno do servidor." });
    }
  };
}

module.exports = { enforceJoinedCampaignQuota };

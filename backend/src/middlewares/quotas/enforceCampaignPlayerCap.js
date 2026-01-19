// backend/src/middlewares/quotas/enforceCampaignPlayerCap.js
const {
  isAdminReq,
  getCampaignOwnerId,
  getUserLimits,
  getCampaignPlayerCount,
  isUserAlreadyInCampaignAsPlayer,
} = require("../../services/userLimits.service");
const { quotaExceeded } = require("./quotaUtils");

/**
 * Garante que a campanha não exceda o limite de players (fora o GM).
 * Este limite pertence ao GM (owner_id) da campanha.
 *
 * Observação:
 * - Só bloqueia quando o usuário está tentando ENTRAR como player (ou seja, não é o GM)
 * - Se já está na campanha, não bloqueia (idempotente)
 */
function enforceCampaignPlayerCap(opts = {}) {
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

      // GM não é bloqueado por capacidade
      if (String(ownerId) === String(userId)) return next();

      // Se já está na campanha, não ocupa novo slot
      const already = await isUserAlreadyInCampaignAsPlayer(userId, campaignId);
      if (already) return next();

      const gmLimits = await getUserLimits(ownerId);
      const limit = Number(gmLimits.max_players_per_campaign || 0);

      const current = await getCampaignPlayerCount(campaignId);

      if (current >= limit) {
        return quotaExceeded(res, { limit, current, resource: "players_per_campaign" });
      }

      return next();
    } catch (err) {
      console.error("[quota] enforceCampaignPlayerCap error:", err);
      return res.status(500).json({ message: "Erro interno do servidor." });
    }
  };
}

module.exports = { enforceCampaignPlayerCap };

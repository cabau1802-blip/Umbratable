// backend/src/middlewares/quotas/enforceInvitationAcceptQuotas.js
const { pool } = require("../../db");
const {
  isAdminReq,
  getCampaignOwnerId,
  isUserAlreadyInCampaignAsPlayer,
  countJoinedCampaignsAsPlayer,
  getUserLimits,
  getCampaignPlayerCount,
} = require("../../services/userLimits.service");
const { quotaExceeded } = require("./quotaUtils");

/**
 * Aplica quotas quando o usuário RESPONDE um convite de campanha.
 * Só atua quando o payload indica ACEITAR (status: 'accepted'|'accept' etc).
 *
 * - Player: só pode entrar em 1 campanha (joined_campaigns)
 * - Campanha: capacidade máxima de players (players_per_campaign), baseada no GM
 */
async function enforceInvitationAcceptQuotas(req, res, next) {
  try {
    if (isAdminReq(req)) return next();

    const userId = req.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const rawStatus = req.body?.status ?? req.body?.action ?? null;
    const status = String(rawStatus || "").trim().toLowerCase();

    const isAccept =
      status === "accepted" ||
      status === "accept" ||
      status === "approve" ||
      status === "ok" ||
      status === "yes";

    // Se não for aceite, não valida quotas
    if (!isAccept) return next();

    const inviteId = req.params?.id;
    if (!inviteId) return res.status(400).json({ message: "invite id ausente." });

    const inv = await pool.query(
      `SELECT id, campaign_id, invited_user_id, status FROM campaign_invitations WHERE id = $1 LIMIT 1`,
      [String(inviteId)]
    );
    if (!inv.rows?.length) return res.status(404).json({ message: "Convite não encontrado." });

    const invite = inv.rows[0];

    // Segurança: só o convidado pode aceitar
    if (String(invite.invited_user_id) !== String(userId)) {
      return res.status(403).json({ message: "Acesso restrito." });
    }

    const campaignId = String(invite.campaign_id);

    const ownerId = await getCampaignOwnerId(campaignId);
    if (!ownerId) return res.status(404).json({ message: "Campanha não encontrada." });

    if (String(ownerId) === String(userId)) return next(); // GM não aplica

    // Se já está na campanha, não conta nem consome slot
    const already = await isUserAlreadyInCampaignAsPlayer(userId, campaignId);
    if (!already) {
      // 1) Limite de campanhas como player
      const limits = await getUserLimits(userId);
      const limitJoin = Number(limits.max_joined_campaigns || 0);
      const currentJoin = await countJoinedCampaignsAsPlayer(userId);

      if (currentJoin >= limitJoin) {
        return quotaExceeded(res, { limit: limitJoin, current: currentJoin, resource: "joined_campaigns" });
      }

      // 2) Capacidade da campanha (limite do GM)
      const gmLimits = await getUserLimits(ownerId);
      const limitPlayers = Number(gmLimits.max_players_per_campaign || 0);
      const currentPlayers = await getCampaignPlayerCount(campaignId);

      if (currentPlayers >= limitPlayers) {
        return quotaExceeded(res, { limit: limitPlayers, current: currentPlayers, resource: "players_per_campaign" });
      }
    }

    return next();
  } catch (err) {
    console.error("[quota] enforceInvitationAcceptQuotas error:", err);
    return res.status(500).json({ message: "Erro interno do servidor." });
  }
}

module.exports = { enforceInvitationAcceptQuotas };

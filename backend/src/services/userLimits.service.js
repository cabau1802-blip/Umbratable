// backend/src/services/userLimits.service.js
const { pool } = require("../db");

const DEFAULT_LIMITS = Object.freeze({
  max_campaigns_created: 3,
  max_players_per_campaign: 3,
  max_characters_player: 2,
  max_characters_gm: 3,
  max_joined_campaigns: 1,
});

function getRoleFromJwtLike(obj) {
  const roleRaw = obj?.role ?? null;
  return String(roleRaw || "").trim().toUpperCase();
}

function isAdminJwtPayload(jwtLike) {
  return getRoleFromJwtLike(jwtLike) === "ADMIN";
}

function isAdminReq(req) {
  return isAdminJwtPayload(req?.user) || isAdminJwtPayload(req?.jwt);
}

async function ensureUserLimitsRow(userId) {
  if (!userId) return;

  // Cria a linha com defaults se ainda não existir (idempotente)
  await pool.query(
    `
    INSERT INTO user_limits
      (user_id, max_campaigns_created, max_players_per_campaign, max_characters_player, max_characters_gm, max_joined_campaigns, updated_at)
    VALUES
      ($1, $2, $3, $4, $5, $6, NOW())
    ON CONFLICT (user_id) DO NOTHING
  `,
    [
      String(userId),
      DEFAULT_LIMITS.max_campaigns_created,
      DEFAULT_LIMITS.max_players_per_campaign,
      DEFAULT_LIMITS.max_characters_player,
      DEFAULT_LIMITS.max_characters_gm,
      DEFAULT_LIMITS.max_joined_campaigns,
    ]
  );
}

async function getUserLimits(userId) {
  if (!userId) throw new Error("missing_user_id");

  await ensureUserLimitsRow(userId);

  const { rows } = await pool.query(
    `
    SELECT
      user_id,
      max_campaigns_created,
      max_players_per_campaign,
      max_characters_player,
      max_characters_gm,
      max_joined_campaigns,
      updated_at
    FROM user_limits
    WHERE user_id = $1
    LIMIT 1
  `,
    [String(userId)]
  );

  // Fallback defensivo (não deveria acontecer porque ensureUserLimitsRow)
  if (!rows?.length) {
    return { user_id: String(userId), ...DEFAULT_LIMITS, updated_at: new Date().toISOString() };
  }

  return rows[0];
}

async function isUserGm(userId) {
  const { rows } = await pool.query(
    `SELECT 1 FROM campaigns WHERE owner_id = $1 LIMIT 1`,
    [String(userId)]
  );
  return rows.length > 0;
}

async function getCharacterLimitForUser(userId) {
  const limits = await getUserLimits(userId);
  const gm = await isUserGm(userId);
  return {
    limits,
    isGm: gm,
    maxCharacters: gm ? Number(limits.max_characters_gm) : Number(limits.max_characters_player),
  };
}

async function getCampaignOwnerId(campaignId) {
  const { rows } = await pool.query(`SELECT owner_id FROM campaigns WHERE id = $1 LIMIT 1`, [String(campaignId)]);
  return rows?.[0]?.owner_id != null ? String(rows[0].owner_id) : null;
}

async function getCampaignPlayerCount(campaignId) {
  // Conta players cadastrados na campanha (fora o GM).
  // OBS: a tabela campaign_members no seu código usa role: 'master' | 'player'
  const { rows } = await pool.query(
    `
    SELECT COUNT(*)::int AS c
    FROM campaign_members
    WHERE campaign_id = $1 AND role = 'player'
  `,
    [String(campaignId)]
  );
  return Number(rows?.[0]?.c || 0);
}

async function isUserAlreadyInCampaignAsPlayer(userId, campaignId) {
  // Verifica se já participa (como member) — se sim, não conta como "nova campanha"
  const { rows } = await pool.query(
    `
    SELECT 1
    FROM campaign_members
    WHERE campaign_id = $1 AND user_id = $2
    LIMIT 1
  `,
    [String(campaignId), String(userId)]
  );
  return rows.length > 0;
}

async function countJoinedCampaignsAsPlayer(userId) {
  // Conta campanhas distintas onde o usuário participa como PLAYER, excluindo campanhas onde é GM (owner_id).
  // Critérios:
  // - campaign_members (role='player')
  // - convites aceitos (campaign_invitations status='accepted')
  // - personagens vinculados à campanha (campaign_characters -> characters.user_id)
  //
  // Observação: como você já usa essas tabelas no campaign.controller, assumimos que existem.
  const { rows } = await pool.query(
    `
    WITH gm_campaigns AS (
      SELECT id FROM campaigns WHERE owner_id = $1
    ),
    as_member AS (
      SELECT DISTINCT campaign_id
      FROM campaign_members
      WHERE user_id = $1 AND role = 'player'
    ),
    as_invited AS (
      SELECT DISTINCT campaign_id
      FROM campaign_invitations
      WHERE invited_user_id = $1 AND status = 'accepted'
    ),
    as_character AS (
      SELECT DISTINCT cc.campaign_id
      FROM campaign_characters cc
      JOIN characters ch ON ch.id = cc.character_id
      WHERE ch.user_id = $1
    ),
    unioned AS (
      SELECT campaign_id FROM as_member
      UNION
      SELECT campaign_id FROM as_invited
      UNION
      SELECT campaign_id FROM as_character
    )
    SELECT COUNT(DISTINCT u.campaign_id)::int AS c
    FROM unioned u
    WHERE NOT EXISTS (SELECT 1 FROM gm_campaigns g WHERE g.id = u.campaign_id)
  `,
    [String(userId)]
  );

  return Number(rows?.[0]?.c || 0);
}

module.exports = {
  DEFAULT_LIMITS,
  isAdminReq,
  isAdminJwtPayload,
  ensureUserLimitsRow,
  getUserLimits,
  isUserGm,
  getCharacterLimitForUser,
  getCampaignOwnerId,
  getCampaignPlayerCount,
  isUserAlreadyInCampaignAsPlayer,
  countJoinedCampaignsAsPlayer,
};


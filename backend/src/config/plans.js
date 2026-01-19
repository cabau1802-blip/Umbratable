// backend/src/config/plans.js

/**
 * Catálogo de planos e entitlements.
 *
 * - "limits" aqui representa defaults por plano (fallback se não houver override em user_limits).
 * - "features" são flags para liberação de funcionalidades no frontend/backend.
 * - "Admin" ignora quotas por lógica (não depende de limites).
 */

const PLAN_DEFINITIONS = Object.freeze({
  FREE: {
    key: "FREE",
    name: "Freemium",
    priceCents: 0,
    // Defaults de quota (pode ser sobrescrito por user_limits)
    limits: {
      max_campaigns: 3,
      max_characters: 3,
      max_players_per_session: 3,
    },
    // Flags de funcionalidade (gating)
    features: {
      premiumBadge: false,
      gmPrivateNotes: false,
      exportData: false,
      advancedFog: false,
      extraStorage: false,
      unlimitedHistory: false,
    },
  },
  PREMIUM: {
    key: "PREMIUM",
    name: "Premium",
    priceCents: 2990,
    limits: {
      max_campaigns: 20,
      max_characters: 20,
      max_players_per_session: 8,
    },
    features: {
      premiumBadge: true,
      gmPrivateNotes: true,
      exportData: true,
      advancedFog: true,
      extraStorage: true,
      unlimitedHistory: true,
    },
  },
});

const ADMIN_ENTITLEMENTS = Object.freeze({
  plan: "ADMIN",
  planName: "Admin",
  limits: {
    max_campaigns: 9999,
    max_characters: 9999,
    max_players_per_session: 9999,
  },
  features: {
    premiumBadge: true,
    gmPrivateNotes: true,
    exportData: true,
    advancedFog: true,
    extraStorage: true,
    unlimitedHistory: true,
  },
});

function normalizePlanKey(plan) {
  const key = String(plan || "").trim().toUpperCase();
  return key || "FREE";
}

function getPlanDefinition(planKey) {
  const key = normalizePlanKey(planKey);
  return PLAN_DEFINITIONS[key] || PLAN_DEFINITIONS.FREE;
}

/**
 * Constrói entitlements efetivos.
 *
 * @param {object} params
 * @param {string} params.role - role do usuário (ADMIN ignora)
 * @param {string} params.plan - plano do usuário (FREE/PREMIUM)
 * @param {object|null} params.overrideLimits - limites do user_limits (se existir)
 */
function buildEntitlements({ role, plan, overrideLimits }) {
  const isAdmin = String(role || "").toUpperCase() === "ADMIN";
  if (isAdmin) return { ...ADMIN_ENTITLEMENTS };

  const def = getPlanDefinition(plan);
  const limits = {
    ...def.limits,
    ...(overrideLimits || {}),
  };

  return {
    plan: def.key,
    planName: def.name,
    priceCents: def.priceCents,
    limits,
    features: { ...def.features },
  };
}

module.exports = {
  PLAN_DEFINITIONS,
  normalizePlanKey,
  getPlanDefinition,
  buildEntitlements,
  ADMIN_ENTITLEMENTS,
};

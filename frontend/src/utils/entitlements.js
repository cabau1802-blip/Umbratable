// frontend/src/utils/entitlements.js

/**
 * Helpers de gating por plano/entitlements.
 *
 * Backend (auth/login/me) retorna:
 * - user: { ... , plan }
 * - entitlements: { plan, planName, limits, features }
 */

export function normalizeKey(key) {
  return String(key || "").trim();
}

export function getEntitlements(user) {
  // Se seu AuthContext guarda entitlements fora de user, adapte aqui.
  return user?.entitlements || null;
}

export function getUserPlan(user) {
  const ent = getEntitlements(user);
  return String(ent?.plan || user?.plan || "FREE").toUpperCase();
}

export function hasFeature(user, featureKey) {
  const k = normalizeKey(featureKey);
  if (!k) return false;
  const ent = getEntitlements(user);
  const features = ent?.features || {};
  return Boolean(features[k]);
}

export function getLimit(user, limitKey, fallback = 0) {
  const k = normalizeKey(limitKey);
  const ent = getEntitlements(user);
  const limits = ent?.limits || {};
  const v = limits[k];
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) return Number(v);
  return fallback;
}

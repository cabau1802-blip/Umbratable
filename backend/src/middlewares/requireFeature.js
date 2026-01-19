// backend/middlewares/requireFeature.js

function isAdmin(req) {
  const roleRaw = req.user?.role ?? req.jwt?.role ?? null;
  const role = String(roleRaw || "").trim().toUpperCase();
  return role === "ADMIN";
}

function getPlan(req) {
  const planRaw = req.user?.plan ?? req.jwt?.plan ?? null;
  return String(planRaw || "FREE").trim().toUpperCase();
}

/**
 * Gate de funcionalidades por plano.
 *
 * - ADMIN sempre é permitido.
 * - Para usuários comuns, valida plan === 'PREMIUM' quando a feature for premium.
 */
function requireFeature(featureKey) {
  const key = String(featureKey || "").trim();

  return function requireFeatureMiddleware(req, res, next) {
    if (isAdmin(req)) return next();

    const plan = getPlan(req);

    // Premium-only (cresce com o tempo)
    const premiumOnly = new Set([
      "exportData",
      "gmPrivateNotes",
      "advancedFog",
      "extraStorage",
      "unlimitedHistory",
    ]);

    if (premiumOnly.has(key) && plan !== "PREMIUM") {
      return res.status(403).json({
        error: "FEATURE_NOT_ALLOWED",
        message: "Recurso disponível apenas no Premium.",
        details: { feature: key, plan },
      });
    }

    return next();
  };
}

module.exports = { requireFeature };

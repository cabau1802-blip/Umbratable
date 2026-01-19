// backend/src/middlewares/adminOnly.js
/**
 * Restringe acesso ao dashboard apenas para ADMIN.
 *
 * Requisitos:
 * - Um middleware de autenticação deve rodar antes (authJwt ou authMiddleware)
 * - Ele deve popular req.user (payload do JWT) OU pelo menos req.userId.
 *
 * Regra:
 * - ADMIN quando req.user.role === "ADMIN" (case-insensitive).
 */
function adminOnly(req, res, next) {
  const roleRaw = req.user?.role ?? req.jwt?.role ?? null;
  const role = String(roleRaw || "").trim().toUpperCase();

  if (role !== "ADMIN") {
    return res.status(403).json({ message: "Acesso restrito." });
  }

  return next();
}

module.exports = { adminOnly };

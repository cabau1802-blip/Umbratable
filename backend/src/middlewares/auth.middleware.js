const jwt = require("jsonwebtoken");

/**
 * Extrai token do header Authorization: Bearer <token>
 * ou do header x-access-token.
 */
function extractToken(req) {
  const authHeader = req.headers?.authorization || req.headers?.Authorization;
  if (authHeader && typeof authHeader === "string") {
    const parts = authHeader.split(" ");
    if (parts.length === 2 && /^Bearer$/i.test(parts[0])) {
      return parts[1];
    }
    // fallback: se vier só o token
    if (parts.length === 1) return parts[0];
  }

  const xToken = req.headers?.["x-access-token"];
  if (xToken && typeof xToken === "string") return xToken;

  return null;
}

/**
 * Middleware HTTP (Express) — protege rotas REST.
 * Mantém contrato: seta req.userId quando OK.
 * Também popula req.user (payload completo) para uso em middlewares (ex.: adminOnly).
 */
function authMiddleware(req, res, next) {
  try {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ message: "Token não fornecido." });
    }

    const secret = process.env.JWT_SECRET || process.env.SECRET || "secret";
    const decoded = jwt.verify(token, secret);

    // Compatibilidade: pode ser { id } ou { userId } ou { sub }
    req.userId = decoded?.id || decoded?.userId || decoded?.sub;

    if (!req.userId) {
      return res.status(401).json({ message: "Token inválido (sem userId)." });
    }

    // Anexa payload completo
    req.user = decoded;
    req.jwt = decoded;

    return next();
  } catch (err) {
    return res.status(401).json({ message: "Token inválido ou expirado." });
  }
}

/**
 * Helper para Socket.IO (opcional).
 * Uso típico:
 * io.use(socketAuth);
 */
function socketAuth(socket, next) {
  try {
    const token =
      socket?.handshake?.auth?.token ||
      (typeof socket?.handshake?.headers?.authorization === "string"
        ? socket.handshake.headers.authorization.replace(/^Bearer\s+/i, "")
        : null);

    if (!token) return next(new Error("Unauthorized"));

    const secret = process.env.JWT_SECRET || process.env.SECRET || "secret";
    const decoded = jwt.verify(token, secret);

    socket.userId = decoded?.id || decoded?.userId || decoded?.sub;
    if (!socket.userId) return next(new Error("Unauthorized"));

    socket.user = decoded;
    return next();
  } catch (e) {
    return next(new Error("Unauthorized"));
  }
}

// Export padrão (compatível com o que suas rotas usam: router.use(authMiddleware))
module.exports = authMiddleware;

// Exports auxiliares (não quebram contratos existentes)
module.exports.extractToken = extractToken;
module.exports.socketAuth = socketAuth;

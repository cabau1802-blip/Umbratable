// backend/src/middlewares/authJwt.js
const jwt = require("jsonwebtoken");

/**
 * Middleware simples para autenticação via JWT Bearer.
 * - Espera Authorization: Bearer <token>
 * - Usa JWT_SECRET do .env
 * - Anexa payload em req.user (ou req.jwt)
 */
function authJwt(req, res, next) {
  try {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;

    if (!token) return res.status(401).json({ message: "Token ausente." });

    const secret = process.env.JWT_SECRET;
    if (!secret) return res.status(500).json({ message: "JWT_SECRET não configurado." });

    const payload = jwt.verify(token, secret);
    req.user = payload;
    req.jwt = payload;
    return next();
  } catch (err) {
    return res.status(401).json({ message: "Token inválido." });
  }
}

module.exports = { authJwt };

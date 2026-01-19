const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/auth.middleware");

// Importa handlers diretamente (evita objeto "authController" inconsistente)
const {
  register,
  login,
  forgotPassword,
  resetPassword,
  me,
} = require("../controllers/auth.controller");

// Express 4 não captura rejeições de Promise automaticamente.
// Este wrapper garante que erros de handlers async cheguem ao error-handler.
function asyncHandler(fn) {
  return function wrapped(req, res, next) {
    try {
      const out = fn(req, res, next);
      if (out && typeof out.then === "function") out.catch(next);
    } catch (err) {
      next(err);
    }
  };
}

function requireEnv(name) {
  const v = process.env[name];
  if (!v || !String(v).trim()) {
    const err = new Error(`Configuração do servidor ausente: ${name}`);
    err.status = 500;
    throw err;
  }
  return v;
}

// Guard-rail: se algum handler vier undefined, quebra com erro claro (ao subir o servidor)
function assertFn(fn, name) {
  if (typeof fn !== "function") {
    throw new TypeError(
      `[AUTH ROUTES] Handler "${name}" não é uma função. Verifique exports em controllers/auth.controller.js`
    );
  }
  return fn;
}

// Fail-fast para evitar 500 genérico quando faltar JWT_SECRET no ambiente.
// Se o seu controller usa outra env, inclua aqui também.
router.use((req, res, next) => {
  // /me pode precisar validar token; e login/register geram tokens.
  // Ao invés de quebrar silenciosamente, validamos a env explicitamente.
  if (req.path === "/login" || req.path === "/register" || req.path === "/me") {
    requireEnv("JWT_SECRET");
  }
  next();
});

router.post("/register", asyncHandler(assertFn(register, "register")));
router.post("/login", asyncHandler(assertFn(login, "login")));
router.post("/forgot-password", asyncHandler(assertFn(forgotPassword, "forgotPassword")));
router.post("/reset-password", asyncHandler(assertFn(resetPassword, "resetPassword")));
router.get("/me", authMiddleware, asyncHandler(assertFn(me, "me")));

module.exports = router;

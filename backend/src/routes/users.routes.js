// backend/src/routes/users.routes.js
const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/auth.middleware");
const usersController = require("../controllers/users.controller");

function safeHandler(handler, name) {
  if (typeof handler === "function") return handler;

  // Não derruba o servidor: devolve erro claro para você ajustar exports depois.
  return (req, res) => {
    return res.status(500).json({
      message: `Handler ausente/inválido: usersController.${name}. Verifique exports em backend/src/controllers/users.controller.js`,
    });
  };
}

// Protege todas as rotas (mantendo padrão do seu projeto)
router.use(safeHandler(authMiddleware, "authMiddleware"));

// Meu perfil
router.get("/me/profile", safeHandler(usersController.getMyProfile, "getMyProfile"));
router.put("/me/profile", safeHandler(usersController.updateMyProfile, "updateMyProfile"));

// Perfil público (por enquanto também exige auth)
router.get("/:id/profile", safeHandler(usersController.getPublicProfile, "getPublicProfile"));

module.exports = router;

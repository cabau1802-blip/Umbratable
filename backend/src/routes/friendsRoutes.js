const express = require("express");
const router = express.Router();

// Importação única e correta do Controller
const controller = require("../controllers/friends.controller");
const authMiddleware = require("../middlewares/auth.middleware");

// Protege todas as rotas abaixo
router.use(authMiddleware);

// --- ROTAS ---

// 1. Listar amigos confirmados
// URL Final: GET /friends
router.get("/", controller.listFriends);

// 2. Listar solicitações (Pendentes/Enviadas)
// URL Final: GET /friends/requests
// Nota: No controller o nome é 'listRequests', não 'listPending'
router.get("/requests", controller.listRequests);

// 3. Enviar solicitação
// URL Final: POST /friends/requests
router.post("/requests", controller.sendRequest);

// 4. Responder solicitação (Aceitar/Recusar)
// URL Final: PATCH /friends/requests/:id
router.patch("/requests/:id", controller.respondRequest);

// 5. Remover amigo ou cancelar
// URL Final: DELETE /friends/:friendId
router.delete("/:friendId", controller.removeFriend);

module.exports = router;
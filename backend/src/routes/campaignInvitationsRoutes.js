const express = require("express");
const router = express.Router();

// Importação do Controller
const campaignInvitationsController = require("../controllers/campaignInvitations.controller");

// Importação do Middleware de Autenticação
const authMiddleware = require("../middlewares/auth.middleware");
const { enforceInvitationAcceptQuotas } = require("../middlewares/quotas/enforceInvitationAcceptQuotas");

// Protege as rotas
router.use(authMiddleware);

// --- ROTAS ---

// 1. Listar convites (CORRIGIDO: Adicionado o caminho explícito)
// Antes era apenas "/", agora é "/campaign-invitations" para o frontend achar.
router.get("/campaign-invitations", campaignInvitationsController.listMyInvites);

// 2. Enviar convite (Mantido)
// Rota: POST /campaigns/:campaignId/invitations
router.post("/campaigns/:campaignId/invitations", campaignInvitationsController.inviteUser);

// 3. Responder convite (Mantido)
// Rota: PATCH /campaign-invitations/:id
router.patch("/campaign-invitations/:id", enforceInvitationAcceptQuotas, campaignInvitationsController.respondInvite);

// --- EXPORTAÇÃO ---
module.exports = router;
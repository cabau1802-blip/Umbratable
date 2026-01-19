// backend/routes/campaign.routes.js
const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/auth.middleware");
const campaignController = require("../controllers/campaign.controller");

const { requireFeature } = require("../middlewares/requireFeature");
const { exportCampaignData } = require("../controllers/export.controller");
const { importCampaignData } = require("../controllers/import.controller");

// Protege todas as rotas com login
router.use(authMiddleware);

// =========================================
// IMPORT / EXPORT (colocar ANTES das rotas com :id)
// =========================================

// Import completo (JSON) - Premium/Admin
// POST /campaigns/import
router.post("/import", requireFeature("exportData"), importCampaignData);

// Export completo (JSON) - Premium/Admin
// GET /campaigns/:id/export
router.get("/:id/export", requireFeature("exportData"), exportCampaignData);

// =========================================
// ROTAS DE CAMPANHA
// =========================================

// 1) Listar e Criar
router.get("/", campaignController.list);
router.post("/", campaignController.create);

// =========================================
// ACESSO / VISIBILIDADE (3 MODOS)
// =========================================

// Entrar direto em campanha aberta
router.post("/:id/join", campaignController.joinOpenCampaign);

// Solicitar entrada (campanha por aprovação)
router.post("/:id/join-requests", campaignController.createJoinRequest);

// Listar solicitações pendentes (somente GM)
router.get("/:id/join-requests", campaignController.listJoinRequests);

// Aprovar/Rejeitar solicitação (somente GM)
router.post("/join-requests/:requestId/approve", campaignController.approveJoinRequest);
router.post("/join-requests/:requestId/reject", campaignController.rejectJoinRequest);

// =========================================
// Rotas específicas
// =========================================

// Vincula personagem à campanha
router.post("/:id/characters", campaignController.joinCampaign);

// Remove personagem da campanha
router.delete("/:id/characters/:characterId", campaignController.removeCharacter);

// Atualiza ficha do personagem DENTRO da campanha
router.put("/:id/characters/:characterId", campaignController.updateCampaignCharacter);

// Listar personagens da campanha
router.get("/:id/characters", campaignController.getCharacters);

// Sessão (mapa/tokens/fog/iniciativa)
router.put("/:id/session", campaignController.saveSession);
router.get("/:id/session", campaignController.getSession);

// Legado automático ao finalizar campanha (Draft + Apply)
router.post("/:id/finish", campaignController.finishCampaignAndGenerateLegacyDraft);
router.get("/:id/legacy-draft", campaignController.getLegacyDraft);
router.put("/:id/legacy-draft", campaignController.updateLegacyDraft);
router.post("/:id/legacy-draft/apply", campaignController.applyLegacyDraft);

// Diário
router.post("/:id/diary", campaignController.addDiaryEntry);
router.get("/:id/diary", campaignController.listDiaryEntries);
router.get("/:id/diary/export", campaignController.exportDiary);

// Quarentena
router.get("/:id/quarantine", campaignController.getQuarantine);
router.patch("/:id/quarantine", campaignController.updateQuarantine);

// Participantes
router.get("/:id/participants", campaignController.getParticipants);
router.get("/:id/players", campaignController.getParticipants);

// CRUD genérico
router.get("/:id", campaignController.getById);
router.put("/:id", campaignController.updateCampaign);
router.delete("/:id", campaignController.deleteCampaign);

// Eventos (Timeline)
router.get("/:id/events", campaignController.listEvents);
router.post("/:id/events", campaignController.createEvent);
router.put("/:id/events/:eventId", campaignController.updateEvent);
router.delete("/:id/events/:eventId", campaignController.deleteEvent);
router.post("/:id/events/publish", campaignController.publishEventsBatch);

module.exports = router;

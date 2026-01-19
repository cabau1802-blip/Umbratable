// backend/src/routes/admin.routes.js
const express = require("express");
const rateLimit = require("express-rate-limit");

const { authJwt } = require("../middlewares/authJwt");
const { adminOnly } = require("../middlewares/adminOnly");

// Mantemos tudo que ja existia e apenas adicionamos as rotas que o dashboard chama.
const {
  getMetrics,
  pingActivity,
  startSession,
  endSession,
  listUsersByAdmin,
  listPlansByAdmin,
  getUserPlanByAdmin,
  updateUserPlanByAdmin,
} = require("../controllers/admin.controller");

const { importCampaignData } = require("../controllers/import.controller");

const router = express.Router();

const adminLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Admin (Dashboard)
 */
router.get("/metrics", adminLimiter, authJwt, adminOnly, getMetrics);

// NOVO: rotas esperadas pelo dashboard
router.get("/users", adminLimiter, authJwt, adminOnly, listUsersByAdmin);
router.get("/plans", adminLimiter, authJwt, adminOnly, listPlansByAdmin);

// (Opcional, mas util) gestao de plano por usuario
router.get("/users/:id/plan", adminLimiter, authJwt, adminOnly, getUserPlanByAdmin);
router.put("/users/:id/plan", adminLimiter, authJwt, adminOnly, updateUserPlanByAdmin);

/**
 * Import (Admin) — campanha completa via JSON
 * POST /api/admin/import/campaign
 */
router.post("/import/campaign", adminLimiter, authJwt, adminOnly, importCampaignData);

/**
 * Atividade: endpoints autenticados (nao admin)
 */
router.post("/activity/ping", adminLimiter, authJwt, pingActivity);
router.post("/activity/session/start", adminLimiter, authJwt, startSession);
router.post("/activity/session/end", adminLimiter, authJwt, endSession);

module.exports = router;

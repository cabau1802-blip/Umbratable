// backend/src/routes/feedback.routes.js
const express = require("express");
const rateLimit = require("express-rate-limit");

const { submitFeedback } = require("../controllers/feedback.controller");

const router = express.Router();

// Rate limit por IP (anti-spam)
const feedbackLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 min
  max: 6, // até 6 req/min por IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Muitas tentativas. Aguarde um pouco e tente novamente." },
});

// Endpoint de diagnóstico (opcional)
router.get("/ping", (req, res) => res.json({ ok: true }));

// POST /api/feedback
router.post("/", feedbackLimiter, submitFeedback);

module.exports = router;

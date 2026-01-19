const express = require("express");
const router = express.Router();
const aiController = require("../controllers/ai.controller");
const authMiddleware = require("../middlewares/auth.middleware");


router.post("/character-image", aiController.generateCharacterImage);
router.post("/oracle", authMiddleware, aiController.askOracle);

module.exports = router;

const express = require('express');
const router = express.Router();

// --- ATENÇÃO AQUI: Definindo a variável 'controller' ---
const controller = require('../controllers/character.controller'); 
const authMiddleware = require('../middlewares/auth.middleware');
const { enforceCharacterQuota } = require('../middlewares/quotas/enforceCharacterQuota');
const { pool } = require('../db');

router.use(authMiddleware);

// Rotas principais
router.get('/', controller.listMyCharacters);
router.post('/', enforceCharacterQuota, controller.create);
router.get('/:id', controller.getById);
router.get('/:id/legacy', controller.getLegacy);
router.put('/:id/legacy', controller.updateLegacy);
router.put('/:id', controller.update);
router.delete('/:id', controller.deleteCharacter);

// Rota de Campanhas do Personagem (a que estava dando erro)
router.get('/:id/campaigns', controller.listCharacterCampaigns);


// Histórico (Currículo) do personagem
router.get('/:id/history', async (req, res) => {
  const characterId = req.params.id;
  const userId = req.userId;
  try {
    const ownerRes = await pool.query(
      `SELECT id FROM characters WHERE id = $1 AND user_id = $2`,
      [characterId, userId]
    );
    if (ownerRes.rowCount === 0) {
      return res.status(403).json({ error: 'Sem permissão para acessar este personagem.' });
    }
    const histRes = await pool.query(
      `SELECT id, campaign_id, campaign_name, gm_name, date_joined, date_finished,
              final_level, honor_title, badge_icon
       FROM character_history
       WHERE character_id = $1
       ORDER BY date_finished DESC NULLS LAST, id DESC`,
      [characterId]
    );
    return res.json({ history: histRes.rows });
  } catch (err) {
    console.error('listCharacterHistory error:', err);
    return res.status(500).json({ error: 'Erro ao buscar histórico.' });
  }
});

module.exports = router;

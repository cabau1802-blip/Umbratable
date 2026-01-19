const { pool } = require("../db");

// ==========================================
// 1. LISTAR MEUS CONVITES (Com Debug)
// ==========================================
exports.listMyInvites = async (req, res) => {
  const userId = req.userId;
  
  console.log(`[DEBUG] Buscando convites para o usuário ID: ${userId}`);

  try {
    const result = await pool.query(`
      SELECT 
        ci.id, 
        ci.status, 
        c.name as campaign_name, 
        u.username as from_name
      FROM campaign_invitations ci
      JOIN campaigns c ON ci.campaign_id = c.id
      JOIN users u ON ci.from_user_id = u.id
      WHERE ci.to_user_id = $1 AND ci.status = 'pending'
    `, [userId]);

    console.log(`[DEBUG] Convites encontrados: ${result.rows.length}`);
    if (result.rows.length > 0) {
        console.log(`[DEBUG] Dados:`, result.rows);
    }

    return res.json({ invitations: result.rows });
  } catch (error) {
    console.error("Erro ao listar convites:", error);
    return res.status(500).json({ error: "Erro interno." });
  }
};

// ==========================================
// 2. ENVIAR CONVITE DE CAMPANHA (Correção do Erro 400)
// ==========================================
exports.inviteUser = async (req, res) => {
  const { campaignId } = req.params;
  const { toUserId } = req.body; // O frontend envia 'toUserId'
  const fromUserId = req.userId;

  // 1. Validação básica
  if (!toUserId) {
    return res.status(400).json({ message: "ID do usuário de destino é obrigatório." });
  }

  if (toUserId === fromUserId) {
      return res.status(400).json({ message: "Você não pode convidar a si mesmo." });
  }

  try {
    // 2. Verificar se sou o Dono da Campanha
    const campCheck = await pool.query(
      "SELECT name, owner_id FROM campaigns WHERE id = $1", 
      [campaignId]
    );
    
    if (campCheck.rows.length === 0) return res.status(404).json({ message: "Campanha não encontrada." });
    if (campCheck.rows[0].owner_id !== fromUserId) return res.status(403).json({ message: "Apenas o Mestre pode convidar." });

    const campaignName = campCheck.rows[0].name;

    // 3. Verificar se já existe convite pendente ou aceito
    const inviteCheck = await pool.query(
      "SELECT status FROM campaign_invitations WHERE campaign_id = $1 AND to_user_id = $2",
      [campaignId, toUserId]
    );

    if (inviteCheck.rows.length > 0) {
      const status = inviteCheck.rows[0].status;
      if (status === 'accepted') return res.status(409).json({ message: "Usuário já está na campanha." });
      return res.status(409).json({ message: "Convite já enviado." });
    }

    // 4. Criar o convite
    await pool.query(
      `INSERT INTO campaign_invitations (campaign_id, from_user_id, to_user_id, status)
       VALUES ($1, $2, $3, 'pending')`,
      [campaignId, fromUserId, toUserId]
    );

    // --- NOTIFICAÇÃO VIA SOCKET ---
    // Se o socket estiver disponível, avisa o jogador convidado
    if (req.io) {
        req.io.to(`user:${toUserId}`).emit("friend_request_update"); // Reutilizamos esse evento para atualizar listas
    }
    // -----------------------------

    return res.json({ message: "Convite enviado com sucesso!" });

  } catch (error) {
    console.error("Erro ao convidar para campanha:", error);
    return res.status(500).json({ error: "Erro ao enviar convite." });
  }
};

// ==========================================
// 3. RESPONDER CONVITE (Aceitar/Recusar)
// ==========================================
exports.respondInvite = async (req, res) => {
  const { id } = req.params; // ID do convite
  const { status } = req.body; // 'accepted' ou 'rejected' (frontend envia como 'action' -> 'accept'/'reject' às vezes, vamos padronizar)
  
  // O frontend manda "action": "accept" ou "reject". Vamos converter se necessário.
  // Se o frontend mandar "status", usamos status.
  let dbStatus = status;
  if (req.body.action === 'accept') dbStatus = 'accepted';
  if (req.body.action === 'reject') dbStatus = 'rejected';

  const userId = req.userId;

  if (!['accepted', 'rejected'].includes(dbStatus)) {
      return res.status(400).json({ message: "Ação inválida." });
  }

  try {
    // Verifica se o convite é para mim
    const check = await pool.query(
        "SELECT * FROM campaign_invitations WHERE id = $1 AND to_user_id = $2 AND status = 'pending'",
        [id, userId]
    );

    if (check.rows.length === 0) return res.status(404).json({ message: "Convite não encontrado." });

    if (dbStatus === 'rejected') {
        await pool.query("DELETE FROM campaign_invitations WHERE id = $1", [id]);
        return res.json({ message: "Convite recusado." });
    }

    // Se aceitou
    await pool.query("UPDATE campaign_invitations SET status = 'accepted' WHERE id = $1", [id]);

    return res.json({ message: "Convite aceito! A campanha aparecerá na sua lista." });

  } catch (error) {
    console.error("Erro ao responder convite:", error);
    return res.status(500).json({ error: "Erro interno." });
  }
};
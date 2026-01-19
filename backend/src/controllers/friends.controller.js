const { pool } = require("../db");

// 1. LISTAR AMIGOS
exports.listFriends = async (req, res) => {
  const userId = req.userId;
  try {
    const result = await pool.query(
      `
      SELECT u.id, u.username, u.email 
      FROM friend_requests fr
      JOIN users u ON (u.id = fr.from_user_id OR u.id = fr.to_user_id)
      WHERE (fr.from_user_id = $1 OR fr.to_user_id = $1)
        AND fr.status = 'accepted'
        AND u.id != $1
    `,
      [userId]
    );
    return res.json(result.rows);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao buscar amigos." });
  }
};

// 2. LISTAR PEDIDOS
exports.listRequests = async (req, res) => {
  const userId = req.userId;
  try {
    // Recebidos: quem enviou -> eu (to_user_id = userId)
    // Agora inclui: from_user_id (UUID), display_name/avatar_url do remetente (se existir)
    const received = await pool.query(
      `
      SELECT
        fr.id,
        fr.from_user_id,
        fr.to_user_id,
        u.username,
        up.display_name,
        up.avatar_url,
        fr.created_at,
        'received' as type
      FROM friend_requests fr
      JOIN users u ON u.id = fr.from_user_id
      LEFT JOIN user_profiles up ON up.user_id = fr.from_user_id
      WHERE fr.to_user_id = $1 AND fr.status = 'pending'
      ORDER BY fr.created_at DESC
    `,
      [userId]
    );

    // Enviados: eu -> destinatário (from_user_id = userId)
    // Agora inclui: to_user_id (UUID), display_name/avatar_url do destinatário (se existir)
    const sent = await pool.query(
      `
      SELECT
        fr.id,
        fr.from_user_id,
        fr.to_user_id,
        u.username,
        up.display_name,
        up.avatar_url,
        fr.created_at,
        'sent' as type
      FROM friend_requests fr
      JOIN users u ON u.id = fr.to_user_id
      LEFT JOIN user_profiles up ON up.user_id = fr.to_user_id
      WHERE fr.from_user_id = $1 AND fr.status = 'pending'
      ORDER BY fr.created_at DESC
    `,
      [userId]
    );

    return res.json({ received: received.rows, sent: sent.rows });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao listar." });
  }
};

// 3. ENVIAR PEDIDO
exports.sendRequest = async (req, res) => {
  const { username } = req.body;
  const userId = req.userId;
  if (!username) return res.status(400).json({ message: "Username obrigatório." });

  try {
    const userRes = await pool.query("SELECT id FROM users WHERE username = $1", [username]);
    if (userRes.rows.length === 0) return res.status(404).json({ message: "Usuário não encontrado." });

    const friendId = userRes.rows[0].id;
    if (friendId === userId) return res.status(400).json({ message: "Não pode se adicionar." });

    // --- respeita privacidade allow_friend_requests ---
    const privacyRes = await pool.query(
      `
        SELECT privacy
        FROM user_profiles
        WHERE user_id = $1
        LIMIT 1
      `,
      [friendId]
    );

    if (privacyRes.rows.length > 0) {
      const privacy = privacyRes.rows[0].privacy || {};
      const allow = privacy.allow_friend_requests;

      if (allow === false) {
        return res.status(403).json({ message: "Este usuário não está aceitando pedidos de amizade." });
      }
    }
    // -----------------------------------------------

    const check = await pool.query(
      `
      SELECT id, status FROM friend_requests 
      WHERE (from_user_id = $1 AND to_user_id = $2) OR (from_user_id = $2 AND to_user_id = $1)
    `,
      [userId, friendId]
    );

    if (check.rows.length > 0) {
      if (check.rows[0].status === "accepted") return res.status(409).json({ message: "Já são amigos." });
      return res.status(409).json({ message: "Solicitação pendente." });
    }

    await pool.query(
      `INSERT INTO friend_requests (from_user_id, to_user_id, status) VALUES ($1, $2, 'pending')`,
      [userId, friendId]
    );

    if (req.io) {
      req.io.to(`user:${friendId}`).emit("friend_request_update");
    }

    return res.json({ message: "Enviado!" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro interno." });
  }
};

// 4. RESPONDER PEDIDO
exports.respondRequest = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const userId = req.userId;

  if (!["accepted", "rejected"].includes(status)) return res.status(400).json({ message: "Status inválido." });

  try {
    const check = await pool.query(
      `SELECT * FROM friend_requests WHERE id = $1 AND to_user_id = $2 AND status = 'pending'`,
      [id, userId]
    );
    if (check.rows.length === 0) return res.status(404).json({ message: "Pedido não encontrado." });

    if (status === "rejected") {
      await pool.query("DELETE FROM friend_requests WHERE id = $1", [id]);
      return res.json({ message: "Recusado." });
    }

    await pool.query("UPDATE friend_requests SET status = 'accepted' WHERE id = $1", [id]);

    const senderId = check.rows[0].from_user_id;
    if (req.io && senderId) {
      req.io.to(`user:${senderId}`).emit("friend_request_update");
    }

    return res.json({ message: "Aceito!" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erro." });
  }
};

// 5. REMOVER AMIGO
exports.removeFriend = async (req, res) => {
  const { friendId } = req.params;
  const userId = req.userId;
  try {
    await pool.query(
      `
      DELETE FROM friend_requests 
      WHERE (from_user_id = $1 AND to_user_id = $2) OR (from_user_id = $2 AND to_user_id = $1)
    `,
      [userId, friendId]
    );
    return res.json({ message: "Removido." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro." });
  }
};

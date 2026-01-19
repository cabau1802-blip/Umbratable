const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { pool } = require("../db");
const { sendMail } = require("../services/emailService");
const { buildEntitlements } = require("../config/plans");

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";
const JWT_EXPIRES_IN = "7d";

// Remove barra no final se houver
const rawFrontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
const FRONTEND_URL = rawFrontendUrl.replace(/\/+$/, "");

// ===========================
// HELPER: Gerar Token JWT
// ===========================
function generateToken(user) {
  const payload = {
    // compat
    sub: user.id,
    userId: user.id,

    // preferidos
    id: user.id,
    email: user.email,
    role: user.role || "USER",
    username: user.username,

    // Plano (para UI / gating). Admin ignora quotas por lógica.
    plan: user.plan || "FREE",
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

async function loadUserLimitOverrides(userId) {
  // Se a tabela não existir ainda ou não houver registro, não quebra login.
  try {
    const { rows } = await pool.query(
      `SELECT max_campaigns, max_characters, max_players_per_session
       FROM user_limits
       WHERE user_id = $1
       LIMIT 1`,
      [userId]
    );
    return rows?.[0] || null;
  } catch {
    return null;
  }
}

// ===========================
// HELPERS: Tokens
// ===========================
function randomTokenHex(bytes = 32) {
  return crypto.randomBytes(bytes).toString("hex");
}

// ===========================
// 1. Registro
// ===========================
async function register(req, res) {
  let { username, email, password } = req.body;

  if (username != null) username = String(username).trim();
  if (email != null) email = String(email).trim().toLowerCase();
  if (password != null) password = String(password).trim();

  if (!username || !email || !password) {
    return res.status(400).json({ message: "Preencha todos os campos." });
  }

  try {
    const existing = await pool.query(
      `SELECT id FROM users WHERE LOWER(TRIM(email)) = LOWER(TRIM($1)) OR LOWER(TRIM(username)) = LOWER(TRIM($2))`,
      [email, username]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ message: "Usuário ou e-mail já cadastrado." });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, username, email, role, plan`,
      [username, email, passwordHash]
    );

    const user = result.rows[0];
    const token = generateToken(user);
    const overrideLimits = await loadUserLimitOverrides(user.id);
    const entitlements = buildEntitlements({ role: user.role || "USER", plan: user.plan || "FREE", overrideLimits });

    return res.status(201).json({
      user: { id: user.id, username: user.username, email: user.email, role: user.role || "USER", plan: user.plan || "FREE" },
      entitlements,
      token,
    });
  } catch (error) {
    console.error("Erro register:", error);
    return res.status(500).json({ message: "Erro interno." });
  }
}

// ===========================
// 2. Login
// ===========================
async function login(req, res) {
  let { emailOrUsername, email, username, password } = req.body;
  let loginField = emailOrUsername || email || username;

  if (loginField) loginField = loginField.trim();
  if (password) password = password.trim();

  if (!loginField || !password) {
    return res.status(400).json({ message: "Informe login e senha." });
  }

  try {
    const result = await pool.query(
      `SELECT id, username, email, role, plan, password_hash
       FROM users
       WHERE LOWER(TRIM(email)) = LOWER(TRIM($1)) OR LOWER(TRIM(username)) = LOWER(TRIM($1))`,
      [loginField]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Credenciais inválidas." });
    }

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password_hash || "");

    if (!match) {
      return res.status(401).json({ message: "Credenciais inválidas." });
    }

    const token = generateToken(user);
    const overrideLimits = await loadUserLimitOverrides(user.id);
    const entitlements = buildEntitlements({ role: user.role || "USER", plan: user.plan || "FREE", overrideLimits });
    return res.json({
      user: { id: user.id, username: user.username, email: user.email, role: user.role || "USER", plan: user.plan || "FREE" },
      entitlements,
      token,
    });
  } catch (error) {
    console.error("Erro login:", error);
    return res.status(500).json({ message: "Erro interno." });
  }
}

// ===========================
// 3. Me
// ===========================
async function me(req, res) {
  try {
    const result = await pool.query(
      `SELECT id, username, email, role, plan FROM users WHERE id = $1`,
      [req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Usuário não encontrado." });
    }

    const user = result.rows[0];
    const overrideLimits = await loadUserLimitOverrides(user.id);
    const entitlements = buildEntitlements({ role: user.role || "USER", plan: user.plan || "FREE", overrideLimits });

    return res.json({
      user: { id: user.id, username: user.username, email: user.email, role: user.role || "USER", plan: user.plan || "FREE" },
      entitlements,
    });
  } catch (error) {
    console.error("Erro me:", error);
    return res.status(500).json({ message: "Erro ao buscar usuário." });
  }
}

// ===========================
// 4. Esqueci a Senha (LINK)
// - NÃO retorna 500 em falha de SMTP
// - Resposta sempre genérica (anti-enumeração)
// ===========================
async function forgotPassword(req, res) {
  const { emailOrUsername, email, username } = req.body;

  const loginField = (emailOrUsername || email || username || "").trim();

  if (!loginField) {
    return res.status(400).json({ message: "Informe seu e-mail ou usuário." });
  }

  const successMsg = { message: "Se a conta existir, enviamos um link de recuperação." };

  try {
    const userResult = await pool.query(
      `SELECT id, email, username, role FROM users WHERE LOWER(TRIM(email)) = LOWER(TRIM($1)) OR LOWER(TRIM(username)) = LOWER(TRIM($1)) LIMIT 1`,
      [loginField]
    );

    // Não revela se existe ou não
    if (userResult.rows.length === 0) {
      return res.json(successMsg);
    }

    const user = userResult.rows[0];
    const token = randomTokenHex(32);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    // Garante tabela
    await pool.query(`
      CREATE TABLE IF NOT EXISTS password_resets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        token TEXT NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Invalida tokens anteriores
    await pool.query(`UPDATE password_resets SET used = TRUE WHERE user_id = $1`, [user.id]);

    // Cria novo token
    await pool.query(
      `INSERT INTO password_resets (user_id, token, expires_at) VALUES ($1, $2, $3)`,
      [user.id, token, expiresAt]
    );

    const resetLink = `${FRONTEND_URL}/reset-password?token=${token}`;

    // Envio de e-mail NÃO BLOQUEANTE: se falhar, loga e segue
    try {
      await sendMail({
        to: user.email,
        subject: "Recuperação de Senha - UmbralTable",
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #d97706;">Olá, ${user.username}!</h2>
            <p>Clique no botão abaixo para criar uma nova senha:</p>
            <a href="${resetLink}" style="background: #d97706; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px 0;">Redefinir Senha</a>
            <p style="margin-top:16px; font-size:12px; color:#666;">Se você não solicitou, ignore este e-mail.</p>
          </div>
        `,
        text: `Olá, ${user.username}! Use este link para redefinir sua senha: ${resetLink}`,
      });
    } catch (mailErr) {
      console.error("❌ [MAIL] Falha ao enviar (forgotPassword):", mailErr?.message || mailErr);
    }

    // Sempre responde 200 genérico
    return res.json(successMsg);
  } catch (error) {
    console.error("Erro forgotPassword:", error);
    // Nunca 500 aqui — mantém UX e segurança
    return res.json(successMsg);
  }
}

// ===========================
// 5. Resetar Senha (LINK)
// ===========================
async function resetPassword(req, res) {
  const { token, password } = req.body;

  if (!token || !password) return res.status(400).json({ message: "Dados inválidos." });
  if (password.length < 6) return res.status(400).json({ message: "Senha muito curta." });

  try {
    const checkToken = await pool.query(
      `SELECT * FROM password_resets WHERE token = $1`,
      [token]
    );

    if (checkToken.rows.length === 0) {
      return res.status(400).json({ message: "Token inválido." });
    }

    const resetRequest = checkToken.rows[0];

    if (resetRequest.used) return res.status(400).json({ message: "Este link já foi usado." });
    if (new Date() > new Date(resetRequest.expires_at)) {
      return res.status(400).json({ message: "Link expirado." });
    }

    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(password, salt);

    await pool.query(
      `UPDATE users SET password_hash = $1 WHERE id = $2`,
      [newHash, resetRequest.user_id]
    );

    await pool.query(`UPDATE password_resets SET used = TRUE WHERE id = $1`, [resetRequest.id]);

    return res.json({ message: "Senha alterada com sucesso! Faça login." });
  } catch (error) {
    console.error("Erro resetPassword:", error);
    return res.status(500).json({ message: "Erro ao redefinir senha." });
  }
}

module.exports = { register, login, me, forgotPassword, resetPassword };

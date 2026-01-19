// backend/src/controllers/admin.controller.js
const { pool } = require("../db");
const { PLAN_DEFINITIONS, normalizePlanKey, getPlanDefinition } = require("../config/plans");

/**
 * Observação:
 * Este dashboard v1 assume Postgres e tabelas comuns.
 * Se alguma tabela não existir, retornamos 0 em vez de quebrar o endpoint.
 */
async function safeScalar(query, params = []) {
  try {
    const { rows } = await pool.query(query, params);
    const v = rows?.[0] ? Object.values(rows[0])[0] : 0;
    return Number(v) || 0;
  } catch (e) {
    return 0;
  }
}

async function getMetrics(req, res) {
  try {
    const totalUsers = await safeScalar("SELECT COUNT(*)::int AS c FROM users");
    const totalCampaigns = await safeScalar("SELECT COUNT(*)::int AS c FROM campaigns");

    const activeUsers24h = await safeScalar(
      "SELECT COUNT(DISTINCT user_id)::int AS c FROM user_activity WHERE last_seen_at >= NOW() - INTERVAL '24 hours'"
    );

    const totalSessions = await safeScalar("SELECT COUNT(*)::int AS c FROM user_sessions");
    const totalSessionSeconds = await safeScalar(
      "SELECT COALESCE(SUM(duration_seconds),0)::bigint AS s FROM user_sessions"
    );
    const avgSessionSeconds = totalSessions > 0 ? Math.round(totalSessionSeconds / totalSessions) : 0;

    return res.json({
      totals: { users: totalUsers, campaigns: totalCampaigns },
      activity: { activeUsers24h, totalSessions, avgSessionSeconds, totalSessionSeconds },
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("getMetrics error:", err);
    return res.status(500).json({ message: "Erro ao buscar métricas." });
  }
}

async function pingActivity(req, res) {
  try {
    const u = req.user || {};
    const userId = String(u.id || u.userId || u.sub || "").trim();
    if (!userId) return res.status(400).json({ message: "UserId ausente no token." });

    await pool.query(
      `INSERT INTO user_activity (user_id, last_seen_at)
       VALUES ($1, NOW())
       ON CONFLICT (user_id) DO UPDATE SET last_seen_at = EXCLUDED.last_seen_at`,
      [userId]
    );

    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ message: "Falha ao registrar atividade." });
  }
}

async function startSession(req, res) {
  try {
    const u = req.user || {};
    const userId = String(u.id || u.userId || u.sub || "").trim();
    if (!userId) return res.status(400).json({ message: "UserId ausente no token." });

    const { rows } = await pool.query(
      `INSERT INTO user_sessions (user_id, started_at, user_agent, ip)
       VALUES ($1, NOW(), $2, $3)
       RETURNING id`,
      [userId, String(req.headers["user-agent"] || "").slice(0, 240), req.ip]
    );

    return res.json({ sessionId: rows[0].id });
  } catch (err) {
    return res.status(500).json({ message: "Falha ao iniciar sessão." });
  }
}

async function endSession(req, res) {
  try {
    const u = req.user || {};
    const userId = String(u.id || u.userId || u.sub || "").trim();
    const sessionId = String(req.body?.sessionId || "").trim();

    if (!userId) return res.status(400).json({ message: "UserId ausente no token." });
    if (!sessionId) return res.status(400).json({ message: "sessionId é obrigatório." });

    await pool.query(
      `UPDATE user_sessions
       SET ended_at = NOW(),
           duration_seconds = GREATEST(0, EXTRACT(EPOCH FROM (NOW() - started_at))::int)
       WHERE id = $1 AND user_id = $2 AND ended_at IS NULL`,
      [sessionId, userId]
    );

    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ message: "Falha ao encerrar sessão." });
  }
}

/**
 * Listagem/pesquisa de usuários para Admin.
 * GET /api/admin/users?q=...&limit=...
 */
async function listUsersByAdmin(req, res) {
  try {
    const q = String(req.query.q || "").trim();
    const limitRaw = parseInt(req.query.limit, 10);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 200) : 80;

    const params = [];
    let where = "";
    if (q) {
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
      where = "WHERE (email ILIKE $1 OR username ILIKE $2 OR CAST(id AS TEXT) ILIKE $3)";
    }

    // Inclui plan para UI
    const { rows } = await pool.query(
      `
      SELECT id, email, username, role, plan
      FROM users
      ${where}
      ORDER BY email ASC
      LIMIT ${limit}
    `,
      params
    );

    return res.json({ users: rows });
  } catch (err) {
    console.error("[ADMIN] listUsersByAdmin error:", err);
    return res.status(500).json({ message: "Falha ao listar usuários." });
  }
}

/**
 * Lista planos disponíveis (Admin)
 */
async function listPlansByAdmin(req, res) {
  const plans = Object.values(PLAN_DEFINITIONS).map((p) => ({
    key: p.key,
    name: p.name,
    priceCents: p.priceCents,
    limits: p.limits,
    features: p.features,
  }));
  return res.json({ plans });
}

/**
 * Retorna o plano de um usuário (Admin)
 */
async function getUserPlanByAdmin(req, res) {
  try {
    const userId = String(req.params?.id || "").trim();
    if (!userId) return res.status(400).json({ message: "user id ausente." });

    const { rows } = await pool.query(
      `SELECT id, email, username, role, plan FROM users WHERE id = $1 LIMIT 1`,
      [userId]
    );
    if (!rows.length) return res.status(404).json({ message: "Usuário não encontrado." });

    const u = rows[0];
    return res.json({
      user: u,
      plan: getPlanDefinition(u.plan),
    });
  } catch (err) {
    console.error("[ADMIN] getUserPlanByAdmin error:", err);
    return res.status(500).json({ message: "Falha ao buscar plano." });
  }
}

function parseBool(v, defaultValue = true) {
  if (v === undefined || v === null) return defaultValue;
  if (typeof v === "boolean") return v;
  const s = String(v).trim().toLowerCase();
  if (s === "1" || s === "true" || s === "yes" || s === "y") return true;
  if (s === "0" || s === "false" || s === "no" || s === "n") return false;
  return defaultValue;
}

/**
 * Atualiza o plano do usuário (Admin).
 * Body: { plan: "FREE"|"PREMIUM", applyDefaults?: boolean }
 *
 * applyDefaults:
 * - true (default): aplica os limites padrão do plano na tabela user_limits (upsert)
 * - false: só troca o "plan" no usuário (mantém limites atuais)
 */
async function updateUserPlanByAdmin(req, res) {
  try {
    const userId = String(req.params?.id || "").trim();
    if (!userId) return res.status(400).json({ message: "user id ausente." });

    const planKey = normalizePlanKey(req.body?.plan);
    if (!PLAN_DEFINITIONS[planKey]) {
      return res.status(400).json({ message: "Plano inválido. Use FREE ou PREMIUM." });
    }

    const applyDefaults = parseBool(req.body?.applyDefaults, true);
    const plan = getPlanDefinition(planKey);

    // Atualiza users.plan
    const uUpd = await pool.query(
      `UPDATE users SET plan = $1 WHERE id = $2 RETURNING id, email, username, role, plan`,
      [plan.key, userId]
    );
    if (!uUpd.rows.length) return res.status(404).json({ message: "Usuário não encontrado." });

    // Aplica limites default do plano (opcional)
    if (applyDefaults) {
      await pool.query(
        `
        INSERT INTO user_limits (user_id, max_campaigns, max_characters, max_players_per_session, updated_at)
        VALUES ($1, $2, $3, $4, NOW())
        ON CONFLICT (user_id) DO UPDATE SET
          max_campaigns = EXCLUDED.max_campaigns,
          max_characters = EXCLUDED.max_characters,
          max_players_per_session = EXCLUDED.max_players_per_session,
          updated_at = NOW()
      `,
        [
          userId,
          Number(plan.limits.max_campaigns),
          Number(plan.limits.max_characters),
          Number(plan.limits.max_players_per_session),
        ]
      );
    }

    return res.json({
      user: uUpd.rows[0],
      appliedDefaults: applyDefaults,
      plan: plan,
    });
  } catch (err) {
    console.error("[ADMIN] updateUserPlanByAdmin error:", err);
    return res.status(500).json({ message: "Falha ao atualizar plano." });
  }
}

module.exports = {
  getMetrics,
  pingActivity,
  startSession,
  endSession,
  listUsersByAdmin,
  listPlansByAdmin,
  getUserPlanByAdmin,
  updateUserPlanByAdmin,
  PLAN_DEFINITIONS,
};

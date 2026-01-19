// backend/src/controllers/users.controller.js
const { pool } = require("../db");
const { areUsersFriends } = require("../services/user.service");

function normalizeObject(obj) {
  if (!obj || typeof obj !== "object") return {};
  return obj;
}

function pickPublicProfile(row) {
  // Retorno “público” básico (não vaza preferences/privacy para terceiros)
  return {
    user_id: row.user_id,
    display_name: row.display_name,
    bio: row.bio,
    avatar_url: row.avatar_url,
    banner_url: row.banner_url,
    status_text: row.status_text,
    updated_at: row.updated_at,
  };
}

function getProfileVisibility(privacyObj) {
  const raw = privacyObj?.profile_visibility;
  const v = String(raw || "public").trim().toLowerCase();
  if (v === "private" || v === "friends" || v === "public") return v;
  return "public";
}

const DEFAULT_PRIVACY = { profile_visibility: "public" };
const DEFAULT_PREFERENCES = {};

async function ensureProfileRow(userId) {
  // Cria row mínima caso não exista ainda.
  // Importante para evitar 404 quando um usuário antigo não tem user_profiles.
  await pool.query(
    `
    INSERT INTO user_profiles (user_id, preferences, privacy)
    VALUES ($1, $2::jsonb, $3::jsonb)
    ON CONFLICT (user_id) DO NOTHING
  `,
    [userId, JSON.stringify(DEFAULT_PREFERENCES), JSON.stringify(DEFAULT_PRIVACY)]
  );
}

async function ensureProfileDefaults(userId, row) {
  if (!row) return row;

  const currentPrefs = row.preferences && typeof row.preferences === "object" ? row.preferences : null;
  const currentPrivacy = row.privacy && typeof row.privacy === "object" ? row.privacy : null;

  const needsPrefs = !currentPrefs;
  const needsPrivacy = !currentPrivacy || !currentPrivacy.profile_visibility;

  if (!needsPrefs && !needsPrivacy) return row;

  const nextPrefs = needsPrefs ? DEFAULT_PREFERENCES : currentPrefs;
  const nextPrivacy = {
    ...(currentPrivacy || {}),
    ...(needsPrivacy ? DEFAULT_PRIVACY : {}),
  };

  const { rows } = await pool.query(
    `
    UPDATE user_profiles
    SET
      preferences = COALESCE(preferences, $2::jsonb),
      privacy = CASE
        WHEN privacy IS NULL THEN $3::jsonb
        WHEN (privacy->>'profile_visibility') IS NULL THEN (privacy || $3::jsonb)
        ELSE privacy
      END,
      updated_at = NOW()
    WHERE user_id = $1
    RETURNING user_id, display_name, bio, avatar_url, banner_url, status_text,
              preferences, privacy, updated_at
  `,
    [userId, JSON.stringify(nextPrefs), JSON.stringify(DEFAULT_PRIVACY)]
  );

  return rows[0] || row;
}

module.exports = {
  // GET /users/me/profile
  async getMyProfile(req, res) {
    try {
      const userId = req.userId;
      if (!userId) return res.status(401).json({ message: "Não autenticado." });

      await ensureProfileRow(userId);

      const { rows } = await pool.query(
        `
        SELECT user_id, display_name, bio, avatar_url, banner_url, status_text,
               preferences, privacy, updated_at
        FROM user_profiles
        WHERE user_id = $1
        LIMIT 1
      `,
        [userId]
      );

      const profile = rows[0] || null;
      if (!profile) return res.json({ profile: null });

      const normalized = await ensureProfileDefaults(userId, profile);
      return res.json({ profile: normalized || null });
    } catch (err) {
      console.error("[users.controller] getMyProfile error:", err);
      return res.status(500).json({ message: "Erro ao buscar perfil." });
    }
  },

  // PUT /users/me/profile
  async updateMyProfile(req, res) {
    try {
      const userId = req.userId;
      if (!userId) return res.status(401).json({ message: "Não autenticado." });

      await ensureProfileRow(userId);

      const {
        display_name,
        bio,
        avatar_url,
        banner_url,
        status_text,
        preferences,
        privacy,
      } = req.body || {};

      const safeDisplayName = display_name == null ? null : String(display_name).slice(0, 40);
      const safeBio = bio == null ? null : String(bio).slice(0, 420);
      const safeAvatarUrl = avatar_url == null ? null : String(avatar_url).slice(0, 600);
      const safeBannerUrl = banner_url == null ? null : String(banner_url).slice(0, 600);
      const safeStatus = status_text == null ? null : String(status_text).slice(0, 70);

      const safePrefs = normalizeObject(preferences);
      const safePrivacy = normalizeObject(privacy);

      const { rows } = await pool.query(
        `
        UPDATE user_profiles
        SET
          display_name = COALESCE($2, display_name),
          bio = COALESCE($3, bio),
          avatar_url = COALESCE($4, avatar_url),
          banner_url = COALESCE($5, banner_url),
          status_text = COALESCE($6, status_text),
          preferences = COALESCE($7::jsonb, preferences),
          privacy = COALESCE($8::jsonb, privacy),
          updated_at = NOW()
        WHERE user_id = $1
        RETURNING user_id, display_name, bio, avatar_url, banner_url, status_text,
                  preferences, privacy, updated_at
      `,
        [
          userId,
          safeDisplayName,
          safeBio,
          safeAvatarUrl,
          safeBannerUrl,
          safeStatus,
          safePrefs ? JSON.stringify(safePrefs) : null,
          safePrivacy ? JSON.stringify(safePrivacy) : null,
        ]
      );

      const profile = rows[0] || null;
      if (!profile) return res.json({ profile: null });

      const normalized = await ensureProfileDefaults(userId, profile);
      return res.json({ profile: normalized || null });
    } catch (err) {
      console.error("[users.controller] updateMyProfile error:", err);
      return res.status(500).json({ message: "Erro ao atualizar perfil." });
    }
  },

  // GET /users/:id/profile
  async getPublicProfile(req, res) {
    try {
      const viewerId = req.userId || null;
      const targetId = req.params.id;

      if (!targetId) return res.status(400).json({ message: "ID inválido." });

      // Corrige o seu 404: usuários antigos podem não ter row em user_profiles.
      // Criamos a row default, de forma incremental.
      await ensureProfileRow(targetId);

      const { rows } = await pool.query(
        `
        SELECT user_id, display_name, bio, avatar_url, banner_url, status_text,
               preferences, privacy, updated_at
        FROM user_profiles
        WHERE user_id = $1
        LIMIT 1
      `,
        [targetId]
      );

      if (!rows.length) return res.status(404).json({ message: "Perfil não encontrado." });

      let row = rows[0];
      row = await ensureProfileDefaults(targetId, row);

      const privacy = row.privacy || {};
      const visibility = getProfileVisibility(privacy);

      // Se é o próprio usuário, retorna tudo
      if (viewerId && String(viewerId) === String(targetId)) {
        return res.json({ profile: row, scope: "self" });
      }

      // private: não retorna
      if (visibility === "private") {
        return res.status(403).json({ message: "Este perfil não está disponível." });
      }

      // friends: só permite se forem amigos (fase 2.3)
      if (visibility === "friends") {
        if (!viewerId) {
          return res.status(403).json({ message: "Este perfil está restrito a amigos." });
        }

        const ok = await areUsersFriends(viewerId, targetId);
        if (!ok) {
          return res.status(403).json({ message: "Este perfil está restrito a amigos." });
        }

        return res.json({ profile: pickPublicProfile(row), scope: "friends" });
      }

      // public
      return res.json({ profile: pickPublicProfile(row), scope: "public" });
    } catch (err) {
      console.error("[users.controller] getPublicProfile error:", err);
      return res.status(500).json({ message: "Erro ao buscar perfil público." });
    }
  },
};

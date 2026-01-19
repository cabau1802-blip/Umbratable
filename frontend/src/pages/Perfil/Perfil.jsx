import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
import "./Perfil.css"; // <--- Importando visual Dark Fantasy

const DEFAULT_PREFS = {
  notifications_enabled: true,
  sound_enabled: true,
  reduced_motion: false,
  theme: "dark",
  language: "pt-BR",
};

const DEFAULT_PRIVACY = {
  profile_visibility: "public", // public | friends | private
  allow_friend_requests: true,
};

export default function Perfil() {
  const { user, profile, refreshProfile, updateProfile } = useAuth();

  const [form, setForm] = useState({
    display_name: "",
    bio: "",
    status_text: "",
    avatar_url: "",
    banner_url: "",
    preferences: { ...DEFAULT_PREFS },
    privacy: { ...DEFAULT_PRIVACY },
  });

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null); // { type: "ok"|"err", msg: string }

  const displayNameFallback = useMemo(
    () => user?.username || user?.name || "Aventureiro",
    [user]
  );

  useEffect(() => {
    let mounted = true;

    (async () => {
      setLoading(true);
      const p = profile || (await refreshProfile());
      if (!mounted) return;

      const prefs = { ...DEFAULT_PREFS, ...(p?.preferences || {}) };
      const privacy = { ...DEFAULT_PRIVACY, ...(p?.privacy || {}) };

      setForm({
        display_name: p?.display_name ?? "",
        bio: p?.bio ?? "",
        status_text: p?.status_text ?? "",
        avatar_url: p?.avatar_url ?? "",
        banner_url: p?.banner_url ?? "",
        preferences: prefs,
        privacy,
      });

      setLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, [profile, refreshProfile]);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const setPref = (key, value) =>
    setForm((prev) => ({
      ...prev,
      preferences: { ...prev.preferences, [key]: value },
    }));
  const setPrivacy = (key, value) =>
    setForm((prev) => ({ ...prev, privacy: { ...prev.privacy, [key]: value } }));

  const uploadImage = async (file) => {
    const fd = new FormData();
    fd.append("file", file);

    const res = await api.post("/upload", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    return res.data?.url;
  };

  const onPickAvatar = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setToast(null);
      const url = await uploadImage(file);
      if (url) setField("avatar_url", url);
    } catch (err) {
      console.error("[Perfil] upload avatar error:", err);
      setToast({ type: "err", msg: "Falha ao enviar avatar." });
    } finally {
      e.target.value = "";
    }
  };

  const onPickBanner = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setToast(null);
      const url = await uploadImage(file);
      if (url) setField("banner_url", url);
    } catch (err) {
      console.error("[Perfil] upload banner error:", err);
      setToast({ type: "err", msg: "Falha ao enviar banner." });
    } finally {
      e.target.value = "";
    }
  };

  const privacyNote = useMemo(() => {
    const v = String(form.privacy?.profile_visibility || "public");
    if (v === "public") {
      return "Seu perfil pode ser visualizado por outros usuários autenticados.";
    }
    if (v === "friends") {
      return "Somente amigos podem ver seu perfil público (modal/listas).";
    }
    if (v === "private") {
      return "Somente você pode ver seu perfil. Terceiros receberão acesso negado.";
    }
    return null;
  }, [form.privacy?.profile_visibility]);

  const onSave = async () => {
    try {
      setSaving(true);
      setToast(null);

      const payload = {
        display_name: form.display_name,
        bio: form.bio,
        status_text: form.status_text,
        avatar_url: form.avatar_url,
        banner_url: form.banner_url,
        preferences: form.preferences,
        privacy: form.privacy,
      };

      await updateProfile(payload);
      setToast({ type: "ok", msg: "Perfil atualizado com sucesso." });
    } catch (err) {
      console.error("[Perfil] save error:", err);
      setToast({ type: "err", msg: "Erro ao salvar perfil." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="umbral-perfil">
        <div className="perfil-wrap">
          <div className="loading-skeleton">Carregando perfil...</div>
        </div>
      </div>
    );
  }

  const shownName = form.display_name?.trim() || displayNameFallback;
  const avatarLetter = (shownName?.[0] || "A").toUpperCase();

  return (
    <div className="umbral-perfil">
      <div className="perfil-wrap">
        
        {/* Banner + Header */}
        <div className="header-card">
          <div className="banner-area">
            {form.banner_url ? (
              <img className="banner-img" src={form.banner_url} alt="Banner" />
            ) : (
              <div className="banner-fallback" />
            )}

            <div className="banner-actions">
              <label className="btn-ghost">
                Alterar banner
                <input type="file" accept="image/*" onChange={onPickBanner} hidden />
              </label>
            </div>
          </div>

          <div className="profile-row">
            <div className="avatar-wrap">
              {form.avatar_url ? (
                <img className="avatar-img" src={form.avatar_url} alt="Avatar" />
              ) : (
                <div className="avatar-fallback">{avatarLetter}</div>
              )}

              <label className="avatar-btn">
                Alterar
                <input type="file" accept="image/*" onChange={onPickAvatar} hidden />
              </label>
            </div>

            <div className="identity">
              <div className="title-row">
                <h1 className="display-name">{shownName}</h1>
                <span className="role-badge">Jogador</span>
              </div>
              <p className="bio-text">
                Personalize seu perfil para destacar sua presença na mesa.
              </p>

              <div className="status-line">
                <span className="status-dot" />
                <span className="status-text">
                  {form.status_text?.trim() ? form.status_text : "Sem status definido"}
                </span>
              </div>
            </div>

            <div className="save-box">
              <button className="btn-primary" onClick={onSave} disabled={saving}>
                {saving ? "Salvando..." : "Salvar alterações"}
              </button>
              <div className="mini-hint">Mudanças aplicam imediatamente.</div>
            </div>
          </div>
        </div>

        {toast && (
          <div className={`toast ${toast.type}`}>
            {toast.msg}
          </div>
        )}

        {/* Grid de Configurações */}
        <div className="settings-grid">
          
          {/* Identidade */}
          <div className="settings-card">
            <h2 className="card-title">Identidade</h2>

            <div className="field">
              <label className="label">Nome exibido</label>
              <input
                className="input"
                value={form.display_name}
                onChange={(e) => setField("display_name", e.target.value)}
                placeholder={displayNameFallback}
                maxLength={40}
              />
              <div className="mini-hint">Até 40 caracteres.</div>
            </div>

            <div className="field">
              <label className="label">Status</label>
              <input
                className="input"
                value={form.status_text}
                onChange={(e) => setField("status_text", e.target.value)}
                placeholder="Ex.: Em sessão, Preparando magia, Offline..."
                maxLength={70}
              />
              <div className="mini-hint">Até 70 caracteres.</div>
            </div>

            <div className="field">
              <label className="label">Bio</label>
              <textarea
                className="textarea"
                value={form.bio}
                onChange={(e) => setField("bio", e.target.value)}
                placeholder="Fale um pouco sobre você, seu estilo de jogo..."
                maxLength={420}
                rows={5}
              />
              <div className="mini-hint">Até 420 caracteres.</div>
            </div>
          </div>

          {/* Preferências */}
          <div className="settings-card">
            <h2 className="card-title">Preferências</h2>

            <div className="toggle-row">
              <div className="toggle-info">
                <h4>Notificações</h4>
                <p>Avisos de mensagens e eventos.</p>
              </div>
              <button
                className={`btn-toggle ${form.preferences.notifications_enabled ? "active" : ""}`}
                onClick={() => setPref("notifications_enabled", !form.preferences.notifications_enabled)}
                type="button"
              >
                {form.preferences.notifications_enabled ? "Ativo" : "Inativo"}
              </button>
            </div>

            <div className="toggle-row">
              <div className="toggle-info">
                <h4>Sons</h4>
                <p>Efeitos sonoros da interface.</p>
              </div>
              <button
                className={`btn-toggle ${form.preferences.sound_enabled ? "active" : ""}`}
                onClick={() => setPref("sound_enabled", !form.preferences.sound_enabled)}
                type="button"
              >
                {form.preferences.sound_enabled ? "Ativo" : "Inativo"}
              </button>
            </div>

            <div className="toggle-row">
              <div className="toggle-info">
                <h4>Reduzir animações</h4>
                <p>Para acessibilidade/performance.</p>
              </div>
              <button
                className={`btn-toggle ${form.preferences.reduced_motion ? "active" : ""}`}
                onClick={() => setPref("reduced_motion", !form.preferences.reduced_motion)}
                type="button"
              >
                {form.preferences.reduced_motion ? "Ativo" : "Inativo"}
              </button>
            </div>
          </div>

          {/* Privacidade */}
          <div className="settings-card">
            <h2 className="card-title">Privacidade</h2>

            <div className="field">
              <label className="label">Visibilidade do perfil</label>
              <select
                className="select"
                value={form.privacy.profile_visibility}
                onChange={(e) => setPrivacy("profile_visibility", e.target.value)}
              >
                <option value="public">Público</option>
                <option value="friends">Somente amigos</option>
                <option value="private">Privado</option>
              </select>

              {privacyNote && <div className="privacy-note">{privacyNote}</div>}
            </div>

            <div className="toggle-row">
              <div className="toggle-info">
                <h4>Pedidos de amizade</h4>
                <p>Quem pode te adicionar.</p>
              </div>
              <button
                className={`btn-toggle ${form.privacy.allow_friend_requests ? "active" : ""}`}
                onClick={() => setPrivacy("allow_friend_requests", !form.privacy.allow_friend_requests)}
                type="button"
              >
                {form.privacy.allow_friend_requests ? "Ativo" : "Inativo"}
              </button>
            </div>

            <div className="footer-row">
              <button className="btn-secondary" onClick={() => refreshProfile()} type="button">
                Recarregar
              </button>
              <button className="btn-primary" onClick={onSave} disabled={saving} type="button">
                {saving ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>

        <div className="bottom-hint">
          Dica: Use um banner escuro com alto contraste para destacar seu perfil.
        </div>
      </div>
    </div>
  );
}
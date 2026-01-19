import React, { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../services/api";
import { useChat } from "../../context/ChatContext";
import styles from "./UserProfileModal.module.css";

function formatLastSeen(ts) {
  if (!ts) return "";
  const diff = Date.now() - Number(ts);
  if (!Number.isFinite(diff) || diff < 0) return "";

  const s = Math.floor(diff / 1000);
  if (s < 10) return "agora há pouco";
  if (s < 60) return `há ${s}s`;

  const m = Math.floor(s / 60);
  if (m < 60) return `há ${m}min`;

  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h}h`;

  const d = Math.floor(h / 24);
  return `há ${d}d`;
}

export default function UserProfileModal({ userId, fallbackName, isOpen, onClose, onMessage }) {
  const chatCtx = useChat();
  const presenceMap = chatCtx?.presenceMap || {};

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [errCode, setErrCode] = useState(null); // 'no_id' | '403' | '404' | 'other'
  const [profile, setProfile] = useState(null);

  const overlayRef = useRef(null);

  // Hook sempre é chamado, independentemente de isOpen (OK)
  const titleName = useMemo(() => {
    const d = profile?.display_name?.trim();
    return d || fallbackName || "Aventureiro";
  }, [profile, fallbackName]);

  const presence = useMemo(() => {
    const key = userId ? String(userId) : "";
    const p = key ? presenceMap?.[key] : null;
    if (!p) return { status: "offline", lastSeen: null };
    return { status: p.status || "offline", lastSeen: p.lastSeen ?? null };
  }, [presenceMap, userId]);

  useEffect(() => {
    if (!isOpen) return;

    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;

    (async () => {
      try {
        setLoading(true);
        setErr(null);
        setErrCode(null);
        setProfile(null);

        // Sem ID: não tenta fetch
        if (!userId) {
          setErrCode("no_id");
          setErr("Não foi possível identificar este usuário para abrir o perfil completo.");
          return;
        }

        const res = await api.get(`/users/${userId}/profile`);
        if (!mounted) return;

        setProfile(res.data?.profile || null);
      } catch (e) {
        if (!mounted) return;

        const status = e?.response?.status;
        if (status === 403) {
          setErrCode("403");
          setErr("Este perfil está restrito. Pode ser privado ou visível apenas para amigos.");
        } else if (status === 404) {
          setErrCode("404");
          setErr("Perfil não encontrado.");
        } else {
          setErrCode("other");
          setErr("Erro ao carregar perfil.");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [isOpen, userId]);

  if (!isOpen) return null;

  const avatarUrl = profile?.avatar_url || "";
  const bannerUrl = profile?.banner_url || "";
  const bio = profile?.bio || "";
  const statusText = profile?.status_text || "";

  const showEmptyState = !!err && !loading && (!profile || errCode);

  let emptyTitle = "Não foi possível carregar";
  if (errCode === "403") emptyTitle = "Acesso restrito";
  else if (errCode === "404") emptyTitle = "Perfil não encontrado";
  else if (errCode === "no_id") emptyTitle = "Perfil indisponível";

  let emptyHint = "Tente novamente em alguns instantes.";
  if (errCode === "403") emptyHint = "Se vocês ainda não são amigos, envie uma solicitação e tente novamente.";
  else if (errCode === "no_id") emptyHint = "Isso pode ocorrer em listas antigas. Recarregue a página e tente novamente.";

  const isOnline = presence.status === "online";
  const lastSeen = formatLastSeen(presence.lastSeen);

  const presenceLabel = isOnline ? "Online" : presence.lastSeen ? `Offline • visto ${lastSeen}` : "Offline";
  const presenceTitle = isOnline ? "Online" : presence.lastSeen ? `Offline • visto ${lastSeen}` : "Offline";

  return (
    <div
      className={styles.overlay}
      ref={overlayRef}
      onMouseDown={(e) => {
        if (e.target === overlayRef.current) onClose?.();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Perfil do usuário"
    >
      <div className={styles.card}>
        <div className={styles.banner}>
          {bannerUrl ? (
            <img className={styles.bannerImg} src={bannerUrl} alt="Banner" />
          ) : (
            <div className={styles.bannerFallback} />
          )}

          <button className={styles.closeBtn} onClick={onClose} type="button" aria-label="Fechar">
            ✕
          </button>
        </div>

        <div className={styles.headerRow}>
          <div className={styles.avatarWrap}>
            <div className={styles.avatarShell} title={presenceTitle}>
              {avatarUrl ? (
                <img className={styles.avatarImg} src={avatarUrl} alt="Avatar" />
              ) : (
                <div className={styles.avatarFallback}>{(titleName?.[0] || "A").toUpperCase()}</div>
              )}
              <span className={`${styles.presenceDot} ${isOnline ? styles.presenceOnline : styles.presenceOffline}`} />
            </div>
          </div>

          <div className={styles.identity}>
            <div className={styles.nameRow}>
              <div className={styles.name}>{titleName}</div>
              <div className={styles.badge}>Perfil</div>
            </div>

            {!showEmptyState && (
              <>
                <div className={styles.statusRow}>
                  <span className={`${styles.dot} ${isOnline ? styles.dotOnline : styles.dotOffline}`} />
                  <span className={styles.statusText}>
                    {statusText?.trim() ? statusText : presenceLabel}
                  </span>
                  <span className={styles.presenceMeta} title={presenceTitle}>
                    {presenceLabel}
                  </span>
                </div>

                {!!bio && <div className={styles.bio}>{bio}</div>}
              </>
            )}

            {showEmptyState && (
              <div className={styles.empty}>
                <div className={styles.emptyIcon}>⛓</div>
                <div className={styles.emptyTitle}>{emptyTitle}</div>
                <div className={styles.emptyMsg}>{err}</div>
                <div className={styles.emptyHint}>{emptyHint}</div>
              </div>
            )}
          </div>
        </div>

        <div className={styles.footer}>
          <button className={styles.secondaryBtn} onClick={onClose} type="button">
            Fechar
          </button>

          <button
            className={styles.primaryBtn}
            onClick={() => onMessage?.(userId, titleName)}
            type="button"
            disabled={!onMessage || !!err || loading || !userId}
            title={
              !onMessage
                ? "Ação indisponível"
                : !userId
                ? "Usuário não identificado"
                : !!err
                ? "Perfil indisponível"
                : "Abrir chat"
            }
          >
            Mensagem
          </button>
        </div>

        {loading && (
          <div className={styles.loadingOverlay}>
            <div className={styles.loadingCard}>Carregando perfil...</div>
          </div>
        )}
      </div>
    </div>
  );
}

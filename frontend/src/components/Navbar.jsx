import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useChat } from "../context/ChatContext";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";

const CSS_STYLES = `
  .nav-link { position: relative; transition: all 0.28s cubic-bezier(0.2, 0.8, 0.2, 1); text-decoration: none; }
  .nav-link::after {
    content: ''; position: absolute; width: 0; height: 2px; bottom: 0; left: 50%;
    background: linear-gradient(90deg, rgba(250,204,21,0.0), rgba(250,204,21,1), rgba(250,204,21,0.0));
    transition: all 0.28s cubic-bezier(0.2, 0.8, 0.2, 1); transform: translateX(-50%);
    filter: drop-shadow(0 0 6px rgba(250, 204, 21, 0.35));
  }
  .nav-link:hover::after { width: 88%; }
  .nav-link:hover { color: #facc15 !important; text-shadow: 0 0 10px rgba(250, 204, 21, 0.35); }

  .nav-icon-btn {
    transition: transform 0.18s cubic-bezier(0.2, 0.8, 0.2, 1), filter 0.22s cubic-bezier(0.2, 0.8, 0.2, 1);
    will-change: transform;
  }
  .nav-icon-btn:hover { transform: translateY(-1px) scale(1.06); filter: drop-shadow(0 0 10px rgba(250,204,21,0.22)); }
  .nav-icon-btn:active { transform: translateY(0px) scale(0.98); }

  .logout-btn { transition: 0.28s cubic-bezier(0.2, 0.8, 0.2, 1); background-size: 200% auto; }
  .logout-btn:hover { background-position: right center; box-shadow: 0 0 14px rgba(239, 68, 68, 0.45); transform: translateY(-1px); }
  .logout-btn:active { transform: translateY(0px); }

  .dropdown-anim { animation: dropdownIn 0.18s cubic-bezier(0.2, 0.8, 0.2, 1); transform-origin: top right; }
  @keyframes dropdownIn { from { opacity: 0; transform: translateY(-6px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }

  .badge-pulse::before {
    content: '';
    position: absolute;
    inset: -4px;
    border-radius: 999px;
    background: radial-gradient(circle, rgba(239,68,68,0.45), rgba(239,68,68,0));
    filter: blur(2px);
    animation: badgePulse 1.4s ease-in-out infinite;
    pointer-events: none;
  }
  @keyframes badgePulse {
    0%, 100% { transform: scale(0.92); opacity: 0.55; }
    50% { transform: scale(1.12); opacity: 0.95; }
  }

  .focus-ring:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px rgba(250, 204, 21, 0.25), 0 0 0 1px rgba(250, 204, 21, 0.25) inset;
  }

  .profile-click {
    transition: transform 0.18s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.22s cubic-bezier(0.2, 0.8, 0.2, 1);
  }
  .profile-click:hover { transform: translateY(-1px); }
  .profile-click:active { transform: translateY(0px) scale(0.99); }

  @media (prefers-reduced-motion: reduce) {
    .nav-link, .nav-icon-btn, .logout-btn, .profile-click { transition: none !important; }
    .dropdown-anim { animation: none !important; }
    .badge-pulse::before { animation: none !important; }
  }
`;


function isAdminFromUser(u) {
  const role = String(u?.role || "").trim().toUpperCase();
  return role === "ADMIN";
}


export default function Navbar({ onLogout, username, user: userProp }) {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;

  const { profile, user, logout } = useAuth();
  const effectiveUser = userProp || user;
  const { unreadCount, recentContacts, openChat } = useChat();

  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [joinRequests, setJoinRequests] = useState([]);
  const [loadingReq, setLoadingReq] = useState(false);
  const [reqError, setReqError] = useState(null);

  const dropdownRef = useRef(null);
  const btnRef = useRef(null);

  const isActive = (path) => {
    if (path === "/") return currentPath === "/" || currentPath === "/home";
    if (path === "/campanhas") return currentPath.startsWith("/campanhas") || currentPath.startsWith("/session");
    return currentPath.startsWith(path);
  };

  const baseTabs = [
    { path: "/", label: "Início" },
    { path: "/personagem", label: "Personagens" },
    { path: "/campanhas", label: "Campanhas" },
    { path: "/amigos", label: "Amigos" },
    { path: "/perfil", label: "Perfil" },
    { path: "/sugestoes", label: "Sugestões" },
  ];

  const isAdmin = useMemo(() => isAdminFromUser(effectiveUser), [effectiveUser]);

  const tabs = useMemo(() => {
    if (!isAdmin) return baseTabs;
    return [...baseTabs, { path: "/admin", label: "Dashboard" }];
  }, [isAdmin]);


  const pendingJoinCount = useMemo(() => joinRequests.length, [joinRequests]);
  const totalNotifCount = useMemo(
    () => (unreadCount || 0) + pendingJoinCount,
    [unreadCount, pendingJoinCount]
  );

  useEffect(() => {
    if (!showNotifMenu) return;

    const onDocDown = (e) => {
      const t = e.target;
      if (dropdownRef.current?.contains(t)) return;
      if (btnRef.current?.contains(t)) return;
      setShowNotifMenu(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setShowNotifMenu(false);
    };

    document.addEventListener("mousedown", onDocDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [showNotifMenu]);

  const fetchJoinRequests = async () => {
    try {
      setLoadingReq(true);
      setReqError(null);

      const cRes = await api.get("/campaigns");
      const list = Array.isArray(cRes.data?.campaigns)
        ? cRes.data.campaigns
        : Array.isArray(cRes.data)
        ? cRes.data
        : [];
      const gmCampaigns = list.filter((c) => c?.my_role === "master" || c?.owner_id);

      if (gmCampaigns.length === 0) {
        setJoinRequests([]);
        return;
      }

      const reqs = await Promise.allSettled(
        gmCampaigns.map((c) => api.get(`/campaigns/${c.id}/join-requests`))
      );

      const flat = [];
      for (let i = 0; i < reqs.length; i++) {
        const r = reqs[i];
        const campaign = gmCampaigns[i];
        if (r.status !== "fulfilled") continue;

        const rows = Array.isArray(r.value?.data?.requests) ? r.value.data.requests : [];
        for (const row of rows) {
          flat.push({
            id: row.id,
            campaignId: campaign.id,
            campaignName: campaign.name,
            userId: row.user_id,
            username: row.username || row.email || "Usuário",
            created_at: row.created_at,
          });
        }
      }

      flat.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      setJoinRequests(flat);
    } catch (err) {
      console.error("[Navbar] fetchJoinRequests error:", err);
      setReqError("Não foi possível carregar solicitações.");
    } finally {
      setLoadingReq(false);
    }
  };

  useEffect(() => {
    if (!showNotifMenu) return;
    fetchJoinRequests();
    const t = setInterval(fetchJoinRequests, 20000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showNotifMenu]);

  const approveRequest = async (requestId) => {
    try {
      await api.post(`/campaigns/join-requests/${requestId}/approve`);
      await fetchJoinRequests();
    } catch (err) {
      console.error("[Navbar] approveRequest error:", err);
      alert("Erro ao aprovar solicitação.");
    }
  };

  const rejectRequest = async (requestId) => {
    try {
      await api.post(`/campaigns/join-requests/${requestId}/reject`);
      await fetchJoinRequests();
    } catch (err) {
      console.error("[Navbar] rejectRequest error:", err);
      alert("Erro ao rejeitar solicitação.");
    }
  };

  const formatMiniTime = (iso) => {
    if (!iso) return "";
    try {
      const d = new Date(iso);
      return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  const shownName =
    profile?.display_name ||
    username ||
    effectiveUser?.username ||
    effectiveUser?.name ||
    "Aventureiro";

  const avatarUrl = profile?.avatar_url || "";


  const handleLogout = () => {
    try {
      // Fecha menus antes de sair
      setShowNotifMenu(false);
    } catch {}

    try {
      // Preferir logout do AuthContext (fonte da verdade)
      if (typeof logout === "function") logout();
    } catch {}

    try {
      // Backward-compat: se o App passou onLogout, executa também
      if (typeof onLogout === "function") onLogout();
    } catch {}

    // Força navegação para a tela de login (evita "ficar preso" em rota protegida)
    navigate("/login", { replace: true });
  };

  return (
    <>
      <style>{CSS_STYLES}</style>
      <nav style={styles.nav}>
        <div style={styles.left}>
          <div style={styles.logoContainer}>
            <span style={styles.logoIcon}>🐉</span>
            <div style={styles.logoText}>UmbraTable</div>
          </div>

          <div style={styles.tabs}>
            {tabs.map((tab) => {
              const active = isActive(tab.path);
              return (
                <Link
                  key={tab.path}
                  to={tab.path}
                  className="nav-link"
                  style={{
                    ...styles.tabLink,
                    ...(active ? styles.tabLinkActive : {}),
                  }}
                >
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </div>

        <div style={styles.right}>
          {/* Notificações */}
          <div style={{ position: "relative" }}>
            <button
              ref={btnRef}
              className="nav-icon-btn focus-ring"
              onClick={() => setShowNotifMenu((v) => !v)}
              style={{
                ...styles.iconButton,
                ...(showNotifMenu ? styles.iconButtonActive : {}),
              }}
              title="Notificações"
              aria-label="Notificações"
              type="button"
            >
              <span style={{ lineHeight: 1 }}>🔔</span>

              {totalNotifCount > 0 && (
                <span style={styles.badgeWrap}>
                  <span style={styles.badge} className="badge-pulse">
                    {totalNotifCount > 99 ? "99+" : totalNotifCount}
                  </span>
                </span>
              )}
            </button>

            {showNotifMenu && (
              <div ref={dropdownRef} style={styles.dropdown} className="dropdown-anim">
                <div style={styles.dropdownHeader}>
                  <span>Notificações</span>
                  <span style={styles.dropdownHeaderMeta}>{totalNotifCount > 0 ? `${totalNotifCount}` : "—"}</span>
                </div>

                {/* Solicitações */}
                <div style={styles.dropdownSection}>
                  <div style={styles.sectionTitleRow}>
                    <span style={styles.sectionTitle}>Solicitações para entrar</span>
                    <span style={styles.sectionPill}>{loadingReq ? "..." : String(pendingJoinCount)}</span>
                  </div>

                  {reqError && <div style={styles.dropdownError}>{reqError}</div>}

                  {loadingReq ? (
                    <div style={styles.dropdownEmpty}>Carregando solicitações...</div>
                  ) : joinRequests.length === 0 ? (
                    <div style={styles.dropdownEmpty}>Nenhuma solicitação pendente.</div>
                  ) : (
                    <div style={styles.dropdownList}>
                      {joinRequests.map((r) => (
                        <div key={r.id} style={styles.requestItem}>
                          <div style={styles.requestTop}>
                            <div style={styles.requestMeta}>
                              <div style={styles.requestTitle}>{r.username}</div>
                              <div style={styles.requestSub}>
                                {r.campaignName}
                                <span style={styles.dot}>•</span>
                                {formatMiniTime(r.created_at)}
                              </div>
                            </div>
                          </div>

                          <div style={styles.requestActions}>
                            <button type="button" className="focus-ring" style={styles.btnApprove} onClick={() => approveRequest(r.id)}>
                              Aprovar
                            </button>
                            <button type="button" className="focus-ring" style={styles.btnReject} onClick={() => rejectRequest(r.id)}>
                              Rejeitar
                            </button>
                            <button
                              type="button"
                              className="focus-ring"
                              style={styles.btnGo}
                              onClick={() => {
                                setShowNotifMenu(false);
                                navigate(`/session/${r.campaignId}`);
                              }}
                              title="Abrir campanha"
                            >
                              Abrir
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div style={styles.sectionDivider} />

                {/* Mensagens */}
                <div style={styles.dropdownSection}>
                  <div style={styles.sectionTitleRow}>
                    <span style={styles.sectionTitle}>Mensagens</span>
                    <span style={styles.sectionPill}>{String(unreadCount || 0)}</span>
                  </div>

                  {recentContacts.length === 0 ? (
                    <div style={styles.dropdownEmpty}>Nenhuma conversa recente.</div>
                  ) : (
                    <div style={styles.dropdownList}>
                      {recentContacts.map((contact) => (
                        <div
                          key={contact.id}
                          onClick={() => {
                            openChat(contact);
                            setShowNotifMenu(false);
                          }}
                          style={styles.dropdownItem}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "#334155")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                          role="button"
                          tabIndex={0}
                        >
                          <div style={styles.avatarMini}>{(contact.name?.[0] || "A").toUpperCase()}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={styles.contactName}>{contact.name}</div>
                            <div style={styles.contactHint}>Clique para abrir</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <Link to="/amigos" onClick={() => setShowNotifMenu(false)} style={styles.dropdownFooter}>
                    Ver todos os amigos →
                  </Link>
                </div>
              </div>
            )}
          </div>

          <div style={styles.divider} />

          {/* PERFIL (clicável para /perfil) */}
          <button
            type="button"
            className="profile-click focus-ring"
            onClick={() => navigate("/perfil")}
            style={{
              ...styles.profileButton,
              ...(isActive("/perfil") ? styles.profileButtonActive : {}),
            }}
            title="Abrir perfil"
          >
            <div style={styles.avatar}>
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Avatar"
                  style={styles.avatarImg}
                  onError={(e) => {
                    // fallback para não quebrar se URL der 404
                    e.currentTarget.style.display = "none";
                  }}
                />
              ) : (
                <span>{shownName ? shownName[0].toUpperCase() : "A"}</span>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
              <span style={styles.userName}>{shownName}</span>
              <span style={styles.userRole}>Configurar Perfil</span>
            </div>
          </button>

          <button type="button" onClick={handleLogout} className="logout-btn" style={styles.logoutButton} title="Sair da conta">
            Sair ⎋
          </button>
        </div>
      </nav>
    </>
  );
}

const styles = {
  nav: {
    height: "65px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 2rem",
    background: "rgba(15, 23, 42, 0.85)",
    borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
    backdropFilter: "blur(12px)",
    position: "sticky",
    top: 0,
    zIndex: 1000,
    boxShadow: "0 4px 30px rgba(0, 0, 0, 0.3)",
  },

  left: { display: "flex", alignItems: "center", gap: "2.5rem" },
  logoContainer: { display: "flex", alignItems: "center", gap: "10px", cursor: "default" },
  logoIcon: { fontSize: "1.8rem" },
  logoText: {
    fontFamily: '"Cinzel", serif',
    fontWeight: 700,
    fontSize: "1.5rem",
    letterSpacing: "0.05em",
    color: "#facc15",
    textShadow: "0 2px 10px rgba(250, 204, 21, 0.2)",
  },
  tabs: { display: "flex", alignItems: "center", gap: "1.2rem" },
  tabLink: {
    textDecoration: "none",
    fontSize: "0.95rem",
    color: "#94a3b8",
    fontWeight: 500,
    padding: "0.5rem 0",
    borderBottom: "2px solid transparent",
  },
  tabLinkActive: { color: "#facc15", fontWeight: 800 },

  right: { display: "flex", alignItems: "center", gap: "0.85rem" },

  iconButton: {
    position: "relative",
    background: "linear-gradient(180deg, rgba(30,41,59,0.55), rgba(15,23,42,0.35))",
    border: "1px solid rgba(148,163,184,0.18)",
    color: "#e2e8f0",
    fontSize: "1.15rem",
    cursor: "pointer",
    padding: "8px 10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    boxShadow: "0 10px 24px rgba(0,0,0,0.28)",
  },
  iconButtonActive: {
    border: "1px solid rgba(250,204,21,0.35)",
    boxShadow: "0 10px 28px rgba(0,0,0,0.34), 0 0 0 3px rgba(250,204,21,0.10)",
  },

  badgeWrap: { position: "absolute", top: -6, right: -6 },
  badge: {
    position: "relative",
    background: "#ef4444",
    color: "white",
    fontSize: "0.65rem",
    fontWeight: "bold",
    borderRadius: 999,
    minWidth: "18px",
    height: "18px",
    padding: "0 5px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 0 10px rgba(239, 68, 68, 0.45)",
    border: "1px solid rgba(255,255,255,0.25)",
  },

  divider: { width: "1px", height: "24px", background: "rgba(255,255,255,0.15)", margin: "0 5px" },

  profileButton: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    background: "linear-gradient(180deg, rgba(30,41,59,0.45), rgba(2,6,23,0.35))",
    border: "1px solid rgba(148,163,184,0.18)",
    borderRadius: 14,
    padding: "6px 10px",
    cursor: "pointer",
    color: "#e2e8f0",
    boxShadow: "0 10px 24px rgba(0,0,0,0.25)",
  },
  profileButtonActive: {
    border: "1px solid rgba(250,204,21,0.30)",
    boxShadow: "0 10px 28px rgba(0,0,0,0.34), 0 0 0 3px rgba(250,204,21,0.10)",
  },

  avatar: {
    width: "34px",
    height: "34px",
    borderRadius: 12,
    background: "linear-gradient(135deg, #facc15, #b45309)",
    color: "#000",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 950,
    fontSize: "0.95rem",
    boxShadow: "0 0 10px rgba(250, 204, 21, 0.25)",
    overflow: "hidden",
  },
  avatarImg: { width: "100%", height: "100%", objectFit: "cover", display: "block" },

  userName: { fontSize: "0.88rem", color: "#f1f5f9", fontWeight: 800, lineHeight: 1.1 },
  userRole: { fontSize: "0.68rem", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 2 },

  logoutButton: {
    background: "linear-gradient(90deg, #ef4444 0%, #b91c1c 100%)",
    border: "none",
    color: "#fff",
    padding: "0.4rem 1rem",
    borderRadius: "10px",
    cursor: "pointer",
    fontSize: "0.8rem",
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },

  dropdown: {
    position: "absolute",
    top: "54px",
    right: "-6px",
    width: "360px",
    background: "linear-gradient(180deg, rgba(30,41,59,0.98), rgba(15,23,42,0.98))",
    border: "1px solid rgba(148,163,184,0.18)",
    borderRadius: "14px",
    boxShadow: "0 18px 60px rgba(0,0,0,0.60)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  dropdownHeader: {
    padding: "12px 14px",
    background: "rgba(2,6,23,0.55)",
    borderBottom: "1px solid rgba(148,163,184,0.18)",
    color: "#facc15",
    fontSize: "0.82rem",
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dropdownHeaderMeta: { fontSize: "0.75rem", color: "rgba(226,232,240,0.75)", fontWeight: 800 },

  dropdownSection: { padding: 10 },
  sectionTitleRow: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "2px 4px 8px 4px" },
  sectionTitle: { color: "#e2e8f0", fontSize: "0.78rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.08em" },
  sectionPill: {
    fontSize: "0.72rem",
    color: "#0b1220",
    background: "linear-gradient(135deg, rgba(250,204,21,1), rgba(180,83,9,1))",
    borderRadius: 999,
    padding: "2px 8px",
    fontWeight: 900,
  },
  sectionDivider: { height: 1, background: "rgba(148,163,184,0.14)", margin: "0 10px" },

  dropdownList: { maxHeight: "220px", overflowY: "auto", padding: "4px" },
  dropdownItem: { padding: "10px", display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", borderRadius: "10px", color: "#e2e8f0", transition: "0.2s" },
  dropdownEmpty: { padding: "10px 8px 14px 8px", textAlign: "center", color: "rgba(148,163,184,0.85)", fontSize: "0.85rem" },
  dropdownError: { margin: "0 4px 10px 4px", padding: "8px 10px", borderRadius: 10, border: "1px solid rgba(239, 68, 68, 0.35)", background: "rgba(127, 29, 29, 0.30)", color: "rgba(254, 226, 226, 0.95)", fontSize: "0.82rem" },
  dropdownFooter: { marginTop: 8, padding: "10px", textAlign: "center", background: "rgba(2,6,23,0.55)", borderTop: "1px solid rgba(148,163,184,0.18)", color: "#60a5fa", fontSize: "0.85rem", textDecoration: "none", fontWeight: 700, borderRadius: 10, display: "block" },

  avatarMini: { width: "26px", height: "26px", borderRadius: "50%", background: "linear-gradient(135deg, rgba(34,197,94,1), rgba(16,185,129,1))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "bold", color: "#07110a", boxShadow: "0 8px 16px rgba(0,0,0,0.35)", border: "1px solid rgba(255,255,255,0.18)" },
  contactName: { fontSize: 13, fontWeight: 800, color: "#e2e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  contactHint: { fontSize: 11, color: "rgba(148,163,184,0.9)", marginTop: 2 },

  requestItem: { border: "1px solid rgba(148,163,184,0.16)", background: "rgba(2,6,23,0.35)", borderRadius: 12, padding: 10, marginBottom: 8, boxShadow: "0 10px 24px rgba(0,0,0,0.25)" },
  requestTop: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 },
  requestMeta: { minWidth: 0 },
  requestTitle: { color: "#f1f5f9", fontWeight: 900, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  requestSub: { color: "rgba(148,163,184,0.9)", fontSize: 12, marginTop: 2, display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6 },
  dot: { opacity: 0.6 },

  requestActions: { marginTop: 10, display: "flex", gap: 8 },
  btnApprove: { flex: 1, border: "1px solid rgba(34,197,94,0.35)", background: "linear-gradient(180deg, rgba(34,197,94,0.22), rgba(16,185,129,0.12))", color: "rgba(220,252,231,0.95)", padding: "8px 10px", borderRadius: 10, cursor: "pointer", fontWeight: 900, letterSpacing: 0.2 },
  btnReject: { flex: 1, border: "1px solid rgba(239,68,68,0.35)", background: "linear-gradient(180deg, rgba(239,68,68,0.20), rgba(127,29,29,0.12))", color: "rgba(254,226,226,0.95)", padding: "8px 10px", borderRadius: 10, cursor: "pointer", fontWeight: 900, letterSpacing: 0.2 },
  btnGo: { border: "1px solid rgba(96,165,250,0.35)", background: "linear-gradient(180deg, rgba(59,130,246,0.22), rgba(15,23,42,0.10))", color: "rgba(219,234,254,0.95)", padding: "8px 10px", borderRadius: 10, cursor: "pointer", fontWeight: 900, letterSpacing: 0.2 },
};

import React, { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useChat } from "../context/ChatContext";
import UserProfileModal from "../components/modals/UserProfileModal";
import "./Amigos.css"; // <--- Importando o visual Dark Fantasy

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

export default function AmigosPage() {
  const { user } = useAuth();
  const chatCtx = useChat();
  const openChat = chatCtx?.openChat;
  const socket = chatCtx?.socket;

  // Presença vinda do ChatContext
  const presenceMap = chatCtx?.presenceMap || {};

  const [friends, setFriends] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [outgoingRequests, setOutgoingRequests] = useState([]);
  const [campaignInvitations, setCampaignInvitations] = useState([]);

  const [usernameToInvite, setUsernameToInvite] = useState("");
  const [loading, setLoading] = useState(false);

  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);

  const [myCampaigns, setMyCampaigns] = useState([]);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteTarget, setInviteTarget] = useState(null);
  const [selectedCampaignId, setSelectedCampaignId] = useState("");

  const [profileOpen, setProfileOpen] = useState(false);
  const [profileTarget, setProfileTarget] = useState(null); // { id, name }

  const [userIdCache, setUserIdCache] = useState({});

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!socket) return;
    const handleUpdate = () => loadAll();
    socket.on("friend_request_update", handleUpdate);
    return () => socket.off("friend_request_update", handleUpdate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket]);

  function showToast(type, title, msg, ms = 3200) {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ type, title, msg });
    toastTimerRef.current = setTimeout(() => setToast(null), ms);
  }

  async function loadAll() {
    if (friends.length === 0 && incomingRequests.length === 0) setLoading(true);

    try {
      const [friendsRes, requestsRes, campaignsRes, campInvRes] = await Promise.all([
        api.get("/friends"),
        api.get("/friends/requests"),
        api.get("/campaigns"),
        api.get("/campaign-invitations"),
      ]);

      setFriends(friendsRes.data || []);

      const inc = requestsRes.data?.received || [];
      const out = requestsRes.data?.sent || [];
      setIncomingRequests(inc);
      setOutgoingRequests(out);

      const camps = campaignsRes.data?.campaigns || campaignsRes.data || [];
      setMyCampaigns(Array.isArray(camps) ? camps : []);

      const invites = campInvRes.data?.invitations || campInvRes.data || [];
      setCampaignInvitations(Array.isArray(invites) ? invites : []);
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
      showToast("err", "Falha ao carregar", "Não foi possível atualizar aliados e convites.");
    } finally {
      setLoading(false);
    }
  }

  async function resolveUserIdByUsername(username) {
    const u = String(username || "").trim();
    if (!u) return null;
    if (userIdCache[u]) return userIdCache[u];

    try {
      const res = await api.get("/users/lookup", { params: { username: u } });
      const id = res?.data?.id || null;
      if (id) setUserIdCache((prev) => ({ ...prev, [u]: id }));
      return id;
    } catch (e) {
      return null;
    }
  }

  async function handleSendFriendRequest(e) {
    e.preventDefault();
    const target = usernameToInvite.trim();
    if (!target) {
      showToast("info", "Campo obrigatório", "Informe o nome de usuário.");
      return;
    }

    setLoading(true);
    try {
      await api.post("/friends/requests", { username: target });
      setUsernameToInvite("");
      showToast("ok", "Solicitação enviada", "Pedido de amizade enviado com sucesso.");
      await loadAll();
    } catch (err) {
      const status = err.response?.status;

      if (status === 409) {
        showToast("info", "Já existe vínculo", "Solicitação já enviada ou vocês já são amigos.");
      } else if (status === 403) {
        showToast("err", "Não permitido", err.response?.data?.message || "Este usuário não aceita pedidos.");
      } else if (status === 404) {
        showToast("err", "Não encontrado", "Usuário não encontrado.");
      } else {
        showToast("err", "Erro ao enviar", err.response?.data?.message || "Falha ao enviar solicitação.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleFriendRequestAction(id, status) {
    setLoading(true);
    try {
      await api.patch(`/friends/requests/${id}`, { status });
      showToast(
        "ok",
        status === "accepted" ? "Aliança firmada" : "Solicitação recusada",
        status === "accepted" ? "Novo aliado adicionado." : "Solicitação removida."
      );
      await loadAll();
    } catch (err) {
      showToast("err", "Erro", "Falha ao processar solicitação.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRemoveFriend(friendId) {
    if (!window.confirm("Remover aliado?")) return;
    setLoading(true);
    try {
      await api.delete(`/friends/${friendId}`);
      setFriends((p) => p.filter((f) => f.id !== friendId));
      showToast("ok", "Removido", "O aliado foi removido da sua lista.");
    } catch (err) {
      showToast("err", "Erro", "Falha ao remover aliado.");
    } finally {
      setLoading(false);
    }
  }

  function openInviteModal(friend) {
    setInviteTarget(friend);
    if (myCampaigns.length > 0) setSelectedCampaignId(myCampaigns[0].id);
    setInviteModalOpen(true);
  }

  async function handleSendCampaignInvite() {
    if (!selectedCampaignId) {
      showToast("info", "Seleção necessária", "Escolha uma campanha para enviar o convite.");
      return;
    }
    setLoading(true);
    try {
      await api.post(`/campaigns/${selectedCampaignId}/invitations`, { toUserId: inviteTarget.id });
      showToast("ok", "Convite enviado", "O convite de campanha foi enviado.");
      setInviteModalOpen(false);
    } catch (err) {
      if (err.response?.status === 409) showToast("info", "Já convidado", "Este usuário já foi convidado.");
      else showToast("err", "Erro", "Falha ao convidar para a campanha.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCampaignInvitationAction(id, action) {
    setLoading(true);
    try {
      await api.patch(`/campaign-invitations/${id}`, { status: action });
      showToast("ok", action === "accepted" ? "Convite aceito" : "Convite recusado", "Resposta registrada.");
      await loadAll();
    } catch (err) {
      console.error(err);
      showToast("err", "Erro", "Falha ao responder convite.");
    } finally {
      setLoading(false);
    }
  }

  const openProfile = async (id, name) => {
    const fallbackName = name || "Aventureiro";

    if (id) {
      setProfileTarget({ id, name: fallbackName });
      setProfileOpen(true);
      return;
    }

    const resolved = await resolveUserIdByUsername(fallbackName);
    setProfileTarget({ id: resolved || null, name: fallbackName });
    setProfileOpen(true);

    if (!resolved) {
      showToast("info", "Perfil", "Não foi possível localizar o ID desse usuário. Abrindo perfil limitado.");
    }
  };

  const pendingIncomingCount = incomingRequests.length;

  const headerBadges = useMemo(() => {
    return {
      friends: friends.length,
      pending: pendingIncomingCount,
      campInv: campaignInvitations.length,
    };
  }, [friends.length, pendingIncomingCount, campaignInvitations.length]);

  const renderAvatar = (avatarUrl, label) => {
    if (avatarUrl) {
      return <img className="avatarImg" src={avatarUrl} alt="avatar" />;
    }
    const ch = (label?.[0] || "?").toUpperCase();
    return ch;
  };

  const displayLabel = (r) => (r?.display_name?.trim() ? r.display_name : r?.username || "Aventureiro");

  const getPresence = (userId) => {
    const p = presenceMap?.[String(userId)];
    if (!p) return { status: "offline", lastSeen: null };
    return { status: p.status || "offline", lastSeen: p.lastSeen ?? null };
  };

  return (
    <div className="umbral-amigos">
      <div className="wrap">
        <div className="topbar">
          <div>
            <h1 className="title">
              <span className="titleAccent">Aliados</span> & Convites
            </h1>
            <p className="subtitle">
              Gerencie amizades, solicitações e convites de campanha.
            </p>
          </div>

          <div className="badgesRow">
            <span className="badge badgeOk" title="Total de amigos">
              <span className="badgeDot" />
              {headerBadges.friends} Amigos
            </span>
            {headerBadges.pending > 0 && (
              <span className="badge badgeWarn" title="Solicitações recebidas pendentes">
                <span className="badgeDot" />
                {headerBadges.pending} Pendentes
              </span>
            )}
            {headerBadges.campInv > 0 && (
              <span className="badge badgeInfo" title="Convites de campanha pendentes">
                <span className="badgeDot" />
                {headerBadges.campInv} Convites
              </span>
            )}
          </div>
        </div>

        {toast && (
          <div className="toastWrap">
            <div
              className={`toast ${
                toast.type === "ok" ? "toastOk" : toast.type === "info" ? "toastInfo" : "toastErr"
              }`}
            >
              <div style={{ flex: 1 }}>
                <div className="toastTitle">{toast.title}</div>
                <div className="toastMsg">{toast.msg}</div>
              </div>
              <button className="xBtn" onClick={() => setToast(null)} type="button" aria-label="Fechar">
                ✕
              </button>
            </div>
          </div>
        )}

        <div className="grid">
          <div className="colLeft">
            <div className="glass-card">
              <div className="sectionTitle">
                <span>Meus Aliados</span>
                <span className="sectionHint">
                  {friends.length > 0 ? "Ações rápidas: perfil, chat, convite" : "Comece adicionando um aliado"}
                </span>
              </div>

              {friends.length === 0 ? (
                <p className="muted">Nenhum aliado adicionado ainda. Use o painel à direita para enviar uma solicitação.</p>
              ) : (
                <div className="list">
                  {friends.map((f) => {
                    const pres = getPresence(f.id);
                    const isOnline = pres.status === "online";
                    const lastSeen = formatLastSeen(pres.lastSeen);

                    return (
                      <div key={f.id} className="rowItem">
                        <div className="leftInfo">
                          <div
                            className="avatar"
                            title={
                              isOnline
                                ? "Online"
                                : pres.lastSeen
                                ? `Offline • visto ${lastSeen}`
                                : "Offline"
                            }
                          >
                            {renderAvatar(null, f.username)}
                            <span
                              className={`presenceDot ${isOnline ? "presenceOnline" : "presenceOffline"}`}
                            />
                          </div>

                          <div style={{ minWidth: 0 }}>
                            <div className="name">{f.username}</div>

                            <div className="metaRow">
                              <div className="meta">{f.email || "—"}</div>
                              <span
                                className={`metaPresence ${isOnline ? "metaPresenceOnline" : "metaPresenceOffline"}`}
                                title={isOnline ? "Online" : pres.lastSeen ? `Visto ${lastSeen}` : "Offline"}
                              >
                                <span className="metaPresencePip" />
                                {isOnline ? "Online" : pres.lastSeen ? `Offline • ${lastSeen}` : "Offline"}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="actions">
                          <button
                            onClick={() => openProfile(f.id, f.username)}
                            className="btn btnIcon"
                            title="Ver perfil"
                            type="button"
                            disabled={loading}
                          >
                            👁
                          </button>

                          <button
                            onClick={() => openChat && openChat({ id: f.id, name: f.username })}
                            className="btn btnIcon btnInfo"
                            title="Conversar"
                            type="button"
                            disabled={loading}
                          >
                            💬
                          </button>

                          {myCampaigns.length > 0 && (
                            <button
                              onClick={() => openInviteModal(f)}
                              className="btn btnPrimary"
                              type="button"
                              disabled={loading}
                            >
                              Convidar
                            </button>
                          )}

                          <button
                            onClick={() => handleRemoveFriend(f.id)}
                            className="btn btnIcon btnDanger"
                            title="Remover aliado"
                            type="button"
                            disabled={loading}
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="glass-card">
              <div className="sectionTitle">
                <span>Convites de Campanha</span>
                <span className="sectionHint">
                  {campaignInvitations.length > 0 ? "Responda para entrar na mesa" : "Nada pendente por enquanto"}
                </span>
              </div>

              {campaignInvitations.length === 0 ? (
                <p className="muted">Nenhum convite pendente.</p>
              ) : (
                <div className="list">
                  {campaignInvitations.map((inv) => (
                    <div key={inv.id} className="rowItem">
                      <div className="leftInfo">
                        <div className="avatar">🏰</div>
                        <div style={{ minWidth: 0 }}>
                          <div className="name">{inv.campaign_name}</div>
                          <div className="meta">Mestre: {inv.from_name || "—"}</div>
                        </div>
                      </div>

                      {(inv.status === "pending" || !inv.status) && (
                        <div className="actions">
                          <button
                            onClick={() => handleCampaignInvitationAction(inv.id, "accepted")}
                            className="btn btnSuccess"
                            type="button"
                            disabled={loading}
                          >
                            Aceitar
                          </button>
                          <button
                            onClick={() => handleCampaignInvitationAction(inv.id, "rejected")}
                            className="btn btnDanger"
                            type="button"
                            disabled={loading}
                          >
                            Recusar
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="colRight">
            <div className="glass-card">
              <div className="sectionTitle">
                <span>Adicionar Novo Aliado</span>
                <span className="sectionHint">{loading ? "Processando..." : "Envie pelo username"}</span>
              </div>

              <form onSubmit={handleSendFriendRequest} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <label
                  style={{
                    color: "var(--accent)",
                    fontSize: "0.85rem",
                    fontWeight: 700,
                    letterSpacing: "0.02em",
                  }}
                >
                  Nome de usuário
                </label>

                <input
                  className="input"
                  placeholder="Ex: Legolas123"
                  value={usernameToInvite}
                  onChange={(e) => setUsernameToInvite(e.target.value)}
                  disabled={loading}
                />

                <button type="submit" disabled={loading} className="btn btnPrimary" style={{ width: "100%" }}>
                  {loading ? "Enviando..." : "Enviar Solicitação"}
                </button>

                <div className="divider" />

                <p className="muted" style={{ marginTop: 0 }}>
                  Se o usuário desativou “Permitir pedidos de amizade”, a solicitação será bloqueada.
                </p>
              </form>
            </div>

            <div className="glass-card">
              <div className="sectionTitle">
                <span>Solicitações Recebidas</span>
                <span className="sectionHint">{incomingRequests.length > 0 ? "Aceite ou recuse" : "Nenhuma solicitação"}</span>
              </div>

              {incomingRequests.length === 0 ? (
                <p className="muted">Nenhuma solicitação recebida.</p>
              ) : (
                <div className="list">
                  {incomingRequests.map((r) => {
                    const label = displayLabel(r);
                    const pres = getPresence(r.from_user_id);
                    const isOnline = pres.status === "online";
                    const lastSeen = formatLastSeen(pres.lastSeen);

                    return (
                      <div key={r.id} className="rowItem">
                        <div className="leftInfo">
                          <div
                            className="avatar"
                            title={
                              isOnline ? "Online" : pres.lastSeen ? `Offline • visto ${lastSeen}` : "Offline"
                            }
                          >
                            {renderAvatar(r.avatar_url, label)}
                            <span className={`presenceDot ${isOnline ? "presenceOnline" : "presenceOffline"}`} />
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div className="name">{label}</div>
                            <div className="meta">
                              @{r.username || "—"} • quer ser seu aliado{" "}
                              <span style={{ marginLeft: 8, fontWeight: 700, color: isOnline ? "var(--success)" : "var(--text-muted)" }}>
                                {isOnline ? "• Online" : pres.lastSeen ? `• Offline ${lastSeen}` : "• Offline"}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="actions">
                          <button
                            onClick={() => openProfile(r.from_user_id || null, label)}
                            className="btn btnIcon"
                            title="Ver perfil"
                            type="button"
                            disabled={loading}
                          >
                            👁
                          </button>

                          <button
                            onClick={() => handleFriendRequestAction(r.id, "accepted")}
                            className="btn btnIcon btnSuccess"
                            title="Aceitar"
                            type="button"
                            disabled={loading}
                          >
                            ✓
                          </button>

                          <button
                            onClick={() => handleFriendRequestAction(r.id, "rejected")}
                            className="btn btnIcon btnDanger"
                            title="Recusar"
                            type="button"
                            disabled={loading}
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {outgoingRequests.length > 0 && (
                <>
                  <div className="divider" />
                  <div className="sectionTitle" style={{ marginBottom: 10 }}>
                    <span>Enviadas</span>
                    <span className="sectionHint">{outgoingRequests.length} pendente(s)</span>
                  </div>

                  <div className="list">
                    {outgoingRequests.map((r) => {
                      const label = displayLabel(r);
                      const pres = getPresence(r.to_user_id);
                      const isOnline = pres.status === "online";
                      const lastSeen = formatLastSeen(pres.lastSeen);

                      return (
                        <div key={r.id} className="rowItem" style={{ opacity: 0.78 }}>
                          <div className="leftInfo">
                            <div
                              className="avatar"
                              title={isOnline ? "Online" : pres.lastSeen ? `Offline • visto ${lastSeen}` : "Offline"}
                            >
                              {renderAvatar(r.avatar_url, label)}
                              <span className={`presenceDot ${isOnline ? "presenceOnline" : "presenceOffline"}`} />
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div className="name">{label}</div>
                              <div className="meta" style={{ color: "var(--accent)", fontWeight: 700 }}>
                                Pendente • @{r.username || "—"}{" "}
                                <span style={{ marginLeft: 8, color: isOnline ? "var(--success)" : "var(--text-muted)" }}>
                                  {isOnline ? "• Online" : pres.lastSeen ? `• Offline ${lastSeen}` : "• Offline"}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="actions">
                            <button
                              onClick={() => openProfile(r.to_user_id || null, label)}
                              className="btn btnIcon"
                              title="Ver perfil"
                              type="button"
                              disabled={loading}
                            >
                              👁
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {inviteModalOpen && (
          <div className="modalOverlay" role="dialog" aria-modal="true">
            <div className={`glass-card modalBox`}>
              <div className="sectionTitle" style={{ marginBottom: 10 }}>
                <span>Convidar {inviteTarget?.username}</span>
                <span className="sectionHint">Selecione a campanha</span>
              </div>

              <select
                value={selectedCampaignId}
                onChange={(e) => setSelectedCampaignId(e.target.value)}
                className="input"
                disabled={loading}
              >
                <option value="">Selecione...</option>
                {myCampaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 14 }}>
                <button onClick={() => setInviteModalOpen(false)} className="btn" type="button" disabled={loading}>
                  Cancelar
                </button>
                <button onClick={handleSendCampaignInvite} className="btn btnPrimary" type="button" disabled={loading}>
                  {loading ? "Enviando..." : "Enviar Convite"}
                </button>
              </div>
            </div>
          </div>
        )}

        <UserProfileModal
          userId={profileTarget?.id}
          fallbackName={profileTarget?.name}
          isOpen={profileOpen}
          onClose={() => setProfileOpen(false)}
          onMessage={(id, name) => {
            setProfileOpen(false);
            if (openChat) openChat({ id, name });
          }}
        />
      </div>
    </div>
  );
}
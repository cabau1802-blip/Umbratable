import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import "./Campanhas.css"; // <--- Importando o visual novo

function Campanhas() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [campaigns, setCampaigns] = useState([]);
  const [invitations, setInvitations] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [loadingDeleteId, setLoadingDeleteId] = useState(null);
  const [error, setError] = useState(null);

  // Controle do formulário
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [accessType, setAccessType] = useState("invite_only");
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Estados para ações de join/request
  const [joiningCampaignId, setJoiningCampaignId] = useState(null);
  const [requestingCampaignId, setRequestingCampaignId] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [campRes, invRes] = await Promise.all([
        api.get("/campaigns"),
        api.get("/campaign-invitations"),
      ]);

      const campData = campRes.data;
      const campList = Array.isArray(campData)
        ? campData
        : Array.isArray(campData?.campaigns)
        ? campData.campaigns
        : [];
      setCampaigns(campList);

      const invData = invRes.data;
      const invList = Array.isArray(invData)
        ? invData
        : Array.isArray(invData?.invitations)
        ? invData.invitations
        : [];
      setInvitations(invList);
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
      setError("Erro ao carregar dados. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateCampaign = async (e) => {
    e.preventDefault();
    if (!name.trim()) return setError("Nome da campanha é obrigatório.");

    try {
      setLoadingCreate(true);
      setError(null);

      const response = await api.post("/campaigns", {
        name: name.trim(),
        description: description.trim() || null,
        access_type: accessType,
      });

      const newCampaign = response.data?.campaign || response.data;
      setCampaigns((prev) => [newCampaign, ...prev]);

      setName("");
      setDescription("");
      setAccessType("invite_only");
      setShowCreateForm(false);
    } catch (err) {
      console.error(err);
      setError("Erro ao criar campanha.");
    } finally {
      setLoadingCreate(false);
    }
  };

  const handleDeleteCampaign = async (e, campaignId) => {
    e.stopPropagation();
    if (!window.confirm("Tem certeza que deseja excluir esta campanha?")) return;

    try {
      setLoadingDeleteId(campaignId);
      setError(null);

      await api.delete(`/campaigns/${campaignId}`);
      setCampaigns((prev) => prev.filter((c) => c.id !== campaignId));

      const sessionMatch = location.pathname.match(/^\/session\/(.+)$/);
      const currentSessionId = sessionMatch?.[1];
      if (currentSessionId && String(currentSessionId) === String(campaignId)) {
        navigate("/campanhas", { replace: true });
      }
    } catch (err) {
      console.error(err);
      setError("Erro ao deletar campanha.");
    } finally {
      setLoadingDeleteId(null);
    }
  };

  const handleInvitation = async (id, action) => {
    try {
      setError(null);
      const statusMap = { accept: "accepted", reject: "rejected" };
      await api.patch(`/campaign-invitations/${id}`, { status: statusMap[action] });

      if (action === "accept") alert("Você entrou na mesa!");
      fetchData();
    } catch (error) {
      console.error(error);
      alert("Erro ao responder convite.");
    }
  };

  const handleJoinOpenCampaign = async (campaignId) => {
    try {
      setJoiningCampaignId(campaignId);
      setError(null);
      await api.post(`/campaigns/${campaignId}/join`);
      await fetchData();
      navigate(`/session/${campaignId}`);
    } catch (err) {
      console.error(err);
      const msg = err?.response?.data?.message || "Não foi possível entrar na campanha agora.";
      setError(msg);
    } finally {
      setJoiningCampaignId(null);
    }
  };

  const handleRequestJoin = async (campaignId) => {
    try {
      setRequestingCampaignId(campaignId);
      setError(null);
      await api.post(`/campaigns/${campaignId}/join-requests`);
      await fetchData();
      alert("Solicitação enviada para o mestre!");
    } catch (err) {
      console.error(err);
      const msg = err?.response?.data?.message || "Não foi possível enviar a solicitação.";
      setError(msg);
    } finally {
      setRequestingCampaignId(null);
    }
  };

  const formatDate = (isoString) => {
    if (!isoString) return "-";
    try {
      return new Date(isoString).toLocaleDateString("pt-BR");
    } catch {
      return isoString;
    }
  };

  const accessLabel = (access_type) => {
    switch (access_type) {
      case "open":
        return { text: "Aberta", color: "#22c55e" };
      case "invite_only":
        return { text: "Somente convidados", color: "#facc15" };
      case "request_approval":
        return { text: "Por aprovação", color: "#60a5fa" };
      default:
        return { text: "Privada", color: "#94a3b8" };
    }
  };

  const normalizeAccessType = (c) => c?.access_type || c?.accessType || c?.visibility || null;

  const isMember = (c) => {
    if (c?.my_role) return true;
    if (c?.owner_id && user?.id && String(c.owner_id) === String(user.id)) return true;
    return false;
  };

  const joinRequestStatus = (c) => c?.join_request_status || c?.request_status || null;

  const derivedCampaigns = useMemo(() => {
    const mineOrJoined = [];
    const discover = [];
    for (const c of campaigns) {
      const member = isMember(c);
      if (member) mineOrJoined.push(c);
      else discover.push(c);
    }
    return { mineOrJoined, discover };
  }, [campaigns, user?.id]);

  return (
    <div className="umbral-campanhas">
      <div className="camp-container">
        
        {/* Header */}
        <header className="camp-header">
          <div>
            <h1 className="page-title">Campanhas</h1>
            <p className="page-subtitle">Crie, gerencie e participe de mesas na plataforma.</p>
          </div>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className={showCreateForm ? "btn-cancel" : "btn-new"}
          >
            {showCreateForm ? "Cancelar" : "+ Nova Campanha"}
          </button>
        </header>

        {/* Convites Pendentes */}
        {invitations.length > 0 && (
          <div className="invites-section">
            <h3 className="invites-title">📜 Convites Pendentes</h3>
            <div className="invite-grid">
              {invitations.map((inv) => (
                <div key={inv.id} className="invite-card">
                  <div className="invite-info">
                    <strong>{inv.campaign_name}</strong>
                    <span>Mestre: {inv.from_name}</span>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => handleInvitation(inv.id, "accept")} className="btn-small-success">
                      Aceitar
                    </button>
                    <button onClick={() => handleInvitation(inv.id, "reject")} className="btn-small-danger">
                      Recusar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Form Criar Campanha */}
        {showCreateForm && (
          <section className="create-panel">
            <h2 className="card-title">Criar nova aventura</h2>

            <form onSubmit={handleCreateCampaign}>
              <div className="form-group">
                <label className="form-label">Nome *</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="form-input"
                  autoFocus
                  placeholder="Ex: A Tumba da Aniquilação"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Descrição</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="form-textarea"
                  placeholder="Um breve resumo da sua aventura..."
                />
              </div>

              <div className="form-group">
                <label className="form-label">Compartilhamento</label>
                <div className="radio-group">
                  <label className="radio-item">
                    <input
                      type="radio"
                      name="accessType"
                      value="open"
                      checked={accessType === "open"}
                      onChange={(e) => setAccessType(e.target.value)}
                      className="radio-input"
                    />
                    <div>
                      <div className="radio-title">Aberta</div>
                      <div className="radio-desc">
                        A campanha aparece para todos e qualquer usuário pode entrar.
                      </div>
                    </div>
                  </label>

                  <label className="radio-item">
                    <input
                      type="radio"
                      name="accessType"
                      value="invite_only"
                      checked={accessType === "invite_only"}
                      onChange={(e) => setAccessType(e.target.value)}
                      className="radio-input"
                    />
                    <div>
                      <div className="radio-title">Somente convidados</div>
                      <div className="radio-desc">
                        Apenas usuários convidados pelo mestre conseguem entrar.
                      </div>
                    </div>
                  </label>

                  <label className="radio-item">
                    <input
                      type="radio"
                      name="accessType"
                      value="request_approval"
                      checked={accessType === "request_approval"}
                      onChange={(e) => setAccessType(e.target.value)}
                      className="radio-input"
                    />
                    <div>
                      <div className="radio-title">Por aprovação</div>
                      <div className="radio-desc">
                        A campanha aparece na lista, mas exige aprovação do mestre para entrar.
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button type="submit" disabled={loadingCreate} className="btn-create-submit">
                  {loadingCreate ? "Criando..." : "Criar Campanha"}
                </button>
              </div>
            </form>
          </section>
        )}

        {error && <div className="error-banner">{error}</div>}

        {/* Minhas Campanhas */}
        <section>
          <div className="section-header">
            <h2 className="section-title">Minhas Campanhas</h2>
            <span className="section-hint">Mesas onde você é mestre ou jogador.</span>
          </div>

          {loading ? (
            <div className="loading-state">Carregando pergaminhos...</div>
          ) : !derivedCampaigns.mineOrJoined || derivedCampaigns.mineOrJoined.length === 0 ? (
            <div className="empty-state">
              <h3>Nenhuma campanha por aqui</h3>
              <p>Crie uma nova, aceite convites ou entre em campanhas abertas.</p>
            </div>
          ) : (
            <div className="camp-grid">
              {derivedCampaigns.mineOrJoined.map((campaign) => {
                const owner = campaign.owner_id === user?.id || campaign.my_role === "master";
                const access = accessLabel(normalizeAccessType(campaign));

                return (
                  <div key={campaign.id} className="camp-card">
                    <div className="card-header">
                      <h3 className="camp-name">{campaign.name}</h3>
                      <span className="date-badge">{formatDate(campaign.created_at)}</span>
                    </div>

                    <div className="badges">
                      <span className="badge-pill" style={{ borderColor: access.color, color: access.color }}>
                        {access.text}
                      </span>
                      {owner ? (
                        <span className="badge-pill" style={{ borderColor: "#facc15", color: "#facc15" }}>👑 Mestre</span>
                      ) : (
                        <span className="badge-pill" style={{ borderColor: "#3b82f6", color: "#3b82f6" }}>🛡️ Jogador</span>
                      )}
                    </div>

                    <p className="camp-desc">{campaign.description || "Sem descrição..."}</p>

                    <div className="card-actions">
                      <button
                        type="button"
                        onClick={() => navigate(`/session/${campaign.id}`)}
                        className="btn-action"
                      >
                        {owner ? "MESTRAR" : "JOGAR"}
                      </button>

                      {owner && (
                        <button
                          onClick={(e) => handleDeleteCampaign(e, campaign.id)}
                          disabled={loadingDeleteId === campaign.id}
                          className="btn-delete"
                          title="Excluir campanha"
                        >
                          {loadingDeleteId === campaign.id ? "..." : "🗑️"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Explorar Campanhas */}
        <section>
          <div className="section-header">
            <h2 className="section-title">Explorar Campanhas</h2>
            <span className="section-hint">Mesas públicas e mesas com solicitação de entrada.</span>
          </div>

          {loading ? (
            <div className="loading-state">Carregando campanhas públicas...</div>
          ) : !derivedCampaigns.discover || derivedCampaigns.discover.length === 0 ? (
            <div className="loading-state">Nenhuma campanha disponível para explorar.</div>
          ) : (
            <div className="camp-grid">
              {derivedCampaigns.discover.map((campaign) => {
                const accessTypeNorm = normalizeAccessType(campaign);
                const access = accessLabel(accessTypeNorm);
                const reqStatus = joinRequestStatus(campaign);

                if (reqStatus === "rejected") return null;

                const isOpen = accessTypeNorm === "open";
                const isInviteOnly = accessTypeNorm === "invite_only";
                const isApproval = accessTypeNorm === "request_approval";
                const pending = reqStatus === "pending";

                return (
                  <div key={campaign.id} className="camp-card">
                    <div className="card-header">
                      <h3 className="camp-name">{campaign.name}</h3>
                      <span className="date-badge">{formatDate(campaign.created_at)}</span>
                    </div>

                    <div className="badges">
                      <span className="badge-pill" style={{ borderColor: access.color, color: access.color }}>
                        {access.text}
                      </span>
                      <span className="badge-pill" style={{ borderColor: "#94a3b8", color: "#94a3b8" }}>
                        🔎 Pública
                      </span>
                    </div>

                    <p className="camp-desc">{campaign.description || "Sem descrição..."}</p>

                    <div className="card-actions">
                      {isOpen && (
                        <button
                          type="button"
                          onClick={() => handleJoinOpenCampaign(campaign.id)}
                          className="btn-action"
                          disabled={joiningCampaignId === campaign.id}
                        >
                          {joiningCampaignId === campaign.id ? "ENTRANDO..." : "ENTRAR"}
                        </button>
                      )}

                      {isApproval && (
                        <button
                          type="button"
                          onClick={() => handleRequestJoin(campaign.id)}
                          className="btn-action"
                          disabled={pending || requestingCampaignId === campaign.id}
                          style={pending ? { opacity: 0.6, cursor: "not-allowed", filter: "grayscale(1)" } : {}}
                        >
                          {pending
                            ? "SOLICITAÇÃO ENVIADA"
                            : requestingCampaignId === campaign.id
                            ? "ENVIANDO..."
                            : "SOLICITAR ENTRADA"}
                        </button>
                      )}

                      {isInviteOnly && (
                        <button
                          type="button"
                          className="btn-action"
                          disabled
                          style={{ opacity: 0.5, cursor: "not-allowed" }}
                        >
                          SOMENTE CONVIDADOS
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

      </div>
    </div>
  );
}

export default Campanhas;
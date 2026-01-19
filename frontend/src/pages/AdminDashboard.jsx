import React, { useEffect, useMemo, useRef, useState } from "react";
import { fetchAdminMetrics, fetchPlansAdmin, fetchUsersAdmin, updateUserPlanAdmin } from "../services/adminService";
import "./AdminDashboard.css"; // <--- Importando visual Dark Fantasy

function formatSeconds(sec) {
  const s = Number(sec || 0);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${r}s`;
  return `${r}s`;
}

function normalizeUserLabel(u) {
  const name = u?.name || u?.username || u?.displayName || "";
  const email = u?.email || "";
  if (name && email) return `${name} <${email}>`;
  return email || name || String(u?.id || "");
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function ConfirmModal({ open, title, children, confirmText = "Confirmar", cancelText = "Cancelar", onConfirm, onCancel, busy }) {
  if (!open) return null;

  return (
    <div className="modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel?.(); }}>
      <div className="modal-box">
        <div className="modal-title">{title}</div>
        <div className="modal-body">{children}</div>
        <div className="modal-actions">
          <button onClick={onCancel} disabled={busy} className="btn-modal-cancel">
            {cancelText}
          </button>
          <button onClick={onConfirm} disabled={busy} className="btn-modal-confirm">
            {busy ? "Confirmando..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [plans, setPlans] = useState([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [plansError, setPlansError] = useState("");

  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState("");

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [totalUsers, setTotalUsers] = useState(null);

  const [filterPlan, setFilterPlan] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  useEffect(() => {
    setPage(1);
  }, [search, filterPlan, filterRole, filterStatus, pageSize]);

  const pageInfo = useMemo(() => {
    const count = users.length;
    const start = count === 0 ? 0 : (page - 1) * pageSize + 1;
    const end = (page - 1) * pageSize + count;
    const totalPages = totalUsers ? Math.max(1, Math.ceil(totalUsers / pageSize)) : null;
    const canPrev = page > 1;
    const canNext = totalPages ? page < totalPages : count === pageSize;
    return { start, end, totalPages, canPrev, canNext };
  }, [users.length, page, pageSize, totalUsers]);

  const filteredUsers = useMemo(() => {
    let list = Array.isArray(users) ? users : [];
    const q = String(search || "").trim().toLowerCase();
    if (q) {
      list = list.filter((u) => {
        const blob = `${u?.id || ""} ${u?.email || ""} ${u?.username || ""} ${u?.role || ""} ${u?.plan || ""}`.toLowerCase();
        return blob.includes(q);
      });
    }
    if (filterPlan) list = list.filter((u) => String(u?.plan || "").toUpperCase() === String(filterPlan).toUpperCase());
    if (filterRole) list = list.filter((u) => String(u?.role || "").toLowerCase() === String(filterRole).toLowerCase());
    if (filterStatus) list = list.filter((u) => String(u?.status || "").toLowerCase() === String(filterStatus).toLowerCase());
    return list;
  }, [users, search, filterPlan, filterRole, filterStatus]);

  const roleOptions = useMemo(() => {
    const s = new Set();
    for (const u of users || []) {
      if (u?.role) s.add(String(u.role));
    }
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [users]);

  const statusOptions = useMemo(() => {
    const s = new Set();
    for (const u of users || []) {
      if (u?.status) s.add(String(u.status));
    }
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [users]);

  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState("FREE");
  const [applyDefaults, setApplyDefaults] = useState(true);

  const [saveLoading, setSaveLoading] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [saveErr, setSaveErr] = useState("");

  const [confirmOpen, setConfirmOpen] = useState(false);
  const confirmPayloadRef = useRef(null);

  const originalPlan = useMemo(() => {
    if (!selectedUser) return "";
    return String(selectedUser.plan || "FREE").toUpperCase();
  }, [selectedUser]);

  const targetPlan = useMemo(() => String(selectedPlan || "FREE").toUpperCase(), [selectedPlan]);

  const saveDisabled = useMemo(() => {
    if (!selectedUser?.id) return true;
    return saveLoading || targetPlan === originalPlan;
  }, [selectedUser, targetPlan, originalPlan, saveLoading]);

  useEffect(() => {
    if (!saveMsg) return;
    const t = setTimeout(() => setSaveMsg(""), 5000);
    return () => clearTimeout(t);
  }, [saveMsg]);

  const cards = useMemo(() => {
    if (!data) return [];
    return [
      { label: "Usuarios cadastrados", value: data.totals?.users ?? 0 },
      { label: "Campanhas criadas", value: data.totals?.campaigns ?? 0 },
      { label: "Usuarios ativos (24h)", value: data.activity?.activeUsers24h ?? 0 },
      { label: "Sessoes registradas", value: data.activity?.totalSessions ?? 0 },
      { label: "Tempo medio por sessao", value: formatSeconds(data.activity?.avgSessionSeconds ?? 0) },
    ];
  }, [data]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const m = await fetchAdminMetrics();
        if (alive) setData(m);
      } catch (e) {
        setError(e?.response?.data?.message || "Falha ao carregar metricas.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setPlansLoading(true);
        setPlansError("");
        const p = await fetchPlansAdmin();
        if (alive) setPlans(p);
      } catch (e) {
        setPlansError(e?.response?.data?.message || "Falha ao carregar planos.");
      } finally {
        if (alive) setPlansLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    let alive = true;
    const t = setTimeout(async () => {
      try {
        setUsersLoading(true);
        setUsersError("");
        const resp = await fetchUsersAdmin({
          q: search,
          page,
          pageSize,
          limit: pageSize,
          plan: filterPlan || undefined,
          role: filterRole || undefined,
          status: filterStatus || undefined,
        });

        if (!alive) return;

        if (Array.isArray(resp)) {
          setUsers(resp);
          setTotalUsers(null);
        } else {
          const items = Array.isArray(resp?.items) ? resp.items : Array.isArray(resp?.users) ? resp.users : [];
          const total = typeof resp?.total === "number" ? resp.total : typeof resp?.count === "number" ? resp.count : null;
          setUsers(items);
          setTotalUsers(total);
          if (typeof resp?.page === "number") setPage(resp.page);
          if (typeof resp?.pageSize === "number") setPageSize(resp.pageSize);
        }
      } catch (e) {
        if (!alive) return;
        setUsers([]);
        setTotalUsers(null);
        setUsersError(e?.response?.data?.message || "Falha ao carregar usuarios.");
      } finally {
        if (alive) setUsersLoading(false);
      }
    }, 250);

    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [search, page, pageSize, filterPlan, filterRole, filterStatus]);

  useEffect(() => {
    if (!selectedUser) return;
    setSelectedPlan(String(selectedUser.plan || "FREE").toUpperCase());
    setSaveMsg("");
    setSaveErr("");
  }, [selectedUser]);

  function requestSavePlan() {
    if (!selectedUser?.id) return;
    if (saveDisabled) return;

    confirmPayloadRef.current = {
      user: selectedUser,
      fromPlan: originalPlan,
      toPlan: targetPlan,
      applyDefaults,
    };
    setConfirmOpen(true);
  }

  async function onConfirmSave() {
    const payload = confirmPayloadRef.current;
    if (!payload?.user?.id) return;

    setSaveErr("");
    setSaveMsg("");

    try {
      setSaveLoading(true);
      const resp = await updateUserPlanAdmin(payload.user.id, { plan: payload.toPlan, applyDefaults: payload.applyDefaults });
      const newPlan = String(resp?.user?.plan || payload.toPlan).toUpperCase();
      setSaveMsg(`Plano atualizado para ${newPlan}.`);

      setUsers((prev) =>
        (Array.isArray(prev) ? prev : []).map((u) => (String(u.id) === String(payload.user.id) ? { ...u, plan: newPlan } : u))
      );
      setSelectedUser((prev) => (prev ? { ...prev, plan: newPlan } : prev));
      setConfirmOpen(false);
      confirmPayloadRef.current = null;
    } catch (e) {
      setSaveErr(e?.response?.data?.message || "Falha ao atualizar plano.");
    } finally {
      setSaveLoading(false);
    }
  }

  const totalLabel = useMemo(() => {
    if (usersLoading) return "";
    if (totalUsers == null) {
      return pageInfo.start === 0 ? "" : `Exibindo ${pageInfo.start}-${pageInfo.end}`;
    }
    return totalUsers === 0 ? "" : `Exibindo ${pageInfo.start}-${pageInfo.end} de ${totalUsers}`;
  }, [usersLoading, totalUsers, pageInfo.start, pageInfo.end]);

  return (
    <div className="umbral-admin">
      <div className="admin-container">
        <header className="admin-header">
          <h1 className="page-title">Dashboard (Admin)</h1>
          <p className="page-desc">Métricas, usuários e gestão de planos da plataforma.</p>
        </header>

        {loading && <div style={{ marginBottom: 20 }}>Carregando métricas...</div>}
        {!loading && error && (
          <div className="msg-box msg-error">{error}</div>
        )}

        {!loading && !error && data && (
          <div className="metrics-grid">
            {cards.map((c) => (
              <div key={c.label} className="metric-card">
                <span className="metric-label">{c.label}</span>
                <span className="metric-value">{c.value}</span>
              </div>
            ))}
          </div>
        )}

        <div className="admin-panel">
          <h2 className="panel-title">Gestão de Usuários</h2>
          <p className="panel-desc">Selecione um usuário para alterar plano e permissões.</p>

          <div className="admin-split">
            {/* Lista de Usuários */}
            <div className="list-col">
              <div className="list-header">
                <span className="metric-label">Usuários Cadastrados</span>
                <span className="list-count">{totalLabel}</span>
              </div>

              <input
                className="search-input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por email, username, id..."
              />

              <div className="filters-row">
                <select className="filter-select" value={filterPlan} onChange={(e) => setFilterPlan(e.target.value)}>
                  <option value="">Plano: Todos</option>
                  {(plans.length ? plans : [{ key: "FREE" }, { key: "PREMIUM" }]).map((p) => (
                    <option key={p.key} value={p.key}>{p.key}</option>
                  ))}
                </select>
                <select className="filter-select" value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
                  <option value="">Role: Todos</option>
                  {roleOptions.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
                <select className="filter-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                  <option value="">Status: Todos</option>
                  {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="actions-row">
                <div style={{ flex: 1 }}></div>
                <button className="btn-text" onClick={() => { setSearch(""); setFilterPlan(""); setFilterRole(""); setFilterStatus(""); }}>Limpar</button>
                <select className="page-select" value={pageSize} onChange={(e) => setPageSize(clamp(Number(e.target.value || 50), 10, 200))}>
                  <option value="20">20/pag</option>
                  <option value="50">50/pag</option>
                  <option value="100">100/pag</option>
                </select>
              </div>

              {usersLoading && <div>Carregando lista...</div>}
              {!usersLoading && usersError && <div className="msg-box msg-error">{usersError}</div>}

              {!usersLoading && !usersError && (
                <div className="user-list">
                  {filteredUsers.length === 0 && <div className="empty-msg">Nenhum usuário encontrado.</div>}
                  {filteredUsers.map((u) => {
                    const active = selectedUser && String(selectedUser.id) === String(u.id);
                    return (
                      <div
                        key={u.id || Math.random()}
                        className={`user-item ${active ? "active" : ""}`}
                        onClick={() => setSelectedUser(u)}
                      >
                        <div className="user-label">{normalizeUserLabel(u)}</div>
                        <div className="user-meta">
                          <span>{String(u.plan || "FREE").toUpperCase()}</span>
                          <span>• {String(u.role || "-")}</span>
                          {u.status && <span>• {u.status}</span>}
                        </div>
                        <div className="user-id">ID: {u.id}</div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="pagination">
                <button className="btn-page" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={!pageInfo.canPrev || usersLoading}>Anterior</button>
                <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>Pag {page} {pageInfo.totalPages ? `/ ${pageInfo.totalPages}` : ""}</span>
                <button className="btn-page" onClick={() => setPage(p => p + 1)} disabled={!pageInfo.canNext || usersLoading}>Próxima</button>
              </div>
            </div>

            {/* Coluna de Edição */}
            <div className="edit-col">
              <div className="edit-title">Editar Plano</div>

              {!selectedUser ? (
                <div className="empty-msg">Selecione um usuário na lista para editar.</div>
              ) : (
                <>
                  <div className="edit-grid">
                    <div className="field-group">
                      <label className="field-label">Plano</label>
                      <select className="field-select" value={selectedPlan} onChange={(e) => setSelectedPlan(e.target.value)}>
                        {plansLoading && <option>Carregando...</option>}
                        {!plansLoading && (plans.length ? plans : [{ key: "FREE", name: "Freemium" }, { key: "PREMIUM", name: "Premium" }]).map(p => (
                          <option key={p.key} value={p.key}>{p.key} - {p.name || p.key}</option>
                        ))}
                      </select>
                      {plansError && <div className="msg-box msg-error">{plansError}</div>}
                    </div>

                    <div className="field-group">
                      <label className="field-label">Limites</label>
                      <label className="checkbox-label">
                        <input type="checkbox" checked={applyDefaults} onChange={(e) => setApplyDefaults(e.target.checked)} />
                        Aplicar limites padrão
                      </label>
                      <div className="checkbox-hint">Atualiza `user_limits` com os padrões do plano selecionado.</div>
                    </div>
                  </div>

                  <button className="btn-save" onClick={requestSavePlan} disabled={saveDisabled}>
                    {saveLoading ? "Salvando..." : "Salvar Alterações"}
                  </button>

                  {saveMsg && <div className="msg-box msg-success">{saveMsg}</div>}
                  {saveErr && <div className="msg-box msg-error">{saveErr}</div>}

                  <div className="user-details">
                    <div className="detail-row"><span>Email</span> <span>{selectedUser.email}</span></div>
                    <div className="detail-row"><span>Username</span> <span>{selectedUser.username || "-"}</span></div>
                    <div className="detail-row"><span>Role</span> <span>{selectedUser.role || "-"}</span></div>
                    <div className="detail-row"><span>Status</span> <span>{selectedUser.status || "-"}</span></div>
                    <div className="detail-row"><span>Plano Atual</span> <span>{originalPlan}</span></div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal
        open={confirmOpen}
        title="Confirmar Alteração"
        confirmText="Salvar"
        cancelText="Cancelar"
        busy={saveLoading}
        onCancel={() => { setConfirmOpen(false); confirmPayloadRef.current = null; }}
        onConfirm={onConfirmSave}
      >
        {confirmPayloadRef.current?.user && (
          <div>
            <p>Você está alterando o plano de <b>{normalizeUserLabel(confirmPayloadRef.current.user)}</b>.</p>
            <ul style={{ paddingLeft: 20, margin: '10px 0' }}>
              <li>De: <b>{confirmPayloadRef.current.fromPlan}</b></li>
              <li>Para: <b>{confirmPayloadRef.current.toPlan}</b></li>
              <li>Aplicar limites padrão: <b>{confirmPayloadRef.current.applyDefaults ? "Sim" : "Não"}</b></li>
            </ul>
          </div>
        )}
      </ConfirmModal>
    </div>
  );
}
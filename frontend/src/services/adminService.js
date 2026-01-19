// frontend/src/services/adminService.js
import { api } from "../services/api";

/**
 * Admin metrics
 */
export async function fetchAdminMetrics() {
  const { data } = await api.get("/api/admin/metrics");
  if (!data.generatedAt) data.generatedAt = new Date().toISOString();
  return data;
}

/**
 * Admin users list/search (supports pagination + structured filters)
 *
 * Backend (ideal):
 *   GET /api/admin/users?q=&page=&pageSize=&plan=&role=&status=
 *   -> { items: User[], total: number, page: number, pageSize: number }
 *
 * Backward compatible:
 *   - returns User[]
 *   - or { users: User[] }
 */
export async function fetchUsersAdmin({
  q = "",
  page,
  pageSize,
  limit,
  plan,
  role,
  status,
} = {}) {
  const params = {};

  const query = String(q || "").trim();
  if (query) params.q = query;

  const p = Number(page);
  if (Number.isFinite(p) && p > 0) params.page = p;

  const ps = Number(pageSize);
  if (Number.isFinite(ps) && ps > 0) params.pageSize = Math.min(ps, 200);

  // compat: alguns backends usam apenas limit
  const lim = Number(limit);
  if (Number.isFinite(lim) && lim > 0) params.limit = Math.min(lim, 200);

  const pl = String(plan || "").trim();
  if (pl) params.plan = pl;

  const rl = String(role || "").trim();
  if (rl) params.role = rl;

  const st = String(status || "").trim();
  if (st) params.status = st;

  const { data } = await api.get("/api/admin/users", { params });

  // Compat: array
  if (Array.isArray(data)) return data;

  // Compat: { users: [...] }
  if (Array.isArray(data?.users)) return data.users;

  // Paginação: { items, total, page, pageSize }
  if (Array.isArray(data?.items)) {
    return {
      items: data.items,
      total: data?.total,
      page: data?.page,
      pageSize: data?.pageSize,
    };
  }

  return [];
}

/**
 * Admin plans
 * GET /api/admin/plans
 */
export async function fetchPlansAdmin() {
  const { data } = await api.get("/api/admin/plans");
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.plans)) return data.plans;
  return [];
}

/**
 * Admin update user plan
 * PUT /api/admin/users/:id/plan
 */
export async function updateUserPlanAdmin(userId, { plan, applyDefaults = true } = {}) {
  if (!userId) throw new Error("userId é obrigatório.");
  const payload = { plan, applyDefaults };
  const { data } = await api.put(`/api/admin/users/${userId}/plan`, payload);
  return data;
}

/**
 * Admin audit log (per user)
 * Prefer:
 *   GET /api/admin/users/:id/audit?limit=50
 * Fallback:
 *   GET /api/admin/audit?entityType=user&entityId=:id&limit=50
 *
 * Returns an array (most convenient for the UI).
 */
export async function fetchUserAuditAdmin(userId, { limit = 50 } = {}) {
  if (!userId) throw new Error("userId é obrigatório.");

  const lim = Number(limit);
  const params = {};
  if (Number.isFinite(lim) && lim > 0) params.limit = Math.min(lim, 200);

  // Tenta endpoint específico
  try {
    const { data } = await api.get(`/api/admin/users/${userId}/audit`, { params });
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.items)) return data.items;
    if (Array.isArray(data?.logs)) return data.logs;
    return [];
  } catch (e) {
    // fallback para endpoint genérico
    const { data } = await api.get("/api/admin/audit", {
      params: { ...params, entityType: "user", entityId: userId },
    });
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.items)) return data.items;
    if (Array.isArray(data?.logs)) return data.logs;
    return [];
  }
}

/**
 * (Compat) Import de campanha via Admin UI
 * POST /campaigns/import
 *
 * Observação: esta rota NÃO é /api/admin/... e sim /campaigns/import,
 * porque o backend monta campaigns em app.use("/campaigns", ...)
 */
export async function importCampaignAdmin(importPayload) {
  if (!importPayload || typeof importPayload !== "object") {
    throw new Error("Payload de import inválido.");
  }
  const { data } = await api.post("/campaigns/import", importPayload, {
    headers: { "Content-Type": "application/json" },
  });
  return data;
}

// frontend/src/services/activityService.js
import axios from "axios";

const RAW_BASE =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "";

function stripTrailingApi(url) {
  try {
    const u = new URL(url || "", window.location.origin);
    // Always target the same origin; keep only origin (no path) for API base derivation
    // but allow deployments where RAW_BASE is like https://host/api
    let path = (u.pathname || "").replace(/\/+$/, "");
    if (path.endsWith("/api")) path = path.slice(0, -4);
    // API lives under /api
    return u.origin + (path || "");
  } catch {
    return String(url || "")
      .replace(/\/+$/, "")
      .replace(/\/api$/, "");
  }
}

// Normalize so we never end up with /api/api
const BASE = stripTrailingApi(RAW_BASE || window.location.origin);
const API_BASE = `${BASE}/api`;

function authHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function pingActivity() {
  const url = `${API_BASE}/admin/activity/ping`;
  await axios.post(url, {}, { headers: { ...authHeaders() } });
}

export async function startSession() {
  const url = `${API_BASE}/admin/activity/session/start`;
  const { data } = await axios.post(url, {}, { headers: { ...authHeaders() } });
  return data?.sessionId;
}

export async function endSession(sessionId) {
  const url = `${API_BASE}/admin/activity/session/end`;
  await axios.post(url, { sessionId }, { headers: { ...authHeaders() } });
}

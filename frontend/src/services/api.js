import axios from "axios";

/**
 * UmbraTable - Axios API client
 *
 * Objetivos:
 * - Garantir baseURL correta em produção/homolog
 * - Injetar Authorization: Bearer <token> em TODAS as requisições via instância `api`
 * - Evitar "loop de login": NÃO limpar token/redirecionar em qualquer 401,
 *   apenas em endpoints de sessão (me/profile/refresh).
 * - Evitar erro de rota por URL duplicada: /api/api/...
 */

export const AUTH_TOKEN_KEY = "token";

function stripTrailingSlashes(v) {
  return String(v || "").replace(/\/+$/, "");
}

function resolveBaseURL() {
  const env = stripTrailingSlashes(
    (import.meta.env.VITE_API_BASE_URL ||
      import.meta.env.VITE_API_URL ||
      "").trim()
  );

  if (env) return env;

  // Produção: nunca deixe vazio, senão o browser chama o host do APP
  // Se seu backend fica no mesmo domínio do app com prefixo /api, prefira setar VITE_API_URL.
  if (import.meta.env.PROD) return "https://api.umbratable.com.br";

  // Dev: vazio permite usar proxy do Vite ("/auth", "/campaigns"...)
  return "";
}

export const api = axios.create({
  baseURL: resolveBaseURL(),
  timeout: 15000,
});

export function getAuthToken() {
  return (
    localStorage.getItem(AUTH_TOKEN_KEY) ||
    sessionStorage.getItem(AUTH_TOKEN_KEY) ||
    localStorage.getItem("authToken") ||
    sessionStorage.getItem("authToken") ||
    localStorage.getItem("accessToken") ||
    sessionStorage.getItem("accessToken")
  );
}

export function setAuthToken(token) {
  if (token) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    delete api.defaults.headers.common.Authorization;
  }
}

export function clearAuth() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem("authToken");
  localStorage.removeItem("accessToken");
  localStorage.removeItem("user_data");

  sessionStorage.removeItem(AUTH_TOKEN_KEY);
  sessionStorage.removeItem("authToken");
  sessionStorage.removeItem("accessToken");

  delete api.defaults.headers.common.Authorization;
}

function safeDispatch(name, detail) {
  try {
    window.dispatchEvent(new CustomEvent(name, { detail }));
  } catch {
    // noop
  }
}

/**
 * Normaliza a URL para evitar /api duplicado.
 * Regras:
 * - Colapsa "/api/api/" -> "/api/"
 * - Se baseURL termina com "/api" e url começa com "/api/", remove o "/api" do início da url.
 * - Se baseURL NÃO termina com "/api" e url não começa com "/api/", prefixa "/api".
 *
 * Isso permite que services inconsistentes continuem funcionando sem 404.
 */
function normalizeApiPath(config) {
  const base = stripTrailingSlashes(config.baseURL || api.defaults.baseURL || "");
  let url = String(config.url || "");

  // Não mexer em URLs absolutas passadas diretamente
  if (/^https?:\/\//i.test(url)) return config;

  // Garantir que url comece com "/"
  if (url && !url.startsWith("/")) url = `/${url}`;

  // Colapsar repetições "/api/api/"
  url = url.replace(/\/api\/api(\/|$)/g, "/api$1");

  const baseEndsWithApi = /\/api$/i.test(base);
  const urlStartsWithApi = /^\/api(\/|$)/i.test(url);

  // Se base já tem /api, não deixe a url também começar com /api
  if (baseEndsWithApi && urlStartsWithApi) {
    url = url.replace(/^\/api(\/|$)/i, "/$1").replace(/\/{2,}/g, "/");
  }

  // Se base não tem /api, mas a url não começa com /api, prefixa /api
  // (mantém compatibilidade com backend montado em app.use("/api", ...))
  if (!baseEndsWithApi && url && !urlStartsWithApi) {
    url = `/api${url}`;
  }

  config.baseURL = base; // já sem barra final
  config.url = url;
  return config;
}

// Request: injeta Bearer + x-access-token, mata cache e normaliza path
api.interceptors.request.use((config) => {
  config = normalizeApiPath(config);

  const token = getAuthToken();
  config.headers = config.headers || {};

  // Mata o cache do navegador/Cloudflare enviando timestamp na URL
  if (config.method === "get") {
    config.params = config.params || {};
    config.params._t = Date.now();
  }

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
    config.headers["x-access-token"] = token;
  } else {
    delete config.headers.Authorization;
    delete config.headers["x-access-token"];
    delete api.defaults.headers.common.Authorization;
  }

  return config;
});

let handledSession401 = false;

// Response: só derruba sessão em endpoints de sessão
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;
    const url = String(err?.config?.url || "");

    const sessionPaths = [
      "/users/me",
      "/users/me/profile",
      "/auth/me",
      "/auth/refresh",
    ];
    const isSessionEndpoint = sessionPaths.some((p) => url.includes(p));

    if (status === 401 && isSessionEndpoint) {
      if (!handledSession401) {
        handledSession401 = true;
        clearAuth();
        safeDispatch("auth:unauthorized", { url, status });
      }
    }

    return Promise.reject(err);
  }
);

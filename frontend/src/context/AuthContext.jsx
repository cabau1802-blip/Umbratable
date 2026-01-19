import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
// Certifique-se que clearAuth remove o header do axios em '../services/api'
import { api, setAuthToken, clearAuth, getAuthToken } from "../services/api";

const AuthContext = createContext(null);

function readStoredAuth() {
  try {
    const token = getAuthToken();
    const savedUser = localStorage.getItem("user_data");
    const user = savedUser ? JSON.parse(savedUser) : null;
    return { token, user };
  } catch {
    return { token: null, user: null };
  }
}

export function AuthProvider({ children }) {
  const initial = readStoredAuth();

  const [token, setToken] = useState(initial.token);
  const [user, setUser] = useState(initial.user);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const hardLogout = useCallback(() => {
    clearAuth(); // Limpa localStorage e Header do Axios
    setToken(null);
    setUser(null);
    setProfile(null);
    localStorage.removeItem("user_data"); // Garante limpeza total
  }, []);

  const refreshProfile = useCallback(async () => {
    try {
      const tokenNow = getAuthToken();
      if (!tokenNow) return null;
      
      // Garante que o header está setado antes de chamar
      setAuthToken(tokenNow);

      const res = await api.get("/users/me/profile");
      const p = res.data?.profile ?? res.data ?? null;
      setProfile(p);
      return p;
    } catch (err) {
      console.warn("Falha ao carregar profile:", err?.response?.status);
      return null;
    }
  }, []);

  // --- ADICIONE ESTA FUNÇÃO ---
  const updateProfile = useCallback(async (data) => {
    try {
      // Envia os dados atualizados para a API
      const res = await api.put("/users/me/profile", data);
      
      // Pega o perfil atualizado da resposta e salva no estado local
      const updatedProfile = res.data?.profile ?? res.data ?? null;
      
      if (updatedProfile) {
        setProfile(updatedProfile);
        // Atualiza também no localStorage para persistir se o usuário der F5
        const currentStored = JSON.parse(localStorage.getItem("user_data") || "{}");
        localStorage.setItem("user_data", JSON.stringify({ ...currentStored, ...updatedProfile }));
      }
      
      return updatedProfile;
    } catch (err) {
      console.error("Erro no updateProfile:", err);
      throw err; // Repassa o erro para o componente exibir o Toast
    }
  }, []);
  // -----------------------------

  const login = useCallback(async (emailOrUsername, password) => {
    // CORREÇÃO CRÍTICA:
    // Remove qualquer token antigo do header para não confundir o backend
    // achando que é uma tentativa de acesso com token inválido.
    clearAuth(); 
    
    // Compatibilidade: alguns backends esperam "email" ou "username".
    // Enviamos os 3 campos para evitar 500 por acesso a undefined no controller.
    const payload = {
      emailOrUsername,
      email: emailOrUsername,
      username: emailOrUsername,
      password,
    };

    let res;
    try {
      res = await api.post("/auth/login", payload);
    } catch (err) {
      const status = err?.response?.status;
      const msg = err?.response?.data?.message || err?.response?.data?.error || err?.message || "Falha no login";
      // Repropaga com mensagem mais útil para a UI.
      const e = new Error(msg);
      e.status = status;
      throw e;
    }

    const receivedToken = res?.data?.token || res?.data?.accessToken || null;
    const receivedUser = res?.data?.user || res?.data?.data?.user || null;

    if (!receivedToken) throw new Error("Token não retornado no login");

    setAuthToken(receivedToken);
    setToken(receivedToken);

    if (receivedUser) {
      setUser(receivedUser);
      localStorage.setItem("user_data", JSON.stringify(receivedUser));
    }

    await refreshProfile();
    return true;
  }, [refreshProfile]);

  const register = useCallback(async (payload) => {
    // CORREÇÃO CRÍTICA: Mesma coisa aqui. Registro deve ser limpo.
    clearAuth();

    let res;
    try {
      res = await api.post("/auth/register", payload);
    } catch (err) {
      const status = err?.response?.status;
      const msg = err?.response?.data?.message || err?.response?.data?.error || err?.message || "Falha no registro";
      const e = new Error(msg);
      e.status = status;
      throw e;
    }

    const receivedToken = res?.data?.token || res?.data?.accessToken || null;
    const receivedUser = res?.data?.user || res?.data?.data?.user || null;

    if (!receivedToken) throw new Error("Token não retornado no registro");

    setAuthToken(receivedToken);
    setToken(receivedToken);

    if (receivedUser) {
      setUser(receivedUser);
      localStorage.setItem("user_data", JSON.stringify(receivedUser));
    }

    await refreshProfile();
    return true;
  }, [refreshProfile]);

  const logout = useCallback(() => {
    hardLogout();
    if (window.location.pathname !== "/login") window.location.href = "/login";
  }, [hardLogout]);

  // Boot
  useEffect(() => {
    const tokenNow = getAuthToken();
    if (tokenNow) {
      setAuthToken(tokenNow);
      setToken(tokenNow);
      refreshProfile().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [refreshProfile]);

  // Interceptor Listener
  useEffect(() => {
    const onUnauthorized = () => {
      hardLogout();
      // Evita loop de redirect se já estiver na tela de login
      if (window.location.pathname !== "/login" && window.location.pathname !== "/register") {
         window.location.href = "/login";
      }
    };
    window.addEventListener("auth:unauthorized", onUnauthorized);
    return () => window.removeEventListener("auth:unauthorized", onUnauthorized);
  }, [hardLogout]);

  const isAuthenticated = useMemo(() => !!token, [token]);

  const value = useMemo(
    () => ({
      isAuthenticated,
      token,
      user,
      profile,
      loading,
      login,
      register,
      logout,
      refreshProfile,
      setProfile,
      updateProfile,
    }),
    [isAuthenticated, token, user, profile, loading, login, register, logout, refreshProfile, updateProfile,]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";

import bannerImg from "../assets/banner.png";
import logoImg from "../assets/logo.png";

// (mantive seu CSS e layout; apenas corrigi o fluxo de login)
const CSS_STYLES = `
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }

  html, body, #root {
    margin: 0; padding: 0; height: 100%; width: 100%; overflow: hidden;
  }

  .glass-card {
    background: rgba(15, 23, 42, 0.75);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.9);
    animation: fadeInUp 0.8s ease-out;
  }

  .input-field:focus {
    border-color: #facc15;
    box-shadow: 0 0 0 2px rgba(250, 204, 21, 0.25);
    outline: none;
  }

  .btn-primary {
    background: linear-gradient(135deg, #f59e0b, #d97706);
    transition: transform 0.15s ease, filter 0.15s ease;
  }

  .btn-primary:hover {
    filter: brightness(1.05);
    transform: translateY(-1px);
  }
`;

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resetMessage, setResetMessage] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setResetMessage("");

    if (!emailOrUsername || !password) {
      setError("Preencha todos os campos.");
      return;
    }

    try {
      setLoading(true);

      // AuthContext é o dono do token
      await login(emailOrUsername, password);

      navigate("/home", { replace: true });
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.message || "Erro ao fazer login.");
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    if (!emailOrUsername) {
      setError("Preencha seu e-mail/usuário primeiro.");
      return;
    }

    try {
      setLoading(true);
      await api.post("/auth/forgot-password", { emailOrUsername });
      setResetMessage("Se o usuário existir, enviamos instruções para redefinir a senha.");
    } catch (err) {
      console.error(err);
      setError("Não foi possível solicitar redefinição. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <style>{CSS_STYLES}</style>

      <div
        style={{
          height: "100vh",
          width: "100vw",
          backgroundImage: `url(${bannerImg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
        }}
      >
        <div
          className="glass-card"
          style={{
            width: "100%",
            maxWidth: 420,
            borderRadius: 18,
            padding: 28,
            color: "#fff",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: 18 }}>
            <img src={logoImg} alt="UmbraTable" style={{ width: 84, height: 84 }} />
            <h1 style={{ margin: "12px 0 4px", fontSize: 34, fontWeight: 800, color: "#facc15" }}>
              UmbraTable
            </h1>
            <div style={{ opacity: 0.85 }}>Bem-vindo de volta, aventureiro.</div>
          </div>

          {error && (
            <div style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.35)", padding: 10, borderRadius: 10, marginBottom: 12 }}>
              {error}
            </div>
          )}
          {resetMessage && (
            <div style={{ background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.35)", padding: 10, borderRadius: 10, marginBottom: 12 }}>
              {resetMessage}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, letterSpacing: 1, opacity: 0.85, marginBottom: 8 }}>
                USUÁRIO OU E-MAIL
              </div>
              <input
                className="input-field"
                value={emailOrUsername}
                onChange={(e) => setEmailOrUsername(e.target.value)}
                placeholder="Digite seu login..."
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.18)",
                  background: "rgba(2,6,23,0.35)",
                  color: "#fff",
                }}
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 12, letterSpacing: 1, opacity: 0.85, marginBottom: 8 }}>
                  SENHA
                </div>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#93c5fd",
                    cursor: "pointer",
                    marginBottom: 8,
                  }}
                >
                  Esqueceu?
                </button>
              </div>

              <input
                className="input-field"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.18)",
                  background: "rgba(2,6,23,0.35)",
                  color: "#fff",
                }}
              />
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: 14,
                border: "none",
                cursor: "pointer",
                fontWeight: 800,
                fontSize: 16,
                color: "#111827",
                marginTop: 10,
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? "ENTRANDO..." : "ENTRAR"}
            </button>
          </form>

          <div style={{ marginTop: 18, textAlign: "center", opacity: 0.85 }}>
            Ainda não tem ficha?{" "}
            <a href="/register" style={{ color: "#facc15", fontWeight: 700 }}>
              Criar Conta
            </a>
          </div>
        </div>
      </div>
    </>
  );
}

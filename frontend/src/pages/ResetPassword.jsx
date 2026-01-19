import React, { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {api} from "../services/api"; // Importa a configuração correta do Axios

// Imagens
import bannerImg from "../assets/banner.png"; 
import logoImg from "../assets/logo.png";

const CSS_STYLES = `
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
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

  .btn-primary:hover { filter: brightness(1.2); transform: scale(1.02); }
  .btn-primary:active { transform: scale(0.98); }
`;

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Pega o token da URL
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!token) return setError("Token inválido ou ausente.");
    if (password.length < 6) return setError("A senha deve ter no mínimo 6 caracteres.");
    if (password !== confirmPassword) return setError("As senhas não coincidem.");

    try {
      setLoading(true);
      
      // Chama a rota /auth/reset-password usando a baseURL configurada no api.js
      await api.post("/auth/reset-password", { token, password });
      
      setMessage("Senha redefinida com sucesso! Redirecionando...");
      setTimeout(() => navigate("/"), 3000);

    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.message || "Erro ao redefinir a senha. Tente solicitar novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
        position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: `url('${bannerImg}') no-repeat center center`,
        backgroundSize: "cover", color: "#e2e8f0", fontFamily: "'Inter', sans-serif"
    }}>
      <style>{CSS_STYLES}</style>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.8) 100%)", zIndex: 0 }} />

      <div className="glass-card" style={{ position: "relative", zIndex: 10, width: "90%", maxWidth: "420px", padding: "3rem 2.5rem", borderRadius: "1.5rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        
        <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <img src={logoImg} alt="Logo" style={{ width: "120px", height: "auto", marginBottom: "1rem", filter: "drop-shadow(0 0 15px rgba(250, 204, 21, 0.6))" }} />
          <h2 style={{ fontSize: "1.8rem", fontWeight: "700", color: "#facc15", margin: 0, fontFamily: '"Cinzel", serif' }}>
            Nova Senha
          </h2>
          <p style={{ color: "#94a3b8", fontSize: "0.9rem", marginTop: "0.5rem" }}>Defina sua nova senha.</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
          
          <div>
            <label style={{ fontSize: "0.75rem", fontWeight: "700", color: "#94a3b8", marginLeft: "4px", textTransform: "uppercase" }}>Nova Senha</label>
            <input 
              type="password" 
              className="input-field" 
              value={password} 
              onChange={e=>setPassword(e.target.value)} 
              disabled={loading}
              placeholder="********"
              style={{ width: "100%", padding: "1rem", marginTop: "0.5rem", background: "rgba(0, 0, 0, 0.4)", border: "1px solid #475569", borderRadius: "0.75rem", color: "#fff", fontSize: "1rem", boxSizing: "border-box" }} 
            />
          </div>

          <div>
            <label style={{ fontSize: "0.75rem", fontWeight: "700", color: "#94a3b8", marginLeft: "4px", textTransform: "uppercase" }}>Confirmar Senha</label>
            <input 
              type="password" 
              className="input-field" 
              value={confirmPassword} 
              onChange={e=>setConfirmPassword(e.target.value)} 
              disabled={loading}
              placeholder="********"
              style={{ width: "100%", padding: "1rem", marginTop: "0.5rem", background: "rgba(0, 0, 0, 0.4)", border: "1px solid #475569", borderRadius: "0.75rem", color: "#fff", fontSize: "1rem", boxSizing: "border-box" }} 
            />
          </div>

          {error && <div style={{ padding: "0.8rem", background: "rgba(220, 38, 38, 0.25)", border: "1px solid rgba(220, 38, 38, 0.5)", borderRadius: "0.5rem", color: "#fca5a5", fontSize: "0.9rem", textAlign: 'center' }}>⚠️ {error}</div>}
          {message && <div style={{ padding: "0.8rem", background: "rgba(22, 163, 74, 0.25)", border: "1px solid rgba(22, 163, 74, 0.5)", borderRadius: "0.5rem", color: "#86efac", fontSize: "0.9rem", textAlign: 'center' }}>✅ {message}</div>}

          <button type="submit" disabled={loading} className="btn-primary" style={{ width: "100%", padding: "1rem", borderRadius: "0.75rem", border: "none", background: "linear-gradient(135deg, #d97706 0%, #b45309 100%)", color: "#fff", fontSize: "1.1rem", fontWeight: "800", cursor: loading?"wait":"pointer", opacity: loading?0.7:1, transition: "0.3s", textTransform: "uppercase", letterSpacing: "1px", marginTop: "0.5rem" }}>
            {loading ? "Salvando..." : "DEFINIR SENHA"}
          </button>
        </form>
      </div>
    </div>
  );
}
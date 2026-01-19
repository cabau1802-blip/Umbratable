import { useState } from "react";
import { useAuth } from "../context/AuthContext";

// Importando as imagens locais (mesmas do Login)
import bannerImg from "../assets/banner.png";
import logoImg from "../assets/logo.png";

const CSS_STYLES = `
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }

  /* Reset para garantir tela cheia */
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
    border-color: #22c55e; /* Verde para cadastro */
    box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.25);
    outline: none;
  }

  .btn-register:hover { 
    filter: brightness(1.2); 
    transform: scale(1.02);
  }
  .btn-register:active { 
    transform: scale(0.98); 
  }
  
  .link-btn:hover { color: #facc15; text-decoration: underline; }
`;

export default function Register({ onToggleMode }) {
  const { register } = useAuth();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    const usernameTrim = username.trim();
    const emailTrim = email.trim();

    if (!usernameTrim || !emailTrim || !password || !confirmPass) {
      return setError("Preencha todos os campos da ficha.");
    }
    if (password !== confirmPass) {
      return setError("As senhas não coincidem.");
    }
    if (password.length < 6) {
        return setError("A senha deve ter pelo menos 6 caracteres.");
    }

    try {
      setLoading(true);
      // AuthContext.register espera um objeto (payload). Se enviar múltiplos argumentos,
      // somente o 1º chega no backend e o registro falha com 400 "Preencha todos os campos".
      // Enviamos múltiplas chaves para compatibilidade com diferentes contratos de API.
      const payload = {
        username: usernameTrim,
        name: usernameTrim,
        email: emailTrim,
        password,
        confirmPassword: confirmPass,
        passwordConfirmation: confirmPass,
      };

      await register(payload);
      setSuccess(true);
      setTimeout(() => onToggleMode(), 2000); // Redireciona após 2s
    } catch (err) {
      console.error(err);
      // AuthContext lança Error(msg). Então a mensagem útil fica em err.message.
      setError(err?.message || "Erro ao criar conta.");
      setLoading(false);
    }
  }

  return (
    <div style={{
        position: "fixed",
        top: 0, left: 0, right: 0, bottom: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: `url('${bannerImg}') no-repeat center center`,
        backgroundSize: "cover",
        color: "#e2e8f0", fontFamily: "'Inter', sans-serif"
    }}>
      <style>{CSS_STYLES}</style>

      {/* Overlay Escuro */}
      <div style={{
          position: "absolute", inset: 0, 
          background: "radial-gradient(circle, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.85) 100%)",
          zIndex: 0
      }} />

      <div className="glass-card" style={{ 
          position: "relative", zIndex: 10,
          width: "90%", maxWidth: "450px", 
          padding: "2.5rem 2.5rem", borderRadius: "1.5rem", 
          display: "flex", flexDirection: "column", gap: "1.2rem" 
      }}>
        
        {/* LOGO E TÍTULO */}
        <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <img 
            src={logoImg} 
            alt="Logo" 
            style={{ 
                width: "120px", height: "auto", marginBottom: "0.5rem", 
                filter: "drop-shadow(0 0 15px rgba(250, 204, 21, 0.4))"
            }} 
          />
          <h1 style={{ fontSize: "1.8rem", fontWeight: "700", color: "#fff", margin: 0, fontFamily: '"Cinzel", serif', letterSpacing: "2px" }}>
            NOVA FICHA
          </h1>
          <p style={{ color: "#94a3b8", fontSize: "0.9rem", marginTop: "0.3rem" }}>
            Junte-se à mesa, aventureiro.
          </p>
        </div>

        {success ? (
            <div style={{textAlign:'center', padding: "2rem 0"}}>
                <div style={{fontSize: 50, marginBottom: 15, filter: "drop-shadow(0 0 10px #22c55e)"}}>✅</div>
                <h3 style={{color: '#86efac', margin: 0, fontSize: "1.5rem"}}>Conta Criada!</h3>
                <p style={{color: "#cbd5e1", marginTop: "0.5rem"}}>Preparando seu grimório...</p>
            </div>
        ) : (
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            
            {/* NOME DE USUÁRIO */}
            <div>
                <label style={{ fontSize: "0.75rem", fontWeight: "700", color: "#94a3b8", marginLeft: "4px", textTransform: "uppercase", letterSpacing: "1px" }}>
                  Nome do Herói (Usuário)
                </label>
                <input type="text" className="input-field" value={username} onChange={e=>setUsername(e.target.value)} disabled={loading} placeholder="Ex: Aragon"
                autoComplete="username"
                style={{ width: "100%", padding: "0.9rem", marginTop: "0.3rem", background: "rgba(0, 0, 0, 0.4)", border: "1px solid #475569", borderRadius: "0.75rem", color: "#fff", fontSize: "1rem", boxSizing: "border-box", transition: "0.2s" }} 
                />
            </div>

            {/* EMAIL */}
            <div>
                <label style={{ fontSize: "0.75rem", fontWeight: "700", color: "#94a3b8", marginLeft: "4px", textTransform: "uppercase", letterSpacing: "1px" }}>
                  E-mail
                </label>
                <input type="email" className="input-field" value={email} onChange={e=>setEmail(e.target.value)} disabled={loading} placeholder="exemplo@rpg.com"
                autoComplete="email"
                style={{ width: "100%", padding: "0.9rem", marginTop: "0.3rem", background: "rgba(0, 0, 0, 0.4)", border: "1px solid #475569", borderRadius: "0.75rem", color: "#fff", fontSize: "1rem", boxSizing: "border-box", transition: "0.2s" }} 
                />
            </div>

            {/* SENHAS (Lado a Lado) */}
            <div style={{display:'flex', gap: 12, flexWrap: 'wrap'}}>
                <div style={{flex:1, minWidth: '140px'}}>
                    <label style={{ fontSize: "0.75rem", fontWeight: "700", color: "#94a3b8", marginLeft: "4px", textTransform: "uppercase", letterSpacing: "1px" }}>Senha</label>
                    <input type="password" className="input-field" value={password} onChange={e=>setPassword(e.target.value)} disabled={loading} placeholder="******"
                    autoComplete="new-password"
                    style={{ width: "100%", padding: "0.9rem", marginTop: "0.3rem", background: "rgba(0, 0, 0, 0.4)", border: "1px solid #475569", borderRadius: "0.75rem", color: "#fff", fontSize: "1rem", boxSizing: "border-box", transition: "0.2s" }} 
                    />
                </div>
                <div style={{flex:1, minWidth: '140px'}}>
                    <label style={{ fontSize: "0.75rem", fontWeight: "700", color: "#94a3b8", marginLeft: "4px", textTransform: "uppercase", letterSpacing: "1px" }}>Confirmar</label>
                    <input type="password" className="input-field" value={confirmPass} onChange={e=>setConfirmPass(e.target.value)} disabled={loading} placeholder="******"
                    autoComplete="new-password"
                    style={{ width: "100%", padding: "0.9rem", marginTop: "0.3rem", background: "rgba(0, 0, 0, 0.4)", border: "1px solid #475569", borderRadius: "0.75rem", color: "#fff", fontSize: "1rem", boxSizing: "border-box", transition: "0.2s" }} 
                    />
                </div>
            </div>

            {error && <div style={{ padding: "0.8rem", background: "rgba(220, 38, 38, 0.25)", border: "1px solid rgba(220, 38, 38, 0.5)", borderRadius: "0.5rem", color: "#fca5a5", fontSize: "0.9rem", textAlign: 'center' }}>⚠️ {error}</div>}

            <button type="submit" disabled={loading} className="btn-register"
                style={{ 
                    width: "100%", padding: "1rem", borderRadius: "0.75rem", border: "none", 
                    background: "linear-gradient(135deg, #15803d 0%, #166534 100%)", // Verde Épico
                    color: "#fff", fontSize: "1.1rem", fontWeight: "800", 
                    cursor: loading?"wait":"pointer", opacity: loading?0.7:1, 
                    transition: "0.3s", textTransform: "uppercase", letterSpacing: "1.5px", marginTop: "0.5rem", 
                    boxShadow: "0 10px 25px -5px rgba(22, 163, 74, 0.5)" 
                }}>
                {loading ? "Gravando..." : "CRIAR CONTA"}
            </button>
            </form>
        )}

        {/* RODAPÉ */}
        <div style={{ textAlign: "center", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "1.2rem" }}>
          <span style={{ color: "#94a3b8", fontSize: "0.95rem" }}>Já tem uma conta? </span>
          <button type="button" onClick={onToggleMode} className="link-btn" style={{ background: "transparent", border: "none", color: "#fff", fontWeight: "bold", cursor: "pointer", fontSize: "0.95rem", marginLeft: "5px" }}>
            Fazer Login
          </button>
        </div>
      </div>
    </div>
  );
}
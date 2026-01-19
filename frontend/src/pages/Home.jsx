import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import "./Home.css"; // <--- Importando o visual Dark Fantasy

const RPG_QUOTES = [
  "Nunca divida o grupo.",
  "Cuidado, esse baú pode ser um mímico.",
  "Role iniciativa!",
  "Você encontra uma taverna escura e esfumaçada...",
  "O dragão acorda. O que você faz?",
  "Um 20 natural muda tudo.",
  "A magia está no ar hoje.",
  "Prepare seus grimórios, mago.",
];

export default function Home() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ campaigns: 0, characters: 0, invites: 0 });

  const [campaignList, setCampaignList] = useState([]);
  const [characterList, setCharacterList] = useState([]);

  const [lastCampaign, setLastCampaign] = useState(null);
  const [quote, setQuote] = useState("");

  const hasLoadedOnceRef = useRef(false);

  useEffect(() => {
    setQuote(RPG_QUOTES[Math.floor(Math.random() * RPG_QUOTES.length)]);
  }, []);

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      setLoading(false);
      if (window.location.pathname !== "/login") navigate("/login");
      return;
    }

    if (hasLoadedOnceRef.current) return;
    hasLoadedOnceRef.current = true;

    loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isAuthenticated]);

  async function loadDashboard() {
    try {
      setLoading(true);

      const [campRes, charRes, invRes] = await Promise.all([
        api.get("/campaigns"),
        api.get("/characters"),
        api.get("/campaign-invitations"),
      ]);

      const campaigns = campRes.data.campaigns || campRes.data || [];
      const characters = charRes.data.characters || charRes.data || [];
      const invites = invRes.data.invitations || invRes.data || [];

      setCampaignList(campaigns);
      setCharacterList(characters);

      if (campaigns.length > 0) {
        setLastCampaign(campaigns[0]);
      }

      setStats({
        campaigns: campaigns.length,
        characters: characters.length,
        invites: invites.filter((i) => i.status === "pending").length,
      });
    } catch (error) {
      console.error("Erro ao carregar dashboard:", error);
    } finally {
      setLoading(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="loading-screen">
        <span className="animate-pulse">Abrindo o portal...</span>
      </div>
    );
  }

  return (
    <div className="umbral-home">
      <div className="home-container fade-in">
        
        {/* HEADER */}
        <header className="home-header">
          <h1 className="greeting">
            Olá, <span className="highlight">{user?.username}</span>.
          </h1>
          <p className="quote">"{quote}"</p>
        </header>

        {/* HERO (Última Aventura) */}
        {lastCampaign ? (
          <section className="hero-section">
            <div style={{ position: "relative", zIndex: 2 }}>
              <span className="hero-label">SUA ÚLTIMA AVENTURA</span>
              <h2 className="hero-title">{lastCampaign.name}</h2>
              <p className="hero-desc">
                {lastCampaign.description || "O mundo aguarda o retorno de seus heróis..."}
              </p>

              <button className="btn-hero" onClick={() => navigate(`/session/${lastCampaign.id}`)}>
                CONTINUAR JORNADA ⚔️
              </button>
            </div>
            <div className="hero-bg-icon">🐉</div>
          </section>
        ) : (
          <section className="hero-section empty">
            <div style={{ position: "relative", zIndex: 2 }}>
              <h2 className="hero-title">Bem-vindo ao UmbraTable</h2>
              <p className="hero-desc">Você ainda não tem nenhuma campanha. Crie uma para começar a sua lenda!</p>
              <button className="btn-hero" onClick={() => navigate("/campanhas")}>
                CRIAR CAMPANHA +
              </button>
            </div>
          </section>
        )}

        {/* --- CARROSSEL DE GALERIA --- */}
        {(campaignList.length > 0 || characterList.length > 0) && (
          <div className="gallery-section">
            <div className="gallery-header">
              <h3>Sua Galeria</h3>
              <span>Role para o lado →</span>
            </div>

            <div className="carousel-container">
              {/* Campanhas */}
              {campaignList.map((camp) => {
                const isMaster = camp.owner_id === user?.id || camp.my_role === "master";
                return (
                  <div key={camp.id} className="gallery-card" onClick={() => navigate(`/session/${camp.id}`)}>
                    <div className="card-img-area" style={{ background: "linear-gradient(45deg, #2d1b4e, #0f0518)" }}>
                      🏰
                      <div className="overlay-gradient" />
                    </div>
                    <div className="card-info">
                      <span className="card-tag" style={{ color: isMaster ? "var(--accent)" : "var(--primary)" }}>
                        {isMaster ? "Mestre" : "Jogador"}
                      </span>
                      <h4 className="card-title">{camp.name}</h4>
                      <div className="card-sub">Campanha</div>
                    </div>
                  </div>
                );
              })}

              {/* Personagens */}
              {characterList.map((char) => {
                const hasAvatar = char.sheet_data?.avatar;
                return (
                  <div key={char.id} className="gallery-card" onClick={() => navigate("/personagem")}>
                    <div
                      className="card-img-area"
                      style={
                        hasAvatar
                          ? { backgroundImage: `url(${char.sheet_data.avatar})` }
                          : { color: "var(--text-muted)" }
                      }
                    >
                      {!hasAvatar && (char.name ? char.name[0] : "?")}
                      <div className="overlay-gradient" />
                    </div>
                    <div className="card-info">
                      <span className="card-tag" style={{ color: "#4ade80" }}>
                        Herói
                      </span>
                      <h4 className="card-title">{char.name}</h4>
                      <div className="card-sub">
                        {char.class} Nv.{char.level}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* GRID DE STATS & ACESSO RÁPIDO */}
        <div className="dashboard-grid">
          
          {/* Card Resumo */}
          <div className="glass-card">
            <h3 className="section-title">Resumo</h3>
            <div className="stats-row">
              <div className="stat-item">
                <div className="stat-number gold">{stats.campaigns}</div>
                <div className="stat-label">Mesas</div>
              </div>
              <div className="stat-item">
                <div className="stat-number purple">{stats.characters}</div>
                <div className="stat-label">Heróis</div>
              </div>
              <div className="stat-item">
                <div className="stat-number red" style={{ opacity: stats.invites > 0 ? 1 : 0.5 }}>
                  {stats.invites}
                </div>
                <div className="stat-label">Convites</div>
              </div>
            </div>
          </div>

          {/* Card Acesso Rápido */}
          <div className="glass-card" style={{ gap: 15 }}>
            <h3 className="section-title">Acesso Rápido</h3>

            <button className="action-btn" onClick={() => navigate("/personagem")}>
              <span className="action-icon">📜</span>
              <div>
                <div style={{ lineHeight: 1 }}>Criar Personagem</div>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Fazer uma nova ficha</span>
              </div>
            </button>

            <button className="action-btn" onClick={() => navigate("/campanhas")}>
              <span className="action-icon">🏰</span>
              <div>
                <div style={{ lineHeight: 1 }}>Buscar Campanhas</div>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Entrar ou criar mesas</span>
              </div>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
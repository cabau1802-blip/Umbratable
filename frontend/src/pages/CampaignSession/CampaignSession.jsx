import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { io } from "socket.io-client";
import { api } from "../../services/api";
import { useAuth } from "../../context/AuthContext";

// Componentes
import { CharacterSheetWorkspace } from "../Personagem";
// import CampaignSheetsModal from "../../components/CampaignSheetsModal";
import MapOrderModal from "../../components/MapOrderModal";
import XpDistributionModal from "../../components/XpDistributionModal";
import XpBar, { XP_TABLE } from "../../components/XpBar";
import DarkSelect from "./components/DarkSelect";

// Weather FX (overlay visual)
import WeatherOverlay from "../../components/WeatherFX/WeatherOverlay";
import WeatherControls from "../../components/WeatherFX/WeatherControls";

// Modais da Sessão
import StatusModal from "./components/Modals/StatusModal";
import QuarantineModal from "./components/Modals/QuarantineModal";
import LegacyFinalizeModal from "./components/Modals/LegacyFinalizeModal";
import LegacyNarrativeModal from "./components/Modals/LegacyNarrativeModal";
import EventModalGM from "./components/Modals/EventModalGM";

// Estilos
import styles from "./styles";
import ui from "./CampaignSession.module.css"; 

// NOVO COMPONENTE (Sem chaves { })
import PingMarker from "./components/PingMarker"; 

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  import.meta.env.VITE_API_URL ||
  window.location.origin;

const BACKEND_HTTP_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "";

function toAbsoluteMapUrl(src) {
  if (!src) return "";
  const s = String(src);
  if (s.startsWith("http://") || s.startsWith("https://") || s.startsWith("data:")) return s;
  if (s.startsWith("/")) return `${BACKEND_HTTP_URL}${s}`;
  return `${BACKEND_HTTP_URL}/${s}`;
}

// =========================
// GRID + SNAP
// =========================
const GRID_DEFAULT_DIVISIONS = 20;
const GRID_BOLD_EVERY = 5;

function clamp01to100(v) {
  return Math.max(0, Math.min(100, v));
}

function snapToGridPercent(value, divisions) {
  const div = Math.max(2, Number(divisions) || GRID_DEFAULT_DIVISIONS);
  const step = 100 / div;
  const cellIndex = Math.floor(value / step);
  const center = cellIndex * step + step / 2;
  return clamp01to100(center);
}

function snapPointToGrid({ x, y }, divisions) {
  return {
    x: snapToGridPercent(x, divisions),
    y: snapToGridPercent(y, divisions),
  };
}

// ===== HP HELPERS =====
function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}
function hpPercent(marker) {
  const maxHp = Number(marker?.maxHp ?? 0);
  const curHp = Number(marker?.currentHp ?? 0);
  if (!maxHp || maxHp <= 0) return 0;
  return clamp((curHp / maxHp) * 100, 0, 100);
}
function hpColor(percent) {
  if (percent > 60) return "#22c55e";
  if (percent > 30) return "#facc15";
  return "#ef4444";
}

const MARKER_COLORS = ["#ef4444", "#f97316", "#facc15", "#22c55e", "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899", "#ffffff"];

const MARKER_TYPES = [
  { id: "hero", label: "Herói", icon: "♟️" },
  { id: "enemy", label: "Inimigo", icon: "💀" },
  { id: "npc", label: "NPC", icon: "🗣️" },
  { id: "loot", label: "Item", icon: "💎" },
];

// =========================
// Status / Condições do Token
// =========================
const STATUS_LIBRARY = [
  { key: "poisoned", label: "Envenenado", icon: "☠️" },
  { key: "stunned", label: "Atordoado", icon: "💫" },
  { key: "prone", label: "Caído", icon: "🛌" },
  { key: "blessed", label: "Abençoado", icon: "✨" },
  { key: "concentrating", label: "Concentrando", icon: "🧠" },
  { key: "invisible", label: "Invisível", icon: "👻" },
  { key: "burning", label: "Em chamas", icon: "🔥" },
  { key: "frozen", label: "Congelado", icon: "❄️" },
  { key: "frightened", label: "Amedrontado", icon: "😱" },
  { key: "charmed", label: "Enfeitiçado", icon: "💘" },
];

const STATUS_LABEL_BY_KEY = Object.fromEntries(STATUS_LIBRARY.map((s) => [s.key, s.label]));
const STATUS_ICON_BY_KEY = Object.fromEntries(STATUS_LIBRARY.map((s) => [s.key, s.icon]));

const DICE_OPTS = [
  { id: "d4", label: "D4", color: "#a855f7" },
  { id: "d6", label: "D6", color: "#3b82f6" },
  { id: "d8", label: "D8", color: "#22c55e" },
  { id: "d10", label: "D10", color: "#eab308" },
  { id: "d12", label: "D12", color: "#f97316" },
  { id: "d20", label: "D20", color: "#ef4444" },
  { id: "d100", label: "D%", color: "#64748b" },
];

// =========================
// EVENT FEED (Campaign Timeline)
// =========================
const EVENT_TYPES = [
  { id: "note", label: "Nota" },
  { id: "combat", label: "Combate" },
  { id: "npc", label: "NPC" },
  { id: "loot", label: "Loot" },
  { id: "pact", label: "Pacto" },
  { id: "travel", label: "Viagem" },
  { id: "downtime", label: "Downtime" },
  { id: "death", label: "Morte" },
  { id: "rumor", label: "Rumor" },
  { id: "milestone", label: "Marco" },
];

function splitTags(input) {
  if (!input) return [];
  return String(input)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 12);
}

const LOADING_QUOTES = ["Afistando as espadas...", "Convocando os dragões...", "Rolando iniciativa...", "Preparando magias..."];

function formatTime(date) {
  return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

// =========================
// CHAT HELPERS (mentions/mute)
// =========================
function normalizeNick(input) {
  return String(input || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

function parseAtWhisper(text) {
  // "@Nome mensagem" -> { toToken: "Nome", body: "mensagem" }
  const t = String(text || "").trim();
  if (!t.startsWith("@")) return null;
  const withoutAt = t.slice(1);
  const firstSpace = withoutAt.search(/\s/);
  if (firstSpace === -1) return { toToken: withoutAt.trim(), body: "" };
  const toToken = withoutAt.slice(0, firstSpace).trim();
  const body = withoutAt.slice(firstSpace).trim();
  return { toToken, body };
}

function isSlashCommand(text) {
  return String(text || "").trim().startsWith("/");
}

// --- FUNÇÕES AUXILIARES DE ATRIBUTOS ---
function getAbilityMod(score) {
  return Math.floor((Number(score || 10) - 10) / 2);
}
function formatModifier(mod) {
  return mod >= 0 ? `+${mod}` : `${mod}`;
}
// ---------------------------------------

const CSS_STYLES = `
  :root{
    --bg: #050505;
    --panel-bg: rgba(18, 18, 22, 0.96);
    --panel-bg-2: rgba(12, 12, 15, 0.82);
    --border-glow: rgba(255,255,255,0.10);
    --border-glow-2: rgba(255,255,255,0.14);
    --text: #e2e8f0;
    --muted: #94a3b8;
    --muted-2: #64748b;
    --gold: #facc15;
    --danger: #ef4444;
    --ok: #22c55e;
    --shadow: 0 10px 30px rgba(0,0,0,0.55);
    --radius: 14px;
  }

  /*
    TEMPLATE VTT (imagem base): coloque o arquivo em /public/ui/vtt-template.png
    - A UI "template" fica como camada de fundo.
    - Os painéis e o mapa ficam em cima com backgrounds transparentes, preservando sua lógica atual.
  */
  .session-shell{ position:fixed!important; inset:0!important; width:100vw!important; height:100dvh!important; z-index:9999!important;
    background:
      url('/ui/vtt-template.png') center/cover no-repeat,
      var(--bg);
    font-family:"Inter",system-ui,sans-serif;
  }
  .session-container *{ box-sizing:border-box; }
  .session-container ::-webkit-scrollbar{ width:4px; height:4px; }
  .session-container ::-webkit-scrollbar-track{ background:transparent; }
  .session-container ::-webkit-scrollbar-thumb{ background:#334155; border-radius:999px; }

  /* HEADER GLASS */
  .glass-header{
    background: var(--panel-bg-2);
    border-bottom: 1px solid var(--border-glow);
    backdrop-filter: blur(14px);
    height: 64px;
    display:flex;
    align-items:center;
    justify-content:space-between;
    padding: 0 20px;
  }

  /* PANELS */
  .sidebar-panel{
    /* Transparente para deixar o template (madeira) aparecer */
    background: rgba(0,0,0,0.10);
    border-right: 1px solid var(--border-glow);
    display:flex;
    flex-direction:column;
    transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease;
    min-width: 0;
  }
  .sidebar-right{
    border-right: 0;
    border-left: 1px solid var(--border-glow);
  }

  .panel-title{
    padding: 18px 20px;
    border-bottom: 1px solid var(--border-glow);
    font-size: 11px;
    font-weight: 900;
    color: var(--muted);
    letter-spacing: 1px;
    text-transform: uppercase;
  }

  /* BUTTONS */
  .btn{
    height: 36px;
    padding: 0 12px;
    border-radius: 10px;
    border: 1px solid rgba(255,255,255,0.12);
    background: rgba(255,255,255,0.06);
    color: var(--text);
    cursor: pointer;
    transition: 0.18s ease;
    font-weight: 800;
    font-size: 12px;
    display:inline-flex;
    align-items:center;
    gap:8px;
    user-select:none;
  }
  .btn:hover{ background: rgba(255,255,255,0.10); border-color: rgba(255,255,255,0.18); }
  .btn:active{ transform: translateY(0.5px); }
  .btn:disabled{ opacity: 0.55; cursor: not-allowed; transform:none; }

  .btn-gold{
    background: var(--gold);
    color:#000;
    border: 0;
    box-shadow: 0 10px 22px rgba(250,204,21,0.10);
  }
  .btn-gold:hover{ filter: brightness(1.06); }

  .btn-danger{
    background: rgba(239,68,68,0.12);
    border-color: rgba(239,68,68,0.22);
    color: var(--danger);
  }
  .btn-danger:hover{ background: rgba(239,68,68,0.18); border-color: rgba(239,68,68,0.30); }

  .btn-icon{
    width: 38px;
    justify-content:center;
    padding: 0;
  }

  /* SELECT */
  .hero-select{
    background: rgba(255,255,255,0.05);
    color: var(--gold);
    border: 1px solid rgba(255,255,255,0.16);
    border-radius: 10px;
    padding: 8px 12px;
    font-size: 13px;
    font-weight: 800;
    outline: none;
  }
  .hero-select:focus{
    border-color: rgba(250,204,21,0.45);
    box-shadow: 0 0 0 3px rgba(250,204,21,0.12);
  }

  /* MAP TOOLBAR */
  .map-toolbar{
    position:absolute;
    top: 18px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(20,20,25,0.84);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255,255,255,0.16);
    border-radius: 14px;
    padding: 6px;
    display:flex;
    gap: 8px;
    z-index: 40;
    box-shadow: var(--shadow);
  }
  .map-tool-btn{
    width: 38px; height: 38px;
    display:flex; align-items:center; justify-content:center;
    border-radius: 10px;
    transition: 0.18s ease;
    color: var(--muted);
    border: 1px solid transparent;
    background: transparent;
    cursor: pointer;
  }
  .map-tool-btn:hover{ background: rgba(255,255,255,0.08); color: #fff; }
  .map-tool-active{
    background: rgba(250,204,21,0.10) !important;
    color: var(--gold) !important;
    border-color: rgba(250,204,21,0.38) !important;
  }

  /* MARKERS */
  .marker-anim{ transition: top 0.10s linear, left 0.10s linear, transform 0.18s ease; cursor: grab; }
  .marker-anim:active{ cursor: grabbing; }
  .marker-anim:hover{ transform: translate(-50%,-50%) scale(1.06); }

  /* HP */
  .hp-wrap{
    position:absolute; top:-14px; left:50%; transform:translateX(-50%);
    width: 54px; height: 6px; border-radius: 999px;
    background: rgba(0,0,0,0.70);
    border: 1px solid rgba(255,255,255,0.12);
    overflow:hidden;
    pointer-events:none;
  }
  .hp-fill{ height:100%; transition: width 0.22s ease; }

  /* DIARY CARD */
  .log-card{
    margin-bottom: 12px;
    padding: 12px;
    background: rgba(255,255,255,0.03);
    border: 1px solid var(--border-glow);
    border-radius: 12px;
  }
  .log-meta{ display:flex; justify-content:space-between; align-items:center; margin-bottom: 6px; gap: 10px; }
  .log-sender{ color: var(--gold); font-size: 11px; font-weight: 900; white-space: nowrap; overflow:hidden; text-overflow: ellipsis; }
  .log-time{ color: #475569; font-size: 10px; white-space: nowrap; }
  .log-msg{ font-size: 12px; color: var(--text); line-height: 1.45; white-space: pre-wrap; }

  /* INPUT */
  .input{
    width:100%;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.12);
    color: #fff;
    padding: 10px 12px;
    border-radius: 12px;
    outline: none;
    transition: 0.18s ease;
  }
  .input:focus{ border-color: rgba(250,204,21,0.45); box-shadow: 0 0 0 3px rgba(250,204,21,0.12); }

  /* DarkSelect inline (não esticar na toolbar) */
  .input.input-inline{
    width: auto !important;
    min-width: 86px;
    padding: 8px 10px;
    border-radius: 10px;
  }
  .map-toolbar .input.input-inline{
    height: 38px;
    padding: 0 10px;
  }

  /* MODAL (Eventos) */
  .modal-overlay{ position: fixed; inset: 0; background: rgba(0,0,0,0.78); backdrop-filter: blur(6px); z-index: 11000; display:flex; align-items:center; justify-content:center; padding: 18px; }
  .modal-card{ width: min(980px, 100%); max-height: min(86dvh, 820px); overflow: hidden; background: rgba(18,18,22,0.98); border: 1px solid rgba(255,255,255,0.12); border-radius: 18px; box-shadow: 0 18px 60px rgba(0,0,0,0.65); display:flex; flex-direction: column; }
  .modal-header{ display:flex; align-items:center; justify-content: space-between; gap: 12px; padding: 14px 14px; border-bottom: 1px solid rgba(255,255,255,0.10); background: rgba(12,12,15,0.70); }
  .modal-title{ font-size: 12px; font-weight: 950; letter-spacing: 1px; text-transform: uppercase; color: #e5e7eb; }
  .modal-body{ padding: 14px; overflow:auto; }

  /* TABS (RIGHT PANEL) */
  .tabbar{ display:flex; border-bottom: 1px solid var(--border-glow); }
  .tab-btn{
    flex:1;
    padding: 14px 12px;
    background: transparent;
    border: 0;
    color: var(--muted-2);
    font-weight: 900;
    font-size: 10px;
    cursor: pointer;
    transition: 0.18s ease;
    letter-spacing: 0.8px;
  }
  .tab-btn:hover{ background: rgba(255,255,255,0.04); color: var(--text); }
  .tab-btn-active{
    background: rgba(255,255,255,0.06);
    color: var(--gold);
  }

  /* DICE */
  .dice-grid{ display:grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
  .dice-btn{
    background: rgba(255,255,255,0.03);
    border: 1px solid var(--border-glow);
    cursor: pointer;
    border-radius: 10px;
    padding: 10px 8px;
    color: #fff;
    transition: 0.18s ease;
    font-size: 11px;
    font-weight: 900;
  }
  .dice-btn:hover{ background: rgba(255,255,255,0.08); border-color: rgba(250,204,21,0.40); }
  .dice-btn-active{
    border-color: rgba(250,204,21,0.70) !important;
    background: rgba(250,204,21,0.06) !important;
  }

  .card{
    background: rgba(255,255,255,0.03);
    border: 1px solid var(--border-glow);
    border-radius: 14px;
  }

  /* MODAL */
  .modal-backdrop{
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.85);
    backdrop-filter: blur(5px);
    display:flex;
    align-items:center;
    justify-content:center;
    z-index: 10000;
  }
  .modal{
    width: 360px;
    background: rgba(16,16,20,0.95);
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 18px;
    padding: 24px;
    box-shadow: var(--shadow);
  }
  .modal h3{ margin: 0 0 10px 0; }
  .modal p{ margin: 0 0 18px 0; color: #94a3b8; font-size: 13px; line-height: 1.35; }

  /* RESPONSIVE */
  @media (max-width: 980px){ .sidebar-panel{ width: 280px !important; } }
  @media (max-width: 820px){ .sidebar-left{ display:none !important; } .sidebar-right{ width: 300px !important; } }
  @media (max-width: 640px){ .sidebar-right{ display:none !important; } .map-toolbar{ left: 12px !important; transform:none !important; } }
`;

function safeString(v, fallback = "") {
  if (v == null) return fallback;
  if (typeof v === "string") return v;
  try {
    return String(v);
  } catch {
    return fallback;
  }
}

function normalizeIncomingLogs(payload) {
  // Normaliza diferentes formatos que podem chegar via socket/HTTP para uma lista de logs.
  // Retorna: [{id,time,message,type,rawRoll,sender}, ...]
  const normalizeOne = (x) => {
    if (!x) return null;

    // Desembrulha formatos comuns
    if (Array.isArray(x)) return x.map(normalizeOne).flat().filter(Boolean);
    if (x.logEntry) return normalizeOne(x.logEntry);
    if (x.log) return normalizeOne(x.log);
    if (x.entry) return normalizeOne(x.entry);
    if (x.data?.logEntry) return normalizeOne(x.data.logEntry);
    if (x.data?.log) return normalizeOne(x.data.log);

    const maybe = x;
    const time = maybe.time || maybe.createdAt || maybe.timestamp;
    const message = maybe.message || maybe.text || maybe.msg;
    const sender = maybe.sender || maybe.user || maybe.username || maybe.name;
    const senderId = maybe.senderId || maybe.fromUserId || maybe.userId || maybe.author_id || maybe.authorId || null;
    const toUserId = maybe.toUserId || maybe.targetUserId || maybe.recipientId || null;
    const toName = maybe.toName || maybe.recipientName || null;
    const isWhisper = Boolean(toUserId);

    // Se não parecer log, ignora
    if (!message && !sender && !time && !maybe.type) return null;

    const id =
      maybe.id ||
      maybe._id ||
      `${safeString(time)}|${safeString(sender)}|${safeString(message)}|${safeString(maybe.type)}`;

    return {
      id,
      time: safeString(time, formatTime(new Date())),
      message: safeString(message, ""),
      type: safeString(maybe.type, "system"),
      rawRoll: maybe.rawRoll ?? maybe.roll ?? maybe.dice ?? null,
      sender: safeString(sender, "User"),
      senderId: senderId != null ? String(senderId) : null,
      toUserId: toUserId != null ? String(toUserId) : null,
      toName: toName != null ? String(toName) : null,
      isWhisper,
    };
  };

  const out = normalizeOne(payload);
  if (!out) return [];
  return Array.isArray(out) ? out : [out];
}

export default function CampaignSession({ onBack, campaignId: propCampaignId, initialCampaign }) {
  const params = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  // Fallback robusto de navegação: quando CampaignSession é renderizada via rota (/session/:id)
  // o componente não recebe a prop onBack. Sem isso, o botão "Sair" não faz nada.
  const goBack = useCallback(() => {
    if (typeof onBack === "function") {
      onBack();
      return;
    }
    // Se existir histórico, volta. Caso contrário, envia para Home.
    if (window.history.length > 1) navigate(-1);
    else navigate("/home", { replace: true });
  }, [navigate, onBack]);

  const socketRef = useRef(null);
  const initiativeEntriesRef = useRef([]);
  const disconnectTimerRef = useRef(null);
  const campaignId = propCampaignId || params.id;

  const [campaign, setCampaign] = useState(initialCampaign || null);
  const [loading, setLoading] = useState(!initialCampaign);
  const [loadingQuote, setLoadingQuote] = useState(LOADING_QUOTES[0]);
  const [error, setError] = useState("");
  const [sessionRole, setSessionRole] = useState(null);

  const [characters, setCharacters] = useState([]);
  const [myCharacters, setMyCharacters] = useState([]);
  const [selectedCharId, setSelectedCharId] = useState("");
  const [characterSheet, setCharacterSheet] = useState(null);

  const [maps, setMaps] = useState([]);
  const [currentMapIndex, setCurrentMapIndex] = useState(0);
  const [markers, setMarkers] = useState([]);

  const [mapTool, setMapTool] = useState("move");

  // =========================
  // Ping no mapa (clique longo)
  // - Segure o clique por ~350ms para pingar
  // - SHIFT+Clique pinga imediatamente (teste rápido)
  // =========================
  const [pings, setPings] = useState([]);
  const pingTimerRef = useRef(null);
  const pingMovedRef = useRef(false);
  const pingStartRef = useRef(null);

  const playPingSound = useCallback(() => {
    // Som leve opcional (Web Audio). Silencioso se falhar.
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = 880;
      g.gain.value = 0.03;
      o.connect(g);
      g.connect(ctx.destination);
      o.start();
      setTimeout(() => {
        o.stop();
        ctx.close();
      }, 90);
    } catch {}
  }, []);

  const addLocalPing = useCallback((ping) => {
    setPings((prev) => [...prev, ping]);
    setTimeout(() => setPings((prev) => prev.filter((p) => p.id !== ping.id)), 1600);
  }, []);

  const emitPing = useCallback((x, y, { bursts = 1, withSound = true } = {}) => {
    if (!campaignId || !socketRef.current) return;

    const senderName = user?.username || user?.name || "Jogador";
    const color = user?.color || "#4F46E5";

    const baseId = `${Date.now()}_${Math.random().toString(16).slice(2)}`;

    // Local imediato (e bursts adicionais)
    for (let b = 0; b < Math.max(1, bursts); b++) {
      const ping = {
        id: `${baseId}_${b}`,
        x,
        y,
        color,
        senderId: user?.id,
        senderName,
        at: Date.now() + b * 220,
        burstIndex: b,
      };

      setTimeout(() => {
        addLocalPing(ping, { withSound: withSound && b === 0 });
      }, b * 220);
    }

    // Broadcast (1 mensagem com bursts)
    socketRef.current.emit("map_ping", {
      campaignId,
      x,
      y,
      color,
      senderId: user?.id,
      senderName,
      bursts,
    });
  }, [campaignId, addLocalPing, user?.id, user?.username, user?.name, user?.color]);
  const [selectedColor, setSelectedColor] = useState(MARKER_COLORS[0]);
  const [selectedMarkerType, setSelectedMarkerType] = useState("hero");
  const [draggingMarkerIndex, setDraggingMarkerIndex] = useState(null);

  const draggingRef = useRef(null);
  // ✅ Upload de imagem para token (mantido)
  const [tokenImageUrl, setTokenImageUrl] = useState("");
  const [tokenUploading, setTokenUploading] = useState(false);
  const tokenFileInputRef = useRef(null);

  
  const [rightTab, setRightTab] = useState("dice");

  // =========================
  // EVENT FEED (Timeline)
  // =========================
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState("");

  const [eventFilters, setEventFilters] = useState({
    sessionNumber: "",
    type: "",
    tags: "",
    visibility: "gm_only",
      pinned: false, // players | gm_only | all (gm only)
  });

  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [isEventsPopupOpen, setIsEventsPopupOpen] = useState(false);
  const [eventEditing, setEventEditing] = useState(null); // event object or null
  const [eventDraft, setEventDraft] = useState({
    session_number: "",
    event_type: "note",
    visibility: "gm_only",
      pinned: false,
    tags: "",
    title: "",
    content: "",
  });

  const [isSheetsOpen, setIsSheetsOpen] = useState(false);
  const [isMapOrderOpen, setIsMapOrderOpen] = useState(false);
  const [isXpModalOpen, setIsXpModalOpen] = useState(false);

  // --- LEGADO NARRATIVO (aplicação rápida ao final/entre sessões) ---
  const [isLegacyModalOpen, setIsLegacyModalOpen] = useState(false);
  const [legacyApplying, setLegacyApplying] = useState(false);
  const [legacyTargets, setLegacyTargets] = useState([]); // array de character.id selecionados
  const [legacyDraft, setLegacyDraft] = useState({
    markName: "",
    markDesc: "",
    titleName: "",
    titleGrantedBy: "",
    hookPrompt: ""
  });

  // --- LEGADO AUTOMÁTICO (finalização de campanha / quarentena de legado) ---
  const [isLegacyFinalizeOpen, setIsLegacyFinalizeOpen] = useState(false);
  const [legacyFinalizeLoading, setLegacyFinalizeLoading] = useState(false);
  const [legacyFinalizeError, setLegacyFinalizeError] = useState("");
  const [legacyFinalizeDraft, setLegacyFinalizeDraft] = useState(null); // payload do draft

  // Toast (feedback rápido)
  const [toast, setToast] = useState(null);
const [isQuarantineOpen, setIsQuarantineOpen] = useState(false);
const [quarantineLoading, setQuarantineLoading] = useState(false);
const [quarantineError, setQuarantineError] = useState("");
const [quarantineData, setQuarantineData] = useState(null); // { campaignId, characters: [...] }
const [quarantineDecisions, setQuarantineDecisions] = useState({}); // key: `${characterId}:${itemId}` -> status

  // =========================
  // LEGADO AUTOMÁTICO (finalizar campanha -> gerar rascunho -> revisar -> aplicar)
  // =========================
  const normalizeLegacyFinalizeDraft = useCallback((data) => {
    // Aceita respostas variadas do backend: {payload}, {draft:{payload}}, ou o payload direto
    const payload = data?.payload || data?.draft?.payload || data?.draft || data;
    if (!payload) return null;

    const ensureArr = (v) => (Array.isArray(v) ? v : []);
    const coalesce = (...vals) => vals.find((v) => v !== undefined && v !== null);

    const normalizeItem = (key, it) => {
      // Normaliza campos para o padrão da UI (sem quebrar se o backend variar nomes)
      const base = { ...(it || {}) };
      if (key === "marks") {
        return {
          ...base,
          name: coalesce(base.name, base.label, ""),
          description: coalesce(base.description, base.desc, ""),
        };
      }
      if (key === "titles") {
        return {
          ...base,
          name: coalesce(base.name, base.title, ""),
          granted_by: coalesce(base.granted_by, base.grantedBy, base.note, ""),
        };
      }
      if (key === "hooks") {
        return {
          ...base,
          prompt: coalesce(base.prompt, base.hook, ""),
        };
      }
      if (key === "burdens") {
        return {
          ...base,
          description: coalesce(base.description, base.burden, ""),
        };
      }
      return base;
    };

    const withIds = (arr, prefix, characterId, key) =>
      ensureArr(arr).map((it, i) => {
        const normalized = normalizeItem(key, it);
        return {
          id: normalized?.id || `${prefix}_${characterId || "char"}_${i}_${Date.now()}`,
          ...normalized,
        };
      });

    const chars = ensureArr(payload.characters);
    const normalizedCharacters = chars.map((c) => {
      const characterId = c.characterId || c.character_id || c.id;

      const suggestionsRaw = c.suggestions || c.items || c.append || {};
      const approvedRaw = c.approved || {};

      const suggestions = {
        marks: withIds(suggestionsRaw.marks, "mark", characterId, "marks"),
        titles: withIds(suggestionsRaw.titles, "title", characterId, "titles"),
        hooks: withIds(suggestionsRaw.hooks, "hook", characterId, "hooks"),
        burdens: withIds(suggestionsRaw.burdens, "burden", characterId, "burdens"),
      };

      // Approved deve carregar objetos completos (para aplicar no backend).
      // Mantemos id para sincronizar edições com suggestions.
      const approved = {
        marks: withIds(approvedRaw.marks, "amark", characterId, "marks"),
        titles: withIds(approvedRaw.titles, "atitle", characterId, "titles"),
        hooks: withIds(approvedRaw.hooks, "ahook", characterId, "hooks"),
        burdens: withIds(approvedRaw.burdens, "aburden", characterId, "burdens"),
      };

      return { ...c, characterId, suggestions, approved };
    });

    return {
      ...payload,
      campaignId: payload.campaignId || payload.campaign_id || campaignId,
      characters: normalizedCharacters,
    };
  }, [campaignId]);

  const fetchLegacyFinalizeDraft = useCallback(async () => {
    if (!campaignId) return;
    if (sessionRole !== "GM") return;

    setLegacyFinalizeLoading(true);
    setLegacyFinalizeError("");
    try {
      const res = await api.get(`/campaigns/${campaignId}/legacy-draft`);
      const normalized = normalizeLegacyFinalizeDraft(res.data);
      setLegacyFinalizeDraft(normalized);
      return normalized;
    } catch (err) {
      console.error(err);
      setLegacyFinalizeError(err?.response?.data?.error || "Falha ao carregar o rascunho de legado.");
      return null;
    } finally {
      setLegacyFinalizeLoading(false);
    }
  }, [campaignId, sessionRole, normalizeLegacyFinalizeDraft]);

  const finishCampaignAndOpenLegacyDraft = useCallback(async () => {
    if (!campaignId) return;
    if (sessionRole !== "GM") return;

    if (!confirm("Finalizar campanha e gerar rascunho de legado?")) return;

    setIsLegacyFinalizeOpen(true);
    setLegacyFinalizeLoading(true);
    setLegacyFinalizeError("");
    try {
      const res = await api.post(`/campaigns/${campaignId}/finish`);
      const normalized = normalizeLegacyFinalizeDraft(res.data);
      setLegacyFinalizeDraft(normalized);
      logAction("Campanha finalizada. Rascunho de legado gerado.", "system");
    } catch (err) {
      console.error(err);
      setLegacyFinalizeError(err?.response?.data?.error || "Falha ao finalizar campanha / gerar rascunho.");
    } finally {
      setLegacyFinalizeLoading(false);
    }
  }, [campaignId, sessionRole, normalizeLegacyFinalizeDraft]);

  const handleExportDiary = useCallback(async () => {
    if (!campaignId) return;

    try {
      // Default export is PDF. Use ?format=md to export Markdown.
      const res = await api.get(`/campaigns/${campaignId}/diary/export?format=pdf`, { responseType: "blob" });
      const contentType = res.headers?.["content-type"] || "application/pdf";
      const blob = new Blob([res.data], { type: contentType });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `diario_${campaignId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Erro exportar diário:", err);
      setToast({ type: "error", message: err?.response?.data?.error || "Erro ao exportar diário." });
    }
  }, [campaignId]);

  // =========================
  // EVENT FEED (Timeline)
  // =========================
  const normalizeEventVisibility = useCallback((v) => {
    const s = String(v || "").toLowerCase();
    // backend dialect: players | gm_only | targets
    if (s === "gm" || s === "gm_only" || s === "gm-only") return "gm_only";
    if (s === "public" || s === "players" || s === "player" || s === "all") return "players";
    if (s === "targets" || s === "private" || s === "targeted") return "targets";
    // default seguro
    return "players";
  }, []);

  const buildEventsQuery = useCallback(() => {
    const params = new URLSearchParams();

    // evita cache 304 atrapalhar refresh
    params.set("_ts", String(Date.now()));

    const sn = eventFilters.sessionNumber;
    if (sn !== "" && sn !== null && sn !== undefined) params.set("session_number", String(sn));

    if (eventFilters.type) params.set("type", String(eventFilters.type));

    const tagsArr = splitTags(eventFilters.tags);
    if (tagsArr.length) params.set("tags", tagsArr.join(","));

    // GM pode ver tudo, player só players
    if (sessionRole === "GM") {
      if (eventFilters.visibility && eventFilters.visibility !== "all") params.set("visibility", normalizeEventVisibility(eventFilters.visibility));
      // visibility=all -> sem filtro
    } else {
      params.set("visibility", "players");
    }

    return params.toString() ? `?${params.toString()}` : "";
  }, [eventFilters, sessionRole, normalizeEventVisibility]);

  const fetchEvents = useCallback(async () => {
    if (!campaignId) return;
    setEventsLoading(true);
    setEventsError("");
    try {
      const qs = buildEventsQuery();
      const res = await api.get(`/campaigns/${campaignId}/events${qs}`);
      const list = Array.isArray(res.data) ? res.data : res.data?.events || [];
      const sorted = [...list].sort((a, b) => new Date(b.created_at || b.createdAt || 0) - new Date(a.created_at || a.createdAt || 0));
      setEvents(sorted);
    } catch (err) {
      console.error(err);
      setEventsError(err?.response?.data?.error || "Falha ao carregar eventos.");
    } finally {
      setEventsLoading(false);
    }
  }, [campaignId, buildEventsQuery]);

  useEffect(() => {
    if (isEventsPopupOpen) fetchEvents();
  }, [isEventsPopupOpen, fetchEvents]);

  useEffect(() => {
    if (!isEventsPopupOpen) return;
    const onEscEvents = (e) => { if (e.key === "Escape") setIsEventsPopupOpen(false); };
    window.addEventListener("keydown", onEscEvents, true);
    return () => window.removeEventListener("keydown", onEscEvents, true);
  }, [isEventsPopupOpen]);

  const openCreateEvent = useCallback(() => {
    if (sessionRole !== "GM") return;
    setEventEditing(null);
    setEventDraft({
      session_number: "",
      event_type: "note",
      visibility: "gm_only",
      pinned: false,
      tags: "",
      title: "",
      content: "",
    });
    setEventModalOpen(true);
  }, [sessionRole]);

  const openEditEvent = useCallback((evt) => {
    if (sessionRole !== "GM") return;
    if (!evt) return;

    setEventEditing(evt);
    setEventDraft({
      session_number: evt.session_number ?? evt.sessionNumber ?? "",
      event_type: evt.event_type || evt.type || "note",
      visibility: evt.visibility || "gm_only",
      pinned: Boolean(evt?.metadata?.pinned),
      tags: Array.isArray(evt.tags) ? evt.tags.join(", ") : (evt.tags || ""),
      title: evt.title || "",
      content: evt.content || "",
    });
    setEventModalOpen(true);
  }, [sessionRole]);

  const submitEventDraft = useCallback(async () => {
    if (!campaignId) return;
    if (sessionRole !== "GM") return;

    const payload = {
      session_number: eventDraft.session_number === "" ? null : Number(eventDraft.session_number),
      event_type: String(eventDraft.event_type || "note"),
      visibility: normalizeEventVisibility(eventDraft.visibility),
      tags: splitTags(eventDraft.tags),
      title: eventDraft.title ? String(eventDraft.title).trim() : null,
      content: String(eventDraft.content || "").trim(),
      metadata: { pinned: Boolean(eventDraft.pinned) },
    };

    if (!payload.content) {
      showToast("Conteúdo do evento é obrigatório.", "error");
      return;
    }

    try {
      
      let saved = null;
      if (eventEditing?.id) {
        const res = await api.put(`/campaigns/${campaignId}/events/${eventEditing.id}`, payload);
        saved = res.data?.payload || res.data;
        showToast("Evento atualizado.", "success");
      } else {
        const res = await api.post(`/campaigns/${campaignId}/events`, payload);
        saved = res.data?.payload || res.data;
        showToast("Evento criado.", "success");
      }

      // Upsert local imediato (evita depender de refresh/caching)
      if (saved && saved.id) {
        setEvents((prev) => {
          const arr = Array.isArray(prev) ? [...prev] : [];
          const idx = arr.findIndex((x) => x?.id === saved.id);
          if (idx >= 0) arr[idx] = { ...arr[idx], ...saved };
          else arr.unshift(saved);
          // mantém ordenação por created_at quando existir
          arr.sort(
            (a, b) =>
              new Date(b.created_at || b.createdAt || 0) - new Date(a.created_at || a.createdAt || 0)
          );
          return arr;
        });
      } else {
        // fallback: recarrega lista
        await fetchEvents();
      }

      setEventModalOpen(false);
      setEventEditing(null);

    } catch (err) {
      console.error(err);
      showToast(err?.response?.data?.error || "Falha ao salvar evento.", "error");
    }
  }, [campaignId, sessionRole, eventDraft, eventEditing, fetchEvents]);

  const deleteEvent = useCallback(async (evt) => {
    if (!campaignId) return;
    if (sessionRole !== "GM") return;
    if (!evt?.id) return;
    if (!confirm("Excluir este evento?")) return;

    try {
      await api.delete(`/campaigns/${campaignId}/events/${evt.id}`);
      showToast("Evento excluído.", "success");
      await fetchEvents();
    } catch (err) {
      console.error(err);
      showToast(err?.response?.data?.error || "Falha ao excluir evento.", "error");
    }
  }, [campaignId, sessionRole, fetchEvents]);

  const togglePinEvent = useCallback(async (evt) => {
    if (!campaignId) return;
    if (sessionRole !== "GM") return;
    if (!evt?.id) return;

    try {
      await api.put(`/campaigns/${campaignId}/events/${evt.id}`, {
        metadata: { pinned: !Boolean(evt?.metadata?.pinned) },
      });
      await fetchEvents();
    } catch (err) {
      console.error(err);
      showToast(err?.response?.data?.error || "Falha ao fixar evento.", "error");
    }
  }, [campaignId, sessionRole, fetchEvents]);

  const togglePublishEvent = useCallback(async (evt) => {
    if (!campaignId) return;
    if (sessionRole !== "GM") return;
    if (!evt?.id) return;

    const nextVisibility = evt.visibility === "players" ? "gm_only" : "players";
    try {
      await api.put(`/campaigns/${campaignId}/events/${evt.id}`, { visibility: nextVisibility });
      await fetchEvents();
    } catch (err) {
      console.error(err);
      showToast(err?.response?.data?.error || "Falha ao alterar visibilidade.", "error");
    }
  }, [campaignId, sessionRole, fetchEvents]);

  const publishBatch = useCallback(async () => {
    if (!campaignId) return;
    if (sessionRole !== "GM") return;

    const sn =
      eventFilters?.session_number !== "" && eventFilters?.session_number !== undefined
        ? Number(eventFilters.session_number)
        : null;

    const msg = sn ? `Publicar todos os eventos GM-only da sessão ${sn}?` : "Publicar todos os eventos GM-only da campanha?";
    if (!confirm(msg)) return;

    try {
      const res = await api.post(`/campaigns/${campaignId}/events/publish`, { session_number: sn });
      showToast(`Publicado(s): ${res?.data?.published ?? 0}`, "success");
      await fetchEvents();
    } catch (err) {
      console.error(err);
      showToast(err?.response?.data?.error || "Falha ao publicar em lote.", "error");
    }
  }, [campaignId, sessionRole, eventFilters, fetchEvents]);

  const saveLegacyFinalizeDraft = useCallback(async () => {
    if (!campaignId) return;
    if (sessionRole !== "GM") return;
    if (!legacyFinalizeDraft) return;

    setLegacyFinalizeLoading(true);
    setLegacyFinalizeError("");
    try {
      await api.put(`/campaigns/${campaignId}/legacy-draft`, { payload: legacyFinalizeDraft });
      logAction("Rascunho de legado salvo.", "system");
      showToast("Rascunho salvo.", "success");
    } catch (err) {
      console.error(err);
      setLegacyFinalizeError(err?.response?.data?.error || "Falha ao salvar rascunho.");
      showToast("Falha ao salvar rascunho.", "error");
    } finally {
      setLegacyFinalizeLoading(false);
    }
  }, [campaignId, sessionRole, legacyFinalizeDraft]);

  const applyLegacyFinalizeDraft = useCallback(async () => {
    if (!campaignId) return;
    if (sessionRole !== "GM") return;
    if (!legacyFinalizeDraft) return;

    if (!confirm("Aplicar este legado no histórico permanente dos personagens?")) return;

    setLegacyFinalizeLoading(true);
    setLegacyFinalizeError("");
    try {
      const res = await api.post(`/campaigns/${campaignId}/legacy-draft/apply`, { payload: legacyFinalizeDraft });
      logAction("Legado aplicado a partir do rascunho.", "system");
      showToast("Legado aplicado.", "success");
      // Opcional: recarrega draft (para refletir status applied)
      const normalized = normalizeLegacyFinalizeDraft(res.data) || legacyFinalizeDraft;
      setLegacyFinalizeDraft(normalized);
      setIsLegacyFinalizeOpen(false);
    } catch (err) {
      console.error(err);
      setLegacyFinalizeError(err?.response?.data?.error || "Falha ao aplicar legado.");
      showToast("Falha ao aplicar legado.", "error");
    } finally {
      setLegacyFinalizeLoading(false);
    }
  }, [campaignId, sessionRole, legacyFinalizeDraft, normalizeLegacyFinalizeDraft]);

  
  const isItemApproved = useCallback((draft, characterId, key, itemId) => {
    const ch = (draft?.characters || []).find((x) => String(x.characterId) === String(characterId));
    const appr = ch?.approved || {};
    const arr = Array.isArray(appr[key]) ? appr[key] : [];
    return arr.some((it) => String(it.id) === String(itemId));
  }, []);

  const toggleApprovedItem = useCallback((characterId, key, itemId) => {
    setLegacyFinalizeDraft((prev) => {
      if (!prev) return prev;
      const next = { ...prev };
      next.characters = (next.characters || []).map((cc) => {
        if (String(cc.characterId) !== String(characterId)) return cc;

        const s = cc.suggestions || {};
        const a = cc.approved || { marks: [], titles: [], hooks: [], burdens: [] };

        const sArr = Array.isArray(s[key]) ? s[key] : [];
        const item = sArr.find((it) => String(it.id) === String(itemId));
        if (!item) return cc;

        const aArr = Array.isArray(a[key]) ? [...a[key]] : [];
        const exists = aArr.some((it) => String(it.id) === String(itemId));

        const newApprovedArr = exists ? aArr.filter((it) => String(it.id) !== String(itemId)) : [...aArr, { ...item }];

        return { ...cc, approved: { ...a, [key]: newApprovedArr } };
      });
      return next;
    });
  }, []);

  const updateSuggestionItem = useCallback((characterId, key, itemId, patch) => {
    setLegacyFinalizeDraft((prev) => {
      if (!prev) return prev;
      const next = { ...prev };
      next.characters = (next.characters || []).map((cc) => {
        if (String(cc.characterId) !== String(characterId)) return cc;

        const s = cc.suggestions || {};
        const a = cc.approved || { marks: [], titles: [], hooks: [], burdens: [] };

        const sArr = Array.isArray(s[key]) ? [...s[key]] : [];
        const sIdx = sArr.findIndex((it) => String(it.id) === String(itemId));
        if (sIdx >= 0) sArr[sIdx] = { ...sArr[sIdx], ...patch };

        // Se já estiver aprovado, mantém sincronizado
        const aArr = Array.isArray(a[key]) ? [...a[key]] : [];
        const aIdx = aArr.findIndex((it) => String(it.id) === String(itemId));
        if (aIdx >= 0) aArr[aIdx] = { ...aArr[aIdx], ...patch };

        return { ...cc, suggestions: { ...s, [key]: sArr }, approved: { ...a, [key]: aArr } };
      });
      return next;
    });
  }, []);

  const removeSuggestionItem = useCallback((characterId, key, itemId) => {
    setLegacyFinalizeDraft((prev) => {
      if (!prev) return prev;
      const next = { ...prev };
      next.characters = (next.characters || []).map((cc) => {
        if (String(cc.characterId) !== String(characterId)) return cc;

        const s = cc.suggestions || {};
        const a = cc.approved || { marks: [], titles: [], hooks: [], burdens: [] };

        const sArr = Array.isArray(s[key]) ? s[key].filter((it) => String(it.id) !== String(itemId)) : [];
        const aArr = Array.isArray(a[key]) ? a[key].filter((it) => String(it.id) !== String(itemId)) : [];

        return { ...cc, suggestions: { ...s, [key]: sArr }, approved: { ...a, [key]: aArr } };
      });
      return next;
    });
  }, []);

const addSuggestionItem = useCallback((characterId, key, fields) => {
  const id = `${key}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const base = { id };
  (fields || []).forEach((f) => {
    if (f?.path && base[f.path] === undefined) base[f.path] = "";
  });

  setLegacyFinalizeDraft((prev) => {
    if (!prev) return prev;
    const next = { ...prev };
    next.characters = (next.characters || []).map((cc) => {
      if (String(cc.characterId) !== String(characterId)) return cc;

      const s = cc.suggestions || {};
      const current = Array.isArray(s[key]) ? s[key] : [];
      const updated = [...current, base];

      return { ...cc, suggestions: { ...s, [key]: updated } };
    });
    return next;
  });
}, []);

const openLegacyModal = () => {
    const defaultMarkName = campaign?.name ? `Veterano de ${campaign.name}` : "Veterano de Campanha";
    const defaultMarkDesc = campaign?.description
      ? `Participou da campanha: ${campaign.description}`.slice(0, 240)
      : "Participou e concluiu eventos marcantes nesta mesa.";
    const defaultTitle = campaign?.name ? `Lenda de ${campaign.name}` : "";

    setLegacyDraft({
      markName: defaultMarkName,
      markDesc: defaultMarkDesc,
      titleName: defaultTitle,
      titleGrantedBy: campaign?.name ? `Campanha: ${campaign.name}` : "Campanha",
      hookPrompt: ""
    });

    const ids = Array.isArray(characters) ? characters.map((c) => c.id) : [];
    setLegacyTargets(ids);
    setIsLegacyModalOpen(true);
  };

  const [showExitModal, setShowExitModal] = useState(false);
  const [showLeftPanel, setShowLeftPanel] = useState(true);
  const [showRightPanel, setShowRightPanel] = useState(true);

  const [selectedDice, setSelectedDice] = useState("d20");
  const [diceQuantity, setDiceQuantity] = useState(1);
  const [rollModifier, setRollModifier] = useState(0);
  const [lastRoll, setLastRoll] = useState(null);
  const [isRolling, setIsRolling] = useState(false);

  const [actionLog, setActionLog] = useState([]);
  const [chatMessage, setChatMessage] = useState("");
// =========================
// SAY (Chat Diegético - Balões)
// =========================
const [sayBubbles, setSayBubbles] = useState([]); // [{id, text, fromUserId, fromCharacterId, fromName, createdAt, ttlMs, clientNonce}]
const [cinematic, setCinematic] = useState({ enabled: false, splashUrl: null, focus: null, by: null });
  // Weather FX (debug local). Em produção: estado via Socket controlado pelo GM.
  // eslint-disable-next-line no-unused-vars
  const [weatherByMap, setWeatherByMap] = useState({});
  const weatherEmitRef = useRef({ last: 0, timer: null });

  const currentWeatherKey = useMemo(() => {
    const mp = maps?.[currentMapIndex];
    return mp?.id ?? mp?.mapId ?? mp?.name ?? String(currentMapIndex ?? 0);
  }, [maps, currentMapIndex]);

  const currentWeather = useMemo(() => {
    const w = weatherByMap?.[currentWeatherKey];
    if (w && typeof w === "object") {
      return {
        enabled: Boolean(w.enabled),
        type: String(w.type || "none"),
        intensity: Number.isFinite(Number(w.intensity)) ? Number(w.intensity) : 0.65,
        seed: w.seed,
      };
    }
    return { enabled: false, type: "none", intensity: 0.65, seed: undefined };
  }, [weatherByMap, currentWeatherKey]);

  

  const emitGmStateImmediate = useCallback(
    (override = {}) => {
      const socket = socketRef.current;
      if (!socket) return;
      // Weather control is gated in UI; do not hard-block here to avoid role desync edge-cases.
      if (!campaignId) return;
      if (!user?.id) return;

      socket.emit("gm_update_state", {
        campaignId,
        maps,
        currentMapIndex,
        initiativeEntries: initiativeEntriesRef.current,
        fogStrokes: fogStrokesRef.current,
        weatherByMap,
        senderId: user.id,
        ...override,
      });
    },
    [campaignId, sessionRole, maps, currentMapIndex, user?.id, weatherByMap]
  );

  const updateWeatherForCurrentMap = useCallback(
    (partial) => {
      // Weather control is gated in UI; do not hard-block here to avoid role desync edge-cases.
      const nextPartial = partial || {};

      setWeatherByMap((prev) => {
        const basePrev = prev && typeof prev === "object" ? prev : {};
        const existing =
          basePrev[currentWeatherKey] && typeof basePrev[currentWeatherKey] === "object"
            ? basePrev[currentWeatherKey]
            : { enabled: false, type: "none", intensity: 0.65 };

        const merged = { ...existing, ...nextPartial };

        // UX: se o GM ativar sem escolher tipo, default para chuva (feedback imediato).
        if (nextPartial && nextPartial.enabled === true && (existing?.type === "none" || !existing?.type) && !("type" in nextPartial)) {
          merged.type = "rain";
        }

        const nextEntry = {
          enabled: Boolean(merged.enabled),
          type: String(merged.type || "none"),
          intensity: Math.max(0, Math.min(1, Number(merged.intensity ?? 0.65))),
          seed: merged.seed,
        };

        const next = { ...basePrev, [currentWeatherKey]: nextEntry };

        // Throttle leve para arraste do slider (evita spam no socket)
        const now = Date.now();
        const elapsed = now - (weatherEmitRef.current.last || 0);
        const doEmit = () => {
          weatherEmitRef.current.last = Date.now();
          emitGmStateImmediate({ weatherByMap: next });
        };

        if (elapsed >= 120) {
          doEmit();
        } else {
          if (weatherEmitRef.current.timer) clearTimeout(weatherEmitRef.current.timer);
          weatherEmitRef.current.timer = setTimeout(doEmit, 120 - elapsed);
        }

        return next;
      });
    },
    [sessionRole, currentWeatherKey, emitGmStateImmediate]
  );
  const [weatherMenuOpen, setWeatherMenuOpen] = useState(false);

  const [cinematicFocusArmed, setCinematicFocusArmed] = useState(false);
const [cinematicSpotlight, setCinematicSpotlight] = useState(null); // {id,x,y}
const focusAnimRef = useRef(null);

const spawnCinematicSpotlight = useCallback((xPct, yPct) => {
  const x = Math.max(0, Math.min(100, Number(xPct) || 0));
  const y = Math.max(0, Math.min(100, Number(yPct) || 0));
  const id = Date.now();
  setCinematicSpotlight({ id, x, y });
  window.clearTimeout(focusAnimRef.current);
  focusAnimRef.current = window.setTimeout(() => {
    setCinematicSpotlight((p) => (p && p.id === id ? null : p));
  }, 1200);
}, []);

const applyCinematicFocus = useCallback(
  (xPct, yPct) => {
    if (!mapContainerRef.current) {
      spawnCinematicSpotlight(xPct, yPct);
      return;
    }

    spawnCinematicSpotlight(xPct, yPct);

    const el = mapContainerRef.current;
    const canScroll = el.scrollWidth > el.clientWidth + 2 || el.scrollHeight > el.clientHeight + 2;
    if (!canScroll) return;

    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

    const targetLeft = (Number(xPct) / 100) * el.scrollWidth - el.clientWidth / 2;
    const targetTop = (Number(yPct) / 100) * el.scrollHeight - el.clientHeight / 2;

    const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
    const toLeft = clamp(targetLeft, 0, Math.max(0, el.scrollWidth - el.clientWidth));
    const toTop = clamp(targetTop, 0, Math.max(0, el.scrollHeight - el.clientHeight));

    if (reduceMotion) {
      el.scrollTo({ left: toLeft, top: toTop, behavior: "auto" });
      return;
    }

    const fromLeft = el.scrollLeft;
    const fromTop = el.scrollTop;
    const start = performance.now();
    const dur = 420;

    const ease = (p) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);

    const step = (t) => {
      const p = Math.min(1, (t - start) / dur);
      const e = ease(p);
      el.scrollLeft = fromLeft + (toLeft - fromLeft) * e;
      el.scrollTop = fromTop + (toTop - fromTop) * e;
      if (p < 1) requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
  },
  [spawnCinematicSpotlight]
);

useEffect(() => {
  if (!cinematic.enabled) return;
  // Fullscreen cinematic: prevent page scroll while enabled
  const prev = document.body.style.overflow;
  document.body.style.overflow = "hidden";
  return () => {
    document.body.style.overflow = prev;
  };
}, [cinematic.enabled]);

const sentSayNoncesRef = useRef(new Set());

const SAY_MIN_MS = 2800;
const SAY_MAX_MS = 4200;

const computeSayTtl = useCallback((text) => {
  const t = String(text || "");
  const ms = SAY_MIN_MS + Math.min(1400, t.length * 40);
  return Math.max(SAY_MIN_MS, Math.min(SAY_MAX_MS, ms));
}, []);

const resolveMarkerForSay = useCallback(
  (fromUserId, fromCharacterId, fromLabel) => {
    const uid = fromUserId != null ? String(fromUserId) : null;
    const cid = fromCharacterId != null ? String(fromCharacterId) : null;
    const lbl = normalizeNick(fromLabel);

    // 1) match by characterId (if marker data has it)
    if (cid) {
      const byChar =
        markers.find((m) => String(m.characterId ?? m.character_id ?? "") === cid) ||
        markers.find((m) => String(m.charId ?? m.char_id ?? "") === cid);
      if (byChar) return byChar;
    }

    
    // 1.5) fallback: match by avatar for GMs (quando o token do personagem não tem characterId/label consistente)
    // - Se temos fromCharacterId e o characterSheet atual corresponde, usamos o avatar como chave para achar o marcador "hero".
    if (cid && characterSheet && String(characterSheet.id ?? characterSheet.characterId ?? "") === cid) {
      const av = characterSheet?.sheet_data?.avatar || characterSheet?.avatar || null;
      if (av) {
        const byAvatar = markers.find((m) => (m.type === "hero" || m.type === "pc" || m.type === "character") && String(m.avatar || "") === String(av));
        if (byAvatar) return byAvatar;
      }
    }

// 2) match by userId (se marker carrega alguma chave de dono)
    // No seu modelo atual, o marcador usa `ownerKey` para apontar o dono.
    if (uid) {
      const byUser =
        markers.find((m) => String(m.userId ?? m.user_id ?? m.ownerId ?? m.owner_id ?? "") === uid) ||
        markers.find((m) => String(m.ownerKey ?? "") === uid) ||
        null;
      if (byUser) return byUser;
    }

    // 3) match by label/name (most common in seu modelo atual)
    if (lbl) {
      const byLabel =
        markers.find((m) => normalizeNick(m.label) === lbl) ||
        markers.find((m) => normalizeNick(m.label).startsWith(lbl)) ||
        markers.find((m) => lbl.startsWith(normalizeNick(m.label))) ||
        null;
      if (byLabel) return byLabel;
    }

    return null;
  },
  [markers, characterSheet]
);

const spawnSayBubble = useCallback(
  ({ text, fromUserId, fromCharacterId, fromName, fromCharacterName, clientNonce }) => {
    const t = String(text || "").trim();
    if (!t) return;

    const mk = resolveMarkerForSay(fromUserId, fromCharacterId, fromCharacterName || fromName);
    if (!mk) return; // sem token, não renderiza balão

    const id = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const ttlMs = computeSayTtl(t);
    const createdAt = Date.now();

    setSayBubbles((prev) => [
      ...prev,
      { id, text: t, fromUserId, fromCharacterId, fromName, fromCharacterName: fromCharacterName || null, createdAt, ttlMs, clientNonce: clientNonce || null },
    ]);

    window.setTimeout(() => {
      setSayBubbles((prev) => prev.filter((b) => b.id !== id));
    }, ttlMs + 220); // margem para fade-out
  },
  [computeSayTtl, resolveMarkerForSay]
);

const getSayBubblePlacement = useCallback((mk) => {
  // Auto-flip: se estiver no topo (y baixo), renderiza abaixo.
  const y = Number(mk?.y ?? 50);
  const x = Number(mk?.x ?? 50);

  const flipY = y < 18; // threshold seguro para topo
  const alignLeft = x < 14;
  const alignRight = x > 86;

  return { flipY, alignLeft, alignRight };
}, []);

// =========================
// CHAT (campanha) — mentions (@) / mute / emoji
// =========================
const [campaignParticipants, setCampaignParticipants] = useState([]); // [{id,name,role}]
const [mentionTargets, setMentionTargets] = useState([]); // [{userId, label, characterId}]
const [isEmojiOpen, setIsEmojiOpen] = useState(false);
const [mentionQuery, setMentionQuery] = useState("");
const [isMentionOpen, setIsMentionOpen] = useState(false);
const [mentionIndex, setMentionIndex] = useState(0);
  const [whisperTarget, setWhisperTarget] = useState(null); // {userId,label,characterId}

useEffect(() => {
  // Garantia: quando um alvo de sussurro está fixado, o popover do @ não deve ficar aberto.
  if (whisperTarget) {
    setIsMentionOpen(false);
    setMentionQuery("");
    setMentionIndex(0);
    return;
  }

  // Se o usuário apagou o @ (ou não está mais digitando um token de mention), feche.
  const t = String(chatMessage || "").trimStart();
  if (!t.startsWith("@") || t.slice(1).includes(" ")) {
    setIsMentionOpen(false);
    setMentionQuery("");
    setMentionIndex(0);
  }
}, [whisperTarget, chatMessage]);
const [showChatHint, setShowChatHint] = useState(false);

const chatInputRef = useRef(null);
const emojiPopoverRef = useRef(null);

// - marca usuário como "online" quando envia/recebe chat
// - expira para offline após um período sem atividade
const [presenceByUserId, setPresenceByUserId] = useState({}); // { [userId]: { online: boolean, lastSeen: number } }

const markUserActive = useCallback((userId) => {
  const uid = userId != null ? String(userId) : null;
  if (!uid) return;
  setPresenceByUserId((prev) => ({
    ...prev,
    [uid]: { online: true, lastSeen: Date.now() },
  }));
}, []);

const markUserOffline = useCallback((userId) => {
  const uid = userId != null ? String(userId) : null;
  if (!uid) return;
  setPresenceByUserId((prev) => {
    const curr = prev?.[uid] || {};
    return {
      ...prev,
      [uid]: { online: false, lastSeen: curr.lastSeen || Date.now() },
    };
  });
}, []);

useEffect(() => {
  // Expira presença para "offline" após inatividade.
  const ttlMs = 5 * 60 * 1000; // 5 minutos
  const t = setInterval(() => {
    const now = Date.now();
    setPresenceByUserId((prev) => {
      if (!prev || typeof prev !== "object") return prev;
      let changed = false;
      const next = { ...prev };
      for (const [uid, st] of Object.entries(prev)) {
        const last = st?.lastSeen || 0;
        const online = Boolean(st?.online);
        if (online && last && now - last > ttlMs) {
          next[uid] = { ...st, online: false };
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, 15000);

  return () => clearInterval(t);
}, []);

const playersInSession = useMemo(() => {
  const ownerId = campaign?.owner_id != null ? String(campaign.owner_id) : null;

  // Primeiro personagem por usuário (para exibir no painel)
  const firstCharByUserId = new Map();
  for (const t of mentionTargets || []) {
    const uid = t?.userId != null ? String(t.userId) : null;
    if (!uid) continue;
    if (!firstCharByUserId.has(uid)) {
      firstCharByUserId.set(uid, { label: t.label, characterId: t.characterId || null });
    }
  }

  const out = [];
  const seen = new Set();

  for (const p of campaignParticipants || []) {
    const uid = p?.id != null ? String(p.id) : null;
    if (!uid || seen.has(uid)) continue;
    seen.add(uid);

    const isGMRow =
      (p?.role && String(p.role).toLowerCase() === "gm") ||
      (ownerId && uid === ownerId);

    const char = firstCharByUserId.get(uid);
    const displayName = isGMRow ? "Mestre" : (char?.label || p?.name || `Jogador ${uid.slice(0, 6)}`);
    const participantName = p?.name || null;

    const st = presenceByUserId?.[uid] || null;
    const online = Boolean(st?.online);

    out.push({
      userId: uid,
      displayName,
      participantName,
      isGM: isGMRow,
      characterId: char?.characterId || null,
      online,
      lastSeen: st?.lastSeen || 0,
    });
  }

  // Se por algum motivo o participante atual não veio no endpoint, garante o "eu".
  if (user?.id != null) {
    const uid = String(user.id);
    if (!seen.has(uid)) {
      const char = firstCharByUserId.get(uid);
      const isGMRow = ownerId && uid === ownerId;
      const st = presenceByUserId?.[uid] || null;
      out.push({
        userId: uid,
        displayName: isGMRow ? "Mestre" : (char?.label || user?.username || user?.email || `Jogador ${uid.slice(0, 6)}`),
        participantName: user?.username || user?.email || null,
        isGM: isGMRow,
        characterId: char?.characterId || null,
        online: Boolean(st?.online) || socketRef.current?.connected === true,
        lastSeen: st?.lastSeen || 0,
      });
    }
  }

  // Ordena: GM primeiro, depois online, depois alfabético
  out.sort((a, b) => {
    if (a.isGM !== b.isGM) return a.isGM ? -1 : 1;
    if (a.online !== b.online) return a.online ? -1 : 1;
    return String(a.displayName).localeCompare(String(b.displayName), "pt-BR", { sensitivity: "base" });
  });

  return out;
}, [campaign?.owner_id, campaignParticipants, mentionTargets, presenceByUserId, user?.id, user?.username, user?.email]);

const playersOnlineCount = useMemo(
  () => playersInSession.filter((p) => p.online).length,
  [playersInSession]
);

const openWhisperToUser = useCallback((row) => {
  if (!row?.userId) return;
  // Não abre whisper para si mesmo
  if (user?.id != null && String(user.id) === String(row.userId)) return;

  setWhisperTarget({
    userId: String(row.userId),
    label: row.displayName || "Jogador",
    characterId: row.characterId ? String(row.characterId) : null,
  });

  // Garante foco imediato no input
  setTimeout(() => chatInputRef.current?.focus(), 0);
}, [setWhisperTarget, user?.id]);

const muteStorageKey = useMemo(() => `dnd:campaign:${campaignId}:mutedUsers`, [campaignId]);
const hintStorageKey = useMemo(() => `dnd:campaign:${campaignId}:chatHintSeen`, [campaignId]);

const [mutedUserIds, setMutedUserIds] = useState(() => {
  try {
    const raw = localStorage.getItem(muteStorageKey);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.map(String) : [];
  } catch {
    return [];
  }
});

useEffect(() => {
  try {
    localStorage.setItem(muteStorageKey, JSON.stringify(mutedUserIds));
  } catch {}
}, [mutedUserIds, muteStorageKey]);

const toggleMuteUser = useCallback((row) => {
  if (!row?.userId) return;
  const uid = String(row.userId);
  setMutedUserIds((prev) => (prev.includes(uid) ? prev.filter((x) => x !== uid) : [...prev, uid]));
}, []);

const isUserMuted = useCallback((userId) => mutedUserIds.includes(String(userId)), [mutedUserIds]);


const playersPanelStorageKey = useMemo(() => `dnd:campaign:${campaignId}:playersPanelOpen`, [campaignId]);
const [isPlayersPanelOpen, setIsPlayersPanelOpen] = useState(() => {
  try {
    const raw = localStorage.getItem(playersPanelStorageKey);
    if (raw == null) return true;
    return raw === "1" || raw === "true";
  } catch {
    return true;
  }
});

// Presença (heurística incremental):

// Persistência do painel de jogadores (localStorage):
useEffect(() => {
  try {
    localStorage.setItem(playersPanelStorageKey, isPlayersPanelOpen ? "1" : "0");
  } catch {}
}, [isPlayersPanelOpen, playersPanelStorageKey]);
// Carrega participantes e alvos de @mention (por NOME DO PERSONAGEM)
useEffect(() => {
  if (authLoading) return;
  if (!user?.id) return;
  if (!campaignId) return;

  let alive = true;

  (async () => {
    // 1) Participantes (GM + players) — útil para permissões/UX
    try {
      const { data } = await api.get(`/campaigns/${campaignId}/participants`);
      const list = Array.isArray(data?.participants) ? data.participants : [];
      if (!alive) return;
      setCampaignParticipants(
        list.map((p) => ({
          id: String(p.id),
          name: p.name || p.username || p.email || String(p.id).slice(0, 8),
          role: p.role || "player",
        }))
      );
    } catch {
      if (!alive) return;
      setCampaignParticipants([]);
    }

    // 2) Alvos de @mention baseados em PERSONAGENS (nome → userId)
    // Usa o endpoint já existente /campaigns/:id/characters
    try {
      const { data } = await api.get(`/campaigns/${campaignId}/characters`);
      const rows = Array.isArray(data) ? data : Array.isArray(data?.characters) ? data.characters : [];
      if (!alive) return;

      // Dedup por label normalizado, mas permite colisões adicionando sufixo.
      const seen = new Map();
      const out = [];

      for (const r of rows) {
        const userId = r?.user_id != null ? String(r.user_id) : r?.userId != null ? String(r.userId) : null;
        const characterId = r?.character_id != null ? String(r.character_id) : r?.id != null ? String(r.id) : null;
        const labelRaw = (r?.name || r?.character_name || r?.characterName || "").trim();
        if (!userId || !labelRaw) continue;

        const baseKey = normalizeNick(labelRaw);
        const count = (seen.get(baseKey) || 0) + 1;
        seen.set(baseKey, count);

        const label = count === 1 ? labelRaw : `${labelRaw} (${count})`;

        out.push({
          userId,
          characterId,
          label,
        });
      }

      setMentionTargets(out);
    } catch {
      if (!alive) return;
      setMentionTargets([]);
    }
  })();

  return () => {
    alive = false;
  };
}, [authLoading, user?.id, campaignId]);

// Hint: mostra só na primeira interação
useEffect(() => {
  try {
    const seen = localStorage.getItem(hintStorageKey);
    if (!seen) setShowChatHint(true);
  } catch {
    setShowChatHint(true);
  }
}, [hintStorageKey]);

const mutedSet = useMemo(() => new Set(mutedUserIds.map(String)), [mutedUserIds]);

const mentionCandidates = useMemo(() => {
  const q = normalizeNick(mentionQuery);
  if (!q) return mentionTargets;
  return mentionTargets.filter((t) => normalizeNick(t.label).includes(q));
}, [mentionTargets, mentionQuery]);

const EMOJI_SET = useMemo(
  () => [
    "😀","😄","😂","🤣","😉","😊","😍","😎",
    "😡","😈","😭","🙏","👍","👎","👏","🔥",
    "✨","💀","🎲","🗡️","🛡️","🧙","🧟","🧪",
    "🩸","🕯️","🗺️","📜","⚔️","🏹","💎","🎭"
  ],
  []
);

// Fecha popover de emoji ao clicar fora
useEffect(() => {
  const onDown = (ev) => {
    const pop = emojiPopoverRef.current;
    const isBtn = ev.target?.closest?.(`.${ui.emojiBtn}`);
    if (isEmojiOpen && pop && !pop.contains(ev.target) && !isBtn) setIsEmojiOpen(false);
  };
  window.addEventListener("mousedown", onDown);
  return () => window.removeEventListener("mousedown", onDown);
}, [isEmojiOpen]);

  const [initiativeEntries, setInitiativeEntries] = useState([]);

  useEffect(() => {
    initiativeEntriesRef.current = initiativeEntries;
  }, [initiativeEntries]);
  const [initiativeName, setInitiativeName] = useState("");
  const [initiativeValue, setInitiativeValue] = useState("");

  const fileInputRef = useRef(null);
  const mapContainerRef = useRef(null);
  const chatEndRef = useRef(null);
  const chatScrollRef = useRef(null);
  const [chatIsAtBottom, setChatIsAtBottom] = useState(true);
  const [chatUnseenCount, setChatUnseenCount] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduceMotion(!!mq.matches);
    apply();
    // Safari/old Chrome
    if (mq.addEventListener) mq.addEventListener("change", apply);
    else mq.addListener(apply);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", apply);
      else mq.removeListener(apply);
    };
  }, []);

  const isChatNearBottom = () => {
    const el = chatScrollRef.current;
    if (!el) return true;
    const threshold = 90; // px
    return el.scrollHeight - (el.scrollTop + el.clientHeight) <= threshold;
  };

  const handleChatScroll = () => {
    const near = isChatNearBottom();
    setChatIsAtBottom(near);
    if (near) setChatUnseenCount(0);
  };

  // =========================
  // GRID SETTINGS
  // =========================
  const [gridEnabled, setGridEnabled] = useState(true);
  const [gridSnapEnabled, setGridSnapEnabled] = useState(true);
  const [gridDivisions, setGridDivisions] = useState(GRID_DEFAULT_DIVISIONS);

  // =========================
  // RÉGUA (RULER) - RECOLOCADA (sem remover as outras lógicas)
  // =========================
  const [ruler, setRuler] = useState({
    active: false,
    dragging: false,
    start: null, // {xPct,yPct}
    end: null, // {xPct,yPct}
  });

  const rulerRef = useRef(ruler);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const showToast = (message, type = "success") => setToast({ message, type });

  useEffect(() => {
    rulerRef.current = ruler;
  }, [ruler]);

  const clearRuler = useCallback(() => {
    setRuler({ active: false, dragging: false, start: null, end: null });
  }, []);

  // =========================
  // AOE (ÁREAS DE EFEITO)
  // =========================
  const [aoe, setAoe] = useState({
    active: false,
    type: null, // 'circle', 'cone', 'rect'
    dragging: false,
    start: null, // {x, y} em %
    end: null,   // {x, y} em %
  });

  
  const aoeRef = useRef(null);
  useEffect(() => { aoeRef.current = aoe; }, [aoe]);
// ESC limpa a régua se ativa
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        if (rulerRef.current?.active || rulerRef.current?.dragging) clearRuler();
        if (aoeRef.current?.active || aoeRef.current?.dragging) {
          setAoe({ active: false, type: null, dragging: false, start: null, end: null });
        }
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [clearRuler]);

  // =========================
  // FOG OF WAR (VISUAL MELHORADO)
  // =========================
  const [fogEnabled, setFogEnabled] = useState(true);
  const [fogBrushSize, setFogBrushSize] = useState(55);
  const [fogOpacity, setFogOpacity] = useState(0.95);

  const fogCanvasRef = useRef(null);
  const fogIsDrawingRef = useRef(false);
  const fogCurrentStrokeRef = useRef(null);

  const fogPointerDownRef = useRef(false);
  const finishFogStrokeRef = useRef(null);

  // strokes guardados para sincronização
  const fogStrokesRef = useRef([]); // [{type:'stroke', size, points:[{x,y}...]}]

  // ref com markers atual
  const markersRef = useRef([]);
  useEffect(() => {
    markersRef.current = markers;
  }, [markers]);

  function getFogCtx() {
    const c = fogCanvasRef.current;
    if (!c) return null;
    return c.getContext("2d");
  }

  function ensureFogCanvasSize() {
    const c = fogCanvasRef.current;
    const el = mapContainerRef.current;
    if (!c || !el) return;

    const rect = el.getBoundingClientRect();
    const w = Math.max(1, Math.floor(rect.width));
    const h = Math.max(1, Math.floor(rect.height));

    if (c.width !== w || c.height !== h) {
      c.width = w;
      c.height = h;
    }
  }

  function fogFillAll() {
    const c = fogCanvasRef.current;
    const ctx = getFogCtx();
    if (!c || !ctx) return;

    ctx.globalCompositeOperation = "source-over";
    ctx.clearRect(0, 0, c.width, c.height);

    if (fogEnabled) {
      ctx.fillStyle = `rgba(0,0,0,${fogOpacity})`;
      ctx.fillRect(0, 0, c.width, c.height);
    }
  }

  function fogEraseLine(p1Norm, p2Norm, size) {
    const ctx = getFogCtx();
    const c = fogCanvasRef.current;
    if (!ctx || !c) return;

    const x1 = p1Norm.x * c.width;
    const y1 = p1Norm.y * c.height;
    const x2 = p2Norm.x * c.width;
    const y2 = p2Norm.y * c.height;

    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "rgba(0,0,0,1)";
    ctx.lineWidth = size;

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.restore();
  }

  function fogEraseDot(pNorm, size) {
    const ctx = getFogCtx();
    const c = fogCanvasRef.current;
    if (!ctx || !c) return;

    const x = pNorm.x * c.width;
    const y = pNorm.y * c.height;

    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(x, y, Math.max(1, size / 2), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  const applyFogStroke = useCallback((stroke) => {
    if (!stroke || stroke.type !== "stroke" || !Array.isArray(stroke.points)) return;
    const pts = stroke.points;
    const size = stroke.size || 50;

    if (pts.length === 1) {
      fogEraseDot(pts[0], size);
      return;
    }

    for (let i = 1; i < pts.length; i++) {
      fogEraseLine(pts[i - 1], pts[i], size);
    }
  }, []);

  const redrawFogFromStrokes = useCallback(() => {
    ensureFogCanvasSize();
    fogFillAll();
    for (const s of fogStrokesRef.current) applyFogStroke(s);
  }, [applyFogStroke, fogEnabled, fogOpacity]);

  const resizeFogCanvasToContainer = useCallback(() => {
    redrawFogFromStrokes();
  }, [redrawFogFromStrokes]);



  const finishFogStroke = useCallback(() => {
    if (!fogIsDrawingRef.current) return;

    fogIsDrawingRef.current = false;

    const finalStroke = fogCurrentStrokeRef.current;
    fogCurrentStrokeRef.current = null;
    fogPointerDownRef.current = false;

    if (!finalStroke || !Array.isArray(finalStroke.points) || finalStroke.points.length < 1) return;

    fogStrokesRef.current.push(finalStroke);

    const socket = socketRef.current;
    if (socket && campaignId && user?.id) {
      socket.emit("fog_update", {
        campaignId,
        stroke: finalStroke,
        senderId: user.id,
        at: Date.now(),
      });

      // mantém estado consistente para late-join / resync
      if (sessionRole === "GM") {
        socket.emit("gm_update_state", {
          campaignId,
          maps,
          currentMapIndex,
          initiativeEntries,
          fogStrokes: fogStrokesRef.current,
        weatherByMap,
          senderId: user.id,
        });
      }
    }
  }, [campaignId, user?.id, sessionRole, maps, currentMapIndex, initiativeEntries]);

  useEffect(() => {
    finishFogStrokeRef.current = finishFogStroke;
  }, [finishFogStroke]);

  useEffect(() => {
    redrawFogFromStrokes();

    const onResize = () => redrawFogFromStrokes();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [fogOpacity, fogEnabled, campaignId, redrawFogFromStrokes]);

  useEffect(() => {
    const el = mapContainerRef.current;
    if (!el) return;
    if (typeof ResizeObserver === "undefined") return;

    const ro = new ResizeObserver(() => {
      markUserActive(user?.id);

      redrawFogFromStrokes();
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, [redrawFogFromStrokes]);

  useEffect(() => {
    const onWinMouseUp = () => {
      if (fogIsDrawingRef.current) finishFogStrokeRef.current?.();
      // Finaliza régua também se estiver arrastando
      const r = rulerRef.current;
      if (r?.dragging) {
        setRuler((p) => ({ ...p, dragging: false, active: true }));
      }
    };
    const onWinBlur = () => {
      if (fogIsDrawingRef.current) finishFogStrokeRef.current?.();
      const r = rulerRef.current;
      if (r?.dragging) {
        setRuler((p) => ({ ...p, dragging: false, active: true }));
      }
    };

    window.addEventListener("mouseup", onWinMouseUp, true);
    window.addEventListener("blur", onWinBlur, true);

    return () => {
      window.removeEventListener("mouseup", onWinMouseUp, true);
      window.removeEventListener("blur", onWinBlur, true);
    };
  }, []);

  const clearFogNow = useCallback(() => {
    if (sessionRole !== "GM") return;

    fogStrokesRef.current = [];
    redrawFogFromStrokes();

    const socket = socketRef.current;
    if (socket && campaignId && user?.id) {
      socket.emit("fog_clear", {
        campaignId,
        senderId: user.id,
        at: Date.now(),
      });

      socket.emit("gm_update_state", {
        campaignId,
        maps,
        currentMapIndex,
        initiativeEntries: initiativeEntriesRef.current,
        fogStrokes: [],
        weatherByMap,
        senderId: user.id,
      });
    }
  }, [sessionRole, redrawFogFromStrokes, campaignId, user?.id, maps, currentMapIndex, initiativeEntries]);

  // =========================
  // CONTEXT MENU
  // =========================

  const [contextMenu, setContextMenu] = useState({ open: false, x: 0, y: 0, index: null });

  const closeContextMenu = useCallback(() => {
    setContextMenu((p) => ({ ...p, open: false, index: null }));
  }, []);

  const ctxMenuRef = useRef(null);

  useEffect(() => {
    if (!contextMenu.open) return;

    const isInsideMenu = (evt) => {
      const el = ctxMenuRef.current;
      return el && (el === evt.target || el.contains(evt.target));
    };

    const onDown = (evt) => {
      if (isInsideMenu(evt)) return;
      closeContextMenu();
    };

    const onEsc = (e) => {
      if (e.key === "Escape") closeContextMenu();
    };

    window.addEventListener("mousedown", onDown, true);
    window.addEventListener("wheel", onDown, true);
    window.addEventListener("resize", onDown, true);
    window.addEventListener("keydown", onEsc, true);

    return () => {
      window.removeEventListener("mousedown", onDown, true);
      window.removeEventListener("wheel", onDown, true);
      window.removeEventListener("resize", onDown, true);
      window.removeEventListener("keydown", onEsc, true);
    };
  }, [contextMenu.open, closeContextMenu]);

  const currentMap = useMemo(() => maps[Math.min(currentMapIndex, Math.max(0, maps.length - 1))], [maps, currentMapIndex]);

  // =========================
  // REALTIME MARKERS
  // =========================
  const lastMarkersEmitRef = useRef(0);
  const emitTimerRef = useRef(null);
  const isApplyingRemoteRef = useRef(false);
  const EMIT_MARKERS_THROTTLE_MS = 50;

  const emitMarkersUpdate = useCallback(
    (nextMarkers, mode = "throttled") => {
      const socket = socketRef.current;
      if (!socket || !campaignId) return;
      if (!user?.id) return;
      if (isApplyingRemoteRef.current) return;

      const payload = {
        campaignId,
        markers: nextMarkers,
        senderId: user.id,
        at: Date.now(),
      };

      const doEmit = () => {
        socket.emit("markers_update", payload);
        socket.emit("update_markers", payload);
        socket.emit("markers_updated", payload);
        socket.emit("session_markers_update", payload);
      };

      if (mode === "immediate") {
        doEmit();
        return;
      }

      const now = Date.now();
      const elapsed = now - lastMarkersEmitRef.current;

      if (elapsed >= EMIT_MARKERS_THROTTLE_MS) {
        lastMarkersEmitRef.current = now;
        doEmit();
        return;
      }

      if (emitTimerRef.current) clearTimeout(emitTimerRef.current);
      emitTimerRef.current = setTimeout(() => {
        lastMarkersEmitRef.current = Date.now();
        doEmit();
      }, EMIT_MARKERS_THROTTLE_MS - elapsed);
    },
    [campaignId, user?.id]
  );

  // =========================
  // STATUS MODAL (condições do token)
  // =========================
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [statusModalIndex, setStatusModalIndex] = useState(null);
  const [statusModalSelected, setStatusModalSelected] = useState([]);

  const openStatusModal = useCallback(
  (index) => {
  const m = markersRef.current?.[index];
  if (!m) return;
  if (sessionRole !== "GM" && m.ownerKey !== user?.id) {
  alert("Você só pode editar o status dos seus próprios marcadores.");
  return;
  }
  setStatusModalIndex(index);
  setStatusModalSelected(Array.isArray(m.status) ? m.status : []);
  setStatusModalOpen(true);
  },
  [sessionRole, user?.id]
  );

  const closeStatusModal = useCallback(() => {
  setStatusModalOpen(false);
  setStatusModalIndex(null);
  }, []);

  const toggleStatusKey = useCallback((key) => {
  setStatusModalSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }, []);

  const saveStatusModal = useCallback(() => {
  if (statusModalIndex == null) return;

  setMarkers((prev) => {
  const next = prev.map((item, i) => (i === statusModalIndex ? { ...item, status: statusModalSelected } : item));
  emitMarkersUpdate(next, "immediate");
  return next;
  });

  closeStatusModal();
  }, [statusModalIndex, statusModalSelected, closeStatusModal, emitMarkersUpdate]);

  useEffect(() => {
  if (!statusModalOpen) return;

  const onKeyDown = (ev) => {
  if (ev.key === "Escape") closeStatusModal();
  if ((ev.ctrlKey || ev.metaKey) && ev.key === "Enter") saveStatusModal();
  };

  window.addEventListener("keydown", onKeyDown);
  return () => window.removeEventListener("keydown", onKeyDown);
  }, [statusModalOpen, closeStatusModal, saveStatusModal]);

  const upsertLogs = useCallback((incoming) => {
    const normalized = normalizeIncomingLogs(incoming);
    if (!normalized.length) return;

    setActionLog((prev) => {
      const seen = new Set(prev.map((x) => x.id || `${x.time}|${x.sender}|${x.message}`));
      const next = [...prev];
      for (const l of normalized) {
        const key = l.id || `${l.time}|${l.sender}|${l.message}`;
        if (!seen.has(key)) {
          seen.add(key);
          next.push(l);
        }
      }
      return next;
    });

    for (const l of normalized) {
      if (l?.type === "dice" && l.rawRoll) setLastRoll(l.rawRoll);
      if ((l?.type === "roll" || l?.type === "dice_roll") && l.rawRoll) setLastRoll(l.rawRoll);
    }
  }, []);

  // ✅ Carrega campanha somente após auth
  useEffect(() => {
    if (authLoading) return;
    if (!user?.id) return;

    if (!campaignId) {
      setLoading(false);
      setError("ID inválido.");
      return;
    }
    if (!campaign) setLoading(true);

    const quoteInterval = setInterval(() => {
      setLoadingQuote(LOADING_QUOTES[Math.floor(Math.random() * LOADING_QUOTES.length)]);
    }, 2000);

    const loadData = async () => {
      try {
        const [cRes, chRes] = await Promise.all([api.get(`/campaigns/${campaignId}`), api.get(`/campaigns/${campaignId}/characters`)]);
        const campData = cRes.data.campaign || cRes.data;
        setCampaign(campData);

        setSessionRole(campData.owner_id === user.id ? "GM" : "PLAYER");

        if (campData.session_state && typeof campData.session_state === "object") {
          const st = campData.session_state;

          // Estado da sessão pode variar conforme versões do backend; aceitamos chaves alternativas.
          const stMaps = st.maps || st.mapList || st.map_list || [];
          if (Array.isArray(stMaps)) setMaps(stMaps.map((mp) => ({ ...mp, src: toAbsoluteMapUrl(mp.src) })));

          const stMarkers = st.markers || st.tokens || st.markerList || st.marker_list;
          if (Array.isArray(stMarkers)) setMarkers(stMarkers);

          const stInitiative = st.initiative || st.initiativeEntries || st.initiative_entries;
          if (Array.isArray(stInitiative)) setInitiativeEntries(stInitiative);

          const idxRaw = st.currentMapIndex ?? st.mapIndex ?? st.current_map_index ?? 0;
          if (idxRaw !== undefined && idxRaw !== null) setCurrentMapIndex(Number(idxRaw) || 0);

          if (st.fogStrokes && Array.isArray(st.fogStrokes)) {
            fogStrokesRef.current = st.fogStrokes;
          } else {
            fogStrokesRef.current = [];
          }
        }

        const list = Array.isArray(chRes.data) ? chRes.data : chRes.data.characters || [];
        setCharacters(list);
        setMyCharacters(list.filter((c) => c.user_id === user.id));
      } catch (err) {
        console.error(err);
        if (!campaign) setError("Falha ao conectar à sessão.");
      } finally {
        setTimeout(() => {
          setLoading(false);
          clearInterval(quoteInterval);
          redrawFogFromStrokes();
        }, 200);
      }
    };

    loadData();
    return () => clearInterval(quoteInterval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId, user?.id, authLoading, redrawFogFromStrokes]);

  useEffect(() => {
    if (selectedCharId) {
      const found = characters.find((c) => c.id === selectedCharId);
      if (found) setCharacterSheet(found);
      else {
        api
          .get(`/characters/${selectedCharId}`)
          .then((res) => setCharacterSheet(res.data.character || res.data))
          .catch(console.warn);
      }
    } else {
      setCharacterSheet(null);
    }
  }, [selectedCharId, characters]);

  useEffect(() => {
    // Auto-scroll inteligente:
    // - se o usuário estiver no fim, mantém a visão no fim
    // - se estiver lendo acima, não "puxa" e acumula contador
    const near = isChatNearBottom();
    if (near) {
      chatEndRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
      setChatIsAtBottom(true);
      setChatUnseenCount(0);
    } else {
      setChatUnseenCount((c) => c + 1);
      setChatIsAtBottom(false);
    }
  }, [actionLog, reduceMotion]);

  // =========================
  // SOCKET (✅ atualizado com token para permissões)
  // =========================
  useEffect(() => {
    if (!campaignId) return;
    if (authLoading) return;
    if (!user?.id) return;

    const token = localStorage.getItem("token");

    const socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      withCredentials: true,
      auth: token ? { token } : {},
      query: token ? { token } : {},
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 400,
      reconnectionDelayMax: 2500,
      timeout: 20000,
    });

    const onMapPing = (payload) => {
      const data = payload?.data ?? payload;
      if (!data) return;
      if (data.senderId && user?.id && String(data.senderId) === String(user.id)) return;

      const bursts = Number(data.bursts) > 0 ? Number(data.bursts) : 1;
      const baseId = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
      for (let b = 0; b < bursts; b++) {
        const ping = {
          id: `${baseId}_${b}`,
          x: data.x,
          y: data.y,
          color: data.color || "#22C55E",
          senderId: data.senderId,
          senderName: data.senderName,
          at: Date.now() + b * 220,
          burstIndex: b,
        };
        setTimeout(() => addLocalPing(ping, { withSound: b === 0 }), b * 220);
      }
    };
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("join_campaign", campaignId);
      socket.emit("join_campaign", { campaignId });

      socket.emit("request_log_history", campaignId);
      socket.emit("request_log_history", { campaignId });
      socket.emit("get_log_history", campaignId);
      socket.emit("get_log_history", { campaignId });
      socket.on("map_ping", onMapPing);

      markUserActive(user?.id);

      redrawFogFromStrokes();
    });

    socket.on("connect_error", (err) => {
      console.error("[SOCKET] connect_error:", err?.message || err);
    });

    socket.on("disconnect", () => {
      markUserOffline(user?.id);
    });

    socket.on("receive_log", (payload) => upsertLogs(payload));
    socket.on("receive_logs", (payload) => upsertLogs(payload));
    socket.on("log_history", (payload) => upsertLogs(payload));
    socket.on("receive_log_history", (payload) => upsertLogs(payload));

// Chat da campanha (público + sussurro)
socket.on("campaign_chat_message", (payload) => {
  const fromUserId = payload?.fromUserId || payload?.senderId || payload?.userId || null;
  const toUserId = payload?.toUserId || null;
  const toName = payload?.toName || null;
  const text = payload?.text ?? payload?.message ?? payload?.msg ?? "";
  if (!text) return;

  markUserActive(fromUserId);

  // Resolve nome do remetente (prioridade: personagem -> mestre -> fallback)
  let fromLabel =
    payload?.fromCharacterName ||
    payload?.fromName ||
    payload?.sender ||
    payload?.username ||
    payload?.fromUserName ||
    null;

  const isSenderGM =
    payload?.isGM === true ||
    (campaign?.owner_id != null && fromUserId != null && String(campaign.owner_id) === String(fromUserId));

  if (!fromLabel) {
    if (isSenderGM) {
      fromLabel = "Mestre";
    } else if (fromUserId != null) {
      const byOwner = (characters || []).find((c) => String(c.user_id ?? c.userId ?? c.owner_id ?? c.ownerId ?? "") === String(fromUserId));
      fromLabel = byOwner?.name || "User";
    } else {
      fromLabel = "User";
    }
  } else {
    if (isSenderGM) fromLabel = "Mestre";
  }
const kind = payload?.kind || payload?.type || payload?.msgType || null;

// /say: spawn de balão diegético (sem duplicar o próprio envio)
if (kind === "say" && !toUserId) {
  const nonce = payload?.clientNonce || null;
  const selfId = user?.id != null ? String(user.id) : null;

  let shouldSpawn = true;
  if (nonce && sentSayNoncesRef.current.has(nonce)) {
    // Já spawnou localmente; evita duplicação.
    shouldSpawn = false;
    sentSayNoncesRef.current.delete(nonce);
  } else if (nonce && selfId && fromUserId && String(fromUserId) === selfId) {
    // Segurança extra: se vier do próprio user sem nonce conhecido, evita eco duplo.
    shouldSpawn = false;
  }

  if (shouldSpawn) {
    spawnSayBubble({
      text,
      fromUserId: fromUserId != null ? String(fromUserId) : null,
      fromCharacterId: payload?.fromCharacterId != null ? String(payload.fromCharacterId) : null,
      fromName: fromLabel,
      fromCharacterName: payload?.fromCharacterName || payload?.fromCharacter?.name || null,
      clientNonce: nonce,
    });
  }
}



  const prefix = toUserId ? `🔒 para ${toName || "alguém"}: ` : "";
  upsertLogs({
    id: payload?.id || `${payload?.ts || Date.now()}|${fromLabel}|${text}|chat`,
    time: formatTime(new Date(payload?.ts || Date.now())),
    message: `${prefix}${text}`,
    type: "chat",
    sender: fromLabel,
    senderId: fromUserId != null ? String(fromUserId) : null,
    toUserId: toUserId != null ? String(toUserId) : null,
    toName: toName != null ? String(toName) : null,
    isWhisper: Boolean(toUserId),
  });
});

    const applyMarkersFromRemote = (incoming) => {
      const data = incoming?.data ?? incoming;
      if (!data) return;
      if (data.senderId && user?.id && data.senderId === user.id) return;
      if (!Array.isArray(data.markers)) return;

      isApplyingRemoteRef.current = true;
      try {
        setMarkers(data.markers);
      } finally {
        setTimeout(() => {
          isApplyingRemoteRef.current = false;
        }, 0);
      }
    };

    
    // Modo Cinemático (GM) - sincronizado via Socket
    socket.on("cinematic_mode", (payload) => {
      const data = payload?.data ?? payload;
      if (!data) return;

      const enabled = Boolean(data.enabled);
      setCinematic((prev) => ({
        ...prev,
        enabled,
        splashUrl: data.splashUrl ?? prev.splashUrl ?? null,
        focus: data.focus ?? prev.focus ?? null,
        by: data.byUserId != null ? String(data.byUserId) : prev.by ?? null,
      }));

      // Players: força HUD fechado ao ativar
      if (enabled && !isGM) {
        setShowLeftPanel(false);
        setShowRightPanel(false);
        setContextMenu((p) => ({ ...p, open: false }));
      }
    });

    // Cinematic Focus (clique livre) - sincronizado via Socket
    socket.on("cinematic_focus", (payload) => {
      const data = payload?.data ?? payload;
      if (!data) return;
      if (data.campaignId && campaignId && String(data.campaignId) !== String(campaignId)) return;

      const xPct = Number(data.xPct);
      const yPct = Number(data.yPct);
      if (!Number.isFinite(xPct) || !Number.isFinite(yPct)) return;

      applyCinematicFocus(xPct, yPct);
    });

socket.on("markers_update", applyMarkersFromRemote);
    socket.on("update_markers", applyMarkersFromRemote);
    socket.on("markers_updated", applyMarkersFromRemote);
    socket.on("session_markers_update", applyMarkersFromRemote);

    socket.on("fog_update", (incoming) => {
      const data = incoming?.data ?? incoming;
      if (!data) return;
      if (data.senderId && user?.id && data.senderId === user.id) return;

      if (data.stroke) {
        fogStrokesRef.current.push(data.stroke);
        applyFogStroke(data.stroke);
      }
    });

    socket.on("fog_clear", (incoming) => {
      const data = incoming?.data ?? incoming;
      if (!data) return;
      if (data.senderId && user?.id && data.senderId === user.id) return;

      fogStrokesRef.current = [];
      markUserActive(user?.id);

      redrawFogFromStrokes();
    });

    // =========================
    // EVENT FEED realtime
    // =========================
    const normalizeEventIncoming = (p) => (p?.data ?? p)?.event ?? (p?.data ?? p);
    const upsertEventLocal = (evt) => {
      if (!evt) return;

      const vis = evt.visibility || evt?.data?.visibility;
      if (sessionRole !== "GM" && String(vis) === "gm_only") return;

      setEvents((prev) => {
        const id = evt.id || evt.eventId || evt._id;
        if (!id) return prev;
        const existsIdx = prev.findIndex((x) => String(x.id) === String(id));
        const next = [...prev];
        if (existsIdx >= 0) next[existsIdx] = { ...next[existsIdx], ...evt, id };
        else next.unshift({ ...evt, id });

        next.sort((a, b) => new Date(b.created_at || b.createdAt || 0) - new Date(a.created_at || a.createdAt || 0));
        return next;
      });
    };

    const removeEventLocal = (evtOrId) => {
      const id = typeof evtOrId === "string" ? evtOrId : (evtOrId?.id || evtOrId?.eventId || evtOrId?._id);
      if (!id) return;
      setEvents((prev) => prev.filter((x) => String(x.id) !== String(id)));
    };

    socket.on("events:created", (p) => upsertEventLocal(normalizeEventIncoming(p)));
    socket.on("events:updated", (p) => upsertEventLocal(normalizeEventIncoming(p)));
    socket.on("events:deleted", (p) => removeEventLocal(normalizeEventIncoming(p)));

    socket.on("event_created", (p) => upsertEventLocal(normalizeEventIncoming(p)));
    socket.on("event_updated", (p) => upsertEventLocal(normalizeEventIncoming(p)));
    socket.on("event_deleted", (p) => removeEventLocal(normalizeEventIncoming(p)));

    socket.on("session_state_update", (incoming) => {
      const data = incoming?.data ?? incoming;
      if (!data) return;

      if (data.senderId && user?.id && data.senderId === user.id) return;

      if (Array.isArray(data?.markers)) {
        isApplyingRemoteRef.current = true;
        try {
          setMarkers(data.markers);
        } finally {
          setTimeout(() => (isApplyingRemoteRef.current = false), 0);
        }
      }

      if (Array.isArray(data?.fogStrokes)) {
        fogStrokesRef.current = data.fogStrokes;
        redrawFogFromStrokes();
      }

      if (data?.weatherByMap && typeof data.weatherByMap === "object") {
        setWeatherByMap(data.weatherByMap);
      } else if (data?.weatherState && typeof data.weatherState === "object") {
        // compat
        const ws = data.weatherState;
        setWeatherByMap((prev) => ({
          ...(prev && typeof prev === "object" ? prev : {}),
          [String(data.mapIndex ?? currentMapIndex ?? 0)]: {
            enabled: Boolean(ws.enabled),
            type: String(ws.type || "none"),
            intensity: Math.max(0, Math.min(1, Number(ws.intensity ?? 0.65))),
            seed: ws.seed,
          },
        }));
      }


      if (sessionRole !== "GM") {
        if (Array.isArray(data?.maps)) setMaps(data.maps.map((mp) => ({ ...mp, src: toAbsoluteMapUrl(mp.src) })));

        const idx = data?.currentMapIndex ?? data?.mapIndex;
        if (idx !== undefined) setCurrentMapIndex(Number(idx) || 0);

        if (Array.isArray(data?.initiativeEntries)) setInitiativeEntries(data.initiativeEntries);
        if (Array.isArray(data?.initiative)) setInitiativeEntries(data.initiative);
      }
    });

    return () => {
      if (import.meta?.env?.DEV) {
        disconnectTimerRef.current = setTimeout(() => {
          disconnectTimerRef.current = null;
          try { socket.disconnect(); } catch {}
        }, 250);
      } else {
        socket.disconnect();
      }
    };
  }, [campaignId, sessionRole, upsertLogs, user?.id, authLoading, applyFogStroke, redrawFogFromStrokes]);

  // Carrega eventos ao abrir a aba
  useEffect(() => {
    if (rightTab !== "events") return;
    fetchEvents();
  }, [rightTab, fetchEvents]);

  useEffect(() => {
    if (!user?.id) return;
    if (sessionRole === "GM" && socketRef.current) {
      socketRef.current.emit("gm_update_state", {
        campaignId,
        maps,
        currentMapIndex,
        initiativeEntries: initiativeEntriesRef.current,
        fogStrokes: fogStrokesRef.current,
        weatherByMap,
        senderId: user.id,
      });
    }
  }, [maps, currentMapIndex, initiativeEntries, weatherByMap, sessionRole, campaignId, user?.id]);

  function logAction(message, type = "system", rawRoll = null) {
    const log = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      time: formatTime(new Date()),
      message,
      type,
      rawRoll,
      sender: user?.username || "User",
      senderId: user?.id ? String(user.id) : null,
    };

    if (socketRef.current) {
      socketRef.current.emit("send_log", { campaignId, logEntry: log });
      socketRef.current.emit("send_log", { campaignId, log: log });
      socketRef.current.emit("send_log", { campaignId, entry: log });
      socketRef.current.emit("send_log", campaignId, log);
    } else {
      upsertLogs(log);
    }
  }

  const handleDiceRoll = () => {
    setIsRolling(true);
    setTimeout(() => {
      const q = Math.max(1, parseInt(diceQuantity) || 1);
      const mod = parseInt(rollModifier) || 0;
      const s = parseInt(selectedDice.replace("d", ""));
      const rolls = Array.from({ length: q }, () => Math.floor(Math.random() * s) + 1);

      const sumRolls = rolls.reduce((a, b) => a + b, 0);
      const total = sumRolls + mod;

      const modText = mod >= 0 ? `+${mod}` : `${mod}`;
      const rollText = `[${rolls.join(", ")}]`;
      const who = sessionRole === "GM" ? "Mestre" : user.username;

      const message = `${who} rolou ${q}${selectedDice}${mod !== 0 ? modText : ""}: ${rollText}${mod !== 0 ? ` ${modText}` : ""} = ${total}`;

      logAction(message, "dice", {
        dice: selectedDice,
        qty: q,
        mod,
        rolls,
        total,
      });

      setIsRolling(false);
    }, 400);
  };

  const handleGiveXp = async (amount, charIds) => {
    const targets = characters.filter((c) => charIds.includes(c.id));
    for (const char of targets) {
      let currentXp = parseInt(char.sheet_data?.xp || 0);
      let currentLevel = parseInt(char.level || 1);
      let newXp = currentXp + amount;
      let newLevel = currentLevel;

      while (newLevel < 20 && newXp >= XP_TABLE[newLevel]) newLevel++;

      const leveledUp = newLevel > currentLevel;
      const updatedChar = {
        ...char,
        level: newLevel,
        sheet_data: { ...char.sheet_data, xp: newXp },
      };

      try {
        await api.put(`/campaigns/${campaignId}/characters/${char.id}`, {
          sheet_data: updatedChar.sheet_data,
          level: newLevel,
        });
        setCharacters((prev) => prev.map((c) => (c.id === char.id ? updatedChar : c)));
        if (characterSheet && characterSheet.id === char.id) setCharacterSheet(updatedChar);
        if (leveledUp) logAction(`🎉 ${char.name} subiu para o Nível ${newLevel}!`, "system");
      } catch (err) {
        console.error("Erro ao salvar XP:", err);
      }
    }
    logAction(`O Mestre concedeu ${amount} XP para ${targets.length} herói(s).`, "system");
  };

  // ✅ Upload imagem do token
  const handleUploadTokenImage = async (file) => {
    if (!file) return;
    try {
      setTokenUploading(true);
      const form = new FormData();
      form.append("file", file);

      // CORREÇÃO: Header removido aqui também
      const res = await api.post("/upload", form);

      const url = res.data?.url || res.data?.fileUrl || res.data?.path || res.data?.location;
      if (!url) {
        alert("Upload não retornou URL.");
        return;
      }
      setTokenImageUrl(toAbsoluteMapUrl(url));
    } catch (err) {
      console.error(err);
      alert("Falha ao enviar imagem do token.");
    } finally {
      setTokenUploading(false);
      if (tokenFileInputRef.current) tokenFileInputRef.current.value = "";
    }
  };

  const handleMapClick = (e) => {
    if (contextMenu.open) closeContextMenu();

    // Cinematic Focus (GM): quando armado, o próximo clique livre no mapa vira foco para todos
    if (cinematic.enabled && isGM && cinematicFocusArmed) {
      const evt = e?.nativeEvent ?? e;
      const rect = mapContainerRef.current?.getBoundingClientRect?.();
      if (rect) {
        const xPct = ((Number(evt?.clientX ?? evt?.pageX ?? 0) - rect.left) / rect.width) * 100;
        const yPct = ((Number(evt?.clientY ?? evt?.pageY ?? 0) - rect.top) / rect.height) * 100;

        // desarma antes de emitir para evitar double-fire
        setCinematicFocusArmed(false);

        socketRef.current?.emit("cinematic_focus", {
          campaignId,
          xPct,
          yPct,
          ts: Date.now(),
          byUserId: user?.id != null ? String(user.id) : null,
        });

        applyCinematicFocus(xPct, yPct);
        return;
      }
      // se não tem rect, desarma e cai no fluxo normal
      setCinematicFocusArmed(false);
    }


    // Add token
    if (mapTool !== "add") return;
    if (!mapContainerRef.current) return;

    const rect = mapContainerRef.current.getBoundingClientRect();
    let x = ((e.clientX - rect.left) / rect.width) * 100;
    let y = ((e.clientY - rect.top) / rect.height) * 100;

    x = clamp01to100(x);
    y = clamp01to100(y);

    if (gridEnabled && gridSnapEnabled) {
      const snapped = snapPointToGrid({ x, y }, gridDivisions);
      x = snapped.x;
      y = snapped.y;
    }

    const key = sessionRole === "GM" ? "GM" : user.id;
    const label = sessionRole === "GM" ? "GM" : characterSheet?.name || user.username || "Player";

    const sheetAvatar = selectedMarkerType === "hero" ? characterSheet?.sheet_data?.avatar : null;
    const avatar = sheetAvatar || (tokenImageUrl ? tokenImageUrl : null);

    const defaultMaxHp =
      selectedMarkerType === "hero" ? Number(characterSheet?.sheet_data?.hpMax ?? characterSheet?.sheet_data?.hp ?? 10) : 10;

    const defaultCurrentHp =
      selectedMarkerType === "hero"
        ? Number(characterSheet?.sheet_data?.hpCurrent ?? characterSheet?.sheet_data?.hp ?? defaultMaxHp)
        : defaultMaxHp;

    setMarkers((prev) => {
      const next = [
        ...prev,
        {
          id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          x,
          y,
          label,
          color: selectedColor,
          ownerKey: key,
          avatar,
          type: selectedMarkerType,
          maxHp: Number.isFinite(defaultMaxHp) ? defaultMaxHp : 10,
          currentHp: Number.isFinite(defaultCurrentHp) ? defaultCurrentHp : 10,
          status: [],
        },
      ];
      emitMarkersUpdate(next, "immediate");
      return next;
    });

    setMapTool("move");
  };

  const handleMarkerClick = (e, index) => {
    e.stopPropagation();
    if (mapTool !== "rename") return;
    const m = markers[index];
    if (sessionRole !== "GM" && m.ownerKey !== user.id) return alert("Você só pode renomear seus próprios marcadores.");
    const newName = prompt("Novo nome para o marcador:", m.label);

    if (newName !== null) {
      setMarkers((prev) => {
        const next = prev.map((item, i) => (i === index ? { ...item, label: newName } : item));
        emitMarkersUpdate(next, "immediate");
        return next;
      });
    }
  };

  const handleMarkerStatusMenu = (e, index) => {
    e.preventDefault();
    e.stopPropagation();

    const m = markers[index];
    if (!m) return;

    // Permissão: GM ou dono do token
    if (sessionRole !== "GM" && m.ownerKey !== user.id) return alert("Você só pode editar o status dos seus próprios marcadores.");

    openStatusModal(index);
  };

  const handleMarkerMouseDown = (e, index) => {
    const el = e.currentTarget;
    const marker = markers[index];
    if (!marker) return;

    draggingRef.current = {
      index,
      el,
      lastX: marker.x,
      lastY: marker.y,
    };

    e.stopPropagation();
    if (e.button !== 0) return;
    if (mapTool !== "move") return;
    const m = markers[index];
    if (sessionRole !== "GM" && m.ownerKey !== user.id) return;
    setDraggingMarkerIndex(index);
  };

  // ====== COORD HELPERS (map percent) ======
  const getMapPercentFromEvent = useCallback(
    (clientX, clientY) => {
      const el = mapContainerRef.current;
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      let x = ((clientX - rect.left) / rect.width) * 100;
      let y = ((clientY - rect.top) / rect.height) * 100;
      x = clamp01to100(x);
      y = clamp01to100(y);

      if (gridEnabled && gridSnapEnabled && mapTool !== "fog") {
        // Para régua, snap é útil (fica alinhado ao grid). Para move, já é tratado no move.
        // Aqui só aplicamos no fluxo da régua.
        if (mapTool === "ruler") {
          const snapped = snapPointToGrid({ x, y }, gridDivisions);
          x = snapped.x;
          y = snapped.y;
        }
      }

      return { x, y };
    },
    [gridEnabled, gridSnapEnabled, gridDivisions, mapTool]
  );

  // ===== RULER METRICS =====
  const rulerMetrics = useMemo(() => {
    if (!ruler.start || !ruler.end) return null;

    const dxPct = ruler.end.x - ruler.start.x;
    const dyPct = ruler.end.y - ruler.start.y;

    const div = Math.max(2, Number(gridDivisions) || GRID_DEFAULT_DIVISIONS);
    const cellPct = 100 / div;

    const dxCells = dxPct / cellPct;
    const dyCells = dyPct / cellPct;

    // Distância em "casas" (euclidiana) e em "percent"
    const distCells = Math.sqrt(dxCells * dxCells + dyCells * dyCells);
    const distPct = Math.sqrt(dxPct * dxPct + dyPct * dyPct);

    const mid = { x: (ruler.start.x + ruler.end.x) / 2, y: (ruler.start.y + ruler.end.y) / 2 };

    return {
      dxPct,
      dyPct,
      distPct,
      dxCells,
      dyCells,
      distCells,
      mid,
    };
  }, [ruler.start, ruler.end, gridDivisions]);

  const handleMapMouseDown = (e) => {
    // Fog
    if (mapTool === "fog" && sessionRole === "GM" && fogEnabled && mapContainerRef.current) {
      if (e.button !== 0) return;
      e.preventDefault();

      if (fogPointerDownRef.current) return;
      fogPointerDownRef.current = true;

      fogIsDrawingRef.current = true;

      const rect = mapContainerRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

      fogCurrentStrokeRef.current = {
        type: "stroke",
        size: fogBrushSize,
        points: [{ x, y }],
      };

      fogEraseDot({ x, y }, fogBrushSize);
      return;
    }

    // --- NOVO BLOCO AOE ---
    if (mapTool.startsWith("aoe_") && mapContainerRef.current) {
      if (e.button !== 0) return;
      e.preventDefault();
      const pt = getMapPercentFromEvent(e.clientX, e.clientY);
      if (!pt) return;

      setAoe({
        active: true,
        dragging: true,
        type: mapTool.replace("aoe_", ""), // 'circle', 'cone', 'rect'
        start: pt,
        end: pt,
      });
      return;
    }

    // Ruler
    if (mapTool === "ruler" && mapContainerRef.current) {
      if (e.button !== 0) return;
      e.preventDefault();
      const pt = getMapPercentFromEvent(e.clientX, e.clientY);
      if (!pt) return;

      setRuler({
        active: true,
        dragging: true,
        start: pt,
        end: pt,
      });
      return;
    }
    // Ping (clique longo) - apenas na ferramenta de mover/selecionar
    if (mapTool === "move" && draggingMarkerIndex === null && mapContainerRef.current) {
      pingMovedRef.current = false;

      if (pingTimerRef.current) {
        clearTimeout(pingTimerRef.current);
        pingTimerRef.current = null;
      }

      const rect = mapContainerRef.current.getBoundingClientRect();
      let px = ((e.clientX - rect.left) / rect.width) * 100;
      let py = ((e.clientY - rect.top) / rect.height) * 100;
      px = clamp01to100(px);
      py = clamp01to100(py);

      // Snap do ping à grid (se habilitado)
      if (gridEnabled && gridSnapEnabled) {
        const snapped = snapPointToGrid({ x: px, y: py }, gridDivisions);
        px = snapped.x;
        py = snapped.y;
      }

      pingStartRef.current = { at: Date.now(), x: px, y: py };

      if (e.shiftKey) {
        emitPing(px, py, { bursts: 1, withSound: true });
        return;
      }

      pingTimerRef.current = setTimeout(() => {
        pingTimerRef.current = null;
        if (!pingMovedRef.current) emitPing(px, py, { bursts: isGM ? 3 : 1, withSound: true });
      }, 350);
    }

  };

  const handleMapMouseMove = (e) => {
    // Cancela ping se o mouse se mover antes do tempo
    if (pingTimerRef.current) {
      pingMovedRef.current = true;
    }
    // 1) Fog
    if (mapTool === "fog" && fogIsDrawingRef.current && sessionRole === "GM" && fogEnabled && mapContainerRef.current) {
      const rect = mapContainerRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

      const stroke = fogCurrentStrokeRef.current;
      if (stroke && stroke.points.length > 0) {
        const lastPt = stroke.points[stroke.points.length - 1];
        const currentPt = { x, y };

        fogEraseLine(lastPt, currentPt, fogBrushSize);
        stroke.points.push(currentPt);
      }
      return;
    }

    // 2) Ruler drag
    if (mapTool === "ruler") {
      const r = rulerRef.current;
      if (r?.dragging) {
        const pt = getMapPercentFromEvent(e.clientX, e.clientY);
        if (!pt) return;
        setRuler((p) => ({ ...p, end: pt, active: true }));
      }
      return;
    }

    // --- NOVO BLOCO AOE ---
    if (mapTool.startsWith("aoe_")) {
      if (aoeRef.current?.dragging) {
        const pt = getMapPercentFromEvent(e.clientX, e.clientY);
        if (!pt) return;
        setAoe((p) => ({ ...p, end: pt }));
      }
      return;
    }

    // 3) Drag Markers
    if (draggingMarkerIndex == null || !mapContainerRef.current) return;

    const rect = mapContainerRef.current.getBoundingClientRect();
    let x = ((e.clientX - rect.left) / rect.width) * 100;
    let y = ((e.clientY - rect.top) / rect.height) * 100;

    x = clamp01to100(x);
    y = clamp01to100(y);

    if (gridEnabled && gridSnapEnabled) {
      const snapped = snapPointToGrid({ x, y }, gridDivisions);
      x = snapped.x;
      y = snapped.y;
    }

    // Drag ultra-fluido: move no DOM (sem re-render a cada mousemove)
    if (draggingRef.current && draggingRef.current.el) {
      draggingRef.current.lastX = x;
      draggingRef.current.lastY = y;
      draggingRef.current.el.style.left = `${x}%`;
      draggingRef.current.el.style.top = `${y}%`;
      draggingRef.current.el.style.willChange = "left, top";
    }
    // Commit e sincronização final ficam no mouseup (mantém lógica, melhora performance)
  };

  const handleMapMouseUp = () => {
    // Finaliza ping pendente
    if (pingTimerRef.current) {
      clearTimeout(pingTimerRef.current);
      pingTimerRef.current = null;
    }

    // Se o usuário soltou muito perto do limiar do timer, garante o ping
    if (!pingMovedRef.current && pingStartRef.current && !pingTimerRef.current) {
      const elapsed = Date.now() - pingStartRef.current.at;
      if (elapsed >= 330 && elapsed <= 800) {
        emitPing(pingStartRef.current.x, pingStartRef.current.y, { bursts: isGM ? 3 : 1, withSound: true });
      }
    }
    pingStartRef.current = null;

    // 1) encerra fog
    if (fogIsDrawingRef.current) {
      finishFogStrokeRef.current?.();
      return;
    }

    // --- NOVO BLOCO AOE ---
    if (aoeRef.current?.dragging) {
      setAoe((p) => ({ ...p, dragging: false }));
      return;
    }

    // 2) encerra régua
    const r = rulerRef.current;
    if (r?.dragging) {
      setRuler((p) => ({ ...p, dragging: false, active: true }));
      return;
    }

    // 3) encerra drag de marcador: comita 1x e sincroniza 1x
    if (draggingMarkerIndex !== null && draggingMarkerIndex >= 0 && draggingRef.current) {
      const d = draggingRef.current;
      draggingRef.current = null;

      const finalX = d.lastX;
      const finalY = d.lastY;

      setMarkers((prev) => {
        const next = prev.map((m, idx) => (idx === draggingMarkerIndex ? { ...m, x: finalX, y: finalY } : m));
        emitMarkersUpdate(next, "immediate");
        return next;
      });

      setDraggingMarkerIndex(null);

      try {
        if (d.el) d.el.style.willChange = "auto";
      } catch {}
      return;
    }

    // fallback: garante estado consistente
    setDraggingMarkerIndex(null);
    emitMarkersUpdate(markersRef.current, "immediate");
  };

  const handleMapMouseLeave = () => {
    if (fogIsDrawingRef.current) finishFogStrokeRef.current?.();
    const r = rulerRef.current;
    if (r?.dragging) setRuler((p) => ({ ...p, dragging: false, active: true }));
    if (aoeRef.current?.dragging) setAoe((p) => ({ ...p, dragging: false, active: true })); // Adicione isto
  };

  // ===== CONTEXT MENU ACTIONS =====
  const canEditMarker = useCallback(
    (m) => {
      if (!m) return false;
      if (sessionRole === "GM") return true;
      return m.ownerKey === user?.id;
    },
    [sessionRole, user?.id]
  );

  const openMarkerContextMenu = (e, index) => {
    // React SyntheticEvent pode perder propriedades após o handler.
    // Para garantir coordenadas corretas (evitar cair no canto), usamos nativeEvent e fallbacks.
    const evt = e?.nativeEvent || e;
    evt?.preventDefault?.();
    evt?.stopPropagation?.();

    const m = markers[index];
    if (!canEditMarker(m)) return;

    const margin = 10;
    const menuW = 260;
    const menuH = 190;

    // prefer clientX/clientY (viewport), fallback pageX/pageY
    let x = Number(evt?.clientX ?? evt?.pageX ?? 0);
    let y = Number(evt?.clientY ?? evt?.pageY ?? 0);

    if (!Number.isFinite(x)) x = 0;
    if (!Number.isFinite(y)) y = 0;

    x = Math.max(margin, Math.min(x, window.innerWidth - menuW - margin));
    y = Math.max(margin, Math.min(y, window.innerHeight - menuH - margin));

    setContextMenu({ open: true, x, y, index });
  };

  const handleContextEditHp = () => {
    const idx = contextMenu.index;
    if (idx == null) return;

    const m = markers[idx];
    if (!canEditMarker(m)) {
      closeContextMenu();
      return;
    }

    const cur = Number(m.currentHp ?? 0);
    const max = Number(m.maxHp ?? 0);

    const newMaxRaw = prompt(`HP Máximo de "${m.label}"`, String(max));
    if (newMaxRaw === null) return closeContextMenu();

    const parsedMax = Number(newMaxRaw);
    if (!Number.isFinite(parsedMax) || parsedMax <= 0) {
      alert("HP máximo inválido.");
      return closeContextMenu();
    }

    const newCurRaw = prompt(`HP Atual de "${m.label}"`, String(cur));
    if (newCurRaw === null) return closeContextMenu();

    const parsedCur = Number(newCurRaw);
    if (!Number.isFinite(parsedCur)) {
      alert("HP atual inválido.");
      return closeContextMenu();
    }

    const finalCur = clamp(parsedCur, 0, parsedMax);

    setMarkers((prev) => {
      const next = prev.map((it, i) => (i === idx ? { ...it, maxHp: parsedMax, currentHp: finalCur } : it));
      emitMarkersUpdate(next, "immediate");
      return next;
    });

    closeContextMenu();
  };

  const handleContextDeleteMarker = () => {
    const idx = contextMenu.index;
    if (idx == null) return;

    const m = markers[idx];
    if (!canEditMarker(m)) {
      closeContextMenu();
      return;
    }

    if (!confirm(`Remover marcador "${m.label}"?`)) {
      closeContextMenu();
      return;
    }

    setMarkers((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      emitMarkersUpdate(next, "immediate");
      return next;
    });

    closeContextMenu();
  };

  const handleContextEditStatus = () => {
    const idx = contextMenu.index;
    if (idx == null) return;
    closeContextMenu();
    openStatusModal(idx);
  };

  const handleMarkerContextMenu = (e, index) => {
    openMarkerContextMenu(e, index);
  };

  const saveSessionState = async () => {
    if (sessionRole !== "GM") return { ok: true };
    try {
      const normalizedMarkers = (markers || []).map((m) => ({
        id: m.id ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        x: Number(m.x ?? 0),
        y: Number(m.y ?? 0),
        label: String(m.label ?? ""),
        color: String(m.color ?? "#ffffff"),
        ownerKey: String(m.ownerKey ?? ""),
        avatar: m.avatar ?? null,
        type: String(m.type ?? "hero"),
        maxHp: Number(m.maxHp ?? 10),
        currentHp: Number(m.currentHp ?? m.maxHp ?? 10),
        status: Array.isArray(m.status) ? m.status : [],
      }));

      const normalizedMaps = (maps || []).map((mp) => ({
        id: mp.id ?? Date.now(),
        name: String(mp.name ?? "Mapa"),
        src: toAbsoluteMapUrl(mp.src),
      }));

      const normalizedInitiative = (initiativeEntries || []).map((it) => ({
        id: it.id ?? Date.now(),
        name: String(it.name ?? "Mob"),
        initiative: Number(it.initiative ?? 0),
      }));

      const session_state = {
        maps: normalizedMaps,
        markers: normalizedMarkers,
        initiative: normalizedInitiative,
        mapIndex: Number(currentMapIndex ?? 0),
        fogStrokes: fogStrokesRef.current || [],
        weatherByMap: weatherByMap || {},
        version: 1,
      };

      await api.put(`/campaigns/${campaignId}/session`, { session_state });
      logAction("Sessão salva com sucesso!", "system");
      return { ok: true };
    } catch (err) {
      console.error(err);
      alert("Não foi possível salvar (erro no servidor).");
      return { ok: false };
    }
  };

  // ====== EXPORT (Premium) ======
  const canExport = (user?.role || "").toUpperCase() === "ADMIN" || (user?.plan || "").toUpperCase() === "PREMIUM";

  const handleExportCampaign = async () => {
    if (!campaignId) return;

    if (!canExport) {
      setToast({
        type: "error",
        message: "Exportação disponível apenas no Premium.",
      });
      return;
    }

    try {
      setToast(null);
      const response = await api.get(`/campaigns/${campaignId}/export`, { responseType: "blob" });

      const blob = new Blob([response.data], { type: "application/json" });
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `umbraltable-campaign-${campaignId}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(url);

      setToast({ type: "success", message: "Export gerado. Download iniciado." });
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        (e?.response?.status === 403 ? "Recurso disponível apenas no Premium." : "Falha ao exportar campanha.");
      setToast({ type: "error", message: msg });
    }
  };
  const handleExitRequest = () => {
    if (sessionRole === "GM") setShowExitModal(true);
    else goBack();
  };

  const confirmExit = async (shouldSave) => {
    if (shouldSave) await saveSessionState();
    else if (sessionRole === "GM") {
      setMarkers([]);
      setInitiativeEntries([]);
      fogStrokesRef.current = [];
      redrawFogFromStrokes();
      logAction("Mesa limpa ao sair.", "system");
      emitMarkersUpdate([], "immediate");
      clearFogNow();
    }
    setShowExitModal(false);
    goBack();
  };

  // ====== MAP UPLOAD ======
  const handleAddMapFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const form = new FormData();
      form.append("file", file);

      // CORREÇÃO: Removemos o header manual. O Axios cuida disso.
      const res = await api.post("/upload", form);

      let fileUrl = res.data?.url || res.data?.fileUrl || res.data?.path || res.data?.location;
      if (!fileUrl) {
        alert("Upload não retornou a URL do arquivo.");
        return;
      }

      fileUrl = toAbsoluteMapUrl(fileUrl);

      setMaps((p) => {
        const next = [...p, { id: Date.now() + "_file", name: file.name, src: fileUrl }];
        const nextIndex = next.length - 1;

        setCurrentMapIndex(nextIndex);
        logAction("Mapa carregado.", "system");

        emitGmStateImmediate({ maps: next, currentMapIndex: nextIndex });
        return next;
      });
    } catch (err) {
      console.error(err);
      alert("Falha ao fazer upload do mapa.");
    } finally {
      e.target.value = "";
    }
  };

  const handleSetMapUrl = () => {
    const u = prompt("URL:");
    if (u) {
      const normalized = toAbsoluteMapUrl(u);

      setMaps((p) => {
        const n = [...p, { id: Date.now(), name: `Mapa ${p.length + 1}`, src: normalized }];
        const nextIndex = n.length - 1;

        setCurrentMapIndex(nextIndex);
        emitGmStateImmediate({ maps: n, currentMapIndex: nextIndex });
        return n;
      });
    }
  };

  const handleAddInitiative = () => {
    if (sessionRole !== "GM") return;
    const v = parseInt(initiativeValue);
    if (isNaN(v)) return;
    setInitiativeEntries((p) => [...p, { id: Date.now(), name: initiativeName || "Mob", initiative: v }]);
    setInitiativeName("");
    setInitiativeValue("");
  };

  const handleUpdateCharacterSheet = async (d) => {
    try {
      await api.put(`/campaigns/${campaignId}/characters/${d.id}`, { sheet_data: d.sheet_data, name: d.name, ...d });
      logAction("Ficha atualizada na campanha.");
      setCharacters((prev) => prev.map((c) => (c.id === d.id ? { ...c, sheet_data: d.sheet_data, name: d.name } : c)));
      if (selectedCharId === d.id) {
        setCharacterSheet((prev) => ({ ...prev, sheet_data: d.sheet_data, name: d.name }));
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar.");
    }
  };

  // Derivados (sem Hooks) — evita mudança de ordem de hooks em renderizações com early return
  const isGM = String(campaign?.owner_id || "") === String(user?.id || "");

  const toggleCinematic = useCallback(
    (nextEnabled) => {
      if (!isGM) return;
      const enabled = typeof nextEnabled === "boolean" ? nextEnabled : !cinematic.enabled;

      // Fecha overlays que podem “vazar” em modo cinematográfico.
      setContextMenu((prev) => ({ ...prev, open: false }));
      setIsMapOrderOpen(false);

      setCinematic((prev) => ({
        ...prev,
        enabled,
        by: user?.id != null ? String(user.id) : null,
      }));

      socketRef.current?.emit("cinematic_mode", {
        campaignId,
        enabled,
        ts: Date.now(),
        byUserId: user?.id != null ? String(user.id) : null,
      });
    },
    [isGM, cinematic.enabled, campaignId, user?.id]
  );

  // Se o modo cinematográfico estiver ativo para players, força HUDs/sidebars fechados.
  useEffect(() => {
    if (!cinematic.enabled) return;
    if (isGM) return;
    setShowLeftPanel(false);
    setShowRightPanel(false);
    setContextMenu((prev) => ({ ...prev, open: false }));
  }, [cinematic.enabled, isGM]);
  const selectedCharacter = !selectedCharId
    ? null
    : (characters || []).find((c) => String(c.id) === String(selectedCharId)) || null;
  const senderDisplayName = isGM
    ? "Mestre"
    : (selectedCharacter?.name || user?.display_name || user?.username || "User");

const fetchQuarantine = async () => {
  if (!campaignId) return;
  if (sessionRole !== "GM") return;

  setQuarantineLoading(true);
  setQuarantineError("");
  try {
    const res = await api.get(`/campaigns/${campaignId}/quarantine`);
    setQuarantineData(res.data);

    const initial = {};
    (res.data?.characters || []).forEach((c) => {
      const qm = c?.quarantine_map || {};
      Object.entries(qm).forEach(([itemId, status]) => {
        initial[`${c.character_id}:${itemId}`] = status;
      });
    });
    setQuarantineDecisions(initial);
  } catch (err) {
    console.error(err);
    setQuarantineError(err?.response?.data?.error || "Falha ao carregar quarentena.");
  } finally {
    setQuarantineLoading(false);
  }
};

  const toggleLegacyTarget = (charId) => {
    setLegacyTargets((prev) => (prev.includes(charId) ? prev.filter((x) => x !== charId) : [...prev, charId]));
  };

  const applyLegacyToTargets = async () => {
    if (!isGM) return;
    if (!legacyTargets || legacyTargets.length === 0) return alert("Selecione ao menos um personagem.");
    if (!legacyDraft.markName && !legacyDraft.titleName && !legacyDraft.hookPrompt) {
      return alert("Preencha ao menos uma Marca, Título ou Gancho.");
    }

    setLegacyApplying(true);
    try {
      const append = { marks: [], titles: [], burdens: [], hooks: [] };

      if (legacyDraft.markName) {
        append.marks.push({
          id: `mark_${Date.now()}`,
          name: legacyDraft.markName.trim(),
          description: legacyDraft.markDesc?.trim() || "",
          campaign_id: campaign?.id,
          campaign_name: campaign?.name,
          gm_id: user?.id,
          created_at: new Date().toISOString(),
          visibility: "public",
        });
      }

      if (legacyDraft.titleName) {
        append.titles.push({
          id: `title_${Date.now()}`,
          name: legacyDraft.titleName.trim(),
          granted_by: legacyDraft.titleGrantedBy?.trim() || (campaign?.name ? `Campanha: ${campaign.name}` : ""),
          campaign_id: campaign?.id,
          is_active: true,
          created_at: new Date().toISOString(),
        });
      }

      if (legacyDraft.hookPrompt) {
        append.hooks.push({
          id: `hook_${Date.now()}`,
          prompt: legacyDraft.hookPrompt.trim(),
          campaign_id: campaign?.id,
          created_at: new Date().toISOString(),
          reusable: true,
        });
      }

      // Aplica em lote (sequencial para simplicidade + logs)
      for (const charId of legacyTargets) {
        await api.put(`/characters/${charId}/legacy`, { append });
      }

      setIsLegacyModalOpen(false);
      // Feedback
      showToast(`Legado aplicado a ${legacyTargets.length} personagem(ns).`, "success");
    } catch (e) {
      console.error(e);
      alert(e.response?.data?.error || "Erro ao aplicar legado.");
    } finally {
      setLegacyApplying(false);
    }
  };

const openQuarantine = async () => {
  setIsQuarantineOpen(true);
  await fetchQuarantine();
};
const setDecision = (characterId, itemId, status) => {
  setQuarantineDecisions((prev) => ({
    ...prev,
    [`${characterId}:${String(itemId)}`]: status,
  }));
};
const saveQuarantineDecisions = async () => {
  if (!campaignId) return;
  if (sessionRole !== "GM") return;

  const decisions = [];
  (quarantineData?.characters || []).forEach((c) => {
    const inv = c?.sheet_data?.inventory || [];
    inv.forEach((it) => {
      const itemId = String(it?.id);
      const key = `${c.character_id}:${itemId}`;
      const status = quarantineDecisions[key] || "pending";
      decisions.push({ characterId: c.character_id, itemId, status });
    });
  });

  setQuarantineLoading(true);
  setQuarantineError("");
  try {
    await api.patch(`/campaigns/${campaignId}/quarantine`, { decisions });
    logAction("Quarentena atualizada.", "system");
    await fetchQuarantine();
  } catch (err) {
    console.error(err);
    setQuarantineError(err?.response?.data?.error || "Falha ao salvar decisões.");
  } finally {
    setQuarantineLoading(false);
  }
};
// =========================
  // GRID OVERLAY STYLE
  // =========================
  const gridCell = 100 / Math.max(2, Number(gridDivisions) || GRID_DEFAULT_DIVISIONS);
  const majorEvery = Math.max(2, GRID_BOLD_EVERY);
  const majorStep = gridCell * majorEvery;

  const gridOverlayStyle = {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    zIndex: 5,
    backgroundImage: `
      linear-gradient(to right, rgba(255,255,255,0.14) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(255,255,255,0.14) 1px, transparent 1px),
      linear-gradient(to right, rgba(255,255,255,0.45) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(255,255,255,0.45) 1px, transparent 1px)
    `,
    backgroundSize: `
      ${gridCell}% ${gridCell}%,
      ${gridCell}% ${gridCell}%,
      ${majorStep}% ${majorStep}%,
      ${majorStep}% ${majorStep}%
    `,
    mixBlendMode: fogEnabled && fogOpacity >= 0.7 ? "normal" : "overlay",
    opacity: fogEnabled && fogOpacity >= 0.7 ? 0.65 : 0.45,
    contain: "paint",
    willChange: "opacity",
  };

  if (authLoading) return <div style={styles.loadingScreen}>Restaurando sessão...</div>;
  if (!user?.id)
    return (
      <div style={styles.errorScreen}>
        Sessão expirada. <button onClick={goBack}>Voltar</button>
      </div>
    );

  if (loading) return <div style={styles.loadingScreen}>{loadingQuote}</div>;
  if (error)
    return (
      <div style={styles.errorScreen}>
        {error} <button onClick={goBack}>Voltar</button>
      </div>
    );

  return (
    <div style={styles.container} className="session-shell session-container">

      {/* TOAST */}
      {toast && (
        <div style={{...styles.toast, backgroundColor: toast.type === 'error' ? '#ef4444' : '#22c55e'}}>
          {toast.type === 'error' ? '⚠️ ' : '✅ '} {toast.message}
        </div>
      )}
      <style>{CSS_STYLES}</style>

      {cinematic.enabled && <div className={ui.cinematicVignette} aria-hidden="true" />}
      {cinematic.enabled && isGM && (
        <button
          type="button"
          onClick={() => toggleCinematic()}
          className={ui.cinematicFloatBtn}
          title="Desativar modo Cinemático"
        >
          🎬 Sair do Cinemático
        </button>
      )}

      {cinematic.enabled && isGM && (
        <>
          <button
            type="button"
            onClick={() => setCinematicFocusArmed((v) => !v)}
            className={cinematicFocusArmed ? `${ui.cinematicFloatBtnAlt} ${ui.cinematicFloatBtnAltOn}` : ui.cinematicFloatBtnAlt}
            title={cinematicFocusArmed ? "Clique no mapa para focar (armado)" : "Armar foco cinematográfico (clique livre)"}
          >
            🎯 Focar
          </button>
          {cinematicFocusArmed && (
            <div className={ui.cinematicFocusHint} aria-hidden="true">
              Clique no mapa para focar
            </div>
          )}
        </>
      )}

      {cinematic.enabled && !isGM && (
        <div className={ui.cinematicBadge} aria-hidden="true">Modo Cinemático</div>
      )}

      {/* HEADER */}
      {!cinematic.enabled && (
      <header style={styles.header} className="glass-header">
        <div style={styles.headerLeft}>
          <div style={{ display: "flex", flexDirection: "column", minWidth: 0, justifyContent: "center" }}>
            <div style={styles.heroSelector}>
              <div style={styles.heroAvatar}>
                {characterSheet?.sheet_data?.avatar ? (
                  <img src={characterSheet.sheet_data.avatar} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />
                ) : (
                  <span style={{ fontWeight: 900, color: "#111" }}>{isGM ? "M" : "?"}</span>
                )}
              </div>
              <div style={styles.heroSelectWrap}>
                <select value={selectedCharId} onChange={(e) => setSelectedCharId(e.target.value)} style={styles.heroSelect} className="hero-select">
                  <option value="">{isGM ? "Mestre" : "Selecionar..."}</option>
                  {(isGM ? characters : myCharacters).map((c, idx) => (
                    <option key={c.id || idx} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <span style={styles.selectChevron}>▾</span>
              </div>
            </div>
            {characterSheet && (
              <div style={{ marginTop: -2, padding: "0 4px", maxWidth: 360 }}>
                <XpBar currentXp={parseInt(characterSheet.sheet_data?.xp || 0)} level={parseInt(characterSheet.level || 1)} />
              </div>
            )}
          </div>
          <button onClick={() => setShowLeftPanel(!showLeftPanel)} style={styles.iconBtn} title="Chat">
            💬
          </button>
        </div>
        <div style={styles.headerRight}>
                    {isGM && (
            <button
              onClick={finishCampaignAndOpenLegacyDraft}
              style={{ padding: "6px 12px", background: "#0f172a", color: "#fff", border: "1px solid #334155", borderRadius: 4, cursor: "pointer", marginLeft: 8 }}
              title="Finalizar campanha e gerar rascunho de legado"
              type="button"
            >
              🏁 Finalizar
            </button>
          )}

          <button
            onClick={handleExportDiary}
            style={{ padding: "6px 12px", background: "#0b1220", color: "#e2e8f0", border: "1px solid #334155", borderRadius: 4, cursor: "pointer", marginLeft: 8 }}
            title="Exportar diário da campanha (Markdown)"
            type="button"
          >
            📤 Diário
          </button>
{isGM && (
          <button
        onClick={openQuarantine} style={{padding: "6px 12px", background: "#7a1fa2", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer", marginLeft: 8}}>🛡️ Quarentena
          </button>
          )}
          {isGM && (
            <button
              onClick={openLegacyModal}
              style={{ padding: "6px 12px", background: "#1e293b", color: "#facc15", border: "1px solid #334155", borderRadius: 4, cursor: "pointer", marginLeft: 8 }}
              title="Aplicar Legado Narrativo (Marcas/Títulos/Ganchos)"
              type="button"
            >
              🏛️ Legado
            </button>
          )}
          {isGM && (
            <button onClick={() => setIsXpModalOpen(true)} style={styles.btnXp} title="Dar Experiência" type="button">
              ✨ XP
            </button>
          )}
          {isGM && (
            <button
              onClick={() => toggleCinematic()}
              type="button"
              className={cinematic.enabled ? ui.cinematicBtnOn : ui.cinematicBtn}
              title={cinematic.enabled ? "Desativar modo Cinemático" : "Ativar modo Cinemático"}
            >
              🎬 Cinemático
            </button>
          )}
          <button onClick={() => setShowRightPanel(!showRightPanel)} style={styles.iconBtn} title="Ferramentas" type="button">
            🛠️
          </button>
          <button onClick={() => setIsSheetsOpen(true)} style={styles.btnHeader}>
            📜 Fichas
          </button>
          <button
            onClick={handleExportCampaign}
            style={canExport ? styles.btnHeader : { ...styles.btnHeader, opacity: 0.6 }}
            title={canExport ? "Exportar campanha (JSON)" : "Disponível apenas no Premium"}
            type="button"
          >
            ⬇️ Exportar
          </button>
          <button onClick={handleExitRequest} style={styles.iconBtnDanger} title="Sair">
            ✕
          </button>
        </div>
      </header>
      )}

      <div style={cinematic.enabled ? { ...styles.main, position: "fixed", inset: 0, width: "100vw", height: "100vh", padding: 0, margin: 0, zIndex: 1200 } : styles.main} className={cinematic.enabled ? ui.cinematicMain : ""}>

{/* CHAT */}
{!cinematic.enabled && showLeftPanel && (
  <div style={styles.sidebarLeft} className="sidebar-left">
    <div style={styles.panelHeader}>DIÁRIO</div>

    <div className={ui.playersPanel} aria-label="Jogadores da sessão">
      <button
        type="button"
        className={ui.playersHeader}
        onClick={() => setIsPlayersPanelOpen((v) => !v)}
        aria-expanded={isPlayersPanelOpen}
      >
        <span className={ui.playersTitle}>Jogadores</span>
        <span className={ui.playersMeta}>
          {playersOnlineCount}/{playersInSession.length}
        </span>
        <span className={ui.playersChevron} aria-hidden="true">
          {isPlayersPanelOpen ? "▾" : "▸"}
        </span>
      </button>

      {isPlayersPanelOpen && (
        <div className={ui.playersBody}>
          {playersInSession.map((p) => {
            const muted = isUserMuted(p.userId);
            return (
              <div key={p.userId} className={ui.playerRow}>
                <div className={ui.playerMain}>
                  <span
                    className={`${ui.statusDot} ${p.online ? ui.statusOnline : ui.statusOffline}`}
                    title={p.online ? "Online" : "Offline"}
                    aria-hidden="true"
                  />
                  <span className={ui.playerName}>{p.displayName}</span>
                  {p.isGM && <span className={ui.playerTag}>GM</span>}
                </div>

                <div className={ui.playerActions}>
                  <button
                    type="button"
                    className={ui.playerActionBtn}
                    onClick={() => openWhisperToUser(p)}
                    title="Sussurrar"
                    aria-label={`Sussurrar para ${p.displayName}`}
                  >
                    Sussurrar
                  </button>

                  <button
                    type="button"
                    className={`${ui.playerActionBtn} ${muted ? ui.playerActionBtnActive : ""}`}
                    onClick={() => toggleMuteUser(p)}
                    title={muted ? "Desmutar" : "Mutar"}
                    aria-label={`${muted ? "Desmutar" : "Mutar"} ${p.displayName}`}
                  >
                    {muted ? "Desmutar" : "Mutar"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>

    {showChatHint && (
      <div className={ui.chatHint} role="note">
        <div className={ui.chatHintTitle}>Chat da campanha</div>
        <div className={ui.chatHintText}>
          Digite <span className={ui.hintPill}>@Nome</span> no início para sussurrar. Use{" "}
          <span className={ui.hintPill}>/mute @Nome</span> para silenciar.
        </div>
      </div>
    )}

    <div className={ui.chatLogWrap}>
      <div
        ref={chatScrollRef}
        style={styles.chatContainer}
        onScroll={handleChatScroll}
      >
      {actionLog
        .filter((l) => {
          if (l?.senderId && mutedSet.has(String(l.senderId))) return false;
          return true;
        })
        .map((l, i) => (
          <div
            key={l.id || i}
            style={styles.logEntry}
            className={l?.isWhisper ? ui.logWhisper : undefined}
          >
            <div style={styles.logTop}>
              <span style={styles.logTime}>{l.time}</span>
              <span style={styles.logSender}>{l.sender}:</span>
            </div>
            {(() => {
              const rawMsg = String(l.message || "");
              const isEmote = rawMsg.startsWith("[[ME]]");
              const isRoll = rawMsg.startsWith("[[ROLL]]");
              const cleanMsg = rawMsg.replace(/^\[\[(ME|ROLL)\]\]\s*/, "");

              if (isRoll) {
                return (
                  <div style={styles.logMsg} className={ui.logRoll}>
                    <span className={ui.rollBadge}>ROLL</span>
                    <span className={ui.rollText}>{cleanMsg}</span>
                  </div>
                );
              }

              if (isEmote) {
                return (
                  <div style={styles.logMsg} className={ui.logEmote}>
                    {cleanMsg}
                  </div>
                );
              }

              return <div style={styles.logMsg}>{rawMsg}</div>;
            })()}
          </div>
        ))}
      <div ref={chatEndRef} />
    </div>

    {!chatIsAtBottom && chatUnseenCount > 0 && (
      <button
        type="button"
        className={ui.jumpToBottomBtn}
        onClick={() => {
          chatEndRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
          setChatUnseenCount(0);
          setChatIsAtBottom(true);
        }}
      >
        Pular para o fim
        <span className={ui.jumpToBottomBadge}>{chatUnseenCount}</span>
      </button>
    )}
  </div>

    <form
      onSubmit={(e) => {
        e.preventDefault();
        const raw = String(chatMessage || "").trim();
        if (!raw) return;

        // Marca hint como visto na primeira interação real
        try {
          localStorage.setItem(hintStorageKey, "1");
        } catch {}
        setShowChatHint(false);

        // Slash commands (local)
        if (isSlashCommand(raw)) {
          const parts = raw.slice(1).trim().split(/\s+/);
          const cmd = (parts[0] || "").toLowerCase();
          const arg = parts.slice(1).join(" ").trim();

          const pickUserByArg = (a) => {
            const token = normalizeNick(String(a || "").replace(/^@/, ""));
            if (!token) return null;
            return (
              mentionTargets.find((t) => normalizeNick(t.label) === token) ||
              mentionTargets.find((t) => normalizeNick(t.label).startsWith(token)) ||
              mentionTargets.find((t) => normalizeNick(t.label).includes(token)) ||
              null
            );
          };

          
if (cmd === "say") {
  const sayText = arg;
  if (!sayText) {
    upsertLogs({ time: formatTime(new Date()), message: "Uso: /say mensagem", type: "system", sender: "Sistema" });
    setChatMessage("");
    return;
  }

  const clientNonce = `say_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  sentSayNoncesRef.current.add(clientNonce);

  // Spawn local imediato (responsividade)
  spawnSayBubble({
    text: sayText,
    fromUserId: user?.id ? String(user.id) : null,
    fromCharacterId: selectedCharacter?.id ? String(selectedCharacter.id) : null,
    fromName: senderDisplayName,
    fromCharacterName: selectedCharacter?.name || (isGM ? "Mestre" : senderDisplayName),
    clientNonce,
  });

  socketRef.current?.emit("campaign_chat_message", {
    campaignId,
    text: sayText,
    kind: "say",
    clientNonce,
    toUserId: null,
    toName: null,
    fromUserId: user?.id ? String(user.id) : null,
    fromName: senderDisplayName,
    fromCharacterName: selectedCharacter?.name || (isGM ? "Mestre" : senderDisplayName),
    fromCharacterId: selectedCharacter?.id ? String(selectedCharacter.id) : null,
    isGM: Boolean(isGM),
    ts: Date.now(),
  });

  setChatMessage("");
  return;
}

if (cmd === "me") {
            const action = arg;
            if (!action) {
              upsertLogs({ time: formatTime(new Date()), message: "Uso: /me ação", type: "system", sender: "Sistema" });
              setChatMessage("");
              return;
            }

            socketRef.current?.emit("campaign_chat_message", {
              campaignId,
              text: `[[ME]] ${action}`,
              toUserId: null,
              toName: null,
              fromUserId: user?.id ? String(user.id) : null,
              fromName: senderDisplayName,
              fromCharacterName: selectedCharacter?.name || (isGM ? "Mestre" : senderDisplayName),
              fromCharacterId: selectedCharacter?.id ? String(selectedCharacter.id) : null,
              isGM: Boolean(isGM),
            });

            setChatMessage("");
            return;
          }

          if (cmd === "w") {
            const partsW = arg.split(/\s+/).filter(Boolean);
            const nameToken = partsW.shift() || "";
            const msg = partsW.join(" ").trim();

            if (!nameToken || !msg) {
              upsertLogs({ time: formatTime(new Date()), message: "Uso: /w Nome mensagem", type: "system", sender: "Sistema" });
              setChatMessage("");
              return;
            }

            const target = pickUserByArg(nameToken);
            if (!target) {
              upsertLogs({ time: formatTime(new Date()), message: `Personagem não encontrado: ${nameToken}`, type: "system", sender: "Sistema" });
              setChatMessage("");
              return;
            }

            socketRef.current?.emit("campaign_chat_message", {
              campaignId,
              text: msg,
              toUserId: String(target.userId),
              toName: target.label,
              fromUserId: user?.id ? String(user.id) : null,
              fromName: senderDisplayName,
              fromCharacterName: selectedCharacter?.name || (isGM ? "Mestre" : senderDisplayName),
              fromCharacterId: selectedCharacter?.id ? String(selectedCharacter.id) : null,
              isGM: Boolean(isGM),
            });

            setChatMessage("");
            return;
          }

          if (cmd === "roll") {
            const expr = arg.replace(/\s+/g, "");
            const mRoll = expr.match(/^(\d*)d(\d+)([+-]\d+)?$/i);

            if (!mRoll) {
              upsertLogs({ time: formatTime(new Date()), message: "Uso: /roll 1d20+5", type: "system", sender: "Sistema" });
              setChatMessage("");
              return;
            }

            const count = Math.max(1, Math.min(100, parseInt(mRoll[1] || "1", 10)));
            const sides = Math.max(2, Math.min(1000, parseInt(mRoll[2] || "20", 10)));
            const mod = mRoll[3] ? parseInt(mRoll[3], 10) : 0;

            const rolls = Array.from({ length: count }, () => 1 + Math.floor(Math.random() * sides));
            const sum = rolls.reduce((a, b) => a + b, 0);
            const total = sum + mod;

            const modStr = mod === 0 ? "" : (mod > 0 ? `+${mod}` : `${mod}`);
            const breakdown = count === 1 ? `${rolls[0]}` : rolls.join(", ");
            const msg = `[[ROLL]] ${count}d${sides}${modStr} = ${total} (${breakdown}${mod !== 0 ? ` ${modStr}` : ""})`;

            socketRef.current?.emit("campaign_chat_message", {
              campaignId,
              text: msg,
              toUserId: null,
              toName: null,
              fromUserId: user?.id ? String(user.id) : null,
              fromName: senderDisplayName,
              fromCharacterName: selectedCharacter?.name || (isGM ? "Mestre" : senderDisplayName),
              fromCharacterId: selectedCharacter?.id ? String(selectedCharacter.id) : null,
              isGM: Boolean(isGM),
            });

            setChatMessage("");
            return;
          }

          if (cmd === "mute") {
            const target = pickUserByArg(arg);
            if (!target) {
              upsertLogs({ time: formatTime(new Date()), message: "Uso: /mute @Nome", type: "system", sender: "Sistema" });
            } else {
              setMutedUserIds((prev) => (prev.includes(String(target.userId)) ? prev : [...prev, String(target.userId)]));
              upsertLogs({ time: formatTime(new Date()), message: `Silenciado: ${target.label}`, type: "system", sender: "Sistema" });
            }
            setChatMessage("");
            return;
          }

          if (cmd === "unmute") {
            const target = pickUserByArg(arg);
            if (!target) {
              upsertLogs({ time: formatTime(new Date()), message: "Uso: /unmute @Nome", type: "system", sender: "Sistema" });
            } else {
              setMutedUserIds((prev) => prev.filter((x) => x !== String(target.userId)));
              upsertLogs({ time: formatTime(new Date()), message: `Removido do mute: ${target.label}`, type: "system", sender: "Sistema" });
            }
            setChatMessage("");
            return;
          }

          if (cmd === "mutelist") {
            const names = Array.from(new Set(mentionTargets.filter((t) => mutedSet.has(String(t.userId))).map((t) => t.label)));
            upsertLogs({
              time: formatTime(new Date()),
              message: names.length ? `Mutados: ${names.join(", ")}` : "Nenhum mutado.",
              type: "system",
              sender: "Sistema",
            });
            setChatMessage("");
            return;
          }

          upsertLogs({ time: formatTime(new Date()), message: `Comando desconhecido: /${cmd}`, type: "system", sender: "Sistema" });
          setChatMessage("");
          return;
        }

        // Whisper fixo (selecionado via autocomplete do @)
        if (whisperTarget && raw && !raw.startsWith("@")) {
          socketRef.current?.emit("campaign_chat_message", {
            campaignId,
            text: raw,
            toUserId: String(whisperTarget.userId),
            toName: whisperTarget.label,
            fromUserId: user?.id ? String(user.id) : null,
            fromName: senderDisplayName,
            fromCharacterName: selectedCharacter?.name || (isGM ? "Mestre" : senderDisplayName),
            fromCharacterId: selectedCharacter?.id ? String(selectedCharacter.id) : null,
            isGM: Boolean(isGM),
            ts: Date.now(),
          });
          setChatMessage("");
          return;
        }

        // Whisper via @Nome
        const at = parseAtWhisper(raw);
        if (at && at.toToken) {
          const token = normalizeNick(at.toToken);
          const target =
            mentionTargets.find((t) => normalizeNick(t.label) === token) ||
            mentionTargets.find((t) => normalizeNick(t.label).startsWith(token)) ||
            mentionTargets.find((t) => normalizeNick(t.label).includes(token)) ||
            null;

          if (target && at.body) {
            socketRef.current?.emit("campaign_chat_message", {
              campaignId,
              text: at.body,
              toUserId: String(target.userId),
              toName: target.label,
              fromUserId: user?.id ? String(user.id) : null,
              fromName: senderDisplayName,
              fromCharacterName: selectedCharacter?.name || (isGM ? "Mestre" : senderDisplayName),
              fromCharacterId: selectedCharacter?.id ? String(selectedCharacter.id) : null,
              isGM: Boolean(isGM),
              ts: Date.now(),
            });
            setChatMessage("");
            return;
          }
        }

        // Público
        socketRef.current?.emit("campaign_chat_message", {
          campaignId,
          text: raw,
          fromUserId: user?.id ? String(user.id) : null,
          fromName: senderDisplayName,
              fromCharacterName: selectedCharacter?.name || (isGM ? "Mestre" : senderDisplayName),
              fromCharacterId: selectedCharacter?.id ? String(selectedCharacter.id) : null,
              isGM: Boolean(isGM),
          ts: Date.now(),
        });

        setChatMessage("");
      }}
      style={styles.chatInputArea}
      className={ui.chatInputArea}
    >
      <button type="button" className={ui.emojiBtn} title="Emojis" onClick={() => setIsEmojiOpen((v) => !v)}>
        🙂
      </button>

      {whisperTarget && (
        <div className={ui.whisperPill} title={`Sussurro para ${whisperTarget.label}`}>
          <span className={ui.whisperLock}>🔒</span>
          <span className={ui.whisperLabel}>{whisperTarget.label}</span>
          <button
            type="button"
            className={ui.whisperClear}
            aria-label="Cancelar sussurro"
            onClick={() => setWhisperTarget(null)}
          >
            ×
          </button>
        </div>
      )}

      <div className={ui.chatInputWrap}>
        {isEmojiOpen && (
          <div className={ui.emojiPopover} ref={emojiPopoverRef} role="dialog" aria-label="Emojis">
            <div className={ui.emojiGrid}>
              {EMOJI_SET.map((e) => (
                <button
                  key={e}
                  type="button"
                  className={ui.emojiCell}
                  onClick={() => {
                    const el = chatInputRef.current;
                    const cur = chatMessage || "";
                    if (!el) {
                      setChatMessage(cur + e);
                      setIsEmojiOpen(false);
                      return;
                    }
                    const start = el.selectionStart ?? cur.length;
                    const end = el.selectionEnd ?? cur.length;
                    const next = cur.slice(0, start) + e + cur.slice(end);
                    setChatMessage(next);
                    setIsEmojiOpen(false);
                    requestAnimationFrame(() => {
                      try {
                        el.focus();
                        const pos = start + e.length;
                        el.setSelectionRange(pos, pos);
                      } catch {}
                    });
                  }}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
        )}

        <input
          ref={chatInputRef}
          value={chatMessage}
          onFocus={() => {
            if (showChatHint) return;
            try {
              const seen = localStorage.getItem(hintStorageKey);
              if (!seen) setShowChatHint(true);
            } catch {
              setShowChatHint(true);
            }
          }}
          onChange={(e) => {
            const v = e.target.value;
            setChatMessage(v);

            if (showChatHint && v.trim().length > 0) {
              try {
                localStorage.setItem(hintStorageKey, "1");
              } catch {}
              setShowChatHint(false);
            }

            const trimmed = v.trimStart();

// Se o usuário começar a digitar um @novo, isso sobrescreve o alvo atual
if (trimmed.startsWith("@") && whisperTarget) {
  setWhisperTarget(null);
}

// Só abre sugestões enquanto o usuário está digitando o token do @ (antes do primeiro espaço)
if (!whisperTarget && trimmed.startsWith("@") && !trimmed.slice(1).includes(" ")) {
  const w = parseAtWhisper(trimmed);
  const q = (w?.toToken || "").trim();
  setMentionQuery(q);
  setIsMentionOpen(true);
  setMentionIndex(0);
} else {
  setIsMentionOpen(false);
  setMentionQuery("");
}
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              let handled = false;

              if (isEmojiOpen) {
                setIsEmojiOpen(false);
                handled = true;
              }

              if (isMentionOpen) {
                setIsMentionOpen(false);
                handled = true;
              }

              if (whisperTarget) {
                setWhisperTarget(null);
                handled = true;
              }

              if (handled) {
                e.preventDefault();
                e.stopPropagation();
                return;
              }
            }

            if (!isMentionOpen) return;

            if (e.key === "ArrowDown") {
              e.preventDefault();
              setMentionIndex((i) => Math.min(i + 1, Math.max(0, mentionCandidates.length - 1)));
            }
            if (e.key === "ArrowUp") {
              e.preventDefault();
              setMentionIndex((i) => Math.max(i - 1, 0));
            }
            if (e.key === "Enter") {
              const trimmed = String(chatMessage || "").trimStart();
              const at = parseAtWhisper(trimmed);
              if (at && at.toToken && !at.body) {
                e.preventDefault();
                const pick = mentionCandidates[mentionIndex];
                if (!pick) return;
                const completed = `@${pick.label} `;
                setChatMessage(completed);
                setIsMentionOpen(false);
                requestAnimationFrame(() => {
                  try {
                    const el = chatInputRef.current;
                    el?.focus();
                    const pos = completed.length;
                    el?.setSelectionRange(pos, pos);
                  } catch {}
                });
              }
            }
          }}
          style={styles.chatInput}
          className={`${ui.chatInput} ${whisperTarget ? ui.chatInputWhisper : ""}`}
          placeholder={whisperTarget ? `Sussurrando para ${whisperTarget.label}...` : "Digite sua mensagem..."}
        />

        {isMentionOpen && mentionCandidates.length > 0 && (
          <div className={ui.mentionPopover} role="listbox" aria-label="Sugestões de personagens">
            {mentionCandidates.slice(0, 8).map((p, idx) => (
              <button
                key={`${p.characterId || p.userId}:${p.label}`}
                type="button"
                className={`${ui.mentionItem} ${idx === mentionIndex ? ui.mentionActive : ""}`}
                onClick={() => {
                  // Ao selecionar, fixamos o alvo (whisper) e removemos o @ do input
                  setWhisperTarget({
                    userId: p.userId,
                    label: p.label,
                    characterId: p.characterId || null,
                  });

                  // Se o usuário já tinha digitado algo além do token (ex.: "@Raikish oi"),
                  // preservamos o restante como mensagem.
                  const trimmed = (chatMessage || "").trimStart();
                  const parsed = trimmed.startsWith("@") ? parseAtWhisper(trimmed) : null;
                  const rest = (parsed?.restText || "").trimStart();

                  setChatMessage(rest);
                  setIsMentionOpen(false);
                  setMentionQuery("");
                  requestAnimationFrame(() => {
                    try {
                      chatInputRef.current?.focus();
                    } catch {}
                  });
                }}
              >
                <span className={ui.mentionName}>{p.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <button type="submit" className={ui.sendBtn}>
        Enviar
      </button>
    </form>
  </div>
)}

        {/* MAPA */}
        <div style={cinematic.enabled ? { ...styles.stage, flex: 1, width: "100%", height: "100%", margin: 0 } : styles.stage} className={cinematic.enabled ? ui.cinematicStage : ""}>
          <div style={styles.mapToolbar} className="map-toolbar">
            <div style={styles.toolGroup}>
              <button onClick={() => setMapTool("move")} className={`map-tool-btn ${mapTool === "move" ? "map-tool-active" : ""}`} style={styles.toolBtn} title="Mover">
                ✋
              </button>
              <button onClick={() => setMapTool("select")} className={`map-tool-btn ${mapTool === "select" ? "map-tool-active" : ""}`} style={styles.toolBtn} title="Selecionar">
                👆
              </button>
              <button onClick={() => setMapTool("add")} className={`map-tool-btn ${mapTool === "add" ? "map-tool-active" : ""}`} style={styles.toolBtn} title="Adicionar">
                ➕
              </button>
              <button onClick={() => setMapTool("rename")} className={`map-tool-btn ${mapTool === "rename" ? "map-tool-active" : ""}`} style={styles.toolBtn} title="Renomear">
                ✏️
              </button>

              {/* ✅ RÉGUA RECOLOCADA */}
              <button
                onClick={() => {
                  if (mapTool === "ruler") {
                    setMapTool("move");
                    clearRuler();
                  } else {
                    setMapTool("ruler");
                    // mantém última linha, mas força active quando começar a medir; aqui só prepara
                  }
                }}
                className={`map-tool-btn ${mapTool === "ruler" ? "map-tool-active" : ""}`}
                style={styles.toolBtn}
                title="Régua (arraste no mapa para medir | ESC para limpar)"
                type="button"
              >
                📏
              </button>

              <div style={styles.divider} />

              <button
                onClick={() => setMapTool(mapTool === "aoe_circle" ? "move" : "aoe_circle")}
                className={`map-tool-btn ${mapTool === "aoe_circle" ? "map-tool-active" : ""}`}
                style={styles.toolBtn}
                title="Área: Círculo (Raio)"
              >
                🔵
              </button>
              <button
                onClick={() => setMapTool(mapTool === "aoe_cone" ? "move" : "aoe_cone")}
                className={`map-tool-btn ${mapTool === "aoe_cone" ? "map-tool-active" : ""}`}
                style={styles.toolBtn}
                title="Área: Cone"
              >
                🔻
              </button>
              <button
                onClick={() => setMapTool(mapTool === "aoe_rect" ? "move" : "aoe_rect")}
                className={`map-tool-btn ${mapTool === "aoe_rect" ? "map-tool-active" : ""}`}
                style={styles.toolBtn}
                title="Área: Quadrado/Cubo"
              >
                ⬛
              </button>

              {isGM && (
                <button
                  onClick={() => setMapTool("fog")}
                  className={`map-tool-btn ${mapTool === "fog" ? "map-tool-active" : ""}`}
                  style={styles.toolBtn}
                  title="Revelar Névoa (Fog)"
                >
                  ☁️
                </button>
              )}

              {isGM && (
                <button onClick={clearFogNow} style={styles.toolBtnDanger} title="Limpar Fog of War" type="button">
                  Limpar Fog
                </button>
              )}

            {/* GRID CONTROLS */}
            <div style={styles.divider} />
            <button onClick={() => setGridEnabled((v) => !v)} className={`map-tool-btn ${gridEnabled ? "map-tool-active" : ""}`} style={styles.toolBtn} title="Mostrar/Ocultar Grid" type="button">
              ⬛
            </button>
            <button onClick={() => setGridSnapEnabled((v) => !v)} className={`map-tool-btn ${gridSnapEnabled ? "map-tool-active" : ""}`} style={styles.toolBtn} title="Snap (grudar no grid)" type="button">
              🧲
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 11, color: "#a1a1aa", fontWeight: 900 }}>GRID</span>
              <DarkSelect
                compact
                value={String(gridDivisions)}
                onChange={(v) => setGridDivisions(Number(v) || GRID_DEFAULT_DIVISIONS)}
                placeholder="Grid"
                options={[
                  { value: "10", label: "10x10" },
                  { value: "12", label: "12x12" },
                  { value: "15", label: "15x15" },
                  { value: "20", label: "20x20" },
                  { value: "25", label: "25x25" },
                  { value: "30", label: "30x30" },
                ]}
                style={{ minWidth: 110 }}
              />
            </div>

            {mapTool === "add" && (
              <>
                <div style={styles.divider} />

                <div style={styles.typePicker}>
                  {MARKER_TYPES.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setSelectedMarkerType(t.id)}
                      className="map-tool-btn"
                      style={{
                        ...styles.typeBtn,
                        border: selectedMarkerType === t.id ? "1px solid rgba(250,204,21,0.9)" : "1px solid transparent",
                        background: selectedMarkerType === t.id ? "rgba(250,204,21,0.08)" : "transparent",
                      }}
                      title={t.label}
                      type="button"
                    >
                      {t.icon}
                    </button>
                  ))}
                </div>

                <div style={styles.divider} />

                {/* ✅ Upload imagem do token */}
                <button
                  type="button"
                  onClick={() => tokenFileInputRef.current?.click()}
                  style={{
                    ...styles.toolBtn,
                    fontSize: 14,
                    minWidth: 46,
                    opacity: tokenUploading ? 0.65 : 1,
                  }}
                  title="Enviar imagem do Token (opcional)"
                  disabled={tokenUploading}
                >
                  {tokenUploading ? "..." : "🖼️"}
                </button>
                <input ref={tokenFileInputRef} type="file" accept="image/*" hidden onChange={(e) => handleUploadTokenImage(e.target.files?.[0])} />

                {tokenImageUrl ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: "50%",
                        overflow: "hidden",
                        border: "1px solid rgba(255,255,255,0.14)",
                        background: "rgba(255,255,255,0.06)",
                      }}
                      title="Imagem atual do token"
                    >
                      <img src={tokenImageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                    <button
                      type="button"
                      onClick={() => setTokenImageUrl("")}
                      style={{
                        ...styles.toolBtnDanger,
                        padding: "7px 10px",
                        fontSize: 11,
                      }}
                      title="Remover imagem do token"
                    >
                      Remover
                    </button>
                  </div>
                ) : (
                  <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 900, whiteSpace: "nowrap" }}>Token Img</span>
                )}

                <div style={styles.divider} />

                <div style={styles.colorPicker}>
                  {MARKER_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setSelectedColor(c)}
                      style={{
                        ...styles.colorDotBtn,
                        borderColor: selectedColor === c ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.14)",
                      }}
                      title={c}
                      type="button"
                    >
                      <span style={{ ...styles.colorDot, background: c }} />
                    </button>
                  ))}
                </div>
              </>
            )}

            {isGM && (
              <>
                <div style={styles.divider} />
                <button onClick={() => fileInputRef.current.click()} style={styles.toolBtn} title="Carregar mapa">
                  📂
                </button>
                <input type="file" ref={fileInputRef} hidden onChange={handleAddMapFile} />
                <button onClick={handleSetMapUrl} style={styles.toolBtn} title="Mapa por URL">
                  🌐
                </button>
                <button onClick={() => setIsMapOrderOpen(true)} style={styles.toolBtn} title="Ordem dos mapas">
                  ⚙️
                </button>
                <div style={styles.divider} />
                <button
                  onClick={() => {
                    setMarkers([]);
                    emitMarkersUpdate([], "immediate");
                  }}
                  style={styles.toolBtnDanger}
                  title="Limpar marcadores"
                  type="button"
                >
                  Limpar
                </button>
              </>
            )}
          </div>

          </div>

          <div
            ref={mapContainerRef}
            style={{
              ...styles.mapCanvas,
              position: "relative",
              overflow: "hidden",
              cursor:
                mapTool === "add"
                  ? "crosshair"
                  : mapTool === "move"
                  ? "grab"
                  : mapTool === "fog"
                  ? "crosshair"
                  : mapTool === "rename"
                  ? "text"
                  : mapTool === "ruler"
                  ? "crosshair"
                  : "default",
            }}
            onClick={handleMapClick}
            onMouseMove={handleMapMouseMove}
            onMouseUp={handleMapMouseUp}
            onMouseDown={handleMapMouseDown}
            onMouseLeave={handleMapMouseLeave}
          >
            {/* Weather FX (overlay visual acima do mapa; não interfere com input) */}
            <WeatherOverlay
              active={currentWeather.enabled}
              type={currentWeather.type}
              intensity={currentWeather.intensity}
              zIndex={9999}
            />

            {/* Weather Menu (debug local) */}
            <div
              style={{
                position: "absolute",
                top: 12,
                right: 12,
                zIndex: 20050,
                pointerEvents: "auto",
              }}
            >
              {sessionRole === "GM" && (
              <button
                type="button"
                onClick={() => setWeatherMenuOpen((v) => !v)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "9px 10px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.16)",
                  background: "rgba(10,10,12,0.62)",
                  color: "rgba(255,255,255,0.92)",
                  backdropFilter: "blur(12px)",
                  WebkitBackdropFilter: "blur(12px)",
                  boxShadow: "0 12px 28px rgba(0,0,0,0.55)",
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                🌦 Weather
                <span style={{ opacity: 0.75, fontSize: 12 }}>
                  {currentWeather.enabled ? currentWeather.type : "off"}
                </span>
              </button>
              )}

              
              {sessionRole === "GM" && weatherMenuOpen && (
                <div
                  style={{
                    marginTop: 10,
                    width: 270,
                    padding: 12,
                    borderRadius: 14,
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: "rgba(8,8,10,0.76)",
                    color: "rgba(255,255,255,0.92)",
                    backdropFilter: "blur(14px)",
                    WebkitBackdropFilter: "blur(14px)",
                    boxShadow: "0 16px 40px rgba(0,0,0,0.62)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ fontSize: 12, opacity: 0.85 }}>Weather FX</div>
                    <button
                      type="button"
                      onClick={() => setWeatherMenuOpen(false)}
                      aria-label="Fechar"
                      title="Fechar"
                      style={{
                        border: "none",
                        background: "transparent",
                        color: "rgba(255,255,255,0.72)",
                        cursor: "pointer",
                        fontSize: 14,
                      }}
                    >
                      ✕
                    </button>
                  </div>

                  <div style={{ height: 10 }} />

                  <WeatherControls
                    currentType={currentWeather.enabled ? currentWeather.type : "none"}
                    currentIntensity={currentWeather.intensity}
                    onChangeType={(nextType) => {
                      if (sessionRole !== "GM") return;

                      const t = String(nextType || "none");
                      if (t === "none") {
                        updateWeatherForCurrentMap({ enabled: false, type: "none" });
                        return;
                      }

                      updateWeatherForCurrentMap({
                        enabled: true,
                        type: t,
                        seed: currentWeather.seed ?? Date.now(),
                      });
                    }}
                    onChangeIntensity={(nextIntensity) => {
                      if (sessionRole !== "GM") return;

                      updateWeatherForCurrentMap({
                        enabled: true,
                        intensity: Number(nextIntensity),
                        seed: currentWeather.seed ?? Date.now(),
                      });
                    }}
                  />

                  <div style={{ marginTop: 10, fontSize: 11, opacity: 0.65 }}>
                    Somente Mestre. Sincronizado via Socket (por mapa).
                  </div>
                </div>
              )}
</div>

            {currentMap ? (
              <img
                src={currentMap.src}
                style={styles.mapImage}
                alt=""
                onLoad={() => {
                  resizeFogCanvasToContainer();
                }}
              />
            ) : (
              <div style={styles.emptyStage}>
                <h3 style={{ margin: 0 }}>Sem Mapa</h3>
                {isGM && <p style={{ margin: "8px 0 0", color: "#777" }}>Use 📂 ou 🌐 para carregar.</p>}
              </div>
            )}

            {/* CANVAS DO FOG */}
            <canvas
              ref={fogCanvasRef}
              style={{
                position: "absolute",
                inset: 0,
                pointerEvents: "none",
                zIndex: 2,
                filter: "blur(15px) drop-shadow(0 0 5px rgba(0,0,0,0.5))",
                transform: "scale(1.05)",
                opacity: 0.98,
              }}
            />

            {/* GRID OVERLAY */}
            {gridEnabled && <div style={gridOverlayStyle} />}

            {/* ✅ RÉGUA SVG OVERLAY */}

{/* ✅ AOE SVG OVERLAY */}
{aoe?.active && aoe.start && aoe.end && (
  <svg
    style={{
      position: "absolute",
      inset: 0,
      width: "100%",
      height: "100%",
      zIndex: 6,
      pointerEvents: "none",
    }}
    viewBox="0 0 100 100"
    preserveAspectRatio="none"
  >
    {aoe.type === "circle" && (() => {
      const dx = aoe.end.x - aoe.start.x;
      const dy = aoe.end.y - aoe.start.y;
      const r = Math.sqrt(dx * dx + dy * dy);
      return (
        <>
          <circle
            cx={aoe.start.x}
            cy={aoe.start.y}
            r={r}
            fill="rgba(56,189,248,0.12)"
            stroke="rgba(56,189,248,0.85)"
            strokeWidth="0.35"
            vectorEffect="non-scaling-stroke"
          />
          <circle cx={aoe.start.x} cy={aoe.start.y} r="0.7" fill="rgba(56,189,248,0.95)" />
        </>
      );
    })()}

    {aoe.type === "rect" && (() => {
      const x = Math.min(aoe.start.x, aoe.end.x);
      const y = Math.min(aoe.start.y, aoe.end.y);
      const w = Math.abs(aoe.end.x - aoe.start.x);
      const h = Math.abs(aoe.end.y - aoe.start.y);
      return (
        <rect
          x={x}
          y={y}
          width={w}
          height={h}
          fill="rgba(56,189,248,0.12)"
          stroke="rgba(56,189,248,0.85)"
          strokeWidth="0.35"
          vectorEffect="non-scaling-stroke"
        />
      );
    })()}

    {aoe.type === "cone" && (() => {
      const sx = aoe.start.x;
      const sy = aoe.start.y;
      const ex = aoe.end.x;
      const ey = aoe.end.y;
      const dx = ex - sx;
      const dy = ey - sy;
      const len = Math.sqrt(dx * dx + dy * dy) || 0.0001;

      // Cone com 60° total (30° para cada lado)
      const ang = Math.atan2(dy, dx);
      const spread = (30 * Math.PI) / 180;

      const x1 = sx + Math.cos(ang - spread) * len;
      const y1 = sy + Math.sin(ang - spread) * len;
      const x2 = sx + Math.cos(ang + spread) * len;
      const y2 = sy + Math.sin(ang + spread) * len;

      const d = `M ${sx} ${sy} L ${x1} ${y1} L ${x2} ${y2} Z`;

      return (
        <>
          <path
            d={d}
            fill="rgba(56,189,248,0.12)"
            stroke="rgba(56,189,248,0.85)"
            strokeWidth="0.35"
            vectorEffect="non-scaling-stroke"
          />
          <circle cx={sx} cy={sy} r="0.7" fill="rgba(56,189,248,0.95)" />
        </>
      );
    })()}
  </svg>
)}
            {ruler.start && ruler.end && (
              <>
                <svg
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    zIndex: 7,
                    pointerEvents: "none",
                  }}
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                >
                  {/* Linha principal */}
                  <line
                    x1={ruler.start.x}
                    y1={ruler.start.y}
                    x2={ruler.end.x}
                    y2={ruler.end.y}
                    stroke="rgba(250,204,21,0.95)"
                    strokeWidth="0.35"
                    vectorEffect="non-scaling-stroke"
                  />
                  {/* Pontos */}
                  <circle cx={ruler.start.x} cy={ruler.start.y} r="0.9" fill="rgba(250,204,21,0.95)" />
                  <circle cx={ruler.end.x} cy={ruler.end.y} r="0.9" fill="rgba(250,204,21,0.95)" />
                  {/* Sombra leve */}
                  <line
                    x1={ruler.start.x}
                    y1={ruler.start.y}
                    x2={ruler.end.x}
                    y2={ruler.end.y}
                    stroke="rgba(0,0,0,0.55)"
                    strokeWidth="0.9"
                    vectorEffect="non-scaling-stroke"
                    opacity="0.25"
                  />
                </svg>

                {rulerMetrics?.mid && (
                  <div className="ruler-label" style={{ left: `${rulerMetrics.mid.x}%`, top: `${rulerMetrics.mid.y}%` }}>
                    {`${rulerMetrics.distCells.toFixed(1)} casas`}
                    <span style={{ marginLeft: 8, color: "rgba(255,255,255,0.65)", fontWeight: 900 }}>{`(${rulerMetrics.distPct.toFixed(1)}%)`}</span>
                  </div>
                )}
              </>
            )}

            {markers.map((m, i) => {
              const pct = hpPercent(m);
              const typeDef = MARKER_TYPES.find((t) => t.id === m.type) || MARKER_TYPES[0];
              const hasStatus = Array.isArray(m.status) && m.status.length > 0;

              return (
                <div
                  key={m.id || i}
                  className="marker-anim"
                  style={{
                    ...styles.marker,
                    left: `${m.x}%`,
                    top: `${m.y}%`,
                    zIndex: draggingMarkerIndex === i ? 100 : 10,
                    pointerEvents: mapTool === "add" || mapTool === "fog" || mapTool === "ruler" ? "none" : "auto",
                  }}
                  onMouseDown={(e) => handleMarkerMouseDown(e, i)}
                  onClick={(e) => handleMarkerClick(e, i)}
                  onContextMenu={(e) => handleMarkerContextMenu(e, i)}
                >
                  {(m.maxHp != null || m.currentHp != null) && (
                    <>
                      <div className="hp-text">
                        {Number(m.currentHp ?? 0)}/{Number(m.maxHp ?? 0)}
                      </div>
                      <div className="hp-wrap">
                        <div
                          className="hp-fill"
                          style={{
                            width: `${pct}%`,
                            background: hpColor(pct),
                          }}
                        />
                      </div>
                    </>
                  )}

                  {hasStatus && (
                    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 50 }}>
                      {m.status.slice(0, 8).map((k, idx2) => {
                        const total = Math.max(1, Math.min(8, m.status.length));
                        const angle = (idx2 / total) * Math.PI * 2;
                        const r = 26;
                        const cx = 24;
                        const cy = 24;
                        const left = cx + Math.cos(angle) * r;
                        const top = cy + Math.sin(angle) * r;

                        return (
                          <div
                            key={`${m.id || i}_st_${k}_${idx2}`}
                            style={{
                              position: "absolute",
                              left,
                              top,
                              transform: "translate(-50%, -50%)",
                              width: 18,
                              height: 18,
                              borderRadius: 9,
                              background: "rgba(0,0,0,0.55)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 12,
                              lineHeight: 1,
                              boxShadow: "0 1px 2px rgba(0,0,0,0.35)",
                            }}
                            title={STATUS_LABEL_BY_KEY[k] || k}
                          >
                            {STATUS_ICON_BY_KEY[k] || "•"}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {m.avatar ? (
                    <div style={{ ...styles.avatarMarker, borderColor: m.color }}>
                      <img
                        src={toAbsoluteMapUrl(m.avatar)}
                        alt=""
                        draggable={false}
                        decoding="async"
                        loading="eager"
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    </div>
                  ) : (
                    <div className="marker-icon-only" style={{ color: m.color }}>
                      {typeDef?.icon || "♟️"}
                    </div>
                  )}

                  <div style={styles.markerLabel}>{m.label}</div>
                </div>
              );
            })}
            {/* --- ADICIONE ISSO AQUI (RENDERIZAÇÃO DOS PINGS) --- */}
       {pings.map((p) => (
         <PingMarker
           key={`${p.characterId || p.userId}:${p.label}`}
           x={p.x}
           y={p.y}
           color={p.color}
           onComplete={() => {
             // Remove o ping da lista quando a animação acaba
             setPings((prev) => prev.filter((prevP) => prevP.id !== p.id));
           }}
         />
       ))}
       {/* --------------------------------------------------- */}
          
{/* CINEMATIC FOCUS SPOTLIGHT */}
            {cinematic.enabled && cinematicSpotlight && (
              <div className={ui.cinematicSpotlightLayer} aria-hidden="true">
                <div
                  className={ui.cinematicSpotlight}
                  style={{ left: `${cinematicSpotlight.x}%`, top: `${cinematicSpotlight.y}%` }}
                />
              </div>
            )}

            {/* SPEECH BUBBLES (/say) */}
<div className={ui.speechLayer} aria-hidden="true">
  {(() => {
    // Agrupa bolhas por âncora (token) para empilhamento visual sem sobreposição.
    const groups = new Map();
    for (const b of sayBubbles) {
      const mk = resolveMarkerForSay(b.fromUserId, b.fromCharacterId, b.fromCharacterName || b.fromName);
      if (!mk) continue;
      const key = String(mk.id ?? mk.markerId ?? mk.characterId ?? mk.label ?? `${mk.x},${mk.y}`);
      const arr = groups.get(key) || [];
      arr.push(b.id);
      groups.set(key, arr);
    }

    return sayBubbles.map((b) => {
      const mk = resolveMarkerForSay(b.fromUserId, b.fromCharacterId, b.fromCharacterName || b.fromName);
      if (!mk) return null;

      const key = String(mk.id ?? mk.markerId ?? mk.characterId ?? mk.label ?? `${mk.x},${mk.y}`);
      const arr = groups.get(key) || [];
      // stackIndex: 0 = mais recente (mais próximo do token)
      const stackIndex = Math.max(0, arr.length - 1 - arr.indexOf(b.id));

      const place = getSayBubblePlacement(mk);

      const cls = [
        ui.speechBubble,
        place.flipY ? ui.speechFlipY : "",
        place.alignLeft ? ui.speechAlignLeft : "",
        place.alignRight ? ui.speechAlignRight : "",
        b.state === "out" ? ui.speechOut : "",
      ]
        .filter(Boolean)
        .join(" ");

      const stackPx = Math.min(28, stackIndex * 10); // espaçamento cap
      const stackOffset = place.flipY ? stackPx : -stackPx;
      const opacity = Math.max(0.58, 1 - stackIndex * 0.14);

      return (
        <div
          key={b.id}
          className={cls}
          style={{
            left: `${mk.x}%`,
            top: `${mk.y}%`,
            opacity,
            zIndex: 1300 - stackIndex,
            ["--speechStackY"]: `${stackOffset}px`,
          }}
        >
          <div className={ui.speechInner}>
            <div className={ui.speechName}>{b.fromCharacterName || b.fromName || "Alguém"}</div>
            <div className={ui.speechText}>{b.text}</div>
          </div>
          <div className={ui.speechTail} />
        </div>
      );
    });
  })()}
</div>

</div>
        </div>

        {/* DIREITA */}
        {!cinematic.enabled && showRightPanel && (
          <div style={styles.sidebarRight} className="sidebar-right">
            <div style={styles.tabsRow}>
              <button onClick={() => setRightTab("dice")} style={{ ...styles.tab, ...(rightTab === "dice" ? styles.tabActive : null) }}>
                Dados
              </button>
              <button onClick={() => setRightTab("combat")} style={{ ...styles.tab, ...(rightTab === "combat" ? styles.tabActive : null) }}>
                Combate
              </button>
              <button onClick={() => setIsEventsPopupOpen(true)} style={{ ...styles.tab, ...(isEventsPopupOpen ? styles.tabActive : null) }}>
                Eventos
              </button>
            </div>

            <div style={styles.tabContent}>
              {rightTab === "dice" && (
                <div style={{ padding: 14 }}>
                  <div style={styles.diceGrid}>
                    {DICE_OPTS.map((d) => (
                      <button
                        key={d.id}
                        onClick={() => setSelectedDice(d.id)}
                        style={{
                          ...styles.diceBtn,
                          borderColor: selectedDice === d.id ? d.color : "rgba(255,255,255,0.14)",
                          background: selectedDice === d.id ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.03)",
                        }}
                        type="button"
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>

                  {characterSheet && (
                    <div style={{ display: "flex", gap: 6, marginBottom: 12, overflowX: "auto", paddingBottom: 4 }}>
                      {Object.entries(characterSheet.sheet_data?.abilities || {}).map(([key, val]) => {
                        const mod = getAbilityMod(val);
                        return (
                          <div
                            key={key}
                            className="mod-chip"
                            onClick={() => setRollModifier(mod)}
                            title={`Usar modificador de ${key.toUpperCase()}: ${val} (${formatModifier(mod)})`}
                            style={{ minWidth: 45, padding: "6px 4px" }}
                          >
                            <div style={{ fontSize: 9, textTransform: "uppercase", opacity: 0.7, marginBottom: 2 }}>{key}</div>
                            <span style={{ fontSize: 14, fontWeight: "bold", color: "#facc15" }}>{formatModifier(mod)}</span>
                            <span style={{ fontSize: 9, color: "#64748b", marginTop: 2 }}>{val}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div style={{ marginBottom: 10, background: "rgba(255,255,255,0.03)", padding: 10, borderRadius: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 12, color: "#94a3b8" }}>
                      <span>Modificador</span>
                      <span>Quantidade</span>
                    </div>

                    <div style={styles.rollControls}>
                      <input
                        type="number"
                        value={rollModifier}
                        onChange={(e) => setRollModifier(e.target.value)}
                        placeholder="0"
                        style={{
                          ...styles.qtyBox,
                          width: 60,
                          textAlign: "center",
                          padding: 0,
                          border: "1px solid #444",
                          color: "#facc15",
                          fontSize: 16,
                          fontWeight: "bold",
                          outline: "none",
                        }}
                      />

                      <div style={styles.qtyBox}>
                        <button type="button" onClick={() => setDiceQuantity(Math.max(1, diceQuantity - 1))} style={styles.qtyBtn}>
                          -
                        </button>
                        <span style={styles.qtyVal}>{diceQuantity}</span>
                        <button type="button" onClick={() => setDiceQuantity(diceQuantity + 1)} style={styles.qtyBtn}>
                          +
                        </button>
                      </div>

                      <button onClick={handleDiceRoll} style={styles.rollBtn} disabled={isRolling} type="button">
                        {isRolling ? "..." : "ROLAR"}
                      </button>
                    </div>
                  </div>

                  {lastRoll?.total != null && (
                    <div style={styles.lastRollCard}>
                      <div style={styles.lastRollTitle}>
                        {lastRoll?.qty ? `${lastRoll.qty}x` : ""}
                        {lastRoll?.dice || selectedDice} {lastRoll?.mod ? (lastRoll.mod > 0 ? `+${lastRoll.mod}` : lastRoll.mod) : ""}
                      </div>
                      <div style={styles.lastRollValue}>{lastRoll.total}</div>
                      {Array.isArray(lastRoll.rolls) && (
                        <div style={styles.lastRollArray}>
                          [{lastRoll.rolls.join(", ")}]
                          {lastRoll?.mod ? ` ${lastRoll.mod >= 0 ? "+" : ""}${lastRoll.mod}` : ""}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {rightTab === "combat" && (
                <div style={{ padding: 12 }}>
                  <div style={styles.combatHeaderRow}>
                    <div style={styles.combatTitle}>INICIATIVA</div>
                    {isGM && (
                      <button
                        onClick={() => {
                          if (confirm("Limpar iniciativa?")) setInitiativeEntries([]);
                        }}
                        style={styles.combatClearBtn}
                        type="button"
                      >
                        Limpar
                      </button>
                    )}
                  </div>

                  {isGM && (
                    <div style={styles.initInputRow}>
                      <input value={initiativeName} onChange={(e) => setInitiativeName(e.target.value)} placeholder="Nome" style={styles.inputSmall} />
                      <input value={initiativeValue} onChange={(e) => setInitiativeValue(e.target.value)} type="number" placeholder="Ini" style={styles.inputIni} />
                      <button onClick={handleAddInitiative} style={styles.btnAddSmall} type="button">
                        +
                      </button>
                    </div>
                  )}

                  <div style={styles.initList}>
                    {initiativeEntries
                      .slice()
                      .sort((a, b) => b.initiative - a.initiative)
                      .map((e) => (
                        <div key={e.id} style={styles.initCard}>
                          <div style={styles.initLeft}>
                            <span style={styles.initVal}>{e.initiative}</span>
                            <span style={styles.initName} title={e.name}>
                              {e.name}
                            </span>
                          </div>
                          {isGM && (
                            <button onClick={() => setInitiativeEntries((p) => p.filter((x) => x.id !== e.id))} style={styles.btnDelSmall} type="button" title="Remover">
                              ×
                            </button>
                          )}
                        </div>
                      ))}
                    {initiativeEntries.length === 0 && <div style={styles.emptyCombat}>Nenhuma iniciativa adicionada.</div>}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* CONTEXT MENU */}
      {contextMenu.open && contextMenu.index != null && markers[contextMenu.index] && (
        <div
          ref={ctxMenuRef}
          className={ui.ctxMenu}
          style={{ position: "fixed", left: contextMenu.x, top: contextMenu.y }}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={ui.ctxTitle}>
            <span>{markers[contextMenu.index]?.label || "Marcador"}</span>
            <span className={ui.ctxSub}>
              {Number(markers[contextMenu.index]?.currentHp ?? 0)}/{Number(markers[contextMenu.index]?.maxHp ?? 0)} HP
            </span>
          </div>

          <button className={ui.ctxBtn} type="button" onClick={handleContextEditHp}>
            Editar Vida (HP)
          </button>

          <button className={ui.ctxBtn} type="button" onClick={handleContextEditStatus}>
            Status / Condições
          </button>

          <button className={`${ui.ctxBtn} ${ui.ctxBtnDanger}`} type="button" onClick={handleContextDeleteMarker}>
            Deletar Token
          </button>
        </div>
      )}

      <StatusModal
        STATUS_LIBRARY={STATUS_LIBRARY}
        markers={markers}
        statusModalOpen={statusModalOpen}
        statusModalIndex={statusModalIndex}
        statusModalSelected={statusModalSelected}
        toggleStatusKey={toggleStatusKey}
        closeStatusModal={closeStatusModal}
        saveStatusModal={saveStatusModal}
      />

      {/* MODAIS */}

      

      <LegacyFinalizeModal
        isLegacyFinalizeOpen={isLegacyFinalizeOpen}
        setIsLegacyFinalizeOpen={setIsLegacyFinalizeOpen}
        legacyFinalizeLoading={legacyFinalizeLoading}
        legacyFinalizeError={legacyFinalizeError}
        legacyFinalizeDraft={legacyFinalizeDraft}
        fetchLegacyFinalizeDraft={fetchLegacyFinalizeDraft}
        saveLegacyFinalizeDraft={saveLegacyFinalizeDraft}
        applyLegacyFinalizeDraft={applyLegacyFinalizeDraft}
        characters={characters}
        addSuggestionItem={addSuggestionItem}
        removeSuggestionItem={removeSuggestionItem}
        updateSuggestionItem={updateSuggestionItem}
        isItemApproved={isItemApproved}
        toggleApprovedItem={toggleApprovedItem}
      />

      <LegacyNarrativeModal
        isLegacyModalOpen={isLegacyModalOpen}
        setIsLegacyModalOpen={setIsLegacyModalOpen}
        legacyDraft={legacyDraft}
        setLegacyDraft={setLegacyDraft}
        legacyTargets={legacyTargets}
        toggleLegacyTarget={toggleLegacyTarget}
        characters={characters}
        legacyApplying={legacyApplying}
        applyLegacyToTargets={applyLegacyToTargets}
      />

<QuarantineModal
        isQuarantineOpen={isQuarantineOpen}
        setIsQuarantineOpen={setIsQuarantineOpen}
        fetchQuarantine={fetchQuarantine}
        quarantineLoading={quarantineLoading}
        saveQuarantineDecisions={saveQuarantineDecisions}
        quarantineError={quarantineError}
        quarantineData={quarantineData}
        quarantineDecisions={quarantineDecisions}
        setDecision={setDecision}
      />

      <EventModalGM
        EVENT_TYPES={EVENT_TYPES}
        eventModalOpen={eventModalOpen}
        setEventModalOpen={setEventModalOpen}
        eventEditing={eventEditing}
        eventDraft={eventDraft}
        setEventDraft={setEventDraft}
        submitEventDraft={submitEventDraft}
        isEventsPopupOpen={isEventsPopupOpen}
        setIsEventsPopupOpen={setIsEventsPopupOpen}
        events={events}
        eventsLoading={eventsLoading}
        eventsError={eventsError}
        fetchEvents={fetchEvents}
        eventFilters={eventFilters}
        setEventFilters={setEventFilters}
        publishBatch={publishBatch}
        openCreateEvent={openCreateEvent}
        openEditEvent={openEditEvent}
        deleteEvent={deleteEvent}
        togglePinEvent={togglePinEvent}
        togglePublishEvent={togglePublishEvent}
        isGM={isGM}
      />

      {isSheetsOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.72)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}
             onClick={(e) => { if (e.target === e.currentTarget) setIsSheetsOpen(false); }}>
          <div style={{ width: "min(1200px, calc(100vw - 28px))", height: "min(92vh, 860px)", borderRadius: 18, overflow: "hidden", position: "relative" }}>
            <CharacterSheetWorkspace
              embedded
              initialCharacters={characters}
              hideTopbar
              hideCreate
              hideCampaignLink
            />
            <div style={{ position: "absolute", top: 10, right: 10 }}>
              <button onClick={() => setIsSheetsOpen(false)} style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(214,179,95,.35)", background: "rgba(2,6,23,.7)", color: "#e2e8f0", cursor: "pointer", fontWeight: 800 }}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
<MapOrderModal
        isOpen={isMapOrderOpen}
        onClose={() => setIsMapOrderOpen(false)}
        maps={maps}
        currentIndex={currentMapIndex}
        onUpdateMaps={(m) => {
          const normalized = (m || []).map((mp) => ({ ...mp, src: toAbsoluteMapUrl(mp.src) }));
          setMaps(normalized);
          if (normalized.length) {
            setCurrentMapIndex(0);
            emitGmStateImmediate({ maps: normalized, currentMapIndex: 0 });
          } else {
            emitGmStateImmediate({ maps: [], currentMapIndex: 0 });
          }
        }}
        onSelectIndex={(idx) => {
          setCurrentMapIndex(idx);
          emitGmStateImmediate({ currentMapIndex: idx });
        }}
      />
      <XpDistributionModal isOpen={isXpModalOpen} onClose={() => setIsXpModalOpen(false)} characters={characters} onConfirm={handleGiveXp} />

      {showExitModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.roleCard}>
            <h3 style={{ margin: "0 0 6px" }}>Sair da Sessão?</h3>
            <p style={{ margin: 0, color: "#9ca3af", fontSize: 12 }}>Como Mestre, você pode salvar o estado.</p>
            <div style={styles.exitRow}>
              <button onClick={() => confirmExit(true)} style={styles.btnSuccess} type="button">
                Salvar e Sair
              </button>
              <button onClick={() => confirmExit(false)} style={styles.btnDangerFull} type="button">
                Sair sem Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
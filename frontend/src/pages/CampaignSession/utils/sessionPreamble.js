import { BACKEND_HTTP_URL } from "../constants";

/* =====================================================
   DarkSelect - dropdown customizado (evita select nativo branco)
===================================================== */
export const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  import.meta.env.VITE_API_URL ||
  window.location.origin;
export function toAbsoluteMapUrl(src) {
  if (!src) return "";
  const s = String(src);
  if (s.startsWith("http://") || s.startsWith("https://") || s.startsWith("data:")) return s;
  if (s.startsWith("/")) return `${BACKEND_HTTP_URL}${s}`;
  return `${BACKEND_HTTP_URL}/${s}`;
}

// =========================
// GRID + SNAP
// =========================
export const GRID_DEFAULT_DIVISIONS = 20;
export const GRID_BOLD_EVERY = 5;

export function clamp01to100(v) {
  return Math.max(0, Math.min(100, v));
}

export function snapToGridPercent(value, divisions) {
  const div = Math.max(2, Number(divisions) || GRID_DEFAULT_DIVISIONS);
  const step = 100 / div;
  const cellIndex = Math.floor(value / step);
  const center = cellIndex * step + step / 2;
  return clamp01to100(center);
}

export function snapPointToGrid({ x, y }, divisions) {
  return {
    x: snapToGridPercent(x, divisions),
    y: snapToGridPercent(y, divisions),
  };
}

// ===== HP HELPERS =====
export function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}
export function hpPercent(marker) {
  const maxHp = Number(marker?.maxHp ?? 0);
  const curHp = Number(marker?.currentHp ?? 0);
  if (!maxHp || maxHp <= 0) return 0;
  return clamp((curHp / maxHp) * 100, 0, 100);
}
export function hpColor(percent) {
  if (percent > 60) return "#22c55e";
  if (percent > 30) return "#facc15";
  return "#ef4444";
}

export const MARKER_COLORS = ["#ef4444", "#f97316", "#facc15", "#22c55e", "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899", "#ffffff"];

export const MARKER_TYPES = [
  { id: "hero", label: "Herói", icon: "♟️" },
  { id: "enemy", label: "Inimigo", icon: "💀" },
  { id: "npc", label: "NPC", icon: "🗣️" },
  { id: "loot", label: "Item", icon: "💎" },
];

// =========================
// Status / Condições do Token
// =========================
export const STATUS_LIBRARY = [
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

export const STATUS_LABEL_BY_KEY = Object.fromEntries(STATUS_LIBRARY.map((s) => [s.key, s.label]));
export const STATUS_ICON_BY_KEY = Object.fromEntries(STATUS_LIBRARY.map((s) => [s.key, s.icon]));


export const DICE_OPTS = [
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
export const EVENT_TYPES = [
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

export function splitTags(input) {
  if (!input) return [];
  return String(input)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 12);
}

export const LOADING_QUOTES = ["Afistando as espadas...", "Convocando os dragões...", "Rolando iniciativa...", "Preparando magias..."];

export function formatTime(date) {
  return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

// --- FUNÇÕES AUXILIARES DE ATRIBUTOS ---
export function getAbilityMod(score) {
  return Math.floor((Number(score || 10) - 10) / 2);
}
export function formatModifier(mod) {
  return mod >= 0 ? `+${mod}` : `${mod}`;
}
// ---------------------------------------

export const CSS_STYLES = `
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

  .session-shell{ position:fixed!important; inset:0!important; width:100vw!important; height:100dvh!important; z-index:9999!important; background: var(--bg); font-family:"Inter",system-ui,sans-serif; }
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
    background: var(--panel-bg);
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

export function safeString(v, fallback = "") {
  if (v == null) return fallback;
  if (typeof v === "string") return v;
  try {
    return String(v);
  } catch {
    return fallback;
  }
}

export function normalizeIncomingLogs(payload) {
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
    };
  };

  const out = normalizeOne(payload);
  if (!out) return [];
  return Array.isArray(out) ? out : [out];
}

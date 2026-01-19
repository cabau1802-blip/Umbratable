require("dotenv").config();

const http = require("http");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const multer = require("multer");
const { Server } = require("socket.io");
const path = require("path");
const fs = require("fs");
const jwt = require("jsonwebtoken");
const usersRoutes = require("./routes/users.routes");

const { pool } = require("./db");
const { getUserLimits } = require("./services/userLimits.service");

// Rotas
const authRoutes = require("./routes/auth.routes");
const campaignRoutes = require("./routes/campaign.routes");
const characterRoutes = require("./routes/character.routes");
const friendsRoutes = require("./routes/friendsRoutes");
const campaignInvitationsRoutes = require("./routes/campaignInvitationsRoutes");
const uploadRoutes = require("./routes/upload.routes");
const aiRoutes = require("./routes/ai.routes");

// Feedback (Sugestões)
const feedbackRoutes = require("./routes/feedback.routes");
const adminRoutes = require("./routes/admin.routes");

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

// ==========================================
// 0.1) FAIL-FAST de ENV crítica (evita 500 misterioso no /auth/login)
// ==========================================
if (!process.env.JWT_SECRET || !String(process.env.JWT_SECRET).trim()) {
  console.error("[FATAL] JWT_SECRET não configurado. Defina JWT_SECRET no ambiente/.env antes de subir o servidor.");
}

// ==========================================
// 0) GARANTIR PASTA DE UPLOADS
// ==========================================
const uploadsDir = path.resolve(__dirname, "..", "uploads");
if (!fs.existsSync(uploadsDir)) {
  console.log("Criando pasta de uploads em:", uploadsDir);
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// ==========================================
// 1) LOG + WHOAMI
// ==========================================
app.get("/__whoami", (req, res) => {
  res.json({
    pid: process.pid,
    port: PORT,
    time: new Date().toISOString(),
    origin: req.headers.origin || null,
  });
});

app.use((req, res, next) => {
  // Correlation id simples para facilitar rastreio de 500 em logs
  const rid = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  req._rid = rid;
  res.setHeader("x-request-id", rid);
  console.log(`[REQUEST] rid=${rid} ${req.method} ${req.url} | Origin: ${req.headers.origin || "-"}`);
  next();
});

// ==========================================
// 2) CORS HARD (HTTP) - CORRIGIDO
//    - Normaliza Origin (remove barra final, trim, aceita :443)
//    - Aceita também https://*.umbratable.com.br
//    - Responde preflight com app.options("*", ...)
// ==========================================

// Origem exata (sem barra final). Inclua aqui suas origens adicionais se necessário.
const allowedOrigins = new Set([
  "https://homolog.umbratable.com.br",
  "https://app.umbratable.com.br",
  "https://umbratable.com.br",
  "https://www.umbratable.com.br",

  "http://localhost:5731",
  "http://127.0.0.1:5731",
  "http://192.168.101.127",
  "http://192.168.101.127:5173",
  "http://192.168.101.127:3001",
]);

function normalizeOrigin(origin) {
  if (!origin || typeof origin !== "string") return origin;
  let o = origin.trim();

  // Remove barra final (Origin não deveria vir com '/', mas proxies às vezes inserem)
  o = o.replace(/\/+$/, "");

  // Normaliza :443 em https e :80 em http (casos raros)
  o = o.replace(/^https:\/\/(.+):443$/i, "https://$1");
  o = o.replace(/^http:\/\/(.+):80$/i, "http://$1");

  return o;
}

function isAllowedOrigin(originRaw) {
  const origin = normalizeOrigin(originRaw);

  // Sem Origin (curl/healthcheck/server-to-server)
  if (!origin) return true;

  if (allowedOrigins.has(origin)) return true;

  // Libera também subdomínios: https://<algo>.umbratable.com.br
  // (inclui app.umbratable.com.br, staging, etc.)
  if (/^https:\/\/([a-z0-9-]+\.)?umbratable\.com\.br$/i.test(origin)) return true;

  return false;
}

const corsOptions = {
  origin: function (origin, callback) {
    if (isAllowedOrigin(origin)) return callback(null, true);
    // ... (mesma lógica de erro)
    const o = normalizeOrigin(origin);
    const msg = "A política CORS deste site não permite acesso desta origem: " + (o || origin);
    return callback(new Error(msg), false);
  },
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  // ADICIONEI "x-access-token" AQUI ABAIXO:
  allowedHeaders: ["Content-Type", "Authorization", "x-access-token", "Cache-Control", "Pragma"],
  credentials: true,
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

// === NOVO: MIDDLEWARE ANTI-CACHE GLOBAL ===
// Isso resolve o problema do 304 (Not Modified) nas rotas de API
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

// ==========================================
// 3) Middlewares e Estáticos
// ==========================================
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

app.use("/uploads", express.static(uploadsDir));

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);
app.use(morgan("dev"));

// ==========================================
// 3.1) Upload de imagem (Tokens/Marcadores)
// ==========================================
const uploadStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const safeExt = path.extname(file.originalname || "").toLowerCase() || ".png";
    const base = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${base}${safeExt}`);
  },
});

const upload = multer({
  storage: uploadStorage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /^image\//.test(file.mimetype || "");
    if (!ok) return cb(new Error("Tipo de arquivo inválido. Envie uma imagem."));
    cb(null, true);
  },
});

app.post("/upload", (req, res) => {
  upload.single("file")(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      console.error("Erro Multer:", err);
      return res.status(400).json({ message: `Erro no upload: ${err.message}` });
    } else if (err) {
      console.error("Erro Upload:", err);
      return res.status(400).json({ message: err.message });
    }

    if (!req.file) return res.status(400).json({ message: "Nenhum arquivo enviado." });

    const url = `/uploads/${req.file.filename}`;
    console.log("Upload realizado:", url);
    return res.json({ url });
  });
});

// ==========================================
// 4) Socket.io (CORS alinhado com HTTP) - CORRIGIDO
// ==========================================
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) return callback(null, true);
      return callback(new Error("A política CORS deste site não permite acesso desta origem: " + normalizeOrigin(origin)), false);
    },
    methods: ["GET", "POST"],
    credentials: true,
  },
  maxHttpBufferSize: 50 * 1024 * 1024,

  // (Opcional) reduzir tempo de detecção do disconnect do socket.io
  // pingInterval: 10000,
  // pingTimeout: 5000,
});

// Expondo io para controllers que usam req.app.get("io")
app.set("io", io);

// Também injeta io em req.io (compatibilidade com seus controllers atuais)
app.use((req, res, next) => {
  req.io = io;
  next();
});

// ======================
// Helpers (mantidos)
// ======================
function normalizeCampaignId(input) {
  if (input == null) return null;

  if (typeof input === "string" || typeof input === "number") return String(input);

  if (typeof input === "object") {
    const v = input.campaignId ?? input.room ?? input.id ?? null;
    if (v == null) return null;
    return typeof v === "string" || typeof v === "number" ? String(v) : null;
  }

  return null;
}

function isValidMarkersPayload(payload) {
  if (!payload || typeof payload !== "object") return false;
  const campaignId = normalizeCampaignId(payload.campaignId);
  if (!campaignId) return false;
  if (!Array.isArray(payload.markers)) return false;
  return true;
}

function isValidFogStrokePayload(payload) {
  if (!payload || typeof payload !== "object") return false;
  const campaignId = normalizeCampaignId(payload.campaignId);
  if (!campaignId) return false;
  const stroke = payload.stroke;
  if (!stroke || typeof stroke !== "object") return false;
  if (stroke.type !== "stroke") return false;
  if (!Array.isArray(stroke.points)) return false;
  return true;
}

// ======================
// Auth Socket (permissões reais)
// ======================
function getTokenFromSocket(socket) {
  const t = socket?.handshake?.auth?.token;
  if (t) return t;

  const q = socket?.handshake?.query?.token;
  if (q) return q;

  const authHeader = socket?.handshake?.headers?.authorization;
  if (authHeader?.startsWith("Bearer ")) return authHeader.slice(7);

  return null;
}

async function isUserGmOnCampaign(userId, campaignId) {
  const { rows } = await pool.query(`SELECT 1 FROM campaigns WHERE id = $1 AND owner_id = $2 LIMIT 1`, [campaignId, userId]);
  return rows.length > 0;
}

// Middleware socket auth: coloca socket.userId (confiável)
io.use((socket, next) => {
  try {
    const token = getTokenFromSocket(socket);
    if (!token) return next(new Error("unauthorized"));

    const secret = process.env.JWT_SECRET;
    if (!secret) return next(new Error("missing_jwt_secret"));

    const decoded = jwt.verify(token, secret);
    const userId = decoded?.id || decoded?.userId;

    if (!userId) return next(new Error("invalid_token_payload"));

    socket.userId = String(userId);
    return next();
  } catch (err) {
    return next(new Error("unauthorized"));
  }
});

// ======================
// PRESENÇA (HARDENED) — in-memory
// ======================
const presenceStateByUserId = new Map(); // userId -> { status: 'online'|'offline', lastSeen }
const activeSocketsByUserId = new Map(); // userId -> Set(socket.id)

// NOVO: heartbeat para resolver “online fantasma”
const lastHeartbeatByUserId = new Map(); // userId -> timestamp(ms)
const PRESENCE_HEARTBEAT_MAX_SILENCE_MS = 45_000; // se ficar >45s sem heartbeat, marca offline
const PRESENCE_SWEEP_INTERVAL_MS = 15_000;

function ensureSocketSet(userId) {
  const k = String(userId);
  const cur = activeSocketsByUserId.get(k);
  if (cur) return cur;
  const s = new Set();
  activeSocketsByUserId.set(k, s);
  return s;
}

function setPresence(userId, status) {
  const k = String(userId);
  const prev = presenceStateByUserId.get(k) || {};
  const next = {
    status,
    lastSeen: status === "offline" ? Date.now() : prev.lastSeen || null,
  };
  presenceStateByUserId.set(k, next);
  return next;
}

function getPresence(userId) {
  const k = String(userId);
  const p = presenceStateByUserId.get(k);
  if (!p) return { status: "offline", lastSeen: null };
  return p;
}

function presenceRoomFor(targetUserId) {
  return `presence:watch:${String(targetUserId)}`;
}

function emitPresenceUpdate(targetUserId) {
  const k = String(targetUserId);
  const p = getPresence(k);

  io.to(presenceRoomFor(k)).emit("presence_update", {
    userId: k,
    status: p.status,
    lastSeen: p.lastSeen,
    at: Date.now(),
  });
}

// NOVO: sweep periódico para “desconexão fantasma”
setInterval(() => {
  try {
    const now = Date.now();
    for (const [userId, lastBeat] of lastHeartbeatByUserId.entries()) {
      if (!userId) continue;

      const silence = now - Number(lastBeat || 0);
      if (!Number.isFinite(silence)) continue;

      if (silence > PRESENCE_HEARTBEAT_MAX_SILENCE_MS) {
        const cur = getPresence(userId);
        if (cur.status === "online") {
          // força offline (corrige online preso)
          setPresence(userId, "offline");
          emitPresenceUpdate(userId);
        }

        // limpa tracking para não ficar pesado
        lastHeartbeatByUserId.delete(userId);
        activeSocketsByUserId.delete(String(userId));
      }
    }
  } catch (e) {
    console.error("[presence] sweep error:", e);
  }
}, PRESENCE_SWEEP_INTERVAL_MS);

// ======================
// Helpers de sanitização (mantidos)
// ======================
function indexById(list) {
  const m = new Map();
  for (const it of Array.isArray(list) ? list : []) {
    if (it?.id != null) m.set(String(it.id), it);
  }
  return m;
}

function normalizeMarker(m) {
  if (!m || typeof m !== "object") return null;
  const id = m.id != null ? String(m.id) : "";
  if (!id) return null;

  return {
    ...m,
    id,
    ownerKey: m.ownerKey != null ? String(m.ownerKey) : "",
    x: Number(m.x ?? 0),
    y: Number(m.y ?? 0),
    label: String(m.label ?? ""),
    color: String(m.color ?? "#ffffff"),
    type: String(m.type ?? "hero"),
    avatar: m.avatar ?? null,
    maxHp: Number(m.maxHp ?? 10),
    currentHp: Number(m.currentHp ?? m.maxHp ?? 10),
    status: Array.isArray(m.status) ? m.status : [],
  };
}

/**
 * Regras:
 * - GM: aceita tudo
 * - Player: só pode criar/alterar/deletar marker onde ownerKey === userId
 * - Player não pode trocar ownerKey de marker existente
 */
function sanitizeMarkersUpdate({ userId, isGM, incomingMarkers, existingMarkers }) {
  const incoming = (Array.isArray(incomingMarkers) ? incomingMarkers : []).map(normalizeMarker).filter(Boolean);

  const existing = (Array.isArray(existingMarkers) ? existingMarkers : []).map(normalizeMarker).filter(Boolean);

  if (isGM) {
    return { allowedMarkers: incoming, changed: true };
  }

  const userKey = String(userId);

  const existingById = indexById(existing);
  const incomingById = indexById(incoming);

  const result = [];
  let changed = false;

  for (const oldM of existing) {
    const id = String(oldM.id);
    const newM = incomingById.get(id);

    if (!newM) {
      if (oldM.ownerKey === userKey) {
        changed = true;
        continue;
      }
      result.push(oldM);
      continue;
    }

    if (oldM.ownerKey !== userKey) {
      result.push(oldM);
      continue;
    }

    const merged = { ...oldM, ...newM, ownerKey: oldM.ownerKey };
    result.push(merged);
    changed = true;
  }

  for (const newM of incoming) {
    const id = String(newM.id);
    if (existingById.has(id)) continue;

    if (newM.ownerKey === userKey) {
      result.push(newM);
      changed = true;
    } else {
      changed = true;
    }
  }

  return { allowedMarkers: result, changed };
}

// ==========================================
// 4.1) Persistência PostgreSQL (Realtime State)
// ==========================================
const REALTIME_TABLE = "campaign_realtime_state";

const writeTimersRef = new Map();
const inMemoryLastRef = new Map();

const GM_WRITE_DEBOUNCE_MS = 800;
const MARKERS_WRITE_DEBOUNCE_MS = 350;
const FOG_WRITE_DEBOUNCE_MS = 1200;

async function ensureRealtimeStateRow(campaignId) {
  await pool.query(
    `
    INSERT INTO ${REALTIME_TABLE} (campaign_id)
    VALUES ($1)
    ON CONFLICT (campaign_id) DO NOTHING
  `,
    [campaignId]
  );
}

async function getRealtimeState(campaignId) {
  const { rows } = await pool.query(
    `
    SELECT
      campaign_id,
      maps,
      markers,
      initiative_entries,
      current_map_index,
      fog_strokes,
      weather_by_map,
      updated_at
    FROM ${REALTIME_TABLE}
    WHERE campaign_id = $1
    LIMIT 1
  `,
    [campaignId]
  );

  if (!rows.length) return null;

  const r = rows[0];
  return {
    campaignId: r.campaign_id,
    maps: r.maps || [],
    markers: r.markers || [],
    initiativeEntries: r.initiative_entries || [],
    currentMapIndex: Number(r.current_map_index || 0),
    fogStrokes: r.fog_strokes || [],
    weatherByMap: r.weather_by_map || {},
    updatedAt: r.updated_at,
  };
}

function setLastStatePartial(campaignId, patch) {
  const prev =
    inMemoryLastRef.get(campaignId) || {
      maps: [],
      markers: [],
      initiativeEntries: [],
      currentMapIndex: 0,
      fogStrokes: [],
      weatherByMap: {},
    };

  const next = { ...prev, ...patch };
  inMemoryLastRef.set(campaignId, next);
  return next;
}

async function upsertRealtimeState(campaignId, state) {
  await pool.query(
    `
    INSERT INTO ${REALTIME_TABLE}
      (campaign_id, maps, markers, initiative_entries, current_map_index, fog_strokes, weather_by_map, updated_at)
    VALUES
      ($1, $2::jsonb, $3::jsonb, $4::jsonb, $5, $6::jsonb, $7::jsonb, NOW())
    ON CONFLICT (campaign_id) DO UPDATE SET
      maps = EXCLUDED.maps,
      markers = EXCLUDED.markers,
      initiative_entries = EXCLUDED.initiative_entries,
      current_map_index = EXCLUDED.current_map_index,
      fog_strokes = EXCLUDED.fog_strokes,
      weather_by_map = EXCLUDED.weather_by_map,
      updated_at = NOW()
  `,
    [
      campaignId,
      JSON.stringify(Array.isArray(state.maps) ? state.maps : []),
      JSON.stringify(Array.isArray(state.markers) ? state.markers : []),
      JSON.stringify(Array.isArray(state.initiativeEntries) ? state.initiativeEntries : []),
      Number.isFinite(Number(state.currentMapIndex)) ? Number(state.currentMapIndex) : 0,
      JSON.stringify(Array.isArray(state.fogStrokes) ? state.fogStrokes : []),
      JSON.stringify(state.weatherByMap && typeof state.weatherByMap === "object" ? state.weatherByMap : {}),
    ]
  );
}

async function updateMarkersOnly(campaignId, markers) {
  await ensureRealtimeStateRow(campaignId);
  await pool.query(
    `
    UPDATE ${REALTIME_TABLE}
    SET markers = $2::jsonb,
        updated_at = NOW()
    WHERE campaign_id = $1
  `,
    [campaignId, JSON.stringify(Array.isArray(markers) ? markers : [])]
  );
}

async function updateFogAll(campaignId, fogStrokes) {
  await ensureRealtimeStateRow(campaignId);
  await pool.query(
    `
    UPDATE ${REALTIME_TABLE}
    SET fog_strokes = $2::jsonb,
        updated_at = NOW()
    WHERE campaign_id = $1
  `,
    [campaignId, JSON.stringify(Array.isArray(fogStrokes) ? fogStrokes : [])]
  );
}

async function clearFogStrokes(campaignId) {
  await ensureRealtimeStateRow(campaignId);
  await pool.query(
    `
    UPDATE ${REALTIME_TABLE}
    SET fog_strokes = '[]'::jsonb,
        updated_at = NOW()
    WHERE campaign_id = $1
  `,
    [campaignId]
  );
}

function getTimers(campaignId) {
  const cur = writeTimersRef.get(campaignId) || {};
  writeTimersRef.set(campaignId, cur);
  return cur;
}

function debounceCampaignWrite(campaignId, key, ms, fn) {
  const timers = getTimers(campaignId);
  if (timers[key]) clearTimeout(timers[key]);
  timers[key] = setTimeout(async () => {
    timers[key] = null;
    try {
      await fn();
    } catch (err) {
      console.error(`[DB] Falha no debounce(${key}) campanha=${campaignId}:`, err);
    }
  }, ms);
}

// ==========================================
// 4.2) Socket handlers
// ==========================================
io.on("connection", (socket) => {
  console.log("Novo jogador conectado via Socket:", socket.id, "| userId:", socket.userId);

  // sala do usuário para mensagens
  if (socket.userId) {
    socket.join(`user:${socket.userId}`);
  }

  // ======================
  // PRESENÇA (HARDENED)
  // ======================
  if (socket.userId) {
    const setForUser = ensureSocketSet(socket.userId);
    setForUser.add(socket.id);

    // Marca heartbeat inicial
    lastHeartbeatByUserId.set(String(socket.userId), Date.now());

    // Se primeira conexão ativa -> online
    if (setForUser.size === 1) {
      setPresence(socket.userId, "online");
      emitPresenceUpdate(socket.userId);
    }
  }

  // Heartbeat vindo do client
  socket.on("presence_heartbeat", () => {
    if (!socket.userId) return;
    const uid = String(socket.userId);
    lastHeartbeatByUserId.set(uid, Date.now());

    // Se estava offline por qualquer motivo, recupera para online
    const cur = getPresence(uid);
    if (cur.status !== "online") {
      setPresence(uid, "online");
      emitPresenceUpdate(uid);
    }
  });

  socket.on("presence_subscribe", (payload) => {
    try {
      const ids = Array.isArray(payload?.userIds) ? payload.userIds : Array.isArray(payload) ? payload : [];
      for (const raw of ids) {
        if (!raw) continue;
        socket.join(presenceRoomFor(String(raw)));
      }
    } catch (e) {
      console.error("[presence] subscribe error:", e);
    }
  });

  socket.on("presence_unsubscribe", (payload) => {
    try {
      const ids = Array.isArray(payload?.userIds) ? payload.userIds : Array.isArray(payload) ? payload : [];
      for (const raw of ids) {
        if (!raw) continue;
        socket.leave(presenceRoomFor(String(raw)));
      }
    } catch (e) {
      console.error("[presence] unsubscribe error:", e);
    }
  });

  socket.on("presence_get_snapshot", (payload) => {
    try {
      const ids = Array.isArray(payload?.userIds) ? payload.userIds : Array.isArray(payload) ? payload : [];
      const snapshot = {};
      for (const raw of ids) {
        const k = String(raw);
        const p = getPresence(k);
        snapshot[k] = { status: p.status, lastSeen: p.lastSeen };
      }
      socket.emit("presence_snapshot", { snapshot, at: Date.now() });
    } catch (e) {
      console.error("[presence] snapshot error:", e);
    }
  });

  socket.on("join_user_room", (userIdFromClient) => {
    const uid = socket.userId || userIdFromClient;
    if (!uid) return;
    socket.join(`user:${uid}`);
  });

  // JOIN CAMPAIGN + RESYNC (DB)
  socket.on("join_campaign", async (campaignId) => {
    const room = normalizeCampaignId(campaignId);
    if (!room) return;

    // ======================
    // QUOTA: max players por campanha (fora o GM)
    // ======================
    try {
      // Busca owner_id
      const ownerRes = await pool.query("SELECT owner_id FROM campaigns WHERE id = $1 LIMIT 1", [room]);
      const ownerId = ownerRes.rows?.[0]?.owner_id != null ? String(ownerRes.rows[0].owner_id) : null;

      if (ownerId) {
        const joiningUserId = String(socket.userId);

        // GM não é bloqueado
        const isGm = ownerId === joiningUserId;

        // Conta usuários únicos conectados na sala (fora o GM)
        const roomName = `campaign:${room}`;
        const socketIds = io.sockets.adapter.rooms.get(roomName) || new Set();

        const userIdsInRoom = new Set();
        for (const sid of socketIds) {
          const s = io.sockets.sockets.get(sid);
          const uid = s?.userId != null ? String(s.userId) : null;
          if (!uid) continue;
          userIdsInRoom.add(uid);
        }

        const alreadyInRoom = userIdsInRoom.has(joiningUserId);

        // Remove GM do cálculo
        userIdsInRoom.delete(ownerId);

        const currentPlayers = userIdsInRoom.size;

        if (!isGm && !alreadyInRoom) {
          const gmLimits = await getUserLimits(ownerId);
          const limit = Number(gmLimits.max_players_per_campaign || 0);

          if (currentPlayers >= limit) {
            socket.emit("error_quota", {
              error: "QUOTA_EXCEEDED",
              message: "Você atingiu o limite do seu plano.",
              details: {
                limit,
                current: currentPlayers,
                resource: "players_per_campaign",
              },
            });
            return;
          }
        }
      }
    } catch (e) {
      console.error("[quota] join_campaign quota check failed:", e);
    }

    socket.join(room);
    socket.join(`campaign:${room}`);

    console.log(`Socket ${socket.id} entrou na campanha: ${room}`);

    try {
      const st = await getRealtimeState(room);
      if (st) {
        socket.emit("session_state_update", {
          campaignId: room,
          maps: st.maps,
          markers: st.markers,
          initiativeEntries: st.initiativeEntries,
          initiative: st.initiativeEntries,
          currentMapIndex: st.currentMapIndex,
          mapIndex: st.currentMapIndex,
          fogStrokes: st.fogStrokes,
          weatherByMap: st.weatherByMap || {},
          at: Date.now(),
          source: "db_resync",
        });

        setLastStatePartial(room, {
          maps: st.maps,
          markers: st.markers,
          initiativeEntries: st.initiativeEntries,
          currentMapIndex: st.currentMapIndex,
          fogStrokes: st.fogStrokes,
          weatherByMap: st.weatherByMap || {},
        });
      }
    } catch (err) {
      console.error("[DB] Falha ao carregar estado da campanha:", room, err);
    }
  });

  socket.on("map_ping", (data) => {
    const campaignId = normalizeCampaignId(data?.campaignId);
    if (!campaignId) return;

    io.to(campaignId).emit("map_ping", data);
    io.to(`campaign:${campaignId}`).emit("map_ping", data);
  });

  socket.on("send_log", (payload) => {
    const campaignId = normalizeCampaignId(payload?.campaignId);
    const logEntry = payload?.logEntry || payload?.log || payload?.entry;

    if (campaignId && logEntry) {
      io.to(campaignId).emit("receive_log", logEntry);
      io.to(`campaign:${campaignId}`).emit("receive_log", logEntry);
    }
  });

  socket.on("gm_update_state", async (payload) => {
    const campaignId = normalizeCampaignId(payload?.campaignId);
    if (!campaignId) return;

    let isGM = false;
    try {
      isGM = await isUserGmOnCampaign(socket.userId, campaignId);
    } catch (e) {
      console.error("[AUTH] Falha checar GM gm_update_state:", e);
      isGM = false;
    }
    if (!isGM) return;

    const maps = Array.isArray(payload?.maps) ? payload.maps : [];
    const markers = Array.isArray(payload?.markers) ? payload.markers : [];
    const initiativeEntries = Array.isArray(payload?.initiativeEntries)
      ? payload.initiativeEntries
      : Array.isArray(payload?.initiative)
      ? payload.initiative
      : [];
    const currentMapIndex =
      payload?.currentMapIndex != null
        ? Number(payload.currentMapIndex)
        : payload?.mapIndex != null
        ? Number(payload.mapIndex)
        : 0;
    const fogStrokes = Array.isArray(payload?.fogStrokes) ? payload.fogStrokes : [];

    const weatherByMap = payload?.weatherByMap && typeof payload.weatherByMap === "object" ? payload.weatherByMap : {};

    const merged = setLastStatePartial(campaignId, {
      maps,
      markers,
      initiativeEntries,
      currentMapIndex: Number.isFinite(currentMapIndex) ? currentMapIndex : 0,
      fogStrokes,
      weatherByMap,
    });

    debounceCampaignWrite(campaignId, "tGm", GM_WRITE_DEBOUNCE_MS, async () => {
      await upsertRealtimeState(campaignId, merged);
    });

    socket.to(campaignId).emit("session_state_update", {
      ...payload,
      campaignId,
      senderId: socket.userId,
      at: Date.now(),
    });
    socket.to(`campaign:${campaignId}`).emit("session_state_update", {
      ...payload,
      campaignId,
      senderId: socket.userId,
      at: Date.now(),
    });
  });

  const handleMarkersUpdate = async (payload) => {
    if (!isValidMarkersPayload(payload)) return;
    const campaignId = normalizeCampaignId(payload.campaignId);
    if (!campaignId) return;

    let isGM = false;
    try {
      isGM = await isUserGmOnCampaign(socket.userId, campaignId);
    } catch (e) {
      console.error("[AUTH] Falha checar GM markers_update:", e);
      isGM = false;
    }

    let existingMarkers = inMemoryLastRef.get(campaignId)?.markers;
    if (!Array.isArray(existingMarkers)) {
      try {
        const st = await getRealtimeState(campaignId);
        existingMarkers = st?.markers || [];
      } catch (e) {
        existingMarkers = [];
      }
    }

    const { allowedMarkers } = sanitizeMarkersUpdate({
      userId: socket.userId,
      isGM,
      incomingMarkers: payload.markers,
      existingMarkers,
    });

    setLastStatePartial(campaignId, { markers: allowedMarkers });

    debounceCampaignWrite(campaignId, "tMarkers", MARKERS_WRITE_DEBOUNCE_MS, async () => {
      const last = inMemoryLastRef.get(campaignId);
      await updateMarkersOnly(campaignId, last?.markers || []);
    });

    socket.to(campaignId).emit("markers_update", {
      ...payload,
      campaignId,
      senderId: socket.userId,
      markers: allowedMarkers,
      at: Date.now(),
    });
    socket.to(`campaign:${campaignId}`).emit("markers_update", {
      ...payload,
      campaignId,
      senderId: socket.userId,
      markers: allowedMarkers,
      at: Date.now(),
    });
  };

  socket.on("markers_update", handleMarkersUpdate);
  socket.on("update_markers", handleMarkersUpdate);
  socket.on("markers_updated", handleMarkersUpdate);
  socket.on("session_markers_update", handleMarkersUpdate);

  const handleFogUpdate = async (payload) => {
    if (!isValidFogStrokePayload(payload)) return;
    const campaignId = normalizeCampaignId(payload.campaignId);
    if (!campaignId) return;

    let isGM = false;
    try {
      isGM = await isUserGmOnCampaign(socket.userId, campaignId);
    } catch (e) {
      console.error("[AUTH] Falha checar GM fog_update:", e);
      isGM = false;
    }
    if (!isGM) return;

    socket.to(campaignId).emit("fog_update", {
      ...payload,
      campaignId,
      senderId: socket.userId,
      at: Date.now(),
    });
    socket.to(`campaign:${campaignId}`).emit("fog_update", {
      ...payload,
      campaignId,
      senderId: socket.userId,
      at: Date.now(),
    });

    const stroke = payload.stroke;
    const last =
      inMemoryLastRef.get(campaignId) || {
        maps: [],
        markers: [],
        initiativeEntries: [],
        currentMapIndex: 0,
        fogStrokes: [],
        weatherByMap: {},
      };

    const fogStrokes = Array.isArray(last.fogStrokes) ? last.fogStrokes : [];
    fogStrokes.push(stroke);

    setLastStatePartial(campaignId, { fogStrokes });

    debounceCampaignWrite(campaignId, "tFog", FOG_WRITE_DEBOUNCE_MS, async () => {
      const st = inMemoryLastRef.get(campaignId);
      await updateFogAll(campaignId, st?.fogStrokes || []);
    });
  };
  socket.on("fog_update", handleFogUpdate);

  socket.on("fog_clear", async (payload) => {
    const campaignId = normalizeCampaignId(payload?.campaignId);
    if (!campaignId) return;

    let isGM = false;
    try {
      isGM = await isUserGmOnCampaign(socket.userId, campaignId);
    } catch (e) {
      console.error("[AUTH] Falha checar GM fog_clear:", e);
      isGM = false;
    }
    if (!isGM) return;

    setLastStatePartial(campaignId, { fogStrokes: [] });

    try {
      await clearFogStrokes(campaignId);
    } catch (err) {
      console.error("[DB] Falha ao limpar fog:", campaignId, err);
    }

    socket.to(campaignId).emit("fog_clear", {
      campaignId,
      senderId: socket.userId,
      at: payload?.at ?? Date.now(),
    });
    socket.to(`campaign:${campaignId}`).emit("fog_clear", {
      campaignId,
      senderId: socket.userId,
      at: payload?.at ?? Date.now(),
    });
  });

  socket.on("sync_state", (payload) => {
    const campaignId = normalizeCampaignId(payload?.campaignId);
    const state = payload?.state;

    if (!campaignId || !state || typeof state !== "object") return;

    socket.broadcast.to(campaignId).emit("session_state_update", state);
    socket.broadcast.to(`campaign:${campaignId}`).emit("session_state_update", state);
  });

  socket.on("send_private_message", ({ toUserId, message, fromUserName }) => {
    if (!socket.userId) return;
    if (!toUserId || !message) return;

    io.to(`user:${toUserId}`).emit("receive_private_message", {
      fromUserId: socket.userId,
      message,
      fromUserName,
      timestamp: new Date().toISOString(),
    });
  });

  socket.on("campaign_chat_message", async (payload) => {
    try {
      if (!socket.userId) return;

      const campaignId = normalizeCampaignId(payload?.campaignId);
      const text = String(payload?.text ?? "").trim();

      if (!campaignId || !text) return;

      const fromUserId = String(socket.userId);
      const toUserId = payload?.toUserId != null && String(payload.toUserId).trim() ? String(payload.toUserId).trim() : null;
      const toName = payload?.toName != null && String(payload.toName).trim() ? String(payload.toName).trim() : null;

      const ts = Date.now();
      const id = payload?.id || `${campaignId}:${fromUserId}:${ts}:${Math.random().toString(16).slice(2)}`;

      const msg = {
        id,
        ts,
        campaignId,
        fromUserId,
        fromUserName: payload?.fromUserName || socket.userName || null,
        toUserId,
        toName,
        text,
      };

      if (!toUserId) {
        io.to(campaignId).emit("campaign_chat_message", msg);
        io.to(`campaign:${campaignId}`).emit("campaign_chat_message", msg);
        return;
      }

      let ownerId = null;
      try {
        const r = await pool.query("SELECT owner_id FROM campaigns WHERE id = $1", [campaignId]);
        ownerId = r.rows?.[0]?.owner_id != null ? String(r.rows[0].owner_id) : null;
      } catch (e) {
        ownerId = null;
      }

      io.to(`user:${fromUserId}`).emit("campaign_chat_message", msg);
      io.to(`user:${toUserId}`).emit("campaign_chat_message", msg);

      if (ownerId && ownerId !== fromUserId && ownerId !== toUserId) {
        io.to(`user:${ownerId}`).emit("campaign_chat_message", msg);
      }
    } catch (err) {
      console.error("[SOCKET] campaign_chat_message error:", err);
    }
  });

  socket.on("disconnect", (reason) => {
    try {
      console.warn("[CHAT SOCKET] disconnected:", reason);

      if (!socket.userId) return;

      const uid = String(socket.userId);

      const setForUser = activeSocketsByUserId.get(uid);
      if (setForUser) {
        setForUser.delete(socket.id);

        if (setForUser.size === 0) {
          activeSocketsByUserId.delete(uid);

          setPresence(uid, "offline");
          emitPresenceUpdate(uid);

          lastHeartbeatByUserId.delete(uid);
        }
      }
    } catch (e) {
      console.error("[presence] disconnect handler error:", e);
    }
  });
});

// ==========================================
// 5) Rotas da API
// ==========================================
app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    return res.json({ status: "ok" });
  } catch (error) {
    console.error("Erro no healthcheck:", error);
    return res.status(500).json({ status: "error", detail: "db-failure" });
  }
});

// CORREÇÃO: Removemos "/api" daqui pois o Nginx/Proxy já remove esse prefixo antes de chegar no Node.
app.use("/auth", authRoutes);
app.use("/campaigns", campaignRoutes);
app.use("/characters", characterRoutes);
app.use("/friends", friendsRoutes);
app.use("/users", usersRoutes);

// A rota nova da IA (O front chama /api/ai, aqui chega /ai)
app.use("/ai", aiRoutes); 

// Outras rotas
app.use("/feedback", feedbackRoutes);
app.use("/admin", adminRoutes);

// Convites e Uploads (geralmente na raiz relativa)
app.use("/", campaignInvitationsRoutes); // ou app.use("/invitations", ...) dependendo de como foi feito
app.use("/upload", uploadRoutes);

// ==========================================
// CORREÇÃO: Adicionado prefixo "/api" para alinhar com o Frontend
// ==========================================
app.use("/api/auth", authRoutes);           // Antes era: app.use("/auth", ...)
app.use("/api/campaigns", campaignRoutes);
app.use("/api/characters", characterRoutes);
app.use("/api/friends", friendsRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/ai", aiRoutes);

// Para convites, geralmente também se usa o prefixo /api se as rotas internas não tiverem
app.use("/api", campaignInvitationsRoutes); 

app.use("/api/feedback", feedbackRoutes);
app.use("/api/admin", adminRoutes);

// ==========================================
// 6) Tratamento de Erros (melhor CORS -> 403)
// ==========================================
app.use((req, res) => res.status(404).json({ message: "Rota não encontrada." }));

app.use((err, req, res, next) => {
  const rid = req?._rid || req?.requestId || null;
  console.error("Erro não tratado:", { rid, message: err?.message, stack: err?.stack });

  // CORS negado -> 403 (evita mascarar como 500)
  if (err?.message && String(err.message).includes("política CORS")) {
    return res.status(403).json({ message: err.message });
  }

  if (err.type === "entity.too.large") {
    return res.status(413).json({ message: "A imagem enviada é muito grande." });
  }

  const status = Number(err?.status) || Number(err?.statusCode) || 500;
  return res.status(status).json({
    message: err?.message || "Erro interno do servidor.",
    requestId: rid,
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`Acesse na rede via: http://192.168.101.127:${PORT}`);
  console.log(`Pasta de uploads: ${uploadsDir}`);
});

// Harden: loga falhas não capturadas (ajuda a identificar o 500 real no homolog)
process.on("unhandledRejection", (reason) => {
  console.error("[FATAL] unhandledRejection:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("[FATAL] uncaughtException:", err);
});

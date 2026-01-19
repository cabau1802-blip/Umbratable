import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
} from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";
import { api } from "../services/api";

const ChatContext = createContext();

const SOCKET_URL = (() => {
  const raw =
    import.meta.env.VITE_SOCKET_URL ||
    import.meta.env.VITE_API_URL ||
    window.location.origin;

  try {
    const u = new URL(raw, window.location.origin);
    // Socket.IO server is mounted on the origin (namespace default "/")
    return u.origin;
  } catch {
    return String(raw || "")
      .replace(/\/api\/?$/, "")
      .replace(/\/+$/, "");
  }
})();
const STORAGE_KEY = "dnd_global_chat_v1";

// NOVO: heartbeat do client (resolve “online fantasma”)
const PRESENCE_HEARTBEAT_INTERVAL_MS = 15_000;

export function ChatProvider({ children }) {
  const { user } = useAuth();

  const socketRef = useRef(null);
  const disconnectTimerRef = useRef(null);
  const heartbeatTimerRef = useRef(null);

  const [chats, setChats] = useState({});
  const [activeChatId, setActiveChatId] = useState(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [recentContacts, setRecentContacts] = useState([]);
  const [notification, setNotification] = useState(null);

  const [refreshJoinRequestsSignal, setRefreshJoinRequestsSignal] = useState(0);

  const [presenceMap, setPresenceMap] = useState({});

  const activeChatIdRef = useRef(activeChatId);
  const isMinimizedRef = useRef(isMinimized);

  const notifTimeoutRef = useRef(null);
  const lastNotifAtRef = useRef(0);

  useEffect(() => {
    activeChatIdRef.current = activeChatId;
  }, [activeChatId]);

  useEffect(() => {
    isMinimizedRef.current = isMinimized;
  }, [isMinimized]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "object") setChats(parsed);
      } else {
        const legacy = localStorage.getItem("dnd_global_chat");
        if (legacy) {
          const parsedLegacy = JSON.parse(legacy);
          if (parsedLegacy && typeof parsedLegacy === "object") setChats(parsedLegacy);
          localStorage.setItem(STORAGE_KEY, legacy);
        }
      }
    } catch (e) {
      console.warn("[ChatContext] Falha ao ler storage:", e);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
    } catch (e) {
      console.warn("[ChatContext] Falha ao salvar storage:", e);
    }
  }, [chats]);

  const triggerNotification = useCallback((message) => {
    const now = Date.now();
    if (now - lastNotifAtRef.current < 650) return;
    lastNotifAtRef.current = now;

    setNotification(message);

    if (notifTimeoutRef.current) clearTimeout(notifTimeoutRef.current);
    notifTimeoutRef.current = setTimeout(() => setNotification(null), 4500);
  }, []);

  useEffect(() => {
    return () => {
      if (notifTimeoutRef.current) clearTimeout(notifTimeoutRef.current);
    };
  }, []);

  const safeLogoutUnauthorized = useCallback((err) => {
    const msg = String(err?.message || err || "").toLowerCase();
    if (msg.includes("unauthorized") || msg.includes("jwt") || msg.includes("token")) {
      localStorage.removeItem("token");
      window.location.href = "/login";
      return true;
    }
    return false;
  }, []);

  const subscribePresence = useCallback(async () => {
    try {
      const sock = socketRef.current;
      if (!sock?.connected) return;

      const friendsRes = await api.get("/friends");
      const friends = Array.isArray(friendsRes.data) ? friendsRes.data : [];
      const ids = friends.map((f) => String(f.id)).filter(Boolean);

      if (!ids.length) return;

      sock.emit("presence_subscribe", { userIds: ids });
      sock.emit("presence_get_snapshot", { userIds: ids });
    } catch (e) {
      console.warn("[ChatContext] subscribePresence falhou:", e?.message || e);
    }
  }, []);

  function startHeartbeat(socket) {
    stopHeartbeat();

    // envia imediatamente (evita aparecer offline por delay)
    socket.emit("presence_heartbeat");

    heartbeatTimerRef.current = setInterval(() => {
      if (!socket?.connected) return;
      socket.emit("presence_heartbeat");
    }, PRESENCE_HEARTBEAT_INTERVAL_MS);
  }

  function stopHeartbeat() {
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }
  }

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!user?.id || !token) return;

    if (disconnectTimerRef.current) {
      clearTimeout(disconnectTimerRef.current);
      disconnectTimerRef.current = null;
    }

    if (socketRef.current) {
      stopHeartbeat();
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    const socket = io(SOCKET_URL, {
  path: "/socket.io/",
  transports: ["websocket", "polling"],
  withCredentials: true,
  auth: {
    token,
  },
});

socketRef.current = socket;

    const onConnect = async () => {
      socket.emit("join_user_room", user.id);
      await subscribePresence();
      startHeartbeat(socket);
    };

    const onConnectError = (err) => {
      console.error("[CHAT SOCKET] connect_error:", err?.message || err);
      safeLogoutUnauthorized(err);
    };

    const onDisconnect = (reason) => {
      console.warn("[CHAT SOCKET] disconnected:", reason);
      stopHeartbeat();
    };

    const onReceivePrivateMessage = (data) => {
      const senderId = String(data.fromUserId);

      const newMsg = {
        text: data.message,
        sender: "other",
        timestamp: data.timestamp,
      };

      setChats((prev) => ({
        ...prev,
        [senderId]: [...(prev[senderId] || []), newMsg],
      }));

      setRecentContacts((prev) => {
        const exists = prev.find((c) => String(c.id) === senderId);
        if (!exists) return [...prev, { id: senderId, name: data.fromUserName }];
        return prev;
      });

      const currentActive = activeChatIdRef.current;
      const minimized = isMinimizedRef.current;

      if (currentActive !== senderId || minimized) {
        setUnreadCount((prev) => prev + 1);
        triggerNotification(`${data.fromUserName} mandou uma mensagem para você`);
      }
    };

    const onCampaignJoinRequestUpdate = () => {
      setRefreshJoinRequestsSignal((v) => v + 1);
    };

    const onPresenceUpdate = (payload) => {
      const uid = String(payload?.userId || "");
      if (!uid) return;

      setPresenceMap((prev) => ({
        ...prev,
        [uid]: {
          status: payload?.status || "offline",
          lastSeen: payload?.lastSeen ?? null,
        },
      }));
    };

    const onPresenceSnapshot = (payload) => {
      const snap = payload?.snapshot;
      if (!snap || typeof snap !== "object") return;

      setPresenceMap((prev) => ({
        ...prev,
        ...Object.fromEntries(
          Object.entries(snap).map(([uid, v]) => [
            String(uid),
            { status: v?.status || "offline", lastSeen: v?.lastSeen ?? null },
          ])
        ),
      }));
    };

    socket.on("connect", onConnect);
    socket.on("connect_error", onConnectError);
    socket.on("disconnect", onDisconnect);

    socket.on("receive_private_message", onReceivePrivateMessage);
    socket.on("campaign_join_request_update", onCampaignJoinRequestUpdate);

    socket.on("presence_update", onPresenceUpdate);
    socket.on("presence_snapshot", onPresenceSnapshot);

    return () => {
      stopHeartbeat();

      const disconnect = () => {
        socket.off();
        socket.disconnect();
        socketRef.current = null;
      };

      if (import.meta?.env?.DEV) {
        disconnectTimerRef.current = setTimeout(disconnect, 200);
        return;
      }

      disconnect();
    };
  }, [user?.id, triggerNotification, safeLogoutUnauthorized, subscribePresence]);

  const openChat = (friend) => {
    const id = String(friend.id);

    setRecentContacts((prev) => {
      if (!prev.find((c) => String(c.id) === id)) {
        return [...prev, { id, name: friend.name }];
      }
      return prev;
    });

    setActiveChatId(id);
    setIsMinimized(false);
    setUnreadCount(0);
  };

  const closeChat = () => {
    setActiveChatId(null);
    setIsMinimized(false);
  };

  const sendMessage = (message) => {
    if (!activeChatId || !message.trim()) return;

    socketRef.current?.emit("send_private_message", {
      toUserId: activeChatId,
      message,
      fromUserName: user?.username || user?.name,
    });

    setChats((prev) => ({
      ...prev,
      [activeChatId]: [
        ...(prev[activeChatId] || []),
        {
          text: message,
          sender: "me",
          timestamp: new Date().toISOString(),
        },
      ],
    }));
  };

  const getActiveChatName = () => {
    if (!activeChatId) return "";
    const contact = recentContacts.find((c) => String(c.id) === String(activeChatId));
    return contact?.name || "";
  };

  const hasSocket = !!socketRef.current?.connected;

  return (
    <ChatContext.Provider
      value={{
        chats,
        activeChatId,
        isMinimized,
        setIsMinimized,
        unreadCount,
        notification,
        openChat,
        closeChat,
        sendMessage,
        getActiveChatMessages: () => chats[activeChatId] || [],
        getActiveChatName,
        recentContacts,

        refreshJoinRequestsSignal,

        presenceMap,
        hasSocket,

        socket: socketRef.current,
        subscribePresence,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  return useContext(ChatContext);
}

// frontend/src/hooks/useActivityPing.js
import { useEffect, useRef } from "react";
import { pingActivity, startSession, endSession } from "../services/activityService";

/**
 * V1: mede tempo "ativo" aproximado via:
 * - startSession no mount (quando tem token)
 * - pingActivity a cada 60s
 * - endSession no unmount / beforeunload
 */
export function useActivityPing() {
  const sessionIdRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    let timer = null;
    let cancelled = false;

    (async () => {
      try {
        const sid = await startSession();
        if (!cancelled) sessionIdRef.current = sid;
      } catch {
        // silencioso
      }
    })();

    const tick = async () => {
      try {
        await pingActivity();
      } catch {
        // silencioso
      }
    };

    tick();
    timer = window.setInterval(tick, 60_000);

    const handleBeforeUnload = () => {
      const sid = sessionIdRef.current;
      if (!sid) return;
      try {
        // tenta usar sendBeacon (mais confiável no unload)
        const API_BASE =
        import.meta.env.VITE_API_URL ||
        import.meta.env.VITE_API_BASE_URL ||
        "";

        const token2 = localStorage.getItem("token");
        const payload = JSON.stringify({ sessionId: sid });

        if (navigator.sendBeacon && token2) {
          const blob = new Blob([payload], { type: "application/json" });
          // endpoint espera Bearer; sendBeacon não permite header -> fallback simples
          // então apenas tenta via fetch keepalive
        }

        fetch(`${API_BASE}/api/admin/activity/session/end`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: token2 ? `Bearer ${token2}` : "",
          },
          body: payload,
          keepalive: true,
        });
      } catch {
        // ignora
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      cancelled = true;
      if (timer) window.clearInterval(timer);
      window.removeEventListener("beforeunload", handleBeforeUnload);

      const sid = sessionIdRef.current;
      if (!sid) return;

      (async () => {
        try {
          await endSession(sid);
        } catch {
          // silencioso
        }
      })();
    };
  }, []);
}

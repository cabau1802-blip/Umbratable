// frontend/src/services/feedbackService.js
import { api } from "./api";

/**
 * Envia uma sugestão/feedback para o backend.
 * @param {Object} payload
 * @param {string=} payload.name
 * @param {string=} payload.email
 * @param {"Bug"|"Ideia"|"Melhoria"|"Experiência/UX"|"Outro"} payload.type
 * @param {string=} payload.area
 * @param {string} payload.message
 * @param {boolean=} payload.canContact
 */
export async function submitFeedback(payload) {
  const body = {
    name: (payload?.name ?? "").trim() || undefined,
    email: (payload?.email ?? "").trim() || undefined,
    type: payload?.type || "Outro",
    area: (payload?.area ?? "").trim() || undefined,
    message: String(payload?.message ?? ""),
    canContact: !!payload?.canContact,
  };

  const res = await api.post("/api/feedback", body);
  return res?.data;
}

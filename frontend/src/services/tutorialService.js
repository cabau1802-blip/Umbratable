// frontend/src/services/tutorialService.js
import api from "./api"; // ajuste se seu axios instance tiver outro path/nome

export async function markTutorialCompleted(completed = true) {
  const { data } = await api.patch("/auth/tutorial-completed", { completed });
  return data;
}


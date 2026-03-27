/**
 * Haptic Feedback Utility (Vibration API)
 * Simula sensação de app nativo em dispositivos móveis.
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Navigator/vibrate
 */

/** Vibração curta de seleção (clique no carrossel, seleção de horário) */
export const hapticSelect = () => {
  if (typeof window !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(10);
  }
};

/** Vibração de confirmação/sucesso (check-in confirmado) */
export const hapticConfirm = () => {
  if (typeof window !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate([15, 50, 30]);
  }
};

/** Vibração de aviso/erro */
export const hapticWarning = () => {
  if (typeof window !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate([30, 60, 30]);
  }
};

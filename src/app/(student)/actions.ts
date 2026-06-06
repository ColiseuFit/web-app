/**
 * Student App Server Actions — Centralized Aggregator.
 *
 * @architecture
 * - Padrão Agregador Centralizado (Centralized Aggregator Pattern).
 * - Reduz o acoplamento e mantém o tamanho de arquivos individuais sob o limite de 500 linhas.
 * - IMPORTANTE: Este arquivo NÃO possui "use server" pois cada sub-arquivo já o declara.
 *   Next.js 16/Turbopack proíbe "use server" em arquivos que usam re-export syntax.
 */

export { 
  getAvailableSlots, 
  performCheckIn, 
  cancelCheckIn 
} from "./actions-checkin";

export { 
  upsertPersonalRecord, 
  updateWeeklyTarget, 
  createGoal, 
  toggleGoalStatus, 
  deleteGoal 
} from "./actions-progress";

export { 
  updateWodResult, 
  getPaginatedHistory 
} from "./actions-score";

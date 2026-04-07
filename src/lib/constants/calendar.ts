/**
 * @SSoT Coliseu Calendar & Date Metadata
 * 
 * Este arquivo centraliza os labels de exibição e metadados cronológicos 
 * para a interface do Box, garantindo paridade entre todos os portais.
 * 
 * @principle "Single Source of Truth" para nomenclatura de dias e meses.
 */

/**
 * Full mapping of weekdays (0=Sunday -> 6=Saturday).
 * Used for full-width displays and profile headers.
 */
export const DAY_LABELS: Record<number, string> = {
  0: "Domingo",
  1: "Segunda-feira",
  2: "Terça-feira",
  3: "Quarta-feira",
  4: "Quinta-feira",
  5: "Sexta-feira",
  6: "Sábado",
};

/**
 * Standard 3-letter abbreviations for Grid columns and compact UI tables.
 * Sincronizado com os cabeçalhos de Turmas (Admin e Aluno).
 */
export const DAY_SHORT: Record<number, string> = {
  0: "DOM",
  1: "SEG",
  2: "TER",
  3: "QUA",
  4: "QUI",
  5: "SEX",
  6: "SÁB",
};

/**
 * Operational business days configuration (Monday to Sunday).
 * Sunday (0) is included to support optional weekend classes.
 */
export const ACTIVE_DAYS = [1, 2, 3, 4, 5, 6, 0];

/**
 * Visual order for grid displays.
 * Starts with Monday (1) as the gym cycle week, ending with Sunday (0).
 */
export const GRID_DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

/**
 * @SSoT MARCO ZERO — Data de Início Operacional do Sistema.
 * 
 * Define o limite retroativo de navegação no calendário. Nenhuma rota ou componente
 * deve exibir ou processar datas anteriores a este valor.
 * 
 * @rationale
 * Antes desta data, o Box não utilizava o sistema Coliseu V2. Portanto, não existem
 * WODs, check-ins ou grades de aulas no banco de dados. Exibir semanas anteriores
 * causaria grades em branco e invalidaria o processo de fechamento de presenças.
 * 
 * @consumers (onde este valor é utilizado)
 * - `src/lib/date-utils.ts` → `getMinWeekOffset(SYSTEM_START_DATE)` — Cálculo do limite de semanas.
 * - `src/app/(admin)/admin/turmas/page.tsx` — Guard de URL no servidor.
 * - `src/app/(admin)/admin/wods/page.tsx` — Guard de URL no servidor.
 * - `src/app/(student)/dashboard/page.tsx` — Guard de URL no servidor.
 * - `src/app/(admin)/admin/turmas/TurmasClient.tsx` — Desabilita botão "Semana Anterior" na UI.
 * - `src/app/(admin)/admin/wods/WodsClient.tsx` — Desabilita botão "Semana Anterior" na UI.
 * - `src/components/WeekWodCarousel.tsx` — Restringe navegação no carrossel do Aluno.
 * 
 * @change v1.0 — 2026-04-01 (Lançamento Coliseu V2)
 */
export const SYSTEM_START_DATE = "2026-04-01";

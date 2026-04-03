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
 * Operational business days configuration (Monday to Saturday).
 * Sunday (0) is considered a rest day for the WOD engine.
 */
export const ACTIVE_DAYS = [1, 2, 3, 4, 5, 6];

/**
 * Visual order for grid displays.
 * Starts with Monday (1) as the gym cycle week, ending with Sunday (0).
 */
export const GRID_DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

/**
 * Utilitários de Data para o Box (Coliseu V2).
 * 
 * @architecture
 * - Normaliza todas as operações de data para o Horário de Brasília (UTC-3).
 * - Evita o "drift" de data em servidores com timezone UTC puro ou clientes em outros fusos.
 * - Centraliza a lógica de "O que é HOJE para o Box?".
 */

/**
 * Retorna a data atual no formato YYYY-MM-DD ajustada para o fuso de Brasília.
 * Utilize esta função para queries no banco de dados (ex: buscar o WOD do dia).
 * 
 * @returns {string} Data formatada como "2026-03-31"
 */
export function getTodayDate(): string {
  const now = new Date();
  
  // Usamos Intl para garantir o fuso correto independente do TZ do servidor
  const formatter = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  
  const parts = formatter.formatToParts(now);
  const find = (type: string) => parts.find(p => p.type === type)?.value;
  
  return `${find('year')}-${find('month')}-${find('day')}`;
}

/**
 * Retorna o horário atual (HH:mm) ajustado para o fuso de Brasília.
 */
export function getNowBR(): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  return formatter.format(now);
}

/**
 * Verifica se um horário de início de aula já passou, considerando uma tolerância (grace period).
 * 
 * @param {string} timeStart - Horário da aula (HH:mm ou HH:mm:ss).
 * @param {number} graceMinutes - Minutos permitidos após o início (default 15).
 * @returns {boolean} True se a aula já começou e passou da tolerância.
 */
export function isTimePast(timeStart: string, graceMinutes: number = 15): boolean {
  const now = getNowBR();
  
  const [nowH, nowM] = now.split(':').map(Number);
  const [startH, startM] = timeStart.split(':').map(Number);

  const nowTotal = nowH * 60 + nowM;
  const startTotal = startH * 60 + startM;

  return nowTotal > (startTotal + graceMinutes);
}

/**
 * Formata uma string de data (YYYY-MM-DD) para exibição amigável.
 * 
 * @param {string} dateStr - Data no formato ISO.
 * @returns {string} Data formatada (ex: "31 Out, 2026")
 */
export function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return "—";
  
  const date = new Date(dateStr + "T00:00:00Z"); // Força UTC para evitar shift local
  
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC'
  }).replace('.', '');
}

/**
 * Retorna uma lista dos dias de uma determinada semana (Segunda a Domingo) no formato YYYY-MM-DD.
 * 
 * @param {number} offset - Deslocamento em semanas a partir da data atual (0 = atual, 1 = próxima, -1 = anterior)
 * @returns {string[]} Array de 7 datas representando a semana completa de treinos.
 */
export function getWeekDates(offset: number = 0): string[] {
  const today = getTodayDate();
  const todayDateObj = new Date(today + "T00:00:00Z");
  
  const dayOfWeek = todayDateObj.getUTCDay();
  // Se for Domingo (0), recuamos 6 dias para pegar a Segunda anterior
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; 
  
  // Aplica o offset de semanas (offset * 7 dias)
  const mondayMs = todayDateObj.getTime() - (daysFromMonday * 86400000) + (offset * 7 * 86400000);
  
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mondayMs + i * 86400000);
    return d.toISOString().split("T")[0];
  });
}

/**
 * MARCO ZERO — Calcula o offset mínimo de navegação baseado em `SYSTEM_START_DATE`.
 * 
 * @rationale
 * Impede que usuários naveguem para semanas anteriores à data de lançamento operacional
 * do Box, onde não existem aulas, WODs ou check-ins registrados. Sem este limite,
 * a grade de aulas exibiria "histórico infinito" em branco, o que é operacionalmente
 * incorreto e prejudica o fechamento obrigatório de presença.
 * 
 * @example
 * // Se hoje é 21/04/2026 e o sistema iniciou em 01/04/2026:
 * // getMinWeekOffset("2026-04-01") retorna -3 (3 semanas atrás)
 * 
 * @security
 * O offset retornado é validado no lado do servidor (Server Component) para impedir
 * manipulação via URL (ex: `?weekOffset=-999`).
 * 
 * @param {string} startDateStr - Data de início do sistema (SSoT: `SYSTEM_START_DATE` de `calendar.ts`).
 * @returns {number} Valor negativo (ou zero) do limite de semanas retroativo permitido.
 */
export function getMinWeekOffset(startDateStr: string): number {
  const today = getTodayDate();
  const todayDateObj = new Date(today + "T00:00:00Z");
  const startDateObj = new Date(startDateStr + "T00:00:00Z");

  // Alinhamos ambas as datas para suas respectivas Segundas-feiras (Monday)
  const todayDay = todayDateObj.getUTCDay();
  const todayMondayMs = todayDateObj.getTime() - ((todayDay === 0 ? 6 : todayDay - 1) * 86400000);
  
  const startDay = startDateObj.getUTCDay();
  const startMondayMs = startDateObj.getTime() - ((startDay === 0 ? 6 : startDay - 1) * 86400000);

  const diffMs = startMondayMs - todayMondayMs;
  
  // Retorna o número de semanas de diferença (geralmente negativo se estivermos no futuro do start)
  return Math.round(diffMs / (86400000 * 7));
}

/**
 * Gera um calendário semanal estruturado a partir de uma data base, garantindo aderência ao fuso de Brasília.
 * 
 * @param {string} baseDateStr - Data base no formato YYYY-MM-DD. Se nulo, usa a data atual local.
 * @param {number} offset - Deslocamento em semanas.
 * @param {number} daysToGenerate - Quantidade de dias para gerar (default 7 para admin, 6 para estudante).
 * @returns {Array<{label: string, date: string, isToday: boolean}>}
 */
export function generateWeekCalendar(baseDateStr?: string, offset: number = 0, daysToGenerate: number = 7) {
  const referenceDateStr = baseDateStr || getTodayDate();
  const referenceObj = new Date(referenceDateStr + "T00:00:00Z");
  
  const dayOfWeek = referenceObj.getUTCDay();
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const mondayMs = referenceObj.getTime() - (daysFromMonday * 86400000) + (offset * 7 * 86400000);
  
  const todayLocal = getTodayDate();

  return Array.from({ length: daysToGenerate }, (_, i) => {
    const d = new Date(mondayMs + i * 86400000);
    const dateStr = d.toISOString().split("T")[0];
    
    // Obter sigla do dia da semana (ex: 'seg', 'ter', 'qua') usando UTC para não pular
    const label = d.toLocaleDateString('pt-BR', { weekday: 'short', timeZone: 'UTC' }).replace('.', '');

    return {
      label: label,
      date: dateStr,
      isToday: dateStr === todayLocal,
    };
  });
}


/**
 * SSoT: Lógica de Precedência de Bloqueios (Feriados e Exceções).
 * Determina se um horário específico está cancelado e qual a regra aplicável.
 */
export interface Holiday {
  id: string;
  date: string;
  description: string;
  block_type: 'full_day' | 'period' | 'slot';
  start_time: string | null;
  end_time: string | null;
  class_slot_id: string | null;
}

/**
 * Verifica se uma aula está bloqueada baseada na hierarquia de regras:
 * 1. Bloqueio por Slot (ID específico)
 * 2. Bloqueio por Período (Intervalo de tempo)
 * 3. Bloqueio de Dia Inteiro
 */
export function checkIsSlotBlocked(
  slotId: string, 
  timeStart: string, 
  dateStr: string, 
  holidays: Holiday[]
): Holiday | null {
  const rules = holidays.filter(h => h.date === dateStr);
  if (!rules.length) return null;

  // 1. Prioridade: Bloqueio por Slot específico
  const slotBlock = rules.find(h => h.block_type === 'slot' && h.class_slot_id === slotId);
  if (slotBlock) return slotBlock;

  // 2. Prioridade: Bloqueio por Período
  const periodBlock = rules.find(h => {
    if (h.block_type !== 'period' || !h.start_time || !h.end_time) return false;
    // Compara strings HH:MM (DB retorna HH:MM:SS)
    const slotTime = timeStart.slice(0, 5); 
    const blockStart = h.start_time.slice(0, 5);
    const blockEnd = h.end_time.slice(0, 5);
    return slotTime >= blockStart && slotTime < blockEnd;
  });
  if (periodBlock) return periodBlock;

  // 3. Prioridade: Bloqueio de Dia Inteiro (Feriado)
  const fullDayBlock = rules.find(h => h.block_type === 'full_day');
  return fullDayBlock || null;
}

/**
 * SSoT: Resolve o Professor Responsável por uma aula considerando a hierarquia operacional.
 * 
 * @hierarchy
 * A resolução segue a precedência abaixo (ordem decrescente de especificidade):
 * 1. **Substituição ativa** (`class_substitutions`): Professor substituto confirmado para a data.
 * 2. **Perfil padrão** (`profiles` via `default_coach_id`): Coach titular da grade.
 * 3. **Legado** (`coach_name`): Nome textual legado (pré-vinculação de perfil).
 * 
 * @note Quando esta função retorna `isSubstitution: true`, a UI pode exibir
 * um indicador visual (ex: badge "SUB") para que o aluno saiba que o horário
 * tem um professor diferente do habitual.
 * 
 * @param slot - Slot da grade (`class_slots`) com joins de `class_substitutions` e `profiles`.
 * @param {string} dateStr - Data alvo no formato YYYY-MM-DD.
 * @returns {{ name: string, isSubstitution: boolean }} Nome resolvido e flag de substituição.
 */
export function resolveSlotCoach(slot: any, dateStr: string): { name: string, isSubstitution: boolean } {
  // Check for substitution for this specific date
  const substitutions = slot.class_substitutions || [];
  const activeSub = substitutions.find((sub: any) => sub.date === dateStr);
  
  if (activeSub) {
    return {
      name: activeSub.profiles?.full_name || activeSub.coach_profile?.full_name || "Professor Substituto",
      isSubstitution: true
    };
  }

  // Fallback to default coach profile or legacy name
  const name = slot.profiles?.full_name || slot.coach_profile?.full_name || slot.coach_name || "Sem instrutor";
  return { name, isSubstitution: false };
}
/**
 * SSoT: Cálculo Unificado de Ocupação.
 * Combina alunos com matrícula fixa (enrollments) e check-ins reais do dia,
 * garantindo que um mesmo aluno não seja contado duas vezes.
 * 
 * @param enrollmentIds - IDs dos alunos matriculados fixos na turma.
 * @param checkinIds - IDs dos alunos que realizaram check-in para aquela data específica.
 * @returns {number} O total de alunos únicos ocupando a turma.
 */
export function calculateSlotOccupancy(enrollmentIds: string[] = [], checkinIds: string[] = []): number {
  const uniqueStudents = new Set([...enrollmentIds, ...checkinIds]);
  return uniqueStudents.size;
}

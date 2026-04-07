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
 * Retorna uma lista dos dias de uma determinada semana (Segunda a Sábado) no formato YYYY-MM-DD.
 * 
 * @param {number} offset - Deslocamento em semanas a partir da data atual (0 = atual, 1 = próxima, -1 = anterior)
 * @returns {string[]} Array de 6 datas representando a semana de treinos.
 */
export function getWeekDates(offset: number = 0): string[] {
  const today = getTodayDate();
  const todayDateObj = new Date(today + "T00:00:00Z");
  
  const dayOfWeek = todayDateObj.getUTCDay();
  // Se for Domingo (0), recuamos 6 dias para pegar a Segunda anterior
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; 
  
  // Aplica o offset de semanas (offset * 7 dias)
  const mondayMs = todayDateObj.getTime() - (daysFromMonday * 86400000) + (offset * 7 * 86400000);
  
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(mondayMs + i * 86400000);
    return d.toISOString().split("T")[0];
  });
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


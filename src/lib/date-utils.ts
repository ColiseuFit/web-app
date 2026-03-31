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
 * Retorna uma lista dos dias da semana atual (Segunda a Sábado) no formato YYYY-MM-DD.
 * 
 * @returns {string[]} Array de 6 datas representando a semana de treinos.
 */
export function getWeekDates(): string[] {
  const today = getTodayDate();
  const todayDateObj = new Date(today + "T00:00:00Z");
  
  const dayOfWeek = todayDateObj.getUTCDay();
  // Se for Domingo (0), recuamos 6 dias para pegar a Segunda anterior
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; 
  
  const mondayMs = todayDateObj.getTime() - daysFromMonday * 86400000;
  
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(mondayMs + i * 86400000);
    return d.toISOString().split("T")[0];
  });
}

/**
 * Coliseu Running - Configurações de Nível e Métricas
 */

export type RunningLevelKey = 'iniciante' | 'intermediario' | 'avancado';

export interface RunningLevelInfo {
  key: RunningLevelKey;
  label: string;
  minPace: number; // segundos por km (ex: 390 = 6:30)
  maxPace?: number;
  color: string;
  description: string;
}

export const RUNNING_LEVELS: Record<RunningLevelKey, RunningLevelInfo> = {
  iniciante: {
    key: 'iniciante',
    label: 'Iniciante',
    minPace: 390, // > 6:30 min/km
    color: '#888888',
    description: 'Focado em base e consistência. Pace acima de 6:30 min/km.'
  },
  intermediario: {
    key: 'intermediario',
    label: 'Intermediário',
    minPace: 300, // 5:00 min/km
    maxPace: 390, // 6:30 min/km
    color: '#2980BA',
    description: 'Domínio de ritmo e volume médio. Pace entre 5:00 e 6:30 min/km.'
  },
  avancado: {
    key: 'avancado',
    label: 'Avançado',
    minPace: 0,
    maxPace: 300, // < 5:00 min/km
    color: '#E52521',
    description: 'Alta performance e velocidade. Pace abaixo de 5:00 min/km.'
  }
};

/**
 * Retorna o nível de corrida com base no pace (segundos por km)
 */
export function getRunningLevelFromPace(paceSeconds: number): RunningLevelInfo {
  if (paceSeconds < 300) return RUNNING_LEVELS.avancado;
  if (paceSeconds < 390) return RUNNING_LEVELS.intermediario;
  return RUNNING_LEVELS.iniciante;
}

/**
 * Formata pace em segundos para string mm:ss
 */
export function formatPace(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * Converte tempo (hh:mm:ss ou mm:ss) para segundos
 */
export function timeToSeconds(timeStr: string): number {
  const parts = timeStr.split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 0;
}

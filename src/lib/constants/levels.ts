/**
 * Coliseu Levels - Central Configuration & Normalization
 * 
 * Este arquivo é a ÚNICA fonte de verdade para metadados de níveis técnicos.
 * Baseado nas chaves definidas no Admin: 'iniciante', 'scale', 'intermediario', 'rx', 'elite'.
 */

export type LevelKey = 'iniciante' | 'scale' | 'intermediario' | 'rx' | 'elite' | string;

export interface LevelInfo {
  id: string; // ex: 'L1'
  key: string;
  label: string;
  color: string;
  textColor: string;
  btnTextColor: string;
  icon: string;
  description: string;
  requirements?: string;
  glow?: string;
  order: number; // For manual sorting in the UI
}

export const LEVEL_CONFIG: Record<string, LevelInfo> = {
  iniciante: {
    id: 'L1',
    key: 'iniciante',
    label: 'Iniciante',
    color: 'var(--lvl-white)',
    textColor: '#FFF',
    btnTextColor: '#000',
    icon: '/levels/icone-coliseu-levels-iniciante.svg',
    description: 'Domínio dos padrões básicos de movimento e construção de base aeróbica sólida.',
    requirements: 'Consistência e Técnica básica.',
    order: 1
  },
  scale: {
    id: 'L2',
    key: 'scale',
    label: 'Scale',
    color: 'var(--lvl-yellow)',
    textColor: '#000',
    btnTextColor: '#000',
    icon: '/levels/icone-coliseu-levels-amarelo.svg',
    description: 'Movimentos adaptados com maior volume e intensidade controlada.',
    requirements: 'Domínio do cardio e ginásticos básicos.',
    order: 2
  },
  intermediario: {
    id: 'L3',
    key: 'intermediario',
    label: 'Intermediário',
    color: 'var(--lvl-red)',
    textColor: '#FFF',
    btnTextColor: '#FFF',
    icon: '/levels/icone-coliseu-levels-vermelho.svg',
    description: 'Domínio de cargas moderadas e ginásticos intermediários (DU, Pullup, HSPU).',
    requirements: 'Resistência avançada e força base.',
    order: 3
  },
  rx: {
    id: 'L4',
    key: 'rx',
    label: 'RX',
    color: 'var(--lvl-brown)',
    textColor: '#FFF',
    btnTextColor: '#FFF',
    icon: '/levels/icone-coliseu-levels-marrom.svg',
    description: 'Padrão oficial de competição. Cargas prescritas e ginásticos complexos.',
    requirements: 'Força absoluta e técnica refinada.',
    order: 4
  },
  elite: {
    id: 'L5',
    key: 'elite',
    label: 'Elite',
    color: '#C5A059',
    textColor: '#C5A059',
    btnTextColor: '#000',
    icon: '/levels/icone-coliseu-levels-elite.svg',
    description: 'O topo da pirâmide. Atletas de alto rendimento, força bruta e ginásticos inabaláveis.',
    requirements: 'Capacidade física de elite nacional.',
    glow: 'rgba(197, 160, 89, 0.3)',
    order: 5
  }
};

/**
 * Normaliza qualquer string de nível para uma LevelInfo válida.
 * Suporta chaves do Admin, variações legadas e dados dinâmicos do banco.
 */
export function getLevelInfo(levelName?: string | null, dynamicConfig?: Record<string, LevelInfo>): LevelInfo {
  if (!levelName) return LEVEL_CONFIG.iniciante;

  const l = levelName.toLowerCase();
  
  // 1. Check dynamic config first if provided
  if (dynamicConfig && dynamicConfig[l]) return dynamicConfig[l];

  // 2. Check exact static keys
  if (l === 'iniciante') return LEVEL_CONFIG.iniciante;
  if (l === 'scale') return LEVEL_CONFIG.scale;
  if (l.includes('intermediario') || l === 'intermediário') return LEVEL_CONFIG.intermediario;
  if (l === 'rx') return LEVEL_CONFIG.rx;
  if (l === 'elite') return LEVEL_CONFIG.elite;

  // 3. Fallbacks for legacy/visual labels
  if (l.includes('branco')) return LEVEL_CONFIG.iniciante;
  if (l.includes('verde')) return LEVEL_CONFIG.scale;
  if (l.includes('azul')) return LEVEL_CONFIG.intermediario;
  if (l.includes('vermelho')) return LEVEL_CONFIG.rx;
  if (l.includes('ouro') || l.includes('preto') || l.includes('casca')) return LEVEL_CONFIG.elite;

  // 4. Match by ID
  if (l === 'l1') return LEVEL_CONFIG.iniciante;
  if (l === 'l2') return LEVEL_CONFIG.scale;
  if (l === 'l3') return LEVEL_CONFIG.intermediario;
  if (l === 'l4') return LEVEL_CONFIG.rx;
  if (l === 'l5') return LEVEL_CONFIG.elite;

  return LEVEL_CONFIG.iniciante;
}

/**
 * Retorna todos os níveis como um array ordenado (L1 -> L5)
 */
export const ALL_LEVELS = [
  LEVEL_CONFIG.iniciante,
  LEVEL_CONFIG.scale,
  LEVEL_CONFIG.intermediario,
  LEVEL_CONFIG.rx,
  LEVEL_CONFIG.elite
];

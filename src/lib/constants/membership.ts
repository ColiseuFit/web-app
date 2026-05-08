/**
 * 🎫 ACCESS TYPES: Classificação SSoT para controle de acesso.
 * 
 * @description
 * Define os tipos de acesso do aluno ao Coliseu.
 * - 'club': Membro nativo com acesso total ao box e ferramentas do app.
 * - 'club_pass': Membro vinculado por plataformas parceiras (Gympass, TotalPass).
 * 
 * @deprecated Usar `getCachedAccessTypes()` de `access_actions.ts` para dados dinâmicos.
 * Este arquivo serve apenas como fallback estático e referência de tipagem.
 */
export const MEMBERSHIP_TYPES = [
  { 
    id: 'club', 
    label: 'Clube Premium',
    description: 'Acesso às aulas CrossTraining do CT Coliseu.'
  },
  { 
    id: 'club_pass', 
    label: 'Clube Pass',
    description: 'Membro com acesso via Gympass ou TotalPass.'
  }
] as const;

export function getMembershipLabel(key: string | null | undefined) {
  const type = MEMBERSHIP_TYPES.find((t) => t.id === key);
  return type ? type.label : "Aluno";
}

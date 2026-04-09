/**
 * 🎫 MEMBERSHIP TYPES: Classificação SSoT para controle de acesso.
 * 
 * @description
 * Define os tipos de planos disponíveis no Coliseu para segmentação de funcionalidades.
 * - 'club': Aluno nativo com acesso total ao box e ferramentas do app.
 * - 'club_pass': Aluno vinculado por plataformas parceiras com acesso limitado.
 */
export const MEMBERSHIP_TYPES = [
  { key: "club", label: "Aluno Club", color: "#000000" },
  { key: "club_pass", label: "Aluno ClubPass", color: "#DC2626" },
];

export function getMembershipLabel(key: string | null | undefined) {
  const type = MEMBERSHIP_TYPES.find((t) => t.key === key);
  return type ? type.label : "Aluno Club";
}

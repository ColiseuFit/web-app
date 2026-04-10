/**
 * Single Source of Truth for Identity Logic.
 * 
 * Centraliza a lógica de tratamento de nomes e identidades para garantir
 * consistência entre os portais administrativo e do aluno.
 */

interface IdentityProfile {
  full_name?: string | null;
  display_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
}

/**
 * Retorna o nome de exibição priorizando o Nome Completo (SSoT).
 * Fallback: display_name -> "Atleta"
 */
export function getDisplayName(profile: IdentityProfile | null): string {
  if (!profile) return "Atleta";
  
  const fullName = profile.full_name?.trim();
  if (fullName) return fullName;
  
  const displayName = profile.display_name?.trim();
  if (displayName) return displayName;
  
  // Se tiver first/last mas não full (raro com o novo action)
  if (profile.first_name || profile.last_name) {
    return `${profile.first_name || ""} ${profile.last_name || ""}`.trim();
  }
  
  return "Atleta";
}

/**
 * Extrai as iniciais de um nome para uso em fallbacks de avatar.
 */
export function getInitials(name: string): string {
  if (!name || name === "Atleta") return "A";
  
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "A";
  
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  
  const first = parts[0][0];
  const last = parts[parts.length - 1][0];
  return (first + last).toUpperCase();
}

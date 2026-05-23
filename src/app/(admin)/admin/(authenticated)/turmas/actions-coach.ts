"use server";

import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getAdminContext } from "./actions-shared";

/**
 * SUBSTITUIÇÕES (Consulta): Recupera todos os coaches substitutos para uma data.
 * 
 * Utilizado para renderização dinâmica da grade e lógica do Portal do Coach.
 *
 * @param {string} date - Data para verificação (YYYY-MM-DD).
 * @returns {Promise<{ data?: any[]; error?: string }>} Lista de substituições com detalhes do perfil.
 */
export async function getSlotSubstitutions(date: string) {
  const ctx = await getAdminContext();
  if ("error" in ctx) return { error: ctx.error };

  const { data, error } = await ctx.adminClient
    .from("class_substitutions")
    .select(`
      id, class_slot_id, substitute_coach_id, date, notes,
      profiles:substitute_coach_id(id, full_name)
    `)
    .eq("date", date);

  if (error) return { error: "Erro ao buscar substituições: " + error.message };

  const sanitized = (data || []).map((d: any) => ({
    ...d,
    profiles: Array.isArray(d.profiles) ? d.profiles[0] : d.profiles
  }));
  return { data: sanitized };
}

/**
 * SUBSTITUIÇÃO DE COACH (Operação): Define ou remove um coach substituto para uma data específica.
 * 
 * @SSoT: Se coachId for null, a substituição é removida e o sistema volta ao 'default_coach_id'.
 * 
 * @security Role: Admin/Reception.
 * @param {string} slotId - UUID do horário.
 * @param {string | null} coachId - UUID do substituto (ou null para reset).
 * @param {string} date - Data (YYYY-MM-DD).
 * @param {string} [notes] - Notas opcionais (ex: férias, atestado).
 */
export async function addSubstitution(slotId: string, coachId: string | null, date: string, notes?: string) {
  const ctx = await getAdminContext();
  if ("error" in ctx) return { error: ctx.error };

  // If coachId is null, it means removing the substitution (falling back to default coach)
  if (!coachId) {
    const { error } = await ctx.adminClient
      .from("class_substitutions")
      .delete()
      .eq("class_slot_id", slotId)
      .eq("date", date);
    if (error) return { error: "Erro ao remover substituição: " + error.message };
  } else {
    // Upsert substitution
    const { error } = await ctx.adminClient
      .from("class_substitutions")
      .upsert({ class_slot_id: slotId, substitute_coach_id: coachId, date, notes }, { onConflict: "class_slot_id, date" });
    if (error) return { error: "Erro ao definir substituição: " + error.message };
  }

  revalidatePath("/admin/turmas");
  return { success: true };
}

/**
 * BUSCA RÁPIDA DE ALUNOS (Coach Portal): Pesquisa alunos por nome ou parte dele.
 * 
 * @param {string} query - Termo de busca (mínimo 2 caracteres).
 * @returns {Promise<{data?: any[], error?: string}>} Retorna lista de alunos com ID e Avatar.
 */
export async function searchStudentsCoachAction(query: string) {
  const ctx = await getAdminContext();
  if ("error" in ctx) return { error: ctx.error };

  if (!query || query.trim().length < 2) return { data: [] };
  const searchTerm = `%${query.trim()}%`;

  const { data, error } = await ctx.adminClient
    .from("profiles")
    .select("id, full_name, level, avatar_url")
    .or(`full_name.ilike.${searchTerm},first_name.ilike.${searchTerm},last_name.ilike.${searchTerm}`)
    .limit(10);

  if (error) return { error: "Erro na busca: " + error.message };
  return { data: data || [] };
}

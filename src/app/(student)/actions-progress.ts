"use server";

import { createClient , getAuthUser } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  personalRecordSchema,
  updateTargetSchema,
  goalSchema,
} from "@/lib/validations/security_schemas";

/**
 * REGISTRO DE RECORDE PESSOAL (PR): Registra ou atualiza um PR de movimento do aluno.
 * 
 * @security
 * - RLS: Vinculado ao `student_id = auth.uid()` via trigger/regras de RLS no Supabase.
 * - Zod: Validação estrita via `personalRecordSchema`.
 * - Integridade: Resolução de conflitos (UPSERT) na chave composta `student_id,movement_id`.
 * 
 * @param {Record<string, unknown>} formData - Dicionário contendo `movement_key`, `value`, `unit` e `date`.
 * @returns {Promise<{success?: boolean, error?: string}>} Retorna status da operação.
 */
export async function upsertPersonalRecord(formData: Record<string, unknown>): Promise<{ success?: boolean; error?: string }> {
  const validation = personalRecordSchema.safeParse(formData);
  if (!validation.success) {
    return { error: "Dados inválidos: " + validation.error.message };
  }

  const supabase = await createClient();
  const user = await getAuthUser();
  if (!user) return { error: "Não autenticado" };

  // Resolve mapping entre movement_key (campo do formulário) e movement_id (banco)
  const { movement_key, ...restData } = validation.data;
  const { error } = await supabase
    .from("personal_records")
    .upsert({
      student_id: user.id,
      movement_id: movement_key,
      ...restData,
      date: restData.date || new Date().toISOString().split("T")[0],
    }, { onConflict: "student_id,movement_id" });

  if (error) return { error: error.message };
  
  revalidatePath("/progresso");
  revalidatePath("/profile");
  return { success: true };
}

/**
 * META DE FREQUÊNCIA SEMANAL: Atualiza a meta semanal de frequência de treinos do aluno.
 * 
 * @security
 * - RLS: Modificações restritas por `auth.uid() = student_id`.
 * - Zod: Validação do valor limite semanal (range 1-7) via `updateTargetSchema`.
 * 
 * @param {number} weekly_target - Quantidade de dias alvo para treino na semana.
 * @returns {Promise<{success?: boolean, error?: string}>} Retorna status da persistência.
 */
export async function updateWeeklyTarget(weekly_target: number): Promise<{ success?: boolean; error?: string }> {
  const validation = updateTargetSchema.safeParse({ weekly_target });
  if (!validation.success) return { error: "Meta inválida" };

  const supabase = await createClient();
  const user = await getAuthUser();
  if (!user) return { error: "Não autenticado" };

  const { error } = await supabase
    .from("student_settings")
    .upsert({
      student_id: user.id,
      weekly_frequency_target: validation.data.weekly_target,
    }, { onConflict: "student_id" });

  if (error) return { error: error.message };

  revalidatePath("/progresso");
  return { success: true };
}

/**
 * CRIAÇÃO DE METAS E OBJETIVOS: Registra um objetivo estratégico do aluno no dashboard.
 * 
 * @security
 * - RLS: Segurança em nível de linha bloqueia inserção para outros perfis de alunos.
 * - Zod: Sanitização do campo título via `goalSchema`.
 * 
 * @param {string} title - Descrição textual da meta (ex: "Fazer 1 rep de Bar Muscle Up").
 * @returns {Promise<{success?: boolean, data?: {id: string, title: string, is_completed: boolean}, error?: string}>} Dados do objetivo criado ou erro.
 */
export async function createGoal(title: string): Promise<{ success?: boolean; data?: { id: string; title: string; is_completed: boolean }; error?: string }> {
  const validation = goalSchema.safeParse({ title });
  if (!validation.success) return { error: "Título inválido" };

  const supabase = await createClient();
  const user = await getAuthUser();
  if (!user) return { error: "Não autenticado" };

  const { data, error } = await supabase
    .from("student_goals")
    .insert({ student_id: user.id, title: validation.data.title })
    .select()
    .single();

  if (error) return { error: error.message };

  revalidatePath("/progresso");
  return { success: true, data };
}

/**
 * EXECUTAR CONCLUSÃO DE META: Marca ou desmarca o status de conclusão de um objetivo.
 * 
 * @security
 * - RLS: Filtro explícito `.eq("student_id", user.id)` impede manipulação por terceiros.
 * 
 * @param {string} goalId - UUID único do objetivo (`student_goals` table).
 * @param {boolean} currentStatus - Estado atual de conclusão da meta (será invertido).
 * @returns {Promise<{success?: boolean, error?: string}>} Retorna status da persistência.
 */
export async function toggleGoalStatus(goalId: string, currentStatus: boolean): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient();
  const user = await getAuthUser();
  if (!user) return { error: "Não autenticado" };

  const { error } = await supabase
    .from("student_goals")
    .update({ 
      is_completed: !currentStatus,
      completed_at: !currentStatus ? new Date().toISOString() : null 
    })
    .eq("id", goalId)
    .eq("student_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/progresso");
  return { success: true };
}

/**
 * EXCLUSÃO DE OBJETIVOS E METAS: Remove permanentemente um objetivo do diário.
 * 
 * @security
 * - RLS: Exclusão validada pelo identificador do aluno autenticado no banco.
 * 
 * @param {string} goalId - UUID do objetivo a deletar.
 * @returns {Promise<{success?: boolean, error?: string}>} Retorna status de sucesso.
 */
export async function deleteGoal(goalId: string): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient();
  const user = await getAuthUser();
  if (!user) return { error: "Não autenticado" };

  const { error } = await supabase
    .from("student_goals")
    .delete()
    .eq("id", goalId)
    .eq("student_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/progresso");
  return { success: true };
}

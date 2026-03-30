"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

import {
  checkInSchema,
  cancelCheckInSchema,
  personalRecordSchema,
  updateTargetSchema,
  goalSchema,
} from "@/lib/validations/security_schemas";

/**
 * Realiza a sinalização de presença (Check-in) do aluno.
 * O XP só será creditado após a confirmação do Professor.
 * 
 * @param {string} wodId - UUID do WOD.
 * @param {string} timeSlot - Horário selecionado (ex: "08:00").
 */
export async function performCheckIn(wodId: string, timeSlot?: string) {
  // 0. Validation
  const validation = checkInSchema.safeParse({ wodId, timeSlot });
  if (!validation.success) {
    return { error: "Dados de check-in inválidos." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Usuário não autenticado." };
  }

  // 1. Verificar se já existe check-in para este WOD
  const { data: existing } = await supabase
    .from("check_ins")
    .select("id")
    .eq("student_id", user.id)
    .eq("wod_id", wodId)
    .maybeSingle();

  if (existing) {
    return { error: "Você já realizou o check-in para este treino." };
  }

  // 2. Criar a sinalização de Check-in (XP zerado até validação do Coach)
  const { error: checkinError } = await supabase
    .from("check_ins")
    .insert({
      student_id: user.id,
      wod_id: wodId,
      time_slot: timeSlot,
      status: "checked",
      score_xp: 0, 
    });

  if (checkinError) {
    return { error: "Erro ao sinalizar presença: " + checkinError.message };
  }

  // O XP NÃO é incrementado aqui automaticamente conforme nova regra de negócio.
  // A validação de XP será feita pelo Professor ao encerrar a aula.

  revalidatePath("/dashboard");
  revalidatePath("/treinos");
  revalidatePath("/profile");
  
  return { success: true };
}

/**
 * Cancela o check-in do aluno.
 * 
 * @security
 * - Validates `wodId` via Zod.
 * - Ensures user is authenticated.
 * 
 * @param {string} wodId - O ID do WOD para o qual o check-in será cancelado.
 */
export async function cancelCheckIn(wodId: string) {
  // 0. Validation
  const validation = cancelCheckInSchema.safeParse({ wodId });
  if (!validation.success) {
    return { error: "ID de treino inválido." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Usuário não autenticado." };
  }

  // 1. Deleta o registro de sinalização
  const { error: deleteError } = await supabase
    .from("check_ins")
    .delete()
    .eq("student_id", user.id)
    .eq("wod_id", wodId);

  if (deleteError) {
    return { error: "Erro ao cancelar check-in: " + deleteError.message };
  }

  // Como o XP não foi dado na sinalização, não há necessidade de estorno aqui.

  revalidatePath("/dashboard");
  revalidatePath("/profile");

  return { success: true };
}

/**
 * Registra ou atualiza um Recorde Pessoal (PR) do aluno.
 * 
 * @security
 * - Valida input via `personalRecordSchema` (Zod).
 * - Restringe a operação ao `student_id` do usuário autenticado.
 * - Utiliza compressão de conflito (UPSERT) para evitar duplicidade de movimentos.
 * 
 * @param {any} formData - Objeto contendo `movement_id`, `value`, `unit` e `date`.
 * @returns {Promise<{success?: boolean, error?: string}>}
 */
export async function upsertPersonalRecord(formData: any) {
  const validation = personalRecordSchema.safeParse(formData);
  if (!validation.success) {
    return { error: "Dados inválidos: " + validation.error.message };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  // Mapear movement_key para movement_id (compatibilidade schema DB)
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
 * Atualiza a meta de frequência semanal do aluno.
 * Persiste a configuração na tabela `student_settings`.
 * 
 * @security
 * - Valida se o target está entre 1 e 7.
 * - Garante isolamento por `auth.uid()`.
 * 
 * @param {number} weekly_target - Quantidade de dias meta (1-7).
 * @returns {Promise<{success?: boolean, error?: string}>}
 */
export async function updateWeeklyTarget(weekly_target: number) {
  const validation = updateTargetSchema.safeParse({ weekly_target });
  if (!validation.success) return { error: "Meta inválida" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
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
 * Cria um novo objetivo (meta) pessoal para o aluno.
 * 
 * @param {string} title - Descrição curta do objetivo (ex: "Fazer meu primeiro Muscle-up").
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
export async function createGoal(title: string) {
  const validation = goalSchema.safeParse({ title });
  if (!validation.success) return { error: "Título inválido" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
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
 * Alterna o status de conclusão de um objetivo.
 * 
 * @param {string} goalId - UUID do objetivo.
 * @param {boolean} currentStatus - Status atual antes do toggle.
 * @returns {Promise<{success?: boolean, error?: string}>}
 */
export async function toggleGoalStatus(goalId: string, currentStatus: boolean) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
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
 * Remove permanentemente um objetivo pessoal.
 * 
 * @param {string} goalId - UUID do objetivo.
 * @returns {Promise<{success?: boolean, error?: string}>}
 */
export async function deleteGoal(goalId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
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

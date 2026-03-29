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
 * Realiza o check-in do aluno no WOD do dia.
 * 
 * @security
 * - Validates `wodId` via Zod.
 * - Ensures user is authenticated.
 * - Prevents double check-ins.
 * 
 * @param {string} wodId - O ID do WOD em que o aluno está se inscrevendo.
 */
export async function performCheckIn(wodId: string) {
  // 0. Validation
  const validation = checkInSchema.safeParse({ wodId });
  if (!validation.success) {
    return { error: "ID de treino inválido." };
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

  // 2. Criar o Check-in
  const { error: checkinError } = await supabase
    .from("check_ins")
    .insert({
      student_id: user.id,
      wod_id: wodId,
      status: "checked",
      score_xp: 100, // XP padrão por check-in
    });

  if (checkinError) {
    return { error: "Erro ao registrar presença: " + checkinError.message };
  }

  // 3. Atualizar XP no Perfil
  const { data: profile } = await supabase
    .from("profiles")
    .select("xp_balance")
    .eq("id", user.id)
    .single();

  const newXP = (profile?.xp_balance || 0) + 100;

  await supabase
    .from("profiles")
    .update({ xp_balance: newXP })
    .eq("id", user.id);

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

  // 1. Deletar o Check-in
  const { error: deleteError } = await supabase
    .from("check_ins")
    .delete()
    .eq("student_id", user.id)
    .eq("wod_id", wodId);

  if (deleteError) {
    return { error: "Erro ao cancelar check-in: " + deleteError.message };
  }

  // 2. Estornar XP do Perfil (-100)
  const { data: profile } = await supabase
    .from("profiles")
    .select("xp_balance")
    .eq("id", user.id)
    .single();

  const newXP = Math.max(0, (profile?.xp_balance || 0) - 100);

  await supabase
    .from("profiles")
    .update({ xp_balance: newXP })
    .eq("id", user.id);

 revalidatePath("/dashboard");
  revalidatePath("/profile");

  return { success: true };
}

/**
 * Registra ou atualiza um Recorde Pessoal (PR) do aluno.
 */
export async function upsertPersonalRecord(formData: any) {
  const validation = personalRecordSchema.safeParse(formData);
  if (!validation.success) {
    return { error: "Dados inválidos: " + validation.error.message };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const { error } = await supabase
    .from("personal_records")
    .upsert({
      student_id: user.id,
      ...validation.data,
      date: validation.data.date || new Date().toISOString().split("T")[0],
    }, { onConflict: "student_id,movement_key" }); // Assumindo chave única por movimento/estudante para simplificar

  if (error) return { error: error.message };
  
  revalidatePath("/progresso");
  return { success: true };
}

/**
 * Atualiza a meta de frequência semanal do aluno.
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
    });

  if (error) return { error: error.message };

  revalidatePath("/progresso");
  return { success: true };
}

/**
 * Gerencia Objetivos Pessoais (Criação e Toggle).
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

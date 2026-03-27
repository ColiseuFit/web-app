"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

import { checkInSchema, cancelCheckInSchema } from "@/lib/validations/security_schemas";

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

"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { wodSchema } from "@/lib/validations/security_schemas";

/**
 * Creates or updates a WOD (Workout of the Day) for a specific date.
 * 
 * @security
 * - Role Requirement: Only 'admin' or 'reception' roles.
 * - Validation: Input strictly validated by `wodSchema` (Zod).
 * 
 * @param {FormData} formData - Contains the WOD mechanics (title, warm_up, technique, wod_content, date, time_cap, type_tag, result_type).
 * @returns {Promise<{ success?: boolean; error?: string }>} Upsert status.
 */
export async function upsertWod(formData: FormData) {
  const supabase = await createClient();
  const { data: { user: currentUser } } = await supabase.auth.getUser();
  if (!currentUser) return { error: "Sessão expirada." };

  const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", currentUser.id).single();
  if (!roleData || (roleData.role !== "admin" && roleData.role !== "reception")) {
    return { error: "Permissão insuficiente." };
  }

  const rawData = {
    date: formData.get("date") as string,
    title: formData.get("title") as string,
    warm_up: formData.get("warm_up") as string,
    technique: formData.get("technique") as string,
    wod_content: formData.get("wod_content") as string,
    wod_content_l4: formData.get("wod_content_l4") as string || undefined,
    wod_content_l3: formData.get("wod_content_l3") as string || undefined,
    wod_content_l2: formData.get("wod_content_l2") as string || undefined,
    wod_content_l1: formData.get("wod_content_l1") as string || undefined,
    type_tag: formData.get("type_tag") as string || undefined,
    time_cap: formData.get("time_cap") as string || undefined,
    result_type: formData.get("result_type") as string || undefined,
    coach_id: currentUser.id,
  };

  const validation = wodSchema.safeParse(rawData);
  if (!validation.success) {
    return { error: "Dados inválidos: " + validation.error.issues[0].message };
  }

  const payload = {
    ...validation.data,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("wods")
    .upsert(payload, { onConflict: "date" });

  if (error) return { error: "Falha ao salvar as informações do treino (WOD)." };

  revalidatePath("/admin/wods");
  revalidatePath("/dashboard");
  revalidatePath("/treinos");
  return { success: true };
}

/**
 * Deletes a WOD record from the database for a specific date.
 * 
 * @security
 * - Role Requirement: ONLY 'admin' (Reception cannot delete WODs).
 * - Cascades: Removes the entry from `wods`.
 * 
 * @param {string} date - ISO Date string (YYYY-MM-DD) identifying the WOD.
 * @returns {Promise<{ success?: boolean; error?: string }>} Deletion status.
 */
export async function deleteWod(date: string) {
  const supabase = await createClient();
  const { data: { user: currentUser } } = await supabase.auth.getUser();
  if (!currentUser) return { error: "Sessão expirada." };

  const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", currentUser.id).single();
  if (!roleData || roleData.role !== "admin") {
    return { error: "Apenas administradores podem remover treinos." };
  }

  const { error } = await supabase
    .from("wods")
    .delete()
    .eq("date", date);

  if (error) return { error: "Não foi possível remover o treino selecionado." };

  revalidatePath("/admin/wods");
  revalidatePath("/dashboard");
  revalidatePath("/treinos");
  return { success: true };
}

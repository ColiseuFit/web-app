"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * getBoxSettings: Recupera todas as configurações do box da tabela `box_settings`.
 * Essencial para o funcionamento do Dashboard e regras de check-in (SSoT).
 * 
 * @returns {Promise<Record<string, string>>} Mapa de chave/valor para acesso imediato.
 */
export async function getBoxSettings() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("box_settings")
    .select("key, value");

  if (error) {
    console.error("Error fetching box settings:", error);
    return {};
  }

  // Convert array of {key, value} to object
  return data.reduce((acc, curr) => {
    acc[curr.key] = curr.value;
    return acc;
  }, {} as Record<string, string>);
}

/**
 * updateBoxSettingsAction: Atualiza ou insere configurações em massa.
 * Implementa lógica de sincronização (SSoT) para manter paridade entre configurações 
 * de box e regras de pontuação legadas.
 * 
 * @security
 * - Revalida caminhos críticos após a atualização.
 * 
 * @param {Record<string, string>} settings - Objeto com pares chave-valor.
 */
export async function updateBoxSettingsAction(settings: Record<string, string>) {
  const supabase = await createClient();

  // Prepare data for upsert
  const upsertData = Object.entries(settings).map(([key, value]) => ({
    key,
    value,
    updated_at: new Date().toISOString()
  }));

  const { error } = await supabase
    .from("box_settings")
    .upsert(upsertData, { onConflict: "key" });

  if (error) {
    console.error("Error updating box settings:", error);
    return { success: false, error: error.message };
  }

  // --- SYNC LOGIC (SSoT) ---
  // If we updated points_per_class (legacy name from turmas) or check_in values,
  // we ensure it's synced in the points_rules table.
  if (settings.points_per_class) {
    await supabase
      .from("points_rules")
      .update({ points: Number(settings.points_per_class) })
      .eq("key", "check_in");
  }

  // REVALIDATION
  revalidatePath("/admin/settings");
  revalidatePath("/admin/turmas");
  revalidatePath("/(student)/dashboard", "layout"); // Update name/whatsapp if changed
  revalidatePath("/(student)/treinos", "page");
  
  return { success: true };
}

/**
 * Updates a points rule.
 * @param id The rule ID.
 * @param points The new points value.
 */
export async function updatePointsRule(id: string, points: number) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("points_rules")
    .update({ 
      points, 
      updated_at: new Date().toISOString() 
    })
    .eq("id", id);

  if (error) {
    console.error("Error updating points rule:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/settings");
  revalidatePath("/admin/gamificacao");
  return { success: true };
}

/**
 * Updates the active status of a points rule.
 * @param id The rule ID.
 * @param is_active The new active status.
 */
export async function updatePointsRuleStatus(id: string, is_active: boolean) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("points_rules")
    .update({ 
      is_active, 
      updated_at: new Date().toISOString() 
    })
    .eq("id", id);

  if (error) {
    console.error("Error updating points rule status:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/settings");
  revalidatePath("/admin/gamificacao");
  return { success: true };
}

/**
 * getPointsRules: Recupera todas as regras de pontuação ativa.
 * Define o SSoT para o sistema de gamificação.
 * 
 * @returns {Promise<any[]>} Lista ordenada de regras.
 */
export async function getPointsRules() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("points_rules")
    .select("*")
    .order("points", { ascending: false });

  if (error) {
    console.error("Error fetching points rules:", error);
    return [];
  }

  return data;
}

/**
 * getLevels: Recupera a metodologia de níveis técnicos do Box.
 * 
 * @returns {Promise<any[]>} Lista de níveis configurados.
 */
export async function getLevels() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("levels")
    .select("*")
    .order("order_index", { ascending: true });

  if (error) {
    console.error("Error fetching levels:", error);
    return [];
  }

  return data;
}

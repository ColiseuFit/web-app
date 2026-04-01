"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * ACTIONS DE CONFIGURAÇÃO (SSoT)
 * Centraliza a lógica de mutação para os parâmetros do Box.
 */

/**
 * Atualiza as Regras de Pontuação
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
    console.error("Erro ao atualizar regra de pontos:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/settings");
  return { success: true };
}

/**
 * Atualiza Configurações Gerais (box_settings)
 * @param settings Objeto com as chaves e valores a serem atualizados
 */
export async function updateBoxSettings(settings: Record<string, string>) {
  const supabase = await createClient();

  // Upsert múltiplo para manter a lógica de key-value
  const upsertData = Object.entries(settings).map(([key, value]) => ({
    key,
    value,
    updated_at: new Date().toISOString()
  }));

  const { error } = await supabase
    .from("box_settings")
    .upsert(upsertData, { onConflict: "key" });

  if (error) {
    console.error("Erro ao atualizar configurações do box:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/settings");
  revalidatePath("/(student)/dashboard", "layout"); // Revalida para atualizar nome do box no header
  return { success: true };
}

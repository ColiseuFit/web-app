"use server";

import { createClient } from "@/lib/supabase/server";
import { LEVEL_CONFIG, LevelInfo, LevelKey } from "./levels";
import { unstable_cache, revalidateTag } from "next/cache";

/**
 * Technical Levels SSoT (Single Source of Truth) Actions.
 * 
 * @module Methodology
 * @description Handles dynamic fetching, caching, and management of Coliseu Levels.
 * Prioritizes database values over static fallbacks stored in LEVEL_CONFIG.
 */

// Internal fetcher without cache
async function fetchLevelsFromDb(): Promise<Record<LevelKey, LevelInfo>> {
  const supabase = await createClient();
  
  try {
    const { data, error } = await supabase
      .from("levels")
      .select("*")
      .order("position", { ascending: true });

    if (error || !data || data.length === 0) {
      console.warn("Retornando LevelInfo estático (Erro DB ou Vazio)");
      return LEVEL_CONFIG;
    }

    // Mapeia o resultado do banco para o formato LevelInfo
    const dynamicConfig = data.reduce((acc, level) => {
      acc[level.key as LevelKey] = {
        id: `L${level.position}` as any,
        key: level.key as LevelKey,
        label: level.label,
        color: level.color,
        textColor: level.text_color,
        btnTextColor: level.btn_text_color,
        icon: level.icon_path,
        description: level.description,
        requirements: level.requirements,
        order: level.position,
      };
      return acc;
    }, {} as Record<LevelKey, LevelInfo>);

    return dynamicConfig;
  } catch (e) {
    console.error("Erro Crítico ao buscar níveis:", e);
    return LEVEL_CONFIG;
  }
}

// Next.js Data Cache wrapper
const getCachedLevelsFn = unstable_cache(
  async () => fetchLevelsFromDb(),
  ["levels"],
  { revalidate: 300, tags: ["levels"] }
);

/**
 * Fetches the methodology configuration from the database.
 * Utiliza o Next.js Data Cache (unstable_cache) com a tag 'levels' expitando em 5 min.
 * 
 * @async
 * @function getCachedLevels
 * @returns {Promise<Record<LevelKey, LevelInfo>>} A mapped object of levels keyed by their simple identifier.
 */
export async function getCachedLevels(): Promise<Record<LevelKey, LevelInfo>> {
  return getCachedLevelsFn();
}

/**
 * Server Action to update a level's metadata in the database.
 * 
 * @async
 * @function updateLevelAction
 * @param {string} key - The unique identifier of the level to update.
 * @param {Partial<LevelInfo>} updates - The fields to modify.
 * @returns {Promise<{success: boolean}>}
 * @throws {Error} If the database update fails.
 * @security RLS policies should restrict this to authenticated admins.
 */
export async function updateLevelAction(key: string, updates: Partial<LevelInfo>) {
  const supabase = await createClient();
  
  // O RLS já protege, mas podemos adicionar check extra de admin aqui se necessário
  
  const { error } = await supabase
    .from("levels")
    .update({
      label: updates.label,
      color: updates.color,
      text_color: updates.textColor,
      btn_text_color: updates.btnTextColor,
      description: updates.description,
      requirements: updates.requirements,
      updated_at: new Date().toISOString(),
    })
    .eq("key", key);

  if (error) throw new Error(error.message);
  
  // Invalida o cache para refletir as alterações no próximo request
  revalidateTag("levels", { expire: 0 });
  
  return { success: true };
}


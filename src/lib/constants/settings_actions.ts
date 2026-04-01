"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Fetches all box settings from the database.
 * Returns a Record<string, string> for easy access.
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
 * Updates or inserts multiple box settings in batch.
 * Now standardized on canonical keys:
 * - box_capacity_limit
 * - box_cancellation_hours
 * 
 * @param settings Object with key-value pairs to update.
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
  return { success: true };
}

/**
 * Fetches all points rules from the database.
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

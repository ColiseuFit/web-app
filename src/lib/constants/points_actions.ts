"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

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

/**
 * Updates a specific point rule.
 */
export async function updatePointRuleAction(id: string, updates: { points?: number; is_active?: boolean }) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("points_rules")
    .update({ 
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq("id", id);

  if (error) {
    console.error("Error updating point rule:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/settings");
  return { success: true };
}

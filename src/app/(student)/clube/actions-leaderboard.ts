"use server";

import { createClient } from "@/lib/supabase/server";
import { getDailyLeaderboard as getDailyLeaderboardImpl } from "./actions-daily-leaderboard";
import { getWeeklyLeaderboard as getWeeklyLeaderboardImpl } from "./actions-weekly-leaderboard";

export async function getDailyLeaderboard(dateStr?: string) {
  return getDailyLeaderboardImpl(dateStr);
}

export async function getWeeklyLeaderboard() {
  return getWeeklyLeaderboardImpl();
}

export async function getCombinedLeaderboard(dateStr?: string): Promise<{
  success: boolean;
  daily?: any;
  weekly?: any;
  error?: string;
}> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Não autenticado." };

  try {
    const [resDaily, resWeekly] = await Promise.all([
      getDailyLeaderboardImpl(dateStr),
      getWeeklyLeaderboardImpl()
    ]);

    return {
      success: true,
      daily: resDaily.success ? resDaily.data : null,
      weekly: resWeekly.success ? resWeekly.data : null,
      error: (!resDaily.success && !resWeekly.success) ? (resDaily.error || resWeekly.error) : undefined
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Erro inesperado ao buscar rankings."
    };
  }
}

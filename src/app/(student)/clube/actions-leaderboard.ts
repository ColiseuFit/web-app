"use server";

import { createClient } from "@/lib/supabase/server";
import { getDailyLeaderboard, DailyLeaderboardData } from "./actions-daily-leaderboard";
import { getWeeklyLeaderboard, WeeklyLeaderboardData } from "./actions-weekly-leaderboard";

export { getDailyLeaderboard } from "./actions-daily-leaderboard";
export { getWeeklyLeaderboard } from "./actions-weekly-leaderboard";
export type { LeaderboardEntry, DailyLeaderboardData } from "./actions-daily-leaderboard";
export type { WeeklyLeaderboardEntry, WeeklyLeaderboardData } from "./actions-weekly-leaderboard";

export async function getCombinedLeaderboard(dateStr?: string): Promise<{
  success: boolean;
  daily?: DailyLeaderboardData | null;
  weekly?: WeeklyLeaderboardData | null;
  error?: string;
}> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Não autenticado." };

  try {
    const [resDaily, resWeekly] = await Promise.all([
      getDailyLeaderboard(dateStr),
      getWeeklyLeaderboard()
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

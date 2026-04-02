import { createClient } from "@/lib/supabase/server";
import CoachDashboardClient from "./CoachDashboardClient";
import { getTodayDate } from "@/lib/date-utils";
import { getCachedLevels } from "@/lib/constants/levels_actions";
import DateNavigator from "@/components/coach/DateNavigator";

export default async function CoachPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const supabase = await createClient();
  const { date: dateParam } = await searchParams;
  const activeDateStr = dateParam || getTodayDate();
  
  // SSoT: Fetch dynamic levels from DB (Admin Config)
  const dynamicLevels = await getCachedLevels();

  // Calculate day of the week based on UTC representation of activeDateStr
  const activeDateObj = new Date(activeDateStr + "T00:00:00Z");
  const dayOfWeek = activeDateObj.getUTCDay();

  // Fetch only today's slots
  const { data: slots, error } = await supabase
    .from("class_slots")
    .select("*")
    .eq("day_of_week", dayOfWeek)
    .order("time_start", { ascending: true });

  let initialFinishedSlots: Record<string, boolean> = {};

  // Fetch ONLY explicit finalization markers for this date from box_settings.
  // Format: finalized_{activeDateStr}_{slotId}
  const { data: finalizations } = await supabase
    .from("box_settings")
    .select("key")
    .like("key", `finalized_${activeDateStr}_%`);

  if (finalizations) {
    finalizations.forEach(f => {
      const slotId = f.key.split("_").pop();
      if (slotId) initialFinishedSlots[slotId] = true;
    });
  }

  const displayDate = activeDateObj.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    timeZone: "UTC"
  });

  if (error) {
    return (
      <div style={{ textAlign: "center", padding: "40px 20px" }}>
        <p>Erro ao buscar turmas: {error.message}</p>
      </div>
    );
  }

  return (
    <>
      <DateNavigator activeDateStr={activeDateStr} />
      <CoachDashboardClient 
        todaySlots={slots || []} 
        todayDateStr={activeDateStr} 
        dynamicLevels={dynamicLevels}
        initialFinishedSlots={initialFinishedSlots}
      />
    </>
  );
}

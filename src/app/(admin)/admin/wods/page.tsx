import { createClient } from "@/lib/supabase/server";
import WodsClient from "./WodsClient";

/**
 * WODs Management (Server Component): Operational WOD editor for Coaches/Admin.
 *
 * @design Clean B&W calendar-style interface.
 * @data Fetches WODs for the current week window (default 7 days).
 */

const DAYS_OF_WEEK = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function getWeekDates(): { label: string; date: string; isToday: boolean }[] {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7));

  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push({
      label: DAYS_OF_WEEK[d.getDay()],
      date: d.toISOString().split("T")[0],
      isToday: d.toDateString() === today.toDateString(),
    });
  }
  return days;
}

export default async function WodsPage() {
  const weekDates = getWeekDates();
  const startDate = weekDates[0].date;
  const endDate = weekDates[6].date;

  const supabase = await createClient();

  const { data: wods, error } = await supabase
    .from("wods")
    .select("id, date, title, warm_up, technique, wod_content, type_tag, time_cap, result_type")
    .gte("date", startDate)
    .lte("date", endDate);

  if (error) {
    console.error("[WodsPage] Erro ao buscar wods:", error);
  }

  return (
    <WodsClient 
      initialWods={wods || []} 
      weekDates={weekDates} 
    />
  );
}

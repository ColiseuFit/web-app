import { createClient } from "@/lib/supabase/server";
import WodsClient from "./WodsClient";
import { generateWeekCalendar } from "@/lib/date-utils";

/**
 * WODs Management (Server Component): Operational WOD editor for Coaches/Admin.
 *
 * @design Clean B&W calendar-style interface.
 * @data Fetches WODs for the current week window (default 7 days).
 */

export interface WodsPageProps {
  searchParams: Promise<{ weekOffset?: string }>;
}

export default async function WodsPage({ searchParams }: WodsPageProps) {
  const params = await searchParams;
  const weekOffset = parseInt(params.weekOffset || "0", 10);
  
  const weekDates = generateWeekCalendar(undefined, weekOffset, 7);
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
      weekOffset={weekOffset}
    />
  );
}

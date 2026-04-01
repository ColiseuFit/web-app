import { createClient } from "@/lib/supabase/server";
import TurmasClient from "./TurmasClient";
import { getCoaches } from "../professores/actions";
import { getHolidays } from "./actions";
import { getBoxSettings } from "@/lib/constants/settings_actions";

import { getTodayDate } from "@/lib/date-utils";

/**
 * Turmas Page (Server Component): Fetches the full class schedule grid.
 *
 * @data Fetches all class_slots ordered by day_of_week and time_start.
 * Passes sanitized slot data to the Client Component for rendering the weekly grid.
 */
export default async function TurmasPage() {
  const supabase = await createClient();
  const todayStr = getTodayDate(); // YYYY-MM-DD em Fuso Local (America/Sao_Paulo)

  // 1. Fetch Class Slots (Template)
  const { data: slots, error: slotsError } = await supabase
    .from("class_slots")
    .select("*")
    .order("day_of_week", { ascending: true })
    .order("time_start", { ascending: true });

  // 2. Fetch Todays Occupancy (Check-ins)
  // Logic: Get check-ins linked to today's WOD instead of relying on created_at UTC parsing
  const { data: occupancy, error: occError } = await supabase
    .from("check_ins")
    .select("class_slot_id, wods!inner(date)")
    .eq("wods.date", todayStr);

  // 3. Fetch all Enrollments (Fixed)
  // Logic: Count all class_enrollments grouped by slot
  const { data: enrollments, error: enrollError } = await supabase
    .from("class_enrollments")
    .select("class_slot_id");

  // 4. Fetch Todays WODs
  const { data: todayWods, error: wodsError } = await supabase
    .from("wods")
    .select("id, type_tag")
    .eq("date", todayStr);
    
  // 5. Fetch Coaches (using the dedicated action to bypass RLS)
  const { data: coachesData } = await getCoaches();
  const coaches = coachesData?.map(d => ({
    id: d.profile.id,
    full_name: d.profile.full_name
  })) || [];
  
  // 6. Fetch Global Rules & Holidays
  const { data: settings } = await getBoxSettings();
  const { data: holidays } = await getHolidays();

  if (slotsError) {
    return (
      <div className="admin-container-fluid">
        <h1 style={{ fontSize: "32px", fontWeight: 800, margin: "0 0 8px" }}>Gestão de Turmas</h1>
        <p style={{ color: "#999" }}>Erro ao carregar a grade: {slotsError.message}</p>
      </div>
    );
  }

  // Pre-process occupancy counts (Check-ins)
  const occupancyMap: Record<string, number> = {};
  occupancy?.forEach((ci) => {
    if (ci.class_slot_id) {
      occupancyMap[ci.class_slot_id] = (occupancyMap[ci.class_slot_id] || 0) + 1;
    }
  });

  // Pre-process enrollment counts (Fixed)
  const enrollmentMap: Record<string, number> = {};
  enrollments?.forEach((en) => {
    if (en.class_slot_id) {
      enrollmentMap[en.class_slot_id] = (enrollmentMap[en.class_slot_id] || 0) + 1;
    }
  });

  return (
    <TurmasClient
      initialSlots={slots || []}
      occupancy={occupancyMap}
      enrollmentCounts={enrollmentMap}
      wods={todayWods || []}
      coaches={coaches || []}
      initialSettings={settings || {}}
      initialHolidays={holidays || []}
    />
  );
}


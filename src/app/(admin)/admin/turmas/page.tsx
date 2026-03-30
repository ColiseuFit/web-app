import { createClient } from "@/lib/supabase/server";
import TurmasClient from "./TurmasClient";

/**
 * Turmas Page (Server Component): Fetches the full class schedule grid.
 *
 * @data Fetches all class_slots ordered by day_of_week and time_start.
 * Passes sanitized slot data to the Client Component for rendering the weekly grid.
 */
export default async function TurmasPage() {
  const supabase = await createClient();
  const todayStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

  // 1. Fetch Class Slots (Template)
  const { data: slots, error: slotsError } = await supabase
    .from("class_slots")
    .select("*")
    .order("day_of_week", { ascending: true })
    .order("time_start", { ascending: true });

  // 2. Fetch Todays Occupancy (Check-ins)
  // Logic: Count check_ins grouped by class_slot_id for current date
  const { data: occupancy, error: occError } = await supabase
    .from("check_ins")
    .select("class_slot_id")
    .gte("created_at", `${todayStr}T00:00:00`)
    .lte("created_at", `${todayStr}T23:59:59`);

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
    />
  );
}


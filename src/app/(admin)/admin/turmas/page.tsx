import { createClient } from "@/lib/supabase/server";
import TurmasClient from "./TurmasClient";
import { getCoaches } from "../professores/actions";
import { getHolidays } from "./actions";
import { getBoxSettings } from "@/lib/constants/settings_actions";

import { getTodayDate, getWeekDates, calculateSlotOccupancy, getMinWeekOffset } from "@/lib/date-utils";
import { SYSTEM_START_DATE } from "@/lib/constants/calendar";

/**
 * Turmas Page (Server Component): Arquiteto de Dados da Grade Semanal.
 * 
 * @architecture
 * Este componente atua como o agregador central de dados para o módulo de Turmas.
 * Ele realiza o "Pre-Processing" de diversas fontes para entregar um estado hidratado
 * e otimizado ao TurmasClient.
 * 
 * @data_sources
 * 1. class_slots: Definição estrutural dos horários e coaches padrão.
 * 2. check_ins: Dados de ocupação filtrados pela semana atual (SSoT Operacional).
 * 3. class_enrollments: Mapeamento de matrículas fixas para contagem de vagas.
 * 4. class_sessions: Marcadores de finalização (SSoT de Fechamento).
 * 5. class_substitutions: Substituições de coach contextuais à data.
 * 6. profiles: Lista paginada de alunos (CRM) para gestão de matrículas.
 * 
 * @logic_paginacao 
 * Implementa range-based pagination (Supabase) para suportar bases de 300+ alunos
 * sem degradação de performance no servidor.
 */
export default async function TurmasPage(props: {
  searchParams?: Promise<{
    search?: string;
    level?: string;
    unenroll?: string;
    page?: string;
    weekOffset?: string;
  }>;
}) {
  const searchParams = await props.searchParams;
  const search = searchParams?.search || "";
  const level = searchParams?.level || "";
  const unenroll = searchParams?.unenroll === "true";
  const page = parseInt(searchParams?.page || "1");
  const rawWeekOffset = parseInt(searchParams?.weekOffset || "0");
  const minOffset = getMinWeekOffset(SYSTEM_START_DATE);
  const weekOffset = Math.max(rawWeekOffset, minOffset);
  const pageSize = 50;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const supabase = await createClient();
  const todayStr = getTodayDate();

  // 1. Get Admin/Coach IDs to exclude them from student lists
  const { data: staffRoles } = await supabase
    .from("user_roles")
    .select("user_id")
    .in("role", ["admin", "coach"]);
  const staffIds = (staffRoles || []).map((r: any) => r.user_id);

  // 1. Weekly Grid Data (Remains total for the timeline/counts)
  const { data: slots, error: slotsError } = await supabase
    .from("class_slots")
    .select(`
      *,
      profiles!default_coach_id (full_name),
      class_substitutions (
        substitute_coach_id,
        profiles!substitute_coach_id (full_name),
        date
      )
    `)
    .order("day_of_week", { ascending: true })
    .order("time_start", { ascending: true });

  // 2. Weekly Occupancy (Check-ins for all days in the current week)
  const weekDates = getWeekDates(weekOffset);
  const { data: occupancy } = await supabase
    .from("check_ins")
    .select("class_slot_id, status, wods!inner(date)")
    .in("wods.date", weekDates)
    .neq("status", "missed");

  // 3. ALL Enrollments (For grid counts & student context)
  const { data: allEnrollments } = await supabase
    .from("class_enrollments")
    .select(`
      id,
      student_id,
      class_slot_id,
      class_slots:class_slot_id (id, day_of_week, time_start, name)
    `);

  let profilesQuery = supabase
    .from("profiles")
    .select("id, full_name, level, member_number", { count: "exact" });

  if (staffIds.length > 0) {
    profilesQuery = profilesQuery.not("id", "in", `(${staffIds.join(",")})`);
  }

  if (search) {
    const isNumeric = /^\d+$/.test(search);
    if (isNumeric) {
      profilesQuery = profilesQuery.or(`full_name.ilike.*${search}*,display_name.ilike.*${search}*,member_number.eq.${search}`);
    } else {
      profilesQuery = profilesQuery.or(`full_name.ilike.*${search}*,display_name.ilike.*${search}*,first_name.ilike.*${search}*`);
    }
  }
  if (level) {
    profilesQuery = profilesQuery.eq("level", level);
  }
  
  // Logic for "Unenrolled" (Sem Matrícula)
  // If true, we want students who DON'T have an entry in class_enrollments
  if (unenroll && allEnrollments) {
    const enrolledIds = allEnrollments.map(e => e.student_id);
    profilesQuery = profilesQuery.not("id", "in", `(${enrolledIds.join(",")})`);
  }

  const { data: allProfiles, count: totalProfilesCount } = await profilesQuery
    .order("full_name", { ascending: true })
    .range(from, to);

  const totalPages = Math.ceil((totalProfilesCount || 0) / pageSize);

  // 5. Weekly WODs (for tags in the grid)
  const { data: weeklyWods } = await supabase
    .from("wods")
    .select("id, type_tag, date")
    .in("date", weekDates);
    
  // 6. Coaches & Settings
  const { data: coachesData } = await getCoaches();
  const coaches = coachesData?.map(d => ({
    id: d.profile.id,
    full_name: d.profile.full_name
  })) || [];
  
  const { data: settings } = await getBoxSettings();
  const { data: holidays } = await getHolidays();

  // 6. Finalized Sessions (for the current week)
  const { data: sessions } = await supabase
    .from("class_sessions")
    .select("class_slot_id, date, finalized_at")
    .in("date", weekDates);

  // 7. Substitutions (for the current week)
  const { data: substitutionsData } = await supabase
    .from("class_substitutions")
    .select(`
      class_slot_id, 
      date, 
      substitute_coach_id,
      profiles:substitute_coach_id(id, full_name)
    `)
    .in("date", weekDates);

  // Pre-process sessions into a map: slotId-date -> finalized_at
  const sessionMap: Record<string, string> = {};
  sessions?.forEach((s: any) => {
    sessionMap[`${s.class_slot_id}-${s.date}`] = s.finalized_at;
  });

  // Pre-process substitutions into a map: slotId-date -> { id, full_name }
  const substitutionMap: Record<string, { id: string; full_name: string }> = {};
  substitutionsData?.forEach((s: any) => {
    if (s.profiles) {
      substitutionMap[`${s.class_slot_id}-${s.date}`] = {
        id: s.profiles.id,
        full_name: s.profiles.full_name
      };
    }
  });

  if (slotsError) {
    return (
      <div className="admin-container-fluid">
        <h1 style={{ fontSize: "32px", fontWeight: 800, margin: "0 0 8px" }}>Gestão de Turmas</h1>
        <p style={{ color: "#999" }}>Erro ao carregar a grade: {slotsError.message}</p>
      </div>
    );
  }

  // 8. SSoT: Consolidated Occupancy Map
  // Key: slot_id-date -> count
  const consolidatedOccupancyMap: Record<string, number> = {};
  
  // Group enrollment student IDs per slot
  const slotEnrollmentIds: Record<string, string[]> = {};
  allEnrollments?.forEach((en: any) => {
    if (en.class_slot_id) {
      if (!slotEnrollmentIds[en.class_slot_id]) slotEnrollmentIds[en.class_slot_id] = [];
      slotEnrollmentIds[en.class_slot_id].push(en.student_id);
    }
  });

  // Group check-in student IDs per slot and date
  const slotCheckinIds: Record<string, string[]> = {};
  occupancy?.forEach((ci: any) => {
    const slotId = ci.class_slot_id;
    const date = ci.wods?.date;
    if (slotId && date) {
      const key = `${slotId}-${date}`;
      if (!slotCheckinIds[key]) slotCheckinIds[key] = [];
      slotCheckinIds[key].push(ci.student_id);
    }
  });

  // Calculate consolidated count for every slot across the week dates
  slots?.forEach((slot: any) => {
    weekDates.forEach((date) => {
      const key = `${slot.id}-${date}`;
      const enrollIds = slotEnrollmentIds[slot.id] || [];
      const checkinIds = slotCheckinIds[key] || [];
      consolidatedOccupancyMap[key] = calculateSlotOccupancy(enrollIds, checkinIds);
    });
  });

  // enrollmentMap specifically for the Structural tab (just fixed counts)
  const enrollmentMap: Record<string, number> = {};
  Object.keys(slotEnrollmentIds).forEach(slotId => {
    enrollmentMap[slotId] = slotEnrollmentIds[slotId].length;
  });

  return (
    <TurmasClient
      initialSlots={slots || []}
      occupancy={consolidatedOccupancyMap}
      enrollmentCounts={enrollmentMap}
      wods={weeklyWods || []}
      coaches={coaches || []}
      initialSettings={settings || {}}
      initialHolidays={holidays || []}
      initialSessions={sessionMap}
      initialSubstitutions={substitutionMap}
      allProfiles={allProfiles || []}
      allEnrollments={allEnrollments || []}
      currentPage={page}
      totalPages={totalPages}
      totalCount={totalProfilesCount || 0}
      currentSearch={search}
      currentLevel={level}
      currentUnenroll={unenroll}
      currentWeekOffset={weekOffset}
    />
  );
}


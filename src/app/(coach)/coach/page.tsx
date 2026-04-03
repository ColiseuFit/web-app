import { createClient } from "@/lib/supabase/server";
import CoachDashboardClient from "./CoachDashboardClient";
import { getTodayDate } from "@/lib/date-utils";
import { getCachedLevels } from "@/lib/constants/levels_actions";
import DateNavigator from "@/components/coach/DateNavigator";

/**
 * Coach Dashboard Page (Server Component).
 * 
 * @architecture
 * - Camada de Hidratação: Agrega slots recorrentes e substituições dinâmicas.
 * - SSoT de Agenda: Consolida `class_slots` + `class_substitutions` em uma visão 
 *   única para o instrutor do dia.
 * - Segurança: Toda a busca respeita as políticas de RLS e valida o contexto do usuário.
 * 
 * @lifecycle
 * 1. Recupera `searchParams` para determinar a data focal (Default: Hoje).
 * 2. Busca níveis técnicos (`getCachedLevels`) para exibição visual precisa.
 * 3. Resolve conflitos de instrutor (Substituição > Padrão).
 * 4. Identifica turmas já finalizadas (`class_sessions`) para travar o estado no cliente.
 */

export default async function CoachPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const supabase = await createClient();
  const { date: dateParam } = await searchParams;
  const activeDateStr = dateParam || getTodayDate();
  
  // SSoT: Fetch dynamic levels from DB (Admin Config)
  const dynamicLevels = await getCachedLevels();

  // Calculate day of the week based on UTC representation of activeDateStr
  const activeDateObj = new Date(activeDateStr + "T00:00:00Z");
  const dayOfWeek = activeDateObj.getUTCDay();

  // Fetch only today's slots with their default coach OR sub coach
  const { data: rawSlots, error } = await supabase
    .from("class_slots")
    .select(`
      *,
      coach_profile:default_coach_id (full_name),
      class_substitutions (
        substitute_coach_id,
        coach_profile:substitute_coach_id (full_name),
        date
      )
    `)
    .eq("day_of_week", dayOfWeek)
    .order("time_start", { ascending: true });

  // Sanitize slots to pick the right coach (Default vs Substitution)
  const slots = (rawSlots || []).map(slot => {
    const substitutions = (slot.class_substitutions as any[]) || [];
    const activeSub = substitutions.find((sub: any) => sub.date === activeDateStr);
    const coachProfileName = (slot.coach_profile as any)?.full_name;
    const coachName = activeSub?.coach_profile?.full_name || coachProfileName || slot.coach_name || "Sem instrutor";
    
    return {
      ...slot,
      coach_name: coachName, // Logic SSoT overrides legacy field
      is_substitution: !!activeSub
    };
  });

  let initialFinishedSlots: Record<string, boolean> = {};

  // Fetch ONLY explicit finalization markers for this date from class_sessions (NEW SSoT)
  const { data: finalizations } = await supabase
    .from("class_sessions")
    .select("class_slot_id")
    .eq("date", activeDateStr);

  if (finalizations) {
    finalizations.forEach(f => {
      if (f.class_slot_id) initialFinishedSlots[f.class_slot_id] = true;
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

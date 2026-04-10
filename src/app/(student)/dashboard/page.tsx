import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import Link from "next/link";
import DashboardStyles from "@/components/DashboardStyles";
import StudentHeader from "@/components/StudentHeader";
import BottomNav from "@/components/BottomNav";
import WodView from "@/components/WodView";
import WeekWodCarousel from "@/components/WeekWodCarousel";
import LevelBadge from "@/components/LevelBadge";
import { getLevelInfo } from "@/lib/constants/levels";
import { getCachedLevels } from "@/lib/constants/levels_actions";
import { AlertTriangle } from "lucide-react";
import { getTodayDate, getWeekDates, getMinWeekOffset } from "@/lib/date-utils";
import { getBoxSettings } from "@/lib/constants/settings_actions";
import { DAY_SHORT, ACTIVE_DAYS, SYSTEM_START_DATE } from "@/lib/constants/calendar";

// import RecentPRs from "@/components/progress/RecentPRs"; (Removed: moving to Progress page)

export const metadata: Metadata = {
  title: "Início",
};

interface PageProps {
  searchParams: Promise<{ date?: string; weekOffset?: string }>;
}

/**
 * Página Principal do Aluno (Dashboard/Home).
 * 
 * @architecture
 * - Padrão Neo-Brutalist Light: Estética de alto contraste, fundo claro e bordas rígidas (Iron Monolith Evolution).
 * - Hidratação em Paralelo: Utiliza `Promise.all` para buscar Perfil, WOD, Carrossel Semanal e Bloqueios simultaneamente.
 * - SSoT de WOD: O estado do treino é derivado da `selectedDate` vinda dos searchParams ou `getTodayDate()`.
 * - Segurança: Validação de sessão obrigatória; redireciona para `/login` se inexistente.
 * 
 * @business-logic
 * - Visibilidade Temporal: Bloqueia a visualização de WODs futuros baseado na configuração `wod_visibility_weeks` do Box.
 * - Check-in SSoT: Recupera o status de confirmação e cruza com `class_sessions.finalized_at` para determinar se a aula foi concluída,
 *   impedindo qualquer alteração de check-in em aulas finalizadas pelo Coach.
 * 
 * @lifecycle
 * 1. Resolve `searchParams` para determinar a data de foco.
 * 2. Agrega dados técnicos (`getCachedLevels`) e operacionais (`box_holidays`).
 * 3. Cruza dados do WOD com tokens de nível do aluno para exibição personalizada no `WodView`.
 */
export default async function AppDashboard({ searchParams }: PageProps) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const params = await searchParams;
  const rawWeekOffset = parseInt(params.weekOffset || "0", 10);
  const minOffset = getMinWeekOffset(SYSTEM_START_DATE);
  const weekOffset = Math.max(rawWeekOffset, minOffset);
  
  const today = getTodayDate();
  const selectedDate = params.date || today;

  // 2-5. Parallel Fetches (Non-dependent)
  const [
    { data: profile },
    { data: selectedWod },
    { data: weekWods },
    { data: holiday },
    dynamicLevels,
    boxSettings
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("wods").select("*").eq("date", selectedDate).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("wods").select("id, date, title, tags").in("date", getWeekDates(weekOffset)),
    supabase.from("box_holidays").select("*").eq("date", selectedDate).maybeSingle(),
    getCachedLevels(),
    getBoxSettings()
  ]);

  // ── Visibility Logic ──
  const visibilityWeeks = parseInt(boxSettings.wod_visibility_weeks || "1", 10);
  const todayObj = new Date(today + "T00:00:00Z");
  const dayOfWeek = todayObj.getUTCDay();
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const currentMonday = new Date(todayObj.getTime() - daysFromMonday * 86400000);
  
  // Max date is the end of the Nth week (Sunday)
  const maxDateVisible = new Date(currentMonday.getTime() + (visibilityWeeks * 7) * 86400000 - 86400000);
  const selectedDateObj = new Date(selectedDate + "T00:00:00Z");
  
  const isVisible = selectedDateObj <= maxDateVisible;
  
  // If user is trying to see a forbidden future date, force to today
  const finalSelectedDate = isVisible ? selectedDate : today;
  const finalSelectedWod = isVisible ? selectedWod : null;

  // 6. Check-in (Dependent on finalSelectedWod)
  let userCheckin: any = null;
  if (finalSelectedWod) {
    const { data: checkin, error: checkinError } = await supabase
      .from("check_ins")
      .select("id, status, result, class_slot_id, class_slots(time_start)") 
      .eq("student_id", user.id)
      .eq("wod_id", finalSelectedWod.id)
      .neq("status", "missed")
      .maybeSingle();
      
    if (checkin) {
      // Check if this specific class session is finished (SSoT)
      const { data: session } = await supabase
        .from("class_sessions")
        .select("finalized_at")
        .eq("class_slot_id", checkin.class_slot_id)
        .eq("date", finalSelectedDate) // Usando a data do dashboard/WOD
        .maybeSingle();
      
      const checkinData = checkin as any;
      userCheckin = {
        ...checkin,
        status: checkin.status,
        time: checkinData.class_slots?.time_start ? String(checkinData.class_slots.time_start).slice(0, 5) : null,
        isClassFinished: !!session?.finalized_at
      };
    }
  }

  const weekDates = getWeekDates(weekOffset);
  const BENCHMARKS = ["FRAN", "CINDY", "MURPH", "KAREN", "DT", "GRACE", "HELEN", "ANNIE", "AMANDA", "BARBARA"];
  const wodsByDate = Object.fromEntries((weekWods || []).map((w) => [w.date, w]));

  const carouselWods = weekDates.map((date, i) => {
    const found = wodsByDate[date];
    const dayNum = ACTIVE_DAYS[i]; // getWeekDates returns Mon-Sun (7 days)
    return {
      date,
      dayLabel: DAY_SHORT[dayNum],
      isToday: date === today,
      isRest: false,
      title: found?.title || "PROGRAMAÇÃO...",
      tags: found?.tags || ["CROSSFIT"],
    };
  });

  const selectedTitle = selectedWod?.title || carouselWods.find(w => w.date === selectedDate)?.title || "";
  const isBenchmark = BENCHMARKS.some(b => selectedTitle.toUpperCase().includes(b));
  const benchmarkName = BENCHMARKS.find(b => selectedTitle.toUpperCase().includes(b)) || "";
  
  // PRs reais do aluno (Temporarily disabled on home)
  // const athletePRs = (recentPrs || []) as any[];

  const displayName = profile?.display_name || profile?.full_name || "Atleta";

  const level = getLevelInfo(profile?.level, dynamicLevels);

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--nb-bg)", color: "var(--nb-text)", paddingBottom: "100px", position: "relative" }}>
      <DashboardStyles />
      <StudentHeader />

      <main style={{ maxWidth: "480px", margin: "0 auto", position: "relative" }}>
        
        {/* ── HEADER DE IDENTIDADE (ATHLETE PASS) ── */}
        <section style={{ 
          padding: "48px 20px 40px", 
          display: "flex", 
          flexDirection: "column", 
          alignItems: "center", 
          textAlign: "center",
          position: "relative",
          animation: "slideInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        }}>
          
           {/* BACKGROUND DECOR REMOVED */}

          <div style={{ 
            marginBottom: "32px", 
            zIndex: 1,
            position: "relative",
            animation: "slideInUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards",
          }}>
            <LevelBadge 
              level={level} 
              size={120} 
              avatarUrl={profile?.avatar_url}
              athleteName={profile?.first_name ? profile.first_name.toUpperCase() : displayName.split(' ')[0].toUpperCase()}
              rounded={true}
            />
          </div>

          <div style={{ zIndex: 1, position: "relative", animation: "slideInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards" }}>
            <h1 className="font-display" style={{ 
              fontSize: "clamp(36px, 10vw, 48px)", 
              lineHeight: 1,
              fontWeight: 900,
              letterSpacing: "-0.05em",
              color: "#000",
              textTransform: "uppercase",
              marginBottom: "4px",
            }}>
              {profile?.first_name ? profile.first_name.toUpperCase() : displayName.split(' ')[0].toUpperCase()}
            </h1>
            
            <div style={{ 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center", 
              gap: "8px",
              marginTop: "4px"
            }}>
              <div style={{ width: "20px", height: "2px", background: "#000" }} />
              <span className="font-headline" style={{ 
                fontSize: "13px", 
                fontWeight: 900, 
                color: "#000", 
                textTransform: "uppercase",
                letterSpacing: "0.2em"
              }}>
                {level.label}
              </span>
              <div style={{ width: "20px", height: "2px", background: "#000" }} />
            </div>
          </div>
        </section>


        <div style={{ animation: "slideInUp 0.9s cubic-bezier(0.16, 1, 0.3, 1) forwards", opacity: 0 }}>
          <WeekWodCarousel 
            wods={carouselWods} 
            selectedDate={selectedDate} 
            weekOffset={weekOffset}
            maxWeeks={visibilityWeeks}
          />
        </div>

        <section 
          className="nb-card" 
          style={{ 
            margin: "0 20px 16px", 
            background: "var(--nb-surface)", 
            position: "relative", 
            overflow: "hidden",
            animation: "slideInUp 1s cubic-bezier(0.16, 1, 0.3, 1) forwards",
            opacity: 0
          }}
        >
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "6px", background: "var(--nb-red)" }} />

          <div style={{ padding: "14px 24px", borderBottom: "2px solid #000", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8f8f8" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span className="font-headline" style={{ fontSize: "11px", fontWeight: 900, letterSpacing: "0.1em", color: "#000", textTransform: "uppercase" }}>WOD DO DIA</span>
                {selectedDate === today && (
                    <span style={{ fontSize: "9px", background: "var(--nb-red)", color: "#fff", padding: "2px 6px", border: "1px solid #000", fontWeight: 900 }}>HOJE</span>
                )}
            </div>
          </div>

          <WodView 
            wod={finalSelectedWod} 
            selectedDate={finalSelectedDate} 
            checkin={userCheckin}
            studentLevel={profile?.level || "branco"}
            holiday={holiday}
          />
        </section>

        {/* Recent PRs moved to Progress page as requested */}

      </main>

      <BottomNav />
    </div>
  );
}

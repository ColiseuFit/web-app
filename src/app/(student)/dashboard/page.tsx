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
import { getTodayDate, getWeekDates } from "@/lib/date-utils";

// import RecentPRs from "@/components/progress/RecentPRs"; (Removed: moving to Progress page)

export const metadata: Metadata = {
  title: "Início",
};

interface PageProps {
  searchParams: Promise<{ date?: string }>;
}

/**
 * Página Principal do Aluno (Home).
 * Centraliza o WOD do dia e o acesso à reserva de turma.
 * Suporta navegação por data via query param `?date=YYYY-MM-DD`.
 */
export default async function AppDashboard({ searchParams }: PageProps) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const params = await searchParams;
  
  const today = getTodayDate();
  const selectedDate = params.date || today;

  // 2-5. Parallel Fetches (Non-dependent)
  const [
    { data: profile },
    { data: selectedWod },
    { data: weekWods },
    { data: holiday },
    dynamicLevels
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("wods").select("*").eq("date", selectedDate).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("wods").select("id, date, title, tags").in("date", getWeekDates()),
    supabase.from("box_holidays").select("*").eq("date", selectedDate).maybeSingle(),
    getCachedLevels()
  ]);

  // 6. Check-in (Dependent on selectedWod)
  let userCheckin = null;
  if (selectedWod) {
    const { data: checkin } = await supabase
      .from("check_ins")
      .select("id, status, result")
      .eq("student_id", user.id)
      .eq("wod_id", selectedWod.id)
      .neq("status", "missed")
      .maybeSingle();
    userCheckin = checkin;
  }

  const weekDates = getWeekDates();

  // Formatação do carrossel semanal
  const DAY_LABELS = ["SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];
  const BENCHMARKS = ["FRAN", "CINDY", "MURPH", "KAREN", "DT", "GRACE", "HELEN", "ANNIE", "AMANDA", "BARBARA"];
  
  const wodsByDate = Object.fromEntries((weekWods || []).map((w) => [w.date, w]));
  const carouselWods = weekDates.map((date, i) => {
    const found = wodsByDate[date];
    return {
      date,
      dayLabel: DAY_LABELS[i],
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
              size={130} 
              avatarUrl={profile?.avatar_url}
              athleteName={profile?.first_name ? profile.first_name.toUpperCase() : displayName.split(' ')[0].toUpperCase()}
            />
          </div>

          <div style={{ zIndex: 1, position: "relative", animation: "slideInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards" }}>
            <h1 className="font-display" style={{ 
              fontSize: "clamp(42px, 12vw, 56px)", 
              lineHeight: 0.8,
              fontWeight: 900,
              letterSpacing: "-0.04em",
              color: "#000",
              textTransform: "uppercase",
              marginBottom: "8px",
              textShadow: `6px 6px 0px ${level.color}30`
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
          <WeekWodCarousel wods={carouselWods} selectedDate={selectedDate} />
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
            wod={selectedWod} 
            selectedDate={selectedDate} 
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

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
    { data: holiday }
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("wods").select("*").eq("date", selectedDate).maybeSingle(),
    supabase.from("wods").select("id, date, title, tags").in("date", getWeekDates()),
    supabase.from("box_holidays").select("*").eq("date", selectedDate).maybeSingle()
  ]);

  // 6. Check-in (Dependent on selectedWod)
  let alreadyChecked = false;
  if (selectedWod) {
    const { data: checkin } = await supabase
      .from("check_ins")
      .select("id")
      .eq("student_id", user.id)
      .eq("wod_id", selectedWod.id)
      .maybeSingle();
    alreadyChecked = !!checkin;
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

    const getLevelInfo = (lvl: string) => {
      const l = lvl?.toLowerCase() || "";
      if (l.includes("elite") || l.includes("preto") || l.includes("casca"))
        return { id: "L5", color: "#C5A059", label: "L5 - ELITE", textColor: "#000", icon: "/levels/icone-coliseu-levels-elite.svg", description: "O topo da pirâmide. Atletas de alto rendimento, força bruta e ginásticos inabaláveis." };
      if (l.includes("rx") || l.includes("vermelho")) 
        return { id: "L4", color: "var(--red)", label: "L4 - RX", textColor: "#FFF", icon: "/levels/icone-coliseu-levels-rx.svg", description: "O Padrão Ouro. Execução fiel de todos os WODs oficiais do Open/Games." };
      if (l.includes("intermediario") || l.includes("azul")) 
        return { id: "L3", color: "var(--lvl-blue)", label: "L3 - INTERMEDIÁRIO", textColor: "#FFF", icon: "/levels/icone-coliseu-levels-intermediario.svg", description: "Transição para movimentos ininterruptos e domínio parcial de habilidades ginásticas." };
      if (l.includes("scale") || l.includes("verde")) 
        return { id: "L2", color: "var(--lvl-green)", label: "L2 - SCALE", textColor: "#000", icon: "/levels/icone-coliseu-levels-scale.svg", description: "Capacidade de adaptar movimentos complexos e aumento da carga de trabalho." };
      if (l.includes("iniciante") || l.includes("branco")) 
        return { id: "L1", color: "var(--lvl-white)", label: "L1 - INICIANTE", textColor: "#000", icon: "/levels/icone-coliseu-levels-iniciante.svg", description: "Domínio dos padrões básicos de movimento e construção de base aeróbica sólida." };
    return { id: "L1", color: "var(--surface-highest)", label: "INICIANTE", textColor: "#FFF", icon: "/levels/icone-coliseu-levels-iniciante.svg", description: "O início da jornada no Coliseu." };
  };
  const level = getLevelInfo(profile?.level);

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg)", color: "var(--text)", paddingBottom: "100px", position: "relative" }}>
      <DashboardStyles />

      <div style={{ position: "fixed", top: "-20%", left: "50%", transform: "translateX(-50%)", width: "100vw", height: "60vh", background: "radial-gradient(ellipse, rgba(227,27,35,0.05) 0%, transparent 70%)", filter: "blur(80px)", zIndex: 0, pointerEvents: "none" }} />
      <StudentHeader />

      <main style={{ maxWidth: "480px", margin: "0 auto", position: "relative" }}>
        
        {/* ── HEADER DE IDENTIDADE ── */}
        <section style={{ padding: "40px 20px 32px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
          
          {/* DUO DE BADGES CENTRALIZADOS */}
          <div style={{ display: "flex", gap: "12px", marginBottom: "24px", animation: "levelIconEntrance 0.8s ease-out" }}>
            <LevelBadge 
              level={level} 
              description={level.description} 
              size={72} // Levemente maior para o pôster
            />
            <LevelBadge 
              level={level} 
              description={level.description} 
              size={72} 
              avatarUrl={profile?.avatar_url}
            />
          </div>

          {/* IDENTIDADE DO ATLETA */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
            <h1 className="font-display" style={{ 
              fontSize: "clamp(32px, 10vw, 42px)", 
              lineHeight: 0.9,
              letterSpacing: "-0.02em",
              color: "#FFF",
              textTransform: "uppercase"
            }}>
              {profile?.first_name ? profile.first_name.toUpperCase() : displayName.split(' ')[0].toUpperCase()}
            </h1>
            
            <h2 style={{ 
              fontSize: "14px", 
              fontWeight: 700, 
              color: "rgba(255,255,255,0.4)", 
              textTransform: "uppercase",
              letterSpacing: "0.2em",
              marginBottom: "12px"
            }}>
              {profile?.last_name ? profile.last_name.toUpperCase() : displayName.split(' ').slice(1).join(' ').toUpperCase()}
            </h2>

            <div style={{ 
              display: "inline-block",
              padding: "4px 12px",
              background: "rgba(255,255,255,0.03)",
              border: `1px solid ${level.color}44`,
              borderRadius: "4px"
            }}>
              <span style={{ 
                fontSize: "10px", 
                fontWeight: 900, 
                letterSpacing: "0.15em", 
                color: level.color, 
                textTransform: "uppercase" 
              }}>
                {level.label}
              </span>
            </div>
          </div>
        </section>


        <WeekWodCarousel wods={carouselWods} selectedDate={selectedDate} />

        <section style={{ margin: "0 20px 16px", background: "var(--surface-lowest)", border: "1px solid var(--border-glow)", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "3px", background: "var(--red)", boxShadow: "0 0 20px rgba(227,27,35,0.5)" }} />

          <div style={{ padding: "14px 24px", borderBottom: "1px solid var(--border-glow)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.3em", color: "var(--text-dim)", textTransform: "uppercase" }}>WOD</span>
                {selectedDate === today && (
                    <span style={{ fontSize: "8px", background: "var(--red)", color: "#fff", padding: "1px 4px", borderRadius: "2px", fontWeight: 900 }}>HOJE</span>
                )}
            </div>
          </div>

          <WodView 
            wod={selectedWod} 
            selectedDate={selectedDate} 
            alreadyChecked={alreadyChecked}
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

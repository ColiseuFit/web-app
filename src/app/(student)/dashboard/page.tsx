import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import DashboardStyles from "@/components/DashboardStyles";
import StudentHeader from "@/components/StudentHeader";
import BottomNav from "@/components/BottomNav";
import WodView from "@/components/WodView";
import WeekWodCarousel from "@/components/WeekWodCarousel";
import LevelBadge from "@/components/LevelBadge";

interface PageProps {
  searchParams: Promise<{ date?: string }>;
}

/**
 * Página Principal do Aluno (Home).
 * Centraliza o WOD do dia (Lousa) e o acesso à reserva de turma.
 * Suporta navegação por data via query param `?date=YYYY-MM-DD`.
 */
export default async function AppDashboard({ searchParams }: PageProps) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const params = await searchParams;
  const today = new Date().toISOString().split("T")[0];
  const selectedDate = params.date || today;

  // 2-5. Parallel Fetches (Non-dependent)
  const [
    { data: profile },
    { data: alerts },
    { data: selectedWod },
    { data: weekWods }
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("health_alerts").select("*").eq("student_id", user.id).eq("is_resolved", false),
    supabase.from("wods").select("*").eq("date", selectedDate).maybeSingle(),
    supabase.from("wods").select("id, date, title, tags").in("date", Array.from({ length: 6 }, (_, i) => {
      const todayDateObj = new Date(today + "T00:00:00Z");
      const dayOfWeek = todayDateObj.getUTCDay();
      const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; 
      const mondayMs = todayDateObj.getTime() - daysFromMonday * 86400000;
      const d = new Date(mondayMs + i * 86400000);
      return d.toISOString().split("T")[0];
    }))
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

  // Pre-calculate week dates for the carousel
  const todayDateObj = new Date(today + "T00:00:00Z");
  const dayOfWeek = todayDateObj.getUTCDay();
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; 
  const mondayMs = todayDateObj.getTime() - daysFromMonday * 86400000;
  const weekDates = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(mondayMs + i * 86400000);
    return d.toISOString().split("T")[0];
  });

  // Formatação do carrossel semanal
  const DAY_LABELS = ["SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];
  const BENCHMARKS = ["FRAN", "CINDY", "MURPH", "KAREN", "DT", "GRACE", "HELEN", "ANNIE", "AMANDA", "BARBARA"];
  const MOCK_TITLES = ["FRAN", "CINDY", "MURPH", "KAREN", "DT", "GRACE"];
  const wodsByDate = Object.fromEntries((weekWods || []).map((w) => [w.date, w]));
  const carouselWods = weekDates.map((date, i) => {
    const found = wodsByDate[date];
    return {
      date,
      dayLabel: DAY_LABELS[i],
      isToday: date === today,
      isRest: false,
      title: found?.title || MOCK_TITLES[i],
      tags: found?.tags || ["CROSSFIT", "BENCHMARK"],
    };
  });

  // PR Badge Detection
  const selectedTitle = selectedWod?.title || carouselWods.find(w => w.date === selectedDate)?.title || "";
  const isBenchmark = BENCHMARKS.some(b => selectedTitle.toUpperCase().includes(b));
  const benchmarkName = BENCHMARKS.find(b => selectedTitle.toUpperCase().includes(b)) || "";
  const MOCK_PRS: Record<string, string> = {
    FRAN: "3:45", CINDY: "22 RDS", MURPH: "42:08", KAREN: "7:30",
    DT: "14:22", GRACE: "2:15", HELEN: "10:30", ANNIE: "9:45"
  };
  const athletePR = isBenchmark && benchmarkName ? MOCK_PRS[benchmarkName] : null;

  const displayName = profile?.display_name || profile?.full_name || "Atleta";
  const xp = profile?.xp_balance || 0;
  const xpToNextLevel = 1000;
  const xpProgress = Math.min((xp / xpToNextLevel) * 100, 100);

  const getLevelInfo = (lvl: string) => {
    const l = lvl?.toLowerCase() || "";
    if (l.includes("preto") || l.includes("elite") || l.includes("casca"))
      return { id: "L5", color: "#C5A059", label: "L5 - ELITE", textColor: "#000", icon: "/levels/icone-coliseu-levels-elite.svg", description: "O topo da pirâmide. Atletas de alto rendimento, força bruta e ginásticos inabaláveis." };
    if (l.includes("vermelho") || l.includes("rx")) 
      return { id: "L4", color: "var(--red)", label: "L4 - RX", textColor: "#FFF", icon: "/levels/icone-coliseu-levels-rx.svg", description: "O Padrão Ouro. Execução fiel de todos os WODs oficiais do Open/Games." };
    if (l.includes("azul")) 
      return { id: "L3", color: "var(--lvl-blue)", label: "L3 - INTERMEDIÁRIO", textColor: "#FFF", icon: "/levels/icone-coliseu-levels-intermediario.svg", description: "Transição para movimentos ininterruptos e domínio parcial de habilidades ginásticas." };
    if (l.includes("verde")) 
      return { id: "L2", color: "var(--lvl-green)", label: "L2 - SCALE", textColor: "#000", icon: "/levels/icone-coliseu-levels-scale.svg", description: "Capacidade de adaptar movimentos complexos e aumento da carga de trabalho." };
    if (l.includes("branco")) 
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
        
        {/* ── BOAS-VINDAS ── */}
        <section style={{ padding: "32px 20px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <LevelBadge 
                level={level} 
                description={level.description} 
                size={64} 
              />
              <div style={{ display: "flex", flexDirection: "column" }}>
                <h1 className="font-display" style={{ fontSize: "clamp(24px, 6vw, 32px)", lineHeight: 1.1 }}>
                  {displayName.toUpperCase()}
                </h1>
                <span style={{ fontSize: "10px", fontWeight: 800, letterSpacing: "0.15em", color: level.color, textTransform: "uppercase", marginTop: "4px" }}>
                  {level.label}
                </span>
              </div>
            </div>
          </div>
        </section>


        <WeekWodCarousel wods={carouselWods} selectedDate={selectedDate} />

        <section style={{ margin: "0 20px 16px", background: "var(--surface-lowest)", border: "1px solid var(--border-glow)", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "3px", background: "var(--red)", boxShadow: "0 0 20px rgba(227,27,35,0.5)" }} />

          <div style={{ padding: "14px 24px", borderBottom: "1px solid var(--border-glow)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.3em", color: "var(--text-dim)", textTransform: "uppercase" }}>LOUSA</span>
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
          />
        </section>

        {alerts && alerts.length > 0 && selectedDate === today && (
          <div style={{ margin: "0 20px 16px", background: "rgba(255,193,7,0.05)", border: "1px solid rgba(255,193,7,0.2)", padding: "16px 20px", borderLeft: "3px solid #FFC107" }}>
            <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.2em", color: "#FFC107", textTransform: "uppercase", marginBottom: "8px" }}>⚠ Alertas de Saúde</p>
            {alerts.map((alert: { id: string; description: string }) => (
              <p key={alert.id} style={{ fontSize: "13px", color: "rgba(255,193,7,0.8)" }}>{alert.description}</p>
            ))}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}

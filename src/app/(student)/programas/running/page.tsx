import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import StudentHeader from "@/components/StudentHeader";
import BottomNav from "@/components/BottomNav";
import DashboardStyles from "@/components/DashboardStyles";
import { Footprints, Timer, Zap, TrendingUp } from "lucide-react";
import { getStudentRunningHistory } from "@/lib/actions/running_actions";
import RunningHubTabs from "@/components/RunningHubTabs";
import RunningAccessGate from "@/components/RunningAccessGate";
import { RUNNING_LEVELS, type RunningLevelKey } from "@/lib/constants/running";


export const metadata: Metadata = {
  title: "Coliseu Running",
  description: "Seu programa de corrida personalizado no Coliseu Fit.",
};

/**
 * RunningDashboardPage — Página de Corrida do Aluno.
 *
 * @data-fetching Server Component: busca plano ativo e histórico em paralelo.
 * @security Redireciona para /login se o usuário não estiver autenticado.
 * @utc Todas as comparações de data usam UTC para paridade Server/Client.
 */
export default async function RunningDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Primeiro dia do mês atual em UTC
  const now = new Date();
  const firstDayOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();

  const [
    { data: activePlan }, 
    { data: monthlyWorkouts }, 
    { data: profile },
    historyData,
    { data: stravaIntegration },
    { data: latestEval }
  ] = await Promise.all([
    supabase
      .from("running_plans")
      .select("id, title, level_tag, status, created_at, running_workouts(*)")
      .eq("student_id", user.id)
      .eq("status", "active")
      .order("week_number", { foreignTable: "running_workouts", ascending: true })
      .order("session_order", { foreignTable: "running_workouts", ascending: true })
      .maybeSingle(),
    supabase
      .from("running_workouts")
      .select("actual_distance_km, actual_duration_seconds, actual_pace_seconds_per_km")
      .eq("student_id", user.id)
      .not("completed_at", "is", null)
      .gte("completed_at", firstDayOfMonth),
    supabase
      .from("profiles")
      .select("level, running_level, running_pace, running_target_pace, running_status, full_name, points_total, avatar_url, birth_date, gender, membership_type")
      .eq("id", user.id)
      .single(),
    getStudentRunningHistory(user.id),
    supabase
      .from("athlete_integrations")
      .select("id, provider, updated_at")
      .eq("student_id", user.id)
      .eq("provider", "strava")
      .maybeSingle(),
    supabase
      .from("physical_evaluations")
      .select("weight")
      .eq("student_id", user.id)
      .order("evaluation_date", { ascending: false })
      .limit(1)
      .maybeSingle()
  ]);

  // ── Métricas mensais ──────────────────────────────────────────────────────
  const totalKmMonth = (monthlyWorkouts || []).reduce(
    (acc, w) => acc + (parseFloat(String(w.actual_distance_km)) || 0),
    0
  );
  const totalSecondsMonth = (monthlyWorkouts || []).reduce(
    (acc, w) => acc + (w.actual_duration_seconds || 0),
    0
  );
  const totalHours = Math.floor(totalSecondsMonth / 3600);
  const totalMinutes = Math.floor((totalSecondsMonth % 3600) / 60);
  const timeDisplay = totalSecondsMonth > 0
    ? `${String(totalHours).padStart(2, "0")}:${String(totalMinutes).padStart(2, "0")}h`
    : "00:00h";

  const workouts: any[] = (activePlan as any)?.running_workouts ?? [];
  
  // Agrupar por sessões únicas para métricas reais de progresso
  const uniqueSessions = new Set(workouts.map(w => `${w.week_number}-${w.session_order}`));
  const completedSessions = new Set(workouts.filter(w => w.completed_at).map(w => `${w.week_number}-${w.session_order}`));
  
  const totalWorkoutsInPlan = uniqueSessions.size;
  const completedInPlan = completedSessions.size;
  const completedThisMonth = (monthlyWorkouts || []).length; // Aqui mantemos a contagem de registros no mês

  // ── Parse Perfil de Performance (Marcos de Pace) ──────────────────────────
  let paceMarks: { distance: number | string; pace: string }[] = [];
  try {
    const rawPace = (profile as any)?.running_pace;
    const parsed = JSON.parse(rawPace || "[]");
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Sanitização: remove marcos sem tempo válido (evita badges "5KM: []")
      paceMarks = parsed.filter((p: any) => p.pace && p.pace !== "00:00" && p.pace.length >= 4);
    } else if (rawPace && rawPace.length >= 4 && rawPace !== "00:00") {
      // Fallback legado se for apenas uma string tipo "05:00"
      paceMarks = [{ distance: 1, pace: rawPace }];
    }
  } catch (e) {
    const rawPace = (profile as any)?.running_pace;
    if (rawPace && rawPace.length >= 4 && rawPace !== "00:00") {
      paceMarks = [{ distance: 1, pace: rawPace }];
    }
  }

  const firstName = profile?.full_name ? profile.full_name.split(" ")[0] : "Atleta";

  // ── SE O ALUNO NÃO TIVER NÍVEL OU NÃO ESTIVER ATIVO, MOSTRA O BLOQUEIO (GATE) ──
  const isSuspended = profile?.running_status === "inactive" || profile?.running_status === "suspended";
  const hasNoLevel = !profile?.running_level;

  if (hasNoLevel || isSuspended) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "#F2F2F0", paddingBottom: "100px" }}>
        <DashboardStyles />
        <StudentHeader />
        <main style={{ maxWidth: "480px", margin: "0 auto", padding: "24px 20px" }}>
          {/* Se não tem nível, isInactive é falso (mostra convite). Se tem nível mas está inativo, isInactive é true (mostra pausa) */}
          <RunningAccessGate 
            studentName={profile?.full_name || "Atleta"} 
            isInactive={!!(profile?.running_level && isSuspended)} 
          />
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#F2F2F0" }}>
      <DashboardStyles />
      <StudentHeader />

      <main style={{ paddingBottom: "100px" }}>

        {/* ── HERO BANNER (Fixed Context) ── */}
        <div style={{
          background: "#FFF",
          color: "#000",
          padding: "40px 24px 32px",
          borderBottom: "8px solid #000",
          position: "relative",
          overflow: "hidden",
          marginBottom: 24
        }} className="animate-in">
          {/* Grafismo Neon Brutalist de fundo */}
          <div style={{
            position: "absolute",
            right: -20,
            top: -20,
            fontSize: "160px",
            fontWeight: 950,
            opacity: 0.04,
            color: "#000",
            lineHeight: 0.7,
            letterSpacing: "-0.05em",
            pointerEvents: "none",
            userSelect: "none",
            transform: "rotate(-5deg)"
          }}>RUN</div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", position: "relative", zIndex: 2 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <div style={{
                  background: "var(--nb-red)",
                  padding: "10px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "3px solid #000",
                  boxShadow: "4px 4px 0px #000",
                  borderRadius: "2px"
                }}>
                  <Footprints size={22} color="#FFF" />
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: 10, fontWeight: 900, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--nb-red)" }}>
                    CENTRAL DE TREINO
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 800, opacity: 0.8, color: "#000" }}>
                    COLISEU RUNNING
                  </span>
                </div>
              </div>

              <h1 style={{ fontSize: 38, fontWeight: 950, margin: 0, letterSpacing: "-0.05em", lineHeight: 1.0, textTransform: "uppercase" }}>
                SALVE,<br />
                <span style={{ 
                  color: "#FFF",
                  background: "var(--nb-red)",
                  padding: "0 8px",
                  display: "inline-block",
                  transform: "skewX(-5deg)",
                  marginLeft: "-4px"
                }}>{firstName}!</span>
                
                {/* Badge de Assinatura (Premium vs Pass) */}
                <div style={{
                  display: "inline-block",
                  marginLeft: "12px",
                  verticalAlign: "middle",
                  transform: "translateY(-4px)"
                }}>
                  {profile?.membership_type === "club_pass" ? (
                    <span style={{
                      padding: "4px 8px",
                      border: "2px solid #000",
                      background: "#6B7280", // Gray para Pass
                      color: "#FFF",
                      fontSize: "9px",
                      fontWeight: 900,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      boxShadow: "2px 2px 0px #000"
                    }}>PASS</span>
                  ) : (
                    <span style={{
                      padding: "4px 8px",
                      border: "2px solid #000",
                      background: "var(--nb-blue)", // Blue para Premium
                      color: "#FFF",
                      fontSize: "9px",
                      fontWeight: 900,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      boxShadow: "2px 2px 0px #000"
                    }}>PREMIUM</span>
                  )}
                </div>
              </h1>
            </div>

            {/* XP Badge Circular / Premium */}
            <div style={{
              background: "var(--nb-yellow)",
              width: "84px",
              height: "84px",
              border: "4px solid #000",
              boxShadow: "6px 6px 0px #000",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              transform: "rotate(3deg)"
            }}>
              <span style={{ fontSize: 8, fontWeight: 950, marginBottom: -4, opacity: 0.8, textTransform: "uppercase" }}>Km Total</span>
              <span style={{ fontSize: 22, fontWeight: 950 }}>{historyData.stats.totalKm.toFixed(0)}</span>
              <div style={{ fontSize: 9, fontWeight: 900, marginTop: -2 }}>ACUMULADO</div>
            </div>
          </div>

          <div style={{
            marginTop: 40,
            paddingTop: 24,
            borderTop: "3px solid #000",
            display: "flex",
            flexDirection: "column",
            gap: 16,
            position: "relative",
          }}>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
              <div style={{
                background: "var(--nb-yellow)",
                color: "#000",
                padding: "8px 16px",
                border: "3px solid #000",
                boxShadow: "4px 4px 0px #000",
                display: "flex",
                alignItems: "center",
                gap: 8,
                transform: "rotate(-1deg)"
              }}>
                <Zap size={14} fill="#000" />
                <span style={{ fontSize: 12, fontWeight: 950, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {(() => {
                    const rawLevel = (profile?.running_level || activePlan?.level_tag || "iniciante").toLowerCase() as RunningLevelKey;
                    return RUNNING_LEVELS[rawLevel]?.label || rawLevel;
                  })()}
                </span>
              </div>
              
              {paceMarks.map((mark, idx) => (
                <div key={idx} style={{
                  background: "#000",
                  color: "#FFF",
                  padding: "8px 16px",
                  border: "3px solid var(--nb-yellow)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  transform: `rotate(${idx % 2 === 0 ? 1 : -1}deg)`,
                  boxShadow: "4px 4px 0px #000"
                }}>
                  <Timer size={14} className="text-yellow-400" /> 
                  <span style={{ fontSize: 12, fontWeight: 900 }}>
                    {mark.distance}KM: {mark.pace}
                  </span>
                </div>
              ))}
            </div>
            
            {activePlan?.title && (
              <div style={{ 
                fontSize: 11, 
                fontWeight: 900, 
                color: "rgba(255,255,255,0.6)", 
                letterSpacing: "0.05em", 
                textTransform: "uppercase", 
                display: "flex", 
                alignItems: "center", 
                gap: 8,
                background: "rgba(0,0,0,0.3)",
                padding: "6px 12px",
                width: "fit-content",
                borderRadius: "20px"
              }}>
                <TrendingUp size={14} /> FOCO: {activePlan.title}
              </div>
            )}
          </div>
        </div>

        {/* ── CONTEÚDO EM ABAS ── */}
        <RunningHubTabs 
          activePlan={activePlan}
          historyData={historyData}
          stravaIntegration={stravaIntegration}
          runnerProfile={{
            avatar_url: profile?.avatar_url,
            birth_date: profile?.birth_date,
            gender: profile?.gender,
            weight: latestEval?.weight,
            running_level: profile?.running_level,
            running_pace: paceMarks,
            running_target_pace: profile?.running_target_pace
          }}
          metrics={{
            totalKmMonth,
            timeDisplay,
            completedThisMonth,
            completedInPlan,
            totalWorkoutsInPlan
          }}
        />

      </main>

      <BottomNav />
    </div>
  );
}

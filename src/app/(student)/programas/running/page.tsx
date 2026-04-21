import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import StudentHeader from "@/components/StudentHeader";
import BottomNav from "@/components/BottomNav";
import DashboardStyles from "@/components/DashboardStyles";
import { formatPace } from "@/lib/constants/running";
import { Footprints, Timer, Zap, TrendingUp, History } from "lucide-react";
import RunningWorkoutsList from "@/components/RunningWorkoutsList";
import RunningAnalytics from "@/components/RunningAnalytics";
import { getStudentRunningHistory } from "@/lib/actions/running_actions";


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
    { data: stravaIntegration }
  ] = await Promise.all([    supabase
      .from("running_plans")
      .select("id, title, level_tag, status, created_at, running_workouts(*)")
      .eq("student_id", user.id)
      .eq("status", "active")
      .order("scheduled_date", { foreignTable: "running_workouts", ascending: true })
      .maybeSingle(),
    supabase
      .from("running_workouts")
      .select("actual_distance_km, actual_duration_seconds, actual_pace_seconds_per_km")
      .eq("student_id", user.id)
      .not("completed_at", "is", null)
      .gte("completed_at", firstDayOfMonth),
      supabase
        .from("profiles")
        .select("level, running_level, running_pace, full_name")
        .eq("id", user.id)
        .single(),
      getStudentRunningHistory(user.id),
      supabase
        .from("athlete_integrations")
        .select("id, provider")
        .eq("student_id", user.id)
        .eq("provider", "strava")
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

  const completedThisMonth = (monthlyWorkouts || []).length;
  const workouts: any[] = (activePlan as any)?.running_workouts ?? [];
  const completedInPlan = workouts.filter((w) => w.completed_at).length;

  const firstName = profile?.full_name ? profile.full_name.split(" ")[0] : "Atleta";

  return (
    <div style={{ minHeight: "100vh", background: "#F2F2F0" }}>
      <DashboardStyles />
      <StudentHeader />

      <main style={{ paddingBottom: "100px" }}>

        {/* ── HERO BANNER ── */}
        <div style={{
          background: "#000",
          color: "#FFF",
          padding: "28px 20px 24px",
          borderBottom: "4px solid #000",
          position: "relative",
          overflow: "hidden",
        }}>
          {/* Detalhe gráfico de fundo */}
          <div style={{
            position: "absolute",
            right: -20,
            top: -20,
            width: 180,
            height: 180,
            borderRadius: "50%",
            border: "40px solid rgba(255,255,255,0.04)",
            pointerEvents: "none",
          }} />
          <div style={{
            position: "absolute",
            right: 30,
            bottom: -40,
            width: 120,
            height: 120,
            borderRadius: "50%",
            border: "30px solid rgba(255,255,255,0.04)",
            pointerEvents: "none",
          }} />

          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6, position: "relative" }}>
            <div style={{
              background: "#E74C3C",
              padding: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
              <Footprints size={20} color="#FFF" />
            </div>
            <span style={{ fontSize: 10, fontWeight: 900, letterSpacing: "0.15em", opacity: 0.6, textTransform: "uppercase" }}>
              Coliseu Running
            </span>
          </div>

          <h1 style={{ fontSize: 28, fontWeight: 950, margin: 0, letterSpacing: "-0.02em", position: "relative" }}>
            PROGRAMA DE<br />CORRIDA
          </h1>

          <div style={{
            marginTop: 18,
            paddingTop: 18,
            borderTop: "1px solid rgba(255,255,255,0.15)",
            display: "flex",
            flexDirection: "column",
            gap: 8,
            position: "relative",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{
                fontSize: 10,
                fontWeight: 900,
                background: "#FFF",
                color: "#000",
                padding: "4px 10px",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                border: "2px solid #000",
              }}>
                {profile?.running_level || activePlan?.level_tag || profile?.level || "INICIANTE"}
              </span>
              {profile?.running_pace && (
                <span style={{
                  fontSize: 10,
                  fontWeight: 900,
                  background: "#000",
                  color: "#FFF",
                  padding: "4px 10px",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  border: "2px solid #FFF",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px"
                }}>
                  <Timer size={10} /> PACE {profile.running_pace}
                </span>
              )}
              <span style={{ fontSize: 14, fontWeight: 700, opacity: 0.9 }}>
                Olá, {firstName}
              </span>
            </div>
            
            {activePlan?.title && (
              <div style={{ fontSize: 9, fontWeight: 900, color: "#888", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                Planilha Atual: {activePlan.title}
              </div>
            )}
          </div>
        </div>

        {/* ── MÉTRICAS E PERFORMANCE ── */}
        <div style={{ padding: "20px 16px 0" }}>
          <p style={{ fontSize: 9, fontWeight: 900, color: "#888", letterSpacing: "0.12em", textTransform: "uppercase", margin: "0 0 12px 0" }}>
            Métricas de {now.toLocaleString("pt-BR", { month: "long", timeZone: "UTC" }).toUpperCase()}
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
            {/* KM no mês */}
            <div style={{
              padding: "16px 14px",
              background: "#FFF",
              border: "3px solid #000",
              boxShadow: "4px 4px 0px #000",
            }}>
              <Footprints size={18} color="#3498DB" style={{ marginBottom: 8 }} />
              <div style={{ fontSize: 22, fontWeight: 950, color: "#000", lineHeight: 1 }}>
                {totalKmMonth.toFixed(1)}
              </div>
              <div style={{ fontSize: 9, fontWeight: 900, color: "#888", marginTop: 4, textTransform: "uppercase" }}>
                km
              </div>
            </div>

            {/* Tempo total */}
            <div style={{
              padding: "16px 14px",
              background: "#FFF",
              border: "3px solid #000",
              boxShadow: "4px 4px 0px #000",
            }}>
              <Timer size={18} color="#8E44AD" style={{ marginBottom: 8 }} />
              <div style={{ fontSize: 22, fontWeight: 950, color: "#000", lineHeight: 1 }}>
                {timeDisplay}
              </div>
              <div style={{ fontSize: 9, fontWeight: 900, color: "#888", marginTop: 4, textTransform: "uppercase" }}>
                tempo
              </div>
            </div>

            {/* Treinos concluídos */}
            <div style={{
              padding: "16px 14px",
              background: "#FFF",
              border: "3px solid #000",
              boxShadow: "4px 4px 0px #000",
            }}>
              <Zap size={18} color="#E67E22" style={{ marginBottom: 8 }} />
              <div style={{ fontSize: 22, fontWeight: 950, color: "#000", lineHeight: 1 }}>
                {completedThisMonth}
              </div>
              <div style={{ fontSize: 9, fontWeight: 900, color: "#888", marginTop: 4, textTransform: "uppercase" }}>
                logs
              </div>
            </div>
          </div>

          {/* Integração Strava Card */}
          <div style={{
            background: stravaIntegration ? "#FC4C02" : "#FFF",
            border: "3px solid #000",
            boxShadow: "4px 4px 0px #000",
            padding: "16px",
            marginBottom: "20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 40, height: 40,
                background: stravaIntegration ? "#FFF" : "#FC4C02",
                color: stravaIntegration ? "#FC4C02" : "#FFF",
                display: "flex", alignItems: "center", justifyContent: "center",
                borderRadius: "50%",
                fontWeight: 900, fontSize: 18
              }}>
                S
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 900, color: stravaIntegration ? "#FFF" : "#000", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                  {stravaIntegration ? "Strava Conectado" : "Conectar ao Strava"}
                </p>
                <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: stravaIntegration ? "rgba(255,255,255,0.8)" : "#666", textTransform: "uppercase" }}>
                  {stravaIntegration ? "Treinos sincronizados automaticamente" : "Sincronize seus treinos de corrida"}
                </p>
              </div>
            </div>
            
            {!stravaIntegration ? (
              <a 
                href="/api/auth/strava"
                style={{
                  padding: "10px 16px",
                  background: "#000",
                  color: "#FFF",
                  textDecoration: "none",
                  fontSize: 10,
                  fontWeight: 900,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  border: "2px solid #000",
                  boxShadow: "2px 2px 0px #FC4C02"
                }}
              >
                Conectar
              </a>
            ) : (
               <div style={{
                padding: "8px 12px",
                background: "rgba(0,0,0,0.1)",
                color: "#FFF",
                fontSize: 10,
                fontWeight: 900,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                border: "2px solid #FFF",
              }}>
                Ativo
              </div>
            )}
          </div>

          {/* Gráficos de Tendência */}
          <RunningAnalytics 
            workouts={historyData.workouts} 
            stats={historyData.stats} 
          />
        </div>

        {/* ── PLANO ATIVO / SESSÕES ── */}
        <div style={{ padding: "0 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <TrendingUp size={16} />
            <p style={{ fontSize: 9, fontWeight: 900, color: "#888", letterSpacing: "0.12em", textTransform: "uppercase", margin: 0 }}>
              {activePlan ? `Sessões do Plano • ${completedInPlan}/${workouts.length} concluídas` : "Plano de Treino"}
            </p>
          </div>

          {!activePlan ? (
            /* Empty State */
            <div style={{
              padding: "48px 24px",
              textAlign: "center",
              background: "#FFF",
              border: "3px dashed #CCC",
            }}>
              <div style={{
                width: 56,
                height: 56,
                background: "#F5F5F5",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
              }}>
                <Footprints size={28} color="#CCC" />
              </div>
              <p style={{ fontSize: 14, fontWeight: 900, color: "#333", margin: "0 0 8px 0" }}>
                NENHUM PLANO ATIVO
              </p>
              <p style={{ fontSize: 12, color: "#999", margin: 0, lineHeight: 1.5 }}>
                Solicite ao seu coach um programa<br />de corrida personalizado.
              </p>
            </div>
          ) : (
            <RunningWorkoutsList 
              workouts={workouts} 
            />
          )}
        </div>

        {/* ── HISTÓRICO DE LOGS ── */}
        {historyData.workouts.length > 0 && (
          <div style={{ padding: "32px 16px 0" }}>
             <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <History size={16} />
              <p style={{ fontSize: 9, fontWeight: 900, color: "#888", letterSpacing: "0.12em", textTransform: "uppercase", margin: 0 }}>
                Histórico de Corridas
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {historyData.workouts.slice(0, 5).map(w => (
                 <div key={w.id} className="nb-card" style={{ padding: "12px 16px", background: "#FFF" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 900, color: "var(--nb-red)", textTransform: "uppercase" }}>
                          {new Date(w.completed_at!).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 800 }}>{w.target_description || "Corrida Registrada"}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 14, fontWeight: 900 }}>{w.actual_distance_km} KM</div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#666" }}>{formatPace(w.actual_pace_seconds_per_km)}/km</div>
                      </div>
                    </div>
                 </div>
              ))}
              {historyData.workouts.length > 5 && (
                <p style={{ fontSize: 10, textAlign: "center", fontWeight: 700, color: "#999", marginTop: 8 }}>
                  Mostrando as últimas 5 corridas.
                </p>
              )}
            </div>
          </div>
        )}

      </main>

      <BottomNav />
    </div>
  );
}

import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import StudentHeader from "@/components/StudentHeader";
import BottomNav from "@/components/BottomNav";
import ActivityDashboard from "./ActivityDashboard";

export const metadata: Metadata = {
  title: "Minhas Atividades",
};

/**
 * Página de Atividade (Timeline) do Aluno.
 *
 * @security
 * - Unauthenticated users are redirected to `/login`.
 * - Data is fetched server-side using the authenticated session.
 *
 * @param {Object} props - Component props containing searchParams.
 * @returns {Promise<JSX.Element>} Rendered page with the Activity Timeline.
 */
export default async function TreinosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, full_name")
    .eq("id", user.id)
    .single();

  const displayName = profile?.display_name || profile?.full_name || "Atleta";

  // Mock WOD history – will be replaced by real data from `wods` table
  const wodHistory = [
    {
      id: "1",
      date: new Date().toISOString(), // Hoje
      tag: "AMRAP",
      title: "Hell's Kitchen #47",
      description: "Amrap 12' - 10 Burpees, 15 Wall Balls, 20 Double Unders",
      result: "Score: 4 rounds + 12 reps",
      score: "4+12",
      coach_name: "Marcos",
      is_pr: false,
      xp_earned: 50,
    },
    {
      id: "2",
      date: new Date(Date.now() - 86400000).toISOString(), // Ontem
      tag: "Força",
      title: "Back Squat 5x5",
      description: "Trabalho de força, 85% do PR. 5 séries de 5 repetições.",
      result: "Carga Final: 120kg",
      score: "120kg",
      coach_name: "Sarah",
      is_pr: true,
      xp_earned: 75,
    },
    {
      id: "3",
      date: "2026-03-24T10:00:00Z",
      tag: "LPO",
      title: "Snatch Complex",
      description: "1 Squat Snatch + 2 Hang Power Snatch (Every 2 mins for 10 mins)",
      result: "Carga Máxima: 80kg",
      score: "80kg",
      coach_name: "Tiago",
      is_pr: false,
      xp_earned: 60,
    },
    {
      id: "4",
      date: "2026-03-22T15:00:00Z",
      tag: "Gymnastics",
      title: "Hero WOD 'Murph'",
      description: "Treino em homenagem ao tenente Michael P. Murphy. (Com Colete 10kg)",
      result: "Tempo: 38:45 min",
      score: "38:45",
      coach_name: "Lukas",
      is_pr: true,
      xp_earned: 150,
    },
    {
      id: "5",
      date: "2026-03-21T09:30:00Z",
      tag: "Skill",
      title: "Bar Muscle Up Clinical",
      description: "Trabalho técnico de transição e eficiência no kipping.",
      result: "Progresso: 3 unbroken",
      score: "3 Unbroken",
      coach_name: "Marcos",
      is_pr: false,
      xp_earned: 30,
    },
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--bg)",
        color: "var(--text)",
        paddingBottom: "100px",
      }}
    >
      <StudentHeader />

      {/* ── MAIN CONTENT ── */}
      <main
        style={{
          maxWidth: "480px",
          margin: "0 auto",
          padding: "0 20px",
        }}
      >
        {/* Page Title */}
        <div style={{ paddingTop: "28px", paddingBottom: "24px" }}>
          <p
            style={{
              fontSize: "10px",
              fontWeight: 700,
              letterSpacing: "0.35em",
              color: "var(--text-muted)",
              textTransform: "uppercase",
              marginBottom: "6px",
            }}
          >
            {displayName.toUpperCase()}
          </p>
          <h1
            className="font-display"
            style={{
              fontSize: "clamp(26px, 6vw, 32px)",
              lineHeight: 1,
            }}
          >
            Atividade
          </h1>
          <p
            style={{
              fontSize: "12px",
              color: "var(--text-muted)",
              marginTop: "4px",
              letterSpacing: "0.1em",
              textTransform: "uppercase"
            }}
          >
            Sua Timeline no Coliseu
          </p>
        </div>

        <ActivityDashboard 
          history={wodHistory.map(wod => ({
            id: wod.id,
            date: new Date(wod.date).toLocaleDateString("pt-BR", { day: '2-digit', month: 'short' }).toUpperCase(),
            title: wod.title,
            description: wod.description,
            typeTag: wod.tag,
            coach: wod.coach_name,
            xp: wod.xp_earned,
            result: wod.result,
            isExcellence: wod.is_pr,
            metrics: [
              { label: "XP", value: wod.xp_earned, unit: "pts" },
              { label: "SESSÃO", value: "60", unit: "min" }
            ],
            achievements: wod.is_pr ? [{ id: `pr-${wod.id}`, type: "pr", icon: "star", color: "red" }] : []
          }))} 
        />

        {/* Empty state hint */}
        <p
          style={{
            textAlign: "center",
            marginTop: "32px",
            fontSize: "9px",
            fontWeight: 700,
            letterSpacing: "0.2em",
            color: "var(--text-muted)",
            opacity: 0.3,
            textTransform: "uppercase",
          }}
        >
          ● Histórico Sincronizado via WOD Engine
        </p>
      </main>

      <BottomNav />
    </div>
  );
}

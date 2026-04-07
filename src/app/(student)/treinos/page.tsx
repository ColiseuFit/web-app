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
 * Página de Atividade (Timeline) do Atleta.
 * 
 * @architecture
 * - SSoT de Histórico: Agrega `check_ins` com seus respectivos `wods` (Relational Join hydration).
 * - Algoritmo de Score: Mapeia status `confirmed` para 50 pontos (SSoT operacional).
 * - UTC Persistence: Transforma `wod.date` em objetos Date UTC para garantir que o dia de treino não mude entre fusos.
 * 
 * @security
 * - RBAC: Sessão validada no servidor; RLS garante que o aluno veja apenas sua própria timeline.
 * - Integrity Check: Filtra `status != 'missed'` para manter o foco em treinos realizados/pendentes.
 * 
 * @technical
 * - UI: Utiliza `ActivityDashboard` para renderização de cards em lista virtual (Neo-Brutalist Light).
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

  const { data: checkins } = await supabase
    .from("check_ins")
    .select(`
      id,
      created_at,
      status,
      result,
      is_excellence,
      wods (
        id,
        title,
        wod_content,
        type_tag,
        date,
        time_cap,
        tags,
        result_type
      )
    `)
    .eq("student_id", user.id)
    .neq("status", "missed")
    .order("created_at", { ascending: false });

  // Map database results to the Timeline props
  const realHistory = (checkins || []).map((checkin: any) => {
    const wod = checkin.wods;
    if (!wod) return null;
    
    /**
     * NORMALIZAÇÃO DE DATA (UTC SSoT)
     * @logic Concatena `T00:00:00Z` para forçar o interpretador a tratar como UTC puro, 
     * evitando o shift de 1 dia comum em timezones negativos (ex: BRT).
     */
    const wodDate = new Date(wod.date + "T00:00:00Z");
    const formattedDate = !isNaN(wodDate.getTime()) 
      ? wodDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", timeZone: "UTC" }).toUpperCase()
      : "DATA";

    return {
      id: checkin.id,
      date: formattedDate,
      isoDate: wod.date,
      title: wod.title || "Treino do Dia",
      description: wod.wod_content ? wod.wod_content.slice(0, 100) + (wod.wod_content.length > 100 ? "..." : "") : "Treino programado pelo coach.",
      rawContent: wod.wod_content || "",
      typeTag: wod.type_tag || "WOD",
      resultType: wod.result_type || "reps",
      coach: "Coliseu",
      points: checkin.status === 'confirmed' ? 50 : 0,
      result: checkin.result || null,
      status: checkin.status,
      tags: wod.tags || [],
      isExcellence: !!checkin.is_excellence,
      metrics: [
        { label: "TIME CAP", value: wod.time_cap ? String(wod.time_cap) : "--", unit: "min" },
        { label: "PONTOS", value: checkin.status === 'confirmed' ? "50" : "0", unit: "pts" }
      ],
      achievements: []
    };
  }).filter(Boolean);

  const wodHistory = realHistory;

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

        {/* Activity Dashboard & Sync Badge */}
        <ActivityDashboard history={wodHistory as any} />

      </main>

      <BottomNav />
    </div>
  );
}

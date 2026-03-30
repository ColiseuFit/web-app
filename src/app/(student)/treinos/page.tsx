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

  const { data: checkins } = await supabase
    .from("check_ins")
    .select(`
      id,
      created_at,
      wods (
        id,
        title,
        wod_content,
        type_tag,
        date,
        time_cap
      )
    `)
    .eq("student_id", user.id)
    .order("created_at", { ascending: false });

  // Map database results to the Timeline props
  const wodHistory = (checkins || []).map((checkin: any) => {
    const wod = checkin.wods;
    if (!wod) return null;
    
    // Convert to Date to format correctly
    const wodDate = new Date(wod.date + "T00:00:00Z");
    const formattedDate = !isNaN(wodDate.getTime()) 
      ? wodDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).toUpperCase()
      : "DATA";

    return {
      id: checkin.id,
      date: formattedDate,
      title: wod.title || "Treino do Dia",
      description: wod.wod_content ? wod.wod_content.slice(0, 100) + (wod.wod_content.length > 100 ? "..." : "") : "Treino programado pelo coach.",
      typeTag: wod.type_tag || "WOD",
      coach: "Coliseu",
      xp: 50, // XP base por check-in (sistema futuro)
      result: "Realizado",
      isExcellence: false,
      metrics: [
        { label: "TIME CAP", value: wod.time_cap ? String(wod.time_cap) : "--", unit: "min" },
        { label: "XP", value: "50", unit: "pts" }
      ],
      achievements: []
    };
  }).filter(Boolean);

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

        {/* Dynamic Empty State & Sync Badge */}
        {wodHistory.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
             <p style={{ fontSize: "14px", fontWeight: 800, color: "var(--text)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
               Nenhuma atividade registrada
             </p>
             <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
               Seu histórico de treinos aparecerá aqui após o primeiro check-in.
             </p>
          </div>
        ) : (
          <ActivityDashboard history={wodHistory as any} />
        )}

        {/* ── SYNC FOOTER ── */}
        <div 
          style={{ 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center", 
            gap: "10px", 
            marginTop: "60px",
            paddingBottom: "20px"
          }}
        >
          {/* Pulsing Sync Indicator */}
          <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ 
              width: "6px", 
              height: "6px", 
              background: "#00FF41", 
              borderRadius: "50%",
              boxShadow: "0 0 10px rgba(0, 255, 65, 0.5)"
            }} />
            <div style={{ 
              position: "absolute",
              width: "12px", 
              height: "12px", 
              border: "1px solid #00FF41", 
              borderRadius: "50%",
              animation: "pulse-sync 2s infinite cubic-bezier(0.4, 0, 0.6, 1)"
            }} />
          </div>

          <p
            style={{
              fontSize: "10px",
              fontWeight: 800,
              letterSpacing: "0.2em",
              color: "var(--text-muted)",
              textTransform: "uppercase",
              opacity: 0.6
            }}
          >
            Conexão Ativa • WOD Engine Sync
          </p>

          <style dangerouslySetInnerHTML={{ __html: `
            @keyframes pulse-sync {
              0% { transform: scale(0.8); opacity: 0.8; }
              100% { transform: scale(2.5); opacity: 0; }
            }
          `}} />
        </div>
      </main>

      <BottomNav />
    </div>
  );
}

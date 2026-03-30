import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import StudentHeader from "@/components/StudentHeader";
import BottomNav from "@/components/BottomNav";
import DashboardStyles from "@/components/DashboardStyles";
import ProgressDashboardClient from "@/components/progress/ProgressDashboardClient";
import RecentPRs from "@/components/progress/RecentPRs";

export const metadata: Metadata = {
  title: "Meu Progresso",
};

/**
 * Página de Progresso e Metas
 * Centraliza o Monitor de Compromisso, Recordes (PRs) e Objetivos Técnicos.
 */
export default async function ProgressPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // 1. Data Fetching
  const now = new Date();
  const dayOfWeek = now.getUTCDay();
  const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(now.getTime() - diffToMonday * 86400000);
  monday.setUTCHours(0, 0, 0, 0);

  const [
    { data: profile },
    { data: settings },
    { data: checkIns },
    { data: prs },
    { data: goals }
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("student_settings").select("*").eq("student_id", user.id).maybeSingle(),
    supabase.from("check_ins").select("id").eq("student_id", user.id).gte("created_at", monday.toISOString()),
    supabase.from("personal_records").select("*").eq("student_id", user.id).order("date", { ascending: false }),
    supabase.from("student_goals").select("*").eq("student_id", user.id).order("created_at", { ascending: true })
  ]);

  const currentCheckIns = checkIns?.length || 0;
  const targetFrequency = settings?.weekly_frequency_target || 3;

  const levelMap: Record<string, string> = {
    branco: "L1",
    verde: "L2",
    azul: "L3",
    vermelho: "L4",
    rx: "L4",
    preto: "L5",
    elite: "L5"
  };

  const studentLevelMapped = profile?.level ? levelMap[profile.level] || "L1" : "L1";

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg)", color: "var(--text)", paddingBottom: "100px", position: "relative" }}>
      <DashboardStyles />
      
      {/* Background Glow */}
      <div style={{ 
        position: "fixed", top: "-20%", left: "50%", transform: "translateX(-50%)", 
        width: "100vw", height: "60vh", 
        background: "radial-gradient(ellipse, rgba(227,27,35,0.05) 0%, transparent 70%)", 
        filter: "blur(80px)", zIndex: 0, pointerEvents: "none" 
      }} />

      <StudentHeader />

      <main style={{ maxWidth: "480px", margin: "0 auto", position: "relative" }}>
        
        {/* BOAS-VINDAS / TÍTULO (IRON MONOLITH BRANDING) */}
        <section style={{ padding: "24px 20px 32px" }}>
          <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.35em", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "4px" }}>
            {(profile?.display_name || "ATLETA").toUpperCase()}
          </p>
          <h1 className="font-display" style={{ fontSize: "clamp(26px, 6vw, 32px)", lineHeight: 1, textTransform: "uppercase" }}>
            PROGRESSO
          </h1>
          <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px", letterSpacing: "0.1em" }}>
            MONITOR DE EVOLUÇÃO TÉCNICA
          </p>
        </section>

        {/* ── RECORDES RECENTES (DESTAQUE) ── */}
        <RecentPRs prs={(prs?.slice(0, 4) || []) as any[]} hideViewAll={true} />

        {/* SEÇÃO PRINCIPAL INTERATIVA (CLIENT WRAPPER) */}
        <ProgressDashboardClient 
          studentName={profile?.display_name || "ATLETA"}
          initialPrs={prs || []}
          initialGoals={goals || []}
          currentCheckIns={currentCheckIns}
          targetFrequency={targetFrequency}
          studentLevel={studentLevelMapped}
        />

      </main>

      <BottomNav />
    </div>
  );
}

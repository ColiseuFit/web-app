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

import { getTodayDate } from "@/lib/date-utils";

/**
 * Página de Progresso e Metas
 * Centraliza o Monitor de Compromisso, Recordes (PRs) e Objetivos Técnicos.
 * 
 * @security
 * - Sessão validada no servidor.
 * - RLS ativo para tabelas `personal_records`, `student_settings` e `student_goals`.
 * 
 * @technical
 * - Time Logic: Calcula o início da semana (Segunda-feira) em UTC para o monitor de frequência.
 * - Data Composition: Agrega dados de 5 tabelas diferentes via `Promise.all` para renderização atômica.
 * - Interactive: Delega interatividade (PRs, Metas) para o `ProgressDashboardClient`.
 * 
 * @returns {Promise<JSX.Element>} Dashboard de progresso técnico do atleta.
 */
export default async function ProgressPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // 1. Data Fetching
  const todayStr = getTodayDate();
  const todayMs = new Date(todayStr + "T00:00:00Z");
  const dayOfWeek = todayMs.getUTCDay();
  const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(todayMs.getTime() - diffToMonday * 86400000);

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
    <div style={{ minHeight: "100vh", backgroundColor: "#FFF", color: "#000", paddingBottom: "120px", position: "relative" }}>
      <DashboardStyles />
      
      <StudentHeader />

      <main style={{ maxWidth: "480px", margin: "0 auto", position: "relative" }}>
        
        {/* BOAS-VINDAS / TÍTULO (ATHLETIC BRANDING) */}
        <section style={{ padding: "32px 20px 24px" }}>
          <p className="font-headline" style={{ fontSize: "10px", fontWeight: 900, letterSpacing: "0.2em", color: "rgba(0,0,0,0.5)", textTransform: "uppercase", marginBottom: "4px" }}>
            {(profile?.display_name || "ATLETA").toUpperCase()}
          </p>
          <h1 className="font-display" style={{ fontSize: "42px", lineHeight: 0.9, textTransform: "uppercase", fontWeight: 900, letterSpacing: "-0.03em" }}>
            MEU<br />PROGRESSO
          </h1>
          <div style={{ width: "40px", height: "4px", background: "#000", marginTop: "16px" }}></div>
        </section>

        {/* ── RECORDES RECENTES (DESTAQUE) ── */}
        <div style={{ padding: "0 20px", marginBottom: "32px" }}>
           <RecentPRs prs={(prs?.slice(0, 4) || []) as any[]} hideViewAll={true} />
        </div>

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

import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import StudentHeader from "@/components/StudentHeader";
import BottomNav from "@/components/BottomNav";
import DashboardStyles from "@/components/DashboardStyles";
import ProgressDashboardClient from "@/components/progress/ProgressDashboardClient";
import { getWeekDates } from "@/lib/date-utils";
import { Target } from "lucide-react";

/**
 * Progresso Page
 * 
 * Dashboard de evolução técnica e métricas de performance.
 * 
 * @architecture
 * - Padrão Neo-Brutalist Light (Monolito de Ferro).
 * - Hidratação em Paralelo: Busca PRs, Metas e Frequência simultaneamente.
 * - SSoT: Centraliza a verdade do progresso do aluno via Supabase.
 */
export const metadata: Metadata = {
  title: "Meu Progresso",
};

export default async function ProgressPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // 1. Definição do Período Atual (Semana de Treino)
  const currentWeekDates = getWeekDates(0);

  // 2. Busca de Dados em Paralelo (Performance Sênior)
  const [
    { data: profile },
    { data: prs },
    { data: goals },
    { data: settings },
    { data: weeklyCheckIns }
  ] = await Promise.all([
    supabase.from("profiles").select("full_name, display_name, level").eq("id", user.id).single(),
    // Buscamos PRs do aluno - A query mapeia movement_id para movement_key conforme interface do Client
    supabase.from("personal_records").select("*").eq("student_id", user.id).order("date", { ascending: false }),
    supabase.from("student_goals").select("*").eq("student_id", user.id).order("created_at", { ascending: true }),
    supabase.from("student_settings").select("weekly_frequency_target").eq("student_id", user.id).maybeSingle(),
    // Contagem de check-ins na semana atual (SSoT join com wods)
    supabase.from("check_ins")
      .select("id, wods!inner(date)")
      .eq("student_id", user.id)
      .neq("status", "missed")
      .neq("status", "cancelled")
      .in("wods.date", currentWeekDates)
  ]);

  // 3. Normalização de Dados para o Cliente
  const mappedPrs = (prs || []).map((pr: any) => ({
    ...pr,
    movement_key: pr.movement_id // Adaptando movement_id do DB para movement_key esperado no componente
  }));

  const studentName = profile?.display_name || profile?.full_name || "Atleta";
  const targetFrequency = settings?.weekly_frequency_target || 3; // Default 3x/semana
  const currentCheckInsCount = weeklyCheckIns?.length || 0;

  return (
    <>
      <DashboardStyles />
      {/* BACKGROUND LIGHT */}
      <div 
        style={{ 
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0, 
          zIndex: -1, background: "#FFF" 
        }} 
      />

      <StudentHeader />

      <main className="animate-in" style={{ 
        maxWidth: "500px", margin: "0 auto", padding: "0 0 120px", 
      }}>
        
        {/* ── HEADER DE IMPACTO ── */}
        <section style={{ paddingTop: "32px", paddingBottom: "32px", textAlign: "center", paddingLeft: "20px", paddingRight: "20px" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "#E31B23", color: "white", padding: "4px 12px", border: "2px solid #000", boxShadow: "4px 4px 0px #000", marginBottom: "16px" }}>
            <Target size={14} strokeWidth={3} />
            <span style={{ fontSize: "10px", fontWeight: 900, letterSpacing: "0.2em" }}>METAS E RECORDES</span>
          </div>
          <h1 className="font-display" style={{ fontSize: "48px", fontWeight: 950, lineHeight: 0.8, textTransform: "uppercase", letterSpacing: "-0.04em", margin: 0 }}>
             MEU<br/>PROGRESSO
          </h1>
          <p className="font-headline" style={{ fontSize: "12px", fontWeight: 800, color: "#000", marginTop: "12px", letterSpacing: "0.15em", textTransform: "uppercase", opacity: 0.6 }}>
            ACOMPANHE SUA EVOLUÇÃO
          </p>
        </section>

        {/* ── INTERATIVIDADE DO PROGRESSO ── */}
        <ProgressDashboardClient 
          initialPrs={mappedPrs}
          initialGoals={goals || []}
          studentName={studentName}
          targetFrequency={targetFrequency}
          currentCheckIns={currentCheckInsCount}
          studentLevel={profile?.level}
        />

      </main>

      <BottomNav />
    </>
  );
}

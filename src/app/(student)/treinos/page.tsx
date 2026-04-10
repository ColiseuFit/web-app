import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import StudentHeader from "@/components/StudentHeader";
import BottomNav from "@/components/BottomNav";
import ActivityDashboard from "./ActivityDashboard";
import { getBoxSettings } from "@/lib/constants/settings_actions";

export const metadata: Metadata = {
  title: "Minhas Atividades",
};

/**
 * Página de Atividade (Timeline) do Atleta.
 */
export default async function TreinosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // SSoT: Checagem de Perfil e Configurações
  const [
    { data: profile },
    boxSettings
  ] = await Promise.all([
    supabase.from("profiles").select("display_name, full_name, level, membership_type").eq("id", user.id).single(),
    getBoxSettings()
  ]);

  const displayName = profile?.display_name || profile?.full_name || "Atleta";
  const studentProfileLevel = profile?.level || "iniciante";
  const isClubPass = profile?.membership_type === 'club_pass';

  // Link de Upgrade (WhatsApp)
  const rawWhatsApp = boxSettings?.box_whatsapp || "";
  const whatsappNumber = rawWhatsApp.replace(/\D/g, "");
  const upgradeLink = whatsappNumber
    ? `https://wa.me/55${whatsappNumber}?text=${encodeURIComponent("Olá! Gostaria de saber mais sobre como fazer o upgrade para o Plano Clube Premium.")}`
    : null;

  /**
   * (...) RESTO DO CÓDIGO DE FETCH (CHECOINS, WODS) PERMANECE IGUAL
   */

  // 2. Fetch point rule for check_in (SSoT)
  const { data: pointRule } = await supabase
    .from("points_rules")
    .select("points")
    .eq("key", "check_in")
    .single();
  
  const rulePoints = pointRule?.points ?? 10;

  // 3. Fetch check-ins with extended relational hydration
  const { data: checkins, error: checkinsError } = await supabase
    .from("check_ins")
    .select(`
      id,
      created_at,
      status,
      result,
      performance_level,
      score_points,
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
      ),
      class_slots (
        time_start,
        coach_name,
        profiles:default_coach_id (
          display_name,
          full_name,
          first_name
        ),
        class_sessions (
          date,
          profiles:coach_id (
            display_name,
            full_name,
            first_name
          )
        )
      )
    `)
    .eq("student_id", user.id)
    .neq("status", "missed")
    .order("created_at", { ascending: false })
    .limit(10);

  if (checkinsError) {
    console.error("Error fetching checkins:", checkinsError);
  }

  // Map database results to the Timeline props
  const realHistory = (checkins || []).map((checkin: any) => {
    /**
     * NORMALIZAÇÃO DE RELACIONAMENTO (Supabase Array vs Object)
     */
    const wod = Array.isArray(checkin.wods) ? checkin.wods[0] : checkin.wods;
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

    // 1. RESOLUÇÃO DO COACH (SSoT Hierarchy)
    // Buscamos se houve uma sessão finalizada para este slot nesta data específica (Substitutos).
    const sessionForDay = checkin.class_slots?.class_sessions?.find(
      (s: any) => s.date === wod.date
    );

    // Helper para resolver o nome do perfil (display_name > full_name > first_name)
    const resolveName = (profile: any) => {
      if (!profile) return null;
      return profile.display_name || profile.full_name || profile.first_name || null;
    };

    const coachName = resolveName(checkin.class_slots?.profiles)
      || checkin.class_slots?.coach_name 
      || resolveName(sessionForDay?.profiles)
      || "Equipe Coliseu";

    // 2. CONSTRUÇÃO DE PONTOS (SSoT vs Expected)
    const displayPoints = checkin.score_points > 0 
      ? checkin.score_points 
      : (checkin.status === "confirmed" ? rulePoints : 0);
    
    // 3. CONSTRUÇÃO DE MÉTRICAS (Refined SSoT)
    const metrics: any[] = [];

    // Time Cap
    if (wod.time_cap && String(wod.time_cap).trim() !== "" && String(wod.time_cap) !== "0") {
      metrics.push({ 
        label: "TIME CAP", 
        value: String(wod.time_cap).replace(/ min/i, ""), 
        unit: "min" 
      });
    }

    return {
      id: checkin.id,
      date: formattedDate,
      isoDate: wod.date,
      title: wod.title || "Treino do Dia",
      description: wod.wod_content ? wod.wod_content.slice(0, 100) + (wod.wod_content.length > 100 ? "..." : "") : "Treino programado pelo coach.",
      rawContent: wod.wod_content || "",
      typeTag: wod.type_tag || "WOD",
      resultType: wod.result_type || "reps",
      coach: coachName,
      points: displayPoints,
      result: checkin.result || null,
      performanceLevel: checkin.performance_level || null,
      studentLevel: studentProfileLevel,
      status: checkin.status,
      time: checkin.class_slots?.time_start ? String(checkin.class_slots.time_start).slice(0, 5) : null,
      tags: wod.tags || [],
      isExcellence: !!checkin.is_excellence,
      metrics: metrics,
      achievements: []
    };
  }).filter((item): item is NonNullable<typeof item> => item !== null);

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
        <ActivityDashboard 
          history={wodHistory as any} 
          isClubPass={isClubPass}
          upgradeLink={upgradeLink}
        />

      </main>

      <BottomNav />
    </div>
  );
}

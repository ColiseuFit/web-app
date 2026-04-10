import { createClient } from "@/lib/supabase/server";
import GamificacaoClient from "./GamificacaoClient";
import { getCachedLevels } from "@/lib/constants/levels_actions";
import { getPointsRules } from "@/lib/constants/settings_actions";

/**
 * Gamificação Page (Server Component): Painel de Controle de Engajamento
 * 
 * @architecture
 * - Orquestra a busca dos alunos, regras de pontos e níveis técnicos.
 * - Desacopla as configurações do "Settings" para focar numa visão direcionada a retenção de alunos.
 */
export default async function GamificacaoPage() {
  const supabase = await createClient();

  // 1. Get Admin/Coach IDs to exclude from student list
  const { data: staffRoles } = await supabase
    .from("user_roles")
    .select("user_id")
    .in("role", ["admin", "coach"]);
  const staffIds = (staffRoles || []).map((r: any) => r.user_id);

  // 2. Build Query (same pattern as AlunosPage)
  let query = supabase
    .from("profiles")
    .select("id, full_name, display_name, avatar_url, points_balance, points_total, level, member_number");

  if (staffIds.length > 0) {
    query = query.not("id", "in", `(${staffIds.join(",")})`);
  }

  const [
    { data: profilesRes, error: profilesError },
    dynamicLevels,
    initialRules
  ] = await Promise.all([
    query
      .order("full_name", { ascending: true })
      .limit(500),
    getCachedLevels(),
    getPointsRules()
  ]);

  if (profilesError) {
    console.error("[GamificacaoPage] Erro ao buscar perfis:", profilesError.message);
  }

  const students = (profilesRes ?? []).map((p: any) => ({
    id: p.id,
    full_name: p.full_name || "Sem Nome",
    display_name: p.display_name,
    avatar_url: p.avatar_url,
    points: p.points_balance ?? 0,
    points_total: p.points_total ?? 0,
    level: p.level ?? "iniciante",
    member_number: p.member_number
  }));

  return (
    <div className="admin-container-fluid">
      {/* ── PAGE HEADER ── */}
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "32px", fontWeight: 900, letterSpacing: "-0.04em", margin: "0 0 4px", textTransform: "uppercase" }}>
          Gamificação & Progressão
        </h1>
        <p style={{ fontSize: "14px", color: "#666", fontWeight: 600, margin: 0, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Gerenciamento de Pontos, Níveis e Regras do App
        </p>
      </div>

      <GamificacaoClient 
        students={students} 
        dynamicLevels={dynamicLevels}
        initialRules={initialRules}
      />
    </div>
  );
}

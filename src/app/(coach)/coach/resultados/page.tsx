import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { USER_ROLES } from "@/lib/constants/roles";
import { getCachedLevels } from "@/lib/constants/levels_actions";
import { getTodayDate } from "@/lib/date-utils";
import { getCoachResults } from "./actions";
import CoachResultadosClient from "./CoachResultadosClient";

/**
 * Coach Results Page (Server Component).
 *
 * @architecture
 * - Camada de Hidratação: Busca todos os resultados dos alunos server-side e os
 *   passa hidratados ao Client Component para filtragem rápida no navegador.
 * - Segurança: RBAC é verificado antes de qualquer busca de dados.
 * - Levels SSoT: Recupera níveis dinâmicos do DB para renderização precisa dos badges.
 * - Otimização de Volume: Filtra por intervalo de datas (padrão: Hoje) para evitar listas gigantescas.
 *
 * @lifecycle
 * 1. Valida autenticação e role do usuário.
 * 2. Resolve `searchParams` para determinar o intervalo de datas focal.
 * 3. Busca níveis dinâmicos do admin DB.
 * 4. Busca os resultados dos alunos filtrados pelo período (limite de 500 registros).
 * 5. Hidrata o Client Component com os dados.
 */
export default async function CoachResultadosPage({
  searchParams,
}: {
  searchParams: Promise<{ dateFrom?: string; dateTo?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/coach-portal");
  }

  // RBAC Gate: Coach, Admin, or Reception only
  const isAdminEmail = user.email === "admin@coliseufit.com";
  if (!isAdminEmail) {
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (
      !roleData ||
      (roleData.role !== USER_ROLES.ADMIN &&
        roleData.role !== USER_ROLES.COACH &&
        roleData.role !== USER_ROLES.RECEPTION)
    ) {
      redirect("/coach-portal?error=unauthorized");
    }
  }

  // Resolve active dates (default: Today)
  const params = await searchParams;
  const today = getTodayDate();
  const dateFrom = params.dateFrom || today;
  const dateTo = params.dateTo || today;

  // Fetch dynamic levels and results in parallel
  const [dynamicLevels, resultsResponse] = await Promise.all([
    getCachedLevels(),
    getCoachResults({ dateFrom, dateTo }),
  ]);

  if (!resultsResponse.success) {
    return (
      <div style={{ textAlign: "center", padding: "40px 20px" }}>
        <p style={{ fontSize: "14px", fontWeight: 600, color: "#E52521" }}>
          Erro ao buscar resultados: {resultsResponse.error}
        </p>
      </div>
    );
  }

  return (
    <CoachResultadosClient
      initialGroups={resultsResponse.groups}
      dynamicLevels={dynamicLevels}
      initialDateFrom={dateFrom}
      initialDateTo={dateTo}
    />
  );
}

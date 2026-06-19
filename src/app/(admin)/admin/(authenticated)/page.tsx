import { createClient } from "@/lib/supabase/server";
import AdminDashboardClient from "./AdminDashboardClient"; 
import { USER_ROLES } from "@/lib/constants/roles";
import { getCachedLevels } from "@/lib/constants/levels_actions";

/**
 * @component AdminDashboardPage (Server Component)
 * @description
 * Atua como o "Router Dispatcher" (Orquestrador de Roteamento) do Admin.
 * Em vez de exibir um único dashboard, ele lê o parâmetro de URL `?hub=...`
 * injetado pelo `AdminSidebar.tsx` e decide qual Client Component renderizar
 * (Operacional, Tático ou Estratégico).
 *
 * @data
 * Caso o Hub seja "Tático" (default), ele executa requisições pesadas no Supabase
 * (agregando métricas de todos os alunos) e desce os dados via Props para 
 * o `AdminDashboardClient` puro, blindando o cliente de lógica de RLS.
 */
export default async function AdminDashboardPage({ searchParams }: { searchParams: Promise<{ hub?: string }> }) {
  const resolvedSearchParams = await searchParams;
  const hub = resolvedSearchParams?.hub || "operacional";

  if (hub === "estrategico") {
    const { default: DashboardEstrategicoClient } = await import("./DashboardEstrategicoClient");
    return <DashboardEstrategicoClient />;
  }

  if (hub === "operacional") {
    const { default: DashboardOperacionalClient } = await import("./DashboardOperacionalClient");
    return <DashboardOperacionalClient />;
  }

  // Tático / default
  const supabase = await createClient();

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  // Parallel data fetching for maximum speed
  const [profilesRes, checkinsRes, dynamicLevels] = await Promise.all([
    supabase.from("profiles").select("id, full_name, display_name, level, created_at, avatar_url, phone, user_roles(role)", { count: "exact" }),
    supabase.from("check_ins").select("student_id, created_at", { count: "exact" }).gte("created_at", todayStart),
    getCachedLevels(),
  ]);

  // Consider as students everyone WHO IS NOT an admin or coach
  // This is legacy-proof for users without an explicit role yet
  const allProfilesWithRoles = profilesRes.data ?? [];
  const studentsOnly = allProfilesWithRoles.filter((p: any) => {
    const role = p.user_roles?.role;
    return role !== USER_ROLES.ADMIN && role !== USER_ROLES.COACH && role !== USER_ROLES.RECEPTION;
  });

  const totalStudents = studentsOnly.length;
  const todayCheckins = checkinsRes.count ?? 0;

  // Recent signups this month (filtered for students only)
  const newThisMonth = studentsOnly.filter((p: any) => p.created_at >= monthStart).length;

  // Calculate "at risk" — students who haven't checked in for 7 days
  const allProfiles = studentsOnly;
  const todayCheckinStudents = new Set((checkinsRes.data ?? []).map((c: { student_id: string }) => c.student_id));

  const stats = [
    {
      label: "Total Alunos",
      value: totalStudents,
      icon: "users",
      color: "#111",
    },
    {
      label: "Check-ins Hoje",
      value: todayCheckins,
      icon: "check",
      color: "#16A34A",
    },
    {
      label: "Novos Este Mês",
      value: newThisMonth,
      icon: "trending",
      color: "#2563EB",
    },
  ];

  // Prepare recent students list for the client component
  const recentStudents = allProfiles
    .sort((a: { created_at: string }, b: { created_at: string }) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    .slice(0, 8)
    .map((p: any) => ({
      id: p.id,
      name: p.display_name,
      full_name: p.full_name,
      avatar_url: p.avatar_url,
      level: p.level,
      created_at: p.created_at,
      phone: p.phone,
      checked_in_today: todayCheckinStudents.has(p.id),
    }));

  return (
    <AdminDashboardClient
      stats={stats}
      recentStudents={recentStudents}
      totalStudents={totalStudents}
      dynamicLevels={dynamicLevels}
    />
  );
}

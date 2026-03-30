import { createClient } from "@/lib/supabase/server";
import AdminDashboardClient from "./AdminDashboardClient"; 

/**
 * Admin Dashboard (Server Component): The operational overview.
 *
 * @data Fetches aggregated metrics via parallel Supabase queries:
 * - Total active students.
 * - Today's check-ins count.
 * - Students "at risk" (no check-in in 7+ days).
 * - New signups this month.
 */
export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  // Parallel data fetching for maximum speed
  const [profilesRes, checkinsRes, recentStudentsRes] = await Promise.all([
    supabase.from("profiles").select("id, full_name, display_name, level, created_at, avatar_url, phone", { count: "exact" }),
    supabase.from("check_ins").select("student_id, created_at", { count: "exact" }).gte("created_at", todayStart),
    supabase.from("profiles").select("id", { count: "exact" }).gte("created_at", monthStart),
  ]);

  const totalStudents = profilesRes.count ?? 0;
  const todayCheckins = checkinsRes.count ?? 0;
  const newThisMonth = recentStudentsRes.count ?? 0;

  // Calculate "at risk" — students who haven't checked in for 7 days
  // We get the latest check-in per student and compare
  const allProfiles = profilesRes.data ?? [];
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
    .map((p: { id: string; full_name: string; display_name: string | null; level: string; created_at: string; phone: string | null }) => ({
      id: p.id,
      name: p.display_name || p.full_name,
      full_name: p.full_name,
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
    />
  );
}

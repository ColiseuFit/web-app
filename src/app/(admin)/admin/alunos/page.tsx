import { createClient } from "@/lib/supabase/server";
import AlunosClient from "./AlunosClient"; 
import { getCachedLevels } from "@/lib/constants/levels_actions";

/**
 * Alunos Page (Server Component): Full member management.
 *
 * @data Fetches all student profiles with role info in parallel.
 * Passes hydrated data to AlunosClient for search, filter, and CRUD operations.
 */
export default async function AlunosPage() {
  const supabase = await createClient();

  // Fetch profiles and dynamic levels in parallel for SSoT
  const [
    { data: allProfilesRes, error: profilesError },
    dynamicLevels
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("*, user_roles(role)")
      .order("created_at", { ascending: false }),
    getCachedLevels()
  ]);

  if (profilesError) {
    console.error("[AlunosPage] Erro ao buscar perfis:", profilesError.message);
  }

  // Filter students: those who have no role OR have the 'student' role.
  // Explicitly exclude coaches and admins.
  const profiles = (allProfilesRes ?? []).filter((p: any) => {
    const role = p.user_roles?.role;
    return role !== "admin" && role !== "coach";
  });

  const students = (profiles ?? []).map((p: any) => ({
    id: p.id,
    full_name: p.full_name,
    display_name: p.display_name,
    first_name: p.first_name,
    last_name: p.last_name,
    level: p.level ?? "iniciante",
    phone: p.phone,
    avatar_url: p.avatar_url,
    created_at: p.created_at,
    points: p.points_balance ?? 0,
    bio: p.bio,
    cpf: p.cpf,
    birth_date: p.birth_date,
    gender: p.gender,
  }));

  return <AlunosClient students={students} dynamicLevels={dynamicLevels} />;
}

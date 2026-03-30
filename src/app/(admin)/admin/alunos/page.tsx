import { createClient } from "@/lib/supabase/server";
import AlunosClient from "./AlunosClient"; 

/**
 * Alunos Page (Server Component): Full member management.
 *
 * @data Fetches all student profiles with role info in parallel.
 * Passes hydrated data to AlunosClient for search, filter, and CRUD operations.
 */
export default async function AlunosPage() {
  const supabase = await createClient();

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, full_name, display_name, first_name, last_name, level, phone, avatar_url, created_at, xp_balance, bio, cpf, birth_date, gender")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[AlunosPage] Erro ao buscar perfis:", error);
  }

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
    xp: p.xp_balance ?? 0,
    bio: p.bio,
    cpf: p.cpf,
    birth_date: p.birth_date,
    gender: p.gender,
  }));

  return <AlunosClient students={students} />;
}

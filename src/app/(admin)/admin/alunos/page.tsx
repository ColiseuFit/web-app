import { createClient } from "@/lib/supabase/server";
import AlunosClient from "./AlunosClient"; 
import { getCachedLevels } from "@/lib/constants/levels_actions";
import { getTodayDate } from "@/lib/date-utils";

/**
 * Alunos Page (Server Component): Arquiteto de Dados do CRM de Membros.
 * 
 * @architecture
 * Este componente orquestra a busca paginada e filtrada de atletas. 
 * Ele separa rigorosamente a visualização administrativa (Admins/Coaches) da 
 * lista operacional de alunos, garantindo que o dashboard de CRM foque apenas 
 * na gestão do cliente final.
 * 
 * @data_strategy
 * 1. staff_exclusion: Identifica IDs com roles 'admin' e 'coach' para filtragem.
 * 2. performance_pagination: Implementa o padrão range (limit 50) do Supabase, 
 *    essencial para manter a rapidez conforme a base ultrapassa 300 atletas.
 * 3. dynamic_levels: Hidrata os labels e ordens de níveis a partir do SSoT de configurações.
 * 
 * @search_logic
 * - Numérico: Match exato em 'member_number'.
 * - Texto: Match parcial (ilike) em nomes e slugs de exibição.
 */
export default async function AlunosPage({ 
  searchParams 
}: { 
  searchParams: Promise<{ page?: string; search?: string; level?: string }> 
}) {
  const params = await searchParams;

  // 1. Parse params with defaults
  const page = parseInt(params.page || "1");
  const search = params.search || "";
  const level = params.level || "Todos";
  const pageSize = 50;

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const supabase = await createClient();
  const todayStr = getTodayDate();

  // 1. Get Admin/Coach IDs to exclude them from student lists
  const { data: staffRoles } = await supabase
    .from("user_roles")
    .select("user_id")
    .in("role", ["admin", "coach"]);
  const staffIds = (staffRoles || []).map((r: any) => r.user_id);

  // 2. Build Query
  let query = supabase
    .from("profiles")
    .select(`
      *
    `, { count: "exact" });

  if (staffIds.length > 0) {
    query = query.not("id", "in", `(${staffIds.join(",")})`);
  }

  // Apply Search
  if (search) {
    const isNumeric = /^\d+$/.test(search);
    if (isNumeric) {
      query = query.or(`full_name.ilike.*${search}*,display_name.ilike.*${search}*,member_number.eq.${search}`);
    } else {
      query = query.or(`full_name.ilike.*${search}*,display_name.ilike.*${search}*,first_name.ilike.*${search}*`);
    }
  }

  // Apply Level Filter
  if (level !== "Todos") {
    query = query.eq("level", level);
  }

  // 3. Execute with pagination and sorting
  const [
    { data: profilesRes, error: profilesError, count: totalCount },
    { data: preRegistrationsRes },
    dynamicLevels
  ] = await Promise.all([
    query
      .order("full_name", { ascending: true })
      .range(from, to),
    supabase
      .from("pre_registrations")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
    getCachedLevels()
  ]);

  if (profilesError) {
    console.error("[AlunosPage] Erro ao buscar perfis:", profilesError.message);
  }

  const students = (profilesRes ?? []).map((p: any) => ({
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
    membership_type: p.membership_type ?? "club",
    email: p.email,
    member_number: p.member_number,
    emergency_contact_name: p.emergency_contact_name,
    emergency_contact_phone: p.emergency_contact_phone,
    address_zip_code: p.address_zip_code,
    address_street: p.address_street,
    address_number: p.address_number,
    address_complement: p.address_complement,
    address_neighborhood: p.address_neighborhood,
    address_city: p.address_city,
    address_state: p.address_state,
  }));

  const totalPages = Math.ceil((totalCount || 0) / pageSize);

  return (
    <AlunosClient 
      students={students} 
      preRegistrations={preRegistrationsRes || []}
      dynamicLevels={dynamicLevels}
      currentPage={page}
      totalPages={totalPages}
      totalCount={totalCount || 0}
      currentSearch={search}
      currentLevel={level}
    />
  );
}

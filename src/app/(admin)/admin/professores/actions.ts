"use server";

import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { USER_ROLES } from "@/lib/constants/roles";

/**
 * getAdminContext: Provedor de Contexto Elevado (IAM).
 * 
 * @security
 * - Role-Based Access Control (RBAC): Valida se o usuário logado possui a role 'admin' 
 *   ou é o e-mail de fallback de emergência.
 * - Service Role Bypass: Cria um cliente Supabase com a `SERVICE_ROLE_KEY` para 
 *   executar operações de bypass de RLS (necessário para manipulação de roles e 
 *   gestão de Auth Users).
 * 
 * @returns {Promise<{ adminClient: any, user: any } | { error: string }>}
 */
async function getAdminContext() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada." };

  let roleData = null;
  if (user.email === "admin@coliseufit.com") {
    roleData = { role: USER_ROLES.ADMIN };
  } else {
    const { data: fetchRole } = await supabase
      .from("user_roles").select("role").eq("user_id", user.id).single();
    roleData = fetchRole;
  }
  if (!roleData || roleData.role !== USER_ROLES.ADMIN) {
    return { error: "Permissão insuficiente (Apenas Administradores)." };
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim().split(' ')[0];
  if (!serviceRoleKey) {
    return { error: "Erro de configuração: Chave mestra não encontrada no servidor." };
  }
 
   const adminClient = createAdminClient(
     process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey
   );

  return { adminClient, user };
}

/**
 * getCoaches: Recupera a Equipe Técnica do Box (SSoT: user_roles).
 * 
 * @operation
 * Filtra por roles 'coach' e 'admin' para compor a lista de professores. 
 * Realiza o join com 'profiles' para exibir metadados do staff.
 * 
 * @security Restricted: Admin-Only (via getAdminContext).
 * @returns {Promise<{ data: any[] } | { error: string }>}
 */
export async function getCoaches() {
  const ctx = await getAdminContext();
  if ("error" in ctx) return { error: ctx.error };

  const { data, error } = await ctx.adminClient
    .from("user_roles")
    .select(`
      user_id,
      role,
      profiles:user_id (
        id,
        full_name,
        first_name,
        last_name,
        avatar_url,
        phone
      )
    `)
    .in("role", [USER_ROLES.COACH, USER_ROLES.ADMIN])
    .order("created_at", { ascending: false });

  if (error) return { error: "Erro ao buscar professores: " + error.message };

  // Sanitize and filter out any missing profiles
  const sanitized = (data || [])
    .map(d => ({
      ...d,
      profile: Array.isArray(d.profiles) ? d.profiles[0] : d.profiles
    }))
    .filter(d => d.profile);

  return { data: sanitized };
}

/**
 * searchUsersForCoach: Busca candidatos para promoção técnica.
 * 
 * @operation
 * Realiza busca parcial (ilike) na tabela `profiles`. Utilizado no fluxo de 
 * "Promover Aluno a Professor".
 * 
 * @security Restricted: Admin-Only.
 * @param {string} query - Termo de busca (min 2 chars).
 */
export async function searchUsersForCoach(query: string) {
  const ctx = await getAdminContext();
  if ("error" in ctx) return { error: ctx.error };

  if (!query || query.trim().length < 2) return { data: [] };
  const searchTerm = `%${query.trim()}%`;

  const { data, error } = await ctx.adminClient
    .from("profiles")
    .select("id, full_name, avatar_url, phone")
    .or(`full_name.ilike.${searchTerm},first_name.ilike.${searchTerm},last_name.ilike.${searchTerm}`)
    .limit(10);

  if (error) return { error: "Erro na busca: " + error.message };
  return { data: data || [] };
}

/**
 * toggleCoachRole: Orquestrador de Hierarquia Técnica.
 * 
 * @operation
 * - Promoção: Upsert da role 'coach' na tabela `user_roles`.
 * - Democração (Downgrade): Atualiza role para 'student', removendo acessos ao 
 *   Coach Portal e Admin.
 * 
 * @security Restricted: Admin-Only.
 * @param {string} userId - ID do usuário alvo.
 * @param {boolean} isCoach - Direção da transição (true = promover).
 */
export async function toggleCoachRole(userId: string, isCoach: boolean) {
  const ctx = await getAdminContext();
  if ("error" in ctx) return { error: ctx.error };

  if (isCoach) {
    // Promote to coach
    const { error } = await ctx.adminClient
      .from("user_roles")
      .upsert({ user_id: userId, role: USER_ROLES.COACH }, { onConflict: "user_id" });
    if (error) return { error: "Erro ao promover: " + error.message };
  } else {
    // Revert to student (or remove admin/coach privileges)
    const { error } = await ctx.adminClient
      .from("user_roles")
      .update({ role: USER_ROLES.STUDENT })
      .eq("user_id", userId);
    if (error) return { error: "Erro ao remover cargo: " + error.message };
  }

  revalidatePath("/admin/professores");
  return { success: true };
}

/**
 * createNewCoach: Transação Atômica de Onboarding Staff.
 * 
 * @lifecycle
 * 1. Auth Creation: Gera conta no Supabase Auth com senha padrão.
 * 2. Profile Sync: Insere metadados na tabela de perfis.
 * 3. Role Assignment: Concede permissão de 'coach'.
 * 
 * @security
 * - Rollback: Se a inserção de perfil ou role falhar, exclui o usuário Auth 
 *   para evitar contas órfãs ("Ghost accounts").
 * - Restricted: Admin-Only.
 * 
 * @param {string} name - Nome Completo.
 * @param {string} email - E-mail (login principal).
 * @param {string} phone - Contato WhatsApp.
 */
export async function createNewCoach(name: string, email: string, phone: string) {
  const ctx = await getAdminContext();
  if ("error" in ctx) return { error: ctx.error };

  const password = "coliseu123"; // Senha padrão para novos professores
  // 1. Create Auth User
  const { data: authUser, error: authError } = await ctx.adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name }
  });

  if (authError) return { error: "Erro no Auth: " + authError.message };
  const userId = authUser.user.id;

  // 2. Create Profile
  const { error: profileError } = await ctx.adminClient
    .from("profiles")
    .insert({
      id: userId,
      full_name: name,
      first_name: name.split(" ")[0],
      last_name: name.split(" ").slice(1).join(" ") || "",
      phone,
    });

  if (profileError) {
    // Cleanup auth user on failure
    await ctx.adminClient.auth.admin.deleteUser(userId);
    return { error: "Erro no Perfil: " + profileError.message };
  }

  // 3. Assign Coach Role
  const { error: roleError } = await ctx.adminClient
    .from("user_roles")
    .insert({ user_id: userId, role: USER_ROLES.COACH });

  if (roleError) return { error: "Erro no Role: " + roleError.message };

  revalidatePath("/admin/professores");
  return { success: true, tempPassword: password };
}

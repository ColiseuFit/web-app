"use server";

import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Helper to verify admin role and return an admin Supabase client.
 */
async function getAdminContext() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada." };

  let roleData = null;
  if (user.email === "admin@coliseufit.com") {
    roleData = { role: "admin" };
  } else {
    const { data: fetchRole } = await supabase
      .from("user_roles").select("role").eq("user_id", user.id).single();
    roleData = fetchRole;
  }
  if (!roleData || roleData.role !== "admin") {
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
 * Fetches all users with the 'coach' or 'admin' role.
 * These are considered the "Professores" list.
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
    .in("role", ["coach", "admin"])
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
 * Searches users to be promoted to Coach.
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
 * Assigns or removes the 'coach' role to a user.
 */
export async function toggleCoachRole(userId: string, isCoach: boolean) {
  const ctx = await getAdminContext();
  if ("error" in ctx) return { error: ctx.error };

  if (isCoach) {
    // Promote to coach
    const { error } = await ctx.adminClient
      .from("user_roles")
      .upsert({ user_id: userId, role: "coach" }, { onConflict: "user_id" });
    if (error) return { error: "Erro ao promover: " + error.message };
  } else {
    // Revert to student (or remove admin/coach privileges)
    const { error } = await ctx.adminClient
      .from("user_roles")
      .update({ role: "student" })
      .eq("user_id", userId);
    if (error) return { error: "Erro ao remover cargo: " + error.message };
  }

  revalidatePath("/admin/professores");
  return { success: true };
}

/**
 * Creates a new Coach from scratch (Auth + Profile + Role).
 */
export async function createNewCoach(name: string, email: string, phone: string) {
  const ctx = await getAdminContext();
  if ("error" in ctx) return { error: ctx.error };

  const password = "Coliseu" + Math.random().toString(36).slice(-6); // Temporary password

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
    .insert({ user_id: userId, role: "coach" });

  if (roleError) return { error: "Erro no Role: " + roleError.message };

  revalidatePath("/admin/professores");
  return { success: true, tempPassword: password };
}

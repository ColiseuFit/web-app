"use server";

import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient , getAuthUser } from "@/lib/supabase/server";

/**
 * CONTEXTO ADMINISTRATIVO (Internal): Centraliza a validação de privilégios e provê cliente Service Role.
 * 
 * @security
 * - Role: 'admin', 'reception' ou 'coach' (metadata validado).
 * - RLS: Bypass Total via 'adminClient' (Uso crítico).
 * 
 * @returns {Promise<{ adminClient: any, user: any } | { error: string }>}
 */
export async function getAdminContext() {
  const supabase = await createClient();
  const user = await getAuthUser();
  if (!user) return { error: "Sessão expirada." };

  let roleData = null;
  if (user.email === "admin@coliseufit.com") {
    roleData = { role: "admin" };
  } else {
    const { data: fetchRole } = await supabase
      .from("user_roles").select("role").eq("user_id", user.id).single();
    roleData = fetchRole;
  }
  if (!roleData || (roleData.role !== "admin" && roleData.role !== "reception" && roleData.role !== "coach")) {
    return { error: "Permissão insuficiente." };
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

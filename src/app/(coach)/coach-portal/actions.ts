"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { USER_ROLES } from "@/lib/constants/roles";

export async function loginCoach(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    redirect("/coach-portal?error=Preencha todos os campos.");
  }

  const supabase = await createClient();

  // Tenta autenticar
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError || !authData.user) {
    redirect("/coach-portal?error=Credenciais incorretas.");
  }

  // Verifica RBAC (apenas segurança adicional)
  const { data: roleData } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", authData.user.id)
    .maybeSingle();

  const isAdmin = authData.user.email === "admin@coliseufit.com";
  
  if (!isAdmin && (!roleData || (roleData.role !== USER_ROLES.ADMIN && roleData.role !== USER_ROLES.COACH && roleData.role !== USER_ROLES.RECEPTION))) {
    await supabase.auth.signOut();
    redirect("/coach-portal?error=Acesso não autorizado para este perfil.");
  }

  const headersList = await headers();
  const userAgent = headersList.get("user-agent") || "";
  
  // Legacy Hardware Detection for JS-less routing
  const isLegacyHardware = userAgent.includes("OS 9_") || userAgent.includes("OS 10_") || userAgent.includes("iPad; CPU OS 9");

  if (isLegacyHardware) {
    redirect("/coach-lite");
  }

  redirect("/coach");
}

export async function logoutCoach() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/coach-portal");
}

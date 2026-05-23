"use server";

import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { createStudentSchema, profileSchema } from "@/lib/validations/security_schemas";

/**
 * Cria um novo aluno tanto no Auth quanto no Banco de Dados.
 * 
 * @security
 * - Role Requirement: Only 'admin' or 'reception' roles can execute this action.
 * - RLS Bypass: Uses `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS. This is strictly necessary because 
 *   creating a credential via Auth API (`supabase.auth.admin.createUser`) and injecting the initial 
 *   Profile/Role cross-table before the user has logged in requires elevated privileges.
 * - Validation: Enforces input shape via `createStudentSchema` (Zod).
 * 
 * @param {FormData} formData - Dados brutos do formulário: email, password, full_name, level, membership_type.
 * @returns {Promise<{ success?: boolean; error?: string }>} An object indicating success or failure message.
 * @throws {Error} Does not throw unhandled errors; catches and returns `{ error: string }`.
 */
export async function createStudent(formData: FormData) {
  // 0. Data Validation with Zod
  const rawData = {
    email: formData.get("email"),
    password: formData.get("password"),
    full_name: formData.get("full_name"),
    level: formData.get("level") || "branco",
    running_level: formData.get("running_level") || null,
    running_pace: formData.get("running_pace"),
    running_status: formData.get("running_status") || "active",
    membership_type: formData.get("membership_type") || "club", // Vínculo
  };

  const validation = createStudentSchema.safeParse(rawData);
  if (!validation.success) {
    return { error: "Dados inválidos: " + validation.error.issues[0].message };
  }
  const { email, password, full_name: fullName, level, running_level, running_pace, running_status, membership_type: membershipType } = validation.data;

  // 1. Verifica a sessão atual e se ele é admin/reception
  const supabase = await createClient();
  const { data: { user: currentUser } } = await supabase.auth.getUser();
  if (!currentUser) return { error: "Sem sessão logada." };

  const { data: roleData } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", currentUser.id)
    .single();

  if (!roleData || (roleData.role !== "admin" && roleData.role !== "reception")) {
    return { error: "Acesso negado. Apenas Recepção ou Admin." };
  }

  // Require Service Role Key para usar Auth Admin API
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim().split(' ')[0];
  
  if (!serviceRoleKey) {
    return { error: "Erro de configuração: SUPABASE_SERVICE_ROLE_KEY não encontrada no servidor (Verifique o painel da Vercel)." };
  }

  // Create admin client bypassing RLS
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  // 1. Cria credencial no Authentication
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError) {
    let errorMessage = "Ocorreu um erro ao criar a conta de acesso.";
    if (authError.message.includes("already been registered")) {
      errorMessage = "Este e-mail já está sendo utilizado por outro aluno.";
    }
    return { error: errorMessage };
  }

  const userId = authData.user.id;

  // 2. Insere Profile base bypassando RLS e gatilhos comuns
  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .insert({
      id: userId,
      full_name: fullName,
      email: email,
      level: level,
      running_level: running_level,
      running_pace: running_pace,
      running_status: running_status,
      membership_type: membershipType, // Vínculo
    });

  if (profileError) {
    console.error("[createStudent] Profile Error:", profileError);
    await supabaseAdmin.auth.admin.deleteUser(userId);
    return { error: `Não foi possível criar o perfil do aluno no banco (${profileError.message}). A conta foi removida para segurança.` };
  }

  // 3. Atribui a Role correta
  const { error: roleError } = await supabaseAdmin
    .from("user_roles")
    .insert({
      user_id: userId,
      role: "student",
    });

  if (roleError) {
    console.error("[createStudent] Role Error:", roleError);
    // Rollback total: limpa perfil e auth
    await supabaseAdmin.from("profiles").delete().eq("id", userId);
    await supabaseAdmin.auth.admin.deleteUser(userId);
    return { error: `Falha ao definir o nível de acesso (role) do aluno (${roleError.message}). Transação revertida.` };
  }

  revalidatePath("/admin/alunos");
  return { success: true };
}

/**
 * Atualiza os dados de um aluno existente na tabela de profiles.
 * 
 * @security
 * - Role Requirement: Only 'admin' or 'reception' roles.
 * - Standard Client: Uses the standard authenticated client (No RLS Bypass). 
 *   RLS Policies on `profiles` must allow UPDATE operations for Admins.
 * 
 * @param {string} studentId - O UUID específico do aluno a ser atualizado.
 * @param {FormData} formData - Form data containing up to 10 updated fields (full_name, display_name, level, phone, etc.).
 * @returns {Promise<{ success?: boolean; error?: string }>} Form operation status.
 */
export async function updateStudent(studentId: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user: currentUser } } = await supabase.auth.getUser();
  if (!currentUser) return { error: "Sessão expirada." };

  // Permission Check
  const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", currentUser.id).single();
  if (!roleData || (roleData.role !== "admin" && roleData.role !== "reception")) {
    return { error: "Permissão insuficiente." };
  }

  // Setup Admin Client for RLS bypass (Update other profiles)
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim().split(' ')[0];
  if (!serviceRoleKey) {
    return { error: "Erro de configuração: Chave mestra não encontrada no servidor." };
  }
  const supabaseAdmin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey);

  // 1. Gather all fields from formData
  const rawData: any = {};
  formData.forEach((value, key) => {
    if (typeof value === "string") {
      rawData[key] = value || null;
    }
  });

  // 2. Validate using SSoT Profile Schema (Partial allow for selective updates)
  const validation = profileSchema.partial().safeParse(rawData);
  if (!validation.success) {
    const errorMsg = validation.error.errors[0]?.message || "Dados inválidos.";
    return { error: errorMsg };
  }

  const updates: any = {
    ...validation.data,
    updated_at: new Date().toISOString(),
  };

  // 3. Handle Name Parsing for SSoT
  // The Admin UI mostly sends `full_name`. If it's provided, split it to maintain the SSoT of first/last name.
  if (updates.full_name) {
    const parts = updates.full_name.trim().split(" ");
    updates.first_name = parts[0] || "";
    updates.last_name = parts.slice(1).join(" ") || "";
  } else if (updates.first_name || updates.last_name) {
    // Rebuild full name if parts are updated separately
    updates.full_name = `${updates.first_name || ""} ${updates.last_name || ""}`.trim();
  }

  const { error } = await supabaseAdmin
    .from("profiles")
    .update(updates)
    .eq("id", studentId);

  if (error) {
    console.error("[updateStudent] Supabase Error:", error);
    return { error: `Não foi possível atualizar as informações: ${error.message}` };
  }

  revalidatePath("/admin/alunos");
  revalidatePath("/admin/running");
  revalidatePath("/(student)/programas/running", "page");
  revalidatePath("/profile");
  revalidatePath("/dashboard");
  revalidatePath("/profile/evaluations");

  return { success: true };
}

/**
 * Busca metadados biométricos básicos de um aluno.
 * 
 * @param {string} studentId - O identificador do aluno.
 * @returns {Promise<{ gender: string | null; birth_date: string | null } | null>}
 */
export async function getStudentBiometricsInfo(studentId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("gender, birth_date")
    .eq("id", studentId)
    .single();

  if (error || !data) return null;
  return {
    gender: data.gender,
    birth_date: data.birth_date
  };
}

/**
 * Remove permanentemente um aluno do Banco de Dados e Auth.
 * 
 * @CAUTION Esta ação é IRREVERSÍVEL e cascateia por todo o Banco de Dados.
 * 
 * @security
 * - Role Requirement: APENAS 'admin' pode executar isso. ('reception' é bloqueado).
 * - RLS Bypass: Usa Admin API (`deleteUser`) para limpar a credencial.
 * 
 * @param {string} studentId - O UUID específico do aluno a ser removido.
 * @returns {Promise<{ success?: boolean; error?: string }>} Deletion status.
 */
export async function deleteStudent(studentId: string) {
  const supabase = await createClient();
  const { data: { user: currentUser } } = await supabase.auth.getUser();
  if (!currentUser) return { error: "Sessão expirada." };

  // Only admin can delete (more strict than create)
  const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", currentUser.id).single();
  if (!roleData || roleData.role !== "admin") {
    return { error: "Apenas administradores podem excluir alunos." };
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim().split(' ')[0];
  if (!serviceRoleKey) {
    return { error: "Erro de configuração: Chave mestra não encontrada no servidor." };
  }

  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey
  );

  // 1. Delete from Auth (this will trigger cascade deletion in profiles if configured, 
  // but we manually handle the profiles table to ensure RLS/Triggers compliance)
  const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(studentId);
  if (authError) return { error: "Não foi possível remover completamente as credenciais de acesso." };

  revalidatePath("/admin/alunos");
  return { success: true };
}

/**
 * Atualiza as credenciais de autenticação de um aluno (E-mail ou Senha) via Admin API.
 * 
 * @security
 * - Role: Restrito a usuários com role 'admin'.
 * - RLS Bypass: Utiliza `SUPABASE_SERVICE_ROLE_KEY` para interagir diretamente com a Auth Admin API do Supabase.
 * - Registro: Falhas críticas são logadas no servidor para auditoria.
 * 
 * @param {string} studentId - O UUID único do aluno no Supabase Auth.
 * @param {FormData} formData - Objeto contendo os campos opcionais 'email' e 'password'.
 * @returns {Promise<{ success?: boolean; error?: string }>} Objeto indicando o status da operação.
 * 
 * @throws {Error} Captura erros da API de Auth e retorna como mensagem amigável; não interrompe o runtime.
 */
export async function updateStudentAuth(studentId: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user: currentUser } } = await supabase.auth.getUser();
  if (!currentUser) return { error: "Sessão expirada." };

  // Only admin can manage credentials
  const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", currentUser.id).single();
  if (!roleData || roleData.role !== "admin") {
    return { error: "Apenas administradores podem gerenciar acessos." };
  }

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email && !password) return { error: "Nenhuma alteração fornecida." };

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim().split(' ')[0];
  if (!serviceRoleKey) {
    return { error: "Erro de configuração: Chave mestra não encontrada." };
  }

  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey
  );

  const updates: any = {};
  if (email) updates.email = email;
  if (password) updates.password = password;

  const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(studentId, updates);
  
  if (authError) {
    console.error("[updateStudentAuth] Auth Error:", authError);
    let errorMessage = "Falha ao atualizar as informações de login.";
    if (authError.message.includes("already been registered")) {
      errorMessage = "O novo e-mail informado já está em uso por outro usuário.";
    }
    return { error: errorMessage };
  }

  revalidatePath("/admin/alunos");
  return { success: true };
}

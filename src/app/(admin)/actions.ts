"use server";

import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { Resend } from "resend";

import { createStudentSchema, wodSchema, physicalEvaluationSchema } from "@/lib/validations/security_schemas";

/**
 * Creates a new student athlete in both Auth and Database.
 * 
 * @security
 * - Role Requirement: Only 'admin' or 'reception' roles can execute this action.
 * - RLS Bypass: Uses `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS. This is strictly necessary because 
 *   creating a credential via Auth API (`supabase.auth.admin.createUser`) and injecting the initial 
 *   Profile/Role cross-table before the user has logged in requires elevated privileges.
 * - Validation: Enforces input shape via `createStudentSchema` (Zod).
 * 
 * @param {FormData} formData - The raw form data mapped to: email, password, full_name, level.
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
  };

  const validation = createStudentSchema.safeParse(rawData);
  if (!validation.success) {
    return { error: "Dados inválidos: " + validation.error.issues[0].message };
  }
  const { email, password, full_name: fullName, level } = validation.data;

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
      level: level,
    });

  if (profileError) {
    return { error: "Não foi possível criar o perfil do aluno no banco de dados." };
  }

  // 3. Atribui a Role correta
  const { error: roleError } = await supabaseAdmin
    .from("user_roles")
    .insert({
      user_id: userId,
      role: "student",
    });

  if (roleError) {
    return { error: "Falha ao definir o nível de acesso (role) do aluno." };
  }

  revalidatePath("/admin");
  return { success: true };
}

/**
 * Updates an existing student's data in the profiles table.
 * 
 * @security
 * - Role Requirement: Only 'admin' or 'reception' roles.
 * - Standard Client: Uses the standard authenticated client (No RLS Bypass). 
 *   RLS Policies on `profiles` must allow UPDATE operations for Admins.
 * 
 * @param {string} studentId - The specific UUID of the student to update.
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

  // Dynamic updates object to avoid overwriting missing fields with null
  const fields = [
    "full_name", "display_name", "first_name", "last_name", 
    "level", "phone", "cpf", "gender", "bio", "birth_date"
  ];
  
  const updates: any = {
    updated_at: new Date().toISOString(),
  };

  fields.forEach(field => {
    const value = formData.get(field);
    if (value !== null) {
      if (field === "birth_date") {
        updates[field] = value || null;
      } else {
        updates[field] = value as string;
      }
    }
  });

  // Explicitly handle birth_date if present
  const birthDate = formData.get("birth_date");
  if (birthDate !== null) {
    updates.birth_date = birthDate || null;
  }

  const { error } = await supabaseAdmin
    .from("profiles")
    .update(updates)
    .eq("id", studentId);

  if (error) return { error: "Não foi possível atualizar as informações do perfil." };

  revalidatePath("/admin/alunos");
  revalidatePath("/profile");
  revalidatePath("/dashboard");
  revalidatePath("/profile/evaluations");

  return { success: true };
}

/**
 * Fetches basic biometrics metadata for a student.
 * 
 * @param {string} studentId - The student identifier.
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
 * Permanently deletes a student from both Database and Auth.
 * 
 * @CAUTION This action is IRREVERSIBLE and cascades throughout the DB.
 * 
 * @security
 * - Role Requirement: ONLY 'admin' can execute this. ('reception' is blocked).
 * - RLS Bypass: Uses Admin API (`deleteUser`) to wipe the Auth credential. Supabase 
 *   handles the cascading deletions onto the `profiles` table automatically if configured,
 *   but this action guarantees the identity is completely destroyed.
 * 
 * @param {string} studentId - The specific UUID of the student to be removed.
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
 * @param {string} studentId - O UUID único do atleta no Supabase Auth.
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

/**
 * Creates or updates a WOD (Workout of the Day) for a specific date.
 * 
 * @security
 * - Role Requirement: Only 'admin' or 'reception' roles.
 * - Validation: Input strictly validated by `wodSchema` (Zod).
 * 
 * @param {FormData} formData - Contains the WOD mechanics (title, warm_up, technique, wod_content, date, time_cap, type_tag, result_type).
 * @returns {Promise<{ success?: boolean; error?: string }>} Upsert status.
 */
export async function upsertWod(formData: FormData) {
  const supabase = await createClient();
  const { data: { user: currentUser } } = await supabase.auth.getUser();
  if (!currentUser) return { error: "Sessão expirada." };

  const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", currentUser.id).single();
  if (!roleData || (roleData.role !== "admin" && roleData.role !== "reception")) {
    return { error: "Permissão insuficiente." };
  }

  const rawData = {
    date: formData.get("date") as string,
    title: formData.get("title") as string,
    warm_up: formData.get("warm_up") as string,
    technique: formData.get("technique") as string,
    wod_content: formData.get("wod_content") as string,
    type_tag: formData.get("type_tag") as string || undefined,
    time_cap: formData.get("time_cap") as string || undefined,
    result_type: formData.get("result_type") as string || undefined,
    coach_id: currentUser.id,
  };

  const validation = wodSchema.safeParse(rawData);
  if (!validation.success) {
    return { error: "Dados inválidos: " + validation.error.issues[0].message };
  }

  const payload = {
    ...validation.data,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("wods")
    .upsert(payload, { onConflict: "date" });

  if (error) return { error: "Falha ao salvar as informações do treino (WOD)." };

  revalidatePath("/admin/wods");
  revalidatePath("/dashboard");
  revalidatePath("/treinos");
  return { success: true };
}

/**
 * Deletes a WOD record from the database for a specific date.
 * 
 * @security
 * - Role Requirement: ONLY 'admin' (Reception cannot delete WODs).
 * - Cascades: Removes the entry from `wods`.
 * 
 * @param {string} date - ISO Date string (YYYY-MM-DD) identifying the WOD.
 * @returns {Promise<{ success?: boolean; error?: string }>} Deletion status.
 */
export async function deleteWod(date: string) {
  const supabase = await createClient();
  const { data: { user: currentUser } } = await supabase.auth.getUser();
  if (!currentUser) return { error: "Sessão expirada." };

  const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", currentUser.id).single();
  if (!roleData || roleData.role !== "admin") {
    return { error: "Apenas administradores podem remover treinos." };
  }

  const { error } = await supabase
    .from("wods")
    .delete()
    .eq("date", date);

  if (error) return { error: "Não foi possível remover o treino selecionado." };

  revalidatePath("/admin/wods");
  revalidatePath("/dashboard");
  revalidatePath("/treinos");
  return { success: true };
}

/**
 * Persists a physical evaluation for a student.
 * 
 * @security
 * - Role Requirement: 'admin', 'coach', or 'reception'.
 * - Validation: Strictly enforced by `physicalEvaluationSchema` (Zod).
 * - Data Integrity: Automatically assigns `evaluator_id` from the active session.
 * 
 * @param {PhysicalEvaluationInput} data - The complete evaluation payload including anthropometry, compositions, and photo links.
 * @returns {Promise<{ success?: boolean; error?: string }>} Upsert status.
 */
export async function upsertPhysicalEvaluation(data: any) {
  const supabase = await createClient();
  const { data: { user: currentUser } } = await supabase.auth.getUser();
  if (!currentUser) return { error: "Sessão expirada ou não autorizada." };

  const validation = physicalEvaluationSchema.safeParse(data);
  if (!validation.success) {
    return { error: "Dados inválidos: " + validation.error.issues[0].message };
  }

  // Setup Admin Client for RLS bypass and configuration stability
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim().split(' ')[0];
  if (!serviceRoleKey) {
    return { error: "Erro de configuração: Chave mestra não encontrada no servidor." };
  }
  const supabaseAdmin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey);

  const payload = {
    ...validation.data,
    evaluator_id: currentUser.id,
    updated_at: new Date().toISOString(),
  };

  let res;
  if (payload.id) {
    res = await supabaseAdmin.from("physical_evaluations").update(payload).eq("id", payload.id);
  } else {
    res = await supabaseAdmin.from("physical_evaluations").insert(payload);
  }

  if (res.error) {
    console.error("[upsertPhysicalEvaluation] DB Error:", res.error);
    return { error: "Erro ao salvar a avaliação física." };
  }

  revalidatePath("/admin/alunos");
  return { success: true };
}

/**
 * Retrieves all physical evaluations for a specific athlete.
 * 
 * @param {string} studentId - UUID of the athlete.
 * @returns {Promise<{ evaluations?: any[]; error?: string }>} List of evaluations sorted by date (descending).
 */
export async function getStudentEvaluations(studentId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("physical_evaluations")
    .select("*")
    .eq("student_id", studentId)
    .order("evaluation_date", { ascending: false });

  if (error) {
    console.error("[getStudentEvaluations] Error:", error);
    return { error: "Não foi possível carregar o histórico de avaliações." };
  }
  return { evaluations: data };
}

/**
 * Deletes a specific physical evaluation record.
 * 
 * @security
 * - Role Requirement: Active admin/coach session.
 * - Impact: This will remove the record from DB but photos in Storage must be handled separately or via DB Triggers.
 * 
 * @param {string} id - UUID of the evaluation record.
 * @returns {Promise<{ success?: boolean; error?: string }>} Deletion status.
 */
export async function deletePhysicalEvaluation(id: string) {
  const supabase = await createClient();
  const res = await supabase.from("physical_evaluations").delete().eq("id", id);
  if (res.error) {
    console.error("[deletePhysicalEvaluation] Error:", res.error);
    return { error: "Falha ao excluir o registro da avaliação." };
  }
  
  revalidatePath("/admin/alunos");
  revalidatePath("/profile");
  revalidatePath("/profile/evaluations");
  revalidatePath("/dashboard");
  return { success: true };
}

/**
 * Realiza o upload de uma foto de avaliação física para o bucket 'physical-evaluations'.
 * 
 * @security
 * - Role: 'admin', 'coach' ou 'reception'.
 * - Storage Policy: Arquivos são organizados no path `[studentId]/[timestamp].[ext]`.
 * - Persistence: Gera um Signed URL de 1 ano para visualização imediata no frontend e persistência no DB.
 * 
 * @technical
 * - Body Limit: Configurado para aceitar até 10MB (via experimental.serverActions.bodySizeLimit em next.config.ts).
 * - Buffer: Converte o `File` do navegador para `Uint8Array` no servidor para máxima estabilidade no SDK do Supabase.
 * - Fallback: Garante `contentType` padrão (image/jpeg) caso o arquivo venha sem metadados claros.
 * 
 * @param {FormData} formData - Payload contendo 'file' (Imagem) e 'studentId' (UUID do atleta).
 * @returns {Promise<{ success?: boolean; url?: string; path?: string; error?: string }>} URLs de acesso e status do upload.
 */
export async function uploadEvaluationPhoto(formData: FormData) {
  const supabase = await createClient();
  const { data: { user: currentUser } } = await supabase.auth.getUser();
  if (!currentUser) return { error: "Operação não permitida. Sessão inválida." };

  const file = formData.get("file") as File;
  const studentId = formData.get("studentId") as string;
  
  if (!file) return { error: "Nenhum arquivo de imagem detectado." };
  if (!studentId) return { error: "ID do aluno é obrigatório para o armazenamento." };

  const fileExt = file.name.split(".").pop();
  const filePath = `${studentId}/${Date.now()}.${fileExt}`;

  try {
    // 1. Storage Upload (Converted to Uint8Array for maximum compatibility in Server Actions)
    const arrayBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from("physical-evaluations")
      .upload(filePath, new Uint8Array(arrayBuffer), {
        contentType: file.type || 'image/jpeg',
        upsert: true
      });

    if (uploadError) {
      console.error("[uploadEvaluationPhoto] Storage Error:", uploadError);
      return { error: "Falha ao salvar no servidor de arquivos (Bucket ou Permissão): " + uploadError.message };
    }

    // 2. Immediate Signed URL generation (1 year expiration)
    const { data: signedData, error: signedError } = await supabase.storage
      .from("physical-evaluations")
      .createSignedUrl(filePath, 31536000); 

    if (signedError) {
      console.error("[uploadEvaluationPhoto] Signed URL Error:", signedError);
      return { error: "Arquivo salvo, mas erro ao gerar link: " + signedError.message };
    }

    return { 
      success: true, 
      url: signedData.signedUrl, 
      path: filePath 
    };
  } catch (err: any) {
    console.error("[uploadEvaluationPhoto] Unexpected Error:", err);
    return { error: "Erro inesperado no servidor: " + err.message };
  }
}

/**
 * Converts a pre-registration lead into a full student account.
 * 
 * @security
 * - Role Requirement: Only 'admin' or 'reception' roles can execute this action.
 * - RLS Bypass: Uses `SUPABASE_SERVICE_ROLE_KEY` to create Auth credential and insert cross-table rows.
 * 
 * @param {string} preRegistrationId - The UUID of the pre-registration lead.
 * @returns {Promise<{ success?: boolean; error?: string }>} An object indicating success or failure.
 */
export async function approvePreRegistration(preRegistrationId: string) {
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

  // 1. Fetch the lead data
  const { data: lead, error: leadError } = await supabase
    .from("pre_registrations")
    .select("*")
    .eq("id", preRegistrationId)
    .single();

  if (leadError || !lead) {
    return { error: "Lead não encontrado." };
  }

  if (lead.status !== "pending") {
    return { error: "Lead já processado." };
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim().split(' ')[0];
  if (!serviceRoleKey) {
    return { error: "Erro: SUPABASE_SERVICE_ROLE_KEY não encontrada." };
  }

  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Extrair o primeiro nome para usar no email
  const firstName = lead.full_name.trim().split(" ")[0];

  // 2. Create Auth Invitation (Generates Link without sending email via Supabase)
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.generateLink({
    type: 'invite',
    email: lead.email,
    options: {
      data: {
        full_name: lead.full_name,
        first_name: firstName,
      },
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback?next=/setup-password` 
    }
  });

  if (authError) {
    let errorMessage = "Erro ao gerar convite de acesso.";
    if (authError.message.includes("already been registered")) {
      errorMessage = "Este e-mail já está cadastrado em outro perfil de aluno.";
    }
    return { error: errorMessage || authError.message };
  }

  const userId = authData.user.id;
  const actionLink = authData.properties.action_link;

  // Disparo de e-mail Anti-Bot via Resend
  try {
    if (!process.env.RESEND_API_KEY) {
      console.error("ERRO: RESEND_API_KEY ausente. O servidor não leu o .env.local atualizado.");
      return { error: "Servidor precisa ser reiniciado para carregar as chaves de e-mail. Por favor, reinicie o terminal." };
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const verifyUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/verify?link=${encodeURIComponent(actionLink)}`;

    await resend.emails.send({
      from: 'Coliseu <onboarding@coliseufit.com>',
      to: lead.email,
      subject: 'Bem-vindo ao Clube Coliseu!',
      html: `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bem-vindo(a) ao Coliseu</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #000000;
      background-color: #f4f4f5;
      margin: 0;
      padding: 0;
    }
    .wrapper { padding: 40px 20px; }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border: 3px solid #000000;
      box-shadow: 8px 8px 0px #000000;
    }
    .header {
      background-color: #000000;
      color: #ffffff;
      padding: 25px 20px;
      text-align: center;
      border-bottom: 3px solid #000000;
    }
    .header h1 {
      margin: 0;
      font-size: 32px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: -1px;
    }
    .header span { color: #dc2626; }
    .content { padding: 40px 30px; }
    .content h2 {
      font-size: 24px;
      font-weight: 800;
      margin-top: 0;
      margin-bottom: 25px;
      text-transform: uppercase;
    }
    .content p { font-size: 16px; margin-bottom: 20px; color: #18181b; }
    .features-box {
      background-color: #f4f4f5;
      border: 2px solid #000000;
      padding: 20px;
      margin: 30px 0;
    }
    .features-box p { font-weight: 800; margin-top: 0; margin-bottom: 10px; text-transform: uppercase; }
    .features-box ul { margin: 0; padding-left: 20px; }
    .features-box li { margin-bottom: 8px; font-weight: 500; }
    .cta-container { text-align: center; margin: 40px 0; }
    .cta-button {
      background-color: #dc2626;
      color: #ffffff !important;
      font-size: 16px;
      font-weight: 800;
      text-transform: uppercase;
      text-decoration: none;
      padding: 16px 32px;
      display: inline-block;
      border: 2px solid #000000;
      box-shadow: 4px 4px 0px #000000;
    }
    .footer {
      padding: 20px;
      background-color: #ffffff;
      border-top: 2px solid #000000;
      text-align: center;
      font-size: 13px;
      color: #71717a;
      font-weight: 500;
    }
    .footer a { color: #000000; text-decoration: underline; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h1>COLISEU<span>CLUBE</span></h1>
      </div>
      <div class="content">
        <h2>FALA, ${firstName}! 🔥</h2>
        <p>Seu acesso ao app do <strong>Coliseu Clube</strong> já está pronto.</p>
        <p>Criamos esse espaço porque acreditamos na força da comunidade — e agora você faz oficialmente parte dela.</p>
        <div class="features-box">
          <p>O QUE VOCÊ VAI ENCONTRAR NO APP:</p>
          <ul>
            <li>Check-in em turmas e acompanhamento dos WODs.</li>
            <li>Registro dos pesos e recordes pessoais (PR).</li>
            <li>Seu histórico de atividades completo.</li>
          </ul>
        </div>
        <p>Para confirmar sua vaga, tudo o que você precisa fazer é definir a sua senha inicial.</p>
        <div class="cta-container">
          <a href="${verifyUrl}" class="cta-button">CRIAR SENHA DE ACESSO</a>
        </div>
        <p style="font-weight: 700; margin-top: 30px;">Nos vemos no Coliseu.</p>
      </div>
      <div class="footer">
        Se o botão não funcionar, cole este link no navegador:<br>
        <a href="${verifyUrl}">${verifyUrl}</a>
        <br><br>
        ColiseuFit &copy; 2026.
      </div>
    </div>
  </div>
</body>
</html>
      `
    });
  } catch (err) {
    console.error("Erro ao disparar email via Resend:", err);
    return { error: "Convite gerado, mas ocorreu um erro ao enviar o e-mail via Resend." };
  }


  // 3. Create Profile
  // We split full_name into first and last name as a basic heuristic
  const nameParts = lead.full_name.trim().split(" ");
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : null;

  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .insert({
      id: userId,
      full_name: lead.full_name,
      first_name: firstName,
      last_name: lastName,
      phone: lead.phone,
      cpf: lead.cpf,
      birth_date: lead.birth_date,
      level: "branco", // Default starting level
    });

  if (profileError) {
    return { error: "Ocorreu uma falha ao vincular os dados pessoais do aluno." };
  }

  // 4. Assign Role
  const { error: roleError } = await supabaseAdmin
    .from("user_roles")
    .insert({
      user_id: userId,
      role: "student",
    });

  if (roleError) {
    return { error: "Falha ao definir as permissões de acesso do novo aluno." };
  }

  // 5. Update Pre-registration Status
  await supabaseAdmin
    .from("pre_registrations")
    .update({ status: "approved" })
    .eq("id", preRegistrationId);

  revalidatePath("/admin/alunos");
  return { success: true };
}

/**
 * Rejects a pre-registration lead, marking it as 'rejected'.
 * 
 * @security
 * - Role Requirement: Only 'admin' or 'reception' roles.
 * 
 * @param {string} preRegistrationId - The UUID of the lead to reject.
 * @returns {Promise<{ success?: boolean; error?: string }>} Form operation status.
 */
export async function rejectPreRegistration(preRegistrationId: string) {
  const supabase = await createClient();
  const { data: { user: currentUser } } = await supabase.auth.getUser();
  if (!currentUser) return { error: "Sem sessão logada." };

  const { data: roleData } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", currentUser.id)
    .single();

  if (!roleData || (roleData.role !== "admin" && roleData.role !== "reception")) {
    return { error: "Acesso negado." };
  }

  // We can use standard supabase update since RLS allows update for admin/reception
  const { error } = await supabase
    .from("pre_registrations")
    .update({ status: "rejected" })
    .eq("id", preRegistrationId);

  if (error) {
    return { error: "Não foi possível arquivar este pré-cadastro no momento." };
  }

  revalidatePath("/admin/alunos");
  return { success: true };
}
/**
 * Updates a pre-registration lead data.
 * 
 * @security
 * - Role Requirement: Only 'admin' or 'reception' roles.
 * 
 * @param {string} preRegistrationId - The UUID of the lead to update.
 * @param {FormData} formData - The data to update (full_name, email, phone, cpf, birth_date).
 * @returns {Promise<{ success?: boolean; error?: string }>} Form operation status.
 */
export async function updatePreRegistration(preRegistrationId: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user: currentUser } } = await supabase.auth.getUser();
  if (!currentUser) return { error: "Sem sessão logada." };

  const { data: roleData } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", currentUser.id)
    .single();

  if (!roleData || (roleData.role !== "admin" && roleData.role !== "reception")) {
    return { error: "Acesso negado." };
  }

  const updates = {
    full_name: formData.get("full_name") as string,
    email: formData.get("email") as string,
    phone: formData.get("phone") as string,
    cpf: formData.get("cpf") as string,
    birth_date: formData.get("birth_date") as string || null,
  };

  const { error } = await supabase
    .from("pre_registrations")
    .update(updates)
    .eq("id", preRegistrationId);

  if (error) {
    return { error: "Erro ao atualizar pré-cadastro: " + error.message };
  }

  revalidatePath("/admin/alunos");
  return { success: true };
}

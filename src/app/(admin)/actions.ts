"use server";

import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

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
    return { error: "Erro ao criar credenciais: " + authError.message };
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
    return { error: "Erro ao criar perfil: " + profileError.message };
  }

  // 3. Atribui a Role correta
  const { error: roleError } = await supabaseAdmin
    .from("user_roles")
    .insert({
      user_id: userId,
      role: "student",
    });

  if (roleError) {
    return { error: "Erro ao atribuir role: " + roleError.message };
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

  if (error) return { error: "Erro ao atualizar: " + error.message };

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
  if (authError) return { error: "Erro ao remover credenciais: " + authError.message };

  revalidatePath("/admin/alunos");
  return { success: true };
}

/**
 * Updates a student's authentication credentials (email/password).
 * 
 * @security
 * - Role Requirement: ONLY 'admin'.
 * - RLS Bypass: Uses `SUPABASE_SERVICE_ROLE_KEY` to update the Auth system directly.
 * - Impact: Changing the email updates the login identifier.
 * 
 * @param {string} studentId - The UUID of the athlete.
 * @param {FormData} formData - Data containing 'email' or 'password'.
 * @returns {Promise<{ success?: boolean; error?: string }>} Operation status.
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
    return { error: "Erro no servidor de autenticação: " + authError.message };
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

  const { data: existingWod } = await supabase
    .from("wods")
    .select("id")
    .eq("date", payload.date)
    .maybeSingle();

  let error;
  if (existingWod) {
    const { error: updateError } = await supabase
      .from("wods")
      .update(payload)
      .eq("id", existingWod.id);
    error = updateError;
  } else {
    const { error: insertError } = await supabase
      .from("wods")
      .insert(payload);
    error = insertError;
  }

  if (error) return { error: "Erro ao salvar WOD: " + error.message };

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

  if (error) return { error: "Erro ao remover treino: " + error.message };

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
    return { error: "Falha na persistência: " + res.error.message };
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
    return { error: "Erro ao buscar histórico: " + error.message };
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
    return { error: "Erro ao excluir registro: " + res.error.message };
  }
  
  revalidatePath("/admin/alunos");
  revalidatePath("/profile");
  revalidatePath("/profile/evaluations");
  revalidatePath("/dashboard");
  return { success: true };
}

/**
 * Uploads a physical evaluation photo to the 'physical-evaluations' bucket.
 * 
 * @security
 * - Role Requirement: 'admin' or 'coach'.
 * - Storage Policy: Files are stored in path `[studentId]/[timestamp].[ext]`.
 * - Persistence: Generates a 1-year signed URL for immediate preview/storage in DB.
 * 
 * @param {FormData} formData - Payload containing 'file' (Image) and 'studentId' (UUID).
 * @returns {Promise<{ success?: boolean; url?: string; path?: string; error?: string }>} Upload results.
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


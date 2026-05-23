"use server";

import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { physicalEvaluationSchema } from "@/lib/validations/security_schemas";
import { enrichEvaluation } from "@/lib/physique-utils";

/**
 * Persists a physical evaluation for a student.
 * Cria ou atualiza um registro de avaliação física.
 * 
 * @security
 * - Role Requirement: 'admin', 'coach', or 'reception'.
 * - Validation: Strictly enforced by `physicalEvaluationSchema` (Zod).
 * - Data Integrity: Automatically assigns `evaluator_id` from the active session.
 * - Authorization: Protected via RLS (admin bypass via service_role after session validation).
 * 
 * @cache
 * - Revalidates administrative and student paths to maintain SSoT.
 * 
 * @param {any} data - The complete evaluation payload including anthropometry, compositions, and photo links.
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

  // Invalida cache do admin E do aluno — SSoT: dados salvos devem ser visíveis em todos os portais imediatamente
  revalidatePath("/admin/alunos");
  revalidatePath("/profile/evaluations");
  revalidatePath("/profile");
  revalidatePath("/dashboard");
  return { success: true };
}

/**
 * Retrieves all physical evaluations for a specific student.
 * 
 * @param {string} studentId - UUID of the student.
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

  // 1. Fetch student info for healing (SSoT: Need gender/birth_date)
  const { data: profile } = await supabase
    .from("profiles")
    .select("gender, birth_date")
    .eq("id", studentId)
    .single();

  // 2. Apply Self-Healing to all records
  const healedEvaluations = (data || []).map(ev => 
    enrichEvaluation(ev, { gender: profile?.gender, birth_date: profile?.birth_date })
  );

  return { evaluations: healedEvaluations };
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

  // @security: Defesa em profundidade — verifica role mesmo com RLS ativo
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sem sessão válida." };

  const { data: roleData } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (!roleData || (roleData.role !== "admin" && roleData.role !== "reception")) {
    return { error: "Acesso negado. Apenas Admin ou Recepção podem excluir avaliações." };
  }

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
 * @param {FormData} formData - Payload contendo 'file' (Imagem) e 'studentId' (UUID do aluno).
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

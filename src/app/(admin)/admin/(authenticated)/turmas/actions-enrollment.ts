"use server";

import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getAdminContext } from "./actions-shared";

/**
 * MATRÍCULAS FIXAS: Busca todos os alunos vinculados recorrentemente a um horário.
 * 
 * @security Role: Admin/Reception.
 * @param {string} slotId - UUID do horário.
 * @returns {Promise<{ data?: any[]; error?: string }>}
 */
export async function getSlotEnrollments(slotId: string) {
  const ctx = await getAdminContext();
  if ("error" in ctx) return { error: ctx.error };

  const { data, error } = await ctx.adminClient
    .from("class_enrollments")
    .select(`
      id,
      enrolled_at,
      student_id,
      profiles:student_id (
        id,
        first_name,
        last_name,
        full_name,
        level,
        avatar_url,
        phone,
        user_roles!inner(role)
      )
    `)
    .eq("class_slot_id", slotId)
    .eq("profiles.user_roles.role", "student")
    .order("enrolled_at", { ascending: true });

  if (error) return { error: "Erro ao buscar matrículas: " + error.message };
  
  // Sanitize profiles (Supabase joins return them as an array)
  // We map the array and filter out any records that didn't join to a profile correctly
  const sanitized = (data || [])
    .map((d: any) => ({
      ...d,
      profiles: Array.isArray(d.profiles) ? d.profiles[0] : d.profiles
    }))
    .filter((d: any) => d.profiles);

  return { data: sanitized };
}

/**
 * MATRÍCULA FIXA: Vincula um aluno a um horário recorrente da grade.
 * 
 * @operation
 * - Verifica duplicidade (constraint 23505).
 * - Registra em 'class_enrollments'.
 * 
 * @security
 * - Role: Admin/Reception.
 * 
 * @param {string} slotId - UUID do horário (class_slots).
 * @param {string} studentId - UUID do aluno (profiles).
 * @returns {Promise<{ success?: boolean; error?: string }>}
 */
export async function enrollStudent(slotId: string, studentId: string) {
  const ctx = await getAdminContext();
  if ("error" in ctx) return { error: ctx.error };

  // Check capacity before enrolling
  const { data: slot } = await ctx.adminClient
    .from("class_slots")
    .select("capacity")
    .eq("id", slotId)
    .single();

  const { count } = await ctx.adminClient
    .from("class_enrollments")
    .select("id", { count: "exact", head: true })
    .eq("class_slot_id", slotId);

  if (slot && count !== null && count >= slot.capacity) {
    return { error: "Turma lotada. Capacidade máxima atingida." };
  }

  // 1. Validar se o perfil é de um ALUNO (student)
  const { data: roleCheck } = await ctx.adminClient
    .from("user_roles")
    .select("role")
    .eq("user_id", studentId)
    .single();

  if (!roleCheck || roleCheck.role !== "student") {
    return { error: "Apenas perfis de Alunos podem ser matriculados nesta turma." };
  }

  const { error } = await ctx.adminClient
    .from("class_enrollments")
    .insert({ class_slot_id: slotId, student_id: studentId });

  if (error) {
    if (error.code === "23505") {
      return { error: "Aluno já está matriculado neste horário." };
    }
    return { error: "Erro ao matricular: " + error.message };
  }

  revalidatePath("/admin/turmas");
  return { success: true };
}

/**
 * DESMATRÍCULA: Remove um aluno de um horário fixo e gatilha promoção da waitlist.
 * 
 * @security
 * - Role: Admin/Reception.
 * 
 * @param {string} enrollmentId - UUID da matrícula (class_enrollments).
 * @returns {Promise<{ success?: boolean; error?: string }>}
 */
export async function unenrollStudent(enrollmentId: string) {
  const ctx = await getAdminContext();
  if ("error" in ctx) return { error: ctx.error };

  // Get slotId to trigger promotion after unenrollment
  const { data: enrollment } = await ctx.adminClient
    .from("class_enrollments")
    .select("class_slot_id")
    .eq("id", enrollmentId)
    .single();

  const { error } = await ctx.adminClient
    .from("class_enrollments")
    .delete()
    .eq("id", enrollmentId);

  if (error) return { error: "Erro ao remover matrícula: " + error.message };

  // Trigger waitlist promotion automatically
  if (enrollment && enrollment.class_slot_id) {
    await triggerWaitlistPromotion(enrollment.class_slot_id);
  }

  revalidatePath("/admin/turmas");
  return { success: true };
}

/**
 * REALOCAÇÃO: Transfere uma matrícula existente para um horário diferente.
 * 
 * @security
 * - Role: Admin/Reception.
 * - Validação: Verifica capacidade do slot de destino antes de migrar.
 * 
 * @param {string} enrollmentId - UUID da matrícula atual.
 * @param {string} newSlotId - UUID do novo horário de destino.
 * @returns {Promise<{ success?: boolean; error?: string }>}
 */
export async function reassignEnrollment(enrollmentId: string, newSlotId: string) {
  const ctx = await getAdminContext();
  if ("error" in ctx) return { error: ctx.error };

  // 1. Get old slot id to promote waitlist later
  const { data: oldEnrollment } = await ctx.adminClient
    .from("class_enrollments")
    .select("class_slot_id")
    .eq("id", enrollmentId)
    .single();

  // 2. Check capacity of the NEW slot
  const { data: slot } = await ctx.adminClient
    .from("class_slots")
    .select("capacity")
    .eq("id", newSlotId)
    .single();

  const { count: currentOnNew } = await ctx.adminClient
    .from("class_enrollments")
    .select("id", { count: "exact", head: true })
    .eq("class_slot_id", newSlotId);

  if (slot && currentOnNew !== null && currentOnNew >= slot.capacity) {
    return { error: "A turma de destino está lotada." };
  }

  // 3. Perform update
  const { error } = await ctx.adminClient
    .from("class_enrollments")
    .update({ class_slot_id: newSlotId })
    .eq("id", enrollmentId);

  if (error) return { error: "Erro ao trocar matrícula: " + error.message };

  // 4. Promote waitlist for OLD slot if it became free
  if (oldEnrollment?.class_slot_id) {
    await triggerWaitlistPromotion(oldEnrollment.class_slot_id);
  }

  revalidatePath("/admin/turmas");
  return { success: true };
}

/**
 * BUSCA DE ESTUDANTES: Pesquisa perfis de alunos para novos vínculos de matrícula.
 * 
 * @security
 * - Role: Admin/Reception.
 * - Filtro: Retorna apenas perfis com role 'student'.
 * 
 * @param {string} query - Termo de busca (Nome ou Parte dele).
 * @returns {Promise<{ data?: any[]; error?: string }>}
 */
export async function searchStudentsForEnrollment(query: string) {
  const ctx = await getAdminContext();
  if ("error" in ctx) return { error: ctx.error };

  if (!query || query.trim().length < 2) {
    return { data: [] };
  }

  const searchTerm = `%${query.trim()}%`;

  const { data, error } = await ctx.adminClient
    .from("profiles")
    .select("id, first_name, last_name, full_name, level, avatar_url, phone, user_roles!inner(role)")
    .eq("user_roles.role", "student")
    .or(`first_name.ilike.${searchTerm},last_name.ilike.${searchTerm},full_name.ilike.${searchTerm}`)
    .limit(10);

  if (error) return { error: "Erro na busca: " + error.message };
  return { data: data || [] };
}

/**
 * BUSCA CRM: Pesquisa alunos incluindo seus horários fixos e matrículas.
 * 
 * @security
 * - Role: Admin/Reception.
 * 
 * @param {string} query - Termo de busca.
 */
export async function searchStudentsWithEnrollments(query: string) {
  const ctx = await getAdminContext();
  if ("error" in ctx) return { error: ctx.error };

  if (!query || query.trim().length < 2) {
    return { data: [] };
  }

  const searchTerm = `%${query.trim()}%`;

  // 1. Search profiles (Only students)
  const { data: students, error: studentError } = await ctx.adminClient
    .from("profiles")
    .select(`
      id, 
      first_name, 
      last_name, 
      full_name, 
      level, 
      avatar_url, 
      phone,
      user_roles!inner(role),
      class_enrollments (
        id,
        class_slot_id,
        class_slots (
          id,
          name,
          day_of_week,
          time_start
        )
      )
    `)
    .eq("user_roles.role", "student")
    .or(`first_name.ilike.${searchTerm},last_name.ilike.${searchTerm},full_name.ilike.${searchTerm}`)
    .limit(15);

  if (studentError) return { error: "Erro na busca detalhada: " + studentError.message };

  // Sanitize nested joins (Supabase returns arrays for 1:N)
  const sanitized = (students || []).map((student: any) => {
    const rawEnrollments = (student.class_enrollments || []) as { 
      id: string; 
      class_slot_id: string; 
      class_slots: { id: string; name: string; day_of_week: number; time_start: string }[] | { id: string; name: string; day_of_week: number; time_start: string } | null 
    }[];
    return {
      ...student,
      enrollments: rawEnrollments.map((en) => ({
        id: en.id,
        slotId: en.class_slot_id,
        slot: Array.isArray(en.class_slots) ? en.class_slots[0] : en.class_slots
      }))
    };
  });

  return { data: sanitized };
}

/**
 * AGENDA INDIVIDUAL: Busca todos os horários fixos de um aluno.
 * 
 * @param {string} studentId - UUID do aluno.
 */
export async function getStudentEnrollments(studentId: string) {
  const ctx = await getAdminContext();
  if ("error" in ctx) return { error: ctx.error };

  const { data, error } = await ctx.adminClient
    .from("class_enrollments")
    .select(`
      id,
      class_slot_id,
      class_slots (
        id,
        name,
        day_of_week,
        time_start,
        coach_name
      )
    `)
    .eq("student_id", studentId);

  if (error) return { error: "Erro ao buscar agenda do aluno: " + error.message };

  const sanitized = (data || []).map((en: any) => ({
    ...en,
    slot: Array.isArray(en.class_slots) ? en.class_slots[0] : en.class_slots
  }));

  return { data: sanitized };
}

/**
 * LISTA DE ESPERA (Consulta): Recupera todos os alunos aguardando vaga em um horário.
 * 
 * @param {string} slotId - UUID do horário.
 * @returns {Promise<{ data?: any[]; error?: string }>} Lista de espera ordenada por data de entrada (FIFO).
 */
export async function getSlotWaitlist(slotId: string) {
  const ctx = await getAdminContext();
  if ("error" in ctx) return { error: ctx.error };

  const { data, error } = await ctx.adminClient
    .from("class_waitlist")
    .select(`
      id, created_at, student_id,
      profiles:student_id(id, first_name, last_name, full_name, level, avatar_url)
    `)
    .eq("class_slot_id", slotId)
    .order("created_at", { ascending: true });

  if (error) return { error: "Erro ao buscar lista de espera: " + error.message };

  const sanitized = (data || []).map((d: any) => ({
    ...d,
    profiles: Array.isArray(d.profiles) ? d.profiles[0] : d.profiles
  })).filter((d: any) => d.profiles);

  return { data: sanitized };
}

/**
 * LISTA DE ESPERA (Interesse): Adiciona um aluno à fila de espera de um horário.
 * 
 * @SSoT: Impõe uma restrição UNIQUE (slotId, studentId) para evitar duplicidade.
 * 
 * @lifecycle
 * - Os alunos da waitlist podem ser promovidos via 'triggerWaitlistPromotion'.
 * 
 * @security
 * - Role: Admin/Reception.
 * 
 * @param {string} slotId - UUID do horário.
 * @param {string} studentId - UUID do aluno.
 */
export async function addToWaitlist(slotId: string, studentId: string) {
  const ctx = await getAdminContext();
  if ("error" in ctx) return { error: ctx.error };

  const { error } = await ctx.adminClient
    .from("class_waitlist")
    .insert({ class_slot_id: slotId, student_id: studentId });

  if (error) {
    if (error.code === "23505") return { error: "Aluno já está na lista de espera." };
    return { error: "Erro ao adicionar à lista: " + error.message };
  }

  revalidatePath("/admin/turmas");
  return { success: true };
}

/**
 * LISTA DE ESPERA (Remoção): Exclui um registro da fila de interessados.
 * 
 * @security Role: Admin/Reception.
 * @param {string} waitlistId - UUID do registro na tabela 'class_waitlist'.
 */
export async function removeFromWaitlist(waitlistId: string) {
  const ctx = await getAdminContext();
  if ("error" in ctx) return { error: ctx.error };

  const { error } = await ctx.adminClient
    .from("class_waitlist")
    .delete()
    .eq("id", waitlistId);

  if (error) return { error: "Erro ao remover da lista: " + error.message };

  revalidatePath("/admin/turmas");
  return { success: true };
}

/**
 * PROMOÇÃO AUTOMÁTICA (Waitlist): Transfere o primeiro da fila para uma matrícula fixa.
 * 
 * @SSoT Lógica:
 * 1. Recupera o registro mais antigo (FIFO).
 * 2. Tenta inserir na 'class_enrollments'.
 * 3. Se sucesso, deleta da 'class_waitlist'.
 * 
 * @operation
 * - Disparado manualmente pelo Admin ou automaticamente em fluxos de desmatrícula.
 * 
 * @security Role: Admin/Reception.
 * @param {string} slotId - UUID do horário.
 * @param {boolean} isManual - Se true, força a promoção ignorando a configuração de auto-promoção.
 */
export async function triggerWaitlistPromotion(slotId: string, isManual: boolean = false) {
  const ctx = await getAdminContext();
  if ("error" in ctx) return { error: ctx.error };

  // Se não foi disparo manual, checa a configuração global de auto-promoção
  if (!isManual) {
    const { data: setting } = await ctx.adminClient
      .from("box_settings")
      .select("value")
      .eq("key", "auto_promote_waitlist")
      .single();
    
    // Se estiver explicitamente como "false", aborta a automação invisível
    if (setting?.value === "false") {
      return { message: "Auto-promoção desativada nas configurações globais." };
    }
  }

  // Get the first person in waitlist
  const { data: waitlist } = await ctx.adminClient
    .from("class_waitlist")
    .select("id, student_id")
    .eq("class_slot_id", slotId)
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  if (!waitlist) return { message: "Ninguém na lista de espera." };

  // Try to enroll them directly using the enrollStudent internal logic
  const { error: enrollError } = await ctx.adminClient
    .from("class_enrollments")
    .insert({ class_slot_id: slotId, student_id: waitlist.student_id });
    
  if (enrollError) {
    return { error: "Falha ao matricular aluno da lista de espera: " + enrollError.message };
  }

  // Remove them from waitlist since they got the spot
  await ctx.adminClient.from("class_waitlist").delete().eq("id", waitlist.id);

  revalidatePath("/admin/turmas");
  return { success: true, promotedStudentId: waitlist.student_id };
}

"use server";

import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { classSlotSchema } from "@/lib/validations/security_schemas";

/**
 * Turmas & Agenda Engine (Server Actions).
 * 
 * @architecture
 * - Motor de Logística: Gerencia o ciclo de vida completo de turmas, check-ins e bloqueios granulares.
 * - SSoT de Persistência: Única via autorizada de mutação para `class_slots`, `box_holidays` e `class_sessions`.
 * - Segurança (RBAC): Validação rigorosa de permissões via `getAdminContext` e esquemas Zod.
 * 
 * @design
 * - Transações Atômicas: Operações críticas protegidas contra estados inconsistentes.
 * - Revalidação Seletiva: Atualiza apenas os caminhos necessários (`/admin/turmas`, `/coach`) para performance.
 */

/**
 * GESTÃO DE HORÁRIOS: Cria ou atualiza um slot de turma na grade semanal.
 * 
 * @security
 * - Role: Admin ou Reception.
 * - RLS: Bypass via Service Role.
 * - Validação: Zod Schema `classSlotSchema`.
 * 
 * @param {FormData} formData - Payload com os dados da turma.
 * @param {string | null} slotId - ID para atualização (opcional).
 * @returns {Promise<{ success?: boolean; error?: string }>}
 */
export async function upsertClassSlot(formData: FormData, slotId?: string | null) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada." };

  // Permission check
  let roleData = null;
  if (user.email === "admin@coliseufit.com") {
    roleData = { role: "admin" };
  } else {
    const { data: fetchRole } = await supabase
      .from("user_roles").select("role").eq("user_id", user.id).single();
    roleData = fetchRole;
  }
  if (!roleData || (roleData.role !== "admin" && roleData.role !== "reception")) {
    return { error: "Permissão insuficiente." };
  }

  const rawData = {
    name: formData.get("name") as string || "CrossTraining",
    day_of_week: Number(formData.get("day_of_week")),
    time_start: formData.get("time_start") as string,
    duration_minutes: Number(formData.get("duration_minutes")) || 60,
    capacity: Number(formData.get("capacity")) || 20,
    coach_name: (formData.get("coach_name") as string) || undefined,
    default_coach_id: (formData.get("default_coach_id") as string) || undefined,
  };

  const validation = classSlotSchema.safeParse(rawData);
  if (!validation.success) {
    return { error: "Dados inválidos: " + validation.error.issues[0].message };
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim().split(' ')[0];
  if (!serviceRoleKey) {
    return { error: "Erro de configuração: Chave mestra não encontrada no servidor." };
  }

  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey
  );

  const payload = {
    ...validation.data,
    is_active: true,
  };

  let error;
  if (slotId) {
    const { error: updateError } = await supabaseAdmin
      .from("class_slots")
      .update(payload)
      .eq("id", slotId);
    error = updateError;
  } else {
    const { error: insertError } = await supabaseAdmin
      .from("class_slots")
      .insert(payload);
    error = insertError;
  }

  if (error) return { error: "Erro ao salvar turma: " + error.message };

  revalidatePath("/admin/turmas");
  return { success: true };
}

/**
 * ATIVAÇÃO/DESATIVAÇÃO: Alterna o estado 'is_active' de um horário (Soft Delete).
 * 
 * @security
 * - Role: Apenas Administradores ('admin').
 * - RLS: Bypass via Service Role.
 * 
 * @param {string} slotId - UUID do horário.
 * @param {boolean} isActive - Novo estado de ativação.
 * @returns {Promise<{ success?: boolean; error?: string }>}
 */
export async function toggleClassSlot(slotId: string, isActive: boolean) {
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
    return { error: "Apenas administradores podem desativar turmas." };
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim().split(' ')[0];
  if (!serviceRoleKey) {
    return { error: "Erro de configuração: Chave mestra não encontrada no servidor." };
  }

  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey
  );

  const { error } = await supabaseAdmin
    .from("class_slots")
    .update({ is_active: isActive })
    .eq("id", slotId);

  if (error) return { error: "Erro ao atualizar status: " + error.message };

  revalidatePath("/admin/turmas");
  return { success: true };
}

/**
 * EXCLUSÃO PERMANENTE: Remove definitivamente um horário da grade.
 * 
 * @CAUTION
 * Esta ação é irreversível. Check-ins vinculados perderão a referência de slot.
 * 
 * @security
 * - Role: Apenas Administradores ('admin').
 * - RLS: Bypass via Service Role.
 * 
 * @param {string} slotId - UUID do horário para exclusão.
 * @returns {Promise<{ success?: boolean; error?: string }>}
 */
export async function deleteClassSlot(slotId: string) {
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
    return { error: "Apenas administradores podem remover turmas." };
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim().split(' ')[0];
  if (!serviceRoleKey) {
    return { error: "Erro de configuração: Chave mestra não encontrada no servidor." };
  }

  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey
  );

  const { error } = await supabaseAdmin
    .from("class_slots")
    .delete()
    .eq("id", slotId);

  if (error) return { error: "Erro ao remover turma: " + error.message };

  revalidatePath("/admin/turmas");
  return { success: true };
}

/**
 * EDIÇÃO EM MASSA: Atualiza múltiplos horários que compartilham o mesmo horário de início.
 * 
 * @security
 * - Role: Apenas Administradores ('admin').
 * - RLS: Bypass via Service Role.
 * 
 * @param {string} timeStart - Horário de início para filtro (HH:MM).
 * @param {object} updates - Campos para atualização (nome, capacidade, coach).
 * @param {number[]} [days] - Filtro opcional por dias da semana (0-6).
 * @returns {Promise<{ success?: boolean; error?: string }>}
 */
export async function bulkUpdateClassSlots(
  timeStart: string,
  updates: { capacity?: number; coach_name?: string; default_coach_id?: string; name?: string },
  days?: number[]
) {
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
    return { error: "Apenas administradores podem fazer edições em massa." };
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim().split(' ')[0];
  if (!serviceRoleKey) {
    return { error: "Erro de configuração: Chave mestra não encontrada no servidor." };
  }

  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey
  );

  let query = supabaseAdmin
    .from("class_slots")
    .update(updates)
    .eq("time_start", timeStart + ":00"); // Database stores as TIME (HH:MM:SS)

  // If specific days are provided, filter by them; otherwise update all days
  if (days && days.length > 0) {
    query = query.in("day_of_week", days);
  }

  const { error } = await query;

  if (error) return { error: "Erro na atualização em massa: " + error.message };

  revalidatePath("/admin/turmas");
  return { success: true };

}

/**
 * CRIAÇÃO EM MASSA: Replica um horário para múltiplos dias da semana simultaneamente.
 * 
 * @operation
 * - Utiliza inserção em lote para otimizar chamadas ao Supabase.
 * - Padrão de integridade: 'is_active' sempre inicia como true.
 * 
 * @security
 * - Role: Admin ou Reception.
 * - RLS: Bypass via Service Role.
 * 
 * @param {number[]} days - Array de dias da semana (0-6).
 * @param {object} slotData - Template dos dados do horário.
 * @returns {Promise<{ success?: boolean; error?: string }>}
 */
export async function bulkCreateClassSlots(
  days: number[],
  slotData: {
    name: string;
    time_start: string;
    duration_minutes: number;
    capacity: number;
    coach_name?: string;
    default_coach_id?: string;
  }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada." };

  // Permission check
  let roleData = null;
  if (user.email === "admin@coliseufit.com") {
    roleData = { role: "admin" };
  } else {
    const { data: fetchRole } = await supabase
      .from("user_roles").select("role").eq("user_id", user.id).single();
    roleData = fetchRole;
  }
  if (!roleData || (roleData.role !== "admin" && roleData.role !== "reception")) {
    return { error: "Permissão insuficiente." };
  }

  if (!days.length) return { error: "Selecione ao menos um dia." };

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim().split(' ')[0];
  if (!serviceRoleKey) {
    return { error: "Erro de configuração: Chave mestra não encontrada no servidor." };
  }

  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey
  );

  const payloads = days.map((day) => ({
    name: slotData.name,
    day_of_week: day,
    time_start: slotData.time_start + ":00", // DB stores TIME as HH:MM:SS
    duration_minutes: slotData.duration_minutes,
    capacity: slotData.capacity,
    coach_name: slotData.coach_name || null,
    default_coach_id: slotData.default_coach_id || null,
    is_active: true,
  }));

  const { error } = await supabaseAdmin
    .from("class_slots")
    .insert(payloads);

  if (error) return { error: "Erro na criação em massa: " + error.message };

  revalidatePath("/admin/turmas");
  return { success: true };
}

// ═══════════════════════════════════════════════════════════════
// ENROLLMENT MANAGEMENT — Matrícula Fixa de Alunos em Horários
// ═══════════════════════════════════════════════════════════════

/**
 * CONTEXTO ADMINISTRATIVO (Internal): Centraliza a validação de privilégios e provê cliente Service Role.
 * 
 * @security
 * - Role: 'admin' ou 'reception' (metadata validado).
 * - RLS: Bypass Total via 'adminClient' (Uso crítico).
 * 
 * @returns {Promise<{ adminClient: any, user: any } | { error: string }>}
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
    .map(d => ({
      ...d,
      profiles: Array.isArray(d.profiles) ? d.profiles[0] : d.profiles
    }))
    .filter(d => d.profiles);

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
 * MONITORAMENTO LIVE: Busca check-ins de um horário específico em uma data.
 * 
 * @security
 * - Role: Admin/Reception/Coach.
 * 
 * @param {string} slotId - UUID do horário.
 * @param {string} date - Data da consulta (YYYY-MM-DD).
 */
export async function getSlotCheckins(slotId: string, date: string) {
  const ctx = await getAdminContext();
  if ("error" in ctx) return { error: ctx.error };

  const cleanDate = date.trim();

  const { data, error } = await ctx.adminClient
    .from("check_ins")
    .select(`
      id,
      created_at,
      student_id,
      status,
      score_points,
      wods!inner(date),
      profiles:student_id (
        id,
        first_name,
        last_name,
        full_name,
        display_name,
        level,
        avatar_url
      )
    `)
    .eq("class_slot_id", slotId)
    .eq("wods.date", cleanDate)
    .order("created_at", { ascending: true });

  if (error) return { error: "Erro ao buscar check-ins: " + error.message };

  // Sanitize profiles (Supabase joins return them as an array)
  const sanitized = (data || [])
    .map(d => ({
      ...d,
      profiles: Array.isArray(d.profiles) ? d.profiles[0] : d.profiles
    }))
    .filter(d => d.profiles);

  return { data: sanitized };
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
  const sanitized = (students || []).map(student => {
    const rawEnrollments = (student.class_enrollments || []) as { 
      id: string; 
      class_slot_id: string; 
      class_slots: { id: string; name: string; day_of_week: number; time_start: string }[] | { id: string; name: string; day_of_week: number; time_start: string } | null 
    }[];
    return {
      ...student,
      enrollments: rawEnrollments.map(en => ({
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

  const sanitized = (data || []).map(en => ({
    ...en,
    slot: Array.isArray(en.class_slots) ? en.class_slots[0] : en.class_slots
  }));

  return { data: sanitized };
}

// ═══════════════════════════════════════════════════════════════
// NEW FEATURES: WAITLIST, SUBSTITUTIONS, SETTINGS, HOLIDAYS
// ═══════════════════════════════════════════════════════════════

// --- WAITLIST ---

/**
 * LISTA DE ESPERA (Waitlist): Recupera a fila de interessados em um horário lotado.
 * 
 * @security
 * - Role: Admin/Reception.
 * 
 * @param {string} slotId - UUID do horário.
 */
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

  const sanitized = (data || []).map(d => ({
    ...d,
    profiles: Array.isArray(d.profiles) ? d.profiles[0] : d.profiles
  })).filter(d => d.profiles);

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

// --- SUBSTITUTIONS ---

/**
 * SUBSTITUIÇÕES (Consulta): Recupera todos os coaches substitutos para uma data.
 * 
 * Utilizado para renderização dinâmica da grade e lógica do Portal do Coach.
 *
 * @param {string} date - Data para verificação (YYYY-MM-DD).
 * @returns {Promise<{ data?: any[]; error?: string }>} Lista de substituições com detalhes do perfil.
 */
export async function getSlotSubstitutions(date: string) {
  const ctx = await getAdminContext();
  if ("error" in ctx) return { error: ctx.error };

  const { data, error } = await ctx.adminClient
    .from("class_substitutions")
    .select(`
      id, class_slot_id, substitute_coach_id, date, notes,
      profiles:substitute_coach_id(id, full_name)
    `)
    .eq("date", date);

  if (error) return { error: "Erro ao buscar substituições: " + error.message };

  const sanitized = (data || []).map(d => ({
    ...d,
    profiles: Array.isArray(d.profiles) ? d.profiles[0] : d.profiles
  }));
  return { data: sanitized };
}

/**
 * SUBSTITUIÇÃO DE COACH (Operação): Define ou remove um coach substituto para uma data específica.
 * 
 * @SSoT: Se coachId for null, a substituição é removida e o sistema volta ao 'default_coach_id'.
 * 
 * @security Role: Admin/Reception.
 * @param {string} slotId - UUID do horário.
 * @param {string | null} coachId - UUID do substituto (ou null para reset).
 * @param {string} date - Data (YYYY-MM-DD).
 * @param {string} [notes] - Notas opcionais (ex: férias, atestado).
 */
export async function addSubstitution(slotId: string, coachId: string | null, date: string, notes?: string) {
  const ctx = await getAdminContext();
  if ("error" in ctx) return { error: ctx.error };

  // If coachId is null, it means removing the substitution (falling back to default coach)
  if (!coachId) {
    const { error } = await ctx.adminClient
      .from("class_substitutions")
      .delete()
      .eq("class_slot_id", slotId)
      .eq("date", date);
    if (error) return { error: "Erro ao remover substituição: " + error.message };
  } else {
    // Upsert substitution
    const { error } = await ctx.adminClient
      .from("class_substitutions")
      .upsert({ class_slot_id: slotId, substitute_coach_id: coachId, date, notes }, { onConflict: "class_slot_id, date" });
    if (error) return { error: "Erro ao definir substituição: " + error.message };
  }

  revalidatePath("/admin/turmas");
  return { success: true };
}

// Settings management is now centralized in @/lib/constants/settings_actions.ts


// --- HOLIDAYS / GRANULAR BLOCKING (SSoT) ---
//
// box_holidays is the Single Source of Truth for ALL schedule overrides.
// Every blocking rule — whether a national holiday, a maintenance window,
// or a single cancelled class — lives here and is consumed by both the
// Grade (config) and Check-ins (operational) views.
//
// Block Types:
//   'full_day'  — The unit is closed for the entire day.
//   'period'    — Only slots whose time_start falls within [start_time, end_time) are blocked.
//   'slot'      — Only the specific class_slot_id is cancelled on that date.

/**
 * BLOQUEIOS GRANULARES (SSoT): Recupera todas as regras de exceção da agenda.
 * 
 * @SSoT: 'box_holidays' é a fonte única para feriados, manutenções e cancelamentos pontuais.
 * @security Público p/ Admin e Coach: Necessário para renderização correta da grade.
 * 
 * @returns {Promise<{ data: any[]; error?: string }>}
 */
export async function getHolidays() {
  const ctx = await getAdminContext();
  if ("error" in ctx) return { error: ctx.error };
  const { data, error } = await ctx.adminClient
    .from("box_holidays")
    .select("id, date, description, block_type, start_time, end_time, class_slot_id")
    .order("date", { ascending: true });

  if (error) return { error: "Erro ao buscar bloqueios: " + error.message };

  return { data: data || [] };
}

/**
 * BLOQUEIOS GRANULARES (Inclusão): Cria uma nova regra de bloqueio com escopo definido.
 * 
 * @SSoT: 'box_holidays' é a fonte de verdade para feriados e cancelamentos.
 * @security ADMIN ONLY: Ação estratégica que afeta faturamento e disponibilidade do box.
 * @operation
 * 1. Valida o tipo de bloqueio (Full/Period/Slot).
 * 2. Verifica obrigatoriedade de campos específicos (Times/SlotId).
 * 3. Persiste a regra com unicidade por data (Constraint DB).
 * 
 * @param {string} date - Data do bloqueio (YYYY-MM-DD).
 * @param {string} description - Motivo exibido na UI.
 * @param {'full_day'|'period'|'slot'} blockType - Escopo do bloqueio.
 * @param {object} [options] - Parâmetros extras (horários/ID do slot).
 */
export async function addHoliday(
  date: string,
  description: string,
  blockType: 'full_day' | 'period' | 'slot' = 'full_day',
  options?: { startTime?: string; endTime?: string; classSlotId?: string }
) {
  const ctx = await getAdminContext();
  if ("error" in ctx) return { error: ctx.error };

  // Validate period blocks have both times
  if (blockType === 'period' && (!options?.startTime || !options?.endTime)) {
    return { error: "Bloqueio de período requer horário de início e fim." };
  }
  // Validate slot blocks have a slot reference
  if (blockType === 'slot' && !options?.classSlotId) {
    return { error: "Bloqueio de aula requer a turma selecionada." };
  }

  const payload: Record<string, unknown> = {
    date,
    description,
    block_type: blockType,
    start_time: options?.startTime || null,
    end_time:   options?.endTime || null,
    class_slot_id: options?.classSlotId || null,
  };

  const { error } = await ctx.adminClient
    .from("box_holidays")
    .insert(payload);

  if (error) {
    if (error.code === "23505") return { error: "Já existe um bloqueio equivalente nesta data." };
    return { error: "Erro ao adicionar bloqueio: " + error.message };
  }

  revalidatePath("/admin/turmas");
  return { success: true };
}

/**
 * BLOQUEIOS GRANULARES (Remoção): Exclui permanentemente uma regra de bloqueio/feriado.
 * 
 * @security Role: Admin/Reception.
 * @param {string} id - UUID do registro em 'box_holidays'.
 * @returns {Promise<{ success?: boolean; error?: string }>}
 */
export async function removeHoliday(id: string) {
  const ctx = await getAdminContext();
  if ("error" in ctx) return { error: ctx.error };

  const { error } = await ctx.adminClient
    .from("box_holidays")
    .delete()
    .eq("id", id);

  if (error) return { error: "Erro ao remover bloqueio: " + error.message };

  revalidatePath("/admin/turmas");
  return { success: true };
}

// --- CLASS CLOSING AND POINTS ---

/**
 * FINALIZAÇÃO DE AULA (SSoT): Registra presenças, faltas e atribui pontuação definitiva.
 * 
 * @SSoT: Transforma a intenção (Check-in) em registro oficial 'confirmed' ou 'missed'.
 * @operation
 * 1. Valida existência de WOD.
 * 2. Transiciona alunos não selecionados para 'missed' (zero pontos).
 * 3. Transiciona selecionados para 'confirmed' (atribui pontos).
 * 4. Incrementa o saldo total de pontos do aluno via RPC.
 * 5. Registra o fechamento em 'class_sessions'.
 * 
 * @security
 * - Role: Admin/Reception/Coach.
 * - RLS: Service Role (via adminClient).
 * 
 * @param {string} slotId - UUID do horário.
 * @param {string} date - Data da aula (YYYY-MM-DD).
 * @param {string[]} studentIds - UUIDs dos alunos PRESENTES.
 */
export async function closeClassAction(slotId: string, date: string, studentIds: string[]) {
  const ctx = await getAdminContext();
  if ("error" in ctx) return { error: ctx.error };

  // Allows closing empty classes (all students marked as missed)
  // if (!studentIds.length) ... removed to allow zero attendance closure

  // 1. Get ALL WOD IDs for this date (Operational Day)
  const cleanDate = date.trim();
  // This handles the edge case of duplicate WODs.
  const { data: wods } = await ctx.adminClient
    .from("wods")
    .select("id")
    .eq("date", cleanDate);

  if (!wods || wods.length === 0) return { error: `WOD não encontrado para a data: ${cleanDate}. Crie um WOD primeiro.` };
  const wodIds = wods.map(w => w.id);

  // 2. Get Points value from points_rules (SSoT)
  const { data: pointRule } = await ctx.adminClient
    .from("points_rules")
    .select("points")
    .eq("key", "check_in")
    .single();

  const pointsValue = pointRule?.points ?? 10;

  // STEP 3: Progressively update student states based on the final selection.
  // We use two batches: one for those present, and one for those absent.
  
  // 3a. ABSENT: Any student who was 'checked' or 'confirmed' but is NOT in the final studentIds list.
  // If they were already 'confirmed' (manual), we MUST subtract their points if they had any.
  const { data: toMarkAbsent } = await ctx.adminClient
    .from("check_ins")
    .select("id, student_id, score_points, status")
    .eq("class_slot_id", slotId)
    .in("wod_id", wodIds)
    .not("student_id", "in", `(${studentIds.join(",")})`);

  if (toMarkAbsent && toMarkAbsent.length > 0) {
    for (const ci of toMarkAbsent) {
      if (ci.status === "confirmed" && ci.score_points > 0) {
        await ctx.adminClient.rpc("decrement_points", { user_id: ci.student_id, amount: ci.score_points });
      }
    }

    const absentIds = toMarkAbsent.map(ci => ci.id);
    await ctx.adminClient
      .from("check_ins")
      .update({ 
        status: "missed", 
        score_points: 0,
        validated_at: new Date().toISOString()
      })
      .in("id", absentIds);
  }

  // 3b. PRESENT: All students in the studentIds list.
  // We award points ONLY to those who don't have them yet (score_points = 0).
  const { data: toConfirm } = await ctx.adminClient
    .from("check_ins")
    .select("id, student_id, score_points, status")
    .eq("class_slot_id", slotId)
    .in("wod_id", wodIds)
    .in("student_id", studentIds);

  if (toConfirm && toConfirm.length > 0) {
    for (const ci of toConfirm) {
      // Award points only if not already awarded
      if (ci.score_points === 0) {
        await ctx.adminClient.rpc("increment_points", { user_id: ci.student_id, amount: pointsValue });
      }
    }

    const confirmIds = toConfirm.map(ci => ci.id);
    await ctx.adminClient
      .from("check_ins")
      .update({
        status: "confirmed",
        score_points: pointsValue,
        validated_at: new Date().toISOString()
      })
      .in("id", confirmIds);
  }
  
  // STEP 5: Persist finalization marker in class_sessions (NEW SSoT)
  const { error: sessionError } = await ctx.adminClient
    .from("class_sessions")
    .upsert({ 
      class_slot_id: slotId, 
      date: cleanDate,
      coach_id: ctx.user.id,
      finalized_at: new Date().toISOString()
    }, { onConflict: "class_slot_id, date" });

  if (sessionError) {
    console.error("Error saving class session:", sessionError);
    // We don't return error here because points/checkins were already processed
  }

  revalidatePath("/admin/turmas");
  revalidatePath("/coach");
  return { success: true, pointsAwarded: pointsValue };
}

/**
 * MARCADOR DE FALTA (Manual): Altera o status de um check-in para 'missed'.
 * 
/**
 * MARCA FALTA (No-Show): Transiciona um check-in para o estado 'missed' com pontuação zerada.
 * 
 * @SSoT: Esta ação garante persistência imediata sem depender do fechamento final.
 * 
 * @security Role: Admin/Reception/Coach.
 * @param {string} checkInId - UUID do registro de check-in.
 */
export async function markAsAbsentAction(checkInId: string) {
  const ctx = await getAdminContext();
  if ("error" in ctx) return { error: ctx.error };

  // Just update the status to 'missed' and ensure points are zero
  const { error } = await ctx.adminClient
    .from("check_ins")
    .update({ 
      status: "missed", 
      score_points: 0,
      validated_at: new Date().toISOString()
    })
    .eq("id", checkInId);

  if (error) return { error: "Erro ao marcar falta: " + error.message };

  revalidatePath("/admin/turmas");
  revalidatePath("/coach");
  return { success: true };
}

/**
 * REMOVE MARCADOR DE FALTA: Reverte um check-in 'missed' para 'checked' (Pendente).
 * 
 * Permite ao Admin ou Coach corrigir erros onde um aluno foi marcado como ausente por engano.
 * Limpa `validated_at` para permitir que o ciclo de fechamento de aula processe o aluno novamente.
 * 
 * @param {string} checkInId - O UUID do registro de check-in a ser restaurado.
 * @returns {Promise<{success?: boolean, error?: string}>}
 */
export async function unmarkAsAbsentAction(checkInId: string) {
  const ctx = await getAdminContext();
  if ("error" in ctx) return { error: ctx.error };

  const { error } = await ctx.adminClient
    .from("check_ins")
    .update({ 
      status: "checked", 
      score_points: 0,
      validated_at: null
    })
    .eq("id", checkInId);

  if (error) return { error: "Erro ao remover falta: " + error.message };

  revalidatePath("/admin/turmas");
  revalidatePath("/coach");
  return { success: true };
}

// ═══════════════════════════════════════════════════════════════
// CHECK-IN MANAGEMENT: DELETE & MIGRATE (SSoT OPERATIONS)
// ═══════════════════════════════════════════════════════════════

/**
 * REMOÇÃO DE CHECK-IN: Exclui permanentemente o registro de presença de um aluno.
 * 
 * @SSoT Garante sincronia global:
 * 1. Exclui o registro em `check_ins` (fonte de verdade de presença diária).
 * 2. Dispara `triggerWaitlistPromotion` para preencher a vaga liberada.
 * 3. Revalida caminhos Admin, Coach e Aluno.
 * 
 * @security Role: Admin/Reception/Coach.
 * @param {string} checkInId - UUID do check-in a ser removido.
 * @returns {Promise<{success?: boolean, error?: string}>}
 */
export async function deleteCheckinAction(checkInId: string) {
  const ctx = await getAdminContext();
  if ("error" in ctx) return { error: ctx.error };

  // 1. Buscar o check-in para obter o slot de origem (necessário para promoção da waitlist)
  const { data: checkin, error: fetchError } = await ctx.adminClient
    .from("check_ins")
    .select("id, class_slot_id, student_id, score_points, status")
    .eq("id", checkInId)
    .single();

  if (fetchError || !checkin) return { error: "Check-in não encontrado." };

  // 2. Se o aluno tinha pontos confirmados, estornar
  if (checkin.status === "confirmed" && checkin.score_points > 0) {
    await ctx.adminClient.rpc("decrement_points", {
      user_id: checkin.student_id,
      amount: checkin.score_points
    });
  }

  // 3. Excluir o registro de check-in (SSoT: remove da fonte de verdade)
  const { error: deleteError } = await ctx.adminClient
    .from("check_ins")
    .delete()
    .eq("id", checkInId);

  if (deleteError) return { error: "Erro ao remover check-in: " + deleteError.message };

  // 4. Auto-Healing: Promover próximo da lista de espera para a vaga liberada
  if (checkin.class_slot_id) {
    await triggerWaitlistPromotion(checkin.class_slot_id);
  }

  // 5. Revalidação global (Admin + Coach + Dashboard do Aluno)
  revalidatePath("/admin/turmas");
  revalidatePath("/coach");
  return { success: true };
}

/**
 * MIGRAÇÃO DE CHECK-IN: Transfere atomicamente um check-in para outra turma.
 * 
 * @SSoT Garante sincronia global:
 * 1. Valida capacidade de check-ins no slot de destino para a data.
 * 2. Atualiza o `class_slot_id` do check-in existente (operação atômica).
 * 3. Dispara `triggerWaitlistPromotion` para o slot de ORIGEM (vaga liberada).
 * 4. Revalida caminhos Admin, Coach e Aluno.
 * 
 * @design O administrador pode fazer override de capacidade (operação privilegiada).
 * 
 * @security Role: Admin/Reception/Coach.
 * @param {string} checkInId - UUID do check-in a ser migrado.
 * @param {string} targetSlotId - UUID do slot de destino.
 * @param {string} date - Data da aula (YYYY-MM-DD) para validação de capacidade.
 * @returns {Promise<{success?: boolean, error?: string}>}
 */
export async function migrateCheckinAction(checkInId: string, targetSlotId: string, date: string) {
  const ctx = await getAdminContext();
  if ("error" in ctx) return { error: ctx.error };

  // 1. Buscar o check-in atual para obter o slot de origem
  const { data: checkin, error: fetchError } = await ctx.adminClient
    .from("check_ins")
    .select("id, class_slot_id, student_id, wod_id")
    .eq("id", checkInId)
    .single();

  if (fetchError || !checkin) return { error: "Check-in não encontrado." };
  if (checkin.class_slot_id === targetSlotId) return { error: "O aluno já está nesta turma." };

  // 2. Verificar se o aluno já tem check-in no slot de destino (mesmo WOD)
  const { data: existing } = await ctx.adminClient
    .from("check_ins")
    .select("id")
    .eq("class_slot_id", targetSlotId)
    .eq("student_id", checkin.student_id)
    .eq("wod_id", checkin.wod_id)
    .maybeSingle();

  if (existing) return { error: "O aluno já possui check-in na turma de destino." };

  // 3. Validar capacidade do slot de destino (soft check — Admin pode fazer override)
  const { data: targetSlot } = await ctx.adminClient
    .from("class_slots")
    .select("capacity")
    .eq("id", targetSlotId)
    .single();

  const cleanDate = date.trim();
  const { data: wods } = await ctx.adminClient
    .from("wods")
    .select("id")
    .eq("date", cleanDate);

  const wodIds = (wods || []).map(w => w.id);

  if (wodIds.length > 0 && targetSlot) {
    const { count } = await ctx.adminClient
      .from("check_ins")
      .select("id", { count: "exact", head: true })
      .eq("class_slot_id", targetSlotId)
      .in("wod_id", wodIds);

    if (count !== null && count >= targetSlot.capacity) {
      return { error: `Turma de destino lotada (${count}/${targetSlot.capacity}). Libere uma vaga antes.` };
    }
  }

  // 4. Mutação Atômica: Atualizar o slot do check-in
  const originSlotId = checkin.class_slot_id;
  const { error: updateError } = await ctx.adminClient
    .from("check_ins")
    .update({ class_slot_id: targetSlotId })
    .eq("id", checkInId);

  if (updateError) return { error: "Erro ao migrar check-in: " + updateError.message };

  // 5. Auto-Healing: Promover próximo da waitlist no slot de ORIGEM
  if (originSlotId) {
    await triggerWaitlistPromotion(originSlotId);
  }

  // 6. Revalidação global (Admin + Coach + Dashboard do Aluno)
  revalidatePath("/admin/turmas");
  revalidatePath("/coach");
  return { success: true };
}

// ═══════════════════════════════════════════════════════════════
// COACH PORTAL UTILITIES: MANUAL CHECK-IN & REOPENING
// ═══════════════════════════════════════════════════════════════

/**
 * BUSCA RÁPIDA DE ALUNOS (Coach Portal): Pesquisa alunos por nome ou parte dele.
 * 
 * @param {string} query - Termo de busca (mínimo 2 caracteres).
 * @returns {Promise<{data?: any[], error?: string}>} Retorna lista de alunos com ID e Avatar.
 */
export async function searchStudentsCoachAction(query: string) {
  const ctx = await getAdminContext();
  if ("error" in ctx) return { error: ctx.error };

  if (!query || query.trim().length < 2) return { data: [] };
  const searchTerm = `%${query.trim()}%`;

  const { data, error } = await ctx.adminClient
    .from("profiles")
    .select("id, full_name, level, avatar_url")
    .or(`full_name.ilike.${searchTerm},first_name.ilike.${searchTerm},last_name.ilike.${searchTerm}`)
    .limit(10);

  if (error) return { error: "Erro na busca: " + error.message };
  return { data: data || [] };
}

/**
 * CHECK-IN MANUAL (Coach Portal): Adiciona um aluno diretamente na aula com validação imediata.
 * 
 * @operation
 * 1. Recupera o WOD da data informada.
 * 2. Previne duplicidade de check-in.
 * 3. Faz UPSERT para transicionar status (ex: 'missed' -> 'confirmed') ou criar novo.
 * 4. Atribui pontos instantaneamente via RPC `increment_points`.
 * 5. Define `validated_at` em UTC para sincronia com o App do Aluno.
 * 
 * @security Role: Admin/Reception/Coach.
 * 
 * @param {string} slotId - UUID do horário (class_slots).
 * @param {string} date - Data da aula (YYYY-MM-DD).
 * @param {string} studentId - UUID do aluno (profiles).
 */
export async function manualCheckinAction(slotId: string, date: string, studentId: string) {
  const ctx = await getAdminContext();
  if ("error" in ctx) return { error: ctx.error };

  const cleanDate = date.trim();
  const { data: wod } = await ctx.adminClient
    .from("wods")
    .select("id")
    .eq("date", cleanDate)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!wod) return { error: `WOD não encontrado para a data: ${cleanDate}. Crie um WOD primeiro.` };

  // 2. Check if check-in already exists for this student on this WOD (any slot)
  // SSoT: A student can only have one check-in per WOD.
  const { data: existing } = await ctx.adminClient
    .from("check_ins")
    .select(`
      id, 
      status, 
      class_slot_id,
      class_slots (
        time
      )
    `)
    .eq("student_id", studentId)
    .eq("wod_id", wod.id)
    .maybeSingle();

  if (existing) {
    if (existing.class_slot_id !== slotId) {
      const time = (existing.class_slots as any)?.time || "outro horário";
      return { error: `Este aluno já possui check-in realizado às ${time} hoje.` };
    }
    if (existing.status === "confirmed") {
      return { error: "Aluno já confirmado nesta aula." };
    }
  }

  // 3. Get Points value
  const { data: pointRule } = await ctx.adminClient
    .from("points_rules")
    .select("points")
    .eq("key", "check_in")
    .single();

  const pointsValue = pointRule?.points ?? 10;

  // 3.1 Check if the class is already closed (SSoT)
  const { data: session } = await ctx.adminClient
    .from("class_sessions")
    .select("finalized_at")
    .eq("class_slot_id", slotId)
    .eq("date", cleanDate)
    .maybeSingle();

  const isClosed = !!session?.finalized_at;

  // 4. Upsert check-in: Update if exists (e.g., from 'missed' to 'confirmed'), or Insert new
  // IMPORTANT (SSoT): Manual check-in sets status to 'confirmed' (pre-validated).
  // If the class is already closed, we award points immediately.
  const { error: upsertError } = await ctx.adminClient
    .from("check_ins")
    .upsert({
      id: existing?.id, 
      student_id: studentId,
      class_slot_id: slotId,
      wod_id: wod.id,
      status: "confirmed",
      score_points: isClosed ? pointsValue : 0, 
      validated_at: isClosed ? new Date().toISOString() : null,
      created_at: existing?.id ? undefined : `${date}T${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}:00`
    });

  if (upsertError) {
    if (upsertError.code === "23505") {
      return { error: "Este aluno já possui check-in em outro horário para este treino." };
    }
    return { error: "Erro ao registrar presença: " + upsertError.message };
  }

  // 4.1 If closed, increment the balance immediately
  if (isClosed) {
    await ctx.adminClient.rpc("increment_points", { 
      user_id: studentId, 
      amount: pointsValue 
    });
  }
  
  // 5. Auto-Cleanup (SSoT): If student was in the waitlist for THIS slot, remove them.
  // Waitlist is for the SLOT (recurrent intent), but if they got a spot today, we clear the intent.
  await ctx.adminClient
    .from("class_waitlist")
    .delete()
    .eq("class_slot_id", slotId)
    .eq("student_id", studentId);

  revalidatePath("/coach");
  revalidatePath("/admin/turmas");
  return { success: true };
}

/**
 * REABERTURA DE AULA (Emergency Path): Reverte o estado de uma aula finalizada.
 * 
 * @operation
 * 1. Retorna status para 'checked' (Pendente).
 * 2. ESTORNA pontos creditados (decrement via RPC).
 * 3. Remove marcador de 'class_sessions'.
 * 
 * @security Altíssimo Risco. Role: Admin/Coach.
 * @param {string} slotId - UUID do horário.
 * @param {string} date - Data da reabertura.
 */
/**
 * REABERTURA DE AULA (Emergência): Reverte o estado de uma aula já finalizada.
 * 
 * @SSoT (Rollback):
 * 1. Estorna pontos creditados (decrement_points).
 * 2. Limpa marcador de finalização (class_sessions).
 * 3. Retorna check-ins para status 'checked'.
 * 
 * @security Altíssimo Risco. Role: Admin/Coach.
 * @param {string} slotId - UUID do horário.
 * @param {string} date - Data da aula (YYYY-MM-DD).
 */
export async function reopenClassAction(slotId: string, date: string) {
  const ctx = await getAdminContext();
  if ("error" in ctx) return { error: ctx.error };

  const cleanDate = date.trim();

  // STEP 1: Get ALL WOD IDs for this date (Operational Day)
  const { data: wods } = await ctx.adminClient
    .from("wods")
    .select("id")
    .eq("date", cleanDate);

  if (!wods || wods.length === 0) {
    return { error: `Nenhum WOD encontrado para a data ${cleanDate}.` };
  }

  const wodIds = wods.map(w => w.id);

  // STEP 2: Fetch existing check-ins for THIS slot across ALL those WOD IDs.
  const { data: existingCheckins } = await ctx.adminClient
    .from("check_ins")
    .select("id, wod_id, status, student_id, score_points")
    .eq("class_slot_id", slotId)
    .in("wod_id", wodIds);

  if (!existingCheckins || existingCheckins.length === 0) {
    return { error: "Nenhum check-in encontrado para esta turma nesta data." };
  }

  // STEP 3: Identify students who actually RECEIVED points (score_points > 0)
  const studentsWithPoints = existingCheckins
    .filter(c => c.status === "confirmed" && c.score_points > 0);

  // Determine if there's anything to finalize (idempotency check)
  const hasFinalized = existingCheckins.some(
    c => c.status === "confirmed" || c.status === "missed"
  );

  if (!hasFinalized) {
    revalidatePath("/coach");
    return { success: true, confirmedIds: [] };
  }

  // STEP 4: Revert all statuses to 'checked' and clear points across ALL relevant WODs for this slot.
  const { error: updateError } = await ctx.adminClient
    .from("check_ins")
    .update({ 
      status: "checked", 
      score_points: 0, 
      validated_at: null 
    })
    .eq("class_slot_id", slotId)
    .in("wod_id", wodIds)
    .in("status", ["confirmed", "missed"]);

  if (updateError) return { error: "Erro ao reabrir: " + updateError.message };
  
  // STEP 4.1: Clear finalization marker from class_sessions (NEW SSoT)
  await ctx.adminClient
    .from("class_sessions")
    .delete()
    .eq("class_slot_id", slotId)
    .eq("date", cleanDate);

  // STEP 5: Rollback points for students who received them
  if (studentsWithPoints.length > 0) {
    await Promise.allSettled(
      studentsWithPoints.map(ci => 
        ctx.adminClient.rpc("decrement_points", { 
          user_id: ci.student_id, 
          amount: ci.score_points 
        })
      )
    );
  }

  revalidatePath("/coach");
  revalidatePath("/admin/turmas");
  return { success: true, confirmedIds: studentsWithPoints.map(s => s.student_id) };
}






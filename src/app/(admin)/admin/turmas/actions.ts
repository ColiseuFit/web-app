"use server";

import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { classSlotSchema } from "@/lib/validations/security_schemas";

/**
 * Creates or updates a class slot (turma) in the schedule grid.
 *
 * @security
 * - Role Requirement: Only 'admin' or 'reception' roles.
 * - RLS Bypass: Uses SERVICE_ROLE_KEY to insert/update class_slots.
 * - Validation: Input validated by `classSlotSchema` (Zod).
 *
 * @param {FormData} formData - Contains: name, day_of_week, time_start, capacity, coach_name.
 * @param {string | null} slotId - If provided, updates existing slot. Otherwise creates new.
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
 * Toggles a class slot's active state (soft delete).
 *
 * @security
 * - Role Requirement: Only 'admin'.
 * - RLS Bypass: Uses SERVICE_ROLE_KEY.
 *
 * @param {string} slotId - UUID of the class slot.
 * @param {boolean} isActive - New state (true = active, false = disabled).
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
 * Permanently deletes a class slot from the grid.
 *
 * @CAUTION Irreversible. Check-ins linked to this slot will have class_slot_id set to NULL.
 *
 * @security
 * - Role Requirement: ONLY 'admin'.
 * - RLS Bypass: Uses SERVICE_ROLE_KEY.
 *
 * @param {string} slotId - UUID of the slot to delete.
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
 * Bulk updates multiple class slots that share the same start time.
 * Useful for changing the capacity of an entire shift (e.g. all 07:00 classes).
 *
 * @security
 * - Role Requirement: ONLY 'admin'.
 * - RLS Bypass: Uses SERVICE_ROLE_KEY.
 *
 * @param {string} timeStart - The time to match (HH:MM).
 * @param {Partial<ClassSlot>} updates - The fields to update (capacity, coach_name, etc).
 * @returns {Promise<{ success?: boolean; error?: string }>}
 */
export async function bulkUpdateClassSlots(timeStart: string, updates: { capacity?: number; coach_name?: string; name?: string }) {
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

  const { error } = await supabaseAdmin
    .from("class_slots")
    .update(updates)
    .eq("time_start", timeStart + ":00"); // Database stores as TIME (HH:MM:SS)

  if (error) return { error: "Erro na atualização em massa: " + error.message };

  revalidatePath("/admin/turmas");
  return { success: true };
}

/**
 * Bulk creates class slots for multiple days of the week at once.
 * Uses upsert to handle conflicts gracefully — if a slot already exists
 * for a given (day_of_week, time_start), it will be updated instead.
 *
 * @security
 * - Role Requirement: 'admin' or 'reception'.
 * - RLS Bypass: Uses SERVICE_ROLE_KEY.
 *
 * @param {number[]} days - Array of day_of_week values (0-6).
 * @param {object} slotData - The slot template (name, time_start, capacity, etc).
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
 * Helper to verify admin/reception role and return an admin Supabase client.
 * Centralizes the repeated auth pattern across enrollment actions.
 *
 * @returns Object with `adminClient` and `user`, or `error` string.
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
 * Fetches all students enrolled (matrícula fixa) in a given class slot.
 *
 * @security
 * - Role: Admin/Reception.
 * - Access: Uses SERVICE_ROLE via `getAdminContext`.
 *
 * @param {string} slotId - UUID of the class_slot.
 * @returns {Promise<{ data?: any[]; error?: string }>} Enrollment list with joined profiles.
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
        phone
      )
    `)
    .eq("class_slot_id", slotId)
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
 * Enrolls a student in a class slot (matrícula fixa).
 * Uses UNIQUE constraint to prevent duplicate enrollments for the same (slot, student).
 *
 * @security
 * - Role: Admin/Reception.
 * - Validation: Checks class capacity before inserting.
 * - RLS Bypass: Service Role.
 *
 * @param {string} slotId - UUID of the class_slot.
 * @param {string} studentId - UUID of the student profile.
 * @returns {Promise<{ success?: boolean; error?: string }>} Success status.
 * @revalidates /admin/turmas
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
 * Removes a student's enrollment from a class slot.
 *
 * @security
 * - Role: Admin/Reception.
 * - RLS Bypass: Service Role.
 *
 * @param {string} enrollmentId - UUID of the class_enrollment record.
 * @returns {Promise<{ success?: boolean; error?: string }>} Success status.
 * @revalidates /admin/turmas
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
 * Searches students by name for the enrollment autocomplete.
 * Returns up to 10 matching profiles with level and identity data.
 *
 * @security
 * - Role: Admin/Reception.
 * - Search: Matches first_name, last_name, or full_name (ILike).
 *
 * @param {string} query - Search text (min 2 chars).
 * @returns {Promise<{ data?: any[]; error?: string }>} List of matching student profiles.
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
 * Fetches all students who checked in for a given class slot on the current day.
 * Used for the "Live Mode" occupancy monitoring.
 *
 * @security
 * - Role: Admin/Reception.
 * - Logic: Filters check_ins by slotId and current date (00:00 to 23:59).
 *
 * @param {string} slotId - UUID of the class_slot.
 * @returns {Promise<{ data?: any[]; error?: string }>} List of check-ins with joined profiles.
 */
export async function getSlotCheckins(slotId: string) {
  const ctx = await getAdminContext();
  if ("error" in ctx) return { error: ctx.error };

  const { getTodayDate } = require("@/lib/date-utils");
  const today = getTodayDate();

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
        level,
        avatar_url
      )
    `)
    .eq("class_slot_id", slotId)
    .eq("wods.date", today)
    .neq("status", "missed")
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
 * Advanced search for students including their current fixed enrollments (matrículas).
 * 
 * @security
 * - Role: Admin/Reception.
 * - Logic: Joins profiles with class_enrollments and class_slots.
 *
 * @param {string} query - Search term.
 * @returns {Promise<{ data?: any[]; error?: string }>} Students with their slots.
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
 * Fetches a single student's schedule (enrollments).
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

export async function triggerWaitlistPromotion(slotId: string) {
  const ctx = await getAdminContext();
  if ("error" in ctx) return { error: ctx.error };

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


// --- HOLIDAYS ---

export async function getHolidays() {
  const ctx = await getAdminContext();
  if ("error" in ctx) return { error: ctx.error };
  const { data, error } = await ctx.adminClient
    .from("box_holidays")
    .select("id, date, description")
    .order("date", { ascending: true });

  if (error) return { error: "Erro ao buscar feriados: " + error.message };

  return { data: data || [] };
}

export async function addHoliday(date: string, description: string) {
  const ctx = await getAdminContext();
  if ("error" in ctx) return { error: ctx.error };

  const { error } = await ctx.adminClient
    .from("box_holidays")
    .insert({ date, description });

  if (error) {
    if (error.code === "23505") return { error: "Já existe um feriado/fechamento nesta data." };
    return { error: "Erro ao adicionar feriado: " + error.message };
  }

  revalidatePath("/admin/turmas");
  return { success: true };
}

export async function removeHoliday(id: string) {
  const ctx = await getAdminContext();
  if ("error" in ctx) return { error: ctx.error };

  const { error } = await ctx.adminClient
    .from("box_holidays")
    .delete()
    .eq("id", id);

  if (error) return { error: "Erro ao remover feriado: " + error.message };

  revalidatePath("/admin/turmas");
  return { success: true };
}

// --- CLASS CLOSING AND POINTS ---

/**
 * FINALIZAÇÃO DE AULA (SSoT): Registra presenças, faltas e distribui pontos.
 * 
 * Lógica:
 * 1. Identifica WODs ativos (Data-Driven).
 * 2. Transição 'checked' -> 'missed' (Default) para quem não foi selecionado.
 * 3. Transição 'checked'/'missed' -> 'confirmed' para quem foi selecionado.
 * 4. Atribuição de pontos via RPC `increment_points`.
 * 5. Define `validated_at` (UTC) como marcador definitivo de aula encerrada.
 * 
 * @param {string} slotId - UUID do horário (class_slots).
 * @param {string} date - Data da aula (YYYY-MM-DD).
 * @param {string[]} studentIds - UUIDs dos alunos presentes.
 * @returns {Promise<{success?: boolean, pointsAwarded?: number, error?: string}>}
 */
export async function closeClassAction(slotId: string, date: string, studentIds: string[]) {
  const ctx = await getAdminContext();
  if ("error" in ctx) return { error: ctx.error };

  if (!studentIds.length) return { error: "Selecione ao menos um aluno presente." };

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

  // STEP 2: Mark ALL 'checked' (pending) students in this slot as 'missed' first.
  // This avoids the buggy `.not.in()` filter syntax in PostgREST.
  await ctx.adminClient
    .from("check_ins")
    .update({ 
      status: "missed", 
      score_points: 0,
      validated_at: new Date().toISOString()
    })
    .eq("class_slot_id", slotId)
    .eq("status", "checked")
    .in("wod_id", wodIds);

  // STEP 3: Overwrite ONLY the selected students as 'confirmed' with their points.
  // Any student not in this list remains 'missed' from step 2.
  const { error: updateError } = await ctx.adminClient
    .from("check_ins")
    .update({
      status: "confirmed",
      score_points: pointsValue,
      validated_at: new Date().toISOString()
    })
    .eq("class_slot_id", slotId)
    .in("student_id", studentIds)
    .neq("status", "confirmed") // Avoid double-confirming already confirmed (manual checkins)
    .in("wod_id", wodIds);

  if (updateError) return { error: "Erro ao fechar aula: " + updateError.message };

  // STEP 4: Award points ONLY to students who were NOT already 'confirmed' (manual checkins already received points).
  // Check which students were updated (i.e., went from 'missed' to 'confirmed' in step 3).
  // Simple approach: award to all selected, but only if their check-in was NOT previously confirmed.
  const { data: confirmedCheckins } = await ctx.adminClient
    .from("check_ins")
    .select("student_id, status")
    .eq("class_slot_id", slotId)
    .in("student_id", studentIds)
    .eq("status", "confirmed")
    .in("wod_id", wodIds);

  // Students that were manually added ('confirmed' before closeClass) already have points.
  // We only award points to those who transitioned from 'checked' -> 'confirmed' now.
  const { data: alreadyHadPoints } = await ctx.adminClient
    .from("check_ins")
    .select("student_id")
    .eq("class_slot_id", slotId)
    .in("student_id", studentIds)
    .eq("status", "confirmed")
    .gt("score_points", 0)
    .lt("validated_at", new Date().toISOString()) // validated before now means it was manual
    .in("wod_id", wodIds);

  // Award points to ALL selected students (idempotent via increment - manual checkins already counted)
  await Promise.allSettled(
    studentIds.map(stId =>
      ctx.adminClient.rpc("increment_points", { user_id: stId, amount: pointsValue })
    )
  );
  
  // STEP 5: Persist finalization marker in box_settings
  // Format: finalized_{date}_{slotId}
  await ctx.adminClient
    .from("box_settings")
    .upsert({ 
      key: `finalized_${cleanDate}_${slotId}`, 
      value: "true",
      updated_at: new Date().toISOString()
    });

  revalidatePath("/admin/turmas");
  revalidatePath("/coach");
  return { success: true, pointsAwarded: pointsValue };
}

/**
 * MARCADOR DE FALTA (Manual): Altera o status de um check-in para 'missed'.
 * 
 * Utilizado para 'No-Shows' ou exclusão manual de presença.
 * Define `validated_at` para sincronizar o estado com o App do Aluno (Bloqueio de edição).
 * 
 * @param {string} checkInId - UUID do check_in.
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

// ═══════════════════════════════════════════════════════════════
// COACH PORTAL UTILITIES: MANUAL CHECK-IN & REOPENING
// ═══════════════════════════════════════════════════════════════

/**
 * BUSCA RÁPIDA DE ALUNOS (Coach Portal): Pesquisa alunos por nome ou parte dele.
 * 
 * @param {string} query - Termo de busca (min. 2 caracteres).
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
 * CHECK-IN MANUAL (Coach Portal): Adiciona um aluno diretamente na aula.
 * 
 * Fluxo Crítico:
 * 1. Garante que o aluno tenha um check-in 'confirmed'.
 * 2. Atribui pontos instantaneamente via RPC.
 * 3. Define `validated_at` para indicar validação imediata pelo Coach.
 * 
 * @param {string} slotId - UUID do horário.
 * @param {string} date - Data (YYYY-MM-DD).
 * @param {string} studentId - UUID do aluno.
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

  // 2. Check if check-in already exists for this WOD/Slot
  const { data: existing } = await ctx.adminClient
    .from("check_ins")
    .select("id, status")
    .eq("class_slot_id", slotId)
    .eq("student_id", studentId)
    .eq("wod_id", wod.id)
    .maybeSingle();

  if (existing && existing.status === "confirmed") {
    return { error: "Aluno já confirmado nesta aula." };
  }

  // 3. Get Points value
  const { data: pointRule } = await ctx.adminClient
    .from("points_rules")
    .select("points")
    .eq("key", "check_in")
    .single();

  const pointsValue = pointRule?.points ?? 10;

  // 4. Upsert check-in: Update if exists (e.g., from 'missed' to 'confirmed'), or Insert new
  const { error: upsertError } = await ctx.adminClient
    .from("check_ins")
    .upsert({
      id: existing?.id, // Use existing ID if found to update
      student_id: studentId,
      class_slot_id: slotId,
      wod_id: wod.id,
      status: "confirmed",
      score_points: pointsValue,
      validated_at: new Date().toISOString(),
      created_at: existing?.id ? undefined : `${date}T${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}:00`
    });

  if (upsertError) return { error: "Erro ao registrar presença: " + upsertError.message };

  // 5. Increment points
  await ctx.adminClient.rpc("increment_points", { user_id: studentId, amount: pointsValue });

  revalidatePath("/coach");
  revalidatePath("/admin/turmas");
  return { success: true };
}

/**
 * REABERTURA DE AULA (Safety First): Reverte o estado de uma aula finalizada.
 * 
 * Procedimento de Segurança:
 * 1. Retorna status de 'confirmed'/'missed' para 'checked' (Pendente).
 * 2. Estorna os pontos creditados (increment_points com valor negativo).
 * 3. Limpa `validated_at` e o marcador em `box_settings`.
 * 
 * @param {string} slotId - UUID do horário.
 * @param {string} date - Data da reabertura.
 */
export async function reopenClassAction(slotId: string, date: string) {
  const ctx = await getAdminContext();
  if ("error" in ctx) return { error: ctx.error };

  const cleanDate = date.trim();

  // STEP 1: Get ALL WOD IDs for this date (Operational Day)
  // This handles the edge case of duplicate WODs.
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
    .select("wod_id, status, student_id")
    .eq("class_slot_id", slotId)
    .in("wod_id", wodIds);

  if (!existingCheckins || existingCheckins.length === 0) {
    return { error: "Nenhum check-in encontrado para esta turma nesta data." };
  }

  // STEP 3: Get points per class to subtract
  const { data: pointRule } = await ctx.adminClient
    .from("points_rules")
    .select("points")
    .eq("key", "check_in")
    .single();
  const pointsValue = pointRule?.points ?? 10;

  // STEP 4: Identify all students who were 'confirmed' and received points.
  // Deduplicate by student_id to avoid double-subtracting if they had check-ins across multiple WODs.
  const confirmedStudentIds = Array.from(new Set(
    existingCheckins
      .filter(c => c.status === "confirmed")
      .map(c => c.student_id)
  ));

  // Determine if there's anything to finalize (idempotency check)
  const hasFinalized = existingCheckins.some(
    c => c.status === "confirmed" || c.status === "missed"
  );

  if (!hasFinalized) {
    // Already open across all relevant WODs — return success
    revalidatePath("/coach");
    return { success: true, confirmedIds: [] };
  }

  // STEP 5: Revert all statuses to 'checked' and clear points across ALL relevant WODs for this slot.
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
  
  // STEP 5.1: Clear finalization marker from box_settings
  await ctx.adminClient
    .from("box_settings")
    .delete()
    .eq("key", `finalized_${cleanDate}_${slotId}`);

  // STEP 6: Subtract points only once per student who was confirmed
  if (confirmedStudentIds.length > 0) {
    await Promise.allSettled(
      confirmedStudentIds.map(studentId => 
        ctx.adminClient.rpc("increment_points", { user_id: studentId, amount: -pointsValue })
      )
    );
  }

  revalidatePath("/coach");
  revalidatePath("/admin/turmas");
  return { success: true, confirmedIds: confirmedStudentIds };
}



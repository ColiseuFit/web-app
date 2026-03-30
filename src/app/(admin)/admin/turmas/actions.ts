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

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { error: "Erro de configuração: Chave mestra não encontrada." };
  }

  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY
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

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { error: "Erro de configuração: Chave mestra não encontrada." };
  }

  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY
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

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { error: "Erro de configuração: Chave mestra não encontrada." };
  }

  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY
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

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { error: "Erro de configuração: Chave mestra não encontrada." };
  }

  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY
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

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { error: "Erro de configuração: Chave mestra não encontrada." };
  }

  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY
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
  if (!roleData || (roleData.role !== "admin" && roleData.role !== "reception")) {
    return { error: "Permissão insuficiente." };
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { error: "Erro de configuração: Chave mestra não encontrada." };
  }

  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  return { adminClient, user };
}

/**
 * Fetches all students enrolled (matrícula fixa) in a given class slot.
 *
 * @param {string} slotId - UUID of the class_slot.
 * @returns {Promise<{ data?: Enrollment[]; error?: string }>}
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
 * Uses UNIQUE constraint to prevent duplicate enrollments.
 *
 * @param {string} slotId - UUID of the class_slot.
 * @param {string} studentId - UUID of the student profile.
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
 * @param {string} enrollmentId - UUID of the class_enrollment record.
 * @returns {Promise<{ success?: boolean; error?: string }>}
 */
export async function unenrollStudent(enrollmentId: string) {
  const ctx = await getAdminContext();
  if ("error" in ctx) return { error: ctx.error };

  const { error } = await ctx.adminClient
    .from("class_enrollments")
    .delete()
    .eq("id", enrollmentId);

  if (error) return { error: "Erro ao remover matrícula: " + error.message };

  revalidatePath("/admin/turmas");
  return { success: true };
}

/**
 * Searches students by name for the enrollment autocomplete.
 * Returns up to 10 matching profiles.
 *
 * @param {string} query - Search text (matches first_name, last_name, or full_name).
 * @returns {Promise<{ data?: Profile[]; error?: string }>}
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
    .select("id, first_name, last_name, full_name, level, avatar_url, phone")
    .or(`first_name.ilike.${searchTerm},last_name.ilike.${searchTerm},full_name.ilike.${searchTerm}`)
    .limit(10);

  if (error) return { error: "Erro na busca: " + error.message };
  return { data: data || [] };
}

/**
 * Fetches all students who checked in (today) for a given class slot.
 *
 * @param {string} slotId - UUID of the class_slot.
 * @returns {Promise<{ data?: any[]; error?: string }>}
 */
export async function getSlotCheckins(slotId: string) {
  const ctx = await getAdminContext();
  if ("error" in ctx) return { error: ctx.error };

  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await ctx.adminClient
    .from("check_ins")
    .select(`
      id,
      created_at,
      student_id,
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
    .gte("created_at", `${today}T00:00:00`)
    .lte("created_at", `${today}T23:59:59`)
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

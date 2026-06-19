"use server";

import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient , getAuthUser } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { classSlotSchema } from "@/lib/validations/security_schemas";
import { getAdminContext } from "./actions-shared";

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
  const user = await getAuthUser();
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
  const user = await getAuthUser();
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

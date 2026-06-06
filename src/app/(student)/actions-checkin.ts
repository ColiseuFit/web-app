"use server";

import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { 
  getTodayDate, 
  isTimePast, 
  checkIsSlotBlocked, 
  resolveSlotCoach, 
  calculateSlotOccupancy,
  Holiday 
} from "@/lib/date-utils";
import {
  checkInSchema,
  cancelCheckInSchema,
} from "@/lib/validations/security_schemas";

/**
 * BUSCA DE DISPONIBILIDADE (SSoT): Recupera as turmas e calcula o estado operacional.
 * 
 * @logic
 * 1. Filtra por `day_of_week` (Grade estrutural).
 * 2. `is_past`: Define se passou do horário inicial + 15 minutos (Regra de Box).
 * 3. `is_finished`: Determina se a aula já foi processada via motor de Score (check_ins validado).
 * 4. `is_blocked`: Cruza com `box_holidays` (Feriados e Bloqueios granulares).
 * 5. `occupied_count`: Soma check-ins (hoje/passado) ou matrículas fixas (futuro).
 * 
 * @security 
 * - Alinhado com `America/Sao_Paulo` (UTC Alignment para data local).
 * - Utiliza cliente elevado do Supabase via `SUPABASE_SERVICE_ROLE_KEY` estritamente
 *   para contagem numérica de ocupação. Isso evita vazamento de dados confidenciais
 *   de outros check-ins que seriam bloqueados pela RLS do perfil de estudante padrão.
 * 
 * @param {string} date - Data alvo para busca no formato YYYY-MM-DD.
 * @returns {Promise<{data?: Array<{id: string, name: string, time_start: string, capacity: number, is_past: boolean, is_finished: boolean, is_blocked: boolean, block_description: string | null, coach_name: string, occupied_count: number}>, error?: string}>} Retorna as turmas e contagem de ocupação ou erro do Supabase.
 * @throws {Error} Exceção tratada em caso de falha de conexão.
 */
export async function getAvailableSlots(date: string): Promise<{ 
  data?: { 
    id: string; 
    name: string; 
    time_start: string; 
    capacity: number; 
    is_past: boolean; 
    is_finished: boolean;
    is_blocked: boolean;
    block_description: string | null;
    coach_name: string;
    occupied_count: number;
  }[]; 
  error?: string 
}> {
  const supabase = await createClient();
  
  // UTC Enforcement: Garante data estável fixando meio-dia UTC para cálculo de dia da semana
  const dateObj = new Date(date + "T12:00:00Z"); 
  const dayOfWeek = dateObj.getUTCDay();
  const todayStr = getTodayDate();
  const isToday = date === todayStr;

  // 1. Buscar todas as turmas ativas do dia, incluindo substituições para resolver o Coach
  const { data: slots, error } = await supabase
    .from("class_slots")
    .select(`
      *,
      profiles:default_coach_id (full_name),
      class_substitutions (
        substitute_coach_id,
        profiles:substitute_coach_id (full_name),
        date
      )
    `)
    .eq("day_of_week", dayOfWeek)
    .eq("is_active", true)
    .order("time_start", { ascending: true });

  if (error) return { error: error.message };
  if (!slots) return { data: [] };

  // 2. SSoT: Buscar Bloqueios / Feriados Granulares
  const { data: holidays } = await supabase
    .from("box_holidays")
    .select("*")
    .eq("date", date);

  // 3. SSoT: Buscar finalizações de aula
  const { data: finishedSessions } = await supabase
    .from("class_sessions")
    .select("class_slot_id")
    .eq("date", date)
    .not("finalized_at", "is", null);

  const finishedSlotIds = new Set(finishedSessions?.map(s => s.class_slot_id) || []);

  // 4. SSoT: Occupancy (Data-agnostic calculation)
  const { data: enrollments } = await supabase
    .from("class_enrollments")
    .select("class_slot_id, student_id");

  /**
   * @security Service Role Client para contagem de ocupação.
   * A tabela check_ins possui RLS que restringe SELECT ao próprio student_id (auth.uid()),
   * impedindo que um aluno veja check-ins de outros alunos. Para calcular a ocupação
   * real da turma, usamos service_role temporário. Apenas a contagem numérica é
   * exposta ao cliente.
   */
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const adminClient = serviceRoleKey
    ? createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey)
    : null;

  const occupancyClient = adminClient || supabase;

  const { data: checkIns } = await occupancyClient
    .from("check_ins")
    .select("class_slot_id, student_id, wods!inner(date)")
    .eq("wods.date", date)
    .neq("status", "missed");

  // Group by slotId para busca rápida
  const studentsBySlot: Record<string, { enroll: string[], checkin: string[] }> = {};
  
  enrollments?.forEach(e => {
    if (!studentsBySlot[e.class_slot_id]) studentsBySlot[e.class_slot_id] = { enroll: [], checkin: [] };
    studentsBySlot[e.class_slot_id].enroll.push(e.student_id);
  });

  checkIns?.forEach(c => {
    if (!c.class_slot_id) return;
    if (!studentsBySlot[c.class_slot_id]) studentsBySlot[c.class_slot_id] = { enroll: [], checkin: [] };
    studentsBySlot[c.class_slot_id].checkin.push(c.student_id);
  });

  // 5. Processar metadados com SSoT compartilhado
  const enrichedData = slots.map(slot => {
    let isPast = false;
    
    if (date < todayStr) {
      isPast = true;
    } else if (isToday) {
      isPast = isTimePast(slot.time_start, 15); // Tolerância de 15 minutos do Box
    }

    const isFinished = finishedSlotIds.has(slot.id);
    
    // Resolve Bloqueio Granular (SSoT date-utils)
    const blockRule = checkIsSlotBlocked(slot.id, slot.time_start, date, (holidays || []) as Holiday[]);
    
    // Resolve o coach ativo (considerando substituições de grade)
    const coachData = resolveSlotCoach(slot, date);
    
    // Resolve Ocupação
    const slotData = studentsBySlot[slot.id];
    const occupied_count = calculateSlotOccupancy(
      slotData?.enroll || [],
      slotData?.checkin || []
    );

    return {
      id: slot.id,
      name: slot.name,
      time_start: slot.time_start,
      capacity: slot.capacity,
      is_past: isPast,
      is_finished: isFinished,
      is_blocked: !!blockRule,
      block_description: blockRule?.description || null,
      coach_name: coachData.name,
      occupied_count
    };
  });

  return { data: enrichedData };
}

/**
 * SINALIZAÇÃO DE PRESENÇA (Check-in): Registra a intenção de treino do aluno.
 * 
 * @SSoT Rules:
 * 1. Pendente: Status inicial "checked" com 0 pontos acumulados.
 * 2. Troca de Horário: Permite alteração de turma (UPDATE) se o treino não foi validado.
 * 3. Validação do Coach: Os pontos são atribuídos apenas na validação da presença pelo Coach.
 * 4. Proteção de Histórico: Impede qualquer alteração pós `validated_at`.
 * 
 * @security
 * - RBAC/RLS: Match automático via `auth.uid() = student_id` garantido por políticas da tabela check_ins.
 * - Zod: Validação de tipagem e formato via `checkInSchema`.
 * 
 * @param {string} wodId - UUID do WOD.
 * @param {string} [timeSlot] - Horário formatado legível selecionado.
 * @param {string} [classSlotId] - UUID da turma escolhida.
 * @returns {Promise<{success?: boolean, error?: string, message?: string}>} Retorna status de sucesso ou mensagem de erro.
 * @throws {Error} Retorna erro estruturado caso ocorra falha.
 */
export async function performCheckIn(
  wodId: string, 
  timeSlot?: string, 
  classSlotId?: string
): Promise<{ success?: boolean; error?: string; message?: string }> {
  // 0. Validação de Schema
  const validation = checkInSchema.safeParse({ wodId, timeSlot, classSlotId });
  if (!validation.success) {
    return { error: "Dados de check-in inválidos." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Usuário não autenticado." };
  }

  // 0.15 Buscar dados do WOD para validação de bloqueios
  const { data: wodRaw } = await supabase
    .from("wods")
    .select("date")
    .eq("id", wodId)
    .single();

  const wodDateStr = wodRaw?.date;
  if (!wodDateStr) {
    return { error: "WOD não encontrado ou inativo." };
  }

  // 0.2 Buscar feriados/bloqueios do dia (SSoT)
  const { data: holidays } = await supabase
    .from("box_holidays")
    .select("*")
    .eq("date", wodDateStr);

  // 0.3 Obter horário da turma
  let slotTime = "00:00:00";
  if (classSlotId) {
    const { data: slot } = await supabase
      .from("class_slots")
      .select("time_start")
      .eq("id", classSlotId)
      .single();
    if (slot) slotTime = slot.time_start;
  }

  const blockRule = checkIsSlotBlocked(
    classSlotId || "", 
    slotTime, 
    wodDateStr, 
    (holidays || []) as Holiday[]
  );

  if (blockRule) {
    return { error: `Operação Bloqueada: ${blockRule.description}` };
  }

  // 1. Verificar se já existe check-in para este WOD
  const { data: existing } = await supabase
    .from("check_ins")
    .select("id, validated_at")
    .eq("student_id", user.id)
    .eq("wod_id", wodId)
    .maybeSingle();

  if (existing) {
    // Bloqueia cancelamento/troca se a aula já foi finalizada pelo professor
    if (existing.validated_at) {
      return { error: "Este treino já foi validado pelo professor. Não é possível trocar o horário agora." };
    }

    // UPDATE: Troca de horário
    const { error: updateError } = await supabase
      .from("check_ins")
      .update({
        class_slot_id: classSlotId,
        time_slot: timeSlot,
      })
      .eq("id", existing.id);

    if (updateError) {
      return { error: "Erro ao trocar horário: " + updateError.message };
    }
  } else {
    // INSERT: Novo check-in
    const { error: checkinError } = await supabase
      .from("check_ins")
      .insert({
        student_id: user.id,
        wod_id: wodId,
        class_slot_id: classSlotId,
        time_slot: timeSlot,
        status: "checked",
        score_points: 0, 
        validated_at: null
      });

    if (checkinError) {
      return { error: "Erro ao sinalizar presença: " + checkinError.message };
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/treinos");
  revalidatePath("/profile");
  revalidatePath("/admin");
  
  return { success: true };
}

/**
 * CANCELAMENTO DE CHECK-IN: Cancela a sinalização do aluno antes da validação do Coach.
 * 
 * @security
 * - RBAC/RLS: Match de `student_id = auth.uid()` protege a operação.
 * - Zod: Validação de UUID de WOD via `cancelCheckInSchema`.
 * 
 * @param {string} wodId - UUID do WOD.
 * @returns {Promise<{success?: boolean, error?: string}>} Retorna status de sucesso ou erro.
 * @throws {Error} Erro de banco de dados se houver falha de persistência.
 */
export async function cancelCheckIn(wodId: string): Promise<{ success?: boolean; error?: string }> {
  // 0. Validação de Schema
  const validation = cancelCheckInSchema.safeParse({ wodId });
  if (!validation.success) {
    return { error: "ID de treino inválido." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Usuário não autenticado." };
  }

  // 1. Deleta a sinalização
  const { error: deleteError } = await supabase
    .from("check_ins")
    .delete()
    .eq("student_id", user.id)
    .eq("wod_id", wodId);

  if (deleteError) {
    return { error: "Erro ao cancelar check-in: " + deleteError.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/profile");
  revalidatePath("/admin");

  return { success: true };
}

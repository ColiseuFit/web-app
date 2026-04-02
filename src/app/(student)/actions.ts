"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getTodayDate, isTimePast } from "@/lib/date-utils";

import {
  checkInSchema,
  cancelCheckInSchema,
  personalRecordSchema,
  updateTargetSchema,
  goalSchema,
  wodResultSchema,
} from "@/lib/validations/security_schemas";

/**
 * BUSCA DE DISPONIBILIDADE (SSoT): Recupera as turmas de uma data e calcula o estado operacional.
 * 
 * Lógica de Visibilidade:
 * 1. Filtra por `day_of_week`.
 * 2. `is_past`: Define se passou do horário inicial + 15 minutos (Tolerância Coliseu).
 * 3. `is_finished`: Verifica se o Coach validou a aula via `validated_at` na tabela `check_ins`.
 * 
 * @security 
 * - Alinhado com `America/Sao_Paulo` via `getTodayDate()`.
 * 
 * @param {string} date - Data alvo (YYYY-MM-DD).
 */
export async function getAvailableSlots(date: string): Promise<{ data?: { id: string; name: string; time_start: string; capacity: number; is_past: boolean; is_finished: boolean }[]; error?: string }> {
  const supabase = await createClient();
  
  const dateObj = new Date(date + "T12:00:00Z"); 
  const dayOfWeek = dateObj.getUTCDay();
  const todayStr = getTodayDate();
  const isToday = date === todayStr;

  // 1. Buscar todas as turmas ativas do dia
  const { data: slots, error } = await supabase
    .from("class_slots")
    .select("*")
    .eq("day_of_week", dayOfWeek)
    .eq("is_active", true)
    .order("time_start", { ascending: true });

  if (error) return { error: error.message };
  if (!slots) return { data: [] };

  // 2. Buscar quais dessas turmas já foram "Finalizadas" pelo Coach na data solicitada
  // SSoT: Uma aula está finalizada se houver QUALQUER check-in validado para aquele slot/data.
  const { data: finishedMarkers } = await supabase
    .from("check_ins")
    .select("class_slot_id, wods!inner(date)")
    .eq("wods.date", date)
    .not("validated_at", "is", null);

  const finishedSlotIds = new Set(finishedMarkers?.map(m => m.class_slot_id) || []);

  // 3. Processar metadados
  const enrichedData = slots.map(slot => {
    const isPast = isToday ? isTimePast(slot.time_start, 15) : false;
    const isFinished = finishedSlotIds.has(slot.id);

    return {
      id: slot.id,
      name: slot.name,
      time_start: slot.time_start,
      capacity: slot.capacity,
      is_past: isPast,
      is_finished: isFinished
    };
  });

  return { data: enrichedData };
}

/**
 * SINALIZAÇÃO DE PRESENÇA (Check-in): Registro de intenção de treino do aluno.
 * 
 * Regras Operacionais (SSoT):
 * 1. **Pendente**: Inicialmente entra como status `checked`.
 * 2. **Bloqueios**: Feriados (`box_holidays`) ou duplicidade (1 check-in/aluno/WOD).
 * 3. **Validação**: A Pontuação só é creditada se o Coach validar a aula (`closeClassAction`).
 * 
 * @security
 * - Validação de schema via Zod (`checkInSchema`).
 * - Proteção via RLS no Supabase (policy per-user).
 * 
 * @param {string} wodId - UUID do WOD.
 * @param {string} timeSlot - Horário (ex: "08:00").
 * @param {string} classSlotId - UUID da grade de horários.
 */
export async function performCheckIn(wodId: string, timeSlot?: string, classSlotId?: string) {
  // 0. Validation
  const validation = checkInSchema.safeParse({ wodId, timeSlot, classSlotId });
  if (!validation.success) {
    return { error: "Dados de check-in inválidos." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Usuário não autenticado." };
  }

  const todayStr = getTodayDate();
  const { data: holiday } = await supabase
    .from("box_holidays")
    .select("description")
    .eq("date", todayStr)
    .maybeSingle();

  if (holiday) {
    return { error: `O box está fechado hoje: ${holiday.description}` };
  }

  // 1. Verificar se já existe check-in para este WOD
  const { data: existing } = await supabase
    .from("check_ins")
    .select("id")
    .eq("student_id", user.id)
    .eq("wod_id", wodId)
    .maybeSingle();

  if (existing) {
    return { error: "Você já realizou o check-in para este treino." };
  }

  // 2. Criar a sinalização de Check-in (Pontos zerados até validação do Coach)
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

  // A Pontuação NÃO é incrementada aqui automaticamente conforme nova regra de negócio.
  // A validação de Pontos será feita pelo Professor ao encerrar a aula.

  revalidatePath("/dashboard");
  revalidatePath("/treinos");
  revalidatePath("/profile");
  revalidatePath("/admin");
  
  return { success: true };
}

/**
 * Cancela o check-in do aluno antes da validação do Coach.
 * 
 * @security
 * - Validação de schema via Zod (`cancelCheckInSchema`).
 * - Garante que o aluno só delete seus próprios registros via `auth.uid() = student_id`.
 * 
 * @param {string} wodId - O ID do WOD para o qual o check-in será cancelado.
 * @returns {Promise<{success?: boolean, error?: string}>}
 */
export async function cancelCheckIn(wodId: string) {
  // 0. Validation
  const validation = cancelCheckInSchema.safeParse({ wodId });
  if (!validation.success) {
    return { error: "ID de treino inválido." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Usuário não autenticado." };
  }

  // 1. Deleta o registro de sinalização
  const { error: deleteError } = await supabase
    .from("check_ins")
    .delete()
    .eq("student_id", user.id)
    .eq("wod_id", wodId);

  if (deleteError) {
    return { error: "Erro ao cancelar check-in: " + deleteError.message };
  }

  // Como a Pontuação não foi dada na sinalização, não há necessidade de estorno aqui.

  revalidatePath("/dashboard");
  revalidatePath("/profile");
  revalidatePath("/admin");

  return { success: true };
}

/**
 * Registra ou atualiza um Recorde Pessoal (PR) do aluno.
 * 
 * @security
 * - Validação rigorosa de tipos e ranges via `personalRecordSchema` (Zod).
 * - Restrição de acesso ao ID do usuário autenticado no Supabase (RLS).
 * - Tratamento de conflitos (UPSERT) via constraint `pr_unique_student_movement`.
 * 
 * @param {any} formData - Objeto contendo `movement_id`, `value`, `unit` e `date`.
 * @returns {Promise<{success?: boolean, error?: string}>}
 * @throws {Error} Retorna erro se a validação do Zod falhar ou se houver erro de banco.
 */
export async function upsertPersonalRecord(formData: Record<string, unknown>) {
  const validation = personalRecordSchema.safeParse(formData);
  if (!validation.success) {
    return { error: "Dados inválidos: " + validation.error.message };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  // Mapear movement_key para movement_id (compatibilidade schema DB)
  const { movement_key, ...restData } = validation.data;
  const { error } = await supabase
    .from("personal_records")
    .upsert({
      student_id: user.id,
      movement_id: movement_key,
      ...restData,
      date: restData.date || new Date().toISOString().split("T")[0],
    }, { onConflict: "student_id,movement_id" });

  if (error) return { error: error.message };
  
  revalidatePath("/progresso");
  revalidatePath("/profile");
  return { success: true };
}

/**
 * Atualiza a meta de frequência semanal de treinos.
 * 
 * @security
 * - Valida se o target está entre 1 e 7 via `updateTargetSchema`.
 * - Garante que as configurações sejam individuais por `auth.uid()`.
 * 
 * @param {number} weekly_target - Quantidade de dias meta por semana.
 * @returns {Promise<{success?: boolean, error?: string}>}
 */
export async function updateWeeklyTarget(weekly_target: number) {
  const validation = updateTargetSchema.safeParse({ weekly_target });
  if (!validation.success) return { error: "Meta inválida" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const { error } = await supabase
    .from("student_settings")
    .upsert({
      student_id: user.id,
      weekly_frequency_target: validation.data.weekly_target,
    }, { onConflict: "student_id" });

  if (error) return { error: error.message };

  revalidatePath("/progresso");
  return { success: true };
}

/**
 * Cria um novo objetivo estratégico pessoal (Meta) para o aluno.
 * 
 * @security
 * - Validação de schema via `goalSchema` (Zod).
 * - Persistência vinculada ao `auth.uid()`.
 * 
 * @param {string} title - Descrição do objetivo (ex: "Fazer meu primeiro Muscle-up").
 */
export async function createGoal(title: string): Promise<{ success?: boolean; data?: { id: string; title: string; is_completed: boolean }; error?: string }> {
  const validation = goalSchema.safeParse({ title });
  if (!validation.success) return { error: "Título inválido" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const { data, error } = await supabase
    .from("student_goals")
    .insert({ student_id: user.id, title: validation.data.title })
    .select()
    .single();

  if (error) return { error: error.message };

  revalidatePath("/progresso");
  return { success: true, data };
}

/**
 * Alterna o status de conclusão de um objetivo pessoal.
 * 
 * @security
 * - Garante que o aluno só altere seus próprios objetivos via match de `student_id`.
 * 
 * @param {string} goalId - UUID do objetivo.
 * @param {boolean} currentStatus - Status booleano anterior (para inversão).
 * @returns {Promise<{success?: boolean, error?: string}>}
 */
export async function toggleGoalStatus(goalId: string, currentStatus: boolean) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const { error } = await supabase
    .from("student_goals")
    .update({ 
      is_completed: !currentStatus,
      completed_at: !currentStatus ? new Date().toISOString() : null 
    })
    .eq("id", goalId)
    .eq("student_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/progresso");
  return { success: true };
}

/**
 * Remove permanentemente um objetivo pessoal.
 * 
 * @param {string} goalId - UUID do objetivo.
 * @returns {Promise<{success?: boolean, error?: string}>}
 */
export async function deleteGoal(goalId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const { error } = await supabase
    .from("student_goals")
    .delete()
    .eq("id", goalId)
    .eq("student_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/progresso");
  return { success: true };
}

/**
 * Salva o resultado final do WOD (Tempo, Reps ou Carga).
 * Só pode ser feito após o Coach confirmar a presença do aluno.
 * 
 * @security
 * - Validação de schema via `wodResultSchema`.
 * - RLS garante que o aluno só atualize seu próprio check-in.
 * 
 * @param {string} checkInId - UUID do registro de check-in.
 * @param {string} result - String contendo o score (ex: "12:30", "150 reps").
 */
export async function updateWodResult(checkInId: string, result: string) {
  const validation = wodResultSchema.safeParse({ checkInId, result });
  if (!validation.success) return { error: "Dados de resultado inválidos." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  // 1. Atualizar o resultado
  const { error } = await supabase
    .from("check_ins")
    .update({ result: validation.data.result })
    .eq("id", checkInId)
    .eq("student_id", user.id);

  if (error) return { error: "Erro ao salvar resultado: " + error.message };

  revalidatePath("/dashboard");
  revalidatePath("/treinos");
  return { success: true };
}

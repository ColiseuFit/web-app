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
 * Student App Lifecycle Engine (Server Actions).
 * 
 * @architecture
 * - Padrão Neo-Brutalist Light: Foco em feedback instantâneo e dados de alta legibilidade.
 * - SSoT de Disponibilidade: Lógica que cruza `class_slots` com `check_ins` para calcular vagas.
 * - Gate de Pontuação: Check-ins iniciam como `checked` (0 pts) e aguardam validação do Coach.
 * 
 * @security
 * - RBAC: Todas as ações validam `auth.uid()` via context do Supabase Server.
 * - Integridade: Bloqueios geolocalizados (Timezone) e temporais (Tolerância de 15min).
 * - Esquemas: Validação estrita via Zod para prevenir injeção de dados corrompidos.
 */

/**
 * BUSCA DE DISPONIBILIDADE (SSoT): Recupera as turmas e calcula o estado operacional.
 * 
 * @logic
 * 1. Filtra por `day_of_week` (Grade estrutural).
 * 2. `is_past`: Define se passou do horário inicial + 15 minutos (Regra de Box).
 * 3. `is_finished`: Determina se a aula já foi processada via motor de Score (check_ins validado).
 * 
 * @security 
 * - Alinhado com `America/Sao_Paulo` (UTC Alignment).
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
  // SSoT: Uma aula está finalizada se houver um registro na tabela `class_sessions` com `finalized_at` não nulo.
  const { data: finishedSessions } = await supabase
    .from("class_sessions")
    .select("class_slot_id")
    .eq("date", date)
    .not("finalized_at", "is", null);

  const finishedSlotIds = new Set(finishedSessions?.map(s => s.class_slot_id) || []);

  // 3. Processar metadados
  const enrichedData = slots.map(slot => {
    let isPast = false;
    
    if (date < todayStr) {
      // Se a data selecionada é anterior a hoje, tudo é passado
      isPast = true;
    } else if (date === todayStr) {
      // Se for hoje, aplica a regra de tolerância de 15 minutos
      isPast = isTimePast(slot.time_start, 15);
    }
    // Se for data futura (date > todayStr), isPast continua false

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
 * SINALIZAÇÃO DE PRESENÇA (Check-in): Intenção de treino do aluno.
 * 
 * @SSoT Rules:
 * 1. **Pendente**: Inicialmente entra como status `checked` (Pontos Diferidos).
 * 2. **Bloqueios de Agenda**: Valida contra `box_holidays` (Data-scoped override).
 * 3. **Unicidade**: Impede múltiplos check-ins por data/aluno (Prevenção de farming).
 * 
 * @security
 * - Zod Schema: `checkInSchema`.
 * - Supabase RLS: `auth.uid() = student_id` (Policy enforcement).
 * 
 * @param {string} wodId - UUID do WOD.
 * @param {string} timeSlot - Horário selecionado.
 * @param {string} classSlotId - UUID da grade horária.
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
 * ATUALIZAÇÃO DE RESULTADO (WOD Score): Registra o desempenho (Tempo, Reps ou Carga).
 * 
 * @architecture
 * - Fluxo "Activity-First": O lançamento foi migrado do Dashboard para a aba Atividade.
 * - Gate de Confirmação: Esta ação só é permitida na UI se o `status` do check-in for 'confirmed'.
 * - Integridade: O dado é salvo como String, mas validado via schema para evitar XSS ou dados corrompidos.
 * 
 * @security
 * - Validação de schema via `wodResultSchema` (checkInId e result).
 * - RLS: Match de `student_id` garante que o aluno só altere seu próprio registro.
 * - SSoT: Centralizado na tabela `check_ins`.
 * 
 * @param {string} checkInId - UUID do registro de check-in (`public.check_ins`).
 * @param {string} result - Valor formatado (ex: "12:34", "150", "80").
 * @returns {Promise<{success?: boolean, error?: string}>}
 * @revalidates /dashboard (atualiza badges) e /treinos (atualiza feed de atividades).
 */
export async function updateWodResult(checkInId: string, result: string) {
  const validation = wodResultSchema.safeParse({ checkInId, result });
  if (!validation.success) return { error: "Dados de resultado inválidos." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  // 1. Atualizar o resultado no registro de check-in confirmado
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

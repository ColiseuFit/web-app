"use server";

import { createClient } from "@/lib/supabase/server";
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
 * 4. `is_blocked`: Cruza com `box_holidays` (Feriados e Bloqueios granulares).
 * 5. `occupied_count`: Soma check-ins (hoje/passado) ou matrículas fixas (futuro).
 * 
 * @security 
 * - Alinhado com `America/Sao_Paulo` (UTC Alignment).
 * 
 * @param {string} date - Data alvo (YYYY-MM-DD).
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
  // Fetch both fixed enrollments and actual check-ins for this specific date
  const { data: enrollments } = await supabase
    .from("class_enrollments")
    .select("class_slot_id, student_id");

  const { data: checkIns } = await supabase
    .from("check_ins")
    .select("class_slot_id, student_id, wods!inner(date)")
    .eq("wods.date", date)
    .neq("status", "missed");

  // Group by slotId for efficient lookup
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
      isPast = isTimePast(slot.time_start, 15);
    }

    const isFinished = finishedSlotIds.has(slot.id);
    
    // Resolve Bloqueio Granular (SSoT date-utils)
    const blockRule = checkIsSlotBlocked(slot.id, slot.time_start, date, (holidays || []) as Holiday[]);
    
    // Resolve the active coach for this slot (considering substitutions)
    const coachData = resolveSlotCoach(slot, date);
    
    // Resolve Occupancy with shared SSoT logic
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
 * SINALIZAÇÃO DE PRESENÇA (Check-in): Intenção de treino do aluno.
 * 
 * @SSoT Rules:
 * 1. **Pendente**: Inicialmente entra como status `checked` (Pontos Diferidos).
 * 2. **Bloqueios de Agenda**: Valida contra `box_holidays` (Data-scoped override).
 * 3. **Trocar Horário**: Permite mudar de slot (UPDATE) se o treino NÃO foi validado.
 * 4. **Proteção de Histórico**: Impede alteração ou cancelamento após `validated_at` (vaga consumida).
 * 
 * @security
 * - Zod Schema: `checkInSchema`.
 * - Supabase RLS: `auth.uid() = student_id` (Policy enforcement).
 * - Multi-tenant: Bloqueio implícito via RLS por `student_id`.
 * 
 * @param {string} wodId - UUID do WOD.
 * @param {string} timeSlot - Horário selecionado (HH:MM:SS).
 * @param {string} classSlotId - UUID da grade horária vinculada.
 * @returns {Promise<{success?: boolean, error?: string, message?: string}>}
 */
export async function performCheckIn(wodId: string, timeSlot?: string, classSlotId?: string): Promise<{ success?: boolean; error?: string; message?: string }> {
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



  // 0.15 Fetch WOD to get its exact date for block validation
  const { data: wodRaw } = await supabase
    .from("wods")
    .select("date")
    .eq("id", wodId)
    .single();

  const wodDateStr = wodRaw?.date;
  if (!wodDateStr) {
    return { error: "WOD não encontrado ou inativo." };
  }

  // 0.2 Fetch ALL holidays for the operational date (SSoT)
  // We need to check if THIS specific slot or period is blocked.
  const { data: holidays } = await supabase
    .from("box_holidays")
    .select("*")
    .eq("date", wodDateStr);

  // 0.3 If we have a classSlotId, we must fetch its start time to validate blocks
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
    // Se o treino já foi validado pelo professor, o aluno não pode mais trocar o horário/cancelar sozinho.
    if (existing.validated_at) {
      return { error: "Este treino já foi validado pelo professor. Não é possível trocar o horário agora." };
    }

    // UPDATE: O aluno já tem check-in para este WOD, então apenas atualizamos para o novo horário (Troca de Horário)
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
    // 2. Criar a sinalização de Check-in (Nova sinalização - INSERT)
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
 * - UTC Enforcement: O salvamento não altera datas nativas, mantendo SSoT da tabela `check_ins`.
 * 
 * @security
 * - Validação Híbrida: Utiliza `wodResultSchema` para barrar XSS ou formatos irregulares.
 * - RLS: Match de `student_id` garante que o aluno só altere seu próprio registro.
 * - SSoT: Centralizado na tabela `check_ins`.
 * 
 * @param {string} checkInId - UUID do registro mestre de check-in (`public.check_ins`).
 * @param {string} result - Valor bruto string formatado (ex: "12:34", "150", "300", "5+12").
 * @param {string} performanceLevel - Nível Coliseu seguido ("branco", "verde", "azul", "vermelho", "preto").
 * @returns {Promise<{success?: boolean, error?: string}>}
 * @throws {Error} Retorna erro tratado em caso de payload inválido ou sem autenticação.
 */
export async function updateWodResult(checkInId: string, result: string, performanceLevel: string) {
  const validation = wodResultSchema.safeParse({ checkInId, result, performanceLevel });
  if (!validation.success) return { error: "Dados de resultado inválidos." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  // 1. Atualizar o resultado no registro de check-in confirmado
  const { error } = await supabase
    .from("check_ins")
    .update({ 
      result: validation.data.result,
      performance_level: validation.data.performanceLevel
    })
    .eq("id", checkInId)
    .eq("student_id", user.id);

  if (error) return { error: "Erro ao salvar resultado: " + error.message };

  revalidatePath("/dashboard");
  revalidatePath("/treinos");
  revalidatePath("/profile");
  return { success: true };
}

/**
 * BUSCA DE HISTÓRICO PAGINADA (Load More Feed).
 * 
 * @architecture
 * - O(1) Time: Limitador SQL garante performance constante durante o scrolling infinito.
 * - UTC Enforcement: Datas oriundas da tabela `wods` (YYYY-MM-DD) convertidas forçadamente com `T00:00:00Z` e lidas em `UTC` para paridade visual Client/Server e evitar off-by-one errors de fuso.
 * 
 * @ssot
 * - Hierarquia da Proficiência (SSoT do Coach):
 *   1. `class_sessions`: Coach real que finalizou a aula (Checkout Administrativo).
 *   2. `class_substitutions`: Coach substituto destacado para aquele dia/horário.
 *   3. `class_slots`: Coach padrão da grade letiva.
 * 
 * @param {number} page - A página a recuperar (zero-indexed). Usa-se zero-based para query nativa SQL `range(start, end)`.
 * @param {number} limit - Extensão do lote por chamada (default 10).
 * @returns {Promise<{ success: boolean; history: any[]; hasMore: boolean; }>}
 */
export async function getPaginatedHistory(page: number, limit: number = 10) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, history: [], hasMore: false };

  // Fetch points rule
  const { data: pointRule } = await supabase
    .from("points_rules")
    .select("points")
    .eq("key", "check_in")
    .single();
  const rulePoints = pointRule?.points ?? 10;

  // Fetch student level
  const { data: student } = await supabase
    .from("students")
    .select("level")
    .eq("id", user.id)
    .single();
  const studentProfileLevel = student?.level || "branco";

  const { data: checkins, error } = await supabase
    .from("check_ins")
    .select(`
      id,
      created_at,
      status,
      result,
      performance_level,
      score_points,
      is_excellence,
      wods (
        id,
        title,
        wod_content,
        type_tag,
        date,
        time_cap,
        tags,
        result_type
      ),
      class_slots (
        time_start,
        coach_name,
        profiles:default_coach_id (
          display_name,
          full_name,
          first_name
        ),
        class_sessions (
          date,
          profiles:coach_id (
            display_name,
            full_name,
            first_name
          )
        ),
        class_substitutions (
          date,
          profiles:substitute_coach_id (
            display_name,
            full_name,
            first_name
          )
        )
      )
    `)
    .eq("student_id", user.id)
    .neq("status", "missed")
    .order("created_at", { ascending: false })
    .range(page * limit, (page + 1) * limit - 1);

  if (error) {
    console.error("Pagination fetch error:", error);
    return { success: false, history: [], hasMore: false };
  }

  const realHistory = (checkins || []).map((checkin: any) => {
    const wod = Array.isArray(checkin.wods) ? checkin.wods[0] : checkin.wods;
    if (!wod) return null;
    
    const wodDate = new Date(wod.date + "T00:00:00Z");
    const formattedDate = !isNaN(wodDate.getTime()) 
      ? wodDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", timeZone: "UTC" }).toUpperCase()
      : "DATA";

    const sessionForDay = checkin.class_slots?.class_sessions?.find(
      (s: any) => s.date === wod.date
    );

    const subForDay = checkin.class_slots?.class_substitutions?.find(
      (s: any) => s.date === wod.date
    );

    const resolveName = (profile: any) => profile?.display_name || profile?.full_name || profile?.first_name || null;

    // SSoT Precedence: Session (Finalized) > Substitution > Default
    const coachName = resolveName(sessionForDay?.profiles)
      || resolveName(subForDay?.profiles)
      || resolveName(checkin.class_slots?.profiles)
      || checkin.class_slots?.coach_name 
      || "Equipe Coliseu";

    const displayPoints = checkin.score_points > 0 
      ? checkin.score_points 
      : (checkin.status === "confirmed" ? rulePoints : 0);
    
    const metrics: any[] = [];
    if (wod.time_cap && String(wod.time_cap).trim() !== "" && String(wod.time_cap) !== "0") {
      metrics.push({ label: "TIME CAP", value: String(wod.time_cap).replace(/ min/i, ""), unit: "min" });
    }

    return {
      id: checkin.id,
      date: formattedDate,
      isoDate: wod.date,
      title: wod.title || "Treino do Dia",
      description: wod.wod_content ? wod.wod_content.slice(0, 100) + (wod.wod_content.length > 100 ? "..." : "") : "Treino programado pelo coach.",
      rawContent: wod.wod_content || "",
      typeTag: wod.type_tag || "WOD",
      resultType: wod.result_type || "reps",
      coach: coachName,
      points: displayPoints,
      result: checkin.result || null,
      performanceLevel: checkin.performance_level || null,
      studentLevel: studentProfileLevel,
      status: checkin.status,
      time: checkin.class_slots?.time_start ? String(checkin.class_slots.time_start).slice(0, 5) : null,
      tags: wod.tags || [],
      isExcellence: !!checkin.is_excellence,
      metrics: metrics,
      achievements: []
    };
  }).filter((item): item is NonNullable<typeof item> => item !== null);

  return { success: true, history: realHistory, hasMore: (checkins?.length || 0) === limit };
}

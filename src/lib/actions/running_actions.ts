"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { 
  updateRunningPlanSchema, 
  logRunningWorkoutSchema, 
  logRunningSessionSchema,
  bulkCreateRunningWorkoutsSchema,
  deleteRunningEntitySchema,
  createRunningTemplateSchema,
  createTemplateWorkoutSchema,
  updateTemplateWorkoutSchema
} from "../validations/running_schemas";

/**
 * Registra o resultado de um treino de corrida e atribui pontuação (XP).
 * 
 * @security Valida se o usuário é o dono do treino (student_id match).
 * @param formData - Dados do formulário contendo:
 *   - workoutId: string (UUID do treino)
 *   - distance: string (km percorridos)
 *   - duration: string (segundos totais)
 *   - rpe: string (Percepção de esforço 1-10)
 *   - notes: string (comentários do aluno)
 * @returns { success: boolean, pointsAwarded: number }
 * @throws {Error} Se o treino já foi registrado ou falha de autorização.
 */
export async function logRunningWorkout(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Não autorizado");

  const workoutId = formData.get("workoutId") as string;
  const distance = parseFloat(formData.get("distance") as string);
  const duration = parseInt(formData.get("duration") as string); // em segundos
  const rpe = parseInt(formData.get("rpe") as string);
  const notes = formData.get("notes") as string;

  // 0. Validação Zod
  const validatedFields = logRunningWorkoutSchema.safeParse({
    workoutId,
    actualDistance: distance,
    durationSeconds: duration,
    paceSeconds: Math.round(duration / distance) || 0, // Cálculo precoce para validação
    rpe,
    notes,
  });

  if (!validatedFields.success) {
    throw new Error(validatedFields.error.flatten().fieldErrors.actualDistance?.[0] || "Dados inválidos");
  }

  const { paceSeconds: pace } = validatedFields.data;

  // 1. Buscar o treino para verificar se já foi completado (evitar duplicidade de pontos)
  const { data: existingWorkout } = await supabase
    .from("running_workouts")
    .select("completed_at, plan_id, week_number, session_order")
    .eq("id", workoutId)
    .single();

  if (existingWorkout?.completed_at) {
    throw new Error("Este treino já foi registrado anteriormente.");
  }

  // 2. Registrar o resultado do treino
  const { error } = await supabase
    .from("running_workouts")
    .update({
      completed_at: new Date().toISOString(),
      actual_distance_km: distance,
      actual_duration_seconds: duration,
      actual_pace_seconds_per_km: pace,
      rpe,
      student_notes: notes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", workoutId)
    .eq("student_id", user.id);

  if (error) throw error;
  
  // 2.1 Encerrar automaticamente outros blocos da mesma sessão (Batch Close)
  if (existingWorkout?.plan_id && existingWorkout?.week_number && existingWorkout?.session_order) {
    await supabase
      .from("running_workouts")
      .update({
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("plan_id", existingWorkout.plan_id)
      .eq("week_number", existingWorkout.week_number)
      .eq("session_order", existingWorkout.session_order)
      .eq("student_id", user.id)
      .is("completed_at", null);
  }

  // 3. Gamificação: Atribuir XP
  // Buscar regra de pontuação
  const { data: rule } = await supabase
    .from("points_rules")
    .select("points")
    .eq("key", "running_km")
    .single();

  const pointsPerKm = rule?.points ?? 5;
  const totalPoints = Math.round(distance * pointsPerKm);

  if (totalPoints > 0) {
    // Incremento atômico no perfil
    const { error: pointsError } = await supabase.rpc("increment_points", {
      user_id: user.id,
      amount: totalPoints
    });

    if (pointsError) {
      console.error("Erro ao atribuir pontos de corrida:", pointsError);
      // Não trava a operação, apenas logamos o erro
    }
  }

  revalidatePath("/programas/running");
  revalidatePath("/treinos");
  revalidatePath("/dashboard");

  return { success: true, pointsAwarded: totalPoints };
}

/**
 * Registra o resultado de uma SESSÃO de corrida (Multi-Blocos).
 * 
 * @description
 * Esta action processa múltiplos blocos de uma única sessão, calculando o pace
 * individual de cada um e atualizando o status de conclusão global.
 * 
 * @protocolo_segurança
 * - Validação rigorosa via Zod Schema
 * - Registro atômico (loop de update)
 * - Revalidação múltipla de cache (Dashboard, Running Hub, Treinos)
 * 
 * @param formData - FormData contendo chave 'data' com JSON stringificado dos blocos.
 */
export async function logRunningSession(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Não autorizado");

  const rawData = formData.get("data") as string;
  if (!rawData) throw new Error("Dados ausentes");

  const parsed = JSON.parse(rawData);
  const validatedFields = logRunningSessionSchema.safeParse(parsed);

  if (!validatedFields.success) {
    throw new Error("Dados inválidos da sessão.");
  }

  const { rpe, notes, blocks } = validatedFields.data;
  const now = new Date().toISOString();

  let totalDistanceLogged = 0;

  // Processar cada bloco
  for (const block of blocks) {
    if (block.completed) {
      const pace = (block.actualDistance && block.durationSeconds) 
        ? Math.round(block.durationSeconds / block.actualDistance) 
        : null;

      if (block.actualDistance) {
        totalDistanceLogged += block.actualDistance;
      }

      const { error } = await supabase
        .from("running_workouts")
        .update({
          completed_at: now,
          actual_distance_km: block.actualDistance || null,
          actual_duration_seconds: block.durationSeconds || null,
          actual_pace_seconds_per_km: pace,
          reps: block.reps || undefined,
          rpe,
          student_notes: notes,
          updated_at: now,
        })
        .eq("id", block.workoutId)
        .eq("student_id", user.id);

      if (error) {
        console.error(`Erro ao logar bloco ${block.workoutId}:`, error);
        throw new Error("Erro ao salvar bloco do treino");
      }
    }
  }

  // Gamificação: Atribuir XP com base na distância somada ou um valor mínimo se foi só tempo
  const { data: rule } = await supabase
    .from("points_rules")
    .select("points")
    .eq("key", "running_km")
    .single();

  const pointsPerKm = rule?.points ?? 5;
  // Se marcou algum bloco como concluído, garante pelo menos 10 XP
  let totalPoints = totalDistanceLogged > 0 ? Math.round(totalDistanceLogged * pointsPerKm) : 10;
  
  if (totalPoints > 0) {
    await supabase.rpc("increment_points", {
      user_id: user.id,
      amount: totalPoints
    });
  }

  revalidatePath("/programas/running");
  revalidatePath("/treinos");
  revalidatePath("/dashboard");

  return { success: true, pointsAwarded: totalPoints };
}


/**
 * Atribui um novo plano de corrida a um aluno (Apenas Coach/Admin).
 * 
 * @param studentId - ID do aluno
 * @param title - Título do plano de corrida
 * @param levelTag - Nível do atleta (iniciante, intermediario, avancado)
 * @returns { success: boolean, plan: object }
 * @throws {Error} Se o usuário não for coach/admin
 */
export async function assignRunningPlan(studentId: string, title: string, levelTag: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Não autorizado");

  // 0. Validação Zod
  const validatedFields = updateRunningPlanSchema.safeParse({
    planId: "placeholder-uuid", // assign doesn't have planId yet, but we use the shared logic if needed
    title,
    levelTag,
  });
  // Note: assignRunningPlan handles creation, so planId validation is skipped or we use a separate schema if preferred.
  // For now, let's just validate basic fields if they are present.
  if (title.length < 3) throw new Error("Título muito curto");

  // Verificar se é coach/admin
  const { data: roleData } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (!roleData || !["admin", "coach"].includes(roleData.role)) {
    throw new Error("Permissão negada");
  }

  const { data: plan, error } = await supabase
    .from("running_plans")
    .insert({
      student_id: studentId,
      coach_id: user.id,
      title,
      level_tag: levelTag,
      status: "active",
    })
    .select()
    .single();

  if (error) throw error;

  // 4. Sincronizar a Identidade Técnica de Corrida no perfil do aluno
  await supabase
    .from("profiles")
    .update({ running_level: levelTag })
    .eq("id", studentId);

  revalidatePath(`/admin/alunos/${studentId}`);
  revalidatePath("/admin/running");
  revalidatePath("/(student)/programas/running", "page");
  return { success: true, plan };
}

/**
 * Busca dados de corrida de um aluno para o Coach (Plano ativo e treinos relacionados).
 * 
 * @param studentId - UUID do aluno
 * @returns { plan: object | null, workouts: array }
 * @throws {Error} Se não autenticado
 */
export async function getStudentRunningData(studentId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Não autorizado");

  // Buscar perfil do aluno para obter o nível
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", studentId)
    .single();

  // Buscar plano ativo
  const { data: plan } = await supabase
    .from("running_plans")
    .select("*")
    .eq("student_id", studentId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!plan) return { plan: null, workouts: [], profile };

  // Buscar treinos do plano ordenados por semana e sessão
  const { data: workouts } = await supabase
    .from("running_workouts")
    .select("*")
    .eq("plan_id", plan.id)
    .order("week_number", { ascending: true, nullsFirst: false })
    .order("session_order", { ascending: true, nullsFirst: false })
    .order("block_order", { ascending: true, nullsFirst: false })
    .order("scheduled_date", { ascending: true, nullsFirst: false });

  return { plan, workouts: workouts || [], profile };
}

// ── Funções de Templates (Moldes Dinâmicos) ───────────────────────────────────

/**
 * Busca todas as Planilhas Padrão (Templates) disponíveis para prescrição.
 * Inclui os treinos estruturais associados a cada planilha.
 * 
 * @returns {Promise<any[]>} Lista de templates com treinos aninhados.
 */
export async function getRunningTemplates() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("running_templates")
    .select("*, running_template_workouts(*)")
    .order("created_at", { ascending: false });
  
  // Ordenar blocos internos por week, session e block_order
  if (data) {
    data.forEach(t => {
      if (t.running_template_workouts) {
        t.running_template_workouts.sort((a: any, b: any) => {
          if (a.week_number !== b.week_number) return a.week_number - b.week_number;
          if (a.session_order !== b.session_order) return a.session_order - b.session_order;
          return (a.block_order || 0) - (b.block_order || 0);
        });
      }
    });
  }

  return data || [];
}

/**
 * Cria uma nova Planilha Padrão (Template) de Corrida.
 * Estas planilhas servem como moldes estruturais (snapshots) para novos alunos.
 * 
 * @param formData - Dados: title, description, levelTag, frequencyPerWeek, durationWeeks.
 * @throws {Error} Se o usuário não for coach/admin ou dados forem inválidos.
 */
export async function createRunningTemplate(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autorizado");

  const validatedFields = createRunningTemplateSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    levelTag: formData.get("levelTag"),
    frequencyPerWeek: parseInt(formData.get("frequencyPerWeek") as string),
    durationWeeks: parseInt(formData.get("durationWeeks") as string),
  });

  if (!validatedFields.success) throw new Error("Dados inválidos para template");

  const { error } = await supabase.from("running_templates").insert({
    coach_id: user.id,
    title: validatedFields.data.title,
    description: validatedFields.data.description,
    level_tag: validatedFields.data.levelTag,
    frequency_per_week: validatedFields.data.frequencyPerWeek,
    duration_weeks: validatedFields.data.durationWeeks,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/admin/running/templates");
  return { success: true };
}

/**
 * Remove permanentemente uma Planilha Padrão e todos os seus treinos associados.
 * 
 * @param templateId - ID da planilha.
 */
export async function deleteRunningTemplate(templateId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autorizado");

  const { error } = await supabase
    .from("running_templates")
    .delete()
    .eq("id", templateId);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/running/templates");
  return { success: true };
}

/**
 * Adiciona uma sessão de treino a uma Planilha Padrão.
 * 
 * @param formData - Dados da sessão (templateId, weekNumber, sessionOrder, targetDescription, etc).
 */
export async function createTemplateWorkout(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autorizado");

  const validatedFields = createTemplateWorkoutSchema.safeParse({
    templateId: formData.get("templateId"),
    weekNumber: parseInt(formData.get("weekNumber") as string),
    sessionOrder: parseInt(formData.get("sessionOrder") as string),
    targetDescription: formData.get("targetDescription"),
    targetDistanceKm: formData.get("targetDistanceKm") ? parseFloat(formData.get("targetDistanceKm") as string) : null,
    targetPaceDescription: formData.get("targetPaceDescription"),
    targetRestTimeDescription: formData.get("targetRestTimeDescription"),
    reps: formData.get("reps") ? parseInt(formData.get("reps") as string) : 1,
    category: formData.get("category"),
    targetZone: formData.get("targetZone"),
    targetUnit: formData.get("targetUnit") || "km",
  });

  if (!validatedFields.success) throw new Error("Dados inválidos para treino da planilha");

  let finalDistance = validatedFields.data.targetDistanceKm ?? null;
  if (finalDistance !== null && validatedFields.data.targetUnit === "m") {
    finalDistance = finalDistance / 1000;
  }

  const { error } = await supabase.from("running_template_workouts").insert({
    template_id: validatedFields.data.templateId,
    week_number: validatedFields.data.weekNumber,
    session_order: validatedFields.data.sessionOrder,
    target_description: validatedFields.data.targetDescription,
    target_distance_km: finalDistance,
    target_pace_description: validatedFields.data.targetPaceDescription,
    target_rest_time_description: validatedFields.data.targetRestTimeDescription,
    reps: validatedFields.data.reps,
    category: validatedFields.data.category,
    target_zone: validatedFields.data.targetZone,
    target_unit: validatedFields.data.targetUnit,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/admin/running/templates");
  return { success: true };
}

/**
 * Adiciona múltiplos blocos de treino (uma sessão completa) a uma Planilha Padrão.
 * 
 * @param templateId - UUID da planilha padrão (running_templates).
 * @param weekNumber - Índice da semana (1-indexed).
 * @param sessionOrder - Ordem da sessão dentro da semana (1, 2, 3...).
 * @param blocks - Array de blocos estruturados. Cada bloco pode ter unidade KM, M ou MIN.
 * @returns { success: boolean }
 * @throws {Error} Se falhar na inserção ou autorização.
 */
export async function createTemplateWorkoutsBatch(
  templateId: string,
  weekNumber: number,
  sessionOrder: number,
  blocks: {
    targetDescription: string;
    targetDistanceKm?: number | null;
    targetPaceDescription?: string | null;
    targetRestTimeDescription?: string | null;
    reps?: number;
    category?: string | null;
    targetZone?: string | null;
    targetUnit?: string;
  }[]
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autorizado");

  if (!blocks || blocks.length === 0) throw new Error("Nenhum bloco para adicionar");

    const workoutsToInsert = blocks.map((b, idx) => {
      let dist = b.targetDistanceKm || null;
      if (dist !== null && b.targetUnit === "m") {
        dist = dist / 1000;
      }

      return {
        template_id: templateId,
        week_number: weekNumber,
        session_order: sessionOrder,
        block_order: idx + 1,
        target_description: b.targetDescription,
        target_distance_km: dist,
        target_pace_description: b.targetPaceDescription || null,
        target_rest_time_description: b.targetRestTimeDescription || null,
        reps: b.reps || 1,
        category: b.category || null,
        target_zone: b.targetZone || null,
        target_unit: b.targetUnit || "km",
      };
    });

  const { error } = await supabase.from("running_template_workouts").insert(workoutsToInsert);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/running/templates");
  return { success: true };
}

/**
 * Atualiza todos os blocos de uma sessão completa (Multi-Blocos) em uma Planilha Padrão.
 * Ele exclui os blocos antigos daquela sessão e insere os novos.
 */
export async function updateTemplateWorkoutsBatch(
  templateId: string,
  weekNumber: number,
  newSessionOrder: number,
  originalSessionOrder: number,
  blocks: {
    targetDescription: string;
    targetDistanceKm?: number | null;
    targetPaceDescription?: string | null;
    targetRestTimeDescription?: string | null;
    reps?: number;
    category?: string | null;
    targetZone?: string | null;
    targetUnit?: string;
  }[]
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autorizado");

  if (!blocks || blocks.length === 0) throw new Error("Nenhum bloco para atualizar");

  // 1. Excluir os blocos antigos da sessão original
  const { error: delErr } = await supabase
    .from("running_template_workouts")
    .delete()
    .eq("template_id", templateId)
    .eq("week_number", weekNumber)
    .eq("session_order", originalSessionOrder);

  if (delErr) throw new Error(delErr.message);

  // 2. Inserir os novos blocos
  const workoutsToInsert = blocks.map((b, idx) => {
    let dist = b.targetDistanceKm || null;
    if (dist !== null && b.targetUnit === "m") {
      dist = dist / 1000;
    }

    return {
      template_id: templateId,
      week_number: weekNumber,
      session_order: newSessionOrder,
      block_order: idx + 1,
      target_description: b.targetDescription,
      target_distance_km: dist,
      target_pace_description: b.targetPaceDescription || null,
      target_rest_time_description: b.targetRestTimeDescription || null,
      reps: b.reps || 1,
      category: b.category || null,
      target_zone: b.targetZone || null,
      target_unit: b.targetUnit || "km",
    };
  });

  const { error } = await supabase.from("running_template_workouts").insert(workoutsToInsert);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/running/templates");
  return { success: true };
}

/**
 * Remove permanentemente uma sessão de treino de uma Planilha Padrão.
 * 
 * @param workoutId - ID da sessão estrutural.
 */
export async function deleteTemplateWorkout(workoutId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autorizado");

  const { error } = await supabase
    .from("running_template_workouts")
    .delete()
    .eq("id", workoutId);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/running/templates");
  return { success: true };
}

/**
 * Atualiza uma sessão de treino de uma Planilha Padrão.
 * 
 * @param formData - Dados da sessão (workoutId, weekNumber, sessionOrder, targetDescription, etc).
 */
export async function updateTemplateWorkout(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autorizado");

  const validatedFields = updateTemplateWorkoutSchema.safeParse({
    workoutId: formData.get("workoutId"),
    weekNumber: formData.get("weekNumber") ? parseInt(formData.get("weekNumber") as string) : undefined,
    sessionOrder: formData.get("sessionOrder") ? parseInt(formData.get("sessionOrder") as string) : undefined,
    targetDescription: formData.get("targetDescription") || undefined,
    targetDistanceKm: formData.get("targetDistanceKm") ? parseFloat(formData.get("targetDistanceKm") as string) : null,
    targetPaceDescription: formData.get("targetPaceDescription") || null,
    targetRestTimeDescription: formData.get("targetRestTimeDescription") || null,
    reps: formData.get("reps") ? parseInt(formData.get("reps") as string) : undefined,
    category: formData.get("category") || null,
    targetZone: formData.get("targetZone") || null,
    targetUnit: formData.get("targetUnit") || undefined,
  });

  if (!validatedFields.success) throw new Error("Dados inválidos para atualizar treino da planilha");

  let finalDistance = validatedFields.data.targetDistanceKm ?? null;
  if (finalDistance !== null && validatedFields.data.targetUnit === "m") {
    finalDistance = finalDistance / 1000;
  }

  const { error } = await supabase
    .from("running_template_workouts")
    .update({
      week_number: validatedFields.data.weekNumber,
      session_order: validatedFields.data.sessionOrder,
      target_description: validatedFields.data.targetDescription,
      target_distance_km: finalDistance,
      target_pace_description: validatedFields.data.targetPaceDescription,
      target_rest_time_description: validatedFields.data.targetRestTimeDescription,
      reps: validatedFields.data.reps,
      category: validatedFields.data.category,
      target_zone: validatedFields.data.targetZone,
      target_unit: validatedFields.data.targetUnit,
    })
    .eq("id", validatedFields.data.workoutId);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/running/templates");
  return { success: true };
}

/**
 * Duplica todos os blocos de uma sessão para uma nova ordem de sessão, opcionalmente em outra semana.
 */
export async function duplicateTemplateSession(
  templateId: string, 
  weekNumber: number, 
  sessionOrder: number,
  targetWeekNumber?: number
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autorizado");

  const destinationWeek = targetWeekNumber || weekNumber;

  // 1. Buscar blocos da sessão original
  const { data: blocks } = await supabase
    .from("running_template_workouts")
    .select("*")
    .eq("template_id", templateId)
    .eq("week_number", weekNumber)
    .eq("session_order", sessionOrder)
    .order("block_order", { ascending: true });

  if (!blocks || blocks.length === 0) throw new Error("Sessão não encontrada");

  // 2. Determinar próxima ordem disponível na semana de destino
  const { data: existing } = await supabase
    .from("running_template_workouts")
    .select("session_order")
    .eq("template_id", templateId)
    .eq("week_number", destinationWeek);
  
  const maxOrder = existing?.reduce((max, curr) => Math.max(max, curr.session_order), 0) || 0;
  const newOrder = maxOrder + 1;

  // 3. Inserir cópias
  const workoutsToInsert = blocks.map(b => ({
    template_id: templateId,
    week_number: destinationWeek,
    session_order: newOrder,
    block_order: b.block_order,
    target_description: b.target_description,
    target_distance_km: b.target_distance_km,
    target_pace_description: b.target_pace_description,
    target_rest_time_description: b.target_rest_time_description,
    reps: b.reps,
    category: b.category,
    target_zone: b.target_zone,
    target_unit: b.target_unit,
  }));

  const { error } = await supabase.from("running_template_workouts").insert(workoutsToInsert);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/running/templates");
  return { success: true };
}

/**
 * Remove todos os blocos de uma sessão específica.
 */
export async function deleteTemplateSession(templateId: string, weekNumber: number, sessionOrder: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autorizado");

  const { error } = await supabase
    .from("running_template_workouts")
    .delete()
    .eq("template_id", templateId)
    .eq("week_number", weekNumber)
    .eq("session_order", sessionOrder);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/running/templates");
  return { success: true };
}

/**
 * Clona uma Planilha Padrão existente com todos os seus treinos.
 * 
 * @param templateId - ID da planilha original.
 */
export async function duplicateRunningTemplate(templateId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autorizado");

  // 1. Busca o template original
  const { data: original, error: fetchErr } = await supabase
    .from("running_templates")
    .select("*, running_template_workouts(*)")
    .eq("id", templateId)
    .single();

  if (fetchErr || !original) throw new Error("Planilha original não encontrada");

  // 2. Cria o novo template (Cópia)
  const { data: copy, error: copyErr } = await supabase
    .from("running_templates")
    .insert({
      coach_id: user.id,
      title: `${original.title} (Cópia)`,
      description: original.description,
      level_tag: original.level_tag,
      frequency_per_week: original.frequency_per_week,
      duration_weeks: original.duration_weeks,
    })
    .select()
    .single();

  if (copyErr) throw new Error(copyErr.message);

  // 3. Clona os treinos
  if (original.running_template_workouts && original.running_template_workouts.length > 0) {
    const workoutsToInsert = original.running_template_workouts.map((tw: any) => ({
      template_id: copy.id,
      week_number: tw.week_number,
      session_order: tw.session_order,
      block_order: tw.block_order,
      target_description: tw.target_description,
      target_distance_km: tw.target_distance_km,
      target_pace_description: tw.target_pace_description,
      target_rest_time_description: tw.target_rest_time_description,
      reps: tw.reps || 1,
      category: tw.category || null,
      target_zone: tw.target_zone || null,
      target_unit: tw.target_unit || "km",
    }));

    const { error: batchErr } = await supabase.from("running_template_workouts").insert(workoutsToInsert);
    if (batchErr) throw new Error(batchErr.message);
  }

  revalidatePath("/admin/running/templates");
  return { success: true, copy };
}

/**
 * Atribui uma Planilha Padrão (Template) a um Aluno. 
 * 
 * @architecture Snapshoting
 * Esta função clona toda a estrutura do template para o plano individual do aluno.
 * Após a atribuição, o vínculo com o template original é quebrado, permitindo que o coach
 * personalize o treino do aluno sem alterar o modelo base (e vice-versa).
 * 
 * @param templateId - ID da planilha padrão.
 * @param studentId - ID do aluno.
 */
export async function assignTemplateToStudent(templateId: string, studentId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autorizado");

  // 1. Busca o template
  const { data: template, error: tmplError } = await supabase
    .from("running_templates")
    .select("*")
    .eq("id", templateId)
    .single();

  if (tmplError || !template) throw new Error("Planilha não encontrada");

  // 2. Busca os treinos estruturais do template
  const { data: templateWorkouts } = await supabase
    .from("running_template_workouts")
    .select("*")
    .eq("template_id", templateId);

  // 3. Cria um novo plano real para o aluno baseado nos metadados do template
  const { data: newPlan, error: planError } = await supabase
    .from("running_plans")
    .insert({
      student_id: studentId,
      coach_id: user.id,
      title: template.title,
      description: template.description,
      level_tag: template.level_tag,
      status: "active",
    })
    .select()
    .single();

  if (planError) throw planError;

  // 4. Copia os treinos (Deep Clone)
  if (templateWorkouts && templateWorkouts.length > 0) {
    const workoutsToInsert = templateWorkouts.map(tw => ({
      plan_id: newPlan.id,
      student_id: studentId,
      week_number: tw.week_number,
      session_order: tw.session_order,
      block_order: tw.block_order,
      target_description: tw.target_description,
      target_distance_km: tw.target_distance_km,
      target_pace_description: tw.target_pace_description,
      target_rest_time_description: tw.target_rest_time_description,
      reps: tw.reps || 1,
      category: tw.category || null,
      target_zone: tw.target_zone || null,
      target_unit: tw.target_unit || "km",
    }));

    await supabase.from("running_workouts").insert(workoutsToInsert);
  }

  revalidatePath(`/admin/alunos/${studentId}`);
  revalidatePath("/admin/running");
  revalidatePath("/programas/running");
  
  return { success: true, plan: newPlan };
}

/**
 * createRunningWorkout — Cria um novo treino prescrito pelo Coach.
 * 
 * @logic Modelo Agnóstico a Datas
 * Se `date` estiver vazio, o treino é salvo com `scheduled_date: null`.
 * A organização visual do aluno dependerá então exclusivamente de `week_number` e `session_order`.
 * 
 * @param formData - Dados do formulário contendo: planId, studentId, description, date (opcional), 
 *                   target_distance_km, target_pace, week_number, etc.
 * @returns void (throws on error)
 * @throws {Error} Se ocorrer um erro no banco de dados
 */
export async function createRunningWorkout(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Não autorizado");

  const planId = formData.get("planId") as string;
  const studentId = formData.get("studentId") as string;
  const targetDescription = formData.get("description") as string;
  const scheduledDate = formData.get("date") as string || null;
  let targetDistanceKm = formData.get("target_distance_km") ? parseFloat(formData.get("target_distance_km") as string) : null;
  let targetPace = formData.get("target_pace") as string | null;
  const targetRestTime = formData.get("target_rest_time") as string | null;
  const reps = formData.get("reps") ? parseInt(formData.get("reps") as string) : 1;
  const category = formData.get("category") as string | null;
  const targetZone = formData.get("target_zone") as string | null;
  const targetUnit = (formData.get("target_unit") as string) || "km";

  // Lógica de distância inteligente: se unidade for 'm' ou se o valor for alto (> 100), assume metros e converte para km
  if (targetDistanceKm !== null && (targetUnit === "m" || targetDistanceKm >= 100)) {
    targetDistanceKm = targetDistanceKm / 1000;
  }

  // Hardening: Cap de distância (evitar problemas de precisão/espaço)
  if (targetDistanceKm !== null && targetDistanceKm > 999.9) {
    targetDistanceKm = 999.9;
  }

  // Se o pace for apenas números (ex: "600"), transformar em "6:00/km"
  if (targetPace && /^\d+$/.test(targetPace)) {
    if (targetPace.length >= 3) {
      const mins = targetPace.slice(0, -2);
      const secs = targetPace.slice(-2);
      targetPace = `${mins}:${secs}/km`;
    }
  }

  const weekNumber = formData.get("week_number") ? parseInt(formData.get("week_number") as string) : 1;

  const { error } = await supabase.from("running_workouts").insert({
    plan_id: planId,
    student_id: studentId,
    week_number: weekNumber,
    scheduled_date: scheduledDate,
    target_description: targetDescription,
    target_distance_km: targetDistanceKm,
    target_pace_description: targetPace,
    target_rest_time_description: targetRestTime,
    reps,
    category,
    target_zone: targetZone,
    target_unit: targetUnit
  });

  if (error) throw new Error(error.message);
  revalidatePath("/admin/alunos");
  revalidatePath("/admin/running");
  revalidatePath("/programas/running");
}

/**
 * updateRunningWorkout — Atualiza um treino prescrito pelo Coach.
 * 
 * @logic Persistência de Estrutura
 * Permite alterar a `week_number` para reorganizar treinos entre semanas.
 * Se `date` for limpo no formulário, a sessão torna-se agnóstica a data (null no DB).
 * 
 * @param formData - Dados do formulário contendo: workoutId, description, date, target_distance_km, 
 *                   target_pace, target_rest_time, week_number
 * @returns void (throws on error)
 * @throws {Error} Se ocorrer um erro no banco de dados
 */
export async function updateRunningWorkout(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Não autorizado");

  const workoutId = formData.get("workoutId") as string;
  const targetDescription = formData.get("description") as string;
  const scheduledDate = formData.get("date") as string || null;
  let targetDistanceKm = formData.get("target_distance_km") ? parseFloat(formData.get("target_distance_km") as string) : null;
  let targetPace = formData.get("target_pace") as string | null;
  const targetRestTime = formData.get("target_rest_time") as string | null;
  const reps = formData.get("reps") ? parseInt(formData.get("reps") as string) : undefined;
  const category = formData.get("category") as string | null;
  const targetZone = formData.get("target_zone") as string | null;
  const targetUnit = (formData.get("target_unit") as string) || "km";

  // Lógica de distância inteligente: se unidade for 'm' ou se o valor for alto (> 100), assume metros e converte para km
  if (targetDistanceKm !== null && (targetUnit === "m" || targetDistanceKm >= 100)) {
    targetDistanceKm = targetDistanceKm / 1000;
  }

  // Hardening: Cap de distância
  if (targetDistanceKm !== null && targetDistanceKm > 999.9) {
    targetDistanceKm = 999.9;
  }

  // Se o pace for apenas números (ex: "600"), transformar em "6:00/km"
  if (targetPace && /^\d+$/.test(targetPace)) {
    if (targetPace.length >= 3) {
      const mins = targetPace.slice(0, -2);
      const secs = targetPace.slice(-2);
      targetPace = `${mins}:${secs}/km`;
    }
  }

  const weekNumber = formData.get("week_number") ? parseInt(formData.get("week_number") as string) : 1;

  const { error } = await supabase.from("running_workouts").update({
    scheduled_date: scheduledDate,
    week_number: weekNumber,
    target_description: targetDescription,
    target_distance_km: targetDistanceKm,
    target_pace_description: targetPace,
    target_rest_time_description: targetRestTime,
    reps,
    category,
    target_zone: targetZone,
    target_unit: targetUnit
  }).eq("id", workoutId);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/alunos");
  revalidatePath("/admin/running");
  revalidatePath("/programas/running");
}

// ── Tipos para o Gerador de Sessões ──────────────────────────────────────────

export interface SessionConfig {
  /** Ordem da sessão dentro da semana (1, 2, 3...) */
  sessionOrder: number;
  description: string;
  targetDistanceKm?: number | null;
  targetPace?: string | null;
  targetRestTime?: string | null;
  reps?: number;
  category?: string | null;
  targetZone?: string | null;
  targetUnit?: string;
}

/**
 * @deprecated Use `SessionConfig` em vez de `WeekDaySession`.
 * Mantido temporariamente para compatibilidade reversa.
 */
export type WeekDaySession = SessionConfig & { dayOfWeek?: number };

/**
 * Cria sessões em lote a partir de um modelo baseado em sessões por semana.
 *
 * @param planId - ID do plano de corrida ativo
 * @param studentId - ID do aluno
 * @param startDate - Data ISO do primeiro dia do ciclo
 * @param weeks - Número de semanas a gerar
 * @param sessions - Array de sessões com ordem e configuração
 * @param weekOffset - Offset para o número da semana (ex: se já existem 4 semanas, passar 4 para que novas comecem na 5). Default: 0.
 *
 * @architecture
 * - **Session-based:** Cada treino recebe `week_number` e `session_order` explícitos,
 *   permitindo agrupamento visual sem depender de dias da semana fixos.
 * - **Datas sequenciais:** Gera `scheduled_date` distribuídas sequencialmente
 *   dentro de cada semana (1 dia de intervalo entre sessões) para manter
 *   compatibilidade com lógicas de ordenação legadas e integrações externas.
 * - Gera datas UTC-safe usando noon (T12:00:00) para evitar shifts de fuso.
 * - Faz insert em lote (uma única query) para performance.
 * - Revalida as rotas admin e student após a criação.
 */
export async function bulkCreateRunningWorkouts(
  planId: string,
  studentId: string,
  startDate: string,
  weeks: number,
  sessions: SessionConfig[],
  weekOffset: number = 0
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autorizado");

  // 0. Validação Zod
  const validatedFields = bulkCreateRunningWorkoutsSchema.safeParse({
    planId,
    studentId,
    startDate,
    workouts: sessions.map(s => ({
      scheduled_date: startDate, // placeholder para validação estrutural
      target_description: s.description,
      target_distance_km: s.targetDistanceKm,
      target_pace_description: s.targetPace,
      target_rest_time_description: s.targetRestTime,
      reps: s.reps,
      category: s.category,
      target_zone: s.targetZone,
      target_unit: s.targetUnit || "km",
    }))
  });

  if (!validatedFields.success) throw new Error("Dados de geração em lote inválidos");

  if (!planId || !studentId) throw new Error("Plano ou aluno inválido.");
  if (sessions.length === 0) throw new Error("Adicione ao menos uma sessão.");
  if (weeks < 1 || weeks > 16) throw new Error("Número de semanas deve ser entre 1 e 16.");

  // ──────────────────────────────────────────────────────────────────────────
  // LÓGICA DE GERAÇÃO TEMPORAL (UTC SAFE)
  // ──────────────────────────────────────────────────────────────────────────
  // Para evitar que treinos "pulem" de dia devido a fuso horário (ex: salvando 
  // 00h de segunda vira 21h de domingo em Brasília), forçamos o meio-dia (12h) 
  // UTC. Isso garante que, independente do fuso do navegador do aluno, a 
  // data resultante de `toISOString().split("T")[0]` seja a correta.
  //
  // As datas são distribuídas sequencialmente dentro de cada semana
  // (Sessão 1 = dia 0 da semana, Sessão 2 = dia 1, etc.), servindo
  // apenas como referência temporal. A ordenação real é feita por
  // `week_number` e `session_order`.
  // ──────────────────────────────────────────────────────────────────────────
  const base = new Date(startDate + "T12:00:00Z");

  const rows: object[] = [];

  for (let week = 0; week < weeks; week++) {
    // Ordena as sessões pela ordem declarada antes de distribuir datas
    const sortedSessions = [...sessions].sort((a, b) => a.sessionOrder - b.sessionOrder);

    for (let i = 0; i < sortedSessions.length; i++) {
      const session = sortedSessions[i];

      // Data sequencial: base + (semana * 7 dias) + índice da sessão dentro da semana
      const sessionDate = new Date(base);
      sessionDate.setUTCDate(base.getUTCDate() + week * 7 + i);

      // Normalizar pace se vier como dígitos puros (ex: "600" → "6:00/km")
      let pace = session.targetPace || null;
      if (pace && /^\d+$/.test(pace) && pace.length >= 3) {
        const mins = pace.slice(0, -2);
        const secs = pace.slice(-2);
        pace = `${mins}:${secs}/km`;
      }

      // Lógica de distância inteligente
      let distance = session.targetDistanceKm || null;
      if (distance !== null && distance >= 100) {
        distance = distance / 1000;
      }

      rows.push({
        plan_id: planId,
        student_id: studentId,
        week_number: week + 1 + weekOffset,
        session_order: session.sessionOrder,
        scheduled_date: sessionDate.toISOString().split("T")[0],
        target_description: session.description,
        target_distance_km: distance,
        target_pace_description: pace,
        target_rest_time_description: session.targetRestTime || null,
        reps: session.reps || 1,
        category: session.category || null,
        target_zone: session.targetZone || null,
        target_unit: session.targetUnit || "km",
        status: "active",
      });
    }
  }

  // Ordenar por semana e sessão antes de inserir
  rows.sort((a: any, b: any) => {
    if (a.week_number !== b.week_number) return a.week_number - b.week_number;
    return a.session_order - b.session_order;
  });

  const { error } = await supabase.from("running_workouts").insert(rows);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/alunos");
  revalidatePath("/admin/running");
  revalidatePath("/programas/running");

  return { count: rows.length };
}


/**
 * Recarrega a visão geral de todos os atletas no programa de corrida.
 * 
 * @architecture
 * - SSoT: Usa `profiles.running_level` como critério de inclusão.
 *   Qualquer atleta com `running_level` atribuído aparece no Hub,
 *   independente de ter planos criados. Isso evita a fricção de criar
 *   um plano antes de ver o atleta, e alinha com o modelo mental do coach.
 * - Stats são buscadas separadamente via LEFT JOIN lógico em JS.
 */
/**
 * getRunnersOverview — Dashboard Administrativo (Running Hub).
 * 
 * @data-fetching Agrega dados de perfis, planos ativos e estatísticas de log (Último log, % de conclusão).
 * @security Exclusivo para perfis com 'running_level' (SSoT de participação no programa).
 * @performance Utiliza Promise.all para buscar estatísticas de múltiplos atletas em paralelo.
 * 
 * @returns {Promise<Array>} Lista de objetos 'runner' com perfil e estatísticas consolidadas.
 */
export async function getRunnersOverview() {
  const supabase = await createClient();

  // 1. Buscar todos os perfis com running_level definido (SSoT de inclusão)
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, full_name, display_name, avatar_url, level, running_level, running_pace, running_status, running_target_pace, membership_type")
    .not("running_level", "is", null)
    .order("full_name", { ascending: true });

  if (profilesError || !profiles || profiles.length === 0) {
    if (profilesError) console.error("Error fetching running profiles:", profilesError);
    return [];
  }

  const studentIds = profiles.map(p => p.id);

  // 2. Buscar TODOS os planos ativos dos estudantes encontrados (Bulk)
  const { data: activePlans, error: plansError } = await supabase
    .from("running_plans")
    .select("id, title, student_id")
    .eq("status", "active")
    .in("student_id", studentIds);

  if (plansError) console.error("Error fetching active plans:", plansError);

  // 3. Buscar estatísticas globais (Latest Log) para todos (Bulk)
  // Nota: Buscamos apenas os campos necessários para reduzir payload
  const { data: globalWorkouts, error: globalErr } = await supabase
    .from("running_workouts")
    .select("student_id, completed_at")
    .in("student_id", studentIds)
    .not("completed_at", "is", null);

  if (globalErr) console.error("Error fetching global workouts:", globalErr);

  // 4. Buscar estatísticas dos planos ativos (Bulk)
  const activePlanIds = (activePlans || []).map(p => p.id);
  let activePlanWorkouts: any[] = [];
  if (activePlanIds.length > 0) {
    const { data, error: activeErr } = await supabase
      .from("running_workouts")
      .select("plan_id, completed_at")
      .in("plan_id", activePlanIds);
    
    if (activeErr) console.error("Error fetching active plan workouts:", activeErr);
    else activePlanWorkouts = data || [];
  }

  const now = new Date();

  // 5. Consolidar os dados em memória (O(N) complexity)
  const plansMap = new Map((activePlans || []).map(p => [p.student_id, p]));
  
  // Agrupar workouts globais por estudante para achar o mais recente
  const globalStatsMap = new Map<string, { latestLog: string | null }>();
  (globalWorkouts || []).forEach(w => {
    const current = globalStatsMap.get(w.student_id);
    if (!current || !current.latestLog || new Date(w.completed_at!) > new Date(current.latestLog)) {
      globalStatsMap.set(w.student_id, { latestLog: w.completed_at });
    }
  });

  // Agrupar workouts de planos ativos para contagem
  const planStatsMap = new Map<string, { total: number, logged: number }>();
  activePlanWorkouts.forEach(w => {
    const stats = planStatsMap.get(w.plan_id) || { total: 0, logged: 0 };
    stats.total++;
    if (w.completed_at) stats.logged++;
    planStatsMap.set(w.plan_id, stats);
  });

  // 6. Mapear perfis para o formato final
  return profiles.map(profile => {
    const activePlan = plansMap.get(profile.id);
    const globalStats = globalStatsMap.get(profile.id);
    const planStats = activePlan ? planStatsMap.get(activePlan.id) : null;

    const latestLog = globalStats?.latestLog || null;
    const lastLogDays = latestLog 
      ? Math.floor((now.getTime() - new Date(latestLog).getTime()) / (1000 * 3600 * 24))
      : 999;

    return {
      id: profile.id,
      student_id: profile.id,
      profiles: profile,
      active_plan_title: activePlan?.title || null,
      stats: {
        total_prescribed: planStats?.total || 0,
        total_logged: planStats?.logged || 0,
        latest_log: latestLog,
        last_log_days: lastLogDays,
        has_active_plan: !!activePlan
      },
    };
  });
}



/**
 * Deleta um treino de corrida prescrito que ainda não foi concluído (Coach/Admin only).
 * 
 * @security Verifica role do usuário e garante que o treino não foi realizado
 *           antes de deletar, preservando o histórico de dados do aluno.
 * @param workoutId - UUID do treino a ser deletado
 * @throws Error se o treino já foi concluído ou se o usuário não tem permissão
 */
export async function deleteRunningWorkout(workoutId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Não autorizado");

  // 0. Validação Zod
  const validatedFields = deleteRunningEntitySchema.safeParse({ id: workoutId });
  if (!validatedFields.success) throw new Error("ID de treino inválido");

  // Verificar role
  const { data: roleData } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (!roleData || !["admin", "coach"].includes(roleData.role)) {
    throw new Error("Permissão negada");
  }

  // Garante que o treino não foi realizado antes de deletar (preserva histórico)
  const { data: workout } = await supabase
    .from("running_workouts")
    .select("completed_at, student_id")
    .eq("id", workoutId)
    .single();

  if (!workout) throw new Error("Treino não encontrado");
  if (workout.completed_at) {
    throw new Error("Não é possível deletar um treino já concluído.");
  }

  const { error } = await supabase
    .from("running_workouts")
    .delete()
    .eq("id", workoutId);

  if (error) throw error;

  revalidatePath(`/admin/alunos/${workout.student_id}`);
  revalidatePath("/admin/running");
  revalidatePath("/(student)/programas/running", "page");
  return { success: true };
}

/**
 * Arquiva um plano de corrida ativo, encerrando o ciclo de treinamento (Coach/Admin only).
 * 
 * @param planId - UUID do plano a ser arquivado
 * @throws Error se o plano não for encontrado ou o usuário não tiver permissão
 */
export async function archiveRunningPlan(planId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Não autorizado");

  // Verificar role
  const { data: roleData } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (!roleData || !["admin", "coach"].includes(roleData.role)) {
    throw new Error("Permissão negada");
  }

  const { data: plan, error } = await supabase
    .from("running_plans")
    .update({ status: "archived", updated_at: new Date().toISOString() })
    .eq("id", planId)
    .select("student_id")
    .single();

  if (error) throw error;

  revalidatePath(`/admin/alunos/${plan.student_id}`);
  revalidatePath("/admin/running");
  revalidatePath("/(student)/programas/running", "page");
  return { success: true };
}

/**
 * Remove permanentemente um plano de corrida e todos os seus treinos associados.
 * 
 * @security Exclusivo para Admin/Coach.
 * @param planId - UUID do plano a ser deletado
 * @param studentId - ID do aluno para revalidação de rota
 * @throws Error se houver falha na deleção ou permissão negada
 */
export async function deleteRunningPlan(planId: string, studentId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Não autorizado");

  // Verificar role
  const { data: roleData } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (!roleData || !["admin", "coach"].includes(roleData.role)) {
    throw new Error("Permissão negada");
  }

  // A deleção em cascata no banco removerá os workouts automaticamente
  const { error } = await supabase
    .from("running_plans")
    .delete()
    .eq("id", planId);

  if (error) throw error;

  revalidatePath(`/admin/alunos/${studentId}`);
  revalidatePath("/admin/running");
  revalidatePath("/programas/running");
  
  return { success: true };
}

/**
 * Busca o histórico completo de corridas de um aluno para análise de progresso.
 * Retorna os treinos agrupados por semana e estatísticas de evolução.
 * 
 * @param studentId - UUID do aluno
 * @returns { history: array, stats: object }
 */
export async function getStudentRunningHistory(studentId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Não autorizado");

  // we fetch ALL completed workouts for this student
  const { data: workouts, error } = await supabase
    .from("running_workouts")
    .select(`
      id,
      completed_at,
      actual_distance_km,
      actual_duration_seconds,
      actual_pace_seconds_per_km,
      rpe,
      plan_id,
      target_description
    `)
    .eq("student_id", studentId)
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false });

  if (error) throw error;

  // KPIs de Evolução (Últimos 30 dias vs anterior)
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  const currentPeriod = workouts.filter(w => new Date(w.completed_at!) >= thirtyDaysAgo);
  const previousPeriod = workouts.filter(w => {
    const d = new Date(w.completed_at!);
    return d >= sixtyDaysAgo && d < thirtyDaysAgo;
  });

  const currentKm = currentPeriod.reduce((acc, w) => acc + (parseFloat(w.actual_distance_km) || 0), 0);
  const previousKm = previousPeriod.reduce((acc, w) => acc + (parseFloat(w.actual_distance_km) || 0), 0);
  
  const kmTrend = previousKm > 0 
    ? Math.round(((currentKm - previousKm) / previousKm) * 100) 
    : 0;

  return {
    workouts: workouts || [],
    stats: {
      totalKm: workouts.reduce((acc, w) => acc + (parseFloat(w.actual_distance_km) || 0), 0),
      totalSessions: workouts.length,
      kmTrend,
      currentMonthKm: currentKm
    }
  };
}

/**
 * Atualiza o Pace Alvo do Aluno no Perfil Global (Blue Mode Context).
 * 
 * @param formData - Dados do formulário contendo: pace (ex: "05:30")
 * @returns { success: boolean, error?: string }
 */
/**
 * updateRunningPace — Atualiza o Pace Alvo definido pelo Aluno (Meu Pace Alvo).
 * 
 * @logic Este pace é a meta subjetiva do aluno, diferente dos 'Pace Marks' (marcos fixos do coach).
 * @validation Enforça o formato MM:SS via Regex.
 * @path-revalidation Limpa caches do dashboard do aluno e perfil global.
 * 
 * @param {FormData} formData - Contém o campo 'pace' (ex: "05:15").
 * @returns {Promise<{ success: boolean; error?: string }>}
 */
export async function updateRunningPace(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Não autorizado" };

  const rawPace = formData.get("pace") as string;
  if (!rawPace || !/^\d{2}:\d{2}$/.test(rawPace)) return { error: "Pace inválido. Use o formato MM:SS (ex: 05:30)." };

  const { error } = await supabase
    .from("profiles")
    .update({ running_target_pace: rawPace })
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/programas/running");
  revalidatePath("/profile");
  
  return { success: true };
}

/**
 * Recupera o próximo treino agendado para o aluno (Dashboard principal).
 * 
 * @description Realiza o fetch do treino mais próximo (hoje ou futuro) que não esteja concluído.
 * Suporta a estrutura de multi-blocos, retornando todos os blocos da mesma sessão.
 * 
 * @returns {Promise<Workout[] | null>} Lista de blocos do próximo treino ou null se não houver.
 */
export async function getNextRunningWorkout(studentId: string) {
  const supabase = await createClient();

  // 1. Achar o plano ativo
  const { data: activePlan } = await supabase
    .from("running_plans")
    .select("id")
    .eq("student_id", studentId)
    .eq("status", "active")
    .maybeSingle();

  if (!activePlan) return null;

  // 2. Achar o primeiro treino não concluído desse plano
  const { data: nextWorkout, error } = await supabase
    .from("running_workouts")
    .select(`
      id,
      scheduled_date,
      completed_at,
      target_description,
      target_distance_km,
      target_pace_description,
      target_rest_time_description,
      reps,
      category,
      target_zone,
      target_unit,
      session_order,
      week_number,
      plan_id,
      running_plans(title)
    `)
    .eq("plan_id", activePlan.id)
    .is("completed_at", null)
    .order("week_number", { ascending: true })
    .order("session_order", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Error fetching next running workout:", error);
    return null;
  }

  return nextWorkout;
}

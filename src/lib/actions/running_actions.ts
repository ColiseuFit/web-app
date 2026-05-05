"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { 
  updateRunningPlanSchema, 
  logRunningWorkoutSchema, 
  bulkCreateRunningWorkoutsSchema,
  deleteRunningEntitySchema,
  createRunningTemplateSchema,
  createTemplateWorkoutSchema
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
    .select("completed_at")
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
  });

  if (!validatedFields.success) throw new Error("Dados inválidos para treino da planilha");

  const { error } = await supabase.from("running_template_workouts").insert({
    template_id: validatedFields.data.templateId,
    week_number: validatedFields.data.weekNumber,
    session_order: validatedFields.data.sessionOrder,
    target_description: validatedFields.data.targetDescription,
    target_distance_km: validatedFields.data.targetDistanceKm,
    target_pace_description: validatedFields.data.targetPaceDescription,
    target_rest_time_description: validatedFields.data.targetRestTimeDescription,
  });

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
      target_description: tw.target_description,
      target_distance_km: tw.target_distance_km,
      target_pace_description: tw.target_pace_description,
      target_rest_time_description: tw.target_rest_time_description,
    }));

    await supabase.from("running_workouts").insert(workoutsToInsert);
  }

  revalidatePath(`/admin/alunos/${studentId}`);
  revalidatePath("/admin/running");
  revalidatePath("/programas/running");
  
  return { success: true, plan: newPlan };
}

/**
 * Cria um novo treino prescrito pelo Coach.
 * 
 * @param formData - Dados do formulário contendo: planId, studentId, description, date, target_distance_km, target_pace
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
  const scheduledDate = formData.get("date") as string;
  let targetDistanceKm = formData.get("target_distance_km") ? parseFloat(formData.get("target_distance_km") as string) : null;
  let targetPace = formData.get("target_pace") as string | null;
  const targetRestTime = formData.get("target_rest_time") as string | null;

  // Lógica de distância inteligente: se > 100, assume metros e converte para km
  if (targetDistanceKm !== null && targetDistanceKm >= 100) {
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

  const { error } = await supabase.from("running_workouts").insert({
    plan_id: planId,
    student_id: studentId,
    scheduled_date: scheduledDate,
    target_description: targetDescription,
    target_distance_km: targetDistanceKm,
    target_pace_description: targetPace,
    target_rest_time_description: targetRestTime
  });

  if (error) throw new Error(error.message);
  revalidatePath("/admin/alunos");
  revalidatePath("/admin/running");
  revalidatePath("/programas/running");
}

/**
 * Atualiza um treino prescrito pelo Coach.
 * 
 * @param formData - Dados do formulário contendo: workoutId, description, date, target_distance_km, target_pace, target_rest_time
 * @returns void (throws on error)
 * @throws {Error} Se ocorrer um erro no banco de dados
 */
export async function updateRunningWorkout(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Não autorizado");

  const workoutId = formData.get("workoutId") as string;
  const targetDescription = formData.get("description") as string;
  const scheduledDate = formData.get("date") as string;
  let targetDistanceKm = formData.get("target_distance_km") ? parseFloat(formData.get("target_distance_km") as string) : null;
  let targetPace = formData.get("target_pace") as string | null;
  const targetRestTime = formData.get("target_rest_time") as string | null;

  // Lógica de distância inteligente: se > 100, assume metros e converte para km
  if (targetDistanceKm !== null && targetDistanceKm >= 100) {
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

  const { error } = await supabase.from("running_workouts").update({
    scheduled_date: scheduledDate,
    target_description: targetDescription,
    target_distance_km: targetDistanceKm,
    target_pace_description: targetPace,
    target_rest_time_description: targetRestTime
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
      target_rest_time_description: s.targetRestTime
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
export async function getRunnersOverview() {
  const supabase = await createClient();

  // 1. Buscar todos os perfis com running_level definido (SSoT de inclusão)
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, full_name, display_name, avatar_url, level, running_level, running_pace")
    .not("running_level", "is", null)
    .order("full_name", { ascending: true });

  if (error) {
    console.error("Error fetching running profiles:", error);
    return [];
  }

  if (!profiles || profiles.length === 0) return [];

  // 2. Para cada atleta, buscar planos e estatísticas de treinos
  const runnersWithStats = await Promise.all(profiles.map(async (profile) => {
    // Pega todos os planos do atleta
    const { data: plans } = await supabase
      .from("running_plans")
      .select("id")
      .eq("student_id", profile.id);

    const planIds = plans?.map(p => p.id) || [];

    // Buscar workouts de todos os planos
    let workouts: { completed_at: string | null; scheduled_date: string }[] = [];
    if (planIds.length > 0) {
      const { data: wkData } = await supabase
        .from("running_workouts")
        .select("completed_at, scheduled_date")
        .in("plan_id", planIds);
      workouts = wkData || [];
    }

    const loggedWorkouts = workouts.filter(w => w.completed_at);
    const latestLog = loggedWorkouts.length > 0
      ? loggedWorkouts.sort((a, b) =>
          new Date(b.completed_at!).getTime() - new Date(a.completed_at!).getTime()
        )[0].completed_at
      : null;

    return {
      // Mantém a shape esperada pelo RunningHubClient
      id: profile.id,
      student_id: profile.id,
      profiles: profile,
      stats: {
        total_prescribed: workouts.length,
        total_logged: loggedWorkouts.length,
        latest_log: latestLog,
      },
    };
  }));

  return runnersWithStats;
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

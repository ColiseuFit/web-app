"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { wodResultSchema } from "@/lib/validations/security_schemas";

/**
 * Validador de formato de score auxiliar para o servidor.
 * Garante que a string inserida pelo aluno segue o padrão esperado pelo result_type do WOD.
 * 
 * @param {string} value - O valor inserido (ex: "12:34", "150 | 250", etc).
 * @param {string} resultType - Tipo de resultado suportado pelo WOD (ex: "time", "reps", "load").
 * @returns {boolean} True se o formato for válido.
 */
function validateWodResultValue(value: string, resultType: string): boolean {
  const allowedTypes = resultType.split(",").map(t => t.trim().toLowerCase()).filter(Boolean);
  const parts = value.split("|").map(p => p.trim()).filter(Boolean);

  if (parts.length === 0) return false;

  for (const part of parts) {
    const match = part.match(/^([a-z]+):(.+)$/i);
    if (!match) return false; // Obrigatório ter formato prefixo:valor (ex: time:15:30)

    const prefix = match[1].toLowerCase();
    const val = match[2];

    // O prefixo enviado deve ser um dos tipos permitidos no cadastro do WOD
    if (!allowedTypes.includes(prefix)) return false;

    if (prefix === "time") {
      // Para o tipo time, é obrigatório conter ":" e seguir o padrão MM:SS ou HH:MM:SS
      const timeRegex = /^\d{1,2}:\d{2}$/;
      if (!timeRegex.test(val)) return false;
      const [, sec] = val.split(":").map(Number);
      if (sec >= 60) return false;
    } else if (prefix !== "text") {
      // Outros tipos numéricos (reps, load, distance, etc) devem ser números puros
      const num = Number(val);
      if (isNaN(num) || num < 0 || num > 99999) return false;
    }
  }
  
  return true;
}

/**
 * ATUALIZAÇÃO DE RESULTADO (WOD Score): Registra ou atualiza o desempenho do aluno.
 * 
 * @architecture
 * - Janela de 24 horas: Permite ao aluno editar o score apenas se o WOD ocorreu há menos de 24 horas.
 * - UTC / Timezone Alignment: Ajuste temporal explícito usando GMT-3 para comparação com fuso local.
 * 
 * @security
 * - RLS: Restringe o `UPDATE` ao próprio `student_id = auth.uid()`.
 * - Zod: Validação rígida de payloads via `wodResultSchema`.
 * - Servidor-Side Gate: Garante integridade rejeitando modificações maliciosas via HTTP post-expiração.
 * 
 * @param {string} checkInId - UUID do check-in associado.
 * @param {string} result - Score bruto formatado (ex: "15:20", "150 | 50", "85").
 * @param {string} performanceLevel - Nível de proficiência do Coliseu ("branco", "verde", "azul", etc).
 * @returns {Promise<{success?: boolean, error?: string}>} Retorna status de sucesso.
 * @throws {Error} Retorna erro estruturado caso ocorra falha.
 */
export async function updateWodResult(
  checkInId: string, 
  result: string, 
  performanceLevel: string
): Promise<{ success?: boolean; error?: string }> {
  const validation = wodResultSchema.safeParse({ checkInId, result, performanceLevel });
  if (!validation.success) return { error: "Dados de resultado inválidos." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  // 1. Carregar o WOD e o check-in atual para validar a janela temporal
  const { data: checkinData, error: fetchError } = await supabase
    .from("check_ins")
    .select(`
      result,
      validated_at,
      wods (
        date,
        result_type
      )
    `)
    .eq("id", checkInId)
    .eq("student_id", user.id)
    .single();

  if (fetchError || !checkinData) {
    return { error: "Check-in não encontrado." };
  }

  const wod = Array.isArray(checkinData.wods) ? checkinData.wods[0] : checkinData.wods;
  if (!wod) {
    return { error: "Treino (WOD) não associado." };
  }

  // 2. Validação da Janela de 24 Horas para Edição de Score existente
  const isEditing = !!checkinData.result;
  if (isEditing) {
    // Se a aula foi validada, usa validated_at; caso contrário, ancoramos no final do dia do WOD (GMT-3)
    const referenceTime = checkinData.validated_at 
      ? new Date(checkinData.validated_at).getTime() 
      : new Date(wod.date + "T23:59:59-03:00").getTime();
    
    const nowMs = Date.now();
    const diffHours = (nowMs - referenceTime) / (1000 * 60 * 60);

    if (diffHours > 24) {
      return { error: "O prazo de 24 horas para editar este resultado expirou." };
    }
  }

  // 3. Validação do formato do Score baseado no result_type do WOD
  const isValidFormat = validateWodResultValue(
    validation.data.result, 
    wod.result_type || "text"
  );
  if (!isValidFormat) {
    return { error: "Formato do resultado incompatível com o treino." };
  }

  // 4. Atualizar o resultado no check-in do aluno
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
 * BUSCA DE HISTÓRICO PAGINADA: Recupera o feed unificado de treinos do aluno.
 * 
 * @architecture
 * - Paginado / scrolling infinito compatível.
 * - UTC Enforcement: Converte a string de data YYYY-MM-DD do WOD adicionando "T00:00:00Z"
 *   para processamento UTC puro, eliminando shifts de fuso horário no frontend.
 * - SSoT de Nomes de Coaches: Resolve prioridades:
 *   1. Coach da classe finalizada (`class_sessions.coach_id`).
 *   2. Coach substituto escalado no dia (`class_substitutions`).
 *   3. Coach padrão cadastrado na grade horária.
 * 
 * @param {number} page - Índice da página a buscar (0-indexed).
 * @param {number} [limit=10] - Limite de registros por lote.
 * @returns {Promise<{success: boolean, history: Array<any>, hasMore: boolean}>} Lista paginada unificada (WODs + Corridas).
 */
export async function getPaginatedHistory(
  page: number, 
  limit: number = 10
): Promise<{ success: boolean; history: any[]; hasMore: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, history: [], hasMore: false };

  // 1. Obter valor padrão de pontos de check-in configurado
  const { data: pointRule } = await supabase
    .from("points_rules")
    .select("points")
    .eq("key", "check_in")
    .single();
  const rulePoints = pointRule?.points ?? 10;

  // 2. Buscar nível atual do estudante
  const { data: student } = await supabase
    .from("students")
    .select("level")
    .eq("id", user.id)
    .single();
  const studentProfileLevel = student?.level || "branco";

  // 3. Buscar check-ins (WODs) confirmados ou registrados
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
    .range(0, (page + 1) * limit - 1);

  // 4. Buscar histórico de sessões de corrida avulsas concluintes
  const { data: runningWorkouts } = await supabase
    .from("running_workouts")
    .select(`
      *,
      profiles:coach_id (
        display_name,
        full_name,
        first_name
      )
    `)
    .eq("student_id", user.id)
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false })
    .range(0, (page + 1) * limit - 1);

  if (error) {
    console.error("Erro na paginação do histórico:", error);
    return { success: false, history: [], hasMore: false };
  }

  // 5. Mapear e preparar cards de WOD
  const wodHistory = (checkins || []).map((checkin: any) => {
    const wod = Array.isArray(checkin.wods) ? checkin.wods[0] : checkin.wods;
    if (!wod) return null;
    
    const activityDate = new Date(checkin.created_at);
    
    // UTC Enrollment: Ancoragem com T00:00:00Z para evitar off-by-one de timezone
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

    // SSoT Coach Name Resolution
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
      activityTimestamp: activityDate.getTime(),
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
      metrics,
      achievements: []
    };
  });

  // 6. Mapear e preparar cards de Corrida
  const runHistory = (runningWorkouts || []).map((run: any) => {
    const activityDate = new Date(run.completed_at);
    const formattedDate = activityDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).toUpperCase();
    
    const minVal = Math.floor(run.actual_pace_seconds_per_km / 60);
    const secVal = run.actual_pace_seconds_per_km % 60;
    const formattedPace = `${minVal}:${String(secVal).padStart(2, "0")}`;

    const resolveName = (profile: any) => profile?.display_name || profile?.full_name || profile?.first_name || null;

    // Regra fixa de 5 XP por km percorrido
    const pointsRuleVal = 5; 
    const totalPoints = Math.round(run.actual_distance_km * pointsRuleVal);

    return {
      id: run.id,
      activityTimestamp: activityDate.getTime(),
      date: formattedDate,
      isoDate: run.completed_at.split("T")[0],
      title: run.title || "Treino de Corrida",
      description: run.student_notes || run.target_description || "Sessão de corrida concluída.",
      rawContent: run.student_notes || run.target_description || "",
      typeTag: "CORRIDA",
      resultType: "running",
      coach: resolveName(run.profiles) || "Coach Coliseu",
      points: totalPoints,
      result: `${run.actual_distance_km} KM`,
      status: "confirmed",
      time: activityDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      tags: ["CORRIDA", "CARDIO", run.level_tag || "RUN"].filter(Boolean),
      metrics: [
        { label: "DISTÂNCIA", value: run.actual_distance_km, unit: "km" },
        { label: "PACE MÉDIO", value: formattedPace, unit: "min/km" }
      ],
      performanceLevel: run.rpe ? `RPE ${run.rpe}` : null,
      achievements: []
    };
  });

  // 7. Unificar, Ordenar Cronologicamente e Paginar Lote
  const unifiedHistory = [...wodHistory, ...runHistory]
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((a, b) => b.activityTimestamp - a.activityTimestamp);

  const paginatedResults = unifiedHistory.slice(page * limit, (page + 1) * limit);

  return { 
    success: true, 
    history: paginatedResults, 
    hasMore: unifiedHistory.length > (page + 1) * limit 
  };
}

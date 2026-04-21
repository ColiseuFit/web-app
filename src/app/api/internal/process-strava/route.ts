import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const INTERNAL_SECRET = process.env.INTERNAL_WEBHOOK_SECRET ?? "coliseu_internal_2026";

// maxDuration alto aqui pois este endpoint pode demorar (busca API externa + insert)
export const maxDuration = 30;

const RUN_TYPES = new Set([
  "Run",
  "TrailRun",
  "VirtualRun",
  "Treadmill",
  "Hike",
  "Walk",
]);

/**
 * Endpoint interno de processamento de eventos do Strava.
 * Chamado pelo webhook handler via fire-and-forget após salvar o evento na fila.
 * Protegido por segredo interno para evitar execução externa.
 *
 * @param request - POST com body { eventId: string }
 */
export async function POST(request: Request) {
  // Validação de segredo interno
  const secret = request.headers.get("x-internal-secret");
  if (secret !== INTERNAL_SECRET) {
    console.error("[PROCESS-STRAVA] ❌ Acesso não autorizado.");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let eventId: string;
  try {
    const body = await request.json();
    eventId = body.eventId;
    if (!eventId) throw new Error("eventId ausente");
  } catch (err) {
    console.error("[PROCESS-STRAVA] ❌ Payload inválido:", err);
    return NextResponse.json({ error: "Bad Request" }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  console.log(`[PROCESS-STRAVA] Iniciando processamento do evento: ${eventId}`);

  // 1. Buscar evento da fila e marcar como processing
  const { data: event, error: fetchErr } = await supabase
    .from("strava_webhook_events")
    .update({ status: "processing" })
    .eq("id", eventId)
    .eq("status", "pending") // Idempotência: só processa se ainda estiver pendente
    .select("*")
    .single();

  if (fetchErr || !event) {
    console.warn(`[PROCESS-STRAVA] Evento ${eventId} já processado ou não encontrado.`);
    return NextResponse.json({ status: "skipped" });
  }

  const { object_type, aspect_type, object_id, owner_id } = event;

  // 2. Filtro: apenas criação de atividade
  if (object_type !== "activity" || aspect_type !== "create") {
    console.log(`[PROCESS-STRAVA] Ignorado – type=${object_type} aspect=${aspect_type}`);
    await supabase
      .from("strava_webhook_events")
      .update({ status: "done", processed_at: new Date().toISOString() })
      .eq("id", eventId);
    return NextResponse.json({ status: "ignored" });
  }

  // 3. Buscar integração do atleta (owner_id = Strava athlete ID)
  const { data: integration, error: integrationErr } = await supabase
    .from("athlete_integrations")
    .select("student_id")
    .eq("provider", "strava")
    .eq("provider_athlete_id", owner_id.toString())
    .single();

  if (!integration) {
    const msg = `Integração não encontrada para owner_id=${owner_id}: ${integrationErr?.message}`;
    console.error(`[PROCESS-STRAVA] ❌ ${msg}`);
    await supabase
      .from("strava_webhook_events")
      .update({ status: "error", error_message: msg, processed_at: new Date().toISOString() })
      .eq("id", eventId);
    return NextResponse.json({ status: "error", message: msg });
  }

  console.log(`[PROCESS-STRAVA] Integração encontrada: student_id=${integration.student_id}`);

  // 4. Garantir token válido e buscar detalhes da atividade na API do Strava
  let accessToken: string;
  try {
    const { getValidStravaToken } = await import("@/lib/strava");
    accessToken = await getValidStravaToken(integration.student_id);
  } catch (err) {
    const msg = `Erro ao obter token Strava: ${err instanceof Error ? err.message : String(err)}`;
    console.error(`[PROCESS-STRAVA] ❌ ${msg}`);
    await supabase
      .from("strava_webhook_events")
      .update({ status: "error", error_message: msg, processed_at: new Date().toISOString() })
      .eq("id", eventId);
    return NextResponse.json({ status: "error", message: msg });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  let activity: Record<string, unknown>;
  try {
    const res = await fetch(
      `https://www.strava.com/api/v3/activities/${object_id}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: controller.signal,
      }
    );
    clearTimeout(timeoutId);

    if (!res.ok) {
      const text = await res.text();
      const msg = `API Strava HTTP ${res.status}: ${text}`;
      console.error(`[PROCESS-STRAVA] ❌ ${msg}`);
      await supabase
        .from("strava_webhook_events")
        .update({ status: "error", error_message: msg, processed_at: new Date().toISOString() })
        .eq("id", eventId);
      return NextResponse.json({ status: "error", message: msg });
    }

    activity = await res.json();
  } catch (err) {
    clearTimeout(timeoutId);
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[PROCESS-STRAVA] ❌ Fetch falhou: ${msg}`);
    await supabase
      .from("strava_webhook_events")
      .update({ status: "error", error_message: msg, processed_at: new Date().toISOString() })
      .eq("id", eventId);
    return NextResponse.json({ status: "error", message: msg });
  }

  const sportType: string =
    (activity.sport_type as string) ?? (activity.type as string) ?? "";

  console.log(
    `[PROCESS-STRAVA] Atividade: "${activity.name}" | sport_type="${sportType}" | ${activity.distance}m | ${activity.moving_time}s`
  );

  // 5. Filtro de tipo de atividade
  if (!RUN_TYPES.has(sportType)) {
    console.log(`[PROCESS-STRAVA] Ignorado – tipo "${sportType}" não é corrida.`);
    await supabase
      .from("strava_webhook_events")
      .update({ status: "done", processed_at: new Date().toISOString() })
      .eq("id", eventId);
    return NextResponse.json({ status: "ignored", sport_type: sportType });
  }

  // 6. Calcular métricas
  const distanceKm = (activity.distance as number) / 1000;
  const movingTime = activity.moving_time as number;
  const paceSecPerKm = distanceKm > 0 ? Math.floor(movingTime / distanceKm) : 0;
  const expPoints = Math.floor(distanceKm * 10);

  console.log(
    `[PROCESS-STRAVA] Métricas: ${distanceKm.toFixed(2)}km | pace=${paceSecPerKm}s/km | ${expPoints}XP`
  );

  // 6.1. Verificar se este treino já foi processado (Idempotência)
  const { data: existingWorkout } = await supabase
    .from("running_workouts")
    .select("id")
    .eq("strava_activity_id", object_id)
    .maybeSingle();

  if (existingWorkout) {
    console.log(`[PROCESS-STRAVA] ⚠️ Treino já existe (strava_activity_id=${object_id}). Pulando inserção.`);
    await supabase
      .from("strava_webhook_events")
      .update({ status: "done", processed_at: new Date().toISOString() })
      .eq("id", eventId);
    return NextResponse.json({ status: "skipped", reason: "already_exists" });
  }

  // 7. Inserir workout no banco
  const { error: insertErr } = await supabase.from("running_workouts").insert({
    student_id: integration.student_id,
    plan_id: null,
    strava_activity_id: object_id,
    scheduled_date: new Date(activity.start_date as string).toISOString().split("T")[0],
    target_description: `Strava: ${activity.name}`,
    completed_at: new Date(activity.start_date as string).toISOString(),
    actual_distance_km: distanceKm,
    actual_duration_seconds: movingTime,
    actual_pace_seconds_per_km: paceSecPerKm,
    student_notes: "Sincronizado automaticamente via Strava.",
  });

  if (insertErr) {
    const msg = `Erro ao salvar treino: ${insertErr.message} | ${insertErr.details}`;
    console.error(`[PROCESS-STRAVA] ❌ ${msg}`);
    await supabase
      .from("strava_webhook_events")
      .update({ status: "error", error_message: msg, processed_at: new Date().toISOString() })
      .eq("id", eventId);
    return NextResponse.json({ status: "error", message: msg });
  }

  // 8. Gamificação: Atribuir XP
  if (expPoints > 0) {
    console.log(`[PROCESS-STRAVA] Atribuindo ${expPoints}XP para student_id=${integration.student_id}`);
    const { error: pointsError } = await supabase.rpc("increment_points", {
      user_id: integration.student_id,
      amount: expPoints
    });

    if (pointsError) {
      console.error("[PROCESS-STRAVA] ⚠️ Falha ao atribuir pontos:", pointsError.message);
      // Não falhamos o processo inteiro se apenas os pontos falharem, mas logamos.
    } else {
      console.log(`[PROCESS-STRAVA] ✅ Pontos atribuídos com sucesso.`);
    }
  }

  // 9. Marcar evento como concluído
  await supabase
    .from("strava_webhook_events")
    .update({ status: "done", processed_at: new Date().toISOString() })
    .eq("id", eventId);

  console.log(
    `[PROCESS-STRAVA] ✅ Treino salvo! ${distanceKm.toFixed(1)}km | ${expPoints}XP | student_id=${integration.student_id}`
  );

  return NextResponse.json({
    status: "success",
    distanceKm,
    expPoints,
    studentId: integration.student_id,
  });
}

import { NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { createClient } from "@supabase/supabase-js";

// Admin client – bypass RLS apenas neste contexto de webhook (servidor externo sem session)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Aumenta o limite de execução da Serverless Function para suportar o processamento em background
export const maxDuration = 30;

/**
 * Strava Webhook Verification (Handshake obrigatório na criação do Webhook)
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const VERIFY_TOKEN = "coliseu_strava_webhook_token_2026";

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("[STRAVA] Webhook verificado com sucesso.");
    return NextResponse.json({ "hub.challenge": challenge });
  }

  return new NextResponse("Forbidden", { status: 403 });
}

/**
 * Processamento assíncrono do evento: busca detalhes na API do Strava e salva no banco.
 * Executado via waitUntil() para não bloquear a resposta ao Strava.
 *
 * @param body - Payload do evento recebido do Strava
 */
async function processStravaEvent(body: {
  object_type: string;
  aspect_type: string;
  object_id: number;
  owner_id: number;
}) {
  // Cria o cliente dentro da função para garantir um contexto fresco
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { object_type, aspect_type, object_id, owner_id } = body;

  console.log(
    `[STRAVA] Iniciando processamento: type=${object_type}, aspect=${aspect_type}, owner=${owner_id}, activity=${object_id}`
  );

  // Só processa criação de atividade
  if (object_type !== "activity" || aspect_type !== "create") {
    console.log(`[STRAVA] Ignorado – não é criação de atividade.`);
    return;
  }

  // 1. Encontrar a integração do aluno pelo owner_id do Strava
  const { data: integration, error: integrationError } = await supabase
    .from("athlete_integrations")
    .select("student_id, access_token, refresh_token, expires_at")
    .eq("provider", "strava")
    .eq("provider_athlete_id", owner_id.toString())
    .single();

  if (integrationError || !integration) {
    console.error(
      `[STRAVA] ❌ Integração não encontrada para owner_id=${owner_id}. Erro: ${integrationError?.message ?? "null"}`
    );
    return;
  }

  console.log(`[STRAVA] Integração encontrada: student_id=${integration.student_id}`);

  // 2. Buscar detalhes da atividade na API do Strava com timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const activityRes = await fetch(
      `https://www.strava.com/api/v3/activities/${object_id}`,
      {
        headers: { Authorization: `Bearer ${integration.access_token}` },
        signal: controller.signal,
      }
    );
    clearTimeout(timeoutId);

    if (!activityRes.ok) {
      const errBody = await activityRes.text();
      console.error(
        `[STRAVA] ❌ Erro ao buscar atividade ${object_id}: HTTP ${activityRes.status} – ${errBody}`
      );
      return;
    }

    const activity = await activityRes.json();
    // A API v3 do Strava usa sport_type no schema moderno e type no legado
    const activitySportType: string = activity.sport_type ?? activity.type ?? "";

    console.log(
      `[STRAVA] Atividade recebida: name="${activity.name}", sport_type="${activitySportType}", distance=${activity.distance}m, moving_time=${activity.moving_time}s`
    );

    // 3. Filtro de tipos aceitos como atividade de corrida
    const RUN_TYPES = new Set([
      "Run",
      "TrailRun",
      "VirtualRun",
      "Treadmill",
      "Hike",
      "Walk",
    ]);

    if (!RUN_TYPES.has(activitySportType)) {
      console.log(`[STRAVA] Ignorado – tipo "${activitySportType}" não é corrida.`);
      return;
    }

    // 4. Calcular métricas
    const distanceKm = activity.distance / 1000;
    const movingTime: number = activity.moving_time;
    // Pace em segundos por km
    const paceSecPerKm = distanceKm > 0 ? Math.floor(movingTime / distanceKm) : 0;
    // 10 XP por km completado
    const expPoints = Math.floor(distanceKm * 10);

    console.log(
      `[STRAVA] Métricas: ${distanceKm.toFixed(2)}km | pace=${paceSecPerKm}s/km | ${expPoints} XP`
    );

    // 5. Inserir workout no banco – plan_id é NULL pois é sincronização via Strava
    const { error: insertErr } = await supabase.from("running_workouts").insert({
      student_id: integration.student_id,
      plan_id: null,
      scheduled_date: new Date(activity.start_date).toISOString().split("T")[0],
      target_description: `Strava: ${activity.name}`,
      completed_at: new Date(activity.start_date).toISOString(),
      actual_distance_km: distanceKm,
      actual_duration_seconds: movingTime,
      actual_pace_seconds_per_km: paceSecPerKm,
      student_notes: "Sincronizado automaticamente via Strava.",
    });

    if (insertErr) {
      console.error(
        `[STRAVA] ❌ Erro ao salvar treino: ${insertErr.message} | Detalhes: ${insertErr.details}`
      );
      return;
    }

    console.log(
      `[STRAVA] ✅ Treino salvo com sucesso! ${distanceKm.toFixed(1)}km | ${expPoints}XP | student_id=${integration.student_id}`
    );
  } catch (fetchErr: unknown) {
    clearTimeout(timeoutId);
    const errMsg =
      fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
    console.error(`[STRAVA] ❌ Fetch para API do Strava falhou: ${errMsg}`);
  }
}

/**
 * Handler principal do Webhook do Strava.
 * Retorna 200 imediatamente ao Strava e delega o processamento ao waitUntil()
 * do @vercel/functions, que mantém a Serverless Function viva até a conclusão.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log("[STRAVA] Webhook recebido:", JSON.stringify(body));

    // waitUntil() é o mecanismo oficial da Vercel para background jobs:
    // mantém a função serverless ativa até a promise resolver, mesmo após a resposta.
    waitUntil(processStravaEvent(body));

    // Responde ao Strava em < 2 segundos (requisito obrigatório da API deles)
    return NextResponse.json({ status: "received" });
  } catch (err) {
    console.error("[STRAVA] Erro ao parsear webhook payload:", err);
    return NextResponse.json({ status: "error" }, { status: 200 });
  }
}

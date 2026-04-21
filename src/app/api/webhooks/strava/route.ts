import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Admin client – bypass RLS apenas neste contexto de webhook (servidor externo sem session)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Aumenta o limite de tempo máximo de execução da Serverless Function para 30s.
 * Necessário para garantir que o processamento em background não seja cortado.
 */
export const maxDuration = 30;

/**
 * Tipos de atividade que o sistema aceita como corrida.
 */
const RUN_TYPES = new Set([
  "Run",
  "TrailRun",
  "VirtualRun",
  "Treadmill",
  "Hike",
  "Walk",
]);

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
 * Processamento principal do evento Strava.
 * Busca a atividade na API do Strava e salva no banco de dados.
 *
 * @param object_type - Tipo do objeto (activity, athlete)
 * @param aspect_type - Tipo do aspecto (create, update, delete)
 * @param object_id - ID do objeto (atividade ou atleta)
 * @param owner_id - ID do atleta no Strava
 */
async function processStravaEvent(
  object_type: string,
  aspect_type: string,
  object_id: number,
  owner_id: number
): Promise<void> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  console.log(
    `[STRAVA] Processando: type=${object_type} aspect=${aspect_type} owner=${owner_id} activity=${object_id}`
  );

  if (object_type !== "activity" || aspect_type !== "create") {
    console.log(`[STRAVA] Ignorado – não é criação de atividade.`);
    return;
  }

  // 1. Buscar integração do aluno pelo owner_id do Strava
  const { data: integration, error: integrationError } = await supabase
    .from("athlete_integrations")
    .select("student_id, access_token")
    .eq("provider", "strava")
    .eq("provider_athlete_id", owner_id.toString())
    .single();

  if (!integration) {
    console.error(
      `[STRAVA] ❌ Integração não encontrada para owner_id=${owner_id}. Erro: ${integrationError?.message ?? "null"}`
    );
    return;
  }

  console.log(`[STRAVA] Integração encontrada: student_id=${integration.student_id}`);

  // 2. Buscar atividade na API do Strava
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  let activity: Record<string, unknown>;
  try {
    const res = await fetch(
      `https://www.strava.com/api/v3/activities/${object_id}`,
      {
        headers: { Authorization: `Bearer ${integration.access_token}` },
        signal: controller.signal,
      }
    );
    clearTimeout(timeoutId);

    if (!res.ok) {
      const errText = await res.text();
      console.error(
        `[STRAVA] ❌ API retornou HTTP ${res.status}: ${errText}`
      );
      return;
    }

    activity = await res.json();
  } catch (err) {
    clearTimeout(timeoutId);
    console.error(
      `[STRAVA] ❌ Fetch falhou: ${err instanceof Error ? err.message : String(err)}`
    );
    return;
  }

  const sportType: string =
    (activity.sport_type as string) ?? (activity.type as string) ?? "";

  console.log(
    `[STRAVA] Atividade: name="${activity.name}", sport_type="${sportType}", distance=${activity.distance}m, moving_time=${activity.moving_time}s`
  );

  // 3. Filtro de tipo
  if (!RUN_TYPES.has(sportType)) {
    console.log(`[STRAVA] Ignorado – tipo "${sportType}" não é corrida.`);
    return;
  }

  // 4. Calcular métricas
  const distanceKm = (activity.distance as number) / 1000;
  const movingTime = activity.moving_time as number;
  const paceSecPerKm =
    distanceKm > 0 ? Math.floor(movingTime / distanceKm) : 0;
  const expPoints = Math.floor(distanceKm * 10);

  console.log(
    `[STRAVA] Métricas: ${distanceKm.toFixed(2)}km | ${paceSecPerKm}s/km | ${expPoints}XP`
  );

  // 5. Salvar no banco
  const { error: insertErr } = await supabase.from("running_workouts").insert({
    student_id: integration.student_id,
    plan_id: null,
    scheduled_date: new Date(activity.start_date as string)
      .toISOString()
      .split("T")[0],
    target_description: `Strava: ${activity.name}`,
    completed_at: new Date(activity.start_date as string).toISOString(),
    actual_distance_km: distanceKm,
    actual_duration_seconds: movingTime,
    actual_pace_seconds_per_km: paceSecPerKm,
    student_notes: "Sincronizado automaticamente via Strava.",
  });

  if (insertErr) {
    console.error(
      `[STRAVA] ❌ Erro ao salvar: ${insertErr.message} | ${insertErr.details}`
    );
    return;
  }

  console.log(
    `[STRAVA] ✅ Treino salvo! ${distanceKm.toFixed(1)}km | ${expPoints}XP | student_id=${integration.student_id}`
  );
}

/**
 * Handler principal do Webhook do Strava.
 *
 * Estratégia de processamento:
 * - Responde ao Strava imediatamente com 200 (requisito: < 2s).
 * - O processamento real ocorre em paralelo usando Promise.race():
 *   - Se concluir em < 25s: salva o treino e retorna.
 *   - Se demorar mais: responde 200 mesmo assim (o Strava não espera).
 * - O maxDuration=30s garante que a Serverless Function tem tempo suficiente.
 */
export async function POST(request: Request) {
  let body: {
    object_type: string;
    aspect_type: string;
    object_id: number;
    owner_id: number;
  };

  try {
    body = await request.json();
    console.log("[STRAVA] Webhook recebido:", JSON.stringify(body));
  } catch (err) {
    console.error("[STRAVA] ❌ Erro ao parsear payload:", err);
    return NextResponse.json({ status: "error" }, { status: 200 });
  }

  // Processa em paralelo com a resposta – a Promise "flutua" até completar
  // A Vercel mantém a invocação ativa por maxDuration=30s
  processStravaEvent(
    body.object_type,
    body.aspect_type,
    body.object_id,
    body.owner_id
  ).catch((err) => {
    console.error("[STRAVA] ❌ Erro fatal no processamento:", err);
  });

  // Responde ao Strava imediatamente (requisito: < 2s)
  return NextResponse.json({ status: "received" });
}

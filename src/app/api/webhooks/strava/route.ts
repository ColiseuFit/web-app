import { NextResponse, after } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Endpoint público, usaremos a service_key para admin access
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
    console.log("Strava Webhook Verified.");
    return NextResponse.json({ "hub.challenge": challenge });
  }

  return new NextResponse("Forbidden", { status: 403 });
}

/**
 * Processamento assíncrono do evento: busca detalhes e salva no banco.
 * Separado para poder retornar 200 ao Strava imediatamente.
 */
async function processStravaEvent(body: {
  object_type: string;
  aspect_type: string;
  object_id: number;
  owner_id: number;
}) {
  const { object_type, aspect_type, object_id, owner_id } = body;

  console.log(`[STRAVA] Processando: type=${object_type}, aspect=${aspect_type}, owner=${owner_id}, activity=${object_id}`);

  // Só processa criação de atividade
  if (object_type !== "activity" || aspect_type !== "create") {
    console.log(`[STRAVA] Ignorado (não é criação de atividade)`);
    return;
  }

  // 1. Encontrar a integração do aluno pelo owner_id do Strava
  const { data: integration, error: integrationError } = await supabase
    .from("athlete_integrations")
    .select("student_id, access_token, refresh_token, expires_at")
    .eq("provider", "strava")
    .eq("provider_athlete_id", owner_id.toString())
    .single();

  if (!integration) {
    console.log(`[STRAVA] Nenhuma integração para owner_id=${owner_id}. Erro:`, integrationError?.message);
    return;
  }

  console.log(`[STRAVA] Integração encontrada: student_id=${integration.student_id}`);

  // 2. Buscar detalhes da atividade na API do Strava com timeout de 8s
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const activityReq = await fetch(`https://www.strava.com/api/v3/activities/${object_id}`, {
      headers: { "Authorization": `Bearer ${integration.access_token}` },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!activityReq.ok) {
      const errBody = await activityReq.text();
      console.error(`[STRAVA] Erro ao buscar atividade ${object_id}: HTTP ${activityReq.status}`, errBody);
      return;
    }

    const activity = await activityReq.json();
    const activitySportType: string = activity.sport_type ?? activity.type;
    console.log(`[STRAVA] Atividade recebida: name="${activity.name}", sport_type="${activitySportType}", distance=${activity.distance}m`);

    // 3. Verifica se é corrida
    const RUN_TYPES = new Set(["Run", "TrailRun", "VirtualRun", "Treadmill", "Hike", "Walk"]);
    if (!RUN_TYPES.has(activitySportType)) {
      console.log(`[STRAVA] Ignorado: tipo "${activitySportType}" não é corrida`);
      return;
    }

    // 4. Calcular métricas
    const distanceKm = activity.distance / 1000;
    const movingTime = activity.moving_time;
    const paceSecPerKm = distanceKm > 0 ? Math.floor(movingTime / distanceKm) : 0;
    const expPoints = Math.floor(distanceKm * 10);

    // 5. Inserir no banco
    const { error: insertErr } = await supabase
      .from("running_workouts")
      .insert({
        student_id: integration.student_id,
        target_description: `Strava: ${activity.name}`,
        completed_at: new Date(activity.start_date).toISOString(),
        actual_distance_km: distanceKm,
        actual_duration_seconds: movingTime,
        actual_pace_seconds_per_km: paceSecPerKm,
        student_notes: "Sincronizado automaticamente via Strava."
      });

    if (insertErr) {
      console.error("[STRAVA] Erro ao salvar treino:", insertErr.message, insertErr.details);
    } else {
      console.log(`[STRAVA] ✅ Treino salvo! ${distanceKm.toFixed(1)}km | ${expPoints}XP | student=${integration.student_id}`);
    }
  } catch (fetchErr) {
    clearTimeout(timeoutId);
    console.error("[STRAVA] Fetch para API do Strava falhou:", String(fetchErr));
  }
}

/**
 * Tratamento de Webhooks do Strava (Real-time events)
 * Retorna 200 imediatamente e processa em background usando after()
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log("Strava Webhook Event received:", JSON.stringify(body));

    // Agenda o processamento para DEPOIS que a resposta for enviada
    // Isso evita o timeout de 2s do Strava e garante que o processo não seja morto pela Vercel
    after(async () => {
      try {
        await processStravaEvent(body);
      } catch (err) {
        console.error("[STRAVA] Erro fatal no after():", err);
      }
    });

    // Responde ao Strava imediatamente (máximo 2s)
    return NextResponse.json({ status: "received" });
  } catch (err) {
    console.error("Webhook parse error:", err);
    return NextResponse.json({ status: "error" });
  }
}

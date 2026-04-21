import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Endpoint público, usaremos a service_key para admin access
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Strava Webhook Verification (Handshake obrigatório na criação do Webhook via ngrok)
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
 * Tratamento de Webhooks do Strava (Real-time events)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log("Strava Webhook Event:", JSON.stringify(body, null, 2));

    const { object_type, aspect_type, object_id, owner_id } = body;

    // Só nos interessa quando um treino de corrida (Activity) for CRIADO
    if (object_type !== "activity" || aspect_type !== "create") {
      return NextResponse.json({ status: "ignored" });
    }

    // 1. Encontrar de qual aluno é esse evento (busca pelo owner_id no provider_athlete_id)
    const { data: integration } = await supabase
      .from("athlete_integrations")
      .select("student_id, access_token, refresh_token, expires_at")
      .eq("provider", "strava")
      .eq("provider_athlete_id", owner_id.toString())
      .single();

    if (!integration) {
      console.log(`Webhook Ignorado: Nenhum aluno encontrado com owner_id ${owner_id}`);
      return NextResponse.json({ status: "success" }); // Strava precisa de 200 OK rápido
    }

    // 2. Chamar a API do Strava para pegar detalhes do treino (ex: KM, Tempo)
    // Precisaria checar aqui se o expires_at do access_token já venceu e atualizá-lo
    // Para simplificar no MVP, assumimos sucesso da request
    
    const activityReq = await fetch(`https://www.strava.com/api/v3/activities/${object_id}`, {
      headers: { "Authorization": `Bearer ${integration.access_token}` }
    });

    if (!activityReq.ok) {
      console.error("Erro ao buscar atividade no Strava");
      return NextResponse.json({ status: "refresh_needed" });
    }

    const activity = await activityReq.json();

    // 3. Verifica se é corrida (API v3 usa sport_type, versões antigas usam type)
    // Aceita todos os tipos de corrida do Strava
    const RUN_TYPES = new Set([
      "Run", "TrailRun", "VirtualRun", 
      "Treadmill", "Hike", "Walk" // Inclui variações comuns
    ]);
    const activitySportType = activity.sport_type ?? activity.type;
    console.log(`Tipo da atividade recebida: sport_type=${activity.sport_type}, type=${activity.type}`);
    
    if (!RUN_TYPES.has(activitySportType)) {
      console.log(`Atividade ignorada: tipo "${activitySportType}" não é corrida.`);
      return NextResponse.json({ status: "ignored_not_a_run", type: activitySportType });
    }

    // 4. Inserir no Tracking (running_workouts) de forma livre (treino assíncrono/avulso)
    const distanceKm = activity.distance / 1000; // metros para km
    const movingTime = activity.moving_time;     // segundos
    
    // Pace e XP
    const paceSecPerKm = Math.floor(movingTime / distanceKm);
    
    // XP Gamification Híbrida: 10 XP por KM (ex)
    const expPoints = Math.floor(distanceKm * 10);

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
      console.error("Erro ao salvar treino de corrida:", insertErr);
    } else {
      console.log(`Treino salvo! Aluno ${integration.student_id} ganhou ${expPoints} XP.`);
      // Opcional: Atualizar a pontuação na tabela Profiles chamando Stored Procedure ou RPC
    }

    // Sempre responda 200 em 2s para o Strava não desabilitar o Webhook
    return NextResponse.json({ status: "success" });
  } catch (err) {
    console.error("Webhook Falhou:", err);
    // Retornamos 200 mesmo no erro pois o Strava fica estressando se falhar muito
    return NextResponse.json({ status: "error", error: String(err) });
  }
}

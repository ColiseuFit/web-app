import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { waitUntil } from "@vercel/functions";

const SITE_URL = process.env.NODE_ENV === "development"
  ? "http://localhost:3000"
  : (process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : ""));

// Token de verificação (deve coincidir com o configurado no Strava)
const VERIFY_TOKEN = "coliseu_strava_webhook_token_2026";

const INTERNAL_SECRET = process.env.INTERNAL_WEBHOOK_SECRET ?? "coliseu_internal_2026";

// maxDuration permite que a função fique viva por até 30s
export const maxDuration = 30;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Strava Webhook Verification (Handshake obrigatório na criação do Webhook)
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  console.log(`[STRAVA] Verificação recebida: mode=${mode}, token=${token}`);

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("[STRAVA] ✅ Webhook verificado com sucesso.");
    return NextResponse.json({ "hub.challenge": challenge });
  }

  console.error("[STRAVA] ❌ Falha na verificação do webhook. Token não coincide.");
  return new NextResponse("Forbidden", { status: 403 });
}

/**
 * Handler principal do Webhook do Strava.
 *
 * Estratégia de fila:
 * 1. Salva o evento bruto na tabela `strava_webhook_events` (< 100ms).
 * 2. Dispara o endpoint de processamento via fetch fire-and-forget (sem await).
 * 3. Responde 200 ao Strava imediatamente.
 *
 * O processamento pesado (busca na API do Strava + insert no banco) ocorre
 * numa invocação serverless independente, sem risco de timeout.
 */
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ status: "error" }, { status: 200 });
  }

  console.log("[STRAVA] Evento recebido:", JSON.stringify(body));

  // 1. Persiste na fila (a operação mais rápida possível)
  const { data: event, error } = await supabase
    .from("strava_webhook_events")
    .insert({
      object_type: body.object_type,
      aspect_type: body.aspect_type,
      object_id: body.object_id,
      owner_id: body.owner_id,
      event_time: body.event_time,
      raw_payload: body,
      status: "pending",
    })
    .select("id")
    .single();

  if (error || !event) {
    console.error("[STRAVA] Falha ao salvar na fila:", error?.message);
    // Mesmo com falha no banco, responde 200 para o Strava não desistir
    return NextResponse.json({ status: "received" });
  }

  console.log(`[STRAVA] Evento salvo na fila: id=${event.id}`);

  // 2. Dispara o processamento em segundo plano (background task) de forma segura no Vercel
  const processorUrl = `${SITE_URL}/api/internal/process-strava`;
  const processPromise = fetch(processorUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-internal-secret": INTERNAL_SECRET,
    },
    body: JSON.stringify({ eventId: event.id }),
  })
    .then(async (res) => {
      const data = await res.json();
      console.log("[STRAVA] Processador executado com sucesso:", JSON.stringify(data));
    })
    .catch((err) => {
      console.error("[STRAVA] Processador retornou erro:", err);
    });

  // Mantém a execução da Promise em segundo plano ativa mesmo após responder a requisição
  waitUntil(processPromise);

  // 3. Responde ao Strava imediatamente (< 50ms) para evitar timeouts e retentativas
  return NextResponse.json({ status: "received" });
}

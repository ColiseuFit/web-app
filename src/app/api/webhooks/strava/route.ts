import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Segredo interno para autorizar o endpoint de processamento
// Evita que qualquer pessoa chame /api/internal/process-strava diretamente
const INTERNAL_SECRET = process.env.INTERNAL_WEBHOOK_SECRET ?? "coliseu_internal_2026";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://clube.coliseufit.com";

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

  if (mode === "subscribe" && token === "coliseu_strava_webhook_token_2026") {
    console.log("[STRAVA] Webhook verificado.");
    return NextResponse.json({ "hub.challenge": challenge });
  }

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

  // 2. Dispara o processador em background (fire-and-forget, sem await)
  // Cada evento recebe sua própria invocação serverless, sem riscos de timeout
  fetch(`${SITE_URL}/api/internal/process-strava`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-internal-secret": INTERNAL_SECRET,
    },
    body: JSON.stringify({ eventId: event.id }),
  }).catch((err) => {
    console.error("[STRAVA] Falha ao disparar processador:", err);
  });

  // 3. Responde ao Strava em < 2s
  return NextResponse.json({ status: "received" });
}

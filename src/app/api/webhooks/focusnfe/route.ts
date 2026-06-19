import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Webhook Receiver para a Focus NFe.
 * A FocusNFe enviará um POST para este endpoint sempre que o status de uma nota
 * for atualizado (ex: autorizada, cancelada, erro).
 * 
 * @param {NextRequest} request - Payload POST da FocusNFe com os status.
 * @returns {Promise<NextResponse>} Resposta de aceite do webhook.
 * 
 * @architecture
 * - Recebe payload JSON assíncrono.
 * - Localiza a fatura via `ref` (que mapeamos para invoiceId).
 * - Atualiza colunas `nfe_status`, `nfe_url`, etc.
 * 
 * @security
 * - RLS Bypass: A rota de Webhook não opera com uma sessão HTTP de usuário real. 
 * Para atualizar a tabela `invoices`, inicializamos o cliente Supabase utilizando a 
 * `SUPABASE_SERVICE_ROLE_KEY`. Isso garante que o sistema em background tenha permissões.
 * 
 * @dateHandling
 * - UTC Enforcement: As marcações de `nfe_issued_at` usam `.toISOString()` para sincronia.
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();

    console.log("[Webhook FocusNFe] Recebido payload:", payload);

    // Na Focus NFe, a referência que enviamos (nfe_id ou nossa invoice id) volta no campo `ref`
    const invoiceId = payload.ref;
    const statusFocus = payload.status; // "autorizado", "erro_autorizacao", "cancelado", etc.

    if (!invoiceId) {
      return NextResponse.json({ error: "Missing 'ref' in payload" }, { status: 400 });
    }

    // Inicializa Supabase Client com Service Role para burlar RLS (já que é um Webhook backend to backend)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("[Webhook] Supabase credentials missing");
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Mapeia status do Focus para nosso banco
    let mappedStatus = "processing";
    let errorMessage = null;

    if (statusFocus === "autorizado") {
      mappedStatus = "issued";
    } else if (statusFocus === "erro_autorizacao") {
      mappedStatus = "error";
      errorMessage = payload.erros ? JSON.stringify(payload.erros) : "Erro na prefeitura.";
    } else if (statusFocus === "cancelado") {
      mappedStatus = "cancelled";
    }

    // Atualiza Invoice
    const updateData: any = {
      nfe_status: mappedStatus,
    };

    if (payload.url) {
      updateData.nfe_url = payload.url;
    }
    if (payload.caminho_xml_nota_fiscal) {
      updateData.nfe_access_key = payload.caminho_xml_nota_fiscal; // Pode ser salvo na chave de acesso
    }
    if (errorMessage) {
      updateData.nfe_error_message = errorMessage;
    }
    if (mappedStatus === "issued") {
      updateData.nfe_issued_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from("invoices")
      .update(updateData)
      .eq("id", invoiceId);

    if (error) {
      console.error("[Webhook FocusNFe] Erro ao atualizar Invoice no Supabase:", error);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    return NextResponse.json({ received: true, status: mappedStatus });

  } catch (err: any) {
    console.error("[Webhook FocusNFe] Falha ao processar:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

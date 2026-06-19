import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Webhook Receiver para a Pagar.me V5.
 * A Pagar.me enviará POSTs aqui quando pagamentos de assinaturas ou cobranças avulsas
 * forem aprovados ou recusados.
 * 
 * @security RLS Bypass via Service Role Key
 * @dateHandling UTC Enforcement no timestamp
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();

    // Na Pagar.me o tipo de evento dita a ação (ex: 'charge.paid', 'charge.failed')
    const type = payload.type;
    const data = payload.data; // O objeto da cobrança (Charge)

    console.log(`[Webhook Pagar.me] Recebido evento: ${type}`);

    // Extraímos o ID da nossa Invoice que enviamos como "code" ou "metadata" na cobrança
    // O padrão da Pagar.me V5 permite passar 'metadata.invoice_id' na criação da Order/Charge
    const invoiceId = data?.metadata?.invoice_id || data?.order?.metadata?.invoice_id;

    if (!invoiceId) {
      return NextResponse.json({ error: "No invoice_id found in metadata" }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: "Server credentials error" }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let updateData: any = {};

    if (type === "charge.paid" || type === "order.paid") {
      updateData = {
        status: "paid",
        paid_at: new Date().toISOString(), // UTC Enforcement
      };
    } else if (type === "charge.failed" || type === "order.failed") {
      // Se falhou, continua pendente, o retry tentará depois. Mas podemos registrar log se quisermos.
      // updateData = { status: "overdue" }; 
      console.log(`[Webhook Pagar.me] Cobrança falhou para invoice ${invoiceId}`);
      return NextResponse.json({ received: true, status: "ignored" });
    } else {
      return NextResponse.json({ received: true, status: "unhandled_event" });
    }

    if (Object.keys(updateData).length > 0) {
      const { error } = await supabase
        .from("invoices")
        .update(updateData)
        .eq("id", invoiceId);

      if (error) {
        console.error("[Webhook Pagar.me] Erro ao atualizar fatura:", error);
        return NextResponse.json({ error: "Database error" }, { status: 500 });
      }
    }

    return NextResponse.json({ received: true, status: "processed" });
  } catch (err: any) {
    console.error("[Webhook Pagar.me] Error:", err.message);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

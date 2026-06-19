"use server";

import { createClient } from "@/lib/supabase/server";
import { getBoxSettings } from "@/lib/constants/settings_actions";
import { revalidatePath } from "next/cache";

/**
 * emitInvoiceAction: Dispara a emissão de Nota Fiscal de Serviços (NFS-e)
 * utilizando o gateway fiscal configurado (ex: FocusNFe).
 * 
 * @param {string} invoiceId - ID da fatura no Supabase.
 * @returns {Promise<{success: boolean, error?: string, nfe_status?: string}>} Resultado e novo status.
 * @throws {Error} Retorna erro estruturado em vez de disparar exceção para a UI.
 * 
 * @architecture
 * - Padrão Centralized Aggregator Action (Anti-Monolith).
 * - O fluxo de processamento é assíncrono. Esta função coloca a nota em 'pending/processing'.
 * - O Webhook finalizará o processo e retornará 'issued' + URL do PDF.
 * 
 * @security
 * - Autenticação no Gateway via HTTP Basic Auth com o token isolado em `box_settings`.
 * 
 * @dateHandling
 * - UTC Enforcement: O payload fiscal usa `new Date().toISOString()` (UTC) para evitar
 * problemas de shift de fuso em ambientes Serverless ou navegadores de clientes.
 */
export async function emitInvoiceAction(invoiceId: string) {
  try {
    const supabase = await createClient();

    // 1. Obter configurações fiscais do Box
    const settings = await getBoxSettings();

    if (settings.fiscal_enabled !== "true") {
      return { success: false, error: "Emissão de notas fiscais está desativada nas configurações." };
    }

    const token = settings.fiscal_gateway_token;
    if (!token) {
      return { success: false, error: "Token do gateway fiscal não configurado." };
    }

    // 2. Buscar a fatura e o aluno
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select("*, student:students(*)")
      .eq("id", invoiceId)
      .single();

    if (invoiceError || !invoice) {
      return { success: false, error: "Fatura não encontrada." };
    }

    if (invoice.nfe_status === "issued" || invoice.nfe_status === "processing") {
      return { success: false, error: `Fatura já está com status fiscal: ${invoice.nfe_status}` };
    }

    const student = invoice.student;
    if (!student || !student.cpf) {
      return { success: false, error: "Aluno não possui CPF cadastrado. Obrigatório para NF." };
    }

    // 3. Preparar payload FocusNFe
    // Teixeira de Freitas IBGE: 2931350
    // O ambiente de homologação usa homologacao.api, e produção api.
    const isProd = settings.fiscal_environment === "production";
    const baseURL = isProd ? "https://api.focusnfe.com.br/v2" : "https://homologacao.api.focusnfe.com.br/v2";

    // Inferir dados do Box, se não informados tenta um padrão (Idealmente Box deve preencher Box Info)
    const boxCnpj = settings.box_cnpj ? settings.box_cnpj.replace(/\D/g, "") : "00000000000000";
    const boxIM = settings.box_inscricao_municipal || "000000";

    const payload = {
      data_emissao: new Date().toISOString(),
      prestador: {
        cnpj: boxCnpj,
        inscricao_municipal: boxIM,
        codigo_municipio: "2931350", // Teixeira de Freitas - BA
      },
      tomador: {
        cnpj_cpf: student.cpf.replace(/\D/g, ""),
        razao_social: student.name,
        email: student.email || "",
        endereco: {
          logradouro: student.address || "Não informado",
          numero: student.address_number || "S/N",
          bairro: student.neighborhood || "Não informado",
          codigo_municipio: student.city_code || "2931350", // Padronizado provisório
          uf: student.state || "BA",
          cep: student.zip_code ? student.zip_code.replace(/\D/g, "") : "45900000"
        }
      },
      servico: {
        aliquota: parseFloat(settings.fiscal_iss_rate || "5.00"),
        discriminacao: `${settings.fiscal_service_description || "Mensalidade"} - Fatura #${invoice.id.substring(0,8)}`,
        iss_retido: "2", // 2 = Não Retido
        item_lista_servico: settings.fiscal_cnae ? settings.fiscal_cnae.replace(/\D/g, "") : "06939",
        valor_servicos: invoice.amount,
        valor_liquido: invoice.amount
      }
    };

    // 4. Enviar para a API do Gateway Fiscal
    const authHeader = `Basic ${Buffer.from(`${token}:`).toString("base64")}`;
    
    // Na v2 da FocusNFe, usamos o ref= na URL para idempotência
    const response = await fetch(`${baseURL}/nfse?ref=${invoiceId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": authHeader,
      },
      body: JSON.stringify(payload),
    });

    const responseData = await response.json();

    // 5. Analisar Retorno e Salvar Status
    // A Focus NFe pode retornar 200 (se já existia e está reenviando), 202 (Processing), ou Erro.
    if (!response.ok) {
      console.error("[NFS-e] Erro do Gateway:", responseData);
      
      // Update local invoice as error
      await supabase.from("invoices").update({
        nfe_status: "error",
        nfe_error_message: responseData.mensagem || responseData.codigo || "Erro ao comunicar com Gateway Fiscal",
      }).eq("id", invoiceId);

      return { 
        success: false, 
        error: `Erro no Gateway: ${responseData.mensagem || "Desconhecido"}` 
      };
    }

    // Sucesso - Em Processamento (202) ou já autorizada
    await supabase.from("invoices").update({
      nfe_status: "processing",
      nfe_id: responseData.id || "", 
      nfe_error_message: null
    }).eq("id", invoiceId);

    revalidatePath("/admin/financeiro");
    return { success: true, nfe_status: "processing" };

  } catch (error: any) {
    console.error("[NFS-e] Exception em emitInvoiceAction:", error);
    return { success: false, error: "Falha de comunicação interna com o módulo fiscal." };
  }
}

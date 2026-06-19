"use server";

import { createClient } from "@/lib/supabase/server";
import { getBoxSettings } from "@/lib/constants/settings_actions";

/**
 * Motor de Pagamentos Pagar.me V5 (Stone)
 * Lida com a criação de clientes (Vault), tokenização de cartões e cobranças.
 */

// 1. Helpers
async function getPagarmeCredentials() {
  const settings = await getBoxSettings();
  const secretKey = settings.pagarme_secret_key;
  if (!secretKey) throw new Error("Chave secreta da Pagar.me não configurada.");
  
  // Basic Auth com chave secreta
  const authHeader = `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`;
  return { authHeader, secretKey };
}

/**
 * Cria ou recupera um Customer na Pagar.me associado ao Aluno do Supabase.
 * @param studentId O ID do aluno
 */
export async function getOrCreatePagarmeCustomer(studentId: string) {
  try {
    const supabase = await createClient();
    const { authHeader } = await getPagarmeCredentials();

    // 1. Checar se já mapeamos este cliente antes
    const { data: existingMap } = await supabase
      .from("payment_customers")
      .select("gateway_customer_id")
      .eq("student_id", studentId)
      .eq("gateway", "pagarme")
      .single();

    if (existingMap) return existingMap.gateway_customer_id;

    // 2. Buscar dados reais do Aluno
    const { data: student, error: studentErr } = await supabase
      .from("profiles")
      .select("full_name, email, cpf, phone")
      .eq("id", studentId)
      .single();

    if (studentErr || !student) throw new Error("Aluno não encontrado.");
    if (!student.cpf) throw new Error("O aluno precisa de um CPF para cobrança.");

    // 3. Criar o Customer na Pagar.me
    const payload = {
      name: student.full_name,
      email: student.email || `${studentId}@coliseu.com.br`, // Pagar.me exige email ou fallback
      document: student.cpf.replace(/\D/g, ""),
      type: "individual",
      code: studentId,
      phones: { mobile_phone: { country_code: "55", area_code: (student.phone || "11").substring(0,2), number: (student.phone || "999999999").substring(2) } }
    };

    const res = await fetch("https://api.pagar.me/core/v5/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": authHeader },
      body: JSON.stringify(payload)
    });

    const responseData = await res.json();
    if (!res.ok) {
      console.error("[Pagar.me Error] Create Customer:", responseData);
      throw new Error("Erro na Pagar.me ao criar cliente.");
    }

    const customerId = responseData.id;

    // 4. Salvar o mapeamento localmente
    await supabase.from("payment_customers").insert({
      student_id: studentId,
      gateway: "pagarme",
      gateway_customer_id: customerId
    });

    return customerId;
  } catch (error: any) {
    console.error("[Pagar.me Engine]", error.message);
    throw error;
  }
}

/**
 * Adiciona um cartão de crédito no vault da Pagar.me e salva os 4 últimos dígitos no nosso banco.
 * @security NUNCA damos console.log nos dados do cartão (PCI Leak).
 */
export async function tokenizeAndSaveCard(studentId: string, cardData: { number: string, holder_name: string, exp_month: number, exp_year: number, cvv: string }) {
  try {
    const supabase = await createClient();
    const { authHeader } = await getPagarmeCredentials();

    const customerId = await getOrCreatePagarmeCustomer(studentId);

    // Enviar dados sensíveis para a Pagar.me V5
    const payload = {
      number: cardData.number.replace(/\D/g, ""),
      holder_name: cardData.holder_name,
      exp_month: cardData.exp_month,
      exp_year: cardData.exp_year,
      cvv: cardData.cvv
    };

    const res = await fetch(`https://api.pagar.me/core/v5/customers/${customerId}/cards`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": authHeader },
      body: JSON.stringify(payload)
    });

    const responseData = await res.json();
    
    if (!res.ok) {
      throw new Error(responseData?.message || "Cartão recusado pela Pagar.me");
    }

    // Salvar apenas os dados não-sensíveis no nosso banco
    const cardId = responseData.id;
    const last4 = responseData.last_four_digits;
    const brand = responseData.brand;

    // Desativa cartões antigos (Deixa só 1 principal por padrão)
    await supabase.from("payment_methods").update({ is_default: false }).eq("student_id", studentId);

    const { error } = await supabase.from("payment_methods").insert({
      student_id: studentId,
      gateway: "pagarme",
      gateway_token: cardId, // Este é o tok_ / card_
      card_brand: brand,
      card_last_4: last4,
      card_exp_month: cardData.exp_month,
      card_exp_year: cardData.exp_year,
      card_holder_name: cardData.holder_name,
      is_default: true
    });

    if (error) throw new Error("Cartão aprovado, mas falhou ao salvar internamente.");

    return { success: true, brand, last4 };
  } catch (error: any) {
    console.error("[Pagar.me Engine] Tokenize Falha:", error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Cobra uma fatura avulsa utilizando o cartão default do aluno.
 * @param invoiceId ID da fatura no nosso banco.
 */
export async function chargeInvoiceNow(invoiceId: string) {
  // Lógica de cobrança manual
  return { success: false, error: "Função 'chargeInvoiceNow' aguardando chaves reais da Stone." };
}

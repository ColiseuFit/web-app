"use server";

/**
 * @module pagarme-actions
 * @description
 * Server Actions responsáveis por orquestrar a comunicação entre o banco
 * de dados interno (Supabase) e a Pagar.me V5.
 * 
 * Este arquivo garante que as chaves (Secret Keys) nunca vazem para o front-end
 * e mantém as tabelas `payment_customers` e `payment_methods` sincronizadas
 * com os IDs gerados pela Stone (`cus_xxx`, `card_xxx`).
 */

import { createClient } from "@/lib/supabase/server";
import { 
  createPagarmeCustomer, 
  createPagarmeCard, 
  PagarmeCredentials 
} from "../gateways/pagarme-v5";

/**
 * Obtém as credenciais da Stone criptografadas no banco (Configurações do Tenant)
 */
async function getPagarmeCredentials(): Promise<PagarmeCredentials | null> {
  const supabase = await createClient();
  
  // No Coliseu, as configurações ficam em `tenant_settings` (row única do tenant logado)
  const { data: settings } = await supabase
    .from("tenant_settings")
    .select("gateway_settings")
    .single();

  if (!settings || !settings.gateway_settings || !settings.gateway_settings.pagarme_secret_key) {
    return null;
  }

  return {
    secretKey: settings.gateway_settings.pagarme_secret_key
  };
}

/**
 * Garante que o Aluno tenha um `gateway_customer_id` na Stone.
 * Se não tiver, cria lá e salva na `payment_customers`.
 */
export async function ensureCustomerExists(studentId: string) {
  const supabase = await createClient();

  // 1. Verifica se já existe um customer para esse aluno
  const { data: existingCustomer } = await supabase
    .from("payment_customers")
    .select("*")
    .eq("student_id", studentId)
    .eq("gateway_provider", "pagarme_v5")
    .single();

  if (existingCustomer) {
    return { success: true, gateway_customer_id: existingCustomer.gateway_customer_id };
  }

  // 2. Não existe. Obter dados do aluno
  const { data: student, error: studentError } = await supabase
    .from("students")
    .select("*")
    .eq("id", studentId)
    .single();

  if (studentError || !student) {
    return { success: false, error: "Aluno não encontrado." };
  }

  // 3. Obter credenciais
  const credentials = await getPagarmeCredentials();
  if (!credentials) {
    return { success: false, error: "Integração Stone não configurada." };
  }

  // 4. Montar Payload para a Stone (Limpando formatações)
  const rawDocument = student.cpf?.replace(/\D/g, "");
  const rawPhone = student.phone?.replace(/\D/g, "") || "";
  
  let areaCode = "11";
  let number = "999999999";
  if (rawPhone.length >= 10) {
    areaCode = rawPhone.substring(0, 2);
    number = rawPhone.substring(2);
  }

  try {
    // 5. Chamar API da Pagar.me
    const pagarmeCustomer = await createPagarmeCustomer(credentials, {
      name: student.full_name,
      email: student.email,
      document: rawDocument || "00000000000",
      document_type: "CPF",
      type: "individual",
      phones: {
        mobile_phone: {
          country_code: "55",
          area_code: areaCode,
          number: number
        }
      }
    });

    // 6. Salvar ID da operadora no nosso BD
    const { error: insertError } = await supabase
      .from("payment_customers")
      .insert({
        student_id: studentId,
        gateway_customer_id: pagarmeCustomer.id,
        gateway_provider: "pagarme_v5"
      });

    if (insertError) {
      console.error("[Pagar.me Action] DB Insert Error:", insertError);
      return { success: false, error: "Erro ao sincronizar cliente internamente." };
    }

    return { success: true, gateway_customer_id: pagarmeCustomer.id };
  } catch (err: any) {
    console.error("[Pagar.me Action] Exception:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Vincula um Cartão Tokenizado gerado pelo App/Recepção ao Aluno
 */
export async function addCreditCardFromToken(studentId: string, tokenId: string, brand: string, lastFour: string) {
  const supabase = await createClient();

  // 1. Garante que o Customer existe na Stone
  const customerResult = await ensureCustomerExists(studentId);
  if (!customerResult.success || !customerResult.gateway_customer_id) {
    return { success: false, error: customerResult.error };
  }

  // 2. Obter chaves
  const credentials = await getPagarmeCredentials();
  if (!credentials) {
    return { success: false, error: "Integração Stone não configurada." };
  }

  try {
    // 3. Vincular cartão na operadora
    const pagarmeCard = await createPagarmeCard(credentials, {
      customer_id: customerResult.gateway_customer_id,
      token: tokenId
    });

    // 4. Como é o novo cartão, se for o primeiro, colocar como default.
    const { count } = await supabase
      .from("payment_methods")
      .select("*", { count: 'exact', head: true })
      .eq("student_id", studentId);
    
    const isDefault = count === 0;

    // 5. Salvar cartão no nosso banco
    const { error: insertError } = await supabase
      .from("payment_methods")
      .insert({
        student_id: studentId,
        gateway_card_id: pagarmeCard.id,
        gateway_provider: "pagarme_v5",
        method_type: "credit_card",
        brand: brand || pagarmeCard.brand,
        last_four: lastFour || pagarmeCard.last_four_digits,
        is_default: isDefault
      });

    if (insertError) {
      console.error("[Pagar.me Action] DB Card Error:", insertError);
      return { success: false, error: "Erro ao salvar cartão localmente." };
    }

    return { success: true, message: "Cartão vinculado com sucesso!" };
  } catch (err: any) {
    console.error("[Pagar.me Action] Add Card Exception:", err);
    return { success: false, error: err.message };
  }
}

/**
 * @file finance-actions.ts
 * @description Server Actions para controle de faturas, fluxo de caixa e recebimento de pagamentos da academia.
 * @module Financeiro
 * 
 * @security RLS
 * Todas as escritas e leituras na tabela `invoices` respeitam as políticas de RLS no Supabase.
 */

"use server";

import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

// Zod Schema para Validação de Criação de Fatura Manual
const invoiceValidationSchema = z.object({
  student_id: z.string().uuid("Aluno inválido."),
  title: z.string().min(3, "O título da cobrança deve ter no mínimo 3 caracteres."),
  amount: z.number().positive("O valor deve ser maior que zero."),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data de vencimento inválida (formato YYYY-MM-DD).")
});

/**
 * @function getInvoices
 * @description Recupera todas as faturas cadastradas filtradas por status.
 * Hidrata os dados com o perfil do aluno (profiles: full_name).
 * 
 * @param {string} [status] - Filtro opcional por status ('pending', 'paid', 'canceled', 'overdue').
 * @returns {Promise<any[]>} Retorna a lista de faturas encontradas.
 */
export async function getInvoices(status?: "pending" | "paid" | "canceled" | "overdue") {
  const supabase = await createClient();
  
  let query = supabase
    .from("invoices")
    .select("*, profiles(full_name)");

  if (status) {
    query = query.eq("status", status);
  }

  // Ordena faturas pendentes/atrasadas mais próximas primeiro, e pagas mais recentes primeiro
  if (status === "paid") {
    query = query.order("paid_at", { ascending: false });
  } else {
    query = query.order("due_date", { ascending: true });
  }

  const { data, error } = await query;

  if (error) {
    console.error("[getInvoices] Error:", error);
    return [];
  }

  return data || [];
}

/**
 * @function createInvoice
 * @description Registra manualmente uma nova fatura avulsa para um aluno (venda de produto, taxa, diária).
 * 
 * @param {object} formData - Dados de entrada da fatura.
 * @returns {Promise<{success: boolean, data?: any, error?: string}>} Confirmação de cadastro.
 */
export async function createInvoice(formData: { student_id: string; title: string; amount: number; due_date: string }) {
  const supabase = await createClient();

  const validation = invoiceValidationSchema.safeParse(formData);
  if (!validation.success) {
    const errorMsg = validation.error.errors.map(e => e.message).join(" ");
    return { success: false, error: errorMsg };
  }

  try {
    const { data, error } = await supabase
      .from("invoices")
      .insert({
        student_id: validation.data.student_id,
        title: validation.data.title,
        amount: validation.data.amount,
        due_date: validation.data.due_date,
        status: "pending"
      })
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (err: any) {
    console.error("[createInvoice] Exception:", err);
    return { success: false, error: err.message || "Erro ao registrar cobrança no banco." };
  }
}

/**
 * @function payInvoice
 * @description Realiza a baixa de uma fatura pendente ou em atraso, registrando a data e forma de pagamento.
 * 
 * @param {string} id - UUID da fatura.
 * @param {'credit_card_recurrent' | 'credit_card_installments' | 'pix' | 'boleto' | 'cash'} paymentMethod - Forma de pagamento.
 * @returns {Promise<{success: boolean, error?: string}>} Status do recebimento.
 * 
 * @utc_enforcement
 * Salva o timestamp `paid_at` em formato ISO UTC padrão.
 */
export async function payInvoice(
  id: string,
  paymentMethod: "credit_card_recurrent" | "credit_card_installments" | "pix" | "boleto" | "cash"
) {
  const supabase = await createClient();

  try {
    const { error } = await supabase
      .from("invoices")
      .update({
        status: "paid",
        payment_method: paymentMethod,
        paid_at: new Date().toISOString(), // Enforcement UTC
        updated_at: new Date().toISOString()
      })
      .eq("id", id);

    if (error) throw error;

    return { success: true };
  } catch (err: any) {
    console.error("[payInvoice] Exception:", err);
    return { success: false, error: err.message || "Erro ao liquidar pagamento." };
  }
}

/**
 * @function cancelInvoice
 * @description Cancela permanentemente uma fatura pendente.
 * 
 * @param {string} id - UUID da fatura.
 * @returns {Promise<{success: boolean, error?: string}>} Status do cancelamento.
 */
export async function cancelInvoice(id: string) {
  const supabase = await createClient();

  try {
    const { error } = await supabase
      .from("invoices")
      .update({
        status: "canceled",
        updated_at: new Date().toISOString()
      })
      .eq("id", id);

    if (error) throw error;

    return { success: true };
  } catch (err: any) {
    console.error("[cancelInvoice] Exception:", err);
    return { success: false, error: err.message || "Erro ao cancelar fatura." };
  }
}

/**
 * @function getActiveStudents
 * @description Busca a lista compacta de alunos (perfis) para preenchimento de seletores (dropdowns).
 * 
 * @returns {Promise<any[]>} Retorna a lista de alunos (id, full_name).
 */
export async function getActiveStudents() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name")
    .order("full_name", { ascending: true });

  if (error) {
    console.error("[getActiveStudents] Error:", error);
    return [];
  }

  return data || [];
}

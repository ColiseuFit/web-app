/**
 * @file parq.ts
 * @description Server Actions para gerenciamento de perguntas do Questionário de Prontidão para Atividade Física (PAR-Q).
 * @module Compliance
 * 
 * @security RLS
 * Todas as operações na tabela `par_q_questions` respeitam as políticas de RLS ativas
 * no Supabase. O bypass por service_role não é utilizado no client.
 */

"use server";

import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

/**
 * Esquema de validação Zod para os dados de perguntas do PAR-Q.
 * Garante a tipagem estrita na camada de Server Actions.
 */
const parqQuestionSchema = z.object({
  question_text: z.string().min(5, "A pergunta deve ter pelo menos 5 caracteres."),
  is_active: z.boolean().default(true)
});

/**
 * @function getParqQuestions
 * @description Recupera todas as perguntas do PAR-Q ordenadas pelo índice de ordenação sequencial.
 * 
 * @returns {Promise<any[]>} Retorna um array com as perguntas encontradas.
 * @throws {Error} Lança um erro caso ocorra falha na conexão ou leitura do banco de dados.
 */
export async function getParqQuestions() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("par_q_questions")
    .select("*")
    .order("order_index", { ascending: true });

  if (error) {
    console.error("Erro ao buscar perguntas do PAR-Q:", error);
    throw new Error("Não foi possível carregar o PAR-Q.");
  }

  return data;
}

/**
 * @function addParqQuestion
 * @description Valida e adiciona uma nova pergunta ao fim da lista sequencial do questionário.
 * 
 * @param {object} formData - Dados da pergunta enviados do formulário cliente.
 * @param {string} formData.question_text - O texto da pergunta (mínimo 5 caracteres).
 * @param {boolean} [formData.is_active=true] - Status de ativação da pergunta.
 * 
 * @returns {Promise<{ success: boolean; data?: any; error?: string }>} Resultado indicando o sucesso e os dados persistidos, ou erro de validação/banco.
 */
export async function addParqQuestion(formData: any) {
  try {
    const validatedData = parqQuestionSchema.parse(formData);
    const supabase = await createClient();

    // Descobrir o último order_index para inserção sequencial ao final
    const { data: currentQuestions, error: fetchError } = await supabase
      .from("par_q_questions")
      .select("order_index")
      .order("order_index", { ascending: false })
      .limit(1);

    if (fetchError) throw fetchError;

    const nextOrder = currentQuestions && currentQuestions.length > 0 ? currentQuestions[0].order_index + 1 : 1;

    const { data, error } = await supabase
      .from("par_q_questions")
      .insert({
        question_text: validatedData.question_text,
        is_active: validatedData.is_active,
        order_index: nextOrder
      })
      .select()
      .single();

    if (error) throw error;
    
    return { success: true, data };
  } catch (err: any) {
    console.error("Erro em addParqQuestion:", err);
    if (err instanceof z.ZodError) {
      return { success: false, error: err.errors[0].message };
    }
    return { success: false, error: err.message || "Erro desconhecido ao adicionar pergunta." };
  }
}

/**
 * @function updateParqQuestion
 * @description Atualiza o texto ou status de ativação de uma pergunta existente.
 * 
 * @param {string} id - O ID único da pergunta (UUID).
 * @param {object} formData - Dados atualizados da pergunta.
 * @param {string} formData.question_text - Novo texto da pergunta.
 * @param {boolean} formData.is_active - Novo status de ativação da pergunta.
 * 
 * @returns {Promise<{ success: boolean; error?: string }>} Resposta de sucesso ou erro.
 * 
 * @utc
 * Atualiza o campo `updated_at` com o timestamp ISO em formato UTC para consistência de sincronismo.
 */
export async function updateParqQuestion(id: string, formData: any) {
  try {
    const validatedId = z.string().uuid("ID da pergunta inválido.").parse(id);
    const validatedData = parqQuestionSchema.parse(formData);
    const supabase = await createClient();

    const { error } = await supabase
      .from("par_q_questions")
      .update({
        question_text: validatedData.question_text,
        is_active: validatedData.is_active,
        updated_at: new Date().toISOString() // Enforcement UTC
      })
      .eq("id", validatedId);

    if (error) throw error;
    
    return { success: true };
  } catch (err: any) {
    console.error("Erro em updateParqQuestion:", err);
    if (err instanceof z.ZodError) {
      return { success: false, error: err.errors[0].message };
    }
    return { success: false, error: err.message || "Erro desconhecido ao atualizar pergunta." };
  }
}

/**
 * @function reorderParqQuestions
 * @description Reordena um lote de perguntas com base em uma nova lista de IDs ordenada.
 * 
 * @param {string[]} orderedIds - Array de strings contendo IDs de perguntas na nova ordem desejada.
 * 
 * @returns {Promise<{ success: boolean; error?: string }>} Resposta de sucesso ou erro na transação de reordenação.
 */
export async function reorderParqQuestions(orderedIds: string[]) {
  try {
    const validatedIds = z.array(z.string().uuid()).parse(orderedIds);
    const supabase = await createClient();
    
    // Atualização sequencial por loop simples (adequado para listas pequenas como PAR-Q)
    for (let i = 0; i < validatedIds.length; i++) {
      const { error } = await supabase
        .from("par_q_questions")
        .update({ order_index: i + 1 })
        .eq("id", validatedIds[i]);
        
      if (error) throw error;
    }
    
    return { success: true };
  } catch (err: any) {
    console.error("Erro em reorderParqQuestions:", err);
    return { success: false, error: err.message || "Erro desconhecido ao reordenar." };
  }
}

/**
 * @function deleteParqQuestion
 * @description Exclui permanentemente uma pergunta da tabela PAR-Q.
 * 
 * @param {string} id - O ID exclusivo da pergunta a ser deletada.
 * 
 * @returns {Promise<{ success: boolean; error?: string }>} Resposta indicando se a exclusão foi bem-sucedida ou falhou.
 */
export async function deleteParqQuestion(id: string) {
  try {
    const validatedId = z.string().uuid("ID da pergunta inválido.").parse(id);
    const supabase = await createClient();
    const { error } = await supabase.from("par_q_questions").delete().eq("id", validatedId);
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error("Erro em deleteParqQuestion:", err);
    return { success: false, error: "Erro ao deletar pergunta." };
  }
}

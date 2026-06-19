/**
 * @file documents.ts
 * @description Server Actions para gerenciamento de documentos jurídicos (Regimento Interno e Termo LGPD) da academia.
 * @module Compliance
 * 
 * @security RLS
 * Todas as escritas e leituras na tabela `legal_documents` respeitam as políticas de RLS ativas
 * no Supabase. O bypass por service_role não é utilizado no client.
 */

"use server";

import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

/**
 * Esquema de validação Zod para os dados de documentos legais.
 * Garante a tipagem estrita na camada de Server Actions.
 */
const legalDocumentSchema = z.object({
  type: z.enum(["REGIMENTO_INTERNO", "TERMO_LGPD"]),
  title: z.string().min(3, "O título deve ter pelo menos 3 caracteres.").max(100, "O título deve ter no máximo 100 caracteres."),
  content: z.string().min(10, "O conteúdo deve ter pelo menos 10 caracteres.")
});

/**
 * @function getLegalDocuments
 * @description Recupera todos os documentos legais cadastrados (Regimento Interno, LGPD) ordenados cronologicamente.
 * 
 * @returns {Promise<any[]>} Retorna um array com os documentos legais encontrados.
 * @throws {Error} Lança um erro caso ocorra falha na conexão ou leitura do banco de dados.
 */
export async function getLegalDocuments() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("legal_documents")
    .select("*")
    .order("updated_at", { ascending: true });

  if (error) {
    console.error("Erro ao buscar documentos legais:", error);
    throw new Error("Não foi possível carregar os documentos legais.");
  }

  return data;
}

/**
 * @function updateLegalDocument
 * @description Atualiza o título e o conteúdo (Markdown) de um termo jurídico ou regimento interno específico.
 * 
 * @param {"REGIMENTO_INTERNO" | "TERMO_LGPD"} type - Tipo de documento que está sendo atualizado.
 * @param {object} formData - Dados de entrada contendo o novo `title` e `content` do documento.
 * @param {string} formData.title - Novo título do documento.
 * @param {string} formData.content - Novo texto do documento em formato Markdown.
 * 
 * @returns {Promise<{ success: boolean; error?: string }>} Objeto indicando o sucesso da operação ou contendo a mensagem de erro.
 * 
 * @utc
 * Define `updated_at` explicitamente utilizando a hora em formato UTC (ISO 8601) para garantir
 * consistência na sincronização de horários entre cliente e servidor.
 */
export async function updateLegalDocument(type: "REGIMENTO_INTERNO" | "TERMO_LGPD", formData: any) {
  try {
    const validatedData = legalDocumentSchema.parse({ type, ...formData });
    const supabase = await createClient();

    const { error } = await supabase
      .from("legal_documents")
      .upsert({
        type: validatedData.type,
        title: validatedData.title,
        content: validatedData.content,
        updated_at: new Date().toISOString() // Enforcement UTC
      }, { onConflict: "type" });

    if (error) throw error;
    
    return { success: true };
  } catch (err: any) {
    console.error("Erro em updateLegalDocument:", err);
    if (err instanceof z.ZodError) {
      return { success: false, error: err.errors[0].message };
    }
    return { success: false, error: err.message || "Erro desconhecido ao atualizar documento." };
  }
}

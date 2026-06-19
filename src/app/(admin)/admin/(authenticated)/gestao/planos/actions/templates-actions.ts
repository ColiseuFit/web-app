"use server";

import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

// Schema do Zod para validar a entrada de dados do modelo
const contractTemplateSchema = z.object({
  title: z.string().min(3, "O título deve ter pelo menos 3 caracteres.").max(100, "O título deve ter no máximo 100 caracteres."),
  content: z.string().min(10, "O texto do contrato deve ter pelo menos 10 caracteres."),
  is_active: z.boolean().default(true)
});

/**
 * @function getContractTemplates
 * @description
 * Recupera todos os templates de contratos cadastrados.
 * 
 * @returns {Promise<any[]>} Lista de templates.
 */
export async function getContractTemplates() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contract_templates")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[getContractTemplates] Error:", error);
    return [];
  }
  return data;
}

/**
 * @function createContractTemplate
 * @description
 * Cria um novo modelo de contrato no banco de dados.
 * 
 * @param {object} formData - Dados de cadastro.
 * @returns {Promise<{success: boolean, data?: any, error?: string}>} Status da criação.
 */
export async function createContractTemplate(formData: { title: string; content: string; is_active: boolean }) {
  const supabase = await createClient();
  
  const validation = contractTemplateSchema.safeParse(formData);
  if (!validation.success) {
    const errorMsg = validation.error.errors.map(e => e.message).join(" ");
    return { success: false, error: errorMsg };
  }

  try {
    const { data, error } = await supabase
      .from("contract_templates")
      .insert(validation.data)
      .select()
      .single();

    if (error) {
      console.error("[createContractTemplate] Error:", error);
      return { success: false, error: "Erro ao criar o modelo de contrato no banco de dados." };
    }

    return { success: true, data };
  } catch (err: any) {
    console.error("[createContractTemplate] Exception:", err);
    return { success: false, error: err.message };
  }
}

/**
 * @function updateContractTemplate
 * @description
 * Atualiza um modelo de contrato existente.
 * 
 * @param {string} id - UUID do modelo.
 * @param {object} formData - Novos dados.
 * @returns {Promise<{success: boolean, data?: any, error?: string}>} Status da atualização.
 */
export async function updateContractTemplate(id: string, formData: { title: string; content: string; is_active: boolean }) {
  const supabase = await createClient();
  
  const validatedId = z.string().uuid("ID do modelo inválido.").parse(id);
  const validation = contractTemplateSchema.safeParse(formData);
  if (!validation.success) {
    const errorMsg = validation.error.errors.map(e => e.message).join(" ");
    return { success: false, error: errorMsg };
  }

  try {
    const { data, error } = await supabase
      .from("contract_templates")
      .update({
        ...validation.data,
        updated_at: new Date().toISOString()
      })
      .eq("id", validatedId)
      .select()
      .single();

    if (error) {
      console.error("[updateContractTemplate] Error:", error);
      return { success: false, error: "Erro ao atualizar o modelo de contrato." };
    }

    return { success: true, data };
  } catch (err: any) {
    console.error("[updateContractTemplate] Exception:", err);
    return { success: false, error: err.message };
  }
}

/**
 * @function toggleTemplateStatus
 * @description
 * Alterna o status de ativação de um modelo de contrato.
 * 
 * @param {string} id - UUID do modelo.
 * @param {boolean} is_active - Novo status de ativação.
 * @returns {Promise<{success: boolean, data?: any, error?: string}>} Status da ação.
 */
export async function toggleTemplateStatus(id: string, is_active: boolean) {
  const supabase = await createClient();
  const validatedId = z.string().uuid("ID do modelo inválido.").parse(id);
  try {
    const { data, error } = await supabase
      .from("contract_templates")
      .update({
        is_active,
        updated_at: new Date().toISOString()
      })
      .eq("id", validatedId)
      .select()
      .single();

    if (error) {
      console.error("[toggleTemplateStatus] Error:", error);
      return { success: false, error: "Erro ao alterar o status do modelo." };
    }

    return { success: true, data };
  } catch (err: any) {
    console.error("[toggleTemplateStatus] Exception:", err);
    return { success: false, error: err.message };
  }
}

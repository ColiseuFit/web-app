"use server";

import { createClient } from "@/lib/supabase/server";
import { cache } from "react";
import { revalidatePath } from "next/cache";

/**
 * 🔐 ACCESS TYPES ENGINE: Motor Dinâmico de Permissões (SSoT).
 *
 * @module AccessManagement
 * @description Gerencia os tipos de acesso (Clube Premium, Clube Pass, etc.)
 * e suas permissões de forma dinâmica, permitindo que o administrador controle
 * quais módulos cada plano pode acessar sem necessidade de deploy.
 *
 * @architecture
 * - Prioriza dados do banco (tabela `access_types`) sobre fallbacks estáticos.
 * - Utiliza React `cache` para memoização dentro do mesmo render pass (Server Components).
 * - Todas as mutações passam por Server Actions com RLS ativo.
 */

/** Estrutura de um tipo de acesso com suas permissões granulares. */
export interface AccessType {
  id: string;
  label: string;
  description: string | null;
  can_view_prs: boolean;
  can_view_evaluations: boolean;
  can_view_leaderboard: boolean;
  can_access_running: boolean;
  is_active: boolean;
}

/** Fallback estático caso o banco esteja inacessível (resiliência). */
const STATIC_FALLBACK: Record<string, AccessType> = {
  club: {
    id: "club",
    label: "Clube Premium",
    description: "Acesso nativo completo.",
    can_view_prs: true,
    can_view_evaluations: true,
    can_view_leaderboard: true,
    can_access_running: true,
    is_active: true,
  },
  club_pass: {
    id: "club_pass",
    label: "Clube Pass",
    description: "Acesso via parceiros (Gympass/TotalPass).",
    can_view_prs: false,
    can_view_evaluations: false,
    can_view_leaderboard: false,
    can_access_running: false,
    is_active: true,
  },
};

/**
 * Busca todos os tipos de acesso do banco de dados com cache por render pass.
 *
 * @async
 * @function getCachedAccessTypes
 * @returns {Promise<Record<string, AccessType>>} Mapa de tipos de acesso indexados por ID.
 * @cache Memoizado via React `cache` para evitar queries duplicadas no mesmo request.
 */
export const getCachedAccessTypes = cache(
  async (): Promise<Record<string, AccessType>> => {
    const supabase = await createClient();

    try {
      const { data, error } = await supabase
        .from("access_types")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: true });

      if (error || !data || data.length === 0) {
        console.warn(
          "[AccessEngine] Retornando fallback estático (Erro DB ou Vazio)."
        );
        return STATIC_FALLBACK;
      }

      return data.reduce(
        (acc, row) => {
          acc[row.id] = {
            id: row.id,
            label: row.label,
            description: row.description,
            can_view_prs: row.can_view_prs,
            can_view_evaluations: row.can_view_evaluations,
            can_view_leaderboard: row.can_view_leaderboard,
            can_access_running: row.can_access_running,
            is_active: row.is_active,
          };
          return acc;
        },
        {} as Record<string, AccessType>
      );
    } catch (e) {
      console.error("[AccessEngine] Erro Crítico:", e);
      return STATIC_FALLBACK;
    }
  }
);

/**
 * Busca as permissões de um tipo de acesso específico pelo ID.
 * Útil para páginas do aluno que precisam verificar uma única permissão.
 *
 * @async
 * @function getAccessPermissions
 * @param {string} membershipType - O ID do tipo de acesso (ex: 'club', 'club_pass').
 * @returns {Promise<AccessType>} As permissões do tipo de acesso solicitado.
 */
export async function getAccessPermissions(
  membershipType: string
): Promise<AccessType> {
  const allTypes = await getCachedAccessTypes();
  return (
    allTypes[membershipType] ||
    STATIC_FALLBACK["club_pass"] || {
      id: membershipType,
      label: "Desconhecido",
      description: null,
      can_view_prs: false,
      can_view_evaluations: false,
      can_view_leaderboard: false,
      can_access_running: false,
      is_active: true,
    }
  );
}

/**
 * Server Action para atualizar as permissões de um tipo de acesso.
 *
 * @async
 * @function updateAccessTypeAction
 * @param {string} id - ID do tipo de acesso (ex: 'club', 'club_pass').
 * @param {Partial<AccessType>} updates - Campos a serem atualizados.
 * @returns {Promise<{success: boolean; error?: string}>}
 * @security RLS restringe esta operação a admins/recepção.
 */
export async function updateAccessTypeAction(
  id: string,
  updates: Partial<AccessType>
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  try {
    const { error } = await supabase
      .from("access_types")
      .update({
        label: updates.label,
        description: updates.description,
        can_view_prs: updates.can_view_prs,
        can_view_evaluations: updates.can_view_evaluations,
        can_view_leaderboard: updates.can_view_leaderboard,
        can_access_running: updates.can_access_running,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      console.error("[AccessEngine] Erro ao atualizar:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/admin/settings");
    revalidatePath("/dashboard");
    revalidatePath("/progresso");
    revalidatePath("/profile");

    return { success: true };
  } catch (e) {
    console.error("[AccessEngine] Erro Crítico ao atualizar:", e);
    return { success: false, error: "Erro interno do servidor." };
  }
}

/**
 * Server Action para deletar um tipo de acesso, garantindo que não há alunos vinculados.
 *
 * @async
 * @function deleteAccessTypeAction
 * @param {string} id - ID do tipo de acesso a ser deletado.
 * @returns {Promise<{success: boolean; error?: string}>}
 */
export async function deleteAccessTypeAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  // 1. Proteger defaults do sistema
  if (id === "club" || id === "club_pass") {
    return { success: false, error: "Não é permitido deletar os acessos padrões do sistema." };
  }

  const supabase = await createClient();

  try {
    // 2. Verificar se há alunos utilizando este acesso
    const { count, error: countError } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("membership_type", id);

    if (countError) {
      console.error("[AccessEngine] Erro ao verificar alunos:", countError);
      return { success: false, error: "Erro ao verificar vínculos do acesso." };
    }

    if (count && count > 0) {
      return {
        success: false,
        error: `Ação bloqueada. Existem ${count} aluno(s) utilizando este acesso. Transfira os alunos para outro plano antes de deletar.`,
      };
    }

    // 3. Deletar com segurança
    const { error: deleteError } = await supabase
      .from("access_types")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("[AccessEngine] Erro ao deletar:", deleteError);
      return { success: false, error: "Erro ao deletar o tipo de acesso." };
    }

    revalidatePath("/admin/settings");
    revalidatePath("/dashboard");
    
    return { success: true };
  } catch (e) {
    console.error("[AccessEngine] Erro Crítico ao deletar:", e);
    return { success: false, error: "Erro interno do servidor." };
  }
}

/**
 * Server Action para criar um novo tipo de acesso.
 *
 * @async
 * @function createAccessTypeAction
 * @param {string} id - ID único para o sistema (ex: 'gympass_ouro').
 * @param {string} label - Nome amigável (ex: 'Gympass Ouro').
 * @returns {Promise<{success: boolean; error?: string}>}
 */
export async function createAccessTypeAction(
  id: string,
  label: string
): Promise<{ success: boolean; error?: string }> {
  // 1. Limpar ID para garantir compatibilidade com URLs e banco
  const safeId = id.toLowerCase().replace(/[^a-z0-9_]/g, "_");

  if (!safeId || safeId.length < 3) {
    return { success: false, error: "O ID gerado deve ter pelo menos 3 caracteres." };
  }

  const supabase = await createClient();

  try {
    const { error } = await supabase.from("access_types").insert({
      id: safeId,
      label: label,
      description: "Novo acesso criado.",
      can_view_prs: false,
      can_view_evaluations: false,
      can_view_leaderboard: false,
      can_access_running: false,
      is_active: true,
    });

    if (error) {
      if (error.code === "23505") { // Unique violation
        return { success: false, error: "Já existe um acesso com este identificador." };
      }
      console.error("[AccessEngine] Erro ao criar:", error);
      return { success: false, error: "Erro ao criar novo acesso no banco de dados." };
    }

    revalidatePath("/admin/settings");
    revalidatePath("/dashboard");
    
    return { success: true };
  } catch (e) {
    console.error("[AccessEngine] Erro Crítico ao criar:", e);
    return { success: false, error: "Erro interno do servidor." };
  }
}

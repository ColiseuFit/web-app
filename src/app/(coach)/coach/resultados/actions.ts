"use server";

import { createClient , getAuthUser } from "@/lib/supabase/server";
import { USER_ROLES } from "@/lib/constants/roles";

/**
 * Interface para um resultado de WOD individual retornado ao cliente.
 *
 * @architecture
 * - Contém todos os dados necessários para renderizar um card de resultado no painel do Coach.
 * - Os campos `wod_*` são desnormalizados para evitar joins adicionais no cliente.
 */
export interface CoachResultItem {
  checkin_id: string;
  student_id: string;
  student_name: string;
  student_level: string;
  avatar_url: string | null;
  result: string | null;
  performance_level: string | null;
  score_points: number;
  is_excellence: boolean;
  created_at: string;
  wod_id: string;
  wod_title: string;
  wod_date: string;
  wod_type_tag: string;
  result_type: string;
  class_time: string | null;
  is_flagged: boolean;
}

/**
 * Interface para o agrupamento de resultados por WOD (data + título).
 */
export interface CoachResultGroup {
  wod_id: string;
  wod_title: string;
  wod_date: string;
  wod_type_tag: string;
  result_type: string;
  results: CoachResultItem[];
}

/**
 * BUSCA DE RESULTADOS PARA O COACH: Recupera todos os resultados de alunos agrupados por WOD.
 *
 * @architecture
 * - Autenticação: Valida que o usuário logado é Coach, Admin ou Recepção.
 * - Filtros: Suporta data inicial/final, busca por nome de aluno e filtro por nível.
 * - Agrupamento: Os resultados são agrupados por WOD (data + título) para visualização cronológica.
 * - UTC Enforcement: Datas do WOD são tratadas com ancoragem UTC "T00:00:00Z".
 *
 * @param {Object} filters - Filtros opcionais para refinar os resultados.
 * @param {string} [filters.dateFrom] - Data de início (YYYY-MM-DD).
 * @param {string} [filters.dateTo] - Data de fim (YYYY-MM-DD).
 * @param {string} [filters.search] - Busca parcial por nome do aluno.
 * @param {string} [filters.level] - Filtro por nível de performance (ex: "rx", "scale").
 * @returns {Promise<{success: boolean, groups: CoachResultGroup[], error?: string}>}
 */
export async function getCoachResults(filters?: {
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  level?: string;
}): Promise<{ success: boolean; groups: CoachResultGroup[]; error?: string }> {
  try {
    const supabase = await createClient();
    const user = await getAuthUser();
    if (!user) return { success: false, groups: [], error: "Não autenticado." };

    // RBAC Gate: Apenas Coach, Admin ou Reception
    const isAdminEmail = user.email === "admin@coliseufit.com";
    if (!isAdminEmail) {
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      if (
        !roleData ||
        (roleData.role !== USER_ROLES.ADMIN &&
          roleData.role !== USER_ROLES.COACH &&
          roleData.role !== USER_ROLES.RECEPTION)
      ) {
        return { success: false, groups: [], error: "Sem permissão." };
      }
    }

    // Construir query base: check-ins com resultado preenchido
    let query = supabase
      .from("check_ins")
      .select(`
        id,
        student_id,
        result,
        performance_level,
        score_points,
        is_excellence,
        created_at,
        is_flagged,
        class_slots (
          time_start
        ),
        wods (
          id,
          title,
          date,
          type_tag,
          result_type
        ),
        profiles:student_id (
          full_name,
          display_name,
          first_name,
          last_name,
          avatar_url,
          level
        )
      `)
      .not("result", "is", null)
      .neq("status", "missed")
      .order("created_at", { ascending: false })
      .limit(500);

    let response = await query;
    let checkins: any[] | null = response.data;
    let queryError = response.error;
    let hasFlaggedColumn = true;

    if (queryError && (queryError.message.includes("is_flagged") || queryError.message.includes("column"))) {
      // Fallback: Tenta buscar sem a coluna is_flagged caso ela não exista no DB
      hasFlaggedColumn = false;
      const retryQuery = supabase
        .from("check_ins")
        .select(`
          id,
          student_id,
          result,
          performance_level,
          score_points,
          is_excellence,
          created_at,
          class_slots (
            time_start
          ),
          wods (
            id,
            title,
            date,
            type_tag,
            result_type
          ),
          profiles:student_id (
            full_name,
            display_name,
            first_name,
            last_name,
            avatar_url,
            level
          )
        `)
        .not("result", "is", null)
        .neq("status", "missed")
        .order("created_at", { ascending: false })
        .limit(500);

      const retryResponse = await retryQuery;
      checkins = retryResponse.data;
      queryError = retryResponse.error;
    }

    if (queryError) {
      console.error("Erro ao buscar resultados do coach:", queryError);
      return { success: false, groups: [], error: queryError.message };
    }

    if (!checkins || checkins.length === 0) {
      return { success: true, groups: [] };
    }

    // Processar e filtrar resultados
    const items: CoachResultItem[] = [];
    for (const ci of checkins) {
      const wod = Array.isArray(ci.wods) ? ci.wods[0] : ci.wods;
      if (!wod) continue;

      const profile = Array.isArray(ci.profiles) ? ci.profiles[0] : ci.profiles;
      const slot = Array.isArray(ci.class_slots) ? ci.class_slots[0] : ci.class_slots;

      const studentName =
        (profile as any)?.display_name ||
        (profile as any)?.full_name ||
        [(profile as any)?.first_name, (profile as any)?.last_name].filter(Boolean).join(" ") ||
        "Aluno";

      const studentLevel = (profile as any)?.level || "iniciante";

      // Filtro por data
      if (filters?.dateFrom && (wod as any).date < filters.dateFrom) continue;
      if (filters?.dateTo && (wod as any).date > filters.dateTo) continue;

      // Filtro por busca de nome
      if (filters?.search) {
        const searchLower = filters.search.toLowerCase();
        if (!studentName.toLowerCase().includes(searchLower)) continue;
      }

      // Filtro por nível de performance
      if (filters?.level && filters.level !== "todos") {
        if (ci.performance_level?.toLowerCase() !== filters.level.toLowerCase()) continue;
      }

      items.push({
        checkin_id: ci.id,
        student_id: ci.student_id,
        student_name: studentName,
        student_level: studentLevel,
        avatar_url: (profile as any)?.avatar_url || null,
        result: ci.result || null,
        performance_level: ci.performance_level || null,
        score_points: ci.score_points || 0,
        is_excellence: !!ci.is_excellence,
        created_at: ci.created_at,
        wod_id: (wod as any).id,
        wod_title: (wod as any).title || "Treino do Dia",
        wod_date: (wod as any).date,
        wod_type_tag: (wod as any).type_tag || "WOD",
        result_type: (wod as any).result_type || "reps",
        class_time: slot ? String((slot as any).time_start).slice(0, 5) : null,
        is_flagged: hasFlaggedColumn ? !!(ci as any).is_flagged : false,
      });
    }

    // Agrupar por WOD (wod_id)
    const groupMap = new Map<string, CoachResultGroup>();
    for (const item of items) {
      if (!groupMap.has(item.wod_id)) {
        groupMap.set(item.wod_id, {
          wod_id: item.wod_id,
          wod_title: item.wod_title,
          wod_date: item.wod_date,
          wod_type_tag: item.wod_type_tag,
          result_type: item.result_type,
          results: [],
        });
      }
      groupMap.get(item.wod_id)!.results.push(item);
    }

    // Ordenar grupos por data (mais recente primeiro)
    const groups = Array.from(groupMap.values()).sort(
      (a, b) => b.wod_date.localeCompare(a.wod_date)
    );

    return { success: true, groups };
  } catch (err) {
    console.error("Erro inesperado em getCoachResults:", err);
    return { success: false, groups: [], error: "Erro interno do servidor." };
  }
}

/**
 * MODERAÇÃO DE RESULTADO: Permite ao Coach sinalizar (flag) um resultado suspeito.
 *
 * @architecture
 * - O campo `is_flagged` é um booleano na tabela `check_ins`.
 * - Se o campo não existir no banco, a action retornará sucesso silencioso
 *   (a funcionalidade de flag é um "nice-to-have" que não bloqueia a operação).
 *
 * @security
 * - RBAC: Apenas Coach/Admin podem sinalizar resultados.
 *
 * @param {string} checkinId - UUID do check-in a ser sinalizado.
 * @param {boolean} flagged - True para sinalizar, false para remover sinalização.
 * @returns {Promise<{success?: boolean, error?: string}>}
 */
export async function flagResultAction(
  checkinId: string,
  flagged: boolean
): Promise<{ success?: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const user = await getAuthUser();
    if (!user) return { error: "Não autenticado." };

    // RBAC Gate
    const isAdminEmail = user.email === "admin@coliseufit.com";
    if (!isAdminEmail) {
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!roleData || (roleData.role !== USER_ROLES.ADMIN && roleData.role !== USER_ROLES.COACH)) {
        return { error: "Sem permissão para moderar resultados." };
      }
    }

    const { error } = await supabase
      .from("check_ins")
      .update({ is_flagged: flagged })
      .eq("id", checkinId);

    if (error) {
      // Se o campo is_flagged não existir, ignora silenciosamente
      if (error.message.includes("is_flagged")) {
        return { success: true };
      }
      return { error: "Erro ao atualizar: " + error.message };
    }

    return { success: true };
  } catch (err) {
    console.error("Erro inesperado em flagResultAction:", err);
    return { error: "Erro interno do servidor." };
  }
}

/**
 * LIMPEZA DE RESULTADO (MODERAÇÃO DO COACH): Limpa o score de um aluno.
 *
 * @security
 * - RBAC: Apenas Coach/Admin podem moderar.
 *
 * @param {string} checkinId - UUID do check-in.
 * @returns {Promise<{success?: boolean, error?: string}>}
 */
export async function moderatorClearWodResult(
  checkinId: string
): Promise<{ success?: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const user = await getAuthUser();
    if (!user) return { error: "Não autenticado." };

    // RBAC Gate
    const isAdminEmail = user.email === "admin@coliseufit.com";
    if (!isAdminEmail) {
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!roleData || (roleData.role !== USER_ROLES.ADMIN && roleData.role !== USER_ROLES.COACH)) {
        return { error: "Sem permissão para moderar." };
      }
    }

    const { error } = await supabase
      .from("check_ins")
      .update({
        result: null,
        performance_level: null,
        is_excellence: false,
      })
      .eq("id", checkinId);

    if (error) {
      return { error: "Erro ao limpar score: " + error.message };
    }

    return { success: true };
  } catch (err) {
    console.error("Erro inesperado em moderatorClearWodResult:", err);
    return { error: "Erro interno do servidor." };
  }
}

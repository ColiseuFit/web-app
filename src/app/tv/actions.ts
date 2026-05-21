"use server";

import { createClient as createAdminClient } from "@supabase/supabase-js";
import { getTodayDate, resolveSlotCoach } from "@/lib/date-utils";

export interface TvStudent {
  id: string;
  full_name: string;
  avatar_url: string | null;
  membership_type: string;
  status: string;
  performance_level: string | null;
  validated_at: string | null;
}

export interface TvClassSlot {
  id: string;
  name: string;
  time_start: string;
  capacity: number;
  coach_name: string;
  students: TvStudent[];
}

export interface TvDataResponse {
  date: string;
  wodTitle: string;
  wodContent: string;
  slots: TvClassSlot[];
}

/**
 * Busca todas as informações necessárias para renderizar a TV no dia especificado.
 * Retorna os slots ativos e a lista de alunos com check-in para cada slot.
 * 
 * @security Elevated Service Role Client (Bypass RLS):
 * - O painel de TV é uma rota de exibição pública e sem autenticação do usuário.
 * - Como a tabela de check_ins possui RLS ativo que bloqueia a leitura por usuários anônimos (anon),
 *   este método utiliza o cliente admin (service_role) no servidor para hidratar os dados de check-in com segurança.
 * 
 * @param {string} [targetDate] - Data no formato YYYY-MM-DD. Se omitida, usa o dia de hoje.
 * @returns {Promise<{ data?: TvDataResponse; error?: string }>} Dados da TV ou erro operacional.
 * @throws {Error} Quando ocorrem falhas de comunicação ou inconsistência catastrófica no banco.
 */
export async function getTvData(targetDate?: string): Promise<{ data?: TvDataResponse; error?: string }> {
  try {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim().split(' ')[0];
    if (!serviceRoleKey) {
      return { error: "Erro de configuração: Chave mestra não encontrada no servidor." };
    }

    const supabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey
    );
    const dateStr = targetDate || getTodayDate();

    // 1. Resolver o dia da semana (0-6) para buscar os slots corretos
    // Evita deslocamentos usando timezone explicitamente (UTC alignment)
    const dateObj = new Date(dateStr + "T12:00:00Z");
    const dayOfWeek = dateObj.getUTCDay();

    // 2. Buscar os class_slots estruturais ativos para o dia correspondente
    const { data: slots, error: slotsError } = await supabase
      .from("class_slots")
      .select(`
        *,
        coach_profile:default_coach_id (full_name),
        class_substitutions (
          substitute_coach_id,
          coach_profile:substitute_coach_id (full_name),
          date
        )
      `)
      .eq("day_of_week", dayOfWeek)
      .eq("is_active", true)
      .order("time_start", { ascending: true });

    if (slotsError) {
      return { error: "Erro ao buscar grade de turmas: " + slotsError.message };
    }

    if (!slots || slots.length === 0) {
      return {
        data: {
          date: dateStr,
          wodTitle: "Nenhum Treino",
          wodContent: "Sem turmas ativas programadas para hoje.",
          slots: []
        }
      };
    }

    // 3. Buscar o WOD do dia correspondente
    const { data: wod } = await supabase
      .from("wods")
      .select("id, title, wod_content")
      .eq("date", dateStr)
      .maybeSingle();

    const wodId = wod?.id || null;
    const wodTitle = wod?.title || "Treino do Dia";
    const wodContent = wod?.wod_content || "Nenhum treino cadastrado para hoje.";

    // 4. Buscar todos os check-ins vinculados ao WOD desta data
    let checkInsList: any[] = [];
    const { data: checkins, error: checkinsError } = await supabase
      .from("check_ins")
      .select(`
        id,
        class_slot_id,
        status,
        performance_level,
        validated_at,
        wods!inner(date),
        profiles:student_id (
          id,
          full_name,
          avatar_url,
          membership_type,
          level
        )
      `)
      .eq("wods.date", dateStr)
      .neq("status", "missed");

    if (!checkinsError && checkins) {
      checkInsList = checkins;
    }

    // 5. Agrupar os check-ins por slot_id para enriquecer os slots estruturais
    const enrichedSlots: TvClassSlot[] = slots.map(slot => {
      const slotCheckins = checkInsList
        .filter(c => c.class_slot_id === slot.id)
        .map(c => {
          const profile = Array.isArray(c.profiles) ? c.profiles[0] : c.profiles;
          return {
            id: c.id,
            full_name: profile?.full_name || "Aluno Coliseu",
            avatar_url: profile?.avatar_url || null,
            membership_type: profile?.membership_type || "club",
            status: c.status,
            performance_level: c.performance_level || profile?.level || null,
            validated_at: c.validated_at || null
          };
        });

      // Resolvendo o professor através da precedência canônica do Box (SSoT resolveSlotCoach)
      const resolvedCoach = resolveSlotCoach(slot, dateStr);

      return {
        id: slot.id,
        name: slot.name,
        time_start: slot.time_start,
        capacity: slot.capacity,
        coach_name: resolvedCoach.name,
        students: slotCheckins
      };
    });

    return {
      data: {
        date: dateStr,
        wodTitle,
        wodContent,
        slots: enrichedSlots
      }
    };

  } catch (err: any) {
    return { error: err.message || "Erro desconhecido ao processar dados da TV." };
  }
}

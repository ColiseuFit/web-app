"use server";

import { createClient as createAdminClient } from "@supabase/supabase-js";
import { getTodayDate, resolveSlotCoach } from "@/lib/date-utils";
import { z } from "zod";
import { unstable_cache } from "next/cache";

/**
 * Recupera todos os perfis com data de nascimento do banco de dados.
 * Cacheado por 1 hora (3600 segundos) para reduzir drasticamente o load no Supabase
 * causado pelo polling de 15 segundos da TV.
 */
const getCachedProfilesWithBirthdays = unstable_cache(
  async () => {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim().split(' ')[0];
    if (!serviceRoleKey) {
      throw new Error("Erro de configuração: Chave mestra não encontrada no servidor.");
    }

    const supabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey
    );

    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url, birth_date")
      .not("birth_date", "is", null);

    if (error) {
      throw new Error("Erro ao buscar perfis para aniversariantes: " + error.message);
    }

    return data || [];
  },
  ["profiles-birthdays-list"],
  {
    revalidate: 3600, // Cache de 1 hora
    tags: ["profiles", "birthdays"],
  }
);

/**
 * Busca a grade de turmas ativa para o dia da semana especificado.
 * Cacheado por 30 minutos (1800 segundos) para reduzir drasticamente o load no Supabase.
 */
const getCachedClassSlots = unstable_cache(
  async (dayOfWeek: number) => {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim().split(' ')[0];
    if (!serviceRoleKey) {
      throw new Error("Erro de configuração: Chave mestra não encontrada no servidor.");
    }

    const supabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey
    );

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
      throw new Error("Erro ao buscar grade de turmas: " + slotsError.message);
    }

    return slots || [];
  },
  ["tv-class-slots-list"],
  {
    revalidate: 1800, // Cache de 30 minutos
    tags: ["class_slots"],
  }
);

/**
 * Busca o WOD correspondente à data especificada.
 * Cacheado por 5 minutos (300 segundos) para atualizações rápidas do treino do dia.
 */
const getCachedWod = unstable_cache(
  async (dateStr: string) => {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim().split(' ')[0];
    if (!serviceRoleKey) {
      throw new Error("Erro de configuração: Chave mestra não encontrada no servidor.");
    }

    const supabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey
    );

    const { data: wod } = await supabase
      .from("wods")
      .select("id, title, warm_up, technique, wod_content, type_tag, time_cap")
      .eq("date", dateStr)
      .maybeSingle();

    return wod || null;
  },
  ["tv-wod-date"],
  {
    revalidate: 300, // Cache de 5 minutos
    tags: ["wods"],
  }
);

/**
 * Schema de validação para o parâmetro de data da TV.
 * Aceita apenas strings no formato ISO (YYYY-MM-DD) para evitar
 * injeções, RangeErrors ou queries malformatadas no banco de dados.
 */
const targetDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de data inválido. Use YYYY-MM-DD.")
  .optional();

export interface TvStudent {
  id: string;
  full_name: string;
  avatar_url: string | null;
  membership_type: string;
  status: string;
  performance_level: string | null;
  validated_at: string | null;
  birth_date: string | null;
}

export interface TvBirthday {
  id: string;
  full_name: string;
  avatar_url: string | null;
  birth_date: string;
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
  warmUp: string | null;
  technique: string | null;
  typeTag: string | null;
  timeCap: string | null;
  slots: TvClassSlot[];
  birthdays: TvBirthday[];
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
    // Validação estrita de entrada: rejeita datas malformatadas antes de qualquer acesso ao DB
    const parsedDate = targetDateSchema.safeParse(targetDate);
    if (!parsedDate.success) {
      return { error: "Formato de data inválido. Use YYYY-MM-DD." };
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim().split(' ')[0];
    if (!serviceRoleKey) {
      return { error: "Erro de configuração: Chave mestra não encontrada no servidor." };
    }

    const supabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey
    );
    const dateStr = parsedDate.data || getTodayDate();

    // 1. Resolver o dia da semana (0-6) para buscar os slots corretos
    // Evita deslocamentos usando timezone explicitamente (UTC alignment)
    const dateObj = new Date(dateStr + "T12:00:00Z");
    const dayOfWeek = dateObj.getUTCDay();

    // 2. Buscar os class_slots estruturais ativos para o dia correspondente (Cacheado 30min)
    const slots = await getCachedClassSlots(dayOfWeek);

    if (!slots || slots.length === 0) {
      return {
        data: {
          date: dateStr,
          wodTitle: "Nenhum Treino",
          wodContent: "Sem turmas ativas programadas para hoje.",
          warmUp: null,
          technique: null,
          typeTag: null,
          timeCap: null,
          slots: [],
          birthdays: []
        }
      };
    }

    // 3. Buscar o WOD do dia correspondente com todos os campos estruturados (Cacheado 5min)
    const wod = await getCachedWod(dateStr);

    const wodId = wod?.id || null;
    const wodTitle = wod?.title || "Treino do Dia";
    const wodContent = wod?.wod_content || "Nenhum treino cadastrado para hoje.";
    const warmUp = wod?.warm_up || null;
    const technique = wod?.technique || null;
    const typeTag = wod?.type_tag || null;
    const timeCap = wod?.time_cap || null;

    // 4. Buscar todos os check-ins vinculados ao WOD desta data
    let checkInsList: any[] = [];
    if (wodId) {
      const { data: checkins, error: checkinsError } = await supabase
        .from("check_ins")
        .select(`
          id,
          class_slot_id,
          status,
          performance_level,
          validated_at,
          profiles:student_id (
            id,
            full_name,
            avatar_url,
            membership_type,
            level,
            birth_date
          )
        `)
        .eq("wod_id", wodId)
        .neq("status", "missed");

      if (!checkinsError && checkins) {
        checkInsList = checkins;
      }
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
            validated_at: c.validated_at || null,
            birth_date: profile?.birth_date || null
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

    // 6. Buscar Aniversariantes do Mês
    // Busca os perfis cadastrados a partir do cache e filtra em memória pelo mês da targetDate.
    let birthdaysOfMonth: TvBirthday[] = [];
    const targetMonth = dateObj.getUTCMonth(); // 0 a 11

    try {
      const allProfiles = await getCachedProfilesWithBirthdays();
      birthdaysOfMonth = allProfiles
        .filter(p => {
          if (!p.birth_date) return false;
          // Garantir que não teremos shifts de timezone na extração do mês
          const bDate = new Date(p.birth_date + "T12:00:00Z");
          return bDate.getUTCMonth() === targetMonth;
        })
        .map(p => ({
          id: p.id,
          full_name: p.full_name || "Aluno Coliseu",
          avatar_url: p.avatar_url || null,
          birth_date: p.birth_date!
        }))
        // Ordenar pelo dia do mês crescente
        .sort((a, b) => {
          const dayA = new Date(a.birth_date + "T12:00:00Z").getUTCDate();
          const dayB = new Date(b.birth_date + "T12:00:00Z").getUTCDate();
          return dayA - dayB;
        });
    } catch (cacheErr: any) {
      console.error("[getTvData] Erro ao recuperar aniversariantes do cache:", cacheErr);
      // Fallback resiliente para não quebrar o polling principal da TV
      birthdaysOfMonth = [];
    }

    return {
      data: {
        date: dateStr,
        wodTitle,
        wodContent,
        warmUp,
        technique,
        typeTag,
        timeCap,
        slots: enrichedSlots,
        birthdays: birthdaysOfMonth
      }
    };

  } catch (err: any) {
    return { error: err.message || "Erro desconhecido ao processar dados da TV." };
  }
}

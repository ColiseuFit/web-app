"use server";

import { createClient as createAdminClient } from "@supabase/supabase-js";
import { getLevelInfo } from "@/lib/constants/levels";
import { unstable_cache } from "next/cache";

export interface TvLeaderboardEntry {
  student_id: string;
  student_name: string;
  avatar_url: string | null;
  performance_level: string;
  result_display: string;
  sort_value: number;
  is_cap: boolean;
}

export interface TvDailyLeaderboardData {
  wod_title: string;
  wod_type: string;
  date: string;
  results: TvLeaderboardEntry[];
}

export interface TvWeeklyLeaderboardEntry {
  student_id: string;
  student_name: string;
  avatar_url: string | null;
  performance_level: string;
  total_points: number;
  wods_completed: number;
}

export interface TvWeeklyLeaderboardData {
  start_date: string;
  end_date: string;
  results: TvWeeklyLeaderboardEntry[];
  total_wods: number;
}

/**
 * Retorna os limites da semana corrente (Segunda a Domingo) no fuso de Brasília.
 */
function getWeekRange() {
  const now = new Date();
  const spDateStr = now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" });
  const spDate = new Date(spDateStr);
  const currentDay = spDate.getDay();
  const distanceToMonday = currentDay === 0 ? 6 : currentDay - 1;
  
  const monday = new Date(spDate);
  monday.setDate(spDate.getDate() - distanceToMonday);
  
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  
  const formatDateStr = (d: Date) => d.toLocaleString("en-CA", { timeZone: "America/Sao_Paulo" }).split(",")[0];
  
  return {
    mondayStr: formatDateStr(monday),
    sundayStr: formatDateStr(sunday),
    mondayObj: monday,
    sundayObj: sunday
  };
}

/**
 * Executa a busca bruta do ranking diário no banco de dados.
 */
async function fetchTvDailyLeaderboardRaw(targetDate: string): Promise<{ success: boolean; data?: TvDailyLeaderboardData; error?: string }> {
  try {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim().split(' ')[0];
    if (!serviceRoleKey) {
      return { success: false, error: "Chave mestra de serviço não encontrada no servidor." };
    }

    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey
    );

    // 1. Busca o WOD do dia
    const { data: wods, error: wodError } = await supabaseAdmin
      .from("wods")
      .select("id, title, result_type, type_tag, date")
      .eq("date", targetDate)
      .limit(1);

    if (wodError || !wods || wods.length === 0) {
      return { success: false, error: "Nenhum treino encontrado para hoje." };
    }

    const wod = wods[0];
    const isForTime = (wod.result_type || "").toLowerCase().includes("time");

    // 2. Busca todos os Check-Ins confirmados que possuem score
    const { data: checkins, error: checkinsError } = await supabaseAdmin
      .from("check_ins")
      .select(`
        student_id,
        result,
        performance_level,
        profiles:student_id (
          first_name,
          last_name,
          avatar_url,
          full_name,
          display_name
        )
      `)
      .eq("wod_id", wod.id)
      .neq("status", "missed")
      .not("result", "is", null);

    if (checkinsError || !checkins) {
      return { success: false, error: "Erro ao buscar resultados do dia." };
    }

    const entries: TvLeaderboardEntry[] = [];

    // 3. Parser Matemático dos Valores
    for (const row of checkins) {
      if (!row.result) continue;

      const profile = row.profiles as any;
      const studentName = profile 
         ? (`${profile.first_name || ""} ${profile.last_name || ""}`.trim() || profile.display_name || profile.full_name) 
         : "Atleta Coliseu";
      
      let sortValue = 0;
      let isCap = false;
      let displayParts: string[] = [];
      const parts = row.result.split("|").map((p: string) => p.trim());
      
      const hasPrefixMatch = row.result.match(/^[a-z]+:/i) || row.result.match(/\| *[a-z]+:/i);

      if (!hasPrefixMatch) {
         const timeMatch = row.result.match(/(\d{1,2}):(\d{2})/);
         if (isForTime && timeMatch) {
           const m = Number(timeMatch[1]);
           const s = Number(timeMatch[2]);
           sortValue = (m * 60) + s;
           displayParts.push(row.result);
         } else {
           const num = Number(row.result.replace(/[^\d]/g, ""));
           sortValue = isNaN(num) ? 0 : num;
           if (isForTime) isCap = true;
           displayParts.push(row.result);
         }
      } else {
         let totalRounds = 0;
         let totalReps = 0;
         let totalTimeSec = 0;
         
         for (const p of parts) {
           const match = p.match(/^([a-z]+):(.+)$/i);
           if (match) {
             const prefix = match[1].toLowerCase();
             const val = match[2];
             
             if (prefix === "time") {
               const [m, s] = val.split(":").map(Number);
               totalTimeSec = (m * 60) + s;
               displayParts.push(`${val} MIN`);
             } else if (prefix === "reps") {
               totalReps += Number(val);
               displayParts.push(`${val} REP`);
             } else if (prefix === "rounds") {
               totalRounds += Number(val);
               displayParts.push(`${val} RDS`);
             } else if (prefix === "load") {
               sortValue = Number(val);
               displayParts.push(`${val} KG`);
             } else if (prefix === "distance") {
               sortValue = Number(val);
               displayParts.push(`${val} M`);
             } else if (prefix === "calories") {
               sortValue = Number(val);
               displayParts.push(`${val} CAL`);
             } else if (prefix === "points") {
               sortValue = Number(val);
               displayParts.push(`${val} PTS`);
             }
           }
         }

         if (isForTime) {
           if (totalTimeSec > 0) {
             sortValue = totalTimeSec;
           } else {
             sortValue = totalReps;
             isCap = true;
           }
         } else {
           if (totalRounds > 0 || totalReps > 0) {
              sortValue = (totalRounds * 1000) + totalReps; 
           }
         }
      }

      entries.push({
        student_id: row.student_id,
        student_name: studentName,
        avatar_url: profile?.avatar_url || null,
        performance_level: row.performance_level || "iniciante",
        result_display: displayParts.join(" | ") || row.result,
        sort_value: sortValue,
        is_cap: isCap
      });
    }

    // 4. Ordenação
    entries.sort((a, b) => {
      const valA = isNaN(a.sort_value) ? (isForTime ? 999999 : -999999) : a.sort_value;
      const valB = isNaN(b.sort_value) ? (isForTime ? 999999 : -999999) : b.sort_value;

      if (isForTime) {
        if (!a.is_cap && b.is_cap) return -1;
        if (a.is_cap && !b.is_cap) return 1;
        if (!a.is_cap && !b.is_cap) return valA - valB;
        if (a.is_cap && b.is_cap) return valB - valA;
      } else {
        return valB - valA;
      }
      return 0;
    });

    return {
      success: true,
      data: {
        wod_title: wod.title || "WOD do Dia",
        wod_type: wod.type_tag || "WOD",
        date: wod.date,
        results: entries
      }
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Erro interno ao processar ranking diário." };
  }
}

/**
 * Executa a busca bruta do ranking semanal no banco de dados.
 */
async function fetchTvWeeklyLeaderboardRaw(): Promise<{ success: boolean; data?: TvWeeklyLeaderboardData; error?: string }> {
  try {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim().split(' ')[0];
    if (!serviceRoleKey) {
      return { success: false, error: "Chave mestra de serviço não encontrada no servidor." };
    }

    const { mondayStr, sundayStr, mondayObj, sundayObj } = getWeekRange();

    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey
    );

    // 1. Busca os WODs da semana
    const { data: wods, error: wodsError } = await supabaseAdmin
      .from("wods")
      .select("id, title, result_type, date")
      .gte("date", mondayStr)
      .lte("date", sundayStr);

    if (wodsError || !wods) {
      return { success: false, error: "Erro ao buscar os treinos da semana." };
    }

    if (wods.length === 0) {
      return {
        success: true,
        data: {
          start_date: mondayStr,
          end_date: sundayStr,
          results: [],
          total_wods: 0
        }
      };
    }

    const studentAggregates: Record<string, {
      student_name: string;
      avatar_url: string | null;
      performance_level: string;
      total_points: number;
      wods_completed: number;
    }> = {};

    // Para cada WOD, classificar e distribuir pontos por categoria
    for (const wod of wods) {
      const isForTime = (wod.result_type || "").toLowerCase().includes("time");

      const { data: checkins, error: checkinsError } = await supabaseAdmin
        .from("check_ins")
        .select(`
          student_id,
          result,
          performance_level,
          profiles:student_id (
            first_name,
            last_name,
            avatar_url,
            full_name,
            display_name
          )
        `)
        .eq("wod_id", wod.id)
        .neq("status", "missed")
        .not("result", "is", null);

      if (checkinsError || !checkins) continue;

      const levelGroups: Record<string, any[]> = {};
      
      for (const row of checkins) {
        if (!row.result) continue;
        
        const profile = row.profiles as any;
        const studentName = profile 
           ? (`${profile.first_name || ""} ${profile.last_name || ""}`.trim() || profile.display_name || profile.full_name) 
           : "Atleta Coliseu";
        
        const normalizedLevel = getLevelInfo(row.performance_level).key;
        
        let sortValue = 0;
        let isCap = false;
        
        const parts = row.result.split("|").map((p: string) => p.trim());
        const hasPrefixMatch = row.result.match(/^[a-z]+:/i) || row.result.match(/\| *[a-z]+:/i);

        if (!hasPrefixMatch) {
          const timeMatch = row.result.match(/(\d{1,2}):(\d{2})/);
          if (isForTime && timeMatch) {
            const m = Number(timeMatch[1]);
            const s = Number(timeMatch[2]);
            sortValue = (m * 60) + s;
          } else {
            const num = Number(row.result.replace(/[^\d]/g, ""));
            sortValue = isNaN(num) ? 0 : num;
            if (isForTime) isCap = true;
          }
        } else {
          let totalRounds = 0;
          let totalReps = 0;
          let totalTimeSec = 0;
          
          for (const p of parts) {
            const match = p.match(/^([a-z]+):(.+)$/i);
            if (match) {
              const prefix = match[1].toLowerCase();
              const val = match[2];
              
              if (prefix === "time") {
                const [m, s] = val.split(":").map(Number);
                totalTimeSec = (m * 60) + s;
              } else if (prefix === "reps") {
                totalReps += Number(val);
              } else if (prefix === "rounds") {
                totalRounds += Number(val);
              } else if (prefix === "load") {
                sortValue = Number(val);
              } else if (prefix === "distance") {
                sortValue = Number(val);
              } else if (prefix === "calories") {
                sortValue = Number(val);
              } else if (prefix === "points") {
                sortValue = Number(val);
              }
            }
          }

          if (isForTime) {
            if (totalTimeSec > 0) {
              sortValue = totalTimeSec;
            } else {
              sortValue = totalReps;
              isCap = true;
            }
          } else {
            if (totalRounds > 0 || totalReps > 0) {
               sortValue = (totalRounds * 1000) + totalReps; 
            }
          }
        }

        if (!levelGroups[normalizedLevel]) {
          levelGroups[normalizedLevel] = [];
        }

        levelGroups[normalizedLevel].push({
          student_id: row.student_id,
          student_name: studentName,
          avatar_url: profile?.avatar_url || null,
          performance_level: row.performance_level || "iniciante",
          sort_value: sortValue,
          is_cap: isCap
        });
      }

      // Ordenar e pontuar cada grupo de categoria
      for (const lvlKey in levelGroups) {
        const group = levelGroups[lvlKey];

        group.sort((a, b) => {
          const valA = isNaN(a.sort_value) ? (isForTime ? 999999 : -999999) : a.sort_value;
          const valB = isNaN(b.sort_value) ? (isForTime ? 999999 : -999999) : b.sort_value;

          if (isForTime) {
            if (!a.is_cap && b.is_cap) return -1;
            if (a.is_cap && !b.is_cap) return 1;
            if (!a.is_cap && !b.is_cap) return valA - valB;
            if (a.is_cap && b.is_cap) return valB - valA;
          } else {
            return valB - valA;
          }
          return 0;
        });

        // Distribuir pontos com base no rank
        group.forEach((entry, idx) => {
          const pos = idx + 1;
          let points = 1;
          if (pos === 1) points = 100;
          else if (pos === 2) points = 95;
          else if (pos === 3) points = 90;
          else points = Math.max(1, 90 - (pos - 3));

          if (!studentAggregates[entry.student_id]) {
            studentAggregates[entry.student_id] = {
              student_name: entry.student_name,
              avatar_url: entry.avatar_url,
              performance_level: entry.performance_level,
              total_points: 0,
              wods_completed: 0
            };
          }

          studentAggregates[entry.student_id].total_points += points;
          studentAggregates[entry.student_id].wods_completed += 1;
        });
      }
    }

    // Converter para array
    const resultsList = Object.entries(studentAggregates).map(([id, agg]) => ({
      student_id: id,
      student_name: agg.student_name,
      avatar_url: agg.avatar_url,
      performance_level: agg.performance_level,
      total_points: agg.total_points,
      wods_completed: agg.wods_completed
    }));

    // Ordenação
    resultsList.sort((a, b) => {
      if (b.total_points !== a.total_points) {
        return b.total_points - a.total_points;
      }
      return b.wods_completed - a.wods_completed;
    });

    const formatDateLabel = (d: Date) => {
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      return `${day}/${month}`;
    };

    return {
      success: true,
      data: {
        start_date: formatDateLabel(mondayObj),
        end_date: formatDateLabel(sundayObj),
        results: resultsList,
        total_wods: wods.length
      }
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Erro interno ao processar ranking semanal." };
  }
}

// ─────────────────────────────────────────────────────────────
// CAMADA DE CACHE (Next.js unstable_cache)
// Protege o banco de dados Supabase contra acessos excessivos do polling
// ─────────────────────────────────────────────────────────────

const getCachedTvDailyLeaderboard = unstable_cache(
  async (dateStr: string) => fetchTvDailyLeaderboardRaw(dateStr),
  ["tv-daily-leaderboard-cache"],
  {
    revalidate: 120, // Cache de 2 minutos
    tags: ["check_ins", "wods", "profiles"],
  }
);

const getCachedTvWeeklyLeaderboard = unstable_cache(
  async () => fetchTvWeeklyLeaderboardRaw(),
  ["tv-weekly-leaderboard-cache"],
  {
    revalidate: 900, // Cache de 15 minutos (Liga semanal muda com menos frequência)
    tags: ["check_ins", "wods", "profiles"],
  }
);

// ─────────────────────────────────────────────────────────────
// EXPORTS DE AÇÕES DO SERVIDOR (Chamadas pela TV)
// ─────────────────────────────────────────────────────────────

export async function getTvDailyLeaderboard(dateStr?: string) {
  const targetDate = dateStr || new Date().toLocaleString("en-CA", { timeZone: "America/Sao_Paulo" }).split(",")[0];
  return getCachedTvDailyLeaderboard(targetDate);
}

export async function getTvWeeklyLeaderboard() {
  return getCachedTvWeeklyLeaderboard();
}

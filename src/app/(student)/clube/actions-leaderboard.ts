"use server";

import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { getLevelInfo } from "@/lib/constants/levels";

export interface LeaderboardEntry {
  student_id: string;
  student_name: string;
  avatar_url: string | null;
  performance_level: string;
  result_display: string;
  sort_value: number; // Valor matemático bruto usado para o rank
  is_cap: boolean; // Se o aluno tomou Time Cap (true) ou finalizou (false)
}

export interface DailyLeaderboardData {
  wod_title: string;
  wod_type: string;
  date: string;
  results: LeaderboardEntry[];
}

/**
 * getDailyLeaderboard
 * 
 * Busca os resultados registrados no WOD do dia de forma bypassada (usando Service Role para contornar o RLS).
 * 
 * @param {string} [dateStr] - Data no formato YYYY-MM-DD (opcional, padrão é a data atual em Brasília).
 * @returns {Promise<{ success: boolean; data?: DailyLeaderboardData; error?: string }>} Resposta contendo o título do WOD e lista ordenada.
 * @throws {Error} Quando ocorrem problemas de autenticação ou banco de dados.
 * @security
 * - Autenticação requerida via token JWT do Supabase.
 * - Utiliza a chave `SUPABASE_SERVICE_ROLE_KEY` no servidor para permitir que estudantes comparem seus resultados de forma global (bypass RLS).
 * @timezone
 * - Alinhamento com Fuso Horário de Brasília (America/Sao_Paulo) para geração automática de datas.
 */
export async function getDailyLeaderboard(dateStr?: string): Promise<{ success: boolean; data?: DailyLeaderboardData; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Não autenticado." };

  const targetDate = dateStr || new Date().toLocaleString("en-CA", { timeZone: "America/Sao_Paulo" }).split(",")[0];

  // Instancia um cliente Admin (Service Role) para furar o bloqueio do RLS e ver todos os alunos
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
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
    return { success: false, error: "Erro ao buscar resultados." };
  }

  const entries: LeaderboardEntry[] = [];

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
       // --- REGRA DE LENIÊNCIA (Legado) ---
       const timeMatch = row.result.match(/(\d{1,2}):(\d{2})/);
       if (isForTime && timeMatch) {
         // Tempo antigo válido (ex: "15:30" ou "12:00 | 30 MIN")
         const m = Number(timeMatch[1]);
         const s = Number(timeMatch[2]);
         sortValue = (m * 60) + s;
         displayParts.push(row.result);
       } else {
         // Número solto antigo
         const num = Number(row.result.replace(/[^\d]/g, ""));
         sortValue = isNaN(num) ? 0 : num;
         if (isForTime) isCap = true; // Número solto em WOD de Tempo = Tomou Cap e anotou as Reps.
         displayParts.push(row.result);
       }
    } else {
       // --- NOVA ARQUITETURA (Prefixos OBRIGATÓRIOS) ---
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

       // Assinalamento do Valor Final para Classificação
       if (isForTime) {
         if (totalTimeSec > 0) {
           sortValue = totalTimeSec; // Ranking será por tempo
         } else {
           sortValue = totalReps; // Se não tem tempo, tomou CAP. Ranking será por Reps.
           isCap = true;
         }
       } else {
         // Ranking Padrão (Maior é melhor). Para Rounds + Reps, Round pesa 1000x mais.
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

  // 4. Algoritmo de Ordenação
  entries.sort((a, b) => {
    // Garantir que valores inválidos (NaN) vão para o final do ranking
    const valA = isNaN(a.sort_value) ? (isForTime ? 999999 : -999999) : a.sort_value;
    const valB = isNaN(b.sort_value) ? (isForTime ? 999999 : -999999) : b.sort_value;

    if (isForTime) {
      // 4.1. Quem fechou o WOD ganha de quem tomou Time Cap.
      if (!a.is_cap && b.is_cap) return -1; // A acima
      if (a.is_cap && !b.is_cap) return 1;  // B acima

      // 4.2. Ambos fecharam: O Menor tempo vence.
      if (!a.is_cap && !b.is_cap) {
         return valA - valB;
      }
      
      // 4.3. Ambos tomaram Cap: Quem fez MAIS repetições vence.
      if (a.is_cap && b.is_cap) {
         return valB - valA;
      }
    } else {
      // Outros WODs (Maior é melhor: +Rounds, +Reps, +Carga)
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
}

export interface WeeklyLeaderboardEntry {
  student_id: string;
  student_name: string;
  avatar_url: string | null;
  performance_level: string;
  total_points: number;
  wods_completed: number;
}

export interface WeeklyLeaderboardData {
  start_date: string;
  end_date: string;
  results: WeeklyLeaderboardEntry[];
  total_wods: number;
}

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
 * getWeeklyLeaderboard
 * 
 * Calcula o acumulado semanal de pontos de todos os atletas baseado nas colocações obtidas nos treinos de segunda a domingo.
 * 
 * @returns {Promise<{ success: boolean; data?: WeeklyLeaderboardData; error?: string }>} Pontuação e frequência semanal ordenada.
 * @throws {Error} Quando ocorrem falhas de banco de dados ou autenticação.
 * @security
 * - Requer autenticação do usuário.
 * - Utiliza Service Role para consultar check-ins de toda a comunidade.
 * @timezone
 * - Alinhado com o fuso America/Sao_Paulo para cálculo da semana (Segunda a Domingo).
 */
export async function getWeeklyLeaderboard(): Promise<{ success: boolean; data?: WeeklyLeaderboardData; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Não autenticado." };

  const { mondayStr, sundayStr, mondayObj, sundayObj } = getWeekRange();

  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
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

    // Buscar checkins com resultados para este WOD
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

    // Agrupar checkins por Categoria (key normalizada)
    const levelGroups: Record<string, any[]> = {};
    
    for (const row of checkins) {
      if (!row.result) continue;
      
      const profile = row.profiles as any;
      const studentName = profile 
         ? (`${profile.first_name || ""} ${profile.last_name || ""}`.trim() || profile.display_name || profile.full_name) 
         : "Atleta Coliseu";
      
      const normalizedLevel = getLevelInfo(row.performance_level).key;
      
      // Parser do score diário para obter sort_value e is_cap
      let sortValue = 0;
      let isCap = false;
      
      const parts = row.result.split("|").map((p: string) => p.trim());
      const hasPrefixMatch = row.result.match(/^[a-z]+:/i) || row.result.match(/\| *[a-z]+:/i);

      if (!hasPrefixMatch) {
        // Regra de leniência legado
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
        // Novo padrão com prefixos
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

  // Converter o mapa agregado para array e ordenar
  const resultsList = Object.entries(studentAggregates).map(([id, agg]) => ({
    student_id: id,
    student_name: agg.student_name,
    avatar_url: agg.avatar_url,
    performance_level: agg.performance_level,
    total_points: agg.total_points,
    wods_completed: agg.wods_completed
  }));

  // Ordenação: 1º quem tem mais pontos, em caso de empate quem fez mais WODs
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
}

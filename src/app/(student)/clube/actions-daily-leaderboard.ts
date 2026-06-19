"use server";

import { createClient , getAuthUser } from "@/lib/supabase/server";
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
 */
export async function getDailyLeaderboard(dateStr?: string): Promise<{ success: boolean; data?: DailyLeaderboardData; error?: string }> {
  const supabase = await createClient();
  const user = await getAuthUser();
  if (!user) return { success: false, error: "Não autenticado." };

  const targetDate = dateStr || new Date().toLocaleString("en-CA", { timeZone: "America/Sao_Paulo" }).split(",")[0];

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

  // 4. Algoritmo de Ordenação
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
}

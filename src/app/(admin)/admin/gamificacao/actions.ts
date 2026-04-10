"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type GamificationActionResponse = {
  success?: boolean;
  error?: string;
};

/**
 * Ajusta a pontuação de um aluno manualmente via RPC (Single Source of Truth).
 * A RPC garante a atomicidade da operação, sem risco de sobrescrever pontos caso haja checkins simultâneos.
 * 
 * @param {string} studentId O UUID do aluno
 * @param {"bonus"|"deduct"} action O tipo de operação
 * @param {number} amount A quantidade a adicionar ou remover (sempre positiva)
 * @param {string} reason Opcional: Motivo para os logs futuros.
 */
export async function adjustStudentPoints(
  studentId: string,
  action: "bonus" | "deduct",
  amount: number,
  reason?: string
): Promise<GamificationActionResponse> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Não autenticado." };
  }

  // Sanitizar amount
  const safeAmount = Math.abs(amount);
  if (safeAmount <= 0) {
    return { error: "O valor informado deve ser maior do que zero." };
  }

  try {
    if (action === "bonus") {
      const { error } = await supabase.rpc("increment_points", { 
        user_id: studentId, 
        amount: safeAmount 
      });
      if (error) throw error;
      
    } else if (action === "deduct") {
      const { error } = await supabase.rpc("decrement_points", { 
        user_id: studentId, 
        amount: safeAmount 
      });
      if (error) throw error;
    }

    // TODO: Num cenário ideal, agora também lançaríamos um INSERT em `points_transactions`
    // const { error: logError } = await supabase.from('points_transactions').insert({
    //    student_id: studentId,
    //    admin_id: user.id,
    //    action: action,
    //    amount: safeAmount,
    //    reason: reason
    // });
    // if (logError) throw logError;

    revalidatePath("/admin/gamificacao");
    revalidatePath("/admin/alunos");
    
    return { success: true };
  } catch (err: any) {
    console.error("Erro ao ajustar pontos do aluno:", err);
    return { error: err.message || "Falha ao processar operação." };
  }
}

/**
 * Corrige a pontuação de um aluno administrativamente (afeta ranking e saldo).
 * Usado para correções de erro de lançamento.
 * 
 * @param {string} studentId O UUID do aluno
 * @param {number} balanceDelta Alteração no saldo disponível (pode ser negativa)
 * @param {number} totalDelta Alteração no total vitalício/ranking (pode ser negativa)
 */
export async function correctStudentPoints(
  studentId: string,
  balanceDelta: number,
  totalDelta: number
): Promise<GamificationActionResponse> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Não autenticado." };
  }

  try {
    const { error } = await supabase.rpc("admin_correct_points", { 
      p_user_id: studentId, 
      p_balance_delta: balanceDelta,
      p_total_delta: totalDelta
    });

    if (error) throw error;

    revalidatePath("/admin/gamificacao");
    revalidatePath("/admin/alunos");
    
    return { success: true };
  } catch (err: any) {
    console.error("Erro na correção técnica de pontos:", err);
    return { error: err.message || "Falha ao processar correção técnica." };
  }
}

/**
 * Zera a pontuação de todos os alunos simultaneamente.
 * Ação de alto risco protegida por verificação de Admin.
 */
export async function resetAllGamification(): Promise<GamificationActionResponse> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Não autenticado." };
  }

  // Verificar se é admin (Segurança Extra)
  const { data: role } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .single();

  if (!role) {
    return { error: "Apenas administradores podem realizar o reset global." };
  }

  try {
    const { error } = await supabase.rpc("reset_all_students_points");

    if (error) throw error;

    revalidatePath("/admin/gamificacao");
    revalidatePath("/admin/alunos");
    
    return { success: true };
  } catch (err: any) {
    console.error("Erro no reset global de pontos:", err);
    return { error: err.message || "Falha ao processar reset global." };
  }
}



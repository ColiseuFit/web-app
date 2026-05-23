"use server";

import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getAdminContext } from "./actions-shared";
import { triggerWaitlistPromotion } from "./actions-enrollment";

/**
 * MONITORAMENTO LIVE: Busca check-ins de um horário específico em uma data.
 * 
 * @security
 * - Role: Admin/Reception/Coach.
 * 
 * @param {string} slotId - UUID do horário.
 * @param {string} date - Data da consulta (YYYY-MM-DD).
 */
export async function getSlotCheckins(slotId: string, date: string) {
  const ctx = await getAdminContext();
  if ("error" in ctx) return { error: ctx.error };

  const cleanDate = date.trim();

  const { data, error } = await ctx.adminClient
    .from("check_ins")
    .select(`
      id,
      created_at,
      student_id,
      status,
      score_points,
      wods!inner(date),
      profiles:student_id (
        id,
        first_name,
        last_name,
        full_name,
        display_name,
        level,
        avatar_url
      )
    `)
    .eq("class_slot_id", slotId)
    .eq("wods.date", cleanDate)
    .order("created_at", { ascending: true });

  if (error) return { error: "Erro ao buscar check-ins: " + error.message };

  // Sanitize profiles (Supabase joins return them as an array)
  const sanitized = (data || [])
    .map((d: any) => ({
      ...d,
      profiles: Array.isArray(d.profiles) ? d.profiles[0] : d.profiles
    }))
    .filter((d: any) => d.profiles);

  return { data: sanitized };
}

/**
 * FINALIZAÇÃO DE AULA (SSoT): Registra presenças, faltas e atribui pontuação definitiva.
 * 
 * @SSoT: Transforma a intenção (Check-in) em registro oficial 'confirmed' ou 'missed'.
 * @operation
 * 1. Valida existência de WOD.
 * 2. Transiciona alunos não selecionados para 'missed' (zero pontos).
 * 3. Transiciona selecionados para 'confirmed' (atribui pontos).
 * 4. Incrementa o saldo total de pontos do aluno via RPC.
 * 5. Registra o fechamento em 'class_sessions'.
 * 
 * @security
 * - Role: Admin/Reception/Coach.
 * - RLS: Service Role (via adminClient).
 * 
 * @param {string} slotId - UUID do horário.
 * @param {string} date - Data da aula (YYYY-MM-DD).
 * @param {string[]} studentIds - UUIDs dos alunos PRESENTES.
 */
export async function closeClassAction(slotId: string, date: string, studentIds: string[]) {
  const ctx = await getAdminContext();
  if ("error" in ctx) return { error: ctx.error };

  // 1. Get ALL WOD IDs for this date (Operational Day)
  const cleanDate = date.trim();
  // This handles the edge case of duplicate WODs.
  const { data: wods } = await ctx.adminClient
    .from("wods")
    .select("id")
    .eq("date", cleanDate);

  if (!wods || wods.length === 0) return { error: `WOD não encontrado para a data: ${cleanDate}. Crie um WOD primeiro.` };
  const wodIds = wods.map((w: any) => w.id);

  // 2. Get Points value from points_rules (SSoT)
  const { data: pointRule } = await ctx.adminClient
    .from("points_rules")
    .select("points")
    .eq("key", "check_in")
    .single();

  const pointsValue = pointRule?.points ?? 10;

  // STEP 3: Progressively update student states based on the final selection.
  // We use two batches: one for those present, and one for those absent.
  
  // 3a. ABSENT: Any student who was 'checked' or 'confirmed' but is NOT in the final studentIds list.
  // If they were already 'confirmed' (manual), we MUST subtract their points if they had any.
  const { data: toMarkAbsent } = await ctx.adminClient
    .from("check_ins")
    .select("id, student_id, score_points, status")
    .eq("class_slot_id", slotId)
    .in("wod_id", wodIds)
    .not("student_id", "in", `(${studentIds.join(",")})`);

  if (toMarkAbsent && toMarkAbsent.length > 0) {
    for (const ci of toMarkAbsent) {
      if (ci.status === "confirmed" && ci.score_points > 0) {
        await ctx.adminClient.rpc("decrement_points", { user_id: ci.student_id, amount: ci.score_points });
      }
    }

    const absentIds = toMarkAbsent.map((ci: any) => ci.id);
    await ctx.adminClient
      .from("check_ins")
      .update({ 
        status: "missed", 
        score_points: 0,
        validated_at: new Date().toISOString()
      })
      .in("id", absentIds);
  }

  // 3b. PRESENT: All students in the studentIds list.
  // We award points ONLY to those who don't have them yet (score_points = 0).
  const { data: toConfirm } = await ctx.adminClient
    .from("check_ins")
    .select("id, student_id, score_points, status")
    .eq("class_slot_id", slotId)
    .in("wod_id", wodIds)
    .in("student_id", studentIds);

  if (toConfirm && toConfirm.length > 0) {
    for (const ci of toConfirm) {
      // Award points only if not already awarded
      if (ci.score_points === 0) {
        await ctx.adminClient.rpc("increment_points", { user_id: ci.student_id, amount: pointsValue });
      }
    }

    const confirmIds = toConfirm.map((ci: any) => ci.id);
    await ctx.adminClient
      .from("check_ins")
      .update({
        status: "confirmed",
        score_points: pointsValue,
        validated_at: new Date().toISOString()
      })
      .in("id", confirmIds);
  }
  
  // STEP 5: Persist finalization marker in class_sessions (NEW SSoT)
  const { error: sessionError } = await ctx.adminClient
    .from("class_sessions")
    .upsert({ 
      class_slot_id: slotId, 
      date: cleanDate,
      coach_id: ctx.user.id,
      finalized_at: new Date().toISOString()
    }, { onConflict: "class_slot_id, date" });

  if (sessionError) {
    console.error("Error saving class session:", sessionError);
  }

  revalidatePath("/admin/turmas");
  revalidatePath("/coach");
  return { success: true, pointsAwarded: pointsValue };
}

/**
 * MARCA FALTA (No-Show): Transiciona um check-in para o estado 'missed' com pontuação zerada.
 * 
 * @SSoT: Esta ação garante persistência imediata sem depender do fechamento final.
 * 
 * @security Role: Admin/Reception/Coach.
 * @param {string} checkInId - UUID do registro de check-in.
 */
export async function markAsAbsentAction(checkInId: string) {
  const ctx = await getAdminContext();
  if ("error" in ctx) return { error: ctx.error };

  // Just update the status to 'missed' and ensure points are zero
  const { error } = await ctx.adminClient
    .from("check_ins")
    .update({ 
      status: "missed", 
      score_points: 0,
      validated_at: new Date().toISOString()
    })
    .eq("id", checkInId);

  if (error) return { error: "Erro ao marcar falta: " + error.message };

  revalidatePath("/admin/turmas");
  revalidatePath("/coach");
  return { success: true };
}

/**
 * REMOVE MARCADOR DE FALTA: Reverte um check-in 'missed' para 'checked' (Pendente).
 * 
 * Permite ao Admin ou Coach corrigir erros onde um aluno foi marcado como ausente por engano.
 * Limpa `validated_at` para permitir que o ciclo de fechamento de aula processe o aluno novamente.
 * 
 * @param {string} checkInId - O UUID do registro de check-in a ser restaurado.
 * @returns {Promise<{success?: boolean, error?: string}>}
 */
export async function unmarkAsAbsentAction(checkInId: string) {
  const ctx = await getAdminContext();
  if ("error" in ctx) return { error: ctx.error };

  const { error } = await ctx.adminClient
    .from("check_ins")
    .update({ 
      status: "checked", 
      score_points: 0,
      validated_at: null
    })
    .eq("id", checkInId);

  if (error) return { error: "Erro ao remover falta: " + error.message };

  revalidatePath("/admin/turmas");
  revalidatePath("/coach");
  return { success: true };
}

/**
 * REMOÇÃO DE CHECK-IN: Exclui permanentemente o registro de presença de um aluno.
 * 
 * @SSoT Garante sincronia global:
 * 1. Exclui o registro em `check_ins` (fonte de verdade de presença diária).
 * 2. Dispara `triggerWaitlistPromotion` para preencher a vaga liberada.
 * 3. Revalida caminhos Admin, Coach e Aluno.
 * 
 * @security Role: Admin/Reception/Coach.
 * @param {string} checkInId - UUID do check-in a ser removido.
 * @returns {Promise<{success?: boolean, error?: string}>}
 */
export async function deleteCheckinAction(checkInId: string) {
  const ctx = await getAdminContext();
  if ("error" in ctx) return { error: ctx.error };

  // 1. Buscar o check-in para obter o slot de origem (necessário para promoção da waitlist)
  const { data: checkin, error: fetchError } = await ctx.adminClient
    .from("check_ins")
    .select("id, class_slot_id, student_id, score_points, status")
    .eq("id", checkInId)
    .single();

  if (fetchError || !checkin) return { error: "Check-in não encontrado." };

  // 2. Se o aluno tinha pontos confirmados, estornar
  if (checkin.status === "confirmed" && checkin.score_points > 0) {
    await ctx.adminClient.rpc("decrement_points", {
      user_id: checkin.student_id,
      amount: checkin.score_points
    });
  }

  // 3. Excluir o registro de check-in (SSoT: remove da fonte de verdade)
  const { error: deleteError } = await ctx.adminClient
    .from("check_ins")
    .delete()
    .eq("id", checkInId);

  if (deleteError) return { error: "Erro ao remover check-in: " + deleteError.message };

  // 4. Auto-Healing: Promover próximo da lista de espera para a vaga liberada
  if (checkin.class_slot_id) {
    await triggerWaitlistPromotion(checkin.class_slot_id);
  }

  // 5. Revalidação global (Admin + Coach + Dashboard do Aluno)
  revalidatePath("/admin/turmas");
  revalidatePath("/coach");
  return { success: true };
}

/**
 * MIGRAÇÃO DE CHECK-IN: Transfere atomicamente um check-in para outra turma.
 * 
 * @SSoT Garante sincronia global:
 * 1. Valida capacidade de check-ins no slot de destino para a data.
 * 2. Atualiza o `class_slot_id` do check-in existente (operação atômica).
 * 3. Dispara `triggerWaitlistPromotion` para o slot de ORIGEM (vaga liberada).
 * 4. Revalida caminhos Admin, Coach e Aluno.
 * 
 * @design O administrador pode fazer override de capacidade (operação privilegiada).
 * 
 * @security Role: Admin/Reception/Coach.
 * @param {string} checkInId - UUID do check-in a ser migrado.
 * @param {string} targetSlotId - UUID do slot de destino.
 * @param {string} date - Data da aula (YYYY-MM-DD) para validação de capacidade.
 * @returns {Promise<{success?: boolean, error?: string}>}
 */
export async function migrateCheckinAction(checkInId: string, targetSlotId: string, date: string) {
  const ctx = await getAdminContext();
  if ("error" in ctx) return { error: ctx.error };

  // 1. Buscar o check-in atual para obter o slot de origem
  const { data: checkin, error: fetchError } = await ctx.adminClient
    .from("check_ins")
    .select("id, class_slot_id, student_id, wod_id")
    .eq("id", checkInId)
    .single();

  if (fetchError || !checkin) return { error: "Check-in não encontrado." };
  if (checkin.class_slot_id === targetSlotId) return { error: "O aluno já está nesta turma." };

  // 2. Verificar se o aluno já tem check-in no slot de destino (mesmo WOD)
  const { data: existing } = await ctx.adminClient
    .from("check_ins")
    .select("id")
    .eq("class_slot_id", targetSlotId)
    .eq("student_id", checkin.student_id)
    .eq("wod_id", checkin.wod_id)
    .maybeSingle();

  if (existing) return { error: "O aluno já possui check-in na turma de destino." };

  // 3. Validar capacidade do slot de destino (soft check — Admin pode fazer override)
  const { data: targetSlot } = await ctx.adminClient
    .from("class_slots")
    .select("capacity")
    .eq("id", targetSlotId)
    .single();

  const cleanDate = date.trim();
  const { data: wods } = await ctx.adminClient
    .from("wods")
    .select("id")
    .eq("date", cleanDate);

  const wodIds = (wods || []).map((w: any) => w.id);

  if (wodIds.length > 0 && targetSlot) {
    const { count } = await ctx.adminClient
      .from("check_ins")
      .select("id", { count: "exact", head: true })
      .eq("class_slot_id", targetSlotId)
      .in("wod_id", wodIds);

    if (count !== null && count >= targetSlot.capacity) {
      return { error: `Turma de destino lotada (${count}/${targetSlot.capacity}). Libere uma vaga antes.` };
    }
  }

  // 4. Mutação Atômica: Atualizar o slot do check-in
  const originSlotId = checkin.class_slot_id;
  const { error: updateError } = await ctx.adminClient
    .from("check_ins")
    .update({ class_slot_id: targetSlotId })
    .eq("id", checkInId);

  if (updateError) return { error: "Erro ao migrar check-in: " + updateError.message };

  // 5. Auto-Healing: Promover próximo da waitlist no slot de ORIGEM
  if (originSlotId) {
    await triggerWaitlistPromotion(originSlotId);
  }

  // 6. Revalidação global (Admin + Coach + Dashboard do Aluno)
  revalidatePath("/admin/turmas");
  revalidatePath("/coach");
  return { success: true };
}

/**
 * CHECK-IN MANUAL (Coach Portal): Adiciona um aluno diretamente na aula com validação imediata.
 * 
 * @operation
 * 1. Recupera o WOD da data informada.
 * 2. Previne duplicidade de check-in.
 * 3. Faz UPSERT para transicionar status (ex: 'missed' -> 'confirmed') ou criar novo.
 * 4. Atribui pontos instantaneamente via RPC `increment_points`.
 * 5. Define `validated_at` em UTC para sincronia com o App do Aluno.
 * 
 * @security Role: Admin/Reception/Coach.
 * 
 * @param {string} slotId - UUID do horário (class_slots).
 * @param {string} date - Data da aula (YYYY-MM-DD).
 * @param {string} studentId - UUID do aluno (profiles).
 */
export async function manualCheckinAction(slotId: string, date: string, studentId: string) {
  const ctx = await getAdminContext();
  if ("error" in ctx) return { error: ctx.error };

  const cleanDate = date.trim();
  const { data: wod } = await ctx.adminClient
    .from("wods")
    .select("id")
    .eq("date", cleanDate)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!wod) return { error: `WOD não encontrado para a data: ${cleanDate}. Crie um WOD primeiro.` };

  // 2. Check if check-in already exists for this student on this WOD (any slot)
  // SSoT: A student can only have one check-in per WOD.
  const { data: existing } = await ctx.adminClient
    .from("check_ins")
    .select(`
      id, 
      status, 
      class_slot_id,
      class_slots (
        time_start
      )
    `)
    .eq("student_id", studentId)
    .eq("wod_id", wod.id)
    .maybeSingle();

  if (existing) {
    if (existing.class_slot_id !== slotId) {
      const time = (existing.class_slots as any)?.time_start || "outro horário";
      return { error: `Este aluno já possui check-in realizado às ${time} hoje.` };
    }
    if (existing.status === "confirmed") {
      return { error: "Aluno já confirmado nesta aula." };
    }
  }

  // 3. Get Points value
  const { data: pointRule } = await ctx.adminClient
    .from("points_rules")
    .select("points")
    .eq("key", "check_in")
    .single();

  const pointsValue = pointRule?.points ?? 10;

  // 3.1 Check if the class is already closed (SSoT)
  const { data: session } = await ctx.adminClient
    .from("class_sessions")
    .select("finalized_at")
    .eq("class_slot_id", slotId)
    .eq("date", cleanDate)
    .maybeSingle();

  const isClosed = !!session?.finalized_at;

  // 4. Upsert check-in: Update if exists (e.g., from 'missed' to 'confirmed'), or Insert new
  // IMPORTANT (SSoT): Manual check-in sets status to 'confirmed' (pre-validated).
  // If the class is already closed, we award points immediately.
  const { error: upsertError } = await ctx.adminClient
    .from("check_ins")
    .upsert({
      id: existing?.id, 
      student_id: studentId,
      class_slot_id: slotId,
      wod_id: wod.id,
      status: "confirmed",
      score_points: isClosed ? pointsValue : 0, 
      validated_at: isClosed ? new Date().toISOString() : null,
      created_at: existing?.id ? undefined : `${date}T${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}:00`
    });

  if (upsertError) {
    if (upsertError.code === "23505") {
      return { error: "Este aluno já possui check-in em outro horário para este treino." };
    }
    return { error: "Erro ao registrar presença: " + upsertError.message };
  }

  // 4.1 If closed, increment the balance immediately
  if (isClosed) {
    await ctx.adminClient.rpc("increment_points", { 
      user_id: studentId, 
      amount: pointsValue 
    });
  }
  
  // 5. Auto-Cleanup (SSoT): If student was in the waitlist for THIS slot, remove them.
  await ctx.adminClient
    .from("class_waitlist")
    .delete()
    .eq("class_slot_id", slotId)
    .eq("student_id", studentId);

  revalidatePath("/coach");
  revalidatePath("/admin/turmas");
  return { success: true };
}

/**
 * REABERTURA DE AULA (Emergência): Reverte o estado de uma aula já finalizada.
 * 
 * @SSoT (Rollback):
 * 1. Estorna pontos creditados (decrement_points).
 * 2. Limpa marcador de finalização (class_sessions).
 * 3. Retorna check-ins para status 'checked'.
 * 
 * @security Altíssimo Risco. Role: Admin/Coach.
 * @param {string} slotId - UUID do horário.
 * @param {string} date - Data da aula (YYYY-MM-DD).
 */
export async function reopenClassAction(slotId: string, date: string) {
  const ctx = await getAdminContext();
  if ("error" in ctx) return { error: ctx.error };

  const cleanDate = date.trim();

  // STEP 1: Get ALL WOD IDs for this date (Operational Day)
  const { data: wods } = await ctx.adminClient
    .from("wods")
    .select("id")
    .eq("date", cleanDate);

  if (!wods || wods.length === 0) {
    return { error: `Nenhum WOD encontrado para a data ${cleanDate}.` };
  }

  const wodIds = wods.map((w: any) => w.id);

  // STEP 2: Fetch existing check-ins for THIS slot across ALL those WOD IDs.
  const { data: existingCheckins } = await ctx.adminClient
    .from("check_ins")
    .select("id, wod_id, status, student_id, score_points")
    .eq("class_slot_id", slotId)
    .in("wod_id", wodIds);

  if (!existingCheckins || existingCheckins.length === 0) {
    return { error: "Nenhum check-in encontrado para esta turma nesta data." };
  }

  // STEP 3: Identify students who actually RECEIVED points (score_points > 0)
  const studentsWithPoints = existingCheckins
    .filter((c: any) => c.status === "confirmed" && c.score_points > 0);

  // Determine if there's anything to finalize (idempotency check)
  const hasFinalized = existingCheckins.some(
    (c: any) => c.status === "confirmed" || c.status === "missed"
  );

  if (!hasFinalized) {
    revalidatePath("/coach");
    return { success: true, confirmedIds: [] };
  }

  // STEP 4: Revert all statuses to 'checked' and clear points across ALL relevant WODs for this slot.
  const { error: updateError } = await ctx.adminClient
    .from("check_ins")
    .update({ 
      status: "checked", 
      score_points: 0, 
      validated_at: null 
    })
    .eq("class_slot_id", slotId)
    .in("wod_id", wodIds)
    .in("status", ["confirmed", "missed"]);

  if (updateError) return { error: "Erro ao reabrir: " + updateError.message };
  
  // STEP 4.1: Clear finalization marker from class_sessions (NEW SSoT)
  await ctx.adminClient
    .from("class_sessions")
    .delete()
    .eq("class_slot_id", slotId)
    .eq("date", cleanDate);

  // STEP 5: Rollback points for students who received them
  if (studentsWithPoints.length > 0) {
    await Promise.allSettled(
      studentsWithPoints.map((ci: any) => 
        ctx.adminClient.rpc("decrement_points", { 
          user_id: ci.student_id, 
          amount: ci.score_points 
        })
      )
    );
  }

  revalidatePath("/coach");
  revalidatePath("/admin/turmas");
  return { success: true, confirmedIds: studentsWithPoints.map((s: any) => s.student_id) };
}

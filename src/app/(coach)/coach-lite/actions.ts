"use server";

import { revalidatePath } from "next/cache";
import { markAsAbsentAction, unmarkAsAbsentAction, manualCheckinAction, closeClassAction } from "@/app/(admin)/admin/(authenticated)/turmas/actions";
import { redirect } from "next/navigation";

/**
 * Alterna a presença de um aluno no modo Lite.
 * 
 * @param formData Objeto FormData contendo `checkinId` e `isSelected`.
 * @throws Redireciona ou revalida o caminho conforme o estado da ação.
 */
export async function toggleLiteAttendance(formData: FormData) {
  const checkinId = formData.get("checkinId") as string;
  const isSelected = formData.get("isSelected") === "true";

  if (!checkinId) return;

  try {
    if (isSelected) {
      // Atualmente marcado como presente -> Marcar como falta
      await markAsAbsentAction(checkinId);
    } else {
      // Atualmente marcado como falta -> Marcar como presente
      await unmarkAsAbsentAction(checkinId);
    }
  } catch (error) {
    console.error("[COACH_LITE] Falha ao alternar presença:", error);
  }

  revalidatePath("/coach-lite", "page");
}

/**
 * Adiciona manualmente um aluno à turma no modo Lite.
 * 
 * @param formData Objeto FormData contendo `slotId`, `dateStr` e `studentId`.
 */
export async function addLiteStudent(formData: FormData) {
  const slotId = formData.get("slotId") as string;
  const dateStr = formData.get("dateStr") as string;
  const studentId = formData.get("studentId") as string;
  
  if (slotId && dateStr && studentId) {
    try {
      await manualCheckinAction(slotId, dateStr, studentId);
      revalidatePath("/coach-lite", "page");
    } catch (error) {
      console.error("[COACH_LITE] Falha ao adicionar aluno:", error);
    }
  }
}

/**
 * Encerra a aula no modo Lite e processa os check-ins finais para ganho de pontos.
 * 
 * @param formData Objeto FormData contendo `slotId`, `dateStr` e `selectedIds` (IDs de alunos separados por vírgula).
 */
export async function closeLiteClass(formData: FormData) {
  const slotId = formData.get("slotId") as string;
  const dateStr = formData.get("dateStr") as string;
  
  // Captura os IDs selecionados via hidden input (padrão HTML Forms nativo)
  const selectedIdsStr = formData.get("selectedIds") as string;
  const selectedIds = selectedIdsStr ? selectedIdsStr.split(",") : [];

  if (slotId && dateStr && selectedIds.length > 0) {
    try {
      await closeClassAction(slotId, dateStr, selectedIds);
      // Após o fechamento, remove o slot expandido da URL
      redirect(`/coach-lite?date=${dateStr}`);
    } catch (error) {
      console.error("[COACH_LITE] Falha ao fechar aula:", error);
      redirect(`/coach-lite?date=${dateStr}&expand=${slotId}&error=Falha técnica ao fechar aula`);
    }
  } else {
    // Validação de segurança para evitar fechamento de aula vazia
    redirect(`/coach-lite?date=${dateStr}&expand=${slotId}&error=Selecione ao menos um aluno`);
  }
}


"use server";

import { revalidatePath } from "next/cache";
import { markAsAbsentAction, unmarkAsAbsentAction, manualCheckinAction, closeClassAction } from "@/app/(admin)/admin/turmas/actions";
import { redirect } from "next/navigation";

// Toggles student attendance
export async function toggleLiteAttendance(formData: FormData) {
  const checkinId = formData.get("checkinId") as string;
  const isSelected = formData.get("isSelected") === "true";

  if (!checkinId) return;

  if (isSelected) {
    // Currently selected (present) -> Make absent
    await markAsAbsentAction(checkinId);
  } else {
    // Currently absent -> Make present
    await unmarkAsAbsentAction(checkinId);
  }

  revalidatePath("/coach-lite", "page");
}

// Manually adds a student
export async function addLiteStudent(formData: FormData) {
  const slotId = formData.get("slotId") as string;
  const dateStr = formData.get("dateStr") as string;
  const studentId = formData.get("studentId") as string;
  
  if (slotId && dateStr && studentId) {
    await manualCheckinAction(slotId, dateStr, studentId);
    revalidatePath("/coach-lite", "page");
  }
}

// Closes the class
export async function closeLiteClass(formData: FormData) {
  const slotId = formData.get("slotId") as string;
  const dateStr = formData.get("dateStr") as string;
  
  // We need the selected IDs. The form can pass them as multiple hidden inputs matching standard HTML forms, or comma separated.
  const selectedIdsStr = formData.get("selectedIds") as string;
  const selectedIds = selectedIdsStr ? selectedIdsStr.split(",") : [];

  if (slotId && dateStr && selectedIds.length > 0) {
    await closeClassAction(slotId, dateStr, selectedIds);
    // After closing, we go back to the top level lite view without expanded slot
    redirect(`/coach-lite?date=${dateStr}`);
  } else {
    // Not enough data or empty class
    redirect(`/coach-lite?date=${dateStr}&expand=${slotId}&error=Selecione ao menos um aluno`);
  }
}

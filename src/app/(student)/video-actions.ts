"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * trackVideoView: Registra que o aluno assistiu um vídeo popup.
 * Usa UPSERT para garantir idempotência (1 registro por aluno/vídeo).
 * 
 * @param {string} videoId - Identificador único do vídeo (ex: "running-hub-intro").
 * @returns {Promise<{success: boolean, error?: string}>}
 * 
 * @security
 * - RLS: Policy `students can insert own views` garante isolamento.
 * - Idempotente: UNIQUE(student_id, video_id) previne duplicatas.
 */
export async function trackVideoView(videoId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Não autenticado." };

  const { error } = await supabase
    .from("video_views")
    .upsert(
      { student_id: user.id, video_id: videoId },
      { onConflict: "student_id,video_id" }
    );

  if (error) {
    console.error("Error tracking video view:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

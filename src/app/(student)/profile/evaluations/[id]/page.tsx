import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import EvaluationDetailsClient from "./EvaluationDetailsClient";

/**
 * Página de Detalhes de uma Avaliação Física (Server Component).
 * Busca os dados e delega a interatividade para o Client Component.
 */
export default async function EvaluationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Busca a avaliação atual
  const { data: evaluation } = await supabase
    .from("physical_evaluations")
    .select("*")
    .eq("id", id)
    .single();

  if (!evaluation || evaluation.student_id !== user.id) {
    notFound();
  }

  // Busca o perfil do aluno para cálculos biométricos (SSoT)
  const { data: profile } = await supabase
    .from("profiles")
    .select("gender, birth_date, full_name")
    .eq("id", user.id)
    .single();

  // Busca a avaliação imediatamente anterior para comparativo de evolução
  const { data: previousEvaluation } = await supabase
    .from("physical_evaluations")
    .select("*")
    .eq("student_id", user.id)
    .lt("evaluation_date", evaluation.evaluation_date)
    .order("evaluation_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  // 3. Geração de Signed URLs em Tempo Real (Legacy Proof)
  const refreshSignedUrls = async (evalObj: any) => {
    if (!evalObj || !evalObj.photos || evalObj.photos.length === 0) return evalObj;
    
    interface PhotoRecord {
      url: string;
      label?: string;
      path?: string;
    }

    const refreshedPhotos = await Promise.all(
      evalObj.photos.map(async (photo: PhotoRecord) => {
        if (photo.path) {
          const { data } = await supabase.storage
            .from("physical-evaluations")
            .createSignedUrl(photo.path, 3600);
          return { ...photo, url: data?.signedUrl || photo.url };
        }
        return photo;
      })
    );

    return { ...evalObj, photos: refreshedPhotos };
  };

  const evaluationWithFreshPhotos = await refreshSignedUrls(evaluation);
  const previousWithFreshPhotos = await refreshSignedUrls(previousEvaluation);

  return (
    <EvaluationDetailsClient 
      evaluation={evaluationWithFreshPhotos} 
      previous={previousWithFreshPhotos}
      student={profile}
    />
  );
}

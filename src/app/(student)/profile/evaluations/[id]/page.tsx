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
  // Isso garante que se um link de 1 ano guardado no banco expirou,
  // nós geramos um novo na hora para o aluno visualizar.
  const refreshSignedUrls = async (evalObj: any) => {
    if (!evalObj || !evalObj.photos || evalObj.photos.length === 0) return evalObj;
    
    const refreshedPhotos = await Promise.all(
      evalObj.photos.map(async (photo: any) => {
        // Se temos o path, geramos um novo link de 1 hora (suficiente para a sessão)
        if (photo.path) {
          const { data } = await supabase.storage
            .from("physical-evaluations")
            .createSignedUrl(photo.path, 3600);
          return { ...photo, url: data?.signedUrl || photo.url };
        }
        return photo; // Fallback para o URL antigo se não houver path
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
    />
  );
}

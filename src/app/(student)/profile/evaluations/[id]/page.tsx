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

  return (
    <EvaluationDetailsClient 
      evaluation={evaluation} 
      previous={previousEvaluation} 
    />
  );
}

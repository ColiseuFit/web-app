import { getLegalDocuments, getParqQuestions } from "./actions";
import DocumentosClient from "./DocumentosClient";

// Página do painel administrativo de compliance e termos
export const metadata = {
  title: "Documentos e Compliance | Arena Coliseu",
  description: "Gestão do PAR-Q, Regimento Interno e Termos LGPD",
};

export default async function DocumentosPage() {
  // SSR Fetch (aguarda a criação das tabelas pelo usuário, se der erro vai vazio pra não quebrar a página)
  let documents: any[] = [];
  let parqQuestions: any[] = [];

  try {
    const [docs, parq] = await Promise.all([
      getLegalDocuments(),
      getParqQuestions()
    ]);
    documents = docs || [];
    parqQuestions = parq || [];
  } catch (error) {
    console.warn("Tabelas de compliance ainda não disponíveis ou erro de conexão.");
  }

  return (
    <DocumentosClient 
      initialDocuments={documents} 
      initialParq={parqQuestions} 
    />
  );
}

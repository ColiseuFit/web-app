import { getCoaches } from "./actions";
import ProfessoresClient from "@/app/(admin)/admin/professores/ProfessoresClient";

/**
 * Server Component: Professores Page
 * Fetches initial data and handles roles protection.
 */
export default async function ProfessoresPage() {
  const { data: coaches, error } = await getCoaches();

  return (
    <div style={{ padding: 40 }}>
      {error ? (
        <div style={{ padding: 24, background: "#FEF2F2", border: "2px solid #EF4444", color: "#B91C1C", fontWeight: 700 }}>
          Erro ao carregar dados: {error}
        </div>
      ) : (
        <ProfessoresClient initialCoaches={coaches || []} />
      )}
    </div>
  );
}

import { createClient } from "@/lib/supabase/server";
import AlunosClient from "../AlunosClient"; 
import { getCachedLevels } from "@/lib/constants/levels_actions";

/**
 * 📋 Pré-cadastro Page (Server Component)
 * 
 * Página independente para visualização de leads e aprovação de novos alunos.
 */
export default async function AlunosPreCadastroPage() {
  const supabase = await createClient();

  const [
    { data: preRegistrationsRes },
    dynamicLevels
  ] = await Promise.all([
    supabase
      .from("pre_registrations")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
    getCachedLevels()
  ]);

  return (
    <div className="admin-container-fluid">
      <div style={{ marginBottom: "32px" }}>
        <h1
          className="font-display"
          style={{
            fontSize: "32px",
            fontWeight: 900,
            letterSpacing: "-0.04em",
            textTransform: "uppercase",
            lineHeight: 1,
            margin: 0,
          }}
        >
          Pré-cadastro
        </h1>
        <p
          style={{
            fontSize: "14px",
            fontWeight: 600,
            color: "#666",
            marginTop: "8px",
          }}
        >
          Gerencie leads e solicitações de matrícula.
        </p>
      </div>

      <AlunosClient 
        students={[]} // Empty array since we are only showing leads
        preRegistrations={preRegistrationsRes || []}
        dynamicLevels={dynamicLevels}
        currentPage={1}
        totalPages={1}
        totalCount={0}
        currentSearch=""
        currentLevel="Todos"
        initialViewMode="leads"
        hideTabs={true}
        hideHeader={true}
      />
    </div>
  );
}

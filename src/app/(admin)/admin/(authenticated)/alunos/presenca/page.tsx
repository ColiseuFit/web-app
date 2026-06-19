import { getCachedLevels } from "@/lib/constants/levels_actions";
import AttendanceDashboard from "../AttendanceDashboard";

/**
 * 📅 Presença e Frequência Page (Server Component)
 *
 * Página independente para análise de frequência dos alunos.
 */
export default async function AlunosPresencaPage() {
  const dynamicLevels = await getCachedLevels();

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
          Presença & Frequência
        </h1>
        <p
          style={{
            fontSize: "14px",
            fontWeight: 600,
            color: "#666",
            marginTop: "8px",
          }}
        >
          Acompanhamento de faltantes e alunos no-show.
        </p>
      </div>

      <AttendanceDashboard dynamicLevels={dynamicLevels} />
    </div>
  );
}

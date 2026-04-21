import { getRunnersOverview } from "@/lib/actions/running_actions";
import RunningHubClient from "./RunningHubClient";

/**
 * Running Hub Page: O Painel de Controle Global da Corrida (Admin).
 * Busca os dados agregados dos atletas e delega a renderização para o Client Component.
 */
export default async function RunningHubPage() {
  const runners = await getRunnersOverview();

  return (
    <div className="admin-page-fill" style={{ padding: "40px" }}>
      <RunningHubClient runners={runners} />
    </div>
  );
}

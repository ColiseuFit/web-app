import { getCachedAccessTypes } from "@/lib/constants/access_actions";
import PlanosClient from "./PlanosClient";
import { getPlans, getContractTemplates } from "./actions";

export default async function PlanosPage() {
  // 1. Buscar os tipos de acesso dinamicamente (SSoT do Box)
  const accessTypesMap = await getCachedAccessTypes();
  const accessTypes = Object.values(accessTypesMap).map(t => ({
    id: t.id,
    label: t.label
  }));

  // 2. Buscar planos e templates cadastrados via Server Actions em paralelo
  const [plans, contractTemplates] = await Promise.all([
    getPlans(),
    getContractTemplates()
  ]);

  return (
    <PlanosClient 
      accessTypes={accessTypes} 
      initialPlans={plans}
      initialContractTemplates={contractTemplates} 
    />
  );
}

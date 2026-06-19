/**
 * @function hydrateContract
 * @description
 * Hidrata o template do termo ou contrato jurídico com os dados do aluno e regras do plano.
 * Suporta tanto as variáveis modernas {{variavel}} quanto as legadas %TAG% para retrocompatibilidade.
 * 
 * @param {string} template - O texto original do modelo do contrato.
 * @param {any} student - Objeto do perfil do aluno (profiles).
 * @param {any} plan - Objeto do plano comercial vendido (plans).
 * @param {object} [signatureData] - Dados de auditoria do aceite digital.
 * @returns {string} Texto do contrato devidamente formatado e preenchido.
 */
export function hydrateContract(
  template: string,
  student: any,
  plan: any,
  signatureData?: { ipAddress: string; acceptedAt: string; signatureName: string }
): string {
  if (!template) return "";

  const formattedPrice = plan?.price 
    ? parseFloat(plan.price).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) 
    : "R$ 0,00";

  const formattedSetupFee = plan?.setup_fee 
    ? parseFloat(plan.setup_fee).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) 
    : "R$ 0,00";

  const formattedDate = signatureData?.acceptedAt
    ? new Date(signatureData.acceptedAt).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      })
    : "Pendente";

  const mapping: Record<string, string> = {
    // ── Modern placeholders ──
    "{{nome_aluno}}": student?.full_name || student?.display_name || "",
    "{{cpf_aluno}}": student?.cpf || "",
    "{{telefone_aluno}}": student?.phone || "",
    "{{valor_mensalidade}}": formattedPrice,
    "{{valor_adesao}}": formattedSetupFee,
    "{{nome_plano}}": plan?.name || "",
    "{{data_assinatura}}": formattedDate,
    "{{ip_assinatura}}": signatureData?.ipAddress || "",
    "{{nome_assinatura}}": signatureData?.signatureName || "",

    // ── Legacy placeholders (Compatibility) ──
    "%NOME%": student?.full_name || student?.display_name || "",
    "%CPF%": student?.cpf || "",
    "%FONE_CELULAR%": student?.phone || "",
    "%VALOR_RECIBO%": formattedPrice,
    "%DATA_ACEITE%": formattedDate,
    "%IP_ACEITE%": signatureData?.ipAddress || "",
    "%ASSINATURA%": signatureData?.signatureName || "",
    "%PLANO%": plan?.name || ""
  };

  let result = template;
  for (const [key, value] of Object.entries(mapping)) {
    result = result.replaceAll(key, value);
  }

  // Tratamento específico de frações de datas
  if (signatureData?.acceptedAt) {
    const d = new Date(signatureData.acceptedAt);
    const dia = String(d.getDate()).padStart(2, "0");
    const mes = String(d.getMonth() + 1).padStart(2, "0");
    const ano = String(d.getFullYear());

    result = result.replaceAll("{{dia}}", dia).replaceAll("%DIA%", dia);
    result = result.replaceAll("{{mes}}", mes).replaceAll("%MES%", mes);
    result = result.replaceAll("{{ano}}", ano).replaceAll("%ANO%", ano);
  } else {
    result = result
      .replaceAll("{{dia}}", "--").replaceAll("%DIA%", "--")
      .replaceAll("{{mes}}", "--").replaceAll("%MES%", "--")
      .replaceAll("{{ano}}", "----").replaceAll("%ANO%", "----");
  }

  return result;
}

/**
 * @function calculateProRata
 * @description
 * Calcula o período de pró-rata e o valor proporcional para faturamento parcial
 * antes do início do contrato de recorrência cheia (Cenário A - Recomendado).
 * 
 * @param {number} price - Preço cheio mensal do plano.
 * @param {string} startDateStr - Data em que o aluno se matricula (YYYY-MM-DD).
 * @param {number} dueDay - O dia fixo de vencimento escolhido (1 a 31).
 * @returns {object} Dados contendo dias de pró-rata, preço da fração e datas ajustadas.
 */
export function calculateProRata(
  price: number,
  startDateStr: string,
  dueDay: number
) {
  const start = new Date(startDateStr + "T12:00:00Z");
  
  // Criamos o próximo vencimento no mesmo ano/mês do início
  let nextDue = new Date(start.getTime());
  nextDue.setUTCDate(dueDay);

  // Se o dia escolhido já passou ou é hoje, jogamos para o mês seguinte
  if (nextDue.getTime() <= start.getTime()) {
    nextDue.setUTCMonth(nextDue.getUTCMonth() + 1);
    
    // Tratamento de segurança caso o mês seguinte não tenha o dia desejado (ex: dia 31)
    if (nextDue.getUTCDate() !== dueDay) {
      nextDue.setUTCDate(0); // Ajusta para o último dia do mês correspondente
    }
  }

  // Diferença em dias
  const diffMs = nextDue.getTime() - start.getTime();
  const proRataDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  // Cálculo financeiro proporcional com base em um mês padrão de 30 dias
  const dailyRate = price / 30;
  const proRataPrice = Math.round(dailyRate * proRataDays * 100) / 100;

  return {
    proRataDays,
    proRataPrice,
    proRataPeriodStart: startDateStr,
    proRataPeriodEnd: nextDue.toISOString().split("T")[0],
    contractStartDate: nextDue.toISOString().split("T")[0]
  };
}

export default hydrateContract;

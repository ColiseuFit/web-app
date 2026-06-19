"use server";

/**
 * @module plans-actions
 * @description
 * Server Actions para gestão de Planos Comerciais (CRUD).
 * 
 * Um Plano é o "Motor de Regras" do sistema: ele define preço, ciclo de cobrança,
 * regras de acesso (check-ins), trancamento, cancelamento e multa rescisória.
 * Cada plano funciona de forma independente, permitindo que a academia ofereça
 * diferentes políticas (ex: Plano ELITE com trancamento vs. Plano FLEX sem trancamento).
 * 
 * @security
 * - Todas as operações utilizam RLS (Row Level Security) via `createClient()` do Supabase.
 * - A validação de entrada é feita com Zod (`planValidationSchema`) antes de qualquer
 *   operação de escrita, evitando injeção de dados malformados.
 * 
 * @architecture
 * - Segue o Centralized Aggregator Pattern: este arquivo é re-exportado por `./index.ts`.
 * - Os campos de trancamento (freeze_*) e cancelamento (cancellation_*) residem na
 *   tabela `plans` e são copiados para o contrato individual no momento da venda
 *   (snapshot), garantindo que alterações futuras no plano não afetem contratos antigos.
 * 
 * @utc_enforcement
 * Datas processadas em `sellContract` utilizam UTC (T12:00:00Z) para evitar
 * shift de fuso horário entre servidor e cliente.
 */

import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { calculateProRata } from "@/lib/utils/contracts";

/**
 * Schema Zod para validação estrita de todos os campos do Plano Comercial.
 * 
 * Grupos de campos:
 * - **Dados Básicos:** name, status, access_type_id, online_sale, is_pre_sale
 * - **Financeiro:** price, setup_fee, billing_cycle, billing_due_rule, billing_fixed_day,
 *   accepted_payment_methods, installments, auto_renew
 * - **Acesso/Check-in:** checkins_per_week, limit_checkins_per_day, limit_checkins_per_month
 * - **Cancelamento:** cancellation_fee_enabled, cancellation_fee_type, cancellation_fee_value,
 *   loyalty_period_months, cancellation_notice_days, allow_student_cancel
 * - **Trancamento:** freeze_enabled, freeze_max_days_per_year, freeze_min_days_per_request,
 *   freeze_billing_behavior, freeze_max_requests_per_year, freeze_cooldown_days
 * 
 * @see PlanForm.tsx - Componente visual que alimenta este schema via FormData
 */
const planValidationSchema = z.object({
  name: z.string().min(3, "O nome do plano deve ter no mínimo 3 caracteres."),
  status: z.enum(["active", "archived", "draft"]).default("active"),
  access_type_id: z.string().uuid().nullable().optional(),
  online_sale: z.boolean().default(false),
  is_pre_sale: z.boolean().default(false),
  price: z.number().nonnegative("O preço deve ser maior ou igual a zero."),
  setup_fee: z.number().nonnegative("A taxa de adesão deve ser maior ou igual a zero.").default(0),
  billing_cycle: z.enum(["monthly", "quarterly", "semiannual", "annual", "one_time"]),
  billing_due_rule: z.enum(["purchase_day", "fixed_day", "custom_on_sale"]).default("purchase_day"),
  billing_fixed_day: z.number().min(1).max(31).nullable().optional(),
  accepted_payment_methods: z.array(z.string()).min(1, "Selecione pelo menos uma forma de pagamento."),
  installments: z.number().int().min(1, "O parcelamento deve ser de no mínimo 1 vez.").default(1),
  auto_renew: z.boolean().default(false),
  checkins_per_week: z.number().int().nonnegative().nullable().optional(),
  limit_checkins_per_day: z.number().int().min(1).default(1),
  limit_checkins_per_month: z.number().int().nonnegative().nullable().optional(),
  contract_template_id: z.string().uuid().nullable().optional(),

  cancellation_fee_enabled: z.boolean().default(false),
  cancellation_fee_type: z.enum(["percentual_restante", "mensalidades_fixas", "valor_fixo"]).default("percentual_restante"),
  cancellation_fee_value: z.number().nonnegative().default(0),
  loyalty_period_months: z.number().int().nonnegative().default(0),
  cancellation_notice_days: z.number().int().nonnegative().default(0),
  allow_student_cancel: z.boolean().default(false),

  freeze_enabled: z.boolean().default(false),
  freeze_max_days_per_year: z.number().int().nonnegative().default(0),
  freeze_min_days_per_request: z.number().int().nonnegative().default(0),
  freeze_billing_behavior: z.enum(["pause_billing", "keep_billing"]).default("pause_billing"),
  freeze_max_requests_per_year: z.number().int().nonnegative().default(0),
  freeze_cooldown_days: z.number().int().nonnegative().default(0)
});

/**
 * Cria um novo plano (configuração/regra comercial) no banco de dados.
 * 
 * Fluxo:
 * 1. Extrai e sanitiza os dados do FormData (cast para tipos corretos).
 * 2. Valida contra o `planValidationSchema` (Zod).
 * 3. Insere na tabela `plans` via Supabase com RLS ativo.
 * 
 * @param {FormData} formData - Dados do formulário enviados pelo PlanForm.tsx.
 * @returns {Promise<{success: boolean, data?: any, error?: string}>} Resultado da operação.
 * @throws Retorna `{ success: false, error }` em caso de falha de validação ou DB. Nunca lança exceção.
 */
export async function createPlan(formData: FormData) {
  const supabase = await createClient();

  // Extrair e sanitizar dados do form para validação Zod
  const rawData = {
    name: formData.get("name") as string,
    status: (formData.get("status") as string) || "active",
    access_type_id: (formData.get("access_type_id") as string) || null,
    online_sale: formData.get("online_sale") === "true",
    is_pre_sale: formData.get("is_pre_sale") === "true",
    price: parseFloat(formData.get("price") as string) || 0,
    setup_fee: parseFloat(formData.get("setup_fee") as string) || 0,
    billing_cycle: formData.get("billing_cycle") as string,
    billing_due_rule: (formData.get("billing_due_rule") as string) || "purchase_day",
    billing_fixed_day: formData.get("billing_fixed_day") ? parseInt(formData.get("billing_fixed_day") as string) : null,
    accepted_payment_methods: formData.getAll("payment_methods") as string[],
    installments: parseInt(formData.get("installments") as string) || 1,
    auto_renew: formData.get("auto_renew") === "true",
    checkins_per_week: formData.get("checkins_per_week") ? parseInt(formData.get("checkins_per_week") as string) : null,
    limit_checkins_per_day: parseInt(formData.get("limit_checkins_per_day") as string) || 1,
    limit_checkins_per_month: formData.get("limit_checkins_per_month") ? parseInt(formData.get("limit_checkins_per_month") as string) : null,
    contract_template_id: (formData.get("contract_template_id") as string) || null,

    cancellation_fee_enabled: formData.get("cancellation_fee_enabled") === "true",
    cancellation_fee_type: (formData.get("cancellation_fee_type") as string) || "percentual_restante",
    cancellation_fee_value: parseFloat(formData.get("cancellation_fee_value") as string) || 0,
    loyalty_period_months: parseInt(formData.get("loyalty_period_months") as string) || 0,
    cancellation_notice_days: parseInt(formData.get("cancellation_notice_days") as string) || 0,
    allow_student_cancel: formData.get("allow_student_cancel") === "true",

    freeze_enabled: formData.get("freeze_enabled") === "true",
    freeze_max_days_per_year: parseInt(formData.get("freeze_max_days_per_year") as string) || 0,
    freeze_min_days_per_request: parseInt(formData.get("freeze_min_days_per_request") as string) || 0,
    freeze_billing_behavior: (formData.get("freeze_billing_behavior") as string) || "pause_billing",
    freeze_max_requests_per_year: parseInt(formData.get("freeze_max_requests_per_year") as string) || 0,
    freeze_cooldown_days: parseInt(formData.get("freeze_cooldown_days") as string) || 0
  };

  const validation = planValidationSchema.safeParse(rawData);
  if (!validation.success) {
    const errorMsg = validation.error.errors.map(e => e.message).join(" ");
    return { success: false, error: errorMsg };
  }

  try {
    const { data, error } = await supabase.from("plans").insert(validation.data).select().single();

    if (error) {
      console.error("[createPlan] Error:", error);
      return { success: false, error: "Erro ao criar plano no banco de dados." };
    }

    return { success: true, data };
  } catch (err: any) {
    console.error("[createPlan] Exception:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Atualiza as configurações de um plano comercial existente.
 * 
 * Fluxo:
 * 1. Extrai e sanitiza os dados do FormData.
 * 2. Valida contra o `planValidationSchema` (Zod).
 * 3. Atualiza a linha correspondente na tabela `plans` e marca `updated_at`.
 * 
 * @important Alterar um plano **NÃO** altera contratos já vendidos (snapshot).
 * Apenas novos contratos herdarão as regras atualizadas.
 * 
 * @param {string} id - UUID do plano a ser atualizado.
 * @param {FormData} formData - Novos dados do formulário.
 * @returns {Promise<{success: boolean, data?: any, error?: string}>} Resultado da operação.
 * @throws Retorna `{ success: false, error }` em caso de falha. Nunca lança exceção.
 */
export async function updatePlan(id: string, formData: FormData) {
  const supabase = await createClient();

  const rawData = {
    name: formData.get("name") as string,
    status: (formData.get("status") as string) || "active",
    access_type_id: (formData.get("access_type_id") as string) || null,
    online_sale: formData.get("online_sale") === "true",
    is_pre_sale: formData.get("is_pre_sale") === "true",
    price: parseFloat(formData.get("price") as string) || 0,
    setup_fee: parseFloat(formData.get("setup_fee") as string) || 0,
    billing_cycle: formData.get("billing_cycle") as string,
    billing_due_rule: (formData.get("billing_due_rule") as string) || "purchase_day",
    billing_fixed_day: formData.get("billing_fixed_day") ? parseInt(formData.get("billing_fixed_day") as string) : null,
    accepted_payment_methods: formData.getAll("payment_methods") as string[],
    installments: parseInt(formData.get("installments") as string) || 1,
    auto_renew: formData.get("auto_renew") === "true",
    checkins_per_week: formData.get("checkins_per_week") ? parseInt(formData.get("checkins_per_week") as string) : null,
    limit_checkins_per_day: parseInt(formData.get("limit_checkins_per_day") as string) || 1,
    limit_checkins_per_month: formData.get("limit_checkins_per_month") ? parseInt(formData.get("limit_checkins_per_month") as string) : null,
    contract_template_id: (formData.get("contract_template_id") as string) || null,

    cancellation_fee_enabled: formData.get("cancellation_fee_enabled") === "true",
    cancellation_fee_type: (formData.get("cancellation_fee_type") as string) || "percentual_restante",
    cancellation_fee_value: parseFloat(formData.get("cancellation_fee_value") as string) || 0,
    loyalty_period_months: parseInt(formData.get("loyalty_period_months") as string) || 0,
    cancellation_notice_days: parseInt(formData.get("cancellation_notice_days") as string) || 0,
    allow_student_cancel: formData.get("allow_student_cancel") === "true",

    freeze_enabled: formData.get("freeze_enabled") === "true",
    freeze_max_days_per_year: parseInt(formData.get("freeze_max_days_per_year") as string) || 0,
    freeze_min_days_per_request: parseInt(formData.get("freeze_min_days_per_request") as string) || 0,
    freeze_billing_behavior: (formData.get("freeze_billing_behavior") as string) || "pause_billing",
    freeze_max_requests_per_year: parseInt(formData.get("freeze_max_requests_per_year") as string) || 0,
    freeze_cooldown_days: parseInt(formData.get("freeze_cooldown_days") as string) || 0
  };

  const validation = planValidationSchema.safeParse(rawData);
  if (!validation.success) {
    const errorMsg = validation.error.errors.map(e => e.message).join(" ");
    return { success: false, error: errorMsg };
  }

  try {
    const { data, error } = await supabase
      .from("plans")
      .update({
        ...validation.data,
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[updatePlan] Error:", error);
      return { success: false, error: "Erro ao atualizar plano no banco de dados." };
    }

    return { success: true, data };
  } catch (err: any) {
    console.error("[updatePlan] Exception:", err);
    return { success: false, error: err.message };
  }
}

/**
 * @function togglePlanStatus
 * @description
 * Altera status do plano para arquivado ou ativo.
 * 
 * @param {string} id - UUID do plano.
 * @param {string} status - Novo status ('active', 'archived', 'draft').
 * @returns {Promise<{success: boolean, data?: any, error?: string}>} Status da alteração.
 */
export async function togglePlanStatus(id: string, status: "active" | "archived" | "draft") {
  const supabase = await createClient();
  try {
    const { data, error } = await supabase
      .from("plans")
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[togglePlanStatus] Error:", error);
      return { success: false, error: "Erro ao atualizar status do plano." };
    }

    return { success: true, data };
  } catch (err: any) {
    console.error("[togglePlanStatus] Exception:", err);
    return { success: false, error: err.message };
  }
}

/**
 * @function getPlans
 * @description
 * Recupera todos os planos cadastrados com seus respectivos templates de contrato hidratados.
 * 
 * @returns {Promise<any[]>} Lista de planos cadastrados.
 */
export async function getPlans() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("plans")
    .select("*, contract_templates(title)")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[getPlans] Error:", error);
    return [];
  }
  return data;
}

/**
 * @function sellContract
 * @description
 * Registra a venda/vínculo de um Plano a um Aluno (Gerando a Assinatura do Aluno).
 * Executa o cálculo automático de término do contrato baseado no ciclo de cobrança (billing_cycle).
 * 
 * @utc_enforcement
 * Fixa a hora da data de início em meio-dia UTC para evitar shift de fuso horário local.
 * 
 * @param {string} studentId - UUID do aluno.
 * @param {string} planId - UUID do plano comercial.
 * @param {string} startDate - Data de início do plano (YYYY-MM-DD).
 * @returns {Promise<{success: boolean, data?: any, error?: string}>} Confirmação da venda.
 */
export async function sellContract(studentId: string, planId: string, startDate: string) {
  const supabase = await createClient();

  // Buscar detalhes do plano para calcular a data final se aplicável
  const { data: plan, error: planError } = await supabase
    .from("plans")
    .select("*")
    .eq("id", planId)
    .single();

  if (planError || !plan) {
    return { success: false, error: "Plano selecionado não foi encontrado." };
  }

  // 1. Determinar se há pró-rata (apenas para regras de faturamento fixed_day com dia definido)
  let isProRata = false;
  let proRataDays = 0;
  let proRataPrice = 0;
  let billingStartDate = startDate;

  if (plan.billing_due_rule === "fixed_day" && plan.billing_fixed_day) {
    const proRataData = calculateProRata(
      parseFloat(plan.price as any) || 0,
      startDate,
      plan.billing_fixed_day
    );
    if (proRataData.proRataDays > 0) {
      isProRata = true;
      proRataDays = proRataData.proRataDays;
      proRataPrice = proRataData.proRataPrice;
      billingStartDate = proRataData.contractStartDate; // A vigência do primeiro ciclo cheio inicia do dia fixado
    }
  }

  // Calcular a data de término (end_date)
  // UTC Enforcement: Fixa o processamento estável do dia
  const start = new Date(billingStartDate + "T12:00:00Z");
  let end: Date | null = new Date(start.getTime());
  const targetDay = start.getUTCDate();

  /**
   * Lógica de Duração Dinâmica do Contrato:
   * 1. Se há período de fidelidade (loyalty_period_months > 0), usar como duração.
   * 2. Senão, calcular a duração total: meses do ciclo × número de parcelas (installments).
   * 3. Planos avulsos (one_time) não possuem data final.
   *
   * Isso corrige o bug onde planos com billing_cycle="monthly" mas installments=12
   * (ex: Elite Anual Recorrente) geravam contratos de apenas 1 mês.
   */
  const loyaltyMonths = (plan as any).loyalty_period_months || 0;
  const installmentsCount = (plan as any).installments || 1;

  // Mapeia o ciclo de cobrança para meses
  const CYCLE_MONTHS: Record<string, number> = {
    monthly: 1,
    quarterly: 3,
    semiannual: 6,
    annual: 12
  };
  const cycleMonths = CYCLE_MONTHS[plan.billing_cycle] || 0;

  if (cycleMonths === 0) {
    // Avulso / One-time: sem data de término
    end = null;
  } else {
    // Prioridade: fidelidade > (ciclo × parcelas)
    const totalMonths = loyaltyMonths > 0
      ? loyaltyMonths
      : cycleMonths * installmentsCount;

    end.setUTCMonth(end.getUTCMonth() + totalMonths);

    // Se o rollover jogou a data para o mês seguinte (ex: 31 de Jan + 1 mês virou Março)
    // Ajustamos a data para o último dia do mês correto.
    if (end.getUTCDate() !== targetDay) {
      end.setUTCDate(0); // Ajusta para o último dia do mês anterior (Fevereiro, etc.)
    }
  }

  const endDate = end ? end.toISOString().split("T")[0] : null;

  try {
    // 2. Registrar o Contrato do Aluno
    const { data: contract, error: contractError } = await supabase
      .from("student_contracts")
      .insert({
        student_id: studentId,
        plan_id: planId,
        status: "active",
        start_date: startDate, // Liberação imediata a partir da data de matrícula
        end_date: endDate,
        accepted_at: new Date().toISOString(),
        plan_snapshot: plan // 🛡️ O COFRE DA MATRÍCULA: Fotografa as regras comerciais
      })
      .select()
      .single();

    if (contractError) {
      console.error("[sellContract] Error inserting contract:", contractError);
      return { success: false, error: "Erro ao registrar venda do contrato." };
    }

    // 3. Gerar Faturas Financeiras
    const invoicesToCreate = [];
    const setupFeeNum = parseFloat(plan.setup_fee as any) || 0;
    const priceNum = parseFloat(plan.price as any) || 0;

    if (isProRata) {
      // Fatura 1: Taxa de Adesão + Pró-rata parcial (devido hoje no ato)
      invoicesToCreate.push({
        student_id: studentId,
        contract_id: contract.id,
        title: `Taxa Adesão + Pró-rata (Matrícula) - ${plan.name}`,
        amount: setupFeeNum + proRataPrice,
        due_date: startDate,
        status: "pending"
      });

      // Fatura 2: Primeira mensalidade cheia (vencendo no dia fixado)
      invoicesToCreate.push({
        student_id: studentId,
        contract_id: contract.id,
        title: `Mensalidade (1º Ciclo) - ${plan.name}`,
        amount: priceNum,
        due_date: billingStartDate,
        status: "pending"
      });
    } else {
      // Fatura Única Inicial: Adesão + Primeira mensalidade cheia
      invoicesToCreate.push({
        student_id: studentId,
        contract_id: contract.id,
        title: `Matrícula + Mensalidade - ${plan.name}`,
        amount: setupFeeNum + priceNum,
        due_date: startDate,
        status: "pending"
      });
    }

    const { error: invoiceError } = await supabase
      .from("invoices")
      .insert(invoicesToCreate);

    if (invoiceError) {
      console.error("[sellContract] Error inserting invoices:", invoiceError);
      // Retornamos sucesso no contrato, porém alertamos sobre a falha no faturamento
      return { 
        success: true, 
        data: contract, 
        warning: "Contrato registrado, mas ocorreu um erro ao gerar faturas." 
      };
    }

    return { success: true, data: contract };
  } catch (err: any) {
    console.error("[sellContract] Exception:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Ferramenta Avançada: Reajuste Granular (Planos e Contratos)
 * 
 * Permite reajustar contratos baseados em escopos específicos:
 * - "plan": Todos os contratos ativos vinculados a um plano.
 * - "individual": Um contrato específico de um aluno.
 * - "date": Contratos iniciados antes de uma safra (data específica).
 */
export async function granularContractPriceAdjustment(formData: FormData) {
  const supabase = await createClient();

  const scope = formData.get("scope") as "plan" | "individual" | "date";
  const adjustmentType = formData.get("adjustment_type") as "percent" | "fixed";
  const adjustmentValue = parseFloat(formData.get("adjustment_value") as string);
  
  const targetPlanId = formData.get("target_plan_id") as string;
  const targetStudentId = formData.get("target_student_id") as string;
  const targetDate = formData.get("target_date") as string;
  const updatePlanBasePrice = formData.get("update_plan_base") === "true"; // Apenas p/ scope='plan'

  if (isNaN(adjustmentValue) || adjustmentValue <= 0) {
    return { success: false, error: "Valor de reajuste inválido." };
  }

  try {
    let contractsQuery = supabase.from("student_contracts").select("id, plan_snapshot, student_id").eq("status", "active");

    if (scope === "individual") {
      if (!targetStudentId) return { success: false, error: "Aluno não selecionado." };
      contractsQuery = contractsQuery.eq("student_id", targetStudentId);
    } else if (scope === "date") {
      if (!targetDate) return { success: false, error: "Data limite não fornecida." };
      contractsQuery = contractsQuery.lte("start_date", targetDate);
      if (targetPlanId) {
         // Opcional: filtrar por plano também dentro da safra (Faremos no JS abaixo)
      }
    } else if (scope === "plan") {
      if (!targetPlanId) return { success: false, error: "Plano não selecionado." };
    }

    const { data: contracts, error: fetchError } = await contractsQuery;
    
    if (fetchError) {
      return { success: false, error: "Erro ao buscar contratos: " + fetchError.message };
    }

    let updatedCount = 0;
    
    if (contracts) {
      for (const contract of contracts) {
        const snap = contract.plan_snapshot as any;
        if (!snap) continue;

        // Se o filtro for por plano (em qualquer escopo), aplicar.
        if ((scope === "plan" || (scope === "date" && targetPlanId)) && snap.id !== targetPlanId) {
           continue;
        }

        const currentPrice = parseFloat(snap.price || 0);
        if (currentPrice <= 0) continue;

        let newPrice = currentPrice;
        if (adjustmentType === "percent") {
          newPrice = currentPrice * (1 + (adjustmentValue / 100));
        } else {
          newPrice = currentPrice + adjustmentValue;
        }
        newPrice = Math.round(newPrice * 100) / 100;

        const updatedSnap = { ...snap, price: newPrice };
        await supabase
          .from("student_contracts")
          .update({ plan_snapshot: updatedSnap })
          .eq("id", contract.id);
          
        updatedCount++;
      }
    }

    // Se o escopo for o plano inteiro, temos a opção de mudar o preço "Mestre" do plano para as novas vendas também.
    if (scope === "plan" && targetPlanId && updatePlanBasePrice) {
       // Buscar o preco atual mestre
       const { data: mPlan } = await supabase.from("plans").select("price").eq("id", targetPlanId).single();
       if (mPlan) {
          const mPrice = parseFloat(mPlan.price);
          let newMPrice = mPrice;
          if (adjustmentType === "percent") newMPrice = mPrice * (1 + (adjustmentValue / 100));
          else newMPrice = mPrice + adjustmentValue;
          
          await supabase.from("plans").update({ price: Math.round(newMPrice * 100) / 100 }).eq("id", targetPlanId);
       }
    }

    return { 
      success: true, 
      message: `${updatedCount} contratos ativos foram reajustados com sucesso.`
    };

  } catch (err: any) {
    console.error("[granularContractPriceAdjustment] Exception:", err);
    return { success: false, error: err.message };
  }
}

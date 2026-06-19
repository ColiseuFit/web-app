const { createClient } = require("@supabase/supabase-js");
const path = require("path");

try {
  require("dotenv").config({ path: path.resolve(__dirname, "../.env.local") });
} catch (e) {}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing env vars");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedPlans() {
  console.log("=== Semeando Planos Comerciais da Academia Coliseu ===");

  // 1. Buscar modelos de contratos existentes para obter seus IDs
  const { data: templates, error: templateError } = await supabase
    .from("contract_templates")
    .select("id, title");

  if (templateError || !templates) {
    console.error("Erro ao carregar modelos de contratos:", templateError);
    process.exit(1);
  }

  const findTemplateId = (nameSnippet) => {
    const t = templates.find(temp => temp.title.toLowerCase().includes(nameSnippet.toLowerCase()));
    return t ? t.id : null;
  };

  const eliteTemplateId = findTemplateId("ELITE");
  const goldTemplateId = findTemplateId("GOLD");
  const flexTemplateId = findTemplateId("FLEX");
  const smartTemplateId = findTemplateId("SMART");
  const vipTemplateId = findTemplateId("VIP");
  const gympassTemplateId = findTemplateId("Gympass");
  const diariaTemplateId = findTemplateId("Diária");

  // 2. Definir a matriz de planos comerciais baseada na Tabela Coliseu A4
  const plansToSeed = [
    // --- PLANO ELITE (Anual Recorrente) ---
    {
      name: "Elite 5x (Anual Recorrente)",
      status: "active",
      access_type_id: "club",
      online_sale: true,
      price: 209.90,
      setup_fee: 0.00,
      billing_cycle: "monthly",
      billing_due_rule: "purchase_day",
      accepted_payment_methods: ["credit_card_recurrent"],
      installments: 12,
      auto_renew: true,
      checkins_per_week: 5,
      limit_checkins_per_day: 1,
      contract_template_id: eliteTemplateId
    },
    {
      name: "Elite 3x (Anual Recorrente)",
      status: "active",
      access_type_id: "club",
      online_sale: true,
      price: 189.90,
      setup_fee: 0.00,
      billing_cycle: "monthly",
      billing_due_rule: "purchase_day",
      accepted_payment_methods: ["credit_card_recurrent"],
      installments: 12,
      auto_renew: true,
      checkins_per_week: 3,
      limit_checkins_per_day: 1,
      contract_template_id: eliteTemplateId
    },
    {
      name: "Elite 2x (Anual Recorrente)",
      status: "active",
      access_type_id: "club",
      online_sale: true,
      price: 169.90,
      setup_fee: 0.00,
      billing_cycle: "monthly",
      billing_due_rule: "purchase_day",
      accepted_payment_methods: ["credit_card_recurrent"],
      installments: 12,
      auto_renew: true,
      checkins_per_week: 2,
      limit_checkins_per_day: 1,
      contract_template_id: eliteTemplateId
    },

    // --- PLANO GOLD (Fidelidade à Vista / Parcelado) ---
    {
      name: "Gold 5x (Anual à Vista)",
      status: "active",
      access_type_id: "club",
      online_sale: true,
      price: 189.90, // Valor mensal equivalente
      setup_fee: 0.00,
      billing_cycle: "annual",
      billing_due_rule: "purchase_day",
      accepted_payment_methods: ["pix", "credit_card"],
      installments: 12,
      auto_renew: false,
      checkins_per_week: 5,
      limit_checkins_per_day: 1,
      contract_template_id: goldTemplateId
    },
    {
      name: "Gold 3x (Anual à Vista)",
      status: "active",
      access_type_id: "club",
      online_sale: true,
      price: 169.90, // Valor mensal equivalente
      setup_fee: 0.00,
      billing_cycle: "annual",
      billing_due_rule: "purchase_day",
      accepted_payment_methods: ["pix", "credit_card"],
      installments: 12,
      auto_renew: false,
      checkins_per_week: 3,
      limit_checkins_per_day: 1,
      contract_template_id: goldTemplateId
    },
    {
      name: "Gold 2x (Anual à Vista)",
      status: "active",
      access_type_id: "club",
      online_sale: true,
      price: 149.90, // Valor mensal equivalente
      setup_fee: 0.00,
      billing_cycle: "annual",
      billing_due_rule: "purchase_day",
      accepted_payment_methods: ["pix", "credit_card"],
      installments: 12,
      auto_renew: false,
      checkins_per_week: 2,
      limit_checkins_per_day: 1,
      contract_template_id: goldTemplateId
    },

    // --- PLANO FLEX (Mensal Recorrente - Sem Fidelidade) ---
    {
      name: "Flex 5x (Recorrente)",
      status: "active",
      access_type_id: "club",
      online_sale: true,
      price: 239.90,
      setup_fee: 0.00,
      billing_cycle: "monthly",
      billing_due_rule: "purchase_day",
      accepted_payment_methods: ["credit_card_recurrent"],
      installments: 1,
      auto_renew: true,
      checkins_per_week: 5,
      limit_checkins_per_day: 1,
      contract_template_id: flexTemplateId
    },
    {
      name: "Flex 3x (Recorrente)",
      status: "active",
      access_type_id: "club",
      online_sale: true,
      price: 209.90,
      setup_fee: 0.00,
      billing_cycle: "monthly",
      billing_due_rule: "purchase_day",
      accepted_payment_methods: ["credit_card_recurrent"],
      installments: 1,
      auto_renew: true,
      checkins_per_week: 3,
      limit_checkins_per_day: 1,
      contract_template_id: flexTemplateId
    },
    {
      name: "Flex 2x (Recorrente)",
      status: "active",
      access_type_id: "club",
      online_sale: true,
      price: 189.90,
      setup_fee: 0.00,
      billing_cycle: "monthly",
      billing_due_rule: "purchase_day",
      accepted_payment_methods: ["credit_card_recurrent"],
      installments: 1,
      auto_renew: true,
      checkins_per_week: 2,
      limit_checkins_per_day: 1,
      contract_template_id: flexTemplateId
    },

    // --- PLANO SMART (Mensal Avulso - Sem Recorrência) ---
    {
      name: "Smart 5x (Mensal Avulso)",
      status: "active",
      access_type_id: "club",
      online_sale: true,
      price: 269.90,
      setup_fee: 0.00,
      billing_cycle: "one_time",
      billing_due_rule: "purchase_day",
      accepted_payment_methods: ["pix", "credit_card", "cash"],
      installments: 1,
      auto_renew: false,
      checkins_per_week: 5,
      limit_checkins_per_day: 1,
      contract_template_id: smartTemplateId
    },
    {
      name: "Smart 3x (Mensal Avulso)",
      status: "active",
      access_type_id: "club",
      online_sale: true,
      price: 239.90,
      setup_fee: 0.00,
      billing_cycle: "one_time",
      billing_due_rule: "purchase_day",
      accepted_payment_methods: ["pix", "credit_card", "cash"],
      installments: 1,
      auto_renew: false,
      checkins_per_week: 3,
      limit_checkins_per_day: 1,
      contract_template_id: smartTemplateId
    },
    {
      name: "Smart 2x (Mensal Avulso)",
      status: "active",
      access_type_id: "club",
      online_sale: true,
      price: 209.90,
      setup_fee: 0.00,
      billing_cycle: "one_time",
      billing_due_rule: "purchase_day",
      accepted_payment_methods: ["pix", "credit_card", "cash"],
      installments: 1,
      auto_renew: false,
      checkins_per_week: 2,
      limit_checkins_per_day: 1,
      contract_template_id: smartTemplateId
    },

    // --- PLANOS ESPECIAIS ---
    {
      name: "VIP / Parceria Coliseu",
      status: "active",
      access_type_id: "club",
      online_sale: false,
      price: 0.00,
      setup_fee: 0.00,
      billing_cycle: "monthly",
      billing_due_rule: "purchase_day",
      accepted_payment_methods: ["cash"],
      installments: 1,
      auto_renew: true,
      checkins_per_week: null, // Ilimitado
      limit_checkins_per_day: 1,
      contract_template_id: vipTemplateId
    },
    {
      name: "Passe Corporativo Wellhub (Gympass)",
      status: "active",
      access_type_id: "club_pass",
      online_sale: false,
      price: 0.00, // Validação de repasse externa
      setup_fee: 0.00,
      billing_cycle: "monthly",
      billing_due_rule: "purchase_day",
      accepted_payment_methods: ["cash"],
      installments: 1,
      auto_renew: true,
      checkins_per_week: 7, // Limite correspondente a 1 check-in diário
      limit_checkins_per_day: 1,
      contract_template_id: gympassTemplateId
    },
    {
      name: "Diária / Drop-in Visitante",
      status: "active",
      access_type_id: "club",
      online_sale: true,
      price: 40.00, // Preço padrão da diária
      setup_fee: 0.00,
      billing_cycle: "one_time",
      billing_due_rule: "purchase_day",
      accepted_payment_methods: ["pix", "credit_card", "cash"],
      installments: 1,
      auto_renew: false,
      checkins_per_week: 1,
      limit_checkins_per_day: 1,
      contract_template_id: diariaTemplateId
    }
  ];

  // 3. Buscar planos existentes para evitar duplicados
  const { data: existingPlans, error: plansError } = await supabase
    .from("plans")
    .select("id, name");

  if (plansError) {
    console.error("Erro ao buscar planos comerciais existentes:", plansError);
    process.exit(1);
  }

  const existingPlansMap = new Map(existingPlans.map(p => [p.name.toLowerCase(), p.id]));

  for (const plan of plansToSeed) {
    const existingId = existingPlansMap.get(plan.name.toLowerCase());

    if (existingId) {
      console.log(`[ATUALIZANDO PLANO] "${plan.name}" (ID: ${existingId})`);
      const { error: updateError } = await supabase
        .from("plans")
        .update({
          ...plan,
          updated_at: new Date().toISOString()
        })
        .eq("id", existingId);

      if (updateError) {
        console.error(`Erro ao atualizar plano "${plan.name}":`, updateError);
      } else {
        console.log(`Sucesso ao atualizar plano "${plan.name}".`);
      }
    } else {
      console.log(`[INSERINDO PLANO] "${plan.name}"`);
      const { data: insertData, error: insertError } = await supabase
        .from("plans")
        .insert(plan)
        .select();

      if (insertError) {
        console.error(`Erro ao inserir plano "${plan.name}":`, insertError);
      } else {
        console.log(`Sucesso ao inserir plano "${plan.name}" (ID: ${insertData[0].id}).`);
      }
    }
  }

  console.log("=== Semeação de planos comerciais concluída com sucesso! ===");
}

seedPlans();

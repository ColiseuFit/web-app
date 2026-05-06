const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTestSession() {
    console.log("Iniciando criação de sessão de teste...");

    // 1. Buscar um template existente ou criar um novo para o teste
    let templateId;
    const { data: templates } = await supabase.from('running_templates').select('id, title').limit(1);
    
    if (templates && templates.length > 0) {
        templateId = templates[0].id;
        console.log(`Usando template existente: ${templates[0].title} (${templateId})`);
    } else {
        const { data: newTemplate, error: tError } = await supabase.from('running_templates').insert({
            title: "Template de Teste - Iniciantes",
            description: "Template para validar sessões estruturadas",
            level_tag: "beginner",
            frequency_per_week: 3,
            duration_weeks: 4
        }).select().single();
        
        if (tError) throw tError;
        templateId = newTemplate.id;
        console.log(`Novo template criado: ${newTemplate.title}`);
    }

    // 2. Definir os blocos da sessão iniciante
    const weekNumber = 1;
    const sessionOrder = 1;
    const blocks = [
        {
            template_id: templateId,
            week_number: weekNumber,
            session_order: sessionOrder,
            block_order: 1,
            target_description: "Aquecimento: Caminhada rápida",
            target_distance_km: null,
            target_pace_description: null,
            target_rest_time_description: null
        },
        {
            template_id: templateId,
            week_number: weekNumber,
            session_order: sessionOrder,
            block_order: 2,
            target_description: "Principal: Alternar 2' Corrida / 1' Caminhada",
            target_distance_km: 3.0,
            target_pace_description: "07:30/km",
            target_rest_time_description: null
        },
        {
            template_id: templateId,
            week_number: weekNumber,
            session_order: sessionOrder,
            block_order: 3,
            target_description: "Mantenha o foco na postura e respiração constante.",
            target_distance_km: null,
            target_pace_description: null,
            target_rest_time_description: null
        },
        {
            template_id: templateId,
            week_number: weekNumber,
            session_order: sessionOrder,
            block_order: 4,
            target_description: "Desaquecimento: Caminhada leve",
            target_distance_km: 1.0,
            target_pace_description: null,
            target_rest_time_description: null
        }
    ];

    console.log(`Inserindo ${blocks.length} blocos na Semana ${weekNumber}, Sessão ${sessionOrder}...`);

    const { data: inserted, error: iError } = await supabase.from('running_template_workouts').insert(blocks).select();

    if (iError) {
        console.error("Erro ao inserir blocos:", iError);
    } else {
        console.log("Sessão criada com sucesso!");
        console.log(inserted);
    }
}

createTestSession();

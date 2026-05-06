const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function createSingleBlockTest() {
    console.log("Criando sessão única para teste iniciante...");

    const { data: templates } = await supabase.from('running_templates').select('id').eq('title', 'Template de Teste - Iniciantes').single();
    
    if (!templates) {
        console.log("Template de teste não encontrado.");
        return;
    }

    const block = {
        template_id: templates.id,
        week_number: 1,
        session_order: 1,
        target_description: "Iniciante 1: 5' Aquec. + 20' Corrida Leve (Pace 07:30) + 5' Caminhada.",
        target_distance_km: 3.5,
        target_pace_description: "07:30/km"
    };

    const { data, error } = await supabase.from('running_template_workouts').insert(block).select();
    
    if (error) {
        console.error("Erro ao criar sessão:", error);
    } else {
        console.log("Sessão criada com sucesso!");
        console.log(data);
    }
}

createSingleBlockTest();

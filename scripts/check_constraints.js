const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrate() {
    console.log("Iniciando migração para suportar múltiplos blocos por sessão...");

    try {
        // Como não temos acesso direto ao psql para ALTER TABLE facilmente via JS SDK (sem RPC),
        // vamos tentar usar uma estratégia alternativa ou sugerir a mudança.
        // No Supabase, geralmente usamos o SQL Editor.
        
        // No entanto, posso tentar rodar um SQL arbitrário via RPC se houver uma função para isso,
        // mas normalmente não há por segurança.
        
        console.log("Nota: A tabela 'running_template_workouts' possui uma restrição UNIQUE(template_id, week_number, session_order).");
        console.log("Para suportar múltiplos blocos, precisamos adicionar 'block_order' e atualizar a constraint.");
        
        /* 
        SQL NECESSÁRIO:
        ALTER TABLE public.running_template_workouts ADD COLUMN block_order INTEGER DEFAULT 1;
        ALTER TABLE public.running_template_workouts DROP CONSTRAINT running_template_workouts_template_id_week_number_session_o_key;
        ALTER TABLE public.running_template_workouts ADD CONSTRAINT running_template_workouts_multi_block_key UNIQUE(template_id, week_number, session_order, block_order);
        */

        console.log("Tentando criar a sessão de teste usando ordens de sessão diferentes (1, 2, 3, 4) como solução temporária para o teste...");
        
        // 1. Buscar um template
        const { data: templates } = await supabase.from('running_templates').select('id, title').limit(1);
        const templateId = templates[0].id;

        const weekNumber = 1;
        const sessionOrder = 100; // Usando uma ordem alta para evitar conflitos no teste
        
        const blocks = [
            {
                template_id: templateId,
                week_number: weekNumber,
                session_order: sessionOrder,
                target_description: "TESTE: Aquecimento (Iniciante)",
                target_distance_km: 1.0,
                target_pace_description: "08:00/km"
            }
        ];

        const { data, error } = await supabase.from('running_template_workouts').insert(blocks).select();
        
        if (error) {
            console.error("Erro no teste simplificado:", error);
        } else {
            console.log("Bloco único criado com sucesso para o teste!");
            console.log(data);
        }

    } catch (e) {
        console.error(e);
    }
}

migrate();

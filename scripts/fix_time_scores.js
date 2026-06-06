const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Erro: NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não definidos em .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Iniciando auditoria e higienização de scores de tempo corrompidos...");

  try {
    // 1. Buscar check-ins que possuem score preenchido
    const { data: checkIns, error } = await supabase
      .from('check_ins')
      .select(`
        id,
        result,
        student_id,
        wod_id,
        wods (
          title,
          result_type,
          date
        ),
        profiles:student_id (
          display_name,
          full_name
        )
      `)
      .not('result', 'is', null);

    if (error) {
      throw error;
    }

    console.log(`Encontrados ${checkIns.length} check-ins com resultado preenchido.`);

    let invalidCount = 0;
    const toUpdate = [];

    for (const checkIn of checkIns) {
      const wod = Array.isArray(checkIn.wods) ? checkIn.wods[0] : checkIn.wods;
      if (!wod) continue;

      const resultType = (wod.result_type || '').toLowerCase();
      const resultVal = checkIn.result || '';

      // Verifica se o WOD é do tipo time/tempo
      if (resultType.includes('time') || resultType.includes('tempo')) {
        // Formato inválido se não contiver o caractere ':'
        if (!resultVal.includes(':')) {
          const studentName = checkIn.profiles?.display_name || checkIn.profiles?.full_name || 'Aluno Desconhecido';
          console.log(`[Inválido] ID: ${checkIn.id} | Aluno: ${studentName} | Treino: ${wod.title} (${wod.date}) | Tipo: ${wod.result_type} | Valor: "${resultVal}"`);
          
          toUpdate.push({
            id: checkIn.id,
            studentName,
            wodTitle: wod.title,
            wodDate: wod.date,
            val: resultVal
          });
          invalidCount++;
        }
      }
    }

    console.log(`\nTotal de scores de tempo inválidos detectados: ${invalidCount}`);
    console.log(`Total a serem corrigidos (limpos): ${toUpdate.length}`);

    if (toUpdate.length > 0) {
      console.log("\nLimpando registros inválidos no banco de dados para restaurar a integridade do ranking...");
      
      for (const item of toUpdate) {
        const { error: updateError } = await supabase
          .from('check_ins')
          .update({ 
            result: null, 
            performance_level: null, 
            is_excellence: false 
          })
          .eq('id', item.id);

        if (updateError) {
          console.error(`Erro ao limpar checkin ${item.id}:`, updateError.message);
        } else {
          console.log(`Registro ${item.id} (${item.studentName} - ${item.val}) corrigido com sucesso.`);
        }
      }
      console.log("\nHigienização concluída com sucesso.");
    } else {
      console.log("\nNenhum registro corrompido detectado para correção.");
    }

  } catch (err) {
    console.error("Erro inesperado na execução do script:", err);
  }
}

run();

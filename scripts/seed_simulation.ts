import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function seed() {
  const email = 'aluno.teste@coliseu.com';
  const password = 'Coliseu123!';
  const fullName = 'Aluno Teste';

  console.log('--- Iniciando Seed de Simulação ---');

  // 1. Criar Usuário Auth
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError && authError.message !== 'User already registered') {
    console.error('Erro ao criar usuário:', authError.message);
    return;
  }

  const userId = authData.user?.id || (await supabase.from('profiles').select('id').eq('full_name', fullName).single()).data?.id;

  if (!userId) {
    console.error('Falha ao obter ID do usuário.');
    return;
  }

  // 2. Upsert Profile
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      full_name: fullName,
      level: 'iniciante',
      xp_balance: 0,
      xp_total: 0
    });

  if (profileError) {
    console.error('Erro ao criar perfil:', profileError.message);
    return;
  }

  // 3. Atribuir Role 'student'
  const { error: roleError } = await supabase
    .from('user_roles')
    .upsert({
      user_id: userId,
      role: 'student'
    }, { onConflict: 'user_id' });

  if (roleError) {
    console.error('Erro ao atribuir role:', roleError.message);
    return;
  }

  console.log('--- Seed Concluído com Sucesso ---');
  console.log(`Email: ${email} | Senha: ${password}`);
}

seed();

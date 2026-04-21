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

async function createTestUser() {
  const email = 'alunoteste@coliseufit.com';
  const password = 'coliseu123';
  const fullName = 'Aluno Teste';

  console.log('--- Iniciando Criação de Perfil de Teste ---');

  // 1. Criar Usuário Auth
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError) {
    if (authError.message === 'User already registered') {
       console.log('Usuário já registrado no Auth. Prosseguindo para upsert do perfil...');
    } else {
       console.error('Erro ao criar usuário no Auth:', authError.message);
       return;
    }
  }

  // Obter o ID do usuário (seja do novo ou do existente)
  let userId = authData.user?.id;
  
  if (!userId) {
    const { data: existingUser } = await supabase.auth.admin.listUsers();
    userId = existingUser.users.find(u => u.email === email)?.id;
  }

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
      email: email,
      level: 'Iniciante',
      membership_type: 'club'
    });

  if (profileError) {
    console.error('Erro ao criar/atualizar perfil:', profileError.message);
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

  console.log('\x1b[32m%s\x1b[0m', '--- Perfil de Teste Criado com Sucesso ---');
  console.log(`Nome: ${fullName}`);
  console.log(`Email: ${email}`);
  console.log(`Senha: ${password}`);
}

createTestUser();

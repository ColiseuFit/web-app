const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Manual env parsing
const envPath = path.resolve(process.cwd(), '.env.local');
if (!fs.existsSync(envPath)) {
  console.error('Erro: Arquivo .env.local não encontrado.');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...value] = line.split('=');
  if (key && value.length > 0) {
    env[key.trim()] = value.join('=').trim();
  }
});

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseServiceKey = env['SUPABASE_SERVICE_ROLE_KEY'];

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Erro: Variáveis de ambiente Supabase não encontradas no .env.local.');
  process.exit(1);
}

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

  console.log('--- Iniciando Seed de Simulação (V2 - Schema Fixed) ---');

  // 1. Criar Usuário Auth
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  let userId;
  if (authError) {
    if (authError.message.includes('already registered')) {
      console.log('Usuário já existe no Auth. Recuperando ID...');
      // Tentamos buscar pelo email via admin list se possível, ou pelo profile
      const { data: listData } = await supabase.auth.admin.listUsers();
      const existingUser = listData.users.find(u => u.email === email);
      userId = existingUser?.id;
    } else {
      console.error('Erro ao criar usuário:', authError.message);
      return;
    }
  } else {
    userId = authData.user.id;
  }

  if (!userId) {
    console.error('Falha ao obter ID do usuário.');
    return;
  }

  // 2. Upsert Profile (Usando apenas colunas existentes: xp_balance)
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      full_name: fullName,
      level: 'Iniciante',
      xp_balance: 0
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
  console.log(`Email: ${email} | Senha: ${password} | ID: ${userId}`);
}

seed();

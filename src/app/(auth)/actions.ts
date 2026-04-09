"use server";

import { loginSchema, updatePasswordSchema, forgotPasswordSchema } from "@/lib/validations/security_schemas";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

/**
 * Autentica um usuário utilizando o provedor Email/Password do Supabase.
 * 
 * @security
 * - Baseia-se no Supabase Auth (GoTrue). A sessão do usuário é gerenciada via cookies seguros.
 * - Esta ação roda inteiramente no servidor para prevenir vazamento de credenciais.
 * - Validação obrigatória via Zod `loginSchema` para sanitização de inputs.
 * 
 * @param {FormData} formData - Dados brutos do formulário contendo `email` e `password`.
 * @returns {Promise<{error: string} | void>} Retorna um objeto de erro ou redireciona para o dashboard em caso de sucesso.
 * @throws {Redirect} Redireciona para /dashboard após autenticação bem-sucedida.
 */
export async function login(formData: FormData) {
  const rawData = {
    email: formData.get("email"),
    password: formData.get("password"),
  };

  const validation = loginSchema.safeParse(rawData);
  if (!validation.success) {
    return { error: "Credenciais inválidas: " + validation.error.issues[0].message };
  }
  const { email, password } = validation.data;

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  redirect("/dashboard");
}

/**
 * Encerra a sessão ativa do usuário e limpa os cookies de autenticação.
 * 
 * @security
 * - Garante que o cookie de sessão seja destruído no lado do servidor.
 * - Invalida o JWT no Supabase Auth.
 * 
 * @returns {Promise<void>} Redireciona para a página de login após o logout.
 * @throws {Redirect} Redireciona para /login.
 */
export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

import { preRegistrationSchema } from "@/lib/validations/security_schemas";

/**
 * Cria um pré-cadastro (Lead) a partir do fluxo de onboarding público.
 * 
 * @security
 * - Roda no lado do servidor para garantir segurança.
 * - Validação obrigatória via Zod `preRegistrationSchema`.
 * - Como é público, não requer sessão, e explora a política de RLS que permite insert anônimo.
 */
export async function createPreRegistration(formData: FormData) {
  const rawData = {
    full_name: formData.get("full_name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    cpf: formData.get("cpf") || undefined,
    birth_date: formData.get("birth_date") || undefined,
    bio: formData.get("bio") || undefined,
  };

  const validation = preRegistrationSchema.safeParse(rawData);
  if (!validation.success) {
    return { error: "Dados inválidos: " + validation.error.issues[0].message };
  }

  const dataToInsert = validation.data;
  
  // Clean empty strings for optional dates
  if (dataToInsert.birth_date === "") {
    delete dataToInsert.birth_date;
  }

  const supabase = await createClient();

  // --- Verificação de Duplicidade (Email/CPF) ---
  // 1. Checar se já existe como Aluno Ativo
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id")
    .or(`email.eq.${dataToInsert.email}${dataToInsert.cpf ? `,cpf.eq.${dataToInsert.cpf}` : ""}`)
    .maybeSingle();

  if (existingProfile) {
    return { error: "Este cadastro já existe e está ativo. Tente fazer login." };
  }

  // 2. Checar se já existe como Lead Pendente
  const { data: existingLead } = await supabase
    .from("pre_registrations")
    .select("status")
    .or(`email.eq.${dataToInsert.email}${dataToInsert.cpf ? `,cpf.eq.${dataToInsert.cpf}` : ""}`)
    .eq("status", "pending")
    .maybeSingle();

  if (existingLead) {
    return { error: "Já recebemos sua solicitação! Aguarde o contato da nossa equipe." };
  }

  const { error } = await supabase
    .from("pre_registrations")
    .insert([
      {
        ...dataToInsert,
        status: "pending",
      }
    ]);

  if (error) {
    console.error("[createPreRegistration] Error:", error);
    return { error: "Erro ao criar pré-cadastro: " + error.message };
  }

  return { success: true };
}

/**
 * Define a senha inicial do usuário (Primeiro Acesso).
 * 
 * @security
 * - Requer que o usuário já tenha uma sessão ativa (proporcionada pelo callback do convite).
 * - Utiliza `updateUser` do Supabase para persistir a nova senha.
 * - Validação via `updatePasswordSchema`.
 */
export async function setupPassword(formData: FormData) {
  const password = formData.get("password") as string;
  const confirm_password = formData.get("confirm_password") as string;

  const validation = updatePasswordSchema.safeParse({ password, confirm_password });
  
  if (!validation.success) {
    return { error: validation.error.issues[0].message };
  }

  const supabase = await createClient();
  
  const { error } = await supabase.auth.updateUser({
    password: validation.data.password,
  });

  if (error) {
    return { error: "Erro ao definir senha: " + error.message };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function requestPasswordReset(email: string) {
  const validation = forgotPasswordSchema.safeParse({ email });
  if (!validation.success) {
    return { error: validation.error.issues[0].message };
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim().split(' ')[0];
  if (!serviceRoleKey || !process.env.RESEND_API_KEY) {
    console.error("ERRO: SUPABASE_SERVICE_ROLE_KEY ou RESEND_API_KEY ausente.");
    return { error: "Erro de configuração no servidor. Entre em contato com o suporte." };
  }

  // Usamos o Admin Client para gerar o Magic Link sem disparar o e-mail pelo Supabase
  const { createClient: createAdminClient } = await import("@supabase/supabase-js");
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  
  // 1. Gera o link de recuperação de senha autenticado
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.generateLink({
    type: 'recovery',
    email: email,
    options: {
      redirectTo: `${siteUrl}/auth/callback?next=/setup-password`,
    }
  });

  // Por segurança (evitar vazamento de quem é ou não usuário), falhamos silenciosamente para o frontend
  if (authError) {
    console.warn(`[requestPasswordReset] Ignorado: tentativa de recup. para email não existente (${email}). Erro:`, authError.message);
    return { success: true }; // Retornamos success para a UI manter o UX seguro
  }

  const actionLink = authData.properties.action_link;

  // 2. Dispara o e-mail moderno via Resend (replicando estética Neo-brutalista)
  try {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);

    // O actionLink já contém /auth/v1/verify e os tokens, ele trocará de sessão e redirecionará pro Next (/auth/callback)
    await resend.emails.send({
      from: 'Coliseu <onboarding@coliseufit.com>',
      to: email,
      subject: 'Redefinição de Senha - Coliseu Clube',
      html: `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Redefinição de Senha</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #000; background-color: #f4f4f5; margin: 0; padding: 0; }
    .wrapper { padding: 40px 20px; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 3px solid #000000; box-shadow: 8px 8px 0px #000000; }
    .header { background-color: #101010; color: #ffffff; padding: 35px 20px; text-align: center; border-bottom: 3px solid #000000; }
    .header img { height: 32px; display: block; margin: 0 auto; }
    .content { padding: 40px 30px; }
    .content h2 { font-size: 24px; font-weight: 800; margin-top: 0; margin-bottom: 25px; text-transform: uppercase; }
    .content p { font-size: 16px; margin-bottom: 20px; color: #18181b; }
    .cta-container { text-align: center; margin: 40px 0; }
    .cta-button { background-color: #000000; color: #ffffff !important; font-size: 16px; font-weight: 800; text-transform: uppercase; text-decoration: none; padding: 16px 32px; display: inline-block; border: 2px solid #000000; box-shadow: 4px 4px 0px rgba(0,0,0,0.3); }
    .footer { padding: 20px; background-color: #ffffff; border-top: 2px solid #000000; text-align: center; font-size: 13px; color: #71717a; font-weight: 500; }
    .footer a { color: #000000; text-decoration: underline; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h1 style="margin: 0; font-size: 24px;">COLISEU</h1>
      </div>
      <div class="content">
        <h2>SOLICITAÇÃO DE NOVA SENHA</h2>
        <p>Recebemos um pedido para alterar sua senha de acesso na plataforma da Arena dos Fortes.</p>
        <p>Clique no botão abaixo para definir sua nova credencial de segurança. <strong>Este link é válido por apenas 24 horas.</strong></p>
        <div class="cta-container">
          <a href="${actionLink}" class="cta-button">REDEFINIR SENHA</a>
        </div>
        <p style="font-weight: 700; margin-top: 30px; font-size: 14px; color: #52525b;">Se você não solicitou essa alteração, por favor ignore este email.</p>
      </div>
      <div class="footer">
        Se o botão não funcionar, cole este link no navegador:<br>
        <a href="${actionLink}">${actionLink}</a>
      </div>
    </div>
  </div>
</body>
</html>
      `
    });

  } catch (err: any) {
    console.error("[requestPasswordReset] Erro Resend:", err);
    return { error: "Não foi possível enviar o e-mail de recuperação no momento. Tente novamente." };
  }

  return { success: true };
}

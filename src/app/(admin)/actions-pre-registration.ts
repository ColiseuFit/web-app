"use server";

import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { Resend } from "resend";

/**
 * Converte um lead de pré-cadastro em uma conta completa de aluno.
 * 
 * @security
 * - Role Requirement: Apenas roles 'admin' ou 'reception' podem executar esta ação.
 * - RLS Bypass: Usa `SUPABASE_SERVICE_ROLE_KEY` para criar credencial e inserir linhas cruzadas.
 * 
 * @param {string} preRegistrationId - O UUID do lead de pré-cadastro.
 * @returns {Promise<{ success?: boolean; error?: string }>} Objeto indicando sucesso ou erro.
 */
export async function approvePreRegistration(preRegistrationId: string, customLevel?: string, membershipType: string = 'club') {
  const supabase = await createClient();
  const { data: { user: currentUser } } = await supabase.auth.getUser();
  if (!currentUser) return { error: "Sem sessão logada." };

  const { data: roleData } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", currentUser.id)
    .single();

  if (!roleData || (roleData.role !== "admin" && roleData.role !== "reception")) {
    return { error: "Acesso negado. Apenas Recepção ou Admin." };
  }

  // 1. Fetch the lead data
  const { data: lead, error: leadError } = await supabase
    .from("pre_registrations")
    .select("*")
    .eq("id", preRegistrationId)
    .single();

  if (leadError || !lead) {
    return { error: "Lead não encontrado." };
  }

  if (lead.status !== "pending") {
    return { error: "Este pré-cadastro já foi processado anteriormente." };
  }

  // 1.1 Extra check: See if this email is already in profiles
  const { data: existingUser } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", lead.email)
    .maybeSingle();

  if (existingUser) {
    return { error: "Este e-mail já possui um perfil de aluno ativo no sistema." };
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim().split(' ')[0];
  if (!serviceRoleKey) {
    return { error: "Erro: SUPABASE_SERVICE_ROLE_KEY não encontrada." };
  }

  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Extrair o primeiro nome para usar no email
  const firstName = lead.full_name.trim().split(" ")[0];

  // 2. Create Auth Invitation (Generates Link without sending email via Supabase)
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.generateLink({
    type: 'invite',
    email: lead.email,
    options: {
      data: {
        full_name: lead.full_name,
        first_name: firstName,
      },
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/confirm` 
    }
  });

  if (authError) {
    let errorMessage = "Erro ao gerar convite de acesso no Supabase Auth.";
    if (authError.message.includes("already been registered")) {
      errorMessage = "Este e-mail já possui uma conta no Auth do banco de dados (duplicado). Marcando o lead como rejeitado para não travar.";
      await supabaseAdmin.from("pre_registrations").update({ status: "rejected" }).eq("id", preRegistrationId);
    }
    return { error: errorMessage };
  }

  const userId = authData.user.id;
  const actionLink = authData.properties.action_link;

  // 3. Inserção SEQUENCIAL de Profile e Role (FK: user_roles.user_id -> profiles.id exige ordem)
  const nameParts = lead.full_name.trim().split(" ");
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : null;

  // Sanitização de campos opcionais/vazios para evitar quebra de restrições de unicidade (UNIQUE) e de formato (Date)
  const profileRes = await supabaseAdmin
    .from("profiles")
    .insert({
      id: userId,
      full_name: lead.full_name.trim(),
      email: lead.email.trim(),
      first_name: firstName || null,
      last_name: lastName || null,
      phone: lead.phone ? lead.phone.trim() : null,
      cpf: lead.cpf ? lead.cpf.trim() : null,
      birth_date: lead.birth_date || null,
      level: customLevel && customLevel !== "branco" ? customLevel : "iniciante",
      membership_type: membershipType || "club",
    });

  if (profileRes.error) {
    console.error("[approvePreRegistration] Erro ao criar profile:", profileRes.error);
    await supabaseAdmin.auth.admin.deleteUser(userId);
    return { error: `Erro ao criar perfil do aluno (${profileRes.error.message}). A transação foi revertida.` };
  }

  // Só insere o role APÓS o profile existir no banco (FK constraint)
  const roleRes = await supabaseAdmin
    .from("user_roles")
    .insert({
      user_id: userId,
      role: "student",
    });

  if (roleRes.error) {
    console.error("[approvePreRegistration] Erro ao atribuir role:", roleRes.error);
    // Rollback: remove profile e auth user para não deixar dados órfãos
    await supabaseAdmin.from("profiles").delete().eq("id", userId);
    await supabaseAdmin.auth.admin.deleteUser(userId);
    return { error: `Erro ao atribuir papel de aluno (${roleRes.error.message}). A transação foi revertida.` };
  }

  // 5. Marcar Pré-cadastro como Aprovado (SSoT: Movido para antes do e-mail para evitar inconsistência)
  const { error: updateError } = await supabaseAdmin
    .from("pre_registrations")
    .update({ 
      status: "approved"
    })
    .eq("id", preRegistrationId);

  if (updateError) {
    console.error("[approvePreRegistration] Lead Status Update Error:", updateError);
    return { error: "Erro ao atualizar status do pré-cadastro no banco de dados. A aprovação foi interrompida." };
  }

  // 6. Disparo de e-mail Anti-Bot via Resend
  let emailSent = false;
  try {
    if (!process.env.RESEND_API_KEY) {
      console.warn("AVISO: RESEND_API_KEY ausente. O convite não será enviado por e-mail.");
    } else {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const verifyUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/verify?link=${encodeURIComponent(actionLink)}`;

      await resend.emails.send({
        from: 'Coliseu <onboarding@coliseufit.com>',
        to: lead.email,
        subject: 'Bem-vindo ao Clube Coliseu!',
        html: `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bem-vindo(a) ao Coliseu</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #000000;
      background-color: #f4f4f5;
      margin: 0;
      padding: 0;
    }
    .wrapper { padding: 40px 20px; }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border: 3px solid #000000;
      box-shadow: 8px 8px 0px #000000;
    }
    .header {
      background-color: #101010;
      color: #ffffff;
      padding: 35px 20px;
      text-align: center;
      border-bottom: 3px solid #000000;
    }
    .header img {
      height: 32px;
      display: block;
      margin: 0 auto;
    }
    .content { padding: 40px 30px; }
    .content h2 {
      font-size: 24px;
      font-weight: 800;
      margin-top: 0;
      margin-bottom: 25px;
      text-transform: uppercase;
    }
    .content p { font-size: 16px; margin-bottom: 20px; color: #18181b; }
    .features-box {
      background-color: #f4f4f5;
      border: 2px solid #000000;
      padding: 20px;
      margin: 30px 0;
    }
    .features-box p { font-weight: 800; margin-top: 0; margin-bottom: 10px; text-transform: uppercase; }
    .features-box ul { margin: 0; padding-left: 20px; }
    .features-box li { margin-bottom: 8px; font-weight: 500; }
    .cta-container { text-align: center; margin: 40px 0; }
    .cta-button {
      background-color: #dc2626;
      color: #ffffff !important;
      font-size: 16px;
      font-weight: 800;
      text-transform: uppercase;
      text-decoration: none;
      padding: 16px 32px;
      display: inline-block;
      border: 2px solid #000000;
      box-shadow: 4px 4px 0px #000000;
    }
    .footer {
      padding: 20px;
      background-color: #ffffff;
      border-top: 2px solid #000000;
      text-align: center;
      font-size: 13px;
      color: #71717a;
      font-weight: 500;
    }
    .footer a { color: #000000; text-decoration: underline; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <img src="https://admin.coliseufit.com/logo-coliseu-white.svg" alt="COLISEU" />
      </div>
      <div class="content">
        <h2>FALA, ${firstName}! 🔥</h2>
        <p>Seu acesso ao app do <strong>Coliseu Clube</strong> já está pronto.</p>
        <p>Criamos esse espaço porque acreditamos na força da comunidade — e agora você faz oficialmente parte dela.</p>
        <div class="features-box">
          <p>O QUE VOCÊ VAI ENCONTRAR NO APP:</p>
          <ul>
            <li>Check-in em turmas e acompanhamento dos WODs.</li>
            <li>Registro dos pesos e recordes pessoais (PR).</li>
            <li>Seu histórico de atividades completo.</li>
          </ul>
        </div>
        <p>Para confirmar sua vaga, tudo o que você precisa fazer é definir a sua senha inicial.</p>
        <div class="cta-container">
          <a href="${verifyUrl}" class="cta-button">CRIAR SENHA DE ACESSO</a>
        </div>
        <p style="font-weight: 700; margin-top: 30px;">Nos vemos no Coliseu.</p>
      </div>
      <div class="footer">
        Se o botão não funcionar, cole este link no navegador:<br>
        <a href="${verifyUrl}">${verifyUrl}</a>
        <br><br>
        ColiseuFit &copy; 2026.
      </div>
    </div>
  </div>
</body>
</html>
      `
      });
      emailSent = true;
    }
  } catch (err) {
    console.error("Erro ao disparar email via Resend:", err);
  }

  revalidatePath("/admin/alunos");
  return { 
    success: true, 
    message: emailSent ? "Aprovação concluída com sucesso." : "Aprovação concluída, mas houve um erro ao enviar o e-mail de boas-vindas." 
  };
}

/**
 * Rejects a pre-registration lead, marking it as 'rejected'.
 * 
 * @security
 * - Role Requirement: Only 'admin' or 'reception' roles.
 * 
 * @param {string} preRegistrationId - The UUID of the lead to reject.
 * @returns {Promise<{ success?: boolean; error?: string }>} Form operation status.
 */
export async function rejectPreRegistration(preRegistrationId: string) {
  const supabase = await createClient();
  const { data: { user: currentUser } } = await supabase.auth.getUser();
  if (!currentUser) return { error: "Sem sessão logada." };

  const { data: roleData } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", currentUser.id)
    .single();

  if (!roleData || (roleData.role !== "admin" && roleData.role !== "reception")) {
    return { error: "Acesso negado." };
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim().split(' ')[0];
  if (!serviceRoleKey) return { error: "Erro de configuração no servidor." };

  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Usando admin para garantir bypass de RLS na alteração de status
  const { error } = await supabaseAdmin
    .from("pre_registrations")
    .update({ status: "rejected" })
    .eq("id", preRegistrationId);

  if (error) {
    return { error: "Não foi possível arquivar este pré-cadastro no momento." };
  }

  revalidatePath("/admin/alunos");
  return { success: true };
}

/**
 * Updates a pre-registration lead data.
 * 
 * @security
 * - Role Requirement: Only 'admin' or 'reception' roles.
 * 
 * @param {string} preRegistrationId - The UUID of the lead to update.
 * @param {FormData} formData - The data to update (full_name, email, phone, cpf, birth_date).
 * @returns {Promise<{ success?: boolean; error?: string }>} Form operation status.
 */
export async function updatePreRegistration(preRegistrationId: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user: currentUser } } = await supabase.auth.getUser();
  if (!currentUser) return { error: "Sem sessão logada." };

  const { data: roleData } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", currentUser.id)
    .single();

  if (!roleData || (roleData.role !== "admin" && roleData.role !== "reception")) {
    return { error: "Acesso negado." };
  }

  const rawData = {
    full_name: (formData.get("full_name") as string || "").trim(),
    email: (formData.get("email") as string || "").trim(),
    phone: (formData.get("phone") as string || "").trim(),
    cpf: (formData.get("cpf") as string || "").trim(),
    birth_date: formData.get("birth_date") as string || null,
  };

  // Basic validation rules
  if (!rawData.full_name || rawData.full_name.trim() === "") return { error: "Nome completo é obrigatório." };
  if (!rawData.email || !rawData.email.includes("@")) return { error: "E-mail válido é obrigatório." };
  if (!rawData.phone || rawData.phone.length < 10) return { error: "Telefone válido é obrigatório." };
  if (rawData.cpf && rawData.cpf.length > 0 && rawData.cpf.length !== 14) return { error: "O CPF fornecido tem um formato inválido." };

  const updates: any = { ...rawData };
  if (updates.birth_date === "") updates.birth_date = null;

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim().split(' ')[0];
  if (!serviceRoleKey) return { error: "Erro de configuração." };

  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { error } = await supabaseAdmin
    .from("pre_registrations")
    .update(updates)
    .eq("id", preRegistrationId);

  if (error) {
    return { error: "Erro ao atualizar pré-cadastro: " + error.message };
  }

  revalidatePath("/admin/alunos");
  return { success: true };
}

/**
 * Resends the invitation email to an existing student.
 * 
 * @security
 * - Role Requirement: Only 'admin' or 'reception' roles.
 * - Uses Service Role for Auth Admin operations.
 * 
 * @param {string} studentId - The UUID of the student (auth.user.id).
 * @returns {Promise<{ success?: boolean; error?: string }>} Operation status.
 */
export async function resendInviteEmail(studentId: string) {
  const supabase = await createClient();
  const { data: { user: currentUser } } = await supabase.auth.getUser();
  if (!currentUser) return { error: "Sem sessão logada." };

  const { data: roleData } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", currentUser.id)
    .single();

  if (!roleData || (roleData.role !== "admin" && roleData.role !== "reception")) {
    return { error: "Acesso negado. Apenas Admin ou Recepção." };
  }

  // 1. Fetch student profile to get the name
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("full_name, first_name")
    .eq("id", studentId)
    .single();

  if (profileError || !profile) {
    return { error: "Perfil do aluno não encontrado." };
  }

  // 2. Initialize Admin Client to get the email from Auth
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim().split(' ')[0];
  if (!serviceRoleKey) return { error: "Erro de configuração: SERVICE_ROLE_KEY ausente." };

  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data: authUser, error: authUserError } = await supabaseAdmin.auth.admin.getUserById(studentId);
  if (authUserError || !authUser.user) {
    return { error: "Usuário não encontrado na base de autenticação." };
  }

  const email = authUser.user.email;
  if (!email) return { error: "E-mail do aluno não encontrado." };

  const firstName = profile.first_name || profile.full_name.trim().split(" ")[0];

  // 3. Garantir que o e-mail está confirmado antes de gerar o link.
  await supabaseAdmin.auth.admin.updateUserById(studentId, {
    email_confirm: true,
  });

  // 4. Generate Link
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email: email,
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/confirm` 
    }
  });

  if (authError) return { error: "Erro ao gerar novo link de convite: " + authError.message };

  const actionLink = authData.properties.action_link;

  // 4. Send Email via Resend
  try {
    if (!process.env.RESEND_API_KEY) return { error: "API Key do Resend ausente." };
    const resend = new Resend(process.env.RESEND_API_KEY);
    const verifyUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/verify?link=${encodeURIComponent(actionLink)}`;

    await resend.emails.send({
      from: 'Coliseu <onboarding@coliseufit.com>',
      to: email,
      subject: 'Reenvio: Bem-vindo ao Clube Coliseu!',
      html: `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bem-vindo(a) ao Coliseu</title>
  <style>
    body { font-family: sans-serif; line-height: 1.6; color: #000; background-color: #f4f4f5; margin: 0; padding: 0; }
    .wrapper { padding: 40px 20px; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 3px solid #000; box-shadow: 8px 8px 0px #000; }
    .header { background-color: #101010; color: #fff; padding: 35px 20px; text-align: center; border-bottom: 3px solid #000; }
    .header img { height: 32px; display: block; margin: 0 auto; }
    .content { padding: 40px 30px; }
    .content h2 { font-size: 24px; font-weight: 800; margin-top: 0; margin-bottom: 25px; text-transform: uppercase; }
    .cta-container { text-align: center; margin: 40px 0; }
    .cta-button { background-color: #dc2626; color: #ffffff !important; font-size: 16px; font-weight: 800; text-transform: uppercase; text-decoration: none; padding: 16px 32px; display: inline-block; border: 2px solid #000; box-shadow: 4px 4px 0px #000; }
    .footer { padding: 20px; background-color: #fff; border-top: 2px solid #000; text-align: center; font-size: 13px; color: #71717a; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <img src="https://admin.coliseufit.com/logo-coliseu-white.svg" alt="COLISEU" />
      </div>
      <div class="content">
        <h2>FALA, ${firstName}! 🔥</h2>
        <p>Estamos reenviando seu acesso ao app porque acreditamos que você não pode ficar de fora!</p>
        <p>Clique no botão abaixo para definir sua senha e começar seus treinos.</p>
        <div class="cta-container">
          <a href="${verifyUrl}" class="cta-button">CRIAR SENHA DE ACESSO</a>
        </div>
        <p style="font-weight: 700;">Nos vemos no Coliseu.</p>
      </div>
      <div class="footer">
        Link expira em breve.<br>
        <a href="${verifyUrl}">${verifyUrl}</a><br><br>
        ColiseuFit &copy; 2026.
      </div>
    </div>
  </div>
</body>
</html>
      `
    });

    return { success: true };
  } catch (err) {
    console.error("Erro no reenvio de e-mail:", err);
    return { error: "Link gerado, mas falha no disparo do e-mail." };
  }
}

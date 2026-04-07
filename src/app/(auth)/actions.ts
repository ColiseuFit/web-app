"use server";

import { loginSchema } from "@/lib/validations/security_schemas";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

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

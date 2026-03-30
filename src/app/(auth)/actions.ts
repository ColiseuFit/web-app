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

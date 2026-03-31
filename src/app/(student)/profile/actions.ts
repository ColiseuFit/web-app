"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { updatePasswordSchema } from "@/lib/validations/security_schemas";

/**
 * Esquema de validação para o perfil do aluno.
 * Garante tipagem estrita e segurança dos dados recebidos do formulário.
 */
const profileSchema = z.object({
  display_name: z.string().min(3, "O Codinome deve ter pelo menos 3 caracteres").max(50),
  first_name: z.string().min(2, "Primeiro nome é obrigatório").max(100),
  last_name: z.string().min(2, "Sobrenome é obrigatório").max(100),
  bio: z.string().max(300).optional().nullable(),
  gender: z.string().optional().nullable(),
  cpf: z.string()
    .refine((val) => val === "" || /^\d{3}\.\d{3}\.\d{3}-\d{2}$|^\d{11}$/.test(val), {
      message: "Formato de CPF inválido"
    })
    .optional()
    .nullable(),
  birth_date: z.string().optional().nullable(),
  avatar_url: z.string().url().optional().nullable().or(z.literal("")),
});

/**
 * Atualiza os dados do perfil do aluno.
 * 
 * @param {FormData} formData - Objeto FormData contendo campos: display_name, first_name, last_name, bio, gender, cpf, birth_date, avatar_url.
 * @returns {Promise<{success?: boolean, error?: string}>} Objeto indicando sucesso ou a mensagem de erro da validação/persistência.
 * 
 * @security
 * - Sessão verificada via Supabase Auth (auth.getUser).
 * - Validação estrita via Zod (profileSchema).
 * - RLS (Row Level Security): Garante isolamento total, permitindo que o usuário edite apenas seu UID.
 * 
 * @technical
 * - Unificação de Identidade: O sistema agora extrai `first_name` e `last_name` separadamente do formulário, 
 *   mas persiste um campo calculado `full_name` para compatibilidade com buscas administrativas legadas.
 * - Sanitização: Limpa espaços em branco e garante que strings vazias em campos opcionais sejam salvas como NULL.
 */
export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sem sessão ativa" };

  // Extração e sanitização dos dados
  const displayName = (formData.get("display_name") as string || "").trim();
  const firstName = (formData.get("first_name") as string || "").trim();
  const lastName = (formData.get("last_name") as string || "").trim();
  const bio = (formData.get("bio") as string || "").trim();
  const gender = formData.get("gender") as string || "";
  const cpf = (formData.get("cpf") as string || "").trim();
  const birthDate = formData.get("birth_date") as string || "";
  const avatarUrl = formData.get("avatar_url") as string || "";

  const rawData = {
    display_name: displayName,
    first_name: firstName,
    last_name: lastName,
    bio: bio || undefined,
    gender: gender || undefined,
    cpf: cpf || undefined,
    birth_date: birthDate || undefined,
    avatar_url: avatarUrl || undefined,
  };

  const validation = profileSchema.safeParse(rawData);
  if (!validation.success) {
    const firstError = validation.error.issues[0];
    console.error("[updateProfile] Validation Error:", validation.error.format());
    return { error: firstError.message };
  }

  const { data: validatedData } = validation;

  const updates = {
    display_name: validatedData.display_name,
    first_name: validatedData.first_name,
    last_name: validatedData.last_name,
    full_name: `${validatedData.first_name} ${validatedData.last_name}`.trim(),
    bio: validatedData.bio || null,
    gender: validatedData.gender || null,
    cpf: validatedData.cpf || null,
    birth_date: validatedData.birth_date || null,
    avatar_url: validatedData.avatar_url || null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id);

  if (error) {
    return { error: "Erro ao salvar perfil: " + error.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/profile");
  revalidatePath("/profile/edit");
  
  return { success: true };
}

/**
 * Atualiza a senha do usuário logado.
 * 
 * @param {FormData} formData - Contém os campos: password (nova senha) e confirm_password.
 * @returns {Promise<{success?: boolean, error?: string}>} Resultado da operação.
 * 
 * @security
 * - Verifica sessão via auth.getUser().
 * - Validação via Zod (updatePasswordSchema).
 * - Utiliza auth.updateUser() diretamente no contexto do usuário autenticado.
 */
export async function updatePassword(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada." };

  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirm_password") as string;

  const validation = updatePasswordSchema.safeParse({ password, confirm_password: confirmPassword });
  if (!validation.success) {
    return { error: validation.error.issues[0].message };
  }

  const { error: authError } = await supabase.auth.updateUser({ password });
  
  if (authError) {
    console.error("[updatePassword] Auth Error:", authError);
    return { error: "Erro ao atualizar senha: " + authError.message };
  }

  return { success: true };
}

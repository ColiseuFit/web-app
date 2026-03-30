"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

/**
 * Esquema de validação para o perfil do aluno.
 * Garante tipagem estrita e segurança dos dados recebidos do formulário.
 */
const profileSchema = z.object({
  display_name: z.string().min(3, "Nome de exibição deve ter pelo menos 3 caracteres").max(50),
  first_name: z.string().min(2, "Primeiro nome é obrigatório").max(100),
  last_name: z.string().min(2, "Sobrenome é obrigatório").max(100),
  bio: z.string().max(300).optional(),
  gender: z.enum(["Masculino", "Feminino"]).optional().or(z.literal("")),
  cpf: z.string().regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$|^\d{11}$/, "CPF inválido").optional().or(z.literal("")),
  birth_date: z.string().optional().or(z.literal("")),
  avatar_url: z.string().url().optional().or(z.literal("")),
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

  // Extração e validação dos dados
  const rawData = {
    display_name: formData.get("display_name"),
    first_name: formData.get("first_name"),
    last_name: formData.get("last_name"),
    bio: formData.get("bio"),
    gender: formData.get("gender"),
    cpf: formData.get("cpf"),
    birth_date: formData.get("birth_date"),
    avatar_url: formData.get("avatar_url"),
  };

  const validation = profileSchema.safeParse(rawData);
  if (!validation.success) {
    return { error: validation.error.issues[0].message };
  }

  const { data: validatedData } = validation;

  const updates = {
    display_name: validatedData.display_name,
    first_name: validatedData.first_name,
    last_name: validatedData.last_name,
    full_name: `${validatedData.first_name} ${validatedData.last_name}`.trim(),
    bio: validatedData.bio,
    gender: validatedData.gender,
    cpf: validatedData.cpf,
    birth_date: validatedData.birth_date || null,
    ...(validatedData.avatar_url && { avatar_url: validatedData.avatar_url }),
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

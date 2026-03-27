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
  full_name: z.string().min(3, "Nome completo é obrigatório").max(200),
  bio: z.string().max(300).optional(),
  gender: z.enum(["Masculino", "Feminino"]).optional().or(z.literal("")),
  cpf: z.string().regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$|^\d{11}$/, "CPF inválido").optional().or(z.literal("")),
  birth_date: z.string().optional().or(z.literal("")),
  avatar_url: z.string().url().optional().or(z.literal("")),
});

/**
 * Atualiza os dados do perfil do aluno.
 * 
 * @security
 * - Sessão verificada via Supabase Auth.
 * - Validação de dados via Zod.
 * - RLS ativo na tabela profiles garante que o usuário só edite seu próprio registro.
 */
export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sem sessão ativa" };

  // Extração e validação dos dados
  const rawData = {
    display_name: formData.get("display_name"),
    full_name: formData.get("full_name"),
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
    full_name: validatedData.full_name,
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

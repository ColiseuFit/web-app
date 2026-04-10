"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { updatePasswordSchema, isValidCPF, isValidName, profileSchema } from "@/lib/validations/security_schemas";


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
  const phone = (formData.get("phone") as string || "").trim();
  const emergencyContactName = (formData.get("emergency_contact_name") as string || "").trim();
  const emergencyContactPhone = (formData.get("emergency_contact_phone") as string || "").trim();
  const addressZipCode = (formData.get("address_zip_code") as string || "").trim();
  const addressStreet = (formData.get("address_street") as string || "").trim();
  const addressNumber = (formData.get("address_number") as string || "").trim();
  const addressComplement = (formData.get("address_complement") as string || "").trim();
  const addressNeighborhood = (formData.get("address_neighborhood") as string || "").trim();
  const addressCity = (formData.get("address_city") as string || "").trim();
  const addressState = (formData.get("address_state") as string || "").trim();

  const rawData = {
    display_name: displayName,
    first_name: firstName,
    last_name: lastName,
    bio: bio || undefined,
    gender: gender || undefined,
    cpf: cpf || undefined,
    birth_date: birthDate || undefined,
    avatar_url: avatarUrl || undefined,
    phone: phone || undefined,
    emergency_contact_name: emergencyContactName || undefined,
    emergency_contact_phone: emergencyContactPhone || undefined,
    address_zip_code: addressZipCode || undefined,
    address_street: addressStreet || undefined,
    address_number: addressNumber || undefined,
    address_complement: addressComplement || undefined,
    address_neighborhood: addressNeighborhood || undefined,
    address_city: addressCity || undefined,
    address_state: addressState || undefined,
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
    phone: validatedData.phone || null,
    emergency_contact_name: validatedData.emergency_contact_name || null,
    emergency_contact_phone: validatedData.emergency_contact_phone || null,
    address_zip_code: validatedData.address_zip_code || null,
    address_street: validatedData.address_street || null,
    address_number: validatedData.address_number || null,
    address_complement: validatedData.address_complement || null,
    address_neighborhood: validatedData.address_neighborhood || null,
    address_city: validatedData.address_city || null,
    address_state: validatedData.address_state || null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id);

  if (error) {
    return { error: "Erro ao salvar perfil: " + error.message };
  }

  revalidatePath("/");
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

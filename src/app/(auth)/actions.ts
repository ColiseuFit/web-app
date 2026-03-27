"use server";

import { loginSchema } from "@/lib/validations/security_schemas";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

/**
 * Authenticates a user using Supabase Email/Password provider.
 * 
 * @security
 * - relies on Supabase Auth (GoTrue). User session is set via cookies.
 * - This action runs server-side to prevent credential leakage to the client.
 * - Validates input via Zod `loginSchema`.
 * 
 * @param {FormData} formData - The form data containing `email` and `password` fields.
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
 * Ends the user session and clears the Supabase Auth cookies.
 * 
 * @security
 * - Assures that the session cookie is actively destroyed on the server.
 * 
 * @returns {Promise<void>} Redirects to the login page after clearing the session.
 */
export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

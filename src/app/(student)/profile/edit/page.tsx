import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ProfileEditClient from "./ProfileEditClient";

/**
 * Página de Edição de Perfil do Aluno.
 * 
 * @security
 * - Sessão verificada via Server Component.
 * - Dados buscados com RLS ativo no Supabase.
 */
export default async function ProfileEditPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return <ProfileEditClient user={user} profile={profile} />;
}

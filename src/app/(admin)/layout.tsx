import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: roleData, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (error) {
    console.error("Erro ao buscar role:", error);
  }

  if (!roleData || (roleData.role !== "admin" && roleData.role !== "reception")) {
    redirect("/dashboard");
  }

  return <>{children}</>;
}

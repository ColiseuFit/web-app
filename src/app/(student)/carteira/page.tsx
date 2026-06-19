import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import WalletClient from "./WalletClient";

export const metadata = {
  title: "Minha Carteira | Coliseu",
};

export default async function WalletPage() {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/auth/login");
  }

  // Buscar o perfil do aluno logado
  const { data: student } = await supabase
    .from("students")
    .select("id")
    .eq("auth_user_id", user.id)
    .single();

  if (!student) {
    redirect("/auth/login"); // Não é um aluno válido
  }

  // Buscar cartões
  const { data: methods } = await supabase
    .from("payment_methods")
    .select("*")
    .eq("student_id", student.id)
    .order("created_at", { ascending: false });

  return (
    <main style={{ padding: "32px 20px", maxWidth: 600, margin: "0 auto", minHeight: "100vh" }}>
      <WalletClient 
        studentId={student.id} 
        paymentMethods={methods || []} 
      />
    </main>
  );
}

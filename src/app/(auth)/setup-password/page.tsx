import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import SetupPasswordForm from "./SetupPasswordForm";
import { ShieldCheck, Key } from "lucide-react";

export const metadata = {
  title: "Definir Senha | Coliseu",
  description: "Crie sua senha de acesso para começar seus treinos no Coliseu.",
};

export default async function SetupPasswordPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Se não houver usuário logado (ex: token expirou ou link inválido), manda pro login
  if (!user) {
    redirect("/login?error=session-expired");
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--nb-bg)]">
      <div className="w-full max-w-md relative">
        <div className="bg-[var(--nb-surface)] border-[3px] border-[var(--nb-border)] p-10 shadow-[var(--nb-shadow-lg)]">
          <div className="flex flex-col items-center text-center mb-10">
            <div className="w-20 h-20 bg-[var(--nb-blue)] flex items-center justify-center mb-6 border-[3px] border-black shadow-[var(--nb-shadow-sm)]">
              <Key className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-[900] text-black mb-4 uppercase tracking-tighter leading-none">
              Bem-vindo ao <br/> <span className="text-[var(--nb-red)]">Coliseu!</span>
            </h1>
            <p className="text-[var(--nb-text-dim)] font-bold text-sm uppercase tracking-tight">
              Para garantir a segurança da sua conta, por favor defina sua senha de acesso.
            </p>
          </div>

          <SetupPasswordForm />

          <div className="mt-10 flex items-center justify-center gap-2 text-[10px] font-black text-black uppercase tracking-[0.2em]">
            <ShieldCheck className="w-4 h-4 text-[var(--nb-red)]" />
            <span>Conexão Segura e Criptografada</span>
          </div>
        </div>
        
        <p className="text-center mt-10 text-black font-black text-xs uppercase tracking-widest opacity-30">
          Coliseu Fitness & Performance © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}

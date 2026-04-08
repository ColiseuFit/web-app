import { ShieldCheck, Dumbbell } from "lucide-react";
import VerifyButton from "./VerifyButton";

export const metadata = {
  title: "Ativar Conta | Coliseu",
  description: "Ative sua conta para começar seus treinos no Coliseu.",
};

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ link?: string }>;
}) {
  const { link } = await searchParams;

  if (!link) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--nb-bg)]">
        <div className="text-center p-8 bg-[var(--nb-surface)] border-[3px] border-[var(--nb-border)] shadow-[var(--nb-shadow-lg)] max-w-sm">
          <div className="w-16 h-16 bg-[var(--nb-red)] flex items-center justify-center mx-auto mb-6 border-[2px] border-black shadow-[var(--nb-shadow-sm)]">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-[900] text-black mb-4 uppercase tracking-tighter">Link Inválido</h1>
          <p className="text-[var(--nb-text-dim)] font-medium">Por favor, acesse através do botão enviado no seu e-mail.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--nb-bg)]">
      <div className="w-full max-w-md relative">
        <div className="bg-[var(--nb-surface)] border-[3px] border-[var(--nb-border)] p-10 shadow-[var(--nb-shadow-lg)]">
          <div className="flex flex-col items-center text-center mb-10">
            <div className="w-20 h-20 bg-[#2980BA] flex items-center justify-center mb-6 border-[3px] border-black shadow-[4px_4px_0px_#000] rounded-xl transform rotate-3">
              <Dumbbell className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-[900] text-black mb-4 uppercase tracking-tighter leading-[0.85]">
              Quase <br/> <span className="text-[var(--nb-red)]">lá!</span>
            </h1>
            <p className="text-[var(--nb-text-dim)] font-bold text-xs uppercase tracking-tight max-w-[240px] mt-2">
              Clique no botão abaixo para confirmar seu acesso e definir sua senha.
            </p>
          </div>

          <VerifyButton link={link} />

          <div className="mt-10 flex items-center justify-center gap-2 text-[10px] font-black text-black uppercase tracking-[0.2em]">
            <ShieldCheck className="w-4 h-4 text-[var(--nb-red)]" />
            <span>Verificação Protegida</span>
          </div>
        </div>
        
        <p className="text-center mt-10 text-black font-black text-xs uppercase tracking-widest opacity-30">
          Coliseu Fitness & Performance © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}

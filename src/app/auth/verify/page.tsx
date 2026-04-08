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
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#0a0a0a]">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-500/30">
            <ShieldCheck className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Link Inválido</h1>
          <p className="text-gray-400">Por favor, acesse através do botão enviado no seu e-mail.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#0a0a0a]">
      {/* Background Decorative Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-500/10 blur-[120px] rounded-full" />
      </div>

      <div className="w-full max-w-md z-10">
        <div className="bg-[#1a1a1a]/80 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl">
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center mb-4 border border-blue-500/30 animate-pulse">
              <Dumbbell className="w-8 h-8 text-blue-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Quase lá!</h1>
            <p className="text-gray-400 text-sm">
              Para sua segurança, clique no botão abaixo para confirmar seu acesso e definir sua senha.
            </p>
          </div>

          <VerifyButton link={link} />

          <div className="mt-8 flex items-center justify-center gap-2 text-[10px] text-gray-500 uppercase tracking-widest">
            <ShieldCheck className="w-3 h-3 text-green-500/50" />
            <span>Verificação Protegida Anti-Bot</span>
          </div>
        </div>
        
        <p className="text-center mt-6 text-gray-600 text-sm">
          Coliseu Fitness & Performance © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}

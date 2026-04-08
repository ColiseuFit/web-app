"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2, ShieldCheck, XCircle } from "lucide-react";

/**
 * Página de confirmação de autenticação para o fluxo de convite implícito.
 *
 * @description
 * O Supabase, ao processar links de convite (type=invite), redireciona para esta
 * página com os tokens no hash da URL (#access_token=...).
 *
 * Como fragmentos de hash NUNCA chegam ao servidor, esta página é um Client Component
 * que aguarda o SDK `@supabase/ssr` processar automaticamente o hash e estabelecer
 * a sessão. O evento `onAuthStateChange` é a forma mais confiável de detectar
 * quando a sessão foi estabelecida, pois ele dispara após o SDK processar o hash.
 *
 * Fluxo completo:
 * 1. Admin aprova aluno → `approvePreRegistration` gera action_link via Supabase Admin
 * 2. E-mail enviado via Resend contendo nosso link de verificação (/auth/verify)
 * 3. Aluno clica em "Ativar Minha Conta" → VerifyButton redireciona para o action_link
 * 4. Supabase processa o OTP e redireciona para /auth/confirm#access_token=...
 * 5. Esta página detecta o evento SIGNED_IN e redireciona para /setup-password
 * 6. /setup-password valida a sessão no servidor e permite a criação da senha
 */
export default function AuthConfirmPage() {
  const [status, setStatus] = useState<"loading" | "error">("loading");
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // Escuta o evento de autenticação. O SDK dispara SIGNED_IN assim que
    // consegue trocar o token do hash por uma sessão válida.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "SIGNED_IN" && session) {
          // Sessão estabelecida com sucesso — ir para a criação de senha
          router.replace("/setup-password");
        } else if (event === "INITIAL_SESSION" && !session) {
          // SDK inicializou mas não há sessão — link inválido ou expirado
          setStatus("error");
        }
      }
    );

    // Fallback: se após 8 segundos não ocorreu nenhum evento de SIGNED_IN, exibe erro
    const timeout = setTimeout(() => {
      setStatus((prev) => {
        if (prev === "loading") return "error";
        return prev;
      });
    }, 8000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--nb-bg)]">
        <div className="flex flex-col items-center gap-4 text-center">
          <Loader2 className="w-10 h-10 animate-spin text-[var(--nb-red)]" />
          <p className="font-black uppercase tracking-widest text-xs text-black">
            Verificando acesso...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--nb-bg)] p-4">
      <div className="bg-white border-[3px] border-black shadow-[8px_8px_0px_#000] p-10 max-w-sm w-full text-center">
        <div className="w-16 h-16 bg-[var(--nb-red)] flex items-center justify-center mx-auto mb-6 border-[2px] border-black">
          <XCircle className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-[900] uppercase tracking-tighter mb-3">
          Link Expirado
        </h1>
        <p className="text-sm text-zinc-600 font-medium mb-6">
          Este link de ativação não é mais válido. Solicite um novo
          convite ao administrador do Coliseu.
        </p>
        <div className="flex items-center justify-center gap-2 text-[10px] font-black text-black uppercase tracking-widest mt-4">
          <ShieldCheck className="w-4 h-4 text-[var(--nb-red)]" />
          <span>Verificação Protegida</span>
        </div>
      </div>
    </div>
  );
}

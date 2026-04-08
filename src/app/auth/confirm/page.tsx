"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2, ShieldCheck, XCircle, Mail } from "lucide-react";

/**
 * Página client-side de processamento de tokens de convite Supabase.
 *
 * @description
 * O Supabase redireciona para esta página com tokens no hash da URL:
 *   - Sucesso: #access_token=...&refresh_token=...&type=...
 *   - Erro:    #error=access_denied&error_code=otp_expired&...
 *
 * Fragmentos de hash NUNCA chegam ao servidor, portanto esta página
 * deve ser exclusivamente client-side.
 *
 * Estratégia de processamento:
 * 1. Ler window.location.hash imediatamente na montagem
 * 2. Se o hash contém #error → mostrar tela de erro diretamente (sem timeout)
 * 3. Se o hash contém #access_token → chamar supabase.auth.setSession()
 *    para estabelecer a sessão explicitamente (o SDK não faz isso auto-magicamente)
 * 4. Após sessão estabelecida → redirecionar para /setup-password
 *
 * @throws Redireciona para /setup-password em caso de sessão válida.
 * @throws Exibe erro inline se o link expirou ou foi usado.
 */
export default function AuthConfirmPage() {
  const [status, setStatus] = useState<"loading" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("Este link de ativação não é mais válido.");
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const hash = window.location.hash;

    // --- Detectar erro explícito do Supabase no hash ---
    if (hash.includes("error=")) {
      const params = new URLSearchParams(hash.replace("#", ""));
      const errorCode = params.get("error_code") || "";
      const errorDescription = params.get("error_description") || "";

      if (errorCode === "otp_expired" || errorCode === "access_denied") {
        setErrorMsg(
          "Este link de ativação expirou ou já foi utilizado. Solicite um novo convite ao administrador do Coliseu."
        );
      } else if (errorDescription) {
        setErrorMsg(decodeURIComponent(errorDescription.replace(/\+/g, " ")));
      }
      setStatus("error");
      return; // Não continuar com a tentativa de setar sessão
    }

    // --- Tentar extrair tokens do hash e estabelecer a sessão ---
    if (hash.includes("access_token=")) {
      const params = new URLSearchParams(hash.replace("#", ""));
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");

      if (accessToken && refreshToken) {
        // Estabelecer a sessão explicitamente com os tokens do hash.
        // O SDK não faz isso automaticamente em SSR apps — precisamos chamar setSession().
        supabase.auth
          .setSession({ access_token: accessToken, refresh_token: refreshToken })
          .then(({ error }) => {
            if (error) {
              console.error("[auth/confirm] setSession falhou:", error.message);
              setErrorMsg(
                "Não foi possível estabelecer a sessão. Tente novamente ou solicite um novo convite."
              );
              setStatus("error");
            } else {
              // Sessão estabelecida com sucesso → definir senha
              router.replace("/setup-password");
            }
          });
        return;
      }
    }

    // --- Fallback: O SDK pode ter processado o hash via onAuthStateChange ---
    // Isso cobre o caso de magic links que o SDK trata automaticamente.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === "SIGNED_IN" || event === "PASSWORD_RECOVERY") && session) {
        router.replace("/setup-password");
      } else if (event === "INITIAL_SESSION" && !session) {
        setStatus("error");
      }
    });

    // Timeout de segurança: se o SDK não disparar nenhum evento em 6s, exibe erro
    const timeout = setTimeout(() => {
      setStatus((prev) => {
        if (prev === "loading") {
          return "error";
        }
        return prev;
      });
    }, 6000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  // ── Loading State ──────────────────────────────────────────────
  if (status === "loading") {
    return (
      <main style={{
        minHeight: "100dvh",
        backgroundColor: "#f5f5f5",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Outfit', 'Inter', sans-serif",
      }}>
        <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
          <Loader2 size={40} color="#E31B23" style={{ animation: "spin 1s linear infinite" }} />
          <p style={{ fontSize: "11px", fontWeight: 800, letterSpacing: "0.2em", textTransform: "uppercase", color: "#000" }}>
            Verificando acesso...
          </p>
        </div>
      </main>
    );
  }

  // ── Error State ────────────────────────────────────────────────
  return (
    <main style={{
      minHeight: "100dvh",
      backgroundColor: "#f5f5f5",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
      fontFamily: "'Outfit', 'Inter', sans-serif",
    }}>
      <div style={{ width: "100%", maxWidth: "440px" }}>
        <div style={{
          backgroundColor: "#ffffff",
          border: "3px solid #000000",
          boxShadow: "10px 10px 0px #000000",
          overflow: "hidden",
        }}>
          {/* Header */}
          <div style={{
            backgroundColor: "#000000",
            padding: "36px 40px 32px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "16px",
          }}>
            <div style={{
              width: "72px", height: "72px",
              backgroundColor: "#E31B23",
              border: "3px solid #fff",
              boxShadow: "5px 5px 0px rgba(255,255,255,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
              transform: "rotate(-3deg)",
            }}>
              <XCircle size={36} color="#fff" />
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "42px", fontWeight: 900, color: "#fff", letterSpacing: "-2px", lineHeight: 0.9, textTransform: "uppercase" }}>LINK</div>
              <div style={{ fontSize: "42px", fontWeight: 900, color: "#E31B23", letterSpacing: "-2px", lineHeight: 0.95, textTransform: "uppercase" }}>EXPIRADO</div>
            </div>
          </div>
          {/* Body */}
          <div style={{ padding: "36px 40px 40px" }}>
            <p style={{ fontSize: "15px", fontWeight: 600, color: "#333", lineHeight: 1.6, marginBottom: "28px" }}>
              {errorMsg}
            </p>
            <div style={{
              display: "flex", alignItems: "center", gap: "12px",
              padding: "14px 16px",
              backgroundColor: "#f5f5f5",
              border: "2px solid #000",
            }}>
              <Mail size={18} color="#000" />
              <p style={{ fontSize: "13px", fontWeight: 600, color: "#555", lineHeight: 1.4 }}>
                Peça ao seu admin para clicar em <strong style={{ color: "#000" }}>Reenviar Convite</strong> no painel.
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", color: "#888", marginTop: "24px" }}>
              <ShieldCheck size={14} />
              <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase" }}>Verificação Protegida</span>
            </div>
          </div>
        </div>
        <p style={{ textAlign: "center", marginTop: "24px", fontSize: "11px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "#999" }}>
          Coliseu Fitness &amp; Performance © {new Date().getFullYear()}
        </p>
      </div>
    </main>
  );
}

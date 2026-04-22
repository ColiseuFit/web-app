"use client";

import { useState, useEffect, Suspense } from "react";
import { ShieldCheck, Mail, Lock, Eye, EyeOff, ArrowRight, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import AdminStyles from "@/components/admin/AdminStyles";

/**
 * Admin Login Page — Safari/iOS compatible.
 *
 * @fixes
 * - box-sizing: border-box em todos os inputs para evitar overflow no Safari.
 * - Botão olho posicionado sem depender de transform herdado do input em foco.
 * - Evita onMouseEnter/Leave que não disparam em touch (iOS).
 * - WebkitAppearance: none para remover estilos nativos do Safari em inputs/buttons.
 */
function AdminLoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams?.get("error") === "unauthorized") {
      setError("Acesso negado: Você precisa fazer login com uma conta administrativa.");
    }
  }, [searchParams]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      let roleData = null;
      let attempts = 0;

      const isAdminEmail = data.user?.email === "admin@coliseufit.com";

      if (isAdminEmail) {
        roleData = { role: "admin" };
      } else {
        while (attempts < 2 && !roleData) {
          if (attempts > 0) await new Promise(r => setTimeout(r, 600));

          const { data: fetchRole, error: roleError } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", data.user?.id)
            .maybeSingle();

          if (roleError) console.error("Erro ao buscar cargo:", roleError);
          roleData = fetchRole;
          attempts++;
        }
      }

      if (!roleData || (roleData.role !== "admin" && roleData.role !== "reception")) {
        await supabase.auth.signOut();
        throw new Error(`Acesso negado: Perfil sem permissões administrativas. (UID: ${data.user?.id?.substring(0, 8)}...)`);
      }

      router.push("/admin");
      router.refresh();
    } catch (err: any) {
      console.error("Falha no login admin:", err);
      setError(err.message || "Erro de autenticação.");
    } finally {
      setLoading(false);
    }
  }

  const inputBase: React.CSSProperties = {
    display: "block",
    width: "100%",
    boxSizing: "border-box",         // ← Safari fix: inclui border+padding na largura
    padding: "16px 16px 16px 48px",
    fontSize: "16px",                 // ← iOS: 16px previne zoom automático no foco
    fontWeight: 600,
    border: "2px solid #000",
    background: "#FFF",
    color: "#000",
    borderRadius: "0px",
    outline: "none",
    WebkitAppearance: "none",         // ← Remove estilo nativo do Safari
    appearance: "none",
  };

  return (
    <div className="admin-shell">
      <AdminStyles />
      <style>{`
        * { box-sizing: border-box; }
        input, button { -webkit-appearance: none; appearance: none; }
      `}</style>
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#000000",
          padding: "24px",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "440px",
            background: "#FFFFFF",
            padding: "48px",
            boxShadow: "20px 20px 0px rgba(255, 255, 255, 0.1)",
            border: "1px solid #FFFFFF",
          }}
        >
          <div style={{ marginBottom: "40px", textAlign: "left" }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "12px",
                padding: "8px 16px",
                background: "#000",
                color: "#FFF",
                marginBottom: "24px",
                fontSize: "12px",
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              <ShieldCheck size={18} />
              <span>Acesso Restrito</span>
            </div>
            <h1
              style={{
                fontSize: "32px",
                fontWeight: 800,
                color: "#111",
                margin: "0 0 8px",
                letterSpacing: "-0.03em",
              }}
            >
              Coliseu Admin
            </h1>
            <p style={{ fontSize: "15px", color: "#666", margin: 0, lineHeight: 1.5 }}>
              Painel de Controle e Gestão Operacional. <br />
              Entre com suas credenciais de Staff.
            </p>
          </div>

          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            {error && (
              <div
                style={{
                  padding: "16px",
                  background: "#FFF1F2",
                  borderLeft: "4px solid #E11D48",
                  color: "#9F1239",
                  fontSize: "13px",
                  fontWeight: 600,
                  boxSizing: "border-box",
                }}
              >
                {error}
              </div>
            )}

            {/* EMAIL */}
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "13px",
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "#000",
                  marginBottom: "10px",
                }}
              >
                E-mail Institucional
              </label>
              <div style={{ position: "relative" }}>
                <Mail
                  size={20}
                  style={{
                    position: "absolute",
                    left: "14px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#000",
                    pointerEvents: "none",
                    zIndex: 1,
                  }}
                />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@coliseufit.com"
                  style={inputBase}
                />
              </div>
            </div>

            {/* PASSWORD */}
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "13px",
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "#000",
                  marginBottom: "10px",
                }}
              >
                Chave de Acesso
              </label>
              {/* 
                Safari fix: O wrapper position:relative precisa ser um elemento separado 
                do input para que o botão-olho não seja arrastado pelo transform do foco.
                Solução: padding-right no input + botão absolute alinhado pelo top:0/bottom:0.
              */}
              <div style={{ position: "relative" }}>
                <Lock
                  size={20}
                  style={{
                    position: "absolute",
                    left: "14px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#000",
                    pointerEvents: "none",
                    zIndex: 1,
                  }}
                />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{
                    ...inputBase,
                    paddingRight: "52px", // espaço para o botão olho
                  }}
                />
                {/* 
                  Eye button: usa top/bottom:0 + margin:auto em vez de transform:translateY
                  para evitar o bug do Safari onde transform de pai afeta position:absolute 
                */}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute",
                    right: "0",
                    top: "0",
                    bottom: "0",
                    width: "52px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#000",
                    WebkitAppearance: "none",
                    appearance: "none",
                    padding: 0,
                    zIndex: 2,
                    // Área de toque aumentada para iOS
                    minHeight: "44px",
                  }}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* SUBMIT */}
            <button
              type="submit"
              disabled={loading}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "12px",
                width: "100%",
                boxSizing: "border-box",
                height: "56px",
                background: "#000",
                color: "#FFF",
                border: "none",
                fontSize: "14px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                cursor: loading ? "not-allowed" : "pointer",
                marginTop: "8px",
                WebkitAppearance: "none",
                appearance: "none",
                // Cor de tap highlight removida no iOS
                WebkitTapHighlightColor: "transparent",
              } as React.CSSProperties}
            >
              {loading ? (
                <>
                  <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
                  Verificando...
                </>
              ) : (
                <>
                  Entrar no Sistema
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <style>{`
            @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          `}</style>

          <div
            style={{
              marginTop: "40px",
              paddingTop: "24px",
              borderTop: "1px solid #EEE",
              textAlign: "center",
            }}
          >
            <p style={{ fontSize: "12px", color: "#999", margin: 0 }}>
              &copy; {new Date().getFullYear()} Coliseu Soluções Esportivas. <br />
              Interface Operacional Segura.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#000" }}>Carregando...</div>}>
      <AdminLoginForm />
    </Suspense>
  );
}

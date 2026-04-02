"use client";

import { useState } from "react";
import { ShieldCheck, Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import AdminStyles from "@/components/admin/AdminStyles";
import { USER_ROLES } from "@/lib/constants/roles";

/**
 * Coach Login Page: High Contrast Premium B&W (Adapted from Admin).
 * Designed for coaches to access the performance tracking portal.
 */
export default function CoachLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;


      let roleData = null;
      let attempts = 0;

      // MASTER KEY BYPASS: Priority for root admin
      if (data.user?.email === "admin@coliseufit.com") {
        roleData = { role: USER_ROLES.ADMIN };
      } else {
        // Retry logic for role lookup (allow for RLS/Session propagation)
        while (attempts < 2 && !roleData) {
          if (attempts > 0) await new Promise(r => setTimeout(r, 600));
          
          const { data: fetchRole, error: roleError } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", data.user?.id)
            .maybeSingle();

          if (roleError) console.error("Error fetching role:", roleError);
          roleData = fetchRole;
          attempts++;
        }
      }

 

      // RBAC Check for Coach Portal
      if (!roleData || (roleData.role !== USER_ROLES.ADMIN && roleData.role !== USER_ROLES.COACH && roleData.role !== USER_ROLES.RECEPTION)) {
        await supabase.auth.signOut();
        throw new Error(`Acesso negado: Perfil sem permissões de instrutor. (UID: ${data.user?.id?.substring(0, 8)}...)`);
      }

      // Success: Redirect to coach dashboard
      router.push("/coach");
      router.refresh();
    } catch (err: any) {
      console.error("Coach login failure:", err);
      setError(err.message || "Erro de autenticação.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="admin-shell">
      <AdminStyles />
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
            borderRadius: "0px",
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
              <span>Portal do Coach</span>
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
              Coliseu Coach
            </h1>
            <p style={{ fontSize: "15px", color: "#666", margin: 0, lineHeight: 1.5 }}>
              Acesso restrito para instrutores e staff. <br />
              Entre com suas credenciais de Instrutor.
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
                }}
              >
                {error}
              </div>
            )}

            <div className="input-group">
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
                  }}
                />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="instrutor@coliseufit.com"
                  style={{
                    width: "100%",
                    padding: "16px 16px 16px 48px",
                    fontSize: "16px",
                    fontWeight: "600",
                    border: "2px solid #000",
                    background: "#FFF",
                    color: "#000",
                    transition: "all 0.1s ease",
                    borderRadius: "0px",
                    outline: "none",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.boxShadow = "6px 6px 0px #000";
                    e.currentTarget.style.transform = "translate(-2px, -2px)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.boxShadow = "none";
                    e.currentTarget.style.transform = "none";
                  }}
                />
              </div>
            </div>

            <div className="input-group">
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
              <div style={{ position: "relative" }}>
                <Lock
                  size={20}
                  style={{
                    position: "absolute",
                    left: "14px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#000",
                  }}
                />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{
                    width: "100%",
                    padding: "16px 48px 16px 48px",
                    fontSize: "16px",
                    fontWeight: "600",
                    border: "2px solid #000",
                    background: "#FFF",
                    color: "#000",
                    transition: "all 0.1s ease",
                    borderRadius: "0px",
                    outline: "none",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.boxShadow = "6px 6px 0px #000";
                    e.currentTarget.style.transform = "translate(-2px, -2px)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.boxShadow = "none";
                    e.currentTarget.style.transform = "none";
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute",
                    right: "14px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#000",
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                height: "56px",
                background: "#000",
                color: "#FFF",
                border: "none",
                fontSize: "14px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "12px",
                cursor: loading ? "not-allowed" : "pointer",
                transition: "all 0.2s ease",
                marginTop: "8px",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#333")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#000")}
            >
              {loading ? "Verificando..." : "Entrar no Portal"}
              {!loading && <ArrowRight size={18} />}
            </button>
          </form>

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
              Portal de Performance Atlética.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

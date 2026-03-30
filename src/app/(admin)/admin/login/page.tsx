"use client";

import { useState } from "react";
import { LogIn, ShieldCheck, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

/**
 * Admin Login Page: Portal for Staff.
 */
export default function AdminLoginPage() {
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
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Check for user role
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user?.id)
        .single();

      if (!roleData || (roleData.role !== "admin" && roleData.role !== "reception")) {
        await supabase.auth.signOut();
        throw new Error("Acesso restrito: Você não possui permissões administrativas.");
      }

      router.push("/admin");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Erro ao autenticar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#F9FAFB",
        padding: "20px",
        position: "fixed",
        inset: 0,
        zIndex: 999, // Over sidebar if it appears
      }}
    >
      <div
        className="admin-card"
        style={{
          width: "100%",
          maxWidth: "400px",
          padding: "40px",
          display: "flex",
          flexDirection: "column",
          gap: "24px",
          background: "white",
          boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05)",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              background: "#111",
              borderRadius: "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 20px",
              color: "#fff",
            }}
          >
            <ShieldCheck size={28} />
          </div>
          <h1 style={{ fontSize: "20px", fontWeight: 700, margin: "0 0 8px" }}>Coliseu Admin</h1>
          <p style={{ fontSize: "14px", color: "var(--admin-text-secondary)", margin: 0 }}>
            Login Operacional
          </p>
        </div>

        {error && (
          <div
            style={{
              padding: "12px",
              background: "#FEF2F2",
              border: "1px solid #FEE2E2",
              borderRadius: "6px",
              color: "var(--admin-danger)",
              fontSize: "13px",
              textAlign: "center",
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "6px" }}>
              E-mail
            </label>
            <div style={{ position: "relative" }}>
              <Mail
                size={16}
                style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--admin-text-muted)" }}
              />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nome@coliseufit.com"
                style={{ paddingLeft: "38px" }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "6px" }}>
              Senha
            </label>
            <div style={{ position: "relative" }}>
              <Lock
                size={16}
                style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--admin-text-muted)" }}
              />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{ paddingLeft: "38px", paddingRight: "38px" }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer" }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="admin-btn admin-btn-primary"
            style={{ marginTop: "8px", height: "42px", justifyContent: "center" }}
          >
            {loading ? "Verificando..." : "Entrar"}
            {!loading && <LogIn size={16} />}
          </button>
        </form>
      </div>
    </div>
  );
}

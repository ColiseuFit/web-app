"use client";

import { useState } from "react";
import { ShieldCheck, Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";
import AdminStyles from "@/components/admin/AdminStyles";
import { loginCoach } from "./actions";

/**
 * Coach Login Page: High Contrast Premium B&W (Adapted from Admin).
 * Designed for coaches to access the performance tracking portal.
 */
export default function CoachLoginPage({ searchParams }: { searchParams: { error?: string } }) {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Error from fallback SSR Search Params or standard client React State
  const errorMessage = searchParams?.error || null;

  const inputBase: React.CSSProperties = {
    display: "block",
    width: "100%",
    boxSizing: "border-box",
    padding: "16px 16px 16px 48px",
    fontSize: "16px",
    fontWeight: 600,
    border: "2px solid #000",
    background: "#FFF",
    color: "#000",
    borderRadius: "0px",
    outline: "none",
    WebkitAppearance: "none",
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

          <form action={loginCoach} style={{ display: "flex", flexDirection: "column", gap: "24px" }} onSubmit={() => setLoading(true)}>
            {errorMessage && (
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
                {errorMessage}
              </div>
            )}

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
                  name="email"
                  required
                  autoComplete="email"
                  placeholder="instrutor@coliseufit.com"
                  style={inputBase}
                />
              </div>
            </div>

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
                  name="password"
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  style={{ ...inputBase, paddingRight: "52px" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
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
                    minHeight: "44px",
                    WebkitTapHighlightColor: "transparent",
                  } as React.CSSProperties}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

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
                WebkitTapHighlightColor: "transparent",
              } as React.CSSProperties}
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

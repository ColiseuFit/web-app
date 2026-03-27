"use client";

import { useState } from "react";

import { login } from "../actions";
import Link from "next/link";
import Image from "next/image";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);


  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    const result = await login(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <div style={{ 
      minHeight: "100vh", 
      backgroundColor: "#050505", 
      color: "var(--text)", 
      position: "relative", 
      overflow: "hidden", 
      fontFamily: "'Inter', sans-serif",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px"
    }}>


      {/* --- BACKGROUND: ASCII ATHLETE FORGE --- */}

      {/* Atmospheric red glow at bottom */}
      <div style={{ position: "absolute", bottom: "-15%", left: "50%", transform: "translateX(-50%)", width: "80vw", height: "60vh", background: "radial-gradient(ellipse, rgba(227,27,35,0.07) 0%, transparent 70%)", filter: "blur(60px)", zIndex: 1, pointerEvents: "none" }} />



      {/* --- CONTENT: CENTRALIZED CARD --- */}
      
      <div style={{ 
        width: "100%", 
        maxWidth: "440px",
        padding: "56px 52px", 
        backgroundColor: "rgba(10,10,10,0.8)", 
        backdropFilter: "blur(40px)", 
        border: "1px solid rgba(255,255,255,0.06)", 
        zIndex: 10,
        position: "relative",
        boxShadow: "0 60px 120px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.04)"
      }}>
        
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "52px" }}>
          <Image src="/logo-coliseu.svg" alt="Coliseu" width={180} height={36} priority style={{ display: "inline-block" }} />
        </div>

        {/* Title Block */}
        <div style={{ marginBottom: "40px" }}>
          <h2 style={{ 
            fontSize: "11px", 
            fontWeight: 700, 
            fontFamily: "'Inter', sans-serif", 
            margin: "0 0 12px 0", 
            letterSpacing: "0.3em", 
            color: "rgba(255,255,255,0.4)",
            textTransform: "uppercase"
          }}>
            — Acesso à Plataforma —
          </h2>
        </div>

        <form action={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "0" }}>
          
          {/* E-mail */}
          <div style={{ marginBottom: "32px" }}>
            <label style={{ 
              display: "block", 
              fontSize: "9px", 
              fontWeight: 700, 
              color: "var(--red)", 
              letterSpacing: "0.3em", 
              marginBottom: "14px", 
              textTransform: "uppercase" 
            }}>
              E-mail
            </label>
            <div style={{ position: "relative" }}>
              <input
                type="email"
                name="email"
                required
                placeholder="seu@email.com"
                style={{ 
                  width: "100%", 
                  background: "transparent", 
                  border: "none", 
                  borderBottom: "1px solid rgba(255,255,255,0.1)", 
                  padding: "10px 0 12px 0",
                  fontSize: "16px",
                  color: "rgba(255,255,255,0.9)",
                  outline: "none",
                  fontFamily: "'Inter', sans-serif",
                  letterSpacing: "0.02em"
                }}
                className="elite-input"
              />
              <div className="input-focus-line" />
            </div>
          </div>

          {/* Password */}
          <div style={{ marginBottom: "40px" }}>
            <label style={{ 
              display: "block", 
              fontSize: "9px", 
              fontWeight: 700, 
              color: "var(--red)", 
              letterSpacing: "0.3em", 
              marginBottom: "14px", 
              textTransform: "uppercase" 
            }}>
              Senha
            </label>
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                required
                placeholder="••••••••"
                style={{ 
                  width: "100%", 
                  background: "transparent", 
                  border: "none", 
                  borderBottom: "1px solid rgba(255,255,255,0.1)", 
                  padding: "10px 0 12px 0",
                  paddingRight: "30px",
                  fontSize: "16px",
                  color: "rgba(255,255,255,0.9)",
                  outline: "none",
                  fontFamily: "'Inter', sans-serif"
                }}
                className="elite-input"
              />
              <div className="input-focus-line" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: "absolute", right: "0", bottom: "12px", background: "none", border: "none", color: "rgba(255,255,255,0.2)", cursor: "pointer", padding: 0, lineHeight: 1 }}
              >
                {showPassword ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                )}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{ marginBottom: "24px", padding: "12px 16px", borderLeft: "2px solid var(--red)", background: "rgba(227,27,35,0.05)", color: "var(--red)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.05em" }}>
              {error.toUpperCase()}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="elite-btn"
            style={{ 
              width: "100%",
              backgroundColor: "var(--red)", 
              color: "white", 
              border: "none", 
              padding: "18px", 
              fontSize: "13px", 
              fontWeight: 900, 
              fontFamily: "'Outfit', sans-serif", 
              letterSpacing: "0.25em", 
              cursor: "pointer", 
              boxShadow: "0 8px 32px rgba(227,27,35,0.25)",
              transition: "all 0.3s",
              marginBottom: "32px"
            }}
          >
            {loading ? "VERIFICANDO..." : "ENTRAR"}
          </button>

          {/* Footer Row */}
          <div style={{ 
            borderTop: "1px solid rgba(255,255,255,0.05)", 
            paddingTop: "20px",
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center" 
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div className="blinking-dot" style={{ width: "5px", height: "5px", borderRadius: "50%", backgroundColor: "#22c55e" }} />
              <span style={{ fontSize: "8px", fontWeight: 700, letterSpacing: "0.15em", color: "rgba(255,255,255,0.15)", textTransform: "uppercase" }}>Secure</span>
            </div>
            <Link href="#" style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)", textDecoration: "none", letterSpacing: "0.05em", transition: "color 0.2s" }}>
              Criar conta →
            </Link>
          </div>

        </form>
      </div>

      <style jsx global>{`
        @keyframes scan {
          0% { top: -2px; }
          100% { top: 100vh; }
        }
        @keyframes float {
          0% { transform: translateY(0) translateX(0); opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 1; }
          100% { transform: translateY(-60px) translateX(15px); opacity: 0; }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.2; }
        }
        .scanner-line { 
          animation: scan 8s linear infinite; 
        }
        .blinking-dot { animation: blink 2s infinite; }
        .elite-input:focus ~ .input-focus-line { width: 100%; }
        .input-focus-line {
          position: absolute;
          bottom: 0;
          left: 0;
          width: 0;
          height: 1px;
          background-color: var(--red);
          box-shadow: 0 0 8px var(--red);
          transition: width 0.5s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .elite-btn:hover {
          filter: brightness(1.1);
          transform: translateY(-1px);
          box-shadow: 0 16px 48px rgba(227,27,35,0.4) !important;
        }
        .elite-btn:active { transform: translateY(0px); }
        .elite-btn:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>

    </div>
  );
}

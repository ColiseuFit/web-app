"use client";

import { useState, useEffect } from "react";
import { login } from "../actions";
import Link from "next/link";
import Image from "next/image";
import { LoginCarousel, slides, AUTOPLAY_INTERVAL } from "@/components/auth/LoginCarousel";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Componente de Página de Login "Iron Monolith".
 * 
 * Implementa um layout split-screen de alto impacto visual (Brutalismo/AdiClub style).
 * 
 * @ux
 * - Estado "landing": Exibe chamadas de impacto (carousel) e botões principais.
 * - Estado "login": Transiciona suavemente para o formulário de credenciais.
 * - Responsividade: 50/50 vertical no mobile (com scroll adaptativo) e layout horizontal 60/40 no desktop.
 * 
 * @security
 * - Formulário validado via Supabase Auth Server Actions.
 * - Proteção contra autofill indesejado via CSS customizado.
 */
export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [view, setView] = useState<"landing" | "login">("landing");

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, AUTOPLAY_INTERVAL);
    return () => clearInterval(timer);
  }, []);

  /**
   * Processa a tentativa de login do usuário.
   * 
   * @param {FormData} formData - Objeto contendo email e password.
   * @action Chama a Server Action `login` e gerencia estados de erro e loading.
   */
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
    <div
      className="login-root w-full h-screen text-white font-inter overflow-hidden bg-[#050505]"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100dvh",
      }}
    >
      {/* ══════════════════════════════════════════════════════
          TOP / LEFT — Image Panel
          Mobile: fixed 50vh height
          Desktop: right-side column (via parent flex-direction override)
          ══════════════════════════════════════════════════════ */}
      <div
        className="login-image-panel relative overflow-hidden"
        style={{
          height: view === "login" ? "clamp(80px, 15vh, 180px)" : "clamp(180px, 42vh, 60%)",
          flexShrink: 0,
          transition: "height 0.5s cubic-bezier(0.16, 1, 0.3, 1)"
        }}
      >
        <LoginCarousel currentIndex={currentSlide} />

        {/* Logo — always visible over image */}
        <div className="absolute top-5 left-5 z-20">
          <Image
            src="/logo-coliseu.svg"
            alt="Coliseu"
            width={100}
            height={20}
            priority
            className="drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]"
          />
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          BOTTOM / RIGHT — Content Panel
          Mobile: remaining 50% viewport height
          Uses flex-col with text top, buttons bottom
          ══════════════════════════════════════════════════════ */}
      <div
        className="login-content-panel flex flex-col bg-[#050505]"
        style={{ flex: 1, overflowY: view === "login" ? "auto" : "hidden", overflowX: "hidden" }}
      >
        {/* Padded inner — full height flex-col */}
        <div
          className={`flex flex-col h-full transition-all duration-700 ${view === "login" ? "login-inner-form" : "login-inner-landing"}`}
          style={{ 
            padding: "clamp(16px, 3vh, 28px) 24px",
            justifyContent: view === "landing" ? "space-between" : "flex-start"
          }}
        >

          {/* ── SLIDE TEXT (hidden on mobile when login form is open) ── */}
          <div className={`flex-shrink-0 ${view === "login" ? "slide-text-login" : ""}`} style={{ marginBottom: view === "landing" ? "0" : "20px" }}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={currentSlide}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              >
                <span
                  className="block font-bold uppercase"
                  style={{
                    color: "#E31B23",
                    fontSize: "10px",
                    letterSpacing: "0.3em",
                    marginBottom: "6px",
                  }}
                >
                  {slides[currentSlide].tagline}
                </span>
                <h1
                  className="font-outfit font-black uppercase m-0"
                  style={{
                    fontSize: "clamp(1.8rem, 7vw, 3rem)",
                    lineHeight: 1.0,
                    letterSpacing: "-0.01em",
                  }}
                >
                  {slides[currentSlide].title}
                </h1>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* ── ACTIONS ── */}
          <div className="flex-shrink-0 w-full">
            <AnimatePresence mode="wait" initial={false}>

              {/* LANDING: two big buttons */}
              {view === "landing" && (
                <motion.div
                  key="landing"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  className="flex flex-col"
                  style={{ gap: "10px" }}
                >
                  {/* CENTRALIZED PROGRESS INDICATORS (Adidas style) */}
                  <div className="flex justify-center gap-[6px] items-center mb-6">
                    {slides.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentSlide(i)}
                        className="h-[2px] overflow-hidden bg-white/20 cursor-pointer border-none p-0 transition-all duration-500"
                        style={{ width: i === currentSlide ? "24px" : "16px" }}
                      >
                        {i === currentSlide && (
                          <motion.div
                            initial={{ width: "0%" }}
                            animate={{ width: "100%" }}
                            transition={{ duration: AUTOPLAY_INTERVAL / 1000, ease: "linear" }}
                            className="h-full bg-white"
                          />
                        )}
                      </button>
                    ))}
                  </div>

                  {/* ENTRAR */}
                  <button
                    onClick={() => setView("login")}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "18px 20px",
                      background: "white",
                      color: "#050505",
                      border: "none",
                      fontSize: "12px",
                      fontFamily: "Outfit, sans-serif",
                      fontWeight: 900,
                      letterSpacing: "0.2em",
                      textTransform: "uppercase",
                      cursor: "pointer",
                      transition: "all 0.25s",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = "#E31B23";
                      (e.currentTarget as HTMLButtonElement).style.color = "white";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = "white";
                      (e.currentTarget as HTMLButtonElement).style.color = "#050505";
                    }}
                  >
                    <span>ENTRAR</span>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </button>

                  {/* MATRICULAR */}
                  <button
                    type="button"
                    onClick={() => window.open("https://wa.me/5573999911525", "_blank")}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "18px 20px",
                      background: "transparent",
                      color: "white",
                      border: "1px solid rgba(255,255,255,0.12)",
                      fontSize: "12px",
                      fontFamily: "Outfit, sans-serif",
                      fontWeight: 900,
                      letterSpacing: "0.2em",
                      textTransform: "uppercase",
                      cursor: "pointer",
                      transition: "all 0.25s",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.4)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.12)";
                    }}
                  >
                    <span>PRIMEIRO ACESSO</span>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </button>

                  <p style={{ textAlign: "center", fontSize: "10px", color: "rgba(255,255,255,0.12)", letterSpacing: "0.1em", marginTop: "6px" }}>
                    COLISEU CLUBE © {new Date().getFullYear()}
                  </p>
                </motion.div>
              )}

              {/* LOGIN FORM */}
              {view === "login" && (
                <motion.div
                  key="login-form"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                >
                  {/* Back */}
                  <button
                    type="button"
                    onClick={() => { setView("landing"); setError(null); }}
                    className="group"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      color: "rgba(255,255,255,0.6)",
                      fontSize: "11px",
                      fontWeight: 800,
                      letterSpacing: "0.2em",
                      textTransform: "uppercase",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      marginBottom: "24px",
                      padding: 0,
                      transition: "color 0.2s"
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = "white"}
                    onMouseLeave={(e) => e.currentTarget.style.color = "rgba(255,255,255,0.6)"}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square" className="transition-transform group-hover:-translate-x-1">
                      <path d="M19 12H5M12 19l-7-7 7-7" />
                    </svg>
                    VOLTAR
                  </button>

                  <form action={handleSubmit} className="flex flex-col" style={{ gap: "20px" }}>
                    {/* Email */}
                    <div>
                      <label style={{ display: "block", fontSize: "10px", fontWeight: 800, color: "#E31B23", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "8px" }}>
                        E-mail
                      </label>
                      <input
                        type="email"
                        name="email"
                        required
                        autoFocus
                        placeholder="seu@email.com"
                        style={{
                          width: "100%",
                          background: "#0A0A0A",
                          border: "1px solid rgba(255,255,255,0.1)",
                          padding: "16px",
                          fontSize: "16px",
                          color: "white",
                          outline: "none",
                          fontFamily: "Inter, sans-serif",
                          transition: "border-color 0.3s",
                        }}
                        onFocus={(e) => e.currentTarget.style.borderColor = "#E31B23"}
                        onBlur={(e) => e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"}
                      />
                    </div>

                    {/* Password */}
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "8px" }}>
                        <label style={{ fontSize: "10px", fontWeight: 800, color: "#E31B23", letterSpacing: "0.2em", textTransform: "uppercase" }}>
                          Senha
                        </label>
                        <Link href="https://wa.me/5573999911525" target="_blank" style={{ fontSize: "10px", color: "rgba(255,255,255,0.6)", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700, textDecoration: "underline" }}>
                          Esqueceu?
                        </Link>
                      </div>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          name="password"
                          required
                          placeholder="••••••••"
                          style={{
                            width: "100%",
                            background: "#0A0A0A",
                            border: "1px solid rgba(255,255,255,0.1)",
                            padding: "16px",
                            paddingRight: "48px",
                            fontSize: "16px",
                            color: "white",
                            outline: "none",
                            letterSpacing: "0.2em",
                            fontFamily: "Inter, sans-serif",
                            transition: "border-color 0.3s",
                          }}
                          onFocus={(e) => e.currentTarget.style.borderColor = "#E31B23"}
                          onBlur={(e) => e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          style={{ position: "absolute", right: "16px", top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", padding: 0 }}
                        >
                          {showPassword ? (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                              <line x1="1" y1="1" x2="23" y2="23" />
                            </svg>
                          ) : (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Error */}
                    {error && (
                      <div style={{ padding: "10px 14px", borderLeft: "2px solid #E31B23", background: "rgba(227,27,35,0.05)", color: "#E31B23", fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                        {error}
                      </div>
                    )}

                    {/* Submit */}
                    <button
                      type="submit"
                      disabled={loading}
                      className="group relative overflow-hidden"
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "16px 20px",
                        background: "#E31B23",
                        color: "white",
                        border: "none",
                        fontSize: "12px",
                        fontFamily: "Outfit, sans-serif",
                        fontWeight: 900,
                        letterSpacing: "0.2em",
                        textTransform: "uppercase",
                        cursor: loading ? "not-allowed" : "pointer",
                        opacity: loading ? 0.5 : 1,
                        transition: "filter 0.2s",
                        marginTop: "4px",
                      }}
                      onMouseEnter={(e) => { if (!loading) (e.currentTarget as HTMLButtonElement).style.filter = "brightness(1.15)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.filter = "brightness(1)"; }}
                    >
                      <span className="relative z-10">{loading ? "VERIFICANDO..." : "ENTRAR"}</span>
                      <svg className="relative z-10" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </button>

                    <p style={{ textAlign: "center", fontSize: "9px", color: "rgba(255,255,255,0.1)", letterSpacing: "0.15em", textTransform: "uppercase", fontWeight: 700, marginTop: "16px" }}>
                      COLISEU © {new Date().getFullYear()}
                    </p>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          DESKTOP OVERRIDE — side-by-side via CSS only
          We apply a media-query style override below
          ══════════════════════════════════════════════════════ */}
      <style>{`
        /* ── Mobile: hide slide title when login form is open ── */
        .slide-text-login {
          display: none;
        }

        /* ── Mobile: form padding compact ── */
        .login-inner-form {
          padding-top: 20px !important;
          padding-bottom: 20px !important;
          min-height: 100%;
        }

        /* ── Mobile: inputs compact ── */
        @media (max-width: 639px) {
          .login-inner-form input {
            padding: 13px 16px !important;
            font-size: 16px !important; /* >= 16px prevents iOS auto-zoom on focus */
          }
          .login-inner-form button[type="submit"] {
            padding: 14px 18px !important;
          }
        }

        /* ── Desktop overrides ── */
        @media (min-width: 1024px) {
          /* Root becomes a row */
          .login-root {
            flex-direction: row !important;
          }
          /* Image panel: fill remaining space on the left */
          .login-image-panel {
            height: 100% !important;
            flex: 1 1 0% !important;
          }
          /* Content panel: fixed 420px column on the right */
          .login-content-panel {
            width: 420px !important;
            flex-shrink: 0 !important;
            border-left: 1px solid rgba(255,255,255,0.04) !important;
            overflow: hidden !important;
          }
          /* Show slide title on desktop even in login view */
          .slide-text-login {
            display: block !important;
          }
          /* Desktop inner padding */
          .login-inner-form,
          .login-inner-landing {
            padding: 40px !important;
            justify-content: space-between !important;
          }
          .login-inner-form {
            justify-content: center !important;
          }
        }
        @media (min-width: 1280px) {
          .login-content-panel {
            width: 460px !important;
          }
        }
        /* Remove Next.js dev overlay from blocking view */
        nextjs-portal { display: none !important; }

        /* Fix autofill colors */
        input:-webkit-autofill,
        input:-webkit-autofill:hover, 
        input:-webkit-autofill:focus, 
        input:-webkit-autofill:active{
            -webkit-box-shadow: 0 0 0 30px #0A0A0A inset !important;
            -webkit-text-fill-color: white !important;
            transition: background-color 5000s ease-in-out 0s;
        }
      `}</style>
    </div>
  );
}

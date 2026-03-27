"use client";

import Link from "next/link";
import { logout } from "@/app/(auth)/actions";

/**
 * Header unificado para as páginas do Aluno.
 * Contém o branding do Coliseu e o botão de Logout/SAIR.
 */
export default function StudentHeader() {
  return (
    <header style={{
      background: "rgba(19,19,19,0.9)",
      backdropFilter: "blur(40px)",
      position: "sticky",
      top: 0,
      zIndex: 100,
      padding: "16px",
      borderBottom: "1px solid var(--border-glow)",
    }}>
      <div style={{ maxWidth: "480px", margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Link href="/dashboard" style={{ textDecoration: "none", display: "flex", alignItems: "center" }}>
          <img 
            src="/logo-coliseu-white.svg" 
            alt="Coliseu" 
            style={{ height: "18px", width: "auto" }} 
          />
        </Link>
        
        <form action={logout}>
          <button
            type="submit"
            style={{
              background: "transparent",
              border: "1px solid var(--border-glow)",
              color: "var(--text-dim)",
              padding: "6px 12px",
              fontSize: "10px",
              fontWeight: 800,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              cursor: "pointer",
              transition: "var(--transition)",
            }}
            onMouseOver={(e) => (e.currentTarget.style.color = "var(--text)")}
            onMouseOut={(e) => (e.currentTarget.style.color = "var(--text-dim)")}
          >
            SAIR
          </button>
        </form>
      </div>
    </header>
  );
}

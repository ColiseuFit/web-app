"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { User } from "lucide-react";
import { logout } from "@/app/(auth)/actions";

/**
 * Header unificado para as páginas do Aluno.
 * Contém o branding do Coliseu e o botão de Logout/SAIR.
 */
export default function StudentHeader() {
  return (
    <header style={{
      background: "var(--nb-bg)",
      position: "sticky",
      top: 0,
      zIndex: 200,
      /* 
        Safe Area Fix (PWA / viewport-fit=cover):
        env(safe-area-inset-top) retorna a altura da status bar/notch do iOS.
        O padding-top é calculado como: safe area + espaçamento interno (16px).
        Em Androids e navegadores normais, env() retorna 0 e o layout não é afetado.
      */
      paddingTop: "calc(env(safe-area-inset-top) + 16px)",
      paddingBottom: "16px",
      paddingLeft: "16px",
      paddingRight: "16px",
      borderBottom: "2px solid #000",
    }}>
      <div style={{ maxWidth: "480px", margin: "0 auto", display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center" }}>
        
        {/* Lado esquerdo: Menu hambúrguer */}
        <div style={{ display: "flex", justifyContent: "flex-start" }}>
          <StudentMenu />
        </div>

        {/* Centro: Logo */}
        <Link href="/dashboard" style={{ textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src="/logo-coliseu-black.svg" 
            alt="Coliseu" 
            width={120}
            height={18}
            loading="eager"
            style={{ display: "block" }}
          />
        </Link>
        
        {/* Lado direito: Ícone de Perfil */}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Link 
            href="/profile"
            aria-label="Perfil do Aluno"
            style={{ 
              color: "#000", 
              background: "#FFF",
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center", 
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              border: "2px solid #000",
              boxShadow: "2px 2px 0px #000",
              textDecoration: "none",
              transition: "all 0.1s ease"
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = "translate(2px, 2px)";
              e.currentTarget.style.boxShadow = "0px 0px 0px #000";
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = "translate(0, 0)";
              e.currentTarget.style.boxShadow = "2px 2px 0px #000";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translate(0, 0)";
              e.currentTarget.style.boxShadow = "2px 2px 0px #000";
            }}
          >
            <User size={18} strokeWidth={3} />
          </Link>
        </div>
      </div>
    </header>
  );
}

function StudentMenu() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        style={{
          background: "transparent",
          border: "none",
          cursor: "pointer",
          padding: "8px",
          display: "flex",
          flexDirection: "column",
          gap: "4px",
          alignItems: "flex-start"
        }}
        aria-label="Abrir menu"
      >
        <div style={{ width: "24px", height: "3px", background: "#000" }} />
        <div style={{ width: "24px", height: "3px", background: "#000" }} />
        <div style={{ width: "16px", height: "3px", background: "#000" }} />
      </button>

      {/* Overlay Escuro */}
      {isOpen && (
        <div 
          onClick={() => setIsOpen(false)}
          style={{
            position: "fixed",
            top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 999
          }}
        />
      )}

      {/* Drawer Neo-Brutalista */}
      <div 
        style={{
          position: "fixed",
          top: 0,
          left: isOpen ? 0 : "-100%",
          bottom: 0,
          width: "280px",
          background: "#FFF",
          borderRight: "2px solid #000",
          boxShadow: isOpen ? "4px 0px 0px #000" : "none",
          transition: "left 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
          zIndex: 1000,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header do Menu */}
        <div style={{ 
          padding: "20px", 
          borderBottom: "2px solid #000",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <span style={{ fontSize: "14px", fontWeight: 900, background: "#000", color: "#FFF", padding: "4px 8px" }}>
            MENU
          </span>
          <button 
            onClick={() => setIsOpen(false)}
            style={{ background: "transparent", border: "none", fontSize: "24px", cursor: "pointer", lineHeight: 1 }}
          >
            &times;
          </button>
        </div>

        {/* Links do Menu (podemos adicionar mais no futuro) */}
        <div style={{ flex: 1, padding: "20px" }}>
           {/* Reservado para futuros links como "Perfil", "Configurações", etc */}
        </div>
        
        {/* Footer do Menu com Botão de Sair */}
        <div style={{ padding: "20px", borderTop: "2px solid #000" }}>
          <form action={logout}>
            <button
              type="submit"
              style={{
                width: "100%",
                padding: "16px",
                fontSize: "12px",
                fontWeight: 900,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                cursor: "pointer",
                background: "#000",
                color: "#FFF",
                border: "2px solid #000",
                boxShadow: "4px 4px 0px #E31B23",
                transition: "all 0.1s ease"
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.transform = "translate(2px, 2px)";
                e.currentTarget.style.boxShadow = "2px 2px 0px #E31B23";
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = "translate(0, 0)";
                e.currentTarget.style.boxShadow = "4px 4px 0px #E31B23";
              }}
            >
              SAIR DA CONTA
            </button>
          </form>
        </div>
      </div>
    </>
  );
}

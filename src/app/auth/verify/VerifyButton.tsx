"use client";

import { useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";

/**
 * Botão de ativação de conta no fluxo de onboarding.
 * Usa estilos inline para evitar interferência do CSS global do painel escuro.
 *
 * @param {string} link - O action_link gerado pelo Supabase para ser processado.
 */
export default function VerifyButton({ link }: { link: string }) {
  const [clicked, setClicked] = useState(false);

  const handleClick = () => {
    if (link === "[object Promise]") {
      console.error("Link inválido — recebeu Promise em vez de string.");
      alert("Erro na ativação: Link inválido. Por favor, tente novamente.");
      return;
    }
    setClicked(true);
    window.location.href = link;
  };

  return (
    <button
      onClick={handleClick}
      disabled={clicked}
      style={{
        width: "100%",
        height: "60px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "12px",
        backgroundColor: clicked ? "#999" : "#E31B23",
        color: "#ffffff",
        border: "3px solid #000000",
        boxShadow: clicked ? "none" : "5px 5px 0px #000000",
        cursor: clicked ? "not-allowed" : "pointer",
        fontSize: "15px",
        fontWeight: 900,
        fontFamily: "'Outfit', 'Inter', sans-serif",
        textTransform: "uppercase",
        letterSpacing: "0.12em",
        transition: "all 0.15s ease",
        transform: clicked ? "translate(3px, 3px)" : "translate(0, 0)",
        outline: "none",
      }}
      onMouseEnter={(e) => {
        if (!clicked) {
          (e.currentTarget as HTMLButtonElement).style.transform = "translate(3px, 3px)";
          (e.currentTarget as HTMLButtonElement).style.boxShadow = "2px 2px 0px #000000";
        }
      }}
      onMouseLeave={(e) => {
        if (!clicked) {
          (e.currentTarget as HTMLButtonElement).style.transform = "translate(0, 0)";
          (e.currentTarget as HTMLButtonElement).style.boxShadow = "5px 5px 0px #000000";
        }
      }}
    >
      {clicked ? (
        <>
          <Loader2 size={20} style={{ animation: "spin 1s linear infinite" }} />
          ATIVANDO...
        </>
      ) : (
        <>
          ATIVAR MINHA CONTA
          <ArrowRight size={20} />
        </>
      )}
    </button>
  );
}

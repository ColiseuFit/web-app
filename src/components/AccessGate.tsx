"use client";

import { Lock, X } from "lucide-react";

interface AccessGateProps {
  message: string;
  upgradeLink: string | null;
  /** Se verdadeiro, renderiza como um modal centralizado. Se falso, renderiza como uma seção inline. */
  isModal?: boolean;
  onClose?: () => void;
  title?: string;
}

/**
 * AccessGate Component
 * 
 * Componente Neo-Brutalist unificado para restrição de acesso por plano (Paywall).
 * Utilizado para membros `club_pass` em funcionalidades exclusivas `club_premium`.
 * 
 * @behavior
 * - Modo Inline: Exibe uma seção de alerta dentro do layout da página.
 * - Modo Modal: Exibe um modal fixo com fundo escurecido.
 */
export default function AccessGate({ 
  message, 
  upgradeLink, 
  isModal = false, 
  onClose,
  title = "ACESSO RESTRITO"
}: AccessGateProps) {
  
  const content = (
    <div
      style={{
        background: "#FFF",
        border: "3px solid #000",
        boxShadow: isModal ? "12px 12px 0px #000" : "10px 10px 0px #000",
        position: "relative",
        overflow: "hidden",
        padding: "40px 24px",
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "24px",
        maxWidth: isModal ? "400px" : "100%",
        width: "100%",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Ribbon Diagonal */}
      <div style={{
        position: "absolute",
        top: "20px",
        right: "-40px",
        background: "#000",
        color: "#FFF",
        borderTop: "2px solid #000",
        borderBottom: "2px solid #000",
        padding: "4px 40px",
        transform: "rotate(45deg)",
        fontSize: "10px",
        fontWeight: 900,
        letterSpacing: "0.2em",
        zIndex: 10
      }}>
        PREMIUM
      </div>

      {isModal && onClose && (
        <button
          onClick={onClose}
          style={{
            position: "absolute", top: 12, right: 12,
            background: "none", border: "none", cursor: "pointer", padding: 4
          }}
        >
          <X size={20} strokeWidth={3} />
        </button>
      )}

      <div style={{
        width: "80px",
        height: "80px",
        background: "#F0F0F0",
        border: "3px solid #000",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "4px 4px 0px #000",
        borderRadius: "50%"
      }}>
        <Lock size={40} color="#000" strokeWidth={2.5} />
      </div>

      <div>
        <h2 className="font-display" style={{ fontSize: "28px", fontWeight: 950, color: "#000", lineHeight: 1, marginBottom: "12px", textTransform: "uppercase" }}>
          {title}
        </h2>
        <p className="font-headline" style={{ fontSize: "12px", fontWeight: 800, color: "#000", letterSpacing: "0.05em", opacity: 0.7, lineHeight: 1.6 }}>
          {message}
        </p>
      </div>

      {upgradeLink && (
        <a 
          href={upgradeLink}
          target="_blank"
          rel="noopener noreferrer"
          style={{ 
            display: "inline-block", 
            background: "#E31B23", 
            color: "#FFF", 
            padding: "12px 28px", 
            fontSize: "13px", 
            fontWeight: 900, 
            letterSpacing: "0.1em", 
            border: "2px solid #000",
            textDecoration: "none",
            boxShadow: "4px 4px 0px #000"
          }}
        >
          SEJA CLUBE PREMIUM
        </a>
      )}
    </div>
  );

  if (isModal) {
    return (
      <div
        style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(0,0,0,0.8)",
          zIndex: 1000,
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "20px"
        }}
        onClick={onClose}
      >
        {content}
      </div>
    );
  }

  return content;
}

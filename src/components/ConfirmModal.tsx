"use client";

import { useEffect, useState } from "react";

/**
 * INTERCEPTOR DE AÇÕES CRÍTICAS (ConfirmModal).
 * 
 * @architecture
 * - Design Neo-Brutalista: Bordas de 4px, sombras sólidas (16px) e alto contraste.
 * - Hierarquia Visual: `isDanger=true` aplica o tema Red Coliseu (#E31B23).
 * - Backdrop Blur: Desfoque de 8px para isolação cognitiva.
 * 
 * @technical
 * - Scroll Locking: Manipulação direta de `document.body.style.overflow`.
 * - Event Handling: Previne navegação acidental durante confirmações críticas.
 */
interface ConfirmModalProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDanger?: boolean;
  challengeText?: string;
}

export default function ConfirmModal({
  title,
  message,
  confirmLabel = "CONFIRMAR",
  cancelLabel = "CANCELAR",
  onConfirm,
  onCancel,
  isDanger = true,
  challengeText,
}: ConfirmModalProps) {
  const [typedChallenge, setTypedChallenge] = useState("");
  const isChallengeValid = !challengeText || typedChallenge === challengeText;
  
  // Bloquear scroll ao abrir
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(255,255,255,0.4)",
      backdropFilter: "blur(8px)",
      zIndex: 3000,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px"
    }}>
      <div style={{
        backgroundColor: "#FFFFFF",
        border: "4px solid #000000",
        width: "100%",
        maxWidth: "420px",
        position: "relative",
        boxShadow: "16px 16px 0px 0px rgba(0,0,0,1)",
        padding: "40px 32px"
      }}>
        {/* Ícone de Alerta Brutalista */}
        <div style={{
          position: "absolute",
          top: "-24px",
          left: "32px",
          background: isDanger ? "#E31B23" : "#000000",
          color: "#FFF",
          padding: "8px 16px",
          border: "4px solid #000000",
          fontWeight: 900,
          fontSize: "12px",
          letterSpacing: "0.1em",
          boxShadow: "4px 4px 0px #000000"
        }}>
          ATENÇÃO
        </div>

        <h3 style={{ 
          fontFamily: "'Outfit', sans-serif",
          fontSize: "28px", 
          fontWeight: 900,
          lineHeight: 1.1, 
          marginBottom: "16px",
          color: "#000000",
          textTransform: "uppercase"
        }}>
          {title}
        </h3>
        
        <p style={{ 
          fontSize: "14px", 
          color: "#333333", 
          lineHeight: 1.6,
          fontWeight: 700,
          marginBottom: "40px"
        }}>
          {message}
        </p>

        {challengeText && (
          <div style={{ marginBottom: "24px" }}>
            <p style={{ fontSize: "11px", fontWeight: 900, marginBottom: "8px", color: "#666" }}>
              PARA CONTINUAR, DIGITE <strong>{challengeText}</strong>:
            </p>
            <input
              type="text"
              value={typedChallenge}
              onChange={(e) => setTypedChallenge(e.target.value)}
              placeholder="Digite aqui..."
              autoFocus
              style={{
                width: "100%",
                padding: "14px",
                border: "3px solid #000",
                fontWeight: 900,
                fontSize: "14px",
                backgroundColor: "#F9F9F9",
                outline: "none",
                boxSizing: "border-box"
              }}
            />
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <button
            onClick={onConfirm}
            disabled={!isChallengeValid}
            style={{
              padding: "18px",
              background: isDanger ? (isChallengeValid ? "#E31B23" : "#FEE2E2") : (isChallengeValid ? "#000000" : "#E5E7EB"),
              color: isChallengeValid ? "#FFFFFF" : "#999",
              border: "4px solid #000000",
              fontWeight: 900,
              fontSize: "14px",
              letterSpacing: "0.1em",
              cursor: isChallengeValid ? "pointer" : "not-allowed",
              textTransform: "uppercase",
              fontFamily: "'Outfit', sans-serif",
              transition: "all 0.1s ease",
              boxShadow: isChallengeValid ? "4px 4px 0px #000000" : "none",
              transform: isChallengeValid ? "none" : "translate(2px, 2px)"
            }}
            onMouseDown={e => {
              if (isChallengeValid) e.currentTarget.style.transform = "translate(2px, 2px)";
            }}
            onMouseUp={e => {
              if (isChallengeValid) e.currentTarget.style.transform = "none";
            }}
          >
            {confirmLabel}
          </button>
          
          <button
            onClick={onCancel}
            style={{
              padding: "16px",
              background: "#FFFFFF",
              color: "#000000",
              border: "4px solid #000000",
              fontWeight: 900,
              fontSize: "14px",
              letterSpacing: "0.1em",
              cursor: "pointer",
              textTransform: "uppercase",
              fontFamily: "'Outfit', sans-serif"
            }}
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

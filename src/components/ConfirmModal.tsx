"use client";

import { useEffect } from "react";

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
}

export default function ConfirmModal({
  title,
  message,
  confirmLabel = "CONFIRMAR",
  cancelLabel = "CANCELAR",
  onConfirm,
  onCancel,
  isDanger = true,
}: ConfirmModalProps) {
  
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

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <button
            onClick={onConfirm}
            style={{
              padding: "18px",
              background: isDanger ? "#E31B23" : "#000000",
              color: "#FFFFFF",
              border: "4px solid #000000",
              fontWeight: 900,
              fontSize: "14px",
              letterSpacing: "0.1em",
              cursor: "pointer",
              textTransform: "uppercase",
              fontFamily: "'Outfit', sans-serif",
              transition: "transform 0.1s ease",
              boxShadow: "4px 4px 0px #000000"
            }}
            onMouseDown={e => e.currentTarget.style.transform = "translate(2px, 2px)"}
            onMouseUp={e => e.currentTarget.style.transform = "none"}
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

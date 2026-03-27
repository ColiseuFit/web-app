"use client";

import { useEffect } from "react";

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
      backgroundColor: "rgba(0,0,0,0.85)",
      backdropFilter: "blur(4px)",
      zIndex: 3000,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px"
    }}>
      <div style={{
        backgroundColor: "var(--surface-lowest)",
        border: "1px solid var(--border-glow)",
        width: "100%",
        maxWidth: "340px",
        position: "relative",
        boxShadow: "0 0 50px rgba(0,0,0,0.5)"
      }}>
        {/* Linha de topo brutalista */}
        <div style={{ height: "4px", background: isDanger ? "var(--red)" : "var(--lvl-blue)", width: "100%" }} />

        <div style={{ padding: "32px 24px" }}>
          <h3 className="font-display" style={{ 
            fontSize: "24px", 
            lineHeight: 1, 
            marginBottom: "12px",
            color: isDanger ? "var(--red)" : "var(--text)"
          }}>
            {title.toUpperCase()}
          </h3>
          <p style={{ 
            fontSize: "12px", 
            color: "var(--text-dim)", 
            lineHeight: 1.5,
            letterSpacing: "0.02em",
            marginBottom: "32px"
          }}>
            {message}
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <button
              onClick={onConfirm}
              style={{
                padding: "16px",
                background: isDanger ? "var(--red)" : "var(--surface-highest)",
                color: "#fff",
                border: "none",
                fontWeight: 900,
                fontSize: "11px",
                letterSpacing: "0.25em",
                cursor: "pointer",
                textTransform: "uppercase",
                fontFamily: "var(--font-display)"
              }}
            >
              {confirmLabel}
            </button>
            <button
              onClick={onCancel}
              style={{
                padding: "16px",
                background: "transparent",
                color: "var(--text-muted)",
                border: "1px solid var(--border-glow)",
                fontWeight: 800,
                fontSize: "10px",
                letterSpacing: "0.2em",
                cursor: "pointer",
                textTransform: "uppercase"
              }}
            >
              {cancelLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

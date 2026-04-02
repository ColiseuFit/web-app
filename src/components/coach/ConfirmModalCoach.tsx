"use client";

import { useEffect } from "react";
import { X, AlertTriangle, CheckCircle2, UserX } from "lucide-react";

interface ConfirmModalCoachProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDanger?: boolean;
  showCancel?: boolean;
}

export default function ConfirmModalCoach({
  isOpen,
  title,
  message,
  confirmLabel = "CONFIRMAR",
  cancelLabel = "VOLTAR",
  onConfirm,
  onCancel,
  isDanger = false,
  showCancel = true,
}: ConfirmModalCoachProps) {
  
  // Bloquear scroll ao abrir
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0,0,0,0.75)",
      backdropFilter: "blur(5px)",
      zIndex: 5000,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "16px"
    }}>
      <div 
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: "#FFF",
          border: "4px solid #000",
          boxShadow: "10px 10px 0px #000",
          width: "100%",
          maxWidth: "380px",
          position: "relative",
          animation: "modalFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
          display: "flex",
          flexDirection: "column"
        }}
      >
        <style>
          {`
            @keyframes modalFadeIn {
              from { opacity: 0; transform: scale(0.95) translateY(10px); }
              to { opacity: 1; transform: scale(1) translateY(0); }
            }
          `}
        </style>

        {/* Header Decorativo */}
        <div style={{ 
          height: "8px", 
          background: isDanger ? "var(--red)" : "var(--yellow)", 
          width: "100%",
          borderBottom: "2px solid #000"
        }} />

        <div style={{ padding: "24px" }}>
          {/* Ícone Contextual */}
          <div style={{ 
            width: "56px", 
            height: "56px", 
            background: isDanger ? "rgba(255, 68, 68, 0.1)" : "rgba(255, 204, 0, 0.1)",
            border: "3px solid #000",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "20px"
          }}>
            {isDanger ? (
              <UserX size={28} color="var(--red)" />
            ) : (
              <AlertTriangle size={28} color="#000" />
            )}
          </div>

          <h3 className="font-display" style={{ 
            fontSize: "28px", 
            fontWeight: 900,
            lineHeight: 1.1, 
            marginBottom: "12px",
            color: "#000",
            textTransform: "uppercase",
            letterSpacing: "-0.02em"
          }}>
            {title}
          </h3>

          <p className="font-headline" style={{ 
            fontSize: "14px", 
            color: "rgba(0,0,0,0.8)", 
            lineHeight: 1.5,
            fontWeight: 600,
            marginBottom: "32px",
            background: "#F8F8F8",
            padding: "12px",
            borderLeft: "4px solid #000"
          }}>
            {message}
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <button
              onClick={onConfirm}
              className="font-display"
              style={{
                padding: "20px",
                background: isDanger ? "var(--red)" : "#000",
                color: "#FFF",
                border: "3px solid #000",
                fontWeight: 900,
                fontSize: "18px",
                letterSpacing: "0.05em",
                cursor: "pointer",
                textTransform: "uppercase",
                boxShadow: isDanger ? "4px 4px 0px #000" : "4px 4px 0px var(--yellow)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                transition: "transform 0.1s ease"
              }}
              onMouseDown={(e) => e.currentTarget.style.transform = "translate(2px, 2px)"}
              onMouseUp={(e) => e.currentTarget.style.transform = "none"}
            >
              <CheckCircle2 size={20} />
              {confirmLabel}
            </button>

            {showCancel && (
              <button
                onClick={onCancel}
                className="font-headline"
                style={{
                  padding: "16px",
                  background: "transparent",
                  color: "#000",
                  border: "none",
                  fontWeight: 800,
                  fontSize: "13px",
                  letterSpacing: "0.1em",
                  cursor: "pointer",
                  textTransform: "uppercase",
                  textDecoration: "underline",
                  marginTop: "4px"
                }}
              >
                {cancelLabel}
              </button>
            )}
          </div>
        </div>

        {/* Botão X Superior (Opcional) */}
        {showCancel && (
          <button 
            onClick={onCancel}
            style={{
              position: "absolute",
              top: "16px",
              right: "16px",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: "8px"
            }}
          >
            <X size={20} />
          </button>
        )}
      </div>
    </div>
  );
}

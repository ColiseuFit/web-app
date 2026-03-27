"use client";

import { useEffect, useState } from "react";

/**
 * Toast Notification (Brutalista / Iron Monolith).
 * Exibe mensagens de feedback com alto impacto visual.
 */
export default function Toast({ message, type = "success", duration = 4000, onClose }: { 
  message: string; 
  type?: "success" | "error"; 
  duration?: number;
  onClose: () => void;
}) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 500); // Wait for transition
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div
      style={{
        position: "fixed",
        bottom: "120px",
        left: "50%",
        transform: visible ? "translateX(-50%) translateY(0)" : "translateX(-50%) translateY(20px)",
        opacity: visible ? 1 : 0,
        zIndex: 9999,
        transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        pointerEvents: "none",
        width: "calc(100% - 40px)",
        maxWidth: "400px",
      }}
    >
      <div
        style={{
          background: "var(--bg)",
          border: `1px solid ${type === "success" ? "rgba(34,197,94,0.5)" : "var(--red)"}`,
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          gap: "16px",
          boxShadow: type === "success" 
            ? "0 10px 40px rgba(34,197,94,0.15)" 
            : "0 10px 40px rgba(227,27,35,0.15)",
        }}
      >
        <span className="material-symbols-outlined" style={{ 
          fontSize: "24px", 
          color: type === "success" ? "#22c55e" : "var(--red)" 
        }}>
          {type === "success" ? "task_alt" : "warning"}
        </span>
        <div style={{ flex: 1 }}>
          <p style={{ 
            fontSize: "12px", 
            fontWeight: 800, 
            letterSpacing: "0.1em", 
            color: type === "success" ? "#22c55e" : "var(--red)",
            textTransform: "uppercase",
            marginBottom: "2px"
          }}>
            {type === "success" ? "SISTEMA ATUALIZADO" : "FALHA NO PROTOCOLO"}
          </p>
          <p style={{ fontSize: "14px", color: "var(--text)", fontWeight: 500 }}>
            {message}
          </p>
        </div>
      </div>
    </div>
  );
}

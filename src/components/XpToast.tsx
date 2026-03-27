"use client";

import { useEffect, useState } from "react";

interface XpToastProps {
  xp: number;
  onComplete?: () => void;
}

/**
 * Animação brutalista de ganho de XP.
 * Exibida logo após a confirmação de check-in.
 * Desaparece automaticamente em 2.5s.
 */
export default function XpToast({ xp, onComplete }: XpToastProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onComplete?.();
    }, 2500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!visible) return null;

  return (
    <div style={{
      position: "fixed",
      top: "80px",
      left: "50%",
      transform: "translateX(-50%)",
      zIndex: 5000,
      animation: "xpToastIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards",
      pointerEvents: "none",
    }}>
      <div style={{
        background: "var(--surface-lowest)",
        border: "1px solid var(--red)",
        boxShadow: "0 0 40px rgba(227,27,35,0.3)",
        padding: "14px 28px",
        display: "flex",
        alignItems: "center",
        gap: "12px",
        whiteSpace: "nowrap",
      }}>
        {/* Linha de impacto */}
        <div style={{ width: "3px", height: "32px", background: "var(--red)", flexShrink: 0 }} />
        <div>
          <div style={{ fontSize: "8px", fontWeight: 800, letterSpacing: "0.2em", color: "var(--red)", textTransform: "uppercase" }}>
            VAGA CONFIRMADA
          </div>
          <div className="font-display" style={{ fontSize: "28px", lineHeight: 1, color: "#fff", fontWeight: 900 }}>
            +{xp} XP
          </div>
        </div>
        <span className="material-symbols-outlined" style={{ fontSize: "32px", color: "var(--red)" }}>
          bolt
        </span>
      </div>

      <style jsx global>{`
        @keyframes xpToastIn {
          0% { opacity: 0; transform: translateX(-50%) translateY(-20px) scale(0.95); }
          100% { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}

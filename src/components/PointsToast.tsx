"use client";

import { useEffect, useState } from "react";
import { Zap } from "lucide-react";

interface PointsToastProps {
  points: number;
  onComplete?: () => void;
}

/**
 * Toast de Recompensa de Pontos (Gamificação Ativa).
 * Exibido como feedback imediato após sinalização de check-in bem-sucedida.
 * 
 * @param {number} points - Quantidade de Pontos concedida para exibição proeminente.
 * @param {() => void} onComplete - Callback opcional disparado após a conclusão da animação.
 * 
 * @animation
 * - Entrada: Fade-in com escala (scale) e translação vertical (translateY) suavizada.
 * - Ciclo de Vida: Exibição estática por 2.5s seguida de destruição do componente (unmount).
 * 
 * @technical
 * - Posicionamento fixo de alta prioridade (Z-index 5000) para garantir visibilidade sobre modais.
 * - Utiliza Lucide-React `Zap` para paridade visual com o sistema de níveis.
 */
export default function PointsToast({ points, onComplete }: PointsToastProps) {
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
      animation: "pointsToastIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards",
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
            +{points} PTS
          </div>
        </div>
        <div style={{ color: "var(--red)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Zap size={32} fill="var(--red)" />
        </div>
      </div>

      <style jsx global>{`
        @keyframes pointsToastIn {
          0% { opacity: 0; transform: translateX(-50%) translateY(-20px) scale(0.95); }
          100% { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}

"use client";

import React, { useState } from "react";
import { X } from "lucide-react";
import { hapticSelect } from "@/lib/haptic";
import Link from "next/link";

interface LevelBadgeProps {
  level: {
    color: string;
    label: string;
    textColor: string;
    icon: string;
    id?: string;
  };
  description: string;
  size?: number;
  avatarUrl?: string | null;
}

/**
 * Componente de Identidade de Nível do Aluno.
 * Exibe o selo de autoridade do atleta com micro-animações e interatividade.
 * 
 * @param level Objeto contendo as propriedades visuais do nível (cor, label, ícone).
 * @param description Texto explicativo técnico sobre as exigências ou status do nível.
 * @param size Diâmetro base do componente em pixels.
 * 
 * @ux
 * - Pulseira de brilho (contourPulse) proporcional à raridade do nível.
 * - Modal adaptativo (Glassmorphism) com desfoque de fundo profundo.
 * - Integração com haptic engine para feedback tátil em dispositivos móveis.
 */
export default function LevelBadge({ level, description, size = 64, avatarUrl }: LevelBadgeProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleOpen = () => {
    try {
      hapticSelect();
    } catch (e) {
      // Ignorar se haptic não estiver disponível
    }
    setIsOpen(true);
  };

  const isElite = level.id === "L5" || level.label.includes("ELITE");

  return (
    <>
      <div 
        onClick={handleOpen}
        className={`level-icon-wrapper ${avatarUrl ? "" : (isElite ? "level-icon-contour-gold" : "level-icon-contour-glow")}`} 
        style={{ 
          width: `${size}px`, 
          height: `${size}px`,
          cursor: "pointer",
          transition: "transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative"
        }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.08) rotate(3deg)")}
        onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1) rotate(0deg)")}
      >
        {avatarUrl ? (
          <div style={{ width: "100%", height: "100%", position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {/* MOLDURA ORIGINAL DO NÍVEL (BASE) */}
            <img 
              src={level.icon} 
              alt="" 
              style={{ 
                width: "100%", height: "100%", objectFit: "contain",
                filter: "brightness(0.8)" // Deixa a moldura levemente mais escura para destacar a foto
              }} 
            />
            
            {/* FOTO DO ATLETA (OVERLAY MASCARADO) */}
            <div style={{ 
              position: "absolute",
              width: "88%", // Reduzido para expor a borda do ícone base
              height: "88%",
              WebkitMaskImage: `url(${level.icon})`,
              maskImage: `url(${level.icon})`,
              WebkitMaskSize: "contain",
              maskSize: "contain",
              WebkitMaskPosition: "center",
              maskPosition: "center",
              WebkitMaskRepeat: "no-repeat",
              maskRepeat: "no-repeat",
              overflow: "hidden",
              zIndex: 2
            }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={avatarUrl} 
                alt="Avatar" 
                style={{ width: "100%", height: "100%", objectFit: "cover" }} 
              />
            </div>
          </div>
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img 
            src={level.icon} 
            alt="Level Icon" 
            style={{ 
              width: "100%", height: "100%", objectFit: "contain",
              filter: (level.color === "var(--lvl-white)" || level.color === "#ffffff" || level.color === "var(--lvl-green)") ? "invert(1)" : "none",
              animation: "levelIconEntrance 1s cubic-bezier(0.16, 1, 0.3, 1) forwards"
            }} 
          />
        )}
      </div>

      {isOpen && (
        <div 
          style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: "rgba(0,0,0,0.92)", zIndex: 3000,
            display: "flex", alignItems: "center", justifyContent: "center",
            animation: "fadeIn 0.4s ease", backdropFilter: "blur(12px)",
            padding: "20px"
          }} 
          onClick={() => setIsOpen(false)}
        >
          <div 
            style={{
              backgroundColor: "var(--surface-lowest)", 
              width: "100%", maxWidth: "380px",
              padding: "48px 32px 40px",
              border: "1px solid var(--border-glow)",
              position: "relative",
              textAlign: "center",
              boxShadow: isElite ? "0 0 60px rgba(197, 160, 89, 0.15)" : "0 0 40px rgba(0,0,0,0.5)",
              animation: "modalEntrance 0.5s cubic-bezier(0.16, 1, 0.3, 1)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* CLOSE BUTTON */}
            <button 
              onClick={() => setIsOpen(false)}
              style={{
                position: "absolute", top: "20px", right: "20px",
                background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)",
                color: "var(--text-muted)", width: "32px", height: "32px", borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                transition: "all 0.2s"
              }}
              onMouseOver={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.1)")}
              onMouseOut={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
            >
              <X size={18} />
            </button>

            {/* LARGE ICON */}
            <div style={{ position: "relative", display: "inline-block", marginBottom: "24px" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                 src={level.icon} 
                 alt="Level" 
                 style={{ 
                   width: "90px", height: "90px", position: "relative", zIndex: 2,
                   filter: (level.color === "var(--lvl-white)" || level.color === "#ffffff" || level.color === "var(--lvl-green)") ? "invert(1)" : "drop-shadow(0 0 20px " + (isElite ? "#C5A05940" : level.color + "40") + ")"
                 }} 
              />
            </div>

            <div style={{ marginBottom: "24px" }}>
              <p style={{ fontSize: "9px", fontWeight: 800, color: level.color, letterSpacing: "0.25em", textTransform: "uppercase", marginBottom: "8px" }}>
                  IDENTIDADE TÉCNICA
              </p>
              <h2 className="font-display" style={{ fontSize: "32px", lineHeight: 1, letterSpacing: "-0.01em" }}>{level.label}</h2>
            </div>
            
            <p style={{ fontSize: "14px", color: "var(--text-dim)", lineHeight: 1.6, marginBottom: "40px", fontWeight: 500, padding: "0 10px" }}>
                {description}
            </p>

            <Link 
              href="/profile/levels"
              style={{
                display: "block",
                width: "100%",
                padding: "18px",
                background: "var(--surface-highest)",
                color: "var(--text)",
                fontSize: "11px",
                fontWeight: 900,
                textTransform: "uppercase",
                letterSpacing: "0.15em",
                textDecoration: "none",
                border: "1px solid var(--border-glow)",
                transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                borderRadius: "2px"
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = isElite ? "#C5A059" : level.color;
                e.currentTarget.style.color = (level.color === "var(--lvl-white)" || level.color === "#ffffff" || level.color === "var(--lvl-green)") ? "#000" : (isElite ? "#000" : "#FFF");
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 10px 30px rgba(0,0,0,0.3)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = "var(--surface-highest)";
                e.currentTarget.style.color = "var(--text)";
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              VER TODOS OS NÍVEIS
            </Link>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes modalEntrance { 
            from { opacity: 0; transform: scale(0.9) translateY(30px); filter: blur(10px); } 
            to { opacity: 1; transform: scale(1) translateY(0); filter: blur(0); } 
        }
      `}</style>
    </>
  );
}

"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X, User } from "lucide-react";
import { hapticSelect } from "@/lib/haptic";
import Link from "next/link";
import { getLevelInfo, LevelInfo } from "@/lib/constants/levels";
import AthleteAvatar from "./Identity/AthleteAvatar";

interface LevelBadgeProps {
  level: string | LevelInfo;
  description?: string;
  size?: number;
  avatarUrl?: string | null;
  /** Nome do atleta para exibição no modal (opcional) */
  athleteName?: string;
  /** Se o avatar deve ser circular (novo padrão minimalista) */
  rounded?: boolean;
}

/**
 * LevelBadge "Athlete ID"
 * @description Componente de identidade de alto impacto para o atleta.
 * O modal é renderizado via React Portal (document.body) para evitar
 * conflito de stacking context com animações CSS do componente pai.
 * @param level - Objeto LevelInfo ou string com a chave do nível.
 * @param size  - Tamanho em px do badge (default: 110).
 * @param avatarUrl - URL da foto de perfil do atleta.
 * @param athleteName - Nome do atleta para exibição no cartão de identidade.
 */
export default function LevelBadge({
  level: levelInput,
  description: descriptionInput,
  size = 110,
  avatarUrl,
  athleteName,
  rounded,
}: LevelBadgeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Necessário para createPortal: garante que document.body existe (hidratação SSR)
  useEffect(() => {
    setMounted(true);
  }, []);

  const level = typeof levelInput === "string" ? getLevelInfo(levelInput) : levelInput;
  const description = descriptionInput || level.description;

  const handleOpen = () => {
    try { hapticSelect(); } catch (e) {}
    setIsOpen(true);
  };

  const handleClose = () => setIsOpen(false);

  // Bloqueia o scroll do body enquanto o modal está aberto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  const badgeSize = size;
  const innerSize = badgeSize - 12;

  return (
    <>
      {/* ── KEYFRAMES (injetado como plain style, compatível com App Router) ── */}
      <style>{`
        @keyframes nbEntranceFade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes nbEntrancePop {
          from { opacity: 0; transform: scale(0.88) translateY(16px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);    }
        }
      `}</style>

      {/* ── BADGE CLICKÁVEL ── */}
      <div
        onClick={handleOpen}
        style={{
          width: `${badgeSize + 10}px`,
          height: `${badgeSize + 10}px`,
          cursor: "pointer",
          position: "relative",
          zIndex: 10,
          animation: "nbEntrancePop 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards",
          transition: "transform 0.15s ease",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.05) rotate(-1deg)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1) rotate(0deg)"; }}
      >
        {/* Sombra rígida (offside) */}
        <div style={{
          position: "absolute",
          top: "10px", left: "10px",
          width: `${badgeSize}px`, height: `${badgeSize}px`,
          background: "#000", borderRadius: "4px", zIndex: 0,
        }} />

        {/* Container principal */}
        <div style={{
          position: "absolute", top: 0, left: 0,
          width: `${badgeSize}px`, height: `${badgeSize}px`,
          background: "#FFF", border: "3px solid #000", borderRadius: "4px",
          display: "flex", alignItems: "center", justifyContent: "center",
          overflow: "hidden", zIndex: 2,
        }}>
          {/* Fundo sutil de nível */}
          <div style={{
            position: "absolute", inset: 0,
            background: `linear-gradient(135deg, ${level.color}08 0%, #FFF 100%)`,
            zIndex: 0,
          }} />

          {/* Foto de perfil ou placeholder */}
          <AthleteAvatar
            url={avatarUrl}
            name={athleteName}
            size={innerSize}
            borderWidth={2}
            shadowSize={0}
            rounded={rounded}
          />
        </div>

        {/* Ícone de nível (canto superior direito) */}
        <div style={{
          position: "absolute", top: "-12px", right: "-12px",
          width: "48px", height: "48px",
          background: "#FFF", border: "3px solid #000",
          boxShadow: `4px 4px 0px ${level.color}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 20, transform: "rotate(4deg)",
        }}>
          <img src={level.icon} alt={level.label} style={{ width: "32px", height: "32px", objectFit: "contain" }} />
        </div>
      </div>

      {/* ── MODAL (via React Portal → renderiza em document.body) ── */}
      {mounted && isOpen && createPortal(
        <div
          onClick={handleClose}
          style={{
            position: "fixed", inset: 0,
            // Overlay totalmente opaco: previne que o conteúdo do fundo (nome do atleta no dashboard)
            // apareça através do modal, independentemente de transformações CSS do componente pai.
            backgroundColor: "rgba(0, 0, 0, 0.75)",
            zIndex: 9999,
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "20px",
            animation: "nbEntranceFade 0.2s ease-out",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: "#FFFFFF",
              width: "100%", maxWidth: "360px",
              padding: "48px 24px 28px",
              border: "4px solid #000",
              position: "relative",
              textAlign: "center",
              boxShadow: "12px 12px 0px #000",
              animation: "nbEntrancePop 0.35s cubic-bezier(0.18, 0.89, 0.32, 1.28)",
            }}
          >
            {/* Botão fechar */}
            <button
              onClick={handleClose}
              aria-label="Fechar"
              style={{
                position: "absolute", top: "12px", right: "12px",
                background: "#000", border: "2px solid #000",
                color: "#FFF", width: "36px", height: "36px",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <X size={20} />
            </button>

            {/* Ícone de nível */}
            <div style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              marginBottom: "20px", padding: "16px",
              background: "#f8f8f8", border: "3px solid #000",
              boxShadow: `6px 6px 0px ${level.color}`,
            }}>
              <img src={level.icon} alt={level.label} style={{ width: "88px", height: "88px", objectFit: "contain" }} />
            </div>

            {/* Subtítulo e nome do nível */}
            <div style={{ marginBottom: "16px" }}>
              <p style={{
                fontSize: "10px", fontWeight: 900, color: level.color,
                letterSpacing: "0.3em", textTransform: "uppercase", margin: "0 0 6px",
              }}>
                IDENTIDADE TÉCNICA
              </p>
              {athleteName && (
                <p style={{
                  fontSize: "13px", fontWeight: 700, color: "#000",
                  letterSpacing: "0.08em", textTransform: "uppercase",
                  margin: "0 0 6px", opacity: 0.5,
                }}>
                  {athleteName}
                </p>
              )}
              <h2 style={{
                fontSize: "40px", color: "#000", lineHeight: 0.9,
                fontWeight: 900, letterSpacing: "-0.03em", margin: 0,
              }}>
                {level.label}
              </h2>
            </div>

            {/* Separador */}
            <div style={{ width: "40px", height: "3px", background: level.color, margin: "0 auto 16px" }} />

            {/* Descrição */}
            <p style={{
              fontSize: "14px", color: "#444", lineHeight: 1.6,
              marginBottom: "28px", fontWeight: 500,
            }}>
              {description}
            </p>

            {/* CTA */}
            <Link
              href="/profile/levels"
              onClick={handleClose}
              style={{
                display: "block", width: "100%", padding: "18px",
                background: "#000", color: "#FFF", fontSize: "12px",
                fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.2em",
                textDecoration: "none", border: "2px solid #000",
                boxShadow: `5px 5px 0px ${level.color}`,
                transition: "all 0.1s ease",
                boxSizing: "border-box",
              }}
            >
              METODOLOGIA DE NÍVEIS
            </Link>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

"use client";

import React from "react";
import { Award } from "lucide-react";
import LevelBadge from "./LevelBadge";

interface LevelInfo {
  color: string;
  label: string;
  textColor: string;
  glow?: string;
  icon: string;
  description?: string;
  id?: string;
}

interface AthleteStats {
  xp_actual: number;
  xp_next_level: number;
  total_xp_goal: number;
}

interface LevelCardProps {
  level: LevelInfo;
  stats: AthleteStats;
  xpProgress: number;
  xpRemaining: number;
  avatarUrl?: string;
}

/**
 * Card de Nível do Atleta (Brutalista / Iron Monolith).
 * Componente central de gamificação que exibe o progresso de XP e o nível técnico.
 * 
 * @param {number} currentXp - XP total acumulado pelo atleta.
 * @param {number} nextLevelXp - XP necessário para atingir o próximo nível.
 * @param {string} level - Identificador do nível (ex: L1, L2, RX).
 * @param {string} category - Nome da categoria (ex: INICIANTE, SCALE, RX).
 * @param {string} avatarUrl - URL da imagem de perfil do atleta para o Dual Badge.
 * 
 * @design
 * - Dual Badge: Implementa o padrão visual onde o ícone de nível e o avatar do atleta
 *   são exibidos lado a lado em um layout de alta densidade visual.
 * - Barra de Progresso: Representação linear do avanço radial entre níveis.
 */
export default function LevelCard({ level, stats, xpProgress, xpRemaining, avatarUrl }: LevelCardProps) {
  return (
    <div style={{ 
      background: (level.color === "var(--lvl-black)" || level.color === "#C5A059") ? "var(--bg)" : level.color, 
      border: (level.color === "var(--lvl-black)" || level.color === "#C5A059") ? `2px solid ${level.color}` : "none",
      borderRadius: "2px", 
      padding: "24px", 
      position: "relative",
      overflow: "hidden",
      boxShadow: level.glow ? `0 0 30px ${level.glow}` : "none",
      transition: "all 0.5s cubic-bezier(0.16, 1, 0.3, 1)"
    }}>
      {/* Background Icon Watermark */}
      <div style={{ 
        position: "absolute", 
        right: "-20px", 
        bottom: "-20px", 
        color: level.textColor,
        opacity: (level.color === "var(--lvl-black)" || level.color === "#C5A059") ? 0.05 : 0.15,
        transform: "rotate(-15deg)"
      }}>
        <Award size={140} />
      </div>

      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "24px" }}>
          
          {/* IDENTIDADE UNIFICADA (LEVEL + AVATAR) */}
          <div style={{ marginBottom: "20px" }}>
            <LevelBadge 
              level={level} 
              description={level.description || ""} 
              size={100} 
              avatarUrl={avatarUrl}
            />
          </div>
          
          <span style={{ fontSize: "10px", fontWeight: 800, color: level.textColor, letterSpacing: "0.2em", textTransform: "uppercase", opacity: 0.8 }}>
            NÍVEL ATUAL
          </span>
          
          <div style={{ fontFamily: "var(--font-display)", fontSize: "28px", fontWeight: 900, color: level.textColor, lineHeight: 1, marginTop: "6px", textAlign: "center" }}>
            {level.label}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "8px" }}>
          <span style={{ fontSize: "10px", fontWeight: 700, color: level.textColor, opacity: 0.8, letterSpacing: "0.15em", marginBottom: "4px" }}>XP ACUMULADO</span>
          <span style={{ fontFamily: "var(--font-display)", fontSize: "32px", fontWeight: 900, color: level.textColor, lineHeight: 1 }}>
            {stats.xp_actual.toLocaleString("pt-BR")}
          </span>
        </div>

        {/* Barra de Progresso Animada */}
        <div style={{ width: "100%", height: "6px", background: "rgba(0,0,0,0.2)", position: "relative", marginTop: "24px", marginBottom: "8px", borderRadius: "3px" }}>
          <div style={{ 
              position: "absolute", 
              left: 0, 
              top: 0, 
              height: "100%", 
              width: `${xpProgress}%`, 
              background: level.textColor,
              transition: "width 1.5s cubic-bezier(0.16, 1, 0.3, 1)",
              borderRadius: "3px",
              boxShadow: `0 0 10px ${level.textColor}40`
          }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: "10px", fontWeight: 700, color: level.textColor, opacity: 0.9 }}>
            {xpRemaining.toLocaleString("pt-BR")} XP PARA O NÍVEL SEGUINTE
          </div>
          <div style={{ fontSize: "10px", fontWeight: 900, color: level.textColor }}>
              {Math.round(xpProgress)}%
          </div>
        </div>
      </div>

      <style jsx>{`
          @keyframes sealEntrance {
              from { opacity: 0; transform: scale(0.5) rotate(-20deg); }
              to { opacity: 1; transform: scale(1) rotate(0deg); }
          }
      `}</style>
    </div>
  );
}

"use client";

import React from "react";
import { Award } from "lucide-react";
import LevelBadge from "./LevelBadge";
import { getLevelInfo, LevelInfo as CentralLevelInfo } from "@/lib/constants/levels";

interface AthleteStats {
  points_actual: number;
  points_next_level: number;
  total_points_goal: number;
}

interface LevelCardProps {
  level: string | CentralLevelInfo;
  stats: AthleteStats;
  pointsProgress: number;
  pointsRemaining: number;
  avatarUrl?: string;
}

/**
 * Card de Nível do Atleta (Brutalista / Iron Monolith).
 * @param {number} points_actual - Pontuação total acumulada pelo atleta.
 * @param {number} points_next_level - Pontuação necessária para atingir o próximo nível.
 * @param {string} level - Identificador do nível (ex: L1, L2, RX).
 * @param {string} category - Nome da categoria (ex: INICIANTE, SCALE, RX).
 * @param {string} avatarUrl - URL da imagem de perfil do atleta para o Dual Badge.
 * 
 * @design
 * - Dual Badge: Implementa o padrão visual onde o ícone de nível e o avatar do atleta
 *   são exibidos lado a lado em um layout de alta densidade visual.
 * - Barra de Progresso: Representação linear do avanço radial entre níveis.
 */
export default function LevelCard({ level: levelInput, stats, pointsProgress, pointsRemaining, avatarUrl }: LevelCardProps) {
  const level = typeof levelInput === "string" ? getLevelInfo(levelInput) : levelInput;
  const isElite = level.key === "elite";
  
  return (
    <div style={{ 
      background: isElite ? "var(--bg)" : level.color, 
      border: isElite ? `2px solid ${level.color}` : "none",
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
        opacity: isElite ? 0.05 : 0.15,
        transform: "rotate(-15deg)"
      }}>
        <Award size={140} />
      </div>

      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "24px" }}>
          
          {/* IDENTIDADE DUAL (LEVEL + AVATAR) */}
          <div style={{ 
            marginBottom: "20px",
            display: "flex",
            gap: "12px",
            justifyContent: "center"
          }}>
            {/* ÍCONE DE RANKING */}
            <LevelBadge 
              level={level} 
              description={level.description || ""} 
              size={100} 
            />

            {/* FOTO DO ATLETA */}
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
          <span style={{ fontSize: "10px", fontWeight: 700, color: level.textColor, opacity: 0.8, letterSpacing: "0.15em", marginBottom: "4px" }}>PONTUAÇÃO ACUMULADA</span>
          <span style={{ fontFamily: "var(--font-display)", fontSize: "32px", fontWeight: 900, color: level.textColor, lineHeight: 1 }}>
            {stats.points_actual.toLocaleString("pt-BR")}
          </span>
        </div>

        {/* Barra de Progresso Animada */}
        <div style={{ width: "100%", height: "6px", background: "rgba(0,0,0,0.2)", position: "relative", marginTop: "24px", marginBottom: "8px", borderRadius: "3px" }}>
          <div 
            className="points-bar-fill"
            style={{ 
              position: "absolute", 
              left: 0, 
              top: 0, 
              height: "100%", 
              width: `${pointsProgress}%`, 
              background: level.textColor,
              transition: "width 1.5s cubic-bezier(0.16, 1, 0.3, 1)",
              borderRadius: "3px",
              boxShadow: `0 0 10px ${level.textColor}40`
          }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: "10px", fontWeight: 700, color: level.textColor, opacity: 0.9 }}>
            {pointsRemaining.toLocaleString("pt-BR")} PONTOS PARA O PRÓXIMO NÍVEL
          </div>
          <div style={{ fontSize: "10px", fontWeight: 900, color: level.textColor }}>
              {Math.round(pointsProgress)}%
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

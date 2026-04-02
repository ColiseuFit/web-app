"use client";

import React from "react";
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
  avatarUrl?: string | null;
}

/**
 * LevelCard "Elite Performance Certificate"
 * A high-density data component for the athlete's progress.
 */
export default function LevelCard({ level: levelInput, stats, pointsProgress, pointsRemaining, avatarUrl }: LevelCardProps) {
  const level = typeof levelInput === "string" ? getLevelInfo(levelInput) : levelInput;
  
  return (
    <div style={{ 
      background: "#FFF", 
      border: "3px solid #000",
      padding: "40px 24px 32px", 
      position: "relative",
      boxShadow: "10px 10px 0px #000",
      transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
      overflow: "hidden"
    }}>
      
      {/* BACKGROUND DECOR (Dashed Frame) */}
      <div style={{
        position: "absolute",
        inset: "6px",
        border: "1px dashed #000",
        opacity: 0.1,
        pointerEvents: "none"
      }} />

      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "32px" }}>
          
          {/* IDENTIDADE UNIFICADA (LEVEL + AVATAR) */}
          <div style={{ 
            marginBottom: "24px",
            display: "flex",
            justifyContent: "center",
          }}>
            <LevelBadge 
              level={level} 
              size={130} 
              avatarUrl={avatarUrl}
            />
          </div>
          
          <div style={{ 
            marginTop: "12px",
            background: "#000",
            padding: "4px 16px",
            color: "#FFF",
            fontSize: "12px",
            fontWeight: 900,
            letterSpacing: "0.2em",
            textTransform: "uppercase"
          }}>
            {level.label} STATUS
          </div>
        </div>

        {/* MÉTRICA DE PONTOS CENTRAL */}
        <div style={{ 
          display: "flex", 
          flexDirection: "column", 
          alignItems: "center", 
          marginBottom: "40px",
          textAlign: "center"
        }}>
          <span className="font-headline" style={{ 
            fontSize: "12px", 
            fontWeight: 900, 
            color: "#000", 
            letterSpacing: "0.15em", 
            marginBottom: "8px", 
            textTransform: "uppercase",
            opacity: 0.4
          }}>
            PONTUAÇÃO ACUMULADA
          </span>
          <div style={{ position: "relative" }}>
            <span className="font-display" style={{ 
              fontSize: "64px", 
              fontWeight: 950, 
              color: "#000", 
              lineHeight: 0.8,
              letterSpacing: "-0.05em" 
            }}>
              {stats.points_actual.toLocaleString("pt-BR")}
            </span>
            <div style={{ 
               position: "absolute", 
               bottom: "-10px", 
               right: "-20px", 
               fontSize: "14px", 
               fontWeight: 900, 
               color: level.color,
               transform: "rotate(-5deg)"
            }}>
              PTS
            </div>
          </div>
        </div>

        {/* PROGRESS BAR (BRUTALIST TRACK) */}
        <div style={{ marginTop: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
             <span style={{ fontSize: "10px", fontWeight: 900, letterSpacing: "0.05em" }}>PROGRESSO DE NÍVEL</span>
             <span style={{ fontSize: "10px", fontWeight: 900 }}>{Math.round(pointsProgress)}%</span>
          </div>
          <div style={{ 
            width: "100%", 
            height: "16px", 
            background: "#F0F0F0", 
            border: "2px solid #000", 
            position: "relative",
          }}>
            <div 
              style={{ 
                position: "absolute", 
                left: 0, 
                top: 0, 
                height: "100%", 
                width: `${pointsProgress}%`, 
                background: level.color,
                borderRight: "2px solid #000",
                transition: "width 1.5s cubic-bezier(0.16, 1, 0.3, 1)",
            }} />
          </div>
          <div style={{ 
            marginTop: "10px", 
            fontSize: "10px", 
            fontWeight: 800, 
            color: "#000", 
            textAlign: "center",
            letterSpacing: "0.02em",
            opacity: 0.6
          }}>
            FALTAM {pointsRemaining.toLocaleString("pt-BR")} PONTOS PARA A PRÓXIMA GRADUAÇÃO
          </div>
        </div>
      </div>
    </div>
  );
}

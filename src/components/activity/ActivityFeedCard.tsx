"use client";

import React from "react";
import { Zap, Clock, Weight, Award, User, Target } from "lucide-react";

interface ActivityMetric {
  label: string;
  value: string | number;
  unit?: string;
}

interface Achievement {
  id: string;
  type: "seal" | "pr";
  icon: string;
  color: string;
}

interface ActivityFeedCardProps {
  date: string;
  title: string;
  description: string;
  hashtags?: string[];
  metrics: ActivityMetric[];
  achievements?: Achievement[];
  isExcellence?: boolean; // Highlight cards with PRs
  points?: number;
  coach?: string;
  result?: string;
  typeTag?: string; // e.g., AMRAP, FORÇA, HERO
}

/**
 * ActivityFeedCard (Neo-Brutalist Light Edition)
 * O "Diário de Bordo" do atleta Coliseu.
 */
export const ActivityFeedCard: React.FC<ActivityFeedCardProps> = ({ 
  date, 
  title, 
  description, 
  hashtags = [], 
  metrics, 
  achievements = [],
  isExcellence = false,
  points,
  coach,
  result,
  typeTag
}) => {
  
  // Mapeamento de ícones para Lucide
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case "bolt": return <Zap size={14} strokeWidth={3} />;
      case "timer": return <Clock size={14} strokeWidth={3} />;
      case "monitor_weight": return <Weight size={14} strokeWidth={3} />;
      case "workspace_premium": return <Award size={14} strokeWidth={3} />;
      default: return <Target size={14} strokeWidth={3} />;
    }
  };

  return (
    <div style={{
      background: "#FFF",
      border: "3px solid #000",
      padding: "24px",
      marginBottom: "24px",
      position: "relative",
      boxShadow: isExcellence ? "8px 8px 0px var(--red)" : "6px 6px 0px #000",
      transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
    }}>
      
      {/* ── TOP BADGES ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <div style={{ display: "flex", gap: "8px" }}>
          {typeTag && (
            <span style={{ 
              fontSize: "9px", 
              fontWeight: 900, 
              color: "#FFF", 
              background: "#000", 
              padding: "4px 8px", 
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              boxShadow: "2px 2px 0px var(--red)"
            }}>
              {typeTag}
            </span>
          )}
          {isExcellence && (
            <span style={{ 
              fontSize: "9px", 
              fontWeight: 900, 
              color: "#000", 
              background: "#FFF", 
              border: "2px solid var(--red)",
              padding: "2px 8px", 
              letterSpacing: "0.1em",
              textTransform: "uppercase"
            }}>
              RECORDE PESSOAL
            </span>
          )}
        </div>
        <span style={{ fontSize: "10px", fontWeight: 900, color: "#000", opacity: 0.4, letterSpacing: "0.05em" }}>
          {date.toUpperCase()}
        </span>
      </div>

      {/* ── HEADER ── */}
      <div style={{ marginBottom: "24px" }}>
        <h4 className="font-display" style={{ fontSize: "24px", fontWeight: 950, color: "#000", textTransform: "uppercase", lineHeight: 0.9, marginBottom: "8px" }}>
          {title}
        </h4>
        <p style={{ fontSize: "13px", color: "#000", fontWeight: 500, marginBottom: "16px", lineHeight: "1.4", opacity: 0.8 }}>
          {description}
        </p>
        
        {result && (
          <div style={{ 
            fontSize: "12px", 
            fontWeight: 900, 
            color: "#FFF", 
            background: "#000",
            padding: "10px 16px",
            border: "2px solid #000",
            boxShadow: "4px 4px 0px var(--red)",
            display: "inline-block",
            marginBottom: "16px",
            letterSpacing: "0.05em"
          }}>
            SCORE FINAL: <span style={{ color: "#FFF" }}>{result}</span>
          </div>
        )}

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "12px" }}>
          {hashtags.map((tag, i) => (
            <span key={i} style={{ fontSize: "10px", fontWeight: 900, color: "var(--red)", textTransform: "uppercase" }}>
              {tag.startsWith("#") ? tag : `#${tag}`}
            </span>
          ))}
        </div>
      </div>

      {/* ── METRICS GRID ── */}
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: `repeat(${metrics.length}, 1fr)`, 
        gap: "16px",
        marginBottom: (achievements.length > 0 || coach || points) ? "24px" : "0",
        paddingTop: "20px",
        borderTop: "2px solid #F0F0F0"
      }}>
        {metrics.map((metric, i) => (
          <div key={i} style={{ textAlign: "left" }}>
            <div className="font-display" style={{ fontSize: "24px", fontWeight: 900, color: "#000", lineHeight: 1 }}>
              {metric.value}<span style={{ fontSize: "12px", fontWeight: 900, opacity: 0.4, marginLeft: "4px" }}>{metric.unit}</span>
            </div>
            <div style={{ fontSize: "9px", fontWeight: 900, color: "#000", textTransform: "uppercase", letterSpacing: "0.1em", marginTop: "4px", opacity: 0.5 }}>
              {metric.label}
            </div>
          </div>
        ))}
      </div>

      {/* ── FOOTER ── */}
      {(achievements.length > 0 || coach || points) && (
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center",
          paddingTop: "20px", 
          borderTop: "2px solid #F0F0F0" 
        }}>
          <div style={{ display: "flex", gap: "12px" }}>
            {achievements.map((ach) => (
              <div key={ach.id} style={{
                width: "32px",
                height: "32px",
                background: ach.color === "volt" ? "#000" : "var(--red)",
                border: "2px solid #000",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "2px 2px 0px #000"
              }}>
                <div style={{ color: ach.color === "volt" ? "var(--red)" : "#FFF" }}>
                  {getIcon(ach.icon)}
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
            {coach && (
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <User size={14} color="#000" strokeWidth={3} />
                <span style={{ fontSize: "10px", fontWeight: 900, color: "#000", textTransform: "uppercase" }}>COACH {coach}</span>
              </div>
            )}
            {points !== undefined && (
              <div style={{ 
                background: "var(--red)", 
                padding: "2px 10px", 
                border: "2px solid #000",
                display: "flex", 
                alignItems: "center", 
                gap: "4px" 
              }}>
                <span style={{ fontSize: "12px", fontWeight: 950, color: "#FFF" }}>+{points}</span>
                <span style={{ fontSize: "8px", fontWeight: 900, color: "#FFF" }}>PTS</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

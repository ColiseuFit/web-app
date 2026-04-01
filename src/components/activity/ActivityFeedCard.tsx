"use client";

import React from "react";
import { Zap, Clock, Weight, Award, User } from "lucide-react";

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
 * ActivityFeedCard (NRC-Style)
 * O "Card da Glória" do atleta Coliseu.
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
  const voltColor = "#e1ff00";

  // Mapeamento de ícones legado para Lucide
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case "bolt": return <Zap size={14} />;
      case "timer": return <Clock size={14} />;
      case "monitor_weight": return <Weight size={14} />;
      case "workspace_premium": return <Award size={14} />;
      default: return <Zap size={14} />;
    }
  };

  return (
    <div style={{
      background: "var(--surface-lowest)",
      border: isExcellence ? `1px solid ${voltColor}40` : "1px solid var(--border-glow)",
      borderRadius: "4px",
      padding: "24px",
      marginBottom: "20px",
      position: "relative",
      overflow: "hidden",
      transition: "all 0.3s ease",
      boxShadow: isExcellence ? `0 0 40px ${voltColor}08` : "none"
    }}>
      {/* ── TOP BADGES ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <div style={{ display: "flex", gap: "6px" }}>
          {typeTag && (
            <span style={{ 
              fontSize: "8px", 
              fontWeight: 900, 
              color: "white", 
              background: "rgba(255,255,255,0.1)", 
              padding: "2px 6px", 
              borderRadius: "2px",
              letterSpacing: "0.1em",
              textTransform: "uppercase"
            }}>
              {typeTag}
            </span>
          )}
          {isExcellence && (
            <span style={{ 
              fontSize: "8px", 
              fontWeight: 900, 
              color: voltColor, 
              background: `${voltColor}15`, 
              padding: "2px 6px", 
              borderRadius: "2px",
              letterSpacing: "0.1em" 
            }}>
              PR BATIDO
            </span>
          )}
        </div>
        <span style={{ fontSize: "10px", fontWeight: 800, color: "var(--text-dim)", letterSpacing: "0.05em" }}>
          {date}
        </span>
      </div>

      {/* ── HEADER ── */}
      <div style={{ marginBottom: "20px" }}>
        <h4 style={{ fontSize: "16px", fontWeight: 900, color: "white", textTransform: "uppercase", marginBottom: "4px" }}>
          {title}
        </h4>
        <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "12px", lineHeight: "1.4" }}>
          {description}
        </p>
        
        {result && (
          <div style={{ 
            fontSize: "10px", 
            fontWeight: 800, 
            color: "white", 
            background: "linear-gradient(90deg, var(--red)20, transparent)",
            padding: "8px 12px",
            borderLeft: "2px solid var(--red)",
            marginBottom: "12px",
            letterSpacing: "0.05em"
          }}>
            SCORE: <span style={{ color: "var(--red)" }}>{result}</span>
          </div>
        )}

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {hashtags.map((tag, i) => (
            <span key={i} style={{ fontSize: "9px", fontWeight: 700, color: "var(--red)", opacity: 0.8 }}>
              {tag.startsWith("#") ? tag : `#${tag}`}
            </span>
          ))}
        </div>
      </div>

      {/* ── METRICS GRID ── */}
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: `repeat(${metrics.length}, 1fr)`, 
        gap: "12px",
        marginBottom: (achievements.length > 0 || coach || points) ? "24px" : "0",
        paddingTop: "20px",
        borderTop: "1px solid rgba(255,255,255,0.03)"
      }}>
        {metrics.map((metric, i) => (
          <div key={i} style={{ textAlign: "left" }}>
            <div className="font-display" style={{ fontSize: "20px", color: "white", marginBottom: "2px" }}>
              {metric.value}<span style={{ fontSize: "10px", opacity: 0.5, marginLeft: "2px" }}>{metric.unit}</span>
            </div>
            <div style={{ fontSize: "8px", fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
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
          paddingTop: "16px", 
          borderTop: "1px solid rgba(255,255,255,0.03)" 
        }}>
          <div style={{ display: "flex", gap: "8px" }}>
            {achievements.map((ach) => (
              <div key={ach.id} style={{
                width: "24px",
                height: "28px",
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}>
                <div style={{
                  position: "absolute",
                  inset: 0,
                  clipPath: "polygon(50% 0%, 100% 20%, 100% 80%, 50% 100%, 0% 80%, 0% 20%)",
                  background: ach.color === "volt" ? `${voltColor}20` : "var(--red)20",
                  border: `1px solid ${ach.color === "volt" ? voltColor : "var(--red)"}`,
                }} />
                <div style={{ color: ach.color === "volt" ? voltColor : "var(--red)", zIndex: 1, display: "flex" }}>
                  {getIcon(ach.icon)}
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
            {coach && (
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <User size={12} color="var(--text-dim)" />
                <span style={{ fontSize: "8px", fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase" }}>{coach}</span>
              </div>
            )}
            {points !== undefined && (
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <span style={{ fontSize: "10px", fontWeight: 900, color: "var(--red)" }}>+{points}</span>
                <span style={{ fontSize: "8px", fontWeight: 800, color: "var(--text-muted)" }}>PTS</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

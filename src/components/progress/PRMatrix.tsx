"use client";

import React, { useState } from "react";
import { Inbox } from "lucide-react";

interface PRData {
  id: string;
  movement_key: string;
  value: number;
  unit: 'kg' | 'time' | 'reps';
  category: 'lpo' | 'strength' | 'gymnastics' | 'benchmark';
  level: 'L1' | 'L2' | 'L3' | 'L4' | 'L5';
  date: string;
}

interface PRMatrixProps {
  prs: PRData[];
  onUpsert?: (pr: Partial<PRData>) => void;
}

export const PRMatrix: React.FC<PRMatrixProps> = ({ prs, onUpsert }) => {
  const [activeTab, setActiveTab] = useState<'lpo' | 'strength' | 'gymnastics' | 'benchmark'>('lpo');

  const categories = [
    { id: 'lpo', label: 'LPO' },
    { id: 'strength', label: 'FORÇA' },
    { id: 'gymnastics', label: 'GINÁSTICOS' },
    { id: 'benchmark', label: 'BENCHMARKS' },
  ];

  const levelConfigs: Record<string, { color: string; label: string; icon: string }> = {
    L1: { color: "#ffffff", label: "INICIANTE", icon: "/levels/icone-coliseu-levels-iniciante.svg" },
    L2: { color: "#2dab61", label: "SCALE", icon: "/levels/icone-coliseu-levels-scale.svg" },
    L3: { color: "#2980ba", label: "INTERMEDIÁRIO", icon: "/levels/icone-coliseu-levels-intermediario.svg" },
    L4: { color: "#e52521", label: "RX", icon: "/levels/icone-coliseu-levels-rx.svg" },
    L5: { color: "#C5A059", label: "ELITE", icon: "/levels/icone-coliseu-levels-elite.svg" }
  };

  const filteredPrs = prs.filter(pr => pr.category === activeTab);

  const formatValue = (p: PRData) => {
    if (p.unit === 'time') {
      const mins = Math.floor(p.value / 60);
      const secs = p.value % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    return `${p.value} ${p.unit}`;
  };

  return (
    <div style={{ width: "100%", background: "transparent" }}>
      {/* CATEGORY TABS */}
      <div style={{ 
        display: "flex", 
        overflowX: "auto", 
        gap: "4px", 
        padding: "16px 20px", 
        background: "transparent", 
        borderBottom: "1px solid var(--border-glow)",
        msOverflowStyle: "none", scrollbarWidth: "none",
      }}>
        {categories.map((cat) => {
          const isActive = activeTab === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveTab(cat.id as any)}
              style={{
                padding: "10px 18px", fontSize: "9px", fontWeight: 900, textTransform: "uppercase",
                letterSpacing: "0.2em", transition: "all 0.3s ease", whiteSpace: "nowrap",
                borderRadius: "1px", border: "1px solid", cursor: "pointer",
                backgroundColor: isActive ? "rgba(227,27,35,0.15)" : "rgba(255,255,255,0.01)",
                color: isActive ? "var(--red)" : "var(--text-muted)",
                borderColor: isActive ? "var(--red)" : "var(--border-glow)",
              }}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* PR GRID */}
      <div style={{ padding: "24px 20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
        {filteredPrs.length > 0 ? (
          filteredPrs.map((pr) => {
            const config = levelConfigs[pr.level] || { color: "var(--text-muted)", label: pr.level, icon: "" };
            return (
              <div 
                key={pr.id} 
                className="pr-card-v2"
                style={{
                  background: "var(--surface-lowest)", border: "1px solid var(--border-glow)",
                  padding: "16px", display: "flex", flexDirection: "column", justifyContent: "space-between",
                  transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)", position: "relative",
                  borderRadius: "2px", overflow: "hidden", minHeight: "140px"
                }}
              >
                {/* WATERMARK BG ICON */}
                <div style={{
                  position: "absolute", right: "-10px", bottom: "-10px", width: "80px", height: "80px",
                  opacity: 0.04, filter: "grayscale(100%) brightness(200%)", pointerEvents: "none"
                }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={config.icon} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                </div>

                <div>
                  <h4 style={{
                    fontSize: "8px", color: "var(--text-muted)", fontWeight: 800, textTransform: "uppercase",
                    letterSpacing: "0.25em", marginBottom: "8px"
                  }}>
                    {pr.movement_key.replace(/_/g, ' ')}
                  </h4>
                  <p className="font-display" style={{
                    fontSize: "24px", fontWeight: 900, color: "white", fontStyle: "italic", letterSpacing: "-0.01em", lineHeight: 1
                  }}>
                    {formatValue(pr)}
                  </p>
                </div>
                
                {/* BOTTOM BADGE */}
                <div style={{ marginTop: "16px", paddingTop: "12px", borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <div style={{ width: "14px", height: "14px" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={config.icon} alt={config.label} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                    </div>
                    <span style={{ fontSize: "7px", fontWeight: 900, color: config.color, letterSpacing: "0.05em" }}>{config.label}</span>
                  </div>
                  <span style={{ fontSize: "7px", color: "var(--text-dim)", fontWeight: 800 }}>{new Date(pr.date).toLocaleDateString('pt-BR')}</span>
                </div>
              </div>
            );
          })
        ) : (
          <div style={{ gridColumn: "span 2", padding: "64px 0", textAlign: "center", border: "1px dashed var(--border-glow)", opacity: 0.3 }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: "16px" }}>
              <Inbox size={28} color="var(--text-muted)" />
            </div>
            <p style={{ fontSize: "9px", color: "var(--text-muted)", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.4em" }}>SEM REGISTROS</p>
          </div>
        )}
      </div>

      {/* FAB: NEW PR */}
      <div style={{ padding: "0 20px 24px" }}>
        <button 
          onClick={() => onUpsert && onUpsert({})}
          style={{
            width: "100%", padding: "18px", background: "rgba(227,27,35,0.02)",
            border: "1px dashed var(--border-glow)", color: "var(--red)", fontSize: "11px",
            fontWeight: 900, letterSpacing: "0.3em", cursor: "pointer", transition: "all 0.3s ease",
            borderRadius: "4px"
          }}
          onMouseOver={(e) => (e.currentTarget.style.borderColor = "var(--red)")}
          onMouseOut={(e) => (e.currentTarget.style.borderColor = "var(--border-glow)")}
        >
          + REGISTRAR NOVO RECORDE
        </button>
      </div>

      <style jsx global>{`
        .pr-card-v2:hover {
          border-color: rgba(255,255,255,0.2) !important;
          background: rgba(255,255,255,0.02) !important;
          transform: translateY(-3px);
          box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        }
      `}</style>
    </div>
  );
};

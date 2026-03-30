"use client";

import React from "react";
import Link from "next/link";
import { TrendingUp, Plus } from "lucide-react";

interface PRData {
  id: string;
  movement_key: string;
  value: number;
  unit: 'kg' | 'time' | 'reps';
  category: 'lpo' | 'strength' | 'gymnastics' | 'benchmark';
  level: 'L1' | 'L2' | 'L3' | 'L4' | 'L5';
  date: string;
}

interface RecentPRsProps {
  prs: PRData[];
  hideViewAll?: boolean;
}

/**
 * RecentPRs Component
 * Exibe um resumo dos recordes mais recentes no Dashboard Home.
 */
export default function RecentPRs({ prs, hideViewAll = false }: RecentPRsProps) {
  const levelConfigs: Record<string, { color: string; label: string; icon: string }> = {
    L1: { color: "#ffffff", label: "L1", icon: "/levels/icone-coliseu-levels-iniciante.svg" },
    L2: { color: "#2dab61", label: "L2", icon: "/levels/icone-coliseu-levels-scale.svg" },
    L3: { color: "#2980ba", label: "L3", icon: "/levels/icone-coliseu-levels-intermediario.svg" },
    L4: { color: "#e52521", label: "L4", icon: "/levels/icone-coliseu-levels-rx.svg" },
    L5: { color: "#C5A059", label: "L5", icon: "/levels/icone-coliseu-levels-elite.svg" }
  };

  const formatValue = (p: PRData) => {
    if (p.unit === 'time') {
      const mins = Math.floor(p.value / 60);
      const secs = p.value % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    return `${p.value}${p.unit}`;
  };

  return (
    <section style={{ padding: "0 20px 32px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "16px" }}>
        <div>
          <span style={{ fontSize: "8px", fontWeight: 800, color: "var(--red)", letterSpacing: "0.2em", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>
            Desempenho
          </span>
          <h3 className="font-display" style={{ fontSize: "20px", fontWeight: 900, textTransform: "uppercase" }}>
            Recordes Recentes
          </h3>
        </div>
        {!hideViewAll && (
          <Link href="/progresso" style={{ fontSize: "10px", fontWeight: 800, color: "var(--text-muted)", textDecoration: "none", letterSpacing: "0.05em", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "2px" }}>
            VER TUDO
          </Link>
        )}
      </div>

      {prs.length > 0 ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
          {prs.map((pr) => {
            const config = levelConfigs[pr.level] || levelConfigs.L1;
            return (
              <div 
                key={pr.id}
                style={{
                  background: "var(--surface-lowest)",
                  border: "1px solid var(--border-glow)",
                  padding: "12px",
                  borderRadius: "2px",
                  position: "relative",
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  minHeight: "80px"
                }}
              >
                {/* Level Icon Watermark */}
                <div style={{ position: "absolute", right: "-5px", top: "-5px", width: "40px", height: "40px", opacity: 0.05, filter: "grayscale(100%)" }}>
                  <img src={config.icon} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                </div>

                <div>
                  <div style={{ fontSize: "7px", fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "4px" }}>
                    {pr.movement_key.replace(/_/g, " ")}
                  </div>
                  <div className="font-display" style={{ fontSize: "16px", fontWeight: 900, color: "white", fontStyle: "italic" }}>
                    {formatValue(pr)}
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "8px" }}>
                    <div style={{ width: "10px", height: "10px" }}>
                        <img src={config.icon} alt={config.label} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                    </div>
                    <span style={{ fontSize: "7px", fontWeight: 900, color: config.color }}>{config.label}</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <Link href="/progresso" style={{ textDecoration: "none" }}>
            <div style={{ 
                padding: "24px", 
                background: "rgba(227,27,35,0.02)", 
                border: "1px dashed var(--border-glow)", 
                borderRadius: "4px",
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "12px"
            }}>
                <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "rgba(227,27,35,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <TrendingUp size={20} color="var(--red)" />
                </div>
                <div>
                    <p style={{ fontSize: "12px", fontWeight: 800, color: "white", marginBottom: "4px" }}>JORNADA DE EVOLUÇÃO</p>
                    <p style={{ fontSize: "10px", color: "var(--text-muted)" }}>Sua evolução começa aqui. Registre seu primeiro recorde!</p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "9px", fontWeight: 900, color: "var(--red)", letterSpacing: "0.1em" }}>
                    <Plus size={12} strokeWidth={3} /> COMEÇAR AGORA
                </div>
            </div>
        </Link>
      )}
    </section>
  );
}

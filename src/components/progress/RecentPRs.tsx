"use client";

import React from "react";
import Link from "next/link";
import { TrendingUp, Plus } from "lucide-react";
import { getLevelInfo } from "@/lib/constants/levels";

interface PRData {
  id: string;
  movement_key: string;
  value: number;
  unit: 'kg' | 'time' | 'reps';
  category: 'lpo' | 'strength' | 'gymnastics' | 'benchmark';
  level: string;
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

  const formatValue = (p: PRData) => {
    if (p.unit === 'time') {
      const mins = Math.floor(p.value / 60);
      const secs = p.value % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    return `${p.value}${p.unit}`;
  };

  return (
    <section style={{ marginBottom: "16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div>
          <span className="font-headline" style={{ fontSize: "10px", fontWeight: 900, color: "#000", letterSpacing: "0.15em", textTransform: "uppercase", display: "inline-block", background: "#f0f0f0", border: "1px solid #000", padding: "4px 8px", marginBottom: "8px" }}>
            PERFORMANCE
          </span>
          <h3 className="font-display" style={{ fontSize: "22px", fontWeight: 900, textTransform: "uppercase", color: "#000", letterSpacing: "-0.01em" }}>
            Recordes Recentes
          </h3>
        </div>
        {!hideViewAll && (
          <Link href="/progresso" style={{ fontSize: "11px", fontWeight: 900, color: "#000", textDecoration: "underline", textUnderlineOffset: "4px", letterSpacing: "0.05em" }}>
            VER TUDO
          </Link>
        )}
      </div>

      {prs.length > 0 ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          {prs.map((pr) => {
            const config = getLevelInfo(pr.level);
            return (
              <div 
                key={pr.id}
                style={{
                  background: "#FFF",
                  border: "2px solid #000",
                  padding: "16px 12px",
                  borderRadius: "0",
                  position: "relative",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  minHeight: "100px",
                  boxShadow: "4px 4px 0px #000",
                }}
              >
                <div>
                  <div style={{ fontSize: "8px", fontWeight: 900, color: "rgba(0,0,0,0.4)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: "6px" }}>
                    {pr.movement_key.replace(/_/g, " ")}
                  </div>
                  <div className="font-display" style={{ fontSize: "20px", fontWeight: 900, color: "#000", fontStyle: "italic", lineHeight: 1 }}>
                    {formatValue(pr)}
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "12px" }}>
                    <div style={{ width: "12px", height: "12px", background: config.color, border: "1px solid #000", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <img src={config.icon} alt={config.label} style={{ width: "8px", height: "8px", objectFit: "contain", filter: "brightness(0) invert(1)" }} />
                    </div>
                    <span style={{ fontSize: "8px", fontWeight: 900, color: "#000", textTransform: "uppercase" }}>{config.label}</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <Link href="/progresso" style={{ textDecoration: "none" }}>
            <div style={{ 
                padding: "32px 24px", 
                background: "#FFF", 
                border: "2px dashed #000", 
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "16px",
                boxShadow: "6px 6px 0px rgba(0,0,0,0.05)"
            }}>
                <div style={{ width: "48px", height: "48px", background: "#f0f0f0", border: "2px solid #000", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <TrendingUp size={24} color="#000" />
                </div>
                <div>
                    <h4 style={{ fontSize: "14px", fontWeight: 900, color: "#000", marginBottom: "6px", textTransform: "uppercase" }}>COMECE SUA JORNADA</h4>
                    <p style={{ fontSize: "11px", color: "rgba(0,0,0,0.6)", fontWeight: 600 }}>Toda evolução começa com o primeiro registro técnico.</p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "10px", fontWeight: 900, background: "#E31B23", padding: "10px 20px", border: "2px solid #000", boxShadow: "4px 4px 0px #000", color: "#FFF", letterSpacing: "0.1em" }}>
                    <Plus size={14} strokeWidth={3} /> REGISTRAR PR
                </div>
            </div>
        </Link>
      )}
    </section>
  );
}

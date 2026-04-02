"use client";

import React, { useState } from "react";
import { Inbox } from "lucide-react";
import { getLevelInfo } from "@/lib/constants/levels";

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
        gap: "8px", 
        padding: "20px", 
        background: "#f9f9f9", 
        borderBottom: "2px solid #000",
        msOverflowStyle: "none", scrollbarWidth: "none",
      }}>
        {categories.map((cat) => {
          const isActive = activeTab === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveTab(cat.id as any)}
              style={{
                padding: "10px 20px", 
                fontSize: "10px", 
                fontWeight: 900, 
                textTransform: "uppercase",
                letterSpacing: "0.1em", 
                transition: "all 0.1s ease", 
                whiteSpace: "nowrap",
                border: "2px solid #000", 
                cursor: "pointer",
                backgroundColor: isActive ? "#000" : "#FFF",
                color: isActive ? "#FFF" : "#000",
                boxShadow: isActive ? "none" : "3px 3px 0px #000",
                transform: isActive ? "translate(2px, 2px)" : "none",
              }}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* PR GRID */}
      <div style={{ padding: "24px 20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        {filteredPrs.length > 0 ? (
          filteredPrs.map((pr) => {
            const config = getLevelInfo(pr.level);
            return (
              <div 
                key={pr.id} 
                style={{
                  background: "#FFF", 
                  border: "2px solid #000",
                  padding: "16px", 
                  display: "flex", 
                  flexDirection: "column", 
                  justifyContent: "space-between",
                  position: "relative",
                  boxShadow: "6px 6px 0px rgba(0,0,0,0.05)",
                  minHeight: "150px"
                }}
              >
                {/* WATERMARK BG ICON */}
                <div style={{
                  position: "absolute", right: "-5px", bottom: "-5px", width: "70px", height: "70px",
                  opacity: 0.05, filter: "grayscale(100%)", pointerEvents: "none"
                }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={config.icon} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                </div>

                <div>
                  <h4 style={{
                    fontSize: "8px", color: "rgba(0,0,0,0.4)", fontWeight: 900, textTransform: "uppercase",
                    letterSpacing: "0.15em", marginBottom: "8px"
                  }}>
                    {pr.movement_key.replace(/_/g, ' ')}
                  </h4>
                  <p className="font-display" style={{
                    fontSize: "26px", fontWeight: 900, color: "#000", fontStyle: "italic", letterSpacing: "-0.01em", lineHeight: 1
                  }}>
                    {formatValue(pr)}
                  </p>
                </div>
                
                {/* BOTTOM BADGE */}
                <div style={{ marginTop: "16px", paddingTop: "12px", borderTop: "1px solid #f0f0f0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <div style={{ width: "14px", height: "14px", border: "1px solid #000", background: "#FFF", padding: "2px" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={config.icon} alt={config.label} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                    </div>
                    <span style={{ fontSize: "8px", fontWeight: 900, color: "#000", letterSpacing: "0.05em", textTransform: "uppercase" }}>{config.label}</span>
                  </div>
                  <span style={{ fontSize: "8px", color: "rgba(0,0,0,0.3)", fontWeight: 800 }}>{new Date(pr.date + "T00:00:00Z").toLocaleDateString('pt-BR', { timeZone: 'UTC', day: '2-digit', month: '2-digit' })}</span>
                </div>
              </div>
            );
          })
        ) : (
          <div style={{ gridColumn: "span 2", padding: "64px 0", textAlign: "center", border: "3px dashed #f0f0f0", background: "#fafafa" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: "16px" }}>
              <Inbox size={32} color="#ccc" />
            </div>
            <p className="font-headline" style={{ fontSize: "10px", color: "#999", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.2em" }}>SEM REGISTROS NESSA ÁREA</p>
          </div>
        )}
      </div>

      {/* ACTION: NEW PR */}
      <div style={{ padding: "0 20px 32px" }}>
        <button 
          onClick={() => onUpsert && onUpsert({})}
          style={{
            width: "100%", 
            padding: "20px", 
            background: "#FFF",
            border: "2px solid #000", 
            color: "#000", 
            fontSize: "12px",
            fontWeight: 900, 
            letterSpacing: "0.2em", 
            cursor: "pointer", 
            transition: "all 0.1s ease",
            boxShadow: "4px 4px 0px #000",
            textTransform: "uppercase"
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.boxShadow = "none";
            e.currentTarget.style.transform = "translate(2px, 2px)";
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.boxShadow = "4px 4px 0px #000";
            e.currentTarget.style.transform = "none";
          }}
        >
          + REGISTRAR NOVO RECORDE
        </button>
      </div>
    </div>
  );
};

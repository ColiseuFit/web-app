"use client";

import React, { useState, useEffect } from "react";
import { CheckCircle, CalendarDays, Edit3, Dumbbell } from "lucide-react";
import CheckInButton from "./CheckInButton";

import { getLevelInfo, ALL_LEVELS } from "@/lib/constants/levels";

interface Wod {
  id: string;
  title: string;
  description: string;
  warm_up: string;
  technique?: string;
  wod_content: string;
  tags?: string[];
  type_tag?: string | null;
  time_cap?: number | null;
  result_type?: string | null;
}

interface WodViewProps {
  wod: Wod | null;
  selectedDate: string;
  alreadyChecked: boolean;
  studentLevel: string;
  holiday: any;
}

export default function WodView({ wod, selectedDate, alreadyChecked, studentLevel, holiday }: WodViewProps) {
  const [activeLevel, setActiveLevel] = useState(getLevelInfo(studentLevel).id);

  const getAdaptedContent = (baseContent: string, levelId: string) => {
    if (!baseContent) return "TREINO NÃO DISPONÍVEL PARA ESTE NÍVEL.";
    
    if (levelId === "L1") {
        return baseContent.replace(/Thrusters.*/g, "15-12-9 Air Squats").replace(/Pull-ups.*/g, "Ring Rows");
    }
    if (levelId === "L2") {
        return baseContent.replace(/Thrusters.*/g, "15-12-9 Goblet Squats @16kg").replace(/Pull-ups.*/g, "Jumping Pull-ups");
    }
    if (levelId === "L3") {
        return baseContent.replace(/Thrusters.*/g, "21-15-9 Thrusters @30/20kg").replace(/Pull-ups.*/g, "Pull-ups (Banded if needed)");
    }
    if (levelId === "L4") return baseContent; // RX
    if (levelId === "L5") {
        return baseContent.replace(/Thrusters.*/g, "21-15-9 Thrusters @50/35kg").replace(/Pull-ups.*/g, "Chest-to-Bar Pull-ups");
    }
    return baseContent;
  };

  const adaptedWod = wod ? getAdaptedContent(wod.wod_content, activeLevel) : "";
  const activeLevelInfo = ALL_LEVELS.find(l => l.id === activeLevel);

  return (
    <>
      {wod ? (
        <div style={{ animation: "fadeIn 0.5s ease-out" }}>
          <div style={{ padding: "32px 24px 0 24px" }}>
            <h2 className="font-display" style={{ fontSize: "clamp(38px, 11vw, 54px)", lineHeight: 0.85, marginBottom: "16px", letterSpacing: "-0.02em" }}>
              {wod.title.split(" ")[0]}
              <br />
              <span style={{ color: "var(--red)" }}>{wod.title.split(" ").slice(1).join(" ")}</span>
            </h2>

            {/* WOD SPECS BAR — dados reais do banco (type_tag, time_cap, result_type) */}
            <div style={{ display: "flex", gap: "12px", marginBottom: "32px", flexWrap: "wrap" }}>
                {wod.type_tag && (
                  <div style={{ background: "rgba(255,255,255,0.05)", padding: "6px 12px", border: "1px solid var(--border-glow)" }}>
                      <span style={{ fontSize: "8px", fontWeight: 800, color: "var(--text-muted)", display: "block", marginBottom: "2px" }}>MODALIDADE</span>
                      <span style={{ fontSize: "11px", fontWeight: 900, color: "var(--text)" }}>{wod.type_tag.toUpperCase()}</span>
                  </div>
                )}
                {wod.time_cap && wod.time_cap > 0 && (
                  <div style={{ background: "rgba(255,255,255,0.05)", padding: "6px 12px", border: "1px solid var(--border-glow)" }}>
                      <span style={{ fontSize: "8px", fontWeight: 800, color: "var(--text-muted)", display: "block", marginBottom: "2px" }}>TIME CAP</span>
                      <span style={{ fontSize: "11px", fontWeight: 900, color: "var(--red)" }}>{wod.time_cap} MIN</span>
                  </div>
                )}
                {wod.result_type && (
                  <div style={{ background: "rgba(255,255,255,0.05)", padding: "6px 12px", border: "1px solid var(--border-glow)" }}>
                      <span style={{ fontSize: "8px", fontWeight: 800, color: "var(--text-muted)", display: "block", marginBottom: "2px" }}>RESULTADO</span>
                      <span style={{ fontSize: "11px", fontWeight: 900, color: "var(--text)" }}>{wod.result_type.toUpperCase()}</span>
                  </div>
                )}
            </div>

            {/* SELETOR DE PERFORMANCE - REFINADO */}
            <div style={{ marginBottom: "32px" }}>
               <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "10px" }}>
                   <div style={{ fontSize: "9px", fontWeight: 800, color: "var(--text)", letterSpacing: "0.2em", textTransform: "uppercase" }}>
                      ESCALONAMENTO TÉCNICO
                   </div>
                   <div style={{ fontSize: "7px", fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.1em" }}>
                      VERSÃO: <span style={{ color: activeLevelInfo?.color }}>{activeLevelInfo?.label.toUpperCase()}</span>
                   </div>
               </div>
               
               <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "4px" }}>
                  {ALL_LEVELS.map((lvl) => {
                    const isStudentLvl = getLevelInfo(studentLevel).id === lvl.id;
                    return (
                        <button
                          key={lvl.id}
                          onClick={() => setActiveLevel(lvl.id)}
                          style={{
                            padding: "12px 0",
                            background: activeLevel === lvl.id ? lvl.color : "rgba(255,255,255,0.06)",
                            color: activeLevel === lvl.id ? lvl.btnTextColor : "var(--text-dim)",
                            border: activeLevel === lvl.id 
                                ? (lvl.id === "L5" ? "1px solid #C5A059" : `1px solid ${lvl.color}`) 
                                : "1px solid rgba(255,255,255,0.05)",
                            boxShadow: activeLevel === lvl.id && lvl.id === "L5" ? "0 0 15px rgba(197, 160, 89, 0.3)" : "none",
                            fontSize: "10px",
                            fontWeight: 900,
                            cursor: "pointer",
                            transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                            fontFamily: "var(--font-display)",
                            position: "relative",
                            opacity: activeLevel === lvl.id ? 1 : 0.6
                          }}
                        >
                          {lvl.id}
                          {isStudentLvl && (
                              <div style={{ 
                                  position: "absolute", 
                                  top: "-4px", 
                                  left: "50%", 
                                  transform: "translateX(-50%)", 
                                  width: "4px", height: "4px", 
                                  background: "var(--red)", 
                                  borderRadius: "50%",
                                  boxShadow: "0 0 8px var(--red)"
                              }} />
                          )}
                        </button>
                    );
                  })}
               </div>
            </div>
          </div>

          <div style={{ padding: "0 24px 32px 24px", display: "flex", flexDirection: "column", gap: "28px" }}>
            {wod.warm_up && (
              <div style={{ opacity: 0.8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                    <h3 style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.3em", color: "var(--text-dim)", textTransform: "uppercase" }}>AQUECIMENTO</h3>
                    <div style={{ flex: 1, height: "1px", background: "linear-gradient(90deg, var(--border-glow), transparent)" }} />
                </div>
                <p style={{ fontSize: "14px", color: "var(--text-dim)", lineHeight: 1.6, paddingLeft: "4px", whiteSpace: "pre-line" }}>
                    {wod.warm_up}
                </p>
              </div>
            )}

            {wod.technique && (
              <div style={{ opacity: 0.9 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                    <h3 style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.3em", color: "var(--lvl-blue)", textTransform: "uppercase" }}>TÉCNICA / SKILL</h3>
                    <div style={{ flex: 1, height: "1px", background: "linear-gradient(90deg, var(--lvl-blue), transparent)", opacity: 0.3 }} />
                </div>
                <p style={{ fontSize: "15px", fontWeight: 600, color: "var(--text)", lineHeight: 1.5, paddingLeft: "4px", whiteSpace: "pre-line" }}>
                    {wod.technique}
                </p>
              </div>
            )}
            
            <div style={{ background: "rgba(227,27,35,0.02)", padding: "20px", border: "1px solid rgba(227,27,35,0.1)", position: "relative" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                  <h3 style={{ fontSize: "9px", fontWeight: 800, letterSpacing: "0.2em", color: activeLevelInfo?.color || "var(--red)", textTransform: "uppercase" }}>
                    DETALHES DO WOD
                  </h3>
                  <div style={{ flex: 1, height: "1px", background: `linear-gradient(90deg, ${activeLevelInfo?.color || "var(--red)"}, transparent)`, opacity: 0.3 }} />
              </div>
              <p key={activeLevel} style={{ fontSize: "17px", fontWeight: 700, whiteSpace: "pre-line", lineHeight: 1.4, animation: "fadeInUp 0.4s ease-out" }}>
                  {adaptedWod}
              </p>
            </div>
          </div>

          {/* UNIFIED STATUS & ACTION BAR */}
          <div style={{ borderTop: "1px solid var(--border-glow)", background: "var(--surface-lowest)" }}>
            <CheckInButton 
                wodId={wod.id} 
                date={selectedDate}
                alreadyChecked={alreadyChecked} 
                holiday={holiday}
            />
          </div>
        </div>
      ) : (
        <div style={{ padding: "64px 24px", textAlign: "center", opacity: 0.5 }}>
          <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.2em" }}>TREINO NÃO DISPONÍVEL</p>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}

"use client";

import React, { useState } from "react";
import { CalendarDays, Dumbbell } from "lucide-react";
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
  checkin: { id: string; status: string; result: string | null; isClassFinished?: boolean; time?: string | null } | null;
  studentLevel: string;
  holiday: any;
  membershipType?: string | null;
  upgradeLink?: string | null;
}

/**
 * WodView: O "Coração Técnico" do aplicativo do aluno.
 * Traduz o banco de treinos em uma experiência de alta performance e motivação.
 * 
 * @architecture
 * - Integra com `CheckInButton` para gerenciar a frequência.
 * - Renderiza resultados de Score pós-validação (SSoT).
 * - Adaptação de Níveis: Mapeia tokens de nível do perfil para rótulos técnicos customizados.
 * 
 * @design
 * - Brutalist Grid: Divisões claras entre blocos (Mobilidade, Aquecimento, WOD).
 * 
 * @param {WodViewProps} props - Dados hidratados do WOD, check-in e perfil.
 */
export default function WodView({ 
  wod, 
  selectedDate, 
  checkin, 
  studentLevel,
  holiday,
  membershipType,
  upgradeLink
}: WodViewProps) {
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
        <div style={{ animation: "entranceUp 0.5s ease-out" }}>
          <div style={{ padding: "32px 24px 0 24px" }}>
            <h2 className="font-display" style={{ 
              fontSize: "clamp(38px, 11vw, 54px)", 
              lineHeight: 0.85, 
              marginBottom: "16px", 
              letterSpacing: "-0.04em",
              fontWeight: 900,
              color: "#000"
            }}>
              {wod.title.split(" ")[0]}
              <br />
              <span style={{ color: "var(--nb-red)" }}>{wod.title.split(" ").slice(1).join(" ")}</span>
            </h2>

            {/* WOD SPECS BAR */}
            <div style={{ display: "flex", gap: "10px", marginBottom: "32px", flexWrap: "wrap", animation: "nbEntrancePop 0.4s ease-out" }}>
                {wod.type_tag && (
                  <div style={{ background: "#f0f0f0", padding: "8px 12px", border: "2px solid #000", boxShadow: "4px 4px 0px #000" }}>
                      <span className="font-headline" style={{ fontSize: "8px", fontWeight: 900, color: "rgba(0,0,0,0.5)", display: "block", marginBottom: "2px" }}>MODALIDADE</span>
                      <span style={{ fontSize: "11px", fontWeight: 900, color: "#000" }}>{wod.type_tag.toUpperCase()}</span>
                  </div>
                )}
                {wod.time_cap && wod.time_cap > 0 && (
                  <div style={{ background: "#000", padding: "8px 12px", border: "2px solid #000", boxShadow: "4px 4px 0px var(--nb-red)" }}>
                      <span className="font-headline" style={{ fontSize: "8px", fontWeight: 900, color: "rgba(255,255,255,0.5)", display: "block", marginBottom: "2px" }}>TIME CAP</span>
                      <span style={{ fontSize: "11px", fontWeight: 900, color: "var(--nb-red)" }}>{wod.time_cap} MIN</span>
                  </div>
                )}
                {wod.result_type && (
                  <div style={{ background: "#f0f0f0", padding: "8px 12px", border: "2px solid #000", boxShadow: "4px 4px 0px #000" }}>
                      <span className="font-headline" style={{ fontSize: "8px", fontWeight: 900, color: "rgba(0,0,0,0.5)", display: "block", marginBottom: "2px" }}>RESULTADO</span>
                      <span style={{ fontSize: "11px", fontWeight: 900, color: "#000" }}>{wod.result_type.toUpperCase()}</span>
                  </div>
                )}
            </div>

            {/* SELETOR DE PERFORMANCE */}
            <div style={{ marginBottom: "32px", animation: "nbEntrancePop 0.5s ease-out" }}>
               <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "12px" }}>
                   <div style={{ fontSize: "10px", fontWeight: 900, color: "#000", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                      ESCALONAMENTO TÉCNICO
                   </div>
               </div>
               
               <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "8px" }}>
                  {ALL_LEVELS.map((lvl) => {
                    const isSelected = activeLevel === lvl.id;
                    const isStudentLvl = getLevelInfo(studentLevel).id === lvl.id;
                    
                    return (
                        <button
                          key={lvl.id}
                          onClick={() => setActiveLevel(lvl.id)}
                          style={{
                            padding: "14px 0",
                            background: isSelected ? lvl.color : "#FFF",
                            color: isSelected ? lvl.btnTextColor : "#000",
                            border: "2px solid #000",
                            boxShadow: isSelected ? "none" : "4px 4px 0px #000",
                            fontSize: "12px",
                            fontWeight: 900,
                            cursor: "pointer",
                            transition: "all 0.1s ease",
                            transform: isSelected ? "translate(2px, 2px)" : "none",
                            position: "relative",
                          }}
                        >
                          {lvl.id}
                          {isStudentLvl && (
                              <div style={{ 
                                  position: "absolute", 
                                  bottom: "4px", 
                                  left: "50%", 
                                  transform: "translateX(-50%)", 
                                  width: "12px", height: "2px", 
                                  background: isSelected ? "#000" : lvl.color,
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
              <div style={{ animation: "nbEntrancePop 0.6s ease-out" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                    <h3 className="font-headline" style={{ fontSize: "11px", fontWeight: 900, letterSpacing: "0.1em", color: "#000", textTransform: "uppercase" }}>AQUECIMENTO</h3>
                    <div style={{ flex: 1, height: "2px", background: "#000" }} />
                </div>
                <p style={{ fontSize: "15px", color: "rgba(0,0,0,0.7)", fontWeight: 500, lineHeight: 1.5, whiteSpace: "pre-line" }}>
                    {wod.warm_up?.replace(/\\n/g, '\n')}
                </p>
              </div>
            )}

            {wod.technique && (
              <div style={{ animation: "nbEntrancePop 0.7s ease-out" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                    <h3 className="font-headline" style={{ fontSize: "11px", fontWeight: 900, letterSpacing: "0.1em", color: "var(--nb-red)", textTransform: "uppercase" }}>TÉCNICA / SKILL</h3>
                    <div style={{ flex: 1, height: "2px", background: "var(--nb-red)" }} />
                </div>
                <p style={{ fontSize: "16px", fontWeight: 700, color: "#000", lineHeight: 1.4, whiteSpace: "pre-line" }}>
                    {wod.technique?.replace(/\\n/g, '\n')}
                </p>
              </div>
            )}
            
            <div style={{ background: "#FFF", padding: "20px", border: "2px solid #000", boxShadow: `6px 6px 0px ${activeLevelInfo?.color || "#000"}`, position: "relative", animation: "nbEntrancePop 0.8s ease-out" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                  <h3 className="font-headline" style={{ fontSize: "11px", fontWeight: 900, letterSpacing: "0.1em", color: "#000", textTransform: "uppercase" }}>
                    DETALHES DO WOD
                  </h3>
              </div>
              <p key={activeLevel} style={{ fontSize: "18px", color: "#000", fontWeight: 900, whiteSpace: "pre-line", lineHeight: 1.3, animation: "nbEntrancePop 0.3s ease-out" }}>
                  {adaptedWod?.replace(/\\n/g, '\n')}
              </p>
            </div>
          </div>



          <style dangerouslySetInnerHTML={{ __html: `
            @keyframes nbEntrancePop {
              from { transform: translateY(15px); opacity: 0; }
              to { transform: translateY(0); opacity: 1; }
            }
          `}} />

          {/* UNIFIED STATUS & ACTION BAR */}
          <div style={{ borderTop: "2px solid #000", background: "#f8f8f8" }}>
            <CheckInButton 
                wodId={wod.id} 
                date={selectedDate}
                alreadyChecked={!!checkin} 
                status={checkin?.status}
                result={checkin?.result}
                isClassFinished={checkin?.isClassFinished}
                holiday={holiday}
                time={checkin?.time}
                membershipType={membershipType}
                upgradeLink={upgradeLink}
            />
          </div>
        </div>
      ) : (
        <div style={{ padding: "64px 24px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
          <div style={{ background: "#f0f0f0", width: "64px", height: "64px", border: "2px solid #000", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "4px 4px 0px #000" }}>
            <CalendarDays size={32} strokeWidth={2.5} />
          </div>
          <div>
            <p className="font-headline" style={{ fontSize: "12px", fontWeight: 900, color: "#000", letterSpacing: "0.1em", marginBottom: "4px" }}>TREINO NÃO DISPONÍVEL</p>
            <p style={{ fontSize: "11px", color: "rgba(0,0,0,0.4)", fontWeight: 600 }}>A programação para este dia ainda não foi liberada.</p>
          </div>
        </div>
      )}
    </>

  );
}

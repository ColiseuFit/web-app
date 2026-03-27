"use client";

import React, { useState, useEffect } from "react";
import CheckInButton from "./CheckInButton";

interface Wod {
  id: string;
  title: string;
  description: string;
  warm_up: string;
  wod_content: string;
  tags?: string[];
}

interface WodViewProps {
  wod: Wod | null;
  selectedDate: string;
  alreadyChecked: boolean;
  studentLevel: string;
}

/**
 * Componente de Visualização do WOD e Escalonamento Técnico.
 * Permite ao aluno alternar entre os filtros de nível (L1-L5) para ver as variações do treino.
 * 
 * @param wod Objeto contendo os dados do WOD (tabela wods).
 * @param selectedDate Data do treino sendo visualizado.
 * @param alreadyChecked Booleano indicando se o aluno já fez check-in.
 * @param studentLevel Nível oficial do aluno (para pré-seleção do filtro).
 * 
 * @technical
 * - Mapeamento de níveis centralizado para garantir cores e contrastes acessíveis.
 * - Suporte a 'VERSÃO: ELITE' com branding Silk Gold diferenciado.
 */
export default function WodView({ wod, selectedDate, alreadyChecked, studentLevel }: WodViewProps) {
  // Mapeamento de níveis (L1 a L5)
  const LEVELS = [
    { id: "L1", label: "INICIANTE", color: "var(--lvl-white)", textColor: "#FFF", btnTextColor: "#000" },
    { id: "L2", label: "SCALE", color: "var(--lvl-green)", textColor: "var(--lvl-green)", btnTextColor: "#000" },
    { id: "L3", label: "INTERMEDIÁRIO", color: "var(--lvl-blue)", textColor: "var(--lvl-blue)", btnTextColor: "#FFF" },
    { id: "L4", label: "RX", color: "var(--red)", textColor: "var(--red)", btnTextColor: "#FFF" },
    { id: "L5", label: "ELITE", color: "#C5A059", textColor: "#C5A059", btnTextColor: "#000" },
  ];

  // Determinar o nível inicial do aluno
  const getInitialLevelId = (lvl: string) => {
    const l = lvl.toLowerCase();
    if (l.includes("preto") || l.includes("elite") || l.includes("casca")) return "L5";
    if (l.includes("vermelho") || l.includes("rx")) return "L4";
    if (l.includes("azul")) return "L3";
    if (l.includes("verde")) return "L2";
    if (l.includes("branco")) return "L1";
    return "L1";
  };

  const [activeLevel, setActiveLevel] = useState(getInitialLevelId(studentLevel));

  // Simulação de adaptação de conteúdo (MOCK)
  // Em produção, isso viria da tabela 'wod_variations' ou similar.
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
  const activeLevelInfo = LEVELS.find(l => l.id === activeLevel);

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

            {/* WOD SPECS BAR */}
            <div style={{ display: "flex", gap: "12px", marginBottom: "32px" }}>
                <div style={{ background: "rgba(255,255,255,0.05)", padding: "6px 12px", border: "1px solid var(--border-glow)" }}>
                    <span style={{ fontSize: "8px", fontWeight: 800, color: "var(--text-muted)", display: "block", marginBottom: "2px" }}>MODALIDADE</span>
                    <span style={{ fontSize: "11px", fontWeight: 900, color: "var(--text)" }}>AMRAP</span>
                </div>
                <div style={{ background: "rgba(255,255,255,0.05)", padding: "6px 12px", border: "1px solid var(--border-glow)" }}>
                    <span style={{ fontSize: "8px", fontWeight: 800, color: "var(--text-muted)", display: "block", marginBottom: "2px" }}>TIME CAP</span>
                    <span style={{ fontSize: "11px", fontWeight: 900, color: "var(--red)" }}>15 MIN</span>
                </div>
            </div>

            {/* SELETOR DE PERFORMANCE - REFINADO */}
            <div style={{ marginBottom: "32px" }}>
               <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "10px" }}>
                   <div style={{ fontSize: "9px", fontWeight: 800, color: "var(--text)", letterSpacing: "0.2em", textTransform: "uppercase" }}>
                      ESCALONAMENTO TÉCNICO
                   </div>
                   <div style={{ fontSize: "7px", fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.1em" }}>
                      VERSÃO: <span style={{ color: activeLevelInfo?.color }}>{activeLevelInfo?.label}</span>
                   </div>
               </div>
               
               <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "4px" }}>
                  {LEVELS.map((lvl) => {
                    const isStudentLvl = getInitialLevelId(studentLevel) === lvl.id;
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
                <p style={{ fontSize: "14px", color: "var(--text-dim)", lineHeight: 1.6, paddingLeft: "4px" }}>
                    {wod.warm_up}
                </p>
              </div>
            )}
            
            <div style={{ background: "rgba(227,27,35,0.02)", padding: "20px", border: "1px solid rgba(227,27,35,0.1)", position: "relative" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                  <h3 style={{ fontSize: "9px", fontWeight: 800, letterSpacing: "0.2em", color: activeLevelInfo?.color || "var(--red)", textTransform: "uppercase" }}>
                    DETALHES DA LOUSA
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
            {alreadyChecked ? (
               <div style={{ display: "flex", flexDirection: "column" }}>
                    <div style={{ padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-glow)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span className="material-symbols-outlined" style={{ color: "var(--lvl-green)", fontSize: "18px" }}>check_circle</span>
                            <span style={{ fontSize: "10px", fontWeight: 800, color: "var(--lvl-green)", letterSpacing: "0.1em" }}>PRESENÇA CONFIRMADA</span>
                        </div>
                        <button style={{ background: "transparent", border: "none", color: "var(--text-muted)", fontSize: "9px", fontWeight: 700, textTransform: "uppercase", cursor: "pointer", textDecoration: "underline" }}>
                            CANCELAR
                        </button>
                    </div>
                    <button style={{ width: "100%", padding: "20px", background: "var(--surface)", color: "var(--text)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", cursor: "pointer", transition: "all 0.2s" }}>
                        <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>edit_calendar</span>
                        <span style={{ fontSize: "11px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em" }}>Alterar Horário de Treino</span>
                    </button>
               </div>
            ) : (
                <CheckInButton 
                    wodId={wod.id} 
                    date={selectedDate}
                    alreadyChecked={alreadyChecked} 
                />
            )}
          </div>
        </div>
      ) : (
        <div style={{ padding: "64px 24px", textAlign: "center", opacity: 0.5 }}>
          <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.2em" }}>PROGRAMAÇÃO SENDO FORJADA...</p>
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

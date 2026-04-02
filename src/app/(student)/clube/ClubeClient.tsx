"use client";

import { useState, useEffect } from "react";
import StudentHeader from "@/components/StudentHeader";
import BottomNav from "@/components/BottomNav";
import ActivityFeed from "@/components/ActivityFeed";
import { Trophy, Globe, Flame } from "lucide-react";

/**
 * Interface para os atletas do ranking
 */
interface LeaderboardEntry {
  id: string;
  display_name: string;
  points_balance: number;
  rank: number;
}

/**
 * Cliente Interativo da Comunidade (O Clube) - EDIÇÃO NEO-BRUTALIST
 */
export default function ClubeClient() {
  const [activeTab, setActiveTab] = useState<"semanal" | "geral">("semanal");
  const [isLoaded, setIsLoaded] = useState(false);

  // Efeito para animação de entrada
  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const MOCK_WEEKLY: LeaderboardEntry[] = [
    { id: "1", display_name: "JOÃO COLISEU", points_balance: 450, rank: 1 },
    { id: "2", display_name: "MARIA SILVA", points_balance: 400, rank: 2 },
    { id: "3", display_name: "RICARDO SOUZA", points_balance: 350, rank: 3 },
    { id: "me", display_name: "VOCÊ", points_balance: 300, rank: 4 },
    { id: "5", display_name: "ANA COSTA", points_balance: 280, rank: 5 },
  ];

  const MOCK_GENERAL: LeaderboardEntry[] = [
    { id: "10", display_name: "GABRIEL FERRO", points_balance: 15400, rank: 1 },
    { id: "11", display_name: "LUANA GRIT", points_balance: 14200, rank: 2 },
    { id: "12", display_name: "CARLOS BRUTO", points_balance: 13800, rank: 3 },
    { id: "1", display_name: "JOÃO COLISEU", points_balance: 12800, rank: 4 },
    { id: "me", display_name: "VOCÊ", points_balance: 12450, rank: 5 },
  ];

  const currentData = activeTab === "semanal" ? MOCK_WEEKLY : MOCK_GENERAL;

  return (
    <>
      {/* BACKGROUND LIGTH */}
      <div 
        style={{ 
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0, 
          zIndex: -1, background: "#FFF" 
        }} 
      />

      <StudentHeader />

      <main style={{ 
        maxWidth: "500px", margin: "0 auto", padding: "0 20px 120px", 
        opacity: isLoaded ? 1 : 0, transition: "all 0.6s cubic-bezier(0.16, 1, 0.3, 1)" 
      }}>
        
        {/* ── HEADER DE IMPACTO ── */}
        <section style={{ paddingTop: "32px", paddingBottom: "32px", textAlign: "center" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "var(--red)", color: "white", padding: "4px 12px", border: "2px solid #000", boxShadow: "4px 4px 0px #000", marginBottom: "16px" }}>
            <Trophy size={14} strokeWidth={3} />
            <span style={{ fontSize: "10px", fontWeight: 900, letterSpacing: "0.2em" }}>HALL DA FAMA</span>
          </div>
          <h1 className="font-display" style={{ fontSize: "52px", fontWeight: 950, lineHeight: 0.8, textTransform: "uppercase", letterSpacing: "-0.04em", margin: 0 }}>
             O CLUBE
          </h1>
          <p className="font-headline" style={{ fontSize: "12px", fontWeight: 800, color: "#000", marginTop: "12px", letterSpacing: "0.15em", textTransform: "uppercase", opacity: 0.6 }}>
            RANKING DE PERFORMANCE COLISEU
          </p>
        </section>

        {/* ── BRUTALIST TAB TOGGLE ── */}
        <div style={{ 
            display: "flex", 
            gap: "10px", 
            marginBottom: "32px", 
        }}>
            <button 
                onClick={() => setActiveTab("semanal")}
                style={{ 
                    flex: 1, 
                    padding: "16px 8px", 
                    background: activeTab === "semanal" ? "#000" : "#FFF", 
                    border: "3px solid #000", 
                    color: activeTab === "semanal" ? "#FFF" : "#000", 
                    fontSize: "11px", 
                    fontWeight: 900, 
                    letterSpacing: "0.1em", 
                    cursor: "pointer",
                    boxShadow: activeTab === "semanal" ? "2px 2px 0px #000" : "6px 6px 0px #000",
                    transform: activeTab === "semanal" ? "translate(4px, 4px)" : "none",
                    transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px"
                }}
            >
                <Flame size={14} strokeWidth={3} />
                LIGA SEMANAL
            </button>
            <button 
                onClick={() => setActiveTab("geral")}
                style={{ 
                    flex: 1, 
                    padding: "16px 8px", 
                    background: activeTab === "geral" ? "#000" : "#FFF", 
                    border: "3px solid #000", 
                    color: activeTab === "geral" ? "#FFF" : "#000", 
                    fontSize: "11px", 
                    fontWeight: 900, 
                    letterSpacing: "0.1em", 
                    cursor: "pointer",
                    boxShadow: activeTab === "geral" ? "2px 2px 0px #000" : "6px 6px 0px #000",
                    transform: activeTab === "geral" ? "translate(4px, 4px)" : "none",
                    transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px"
                }}
            >
                <Globe size={14} strokeWidth={3} />
                GERAL RX
            </button>
        </div>

        {/* ── LISTA DE RANKING (BRUTALIST CONTAINER) ── */}
        <section
          key={activeTab}
          style={{
            background: "#FFF",
            border: "3px solid #000",
            boxShadow: "10px 10px 0px #000",
            position: "relative",
            overflow: "hidden",
            animation: "entrancePop 0.4s cubic-bezier(0.16, 1, 0.3, 1)"
          }}
        >
          {/* Header Barra */}
          <div style={{ 
            padding: "12px 20px", 
            borderBottom: "3px solid #000", 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center", 
            background: "#F0F0F0" 
          }}>
            <span style={{ fontSize: "10px", fontWeight: 900, letterSpacing: "0.1em", color: "#000" }}>
              {activeTab === "semanal" ? "TOP ATLETAS SEMANA" : "OS MAIORES DA HISTÓRIA"}
            </span>
            <div style={{ width: "8px", height: "8px", background: "var(--red)", borderRadius: "50%" }} />
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            {currentData.map((entry, index) => {
                const isMe = entry.id === "me";
                const rank = entry.rank;
                const name = entry.display_name;
                
                return (
                    <div
                      key={entry.id}
                      style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "16px",
                          padding: "20px",
                          borderBottom: index === currentData.length - 1 ? "none" : "2px solid #000",
                          background: isMe ? "#F8FBFF" : "transparent",
                          position: "relative"
                      }}
                    >
                      {isMe && <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "6px", background: "var(--red)" }} />}
                      
                      <div className="font-display" style={{ 
                        fontSize: "24px", 
                        fontWeight: 950,
                        color: rank === 1 ? "#FFD700" : rank === 2 ? "#C0C0C0" : rank === 3 ? "#CD7F32" : "#000", 
                        minWidth: "42px",
                        textAlign: "center",
                        WebkitTextStroke: "1px #000"
                      }}>
                        {rank}
                      </div>

                      <div style={{ flex: 1 }}>
                        <div style={{ 
                          fontSize: "14px", 
                          fontWeight: 900, 
                          color: "#000",
                          letterSpacing: "-0.01em"
                        }}>
                          {name.toUpperCase()}
                        </div>
                        {isMe && (
                          <div style={{ display: "inline-block", background: "var(--red)", color: "white", fontSize: "10px", fontWeight: 900, padding: "2px 8px", marginTop: "4px" }}>
                            MINHA POSIÇÃO
                          </div>
                        )}
                      </div>

                      <div style={{ textAlign: "right" }}>
                        <div className="font-display" style={{ fontSize: "20px", fontWeight: 950, color: "#000" }}>
                          {entry.points_balance.toLocaleString("pt-BR")}
                        </div>
                        <div style={{ fontSize: "9px", fontWeight: 900, color: "#000", opacity: 0.4, letterSpacing: "0.1em" }}>PONTOS</div>
                      </div>
                    </div>
                );
            })}
          </div>
        </section>

        {/* ── ACTIVITY FEED ── */}
        <ActivityFeed />

      </main>

      <BottomNav />
      
      <style jsx>{`
          @keyframes entrancePop {
              from { opacity: 0; transform: scale(0.95) translateY(10px); }
              to { opacity: 1; transform: scale(1) translateY(0); }
          }
      `}</style>
    </>
  );
}

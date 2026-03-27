"use client";

import { useState, useEffect } from "react";
import StudentHeader from "@/components/StudentHeader";
import BottomNav from "@/components/BottomNav";
import ActivityFeed from "@/components/ActivityFeed";

/**
 * Interface para os atletas do ranking
 */
interface LeaderboardEntry {
  id: string;
  display_name: string;
  xp_balance: number;
  rank: number;
}

export default function ClubePage() {
  const [activeTab, setActiveTab] = useState<"semanal" | "geral">("semanal");
  const [isLoaded, setIsLoaded] = useState(false);

  // Efeito para animação de entrada
  useEffect(() => {
    setIsLoaded(true);
  }, []);

  /** 
   * DADOS MOCK - V1.2 (TESTE)
   */
  const MOCK_WEEKLY: LeaderboardEntry[] = [
    { id: "1", display_name: "JOÃO COLISEU", xp_balance: 450, rank: 1 },
    { id: "2", display_name: "MARIA SILVA", xp_balance: 400, rank: 2 },
    { id: "3", display_name: "RICARDO SOUZA", xp_balance: 350, rank: 3 },
    { id: "me", display_name: "VOCÊ", xp_balance: 300, rank: 4 },
    { id: "5", display_name: "ANA COSTA", xp_balance: 280, rank: 5 },
  ];

  const MOCK_GENERAL: LeaderboardEntry[] = [
    { id: "10", display_name: "GABRIEL FERRO", xp_balance: 15400, rank: 1 },
    { id: "11", display_name: "LUANA GRIT", xp_balance: 14200, rank: 2 },
    { id: "12", display_name: "CARLOS BRUTO", xp_balance: 13800, rank: 3 },
    { id: "1", display_name: "JOÃO COLISEU", xp_balance: 12800, rank: 4 },
    { id: "me", display_name: "VOCÊ", xp_balance: 12450, rank: 5 },
  ];

  const currentData = activeTab === "semanal" ? MOCK_WEEKLY : MOCK_GENERAL;

  return (
    <>
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: -1,
          background: "linear-gradient(to bottom, #111 0%, #080808 100%)",
        }}
      >
        <div style={{ position: "absolute", top: "-10%", right: "-20%", width: "50vh", height: "50vh", background: "var(--red)", filter: "blur(200px)", opacity: 0.05, borderRadius: "50%" }} />
      </div>

      <StudentHeader />

      <main style={{ maxWidth: "480px", margin: "0 auto", padding: "0 20px", opacity: isLoaded ? 1 : 0, transition: "opacity 0.8s ease" }}>
        
        {/* ── HEADER ── */}
        <section style={{ paddingTop: "24px", paddingBottom: "32px" }}>
          <h1
            className="font-display"
            style={{
              fontSize: "clamp(26px, 6vw, 32px)",
              lineHeight: 1,
            }}
          >
            O Clube
          </h1>
          <p
            style={{
              fontSize: "12px",
              color: "var(--text-muted)",
              marginTop: "4px",
              letterSpacing: "0.1em",
              textTransform: "uppercase"
            }}
          >
            A Elite do Coliseu
          </p>
        </section>

        {/* ── RANKING TABS (BRUTALIST TOGGLE) ── */}
        <div style={{ 
            display: "flex", 
            gap: "2px", 
            background: "rgba(255,255,255,0.02)", 
            padding: "4px", 
            borderRadius: "4px", 
            marginBottom: "20px", 
            border: "1px solid var(--border-glow)" 
        }}>
            <button 
                onClick={() => setActiveTab("semanal")}
                style={{ 
                    flex: 1, 
                    padding: "12px", 
                    background: activeTab === "semanal" ? "var(--red)" : "transparent", 
                    border: "none", 
                    color: activeTab === "semanal" ? "white" : "var(--text-muted)", 
                    fontSize: "10px", 
                    fontWeight: 900, 
                    letterSpacing: "0.1em", 
                    borderRadius: "2px",
                    cursor: "pointer",
                    transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)"
                }}
            >
                LIGA SEMANAL
            </button>
            <button 
                onClick={() => setActiveTab("geral")}
                style={{ 
                    flex: 1, 
                    padding: "12px", 
                    background: activeTab === "geral" ? "var(--red)" : "transparent", 
                    border: "none", 
                    color: activeTab === "geral" ? "white" : "var(--text-muted)", 
                    fontSize: "10px", 
                    fontWeight: 900, 
                    letterSpacing: "0.1em", 
                    borderRadius: "2px",
                    cursor: "pointer",
                    transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)"
                }}
            >
                RANKING GERAL
            </button>
        </div>

        {/* ── LISTA DE RANKING ── */}
        <section
          key={activeTab} // Força re-render para animação
          style={{
            background: "var(--surface-lowest)",
            border: "1px solid var(--border-glow)",
            position: "relative",
            overflow: "hidden",
            borderRadius: "4px",
            animation: "fadeInRight 0.5s cubic-bezier(0.16, 1, 0.3, 1)"
          }}
        >
          {/* Header */}
          <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border-glow)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255,255,255,0.02)" }}>
            <span style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.3em", color: "var(--red)", textTransform: "uppercase" }}>
              {activeTab === "semanal" ? "DESEMPENHO DA SEMANA" : "ELITE HISTÓRICA"}
            </span>
            <span style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.15em", color: "var(--text-muted)", opacity: 0.5, textTransform: "uppercase" }}>
              RANKING XP
            </span>
          </div>

          {/* Leaderboard rows */}
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
                        padding: "16px 20px",
                        borderBottom: index === currentData.length - 1 ? "none" : "1px solid var(--border-glow)",
                        background: isMe ? "rgba(227,27,35,0.05)" : "transparent",
                    }}
                    >
                    <span className="font-display" style={{ fontSize: rank <= 3 ? "24px" : "18px", color: rank === 1 ? "#C5A059" : rank === 2 ? "var(--red)" : rank === 3 ? "#C0C0C0" : "var(--text-muted)", minWidth: "28px" }}>
                        #{rank}
                    </span>
                    <span style={{ flex: 1, fontSize: "14px", fontWeight: isMe ? 900 : 500, color: isMe ? "var(--text)" : "var(--text-dim)" }}>
                        {name.toUpperCase()}
                        {isMe && <span style={{ marginLeft: "8px", fontSize: "9px", color: "var(--red)", fontWeight: 900 }}>· VOCÊ</span>}
                    </span>
                    <span className="font-display" style={{ fontSize: "16px", color: isMe ? "var(--red)" : "var(--text-muted)" }}>
                        {entry.xp_balance.toLocaleString("pt-BR")}
                    </span>
                    </div>
                );
            })}
          </div>
        </section>

        {/* ── ACTIVITY FEED (RADAR DA ARENA) ── */}
        <ActivityFeed />

        <style jsx>{`
            @keyframes fadeInRight {
                from { opacity: 0; transform: translateX(-10px); }
                to { opacity: 1; transform: translateX(0); }
            }
        `}</style>
      </main>

      <BottomNav />
    </>
  );
}

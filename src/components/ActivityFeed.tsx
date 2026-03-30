"use client";

import React from "react";

/**
 * Interface para os eventos do Feed
 */
interface FeedEvent {
  id: string;
  type: "workout" | "pr" | "streak" | "level";
  user: string;
  content: string;
  time: string;
  icon: string;
}

const MOCK_EVENTS: FeedEvent[] = [
  {
    id: "1",
    type: "workout",
    user: "JOÃO COLISEU",
    content: "Completou o WOD 'MURPH' em RX (38:45)",
    time: "HÁ 12 MIN",
    icon: "🔥",
  },
  {
    id: "2",
    type: "pr",
    user: "MARIA SILVA",
    content: "Bateu novo recorde (PR) no Back Squat: 110kg!",
    time: "HÁ 45 MIN",
    icon: "🏋️",
  },
  {
    id: "3",
    type: "streak",
    user: "RICARDO SOUZA",
    content: "Atingiu a marca de 15 dias seguidos (STREAK)!",
    time: "HÁ 2 HORAS",
    icon: "⚡",
  },
  {
    id: "4",
    type: "level",
    user: "ANA COSTA",
    content: "Subiu para o nível técnico VERMELHO (RX)!",
    time: "HÁ 5 HORAS",
    icon: "🎖️",
  },
];

export default function ActivityFeed() {
  return (
    <div style={{ marginTop: "40px", marginBottom: "120px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
        <h2 className="font-display" style={{ fontSize: "16px", letterSpacing: "0.1em", textTransform: "uppercase" }}>FEED DO COLISEU</h2>
        <div style={{ flex: 1, height: "1px", background: "linear-gradient(90deg, var(--red), transparent)" }} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {MOCK_EVENTS.map((event, i) => (
          <div 
            key={event.id}
            style={{ 
              background: "var(--surface-lowest)", 
              border: "1px solid var(--border-glow)", 
              padding: "16px",
              borderRadius: "4px",
              display: "flex",
              gap: "16px",
              alignItems: "center",
              animation: `fadeInUp 0.5s ease forwards ${i * 0.1}s`,
              opacity: 0,
              transform: "translateY(10px)"
            }}
          >
            <div style={{ 
              width: "40px", 
              height: "40px", 
              background: "rgba(255,255,255,0.03)", 
              borderRadius: "50%", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center",
              fontSize: "20px",
              border: "1px solid var(--border-glow)"
            }}>
              {event.icon}
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
                <span style={{ fontSize: "10px", fontWeight: 900, color: "var(--text)", letterSpacing: "0.05em" }}>{event.user}</span>
                <span style={{ fontSize: "8px", fontWeight: 700, color: "var(--text-muted)" }}>{event.time}</span>
              </div>
              <p style={{ fontSize: "12px", color: "var(--text-dim)", lineHeight: "1.4" }}>
                {event.content}
              </p>
            </div>
          </div>
        ))}
      </div>

      <style jsx>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

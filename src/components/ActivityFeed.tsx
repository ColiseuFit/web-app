"use client";

import React from "react";
import { Flame, Zap, TrendingUp, Award, LucideIcon } from "lucide-react";

/**
 * Interface para os eventos do Feed
 */
interface FeedEvent {
  id: string;
  type: "workout" | "pr" | "streak" | "level";
  user: string;
  content: string;
  time: string;
  icon: LucideIcon;
  color: string;
}

const MOCK_EVENTS: FeedEvent[] = [
  {
    id: "1",
    type: "workout",
    user: "JOÃO COLISEU",
    content: "Completou o WOD 'MURPH' em RX (38:45)",
    time: "HÁ 12 MIN",
    icon: Flame,
    color: "#FF3B30"
  },
  {
    id: "2",
    type: "pr",
    user: "MARIA SILVA",
    content: "Bateu novo recorde (PR) no Back Squat: 110kg!",
    time: "HÁ 45 MIN",
    icon: TrendingUp,
    color: "#34C759"
  },
  {
    id: "3",
    type: "streak",
    user: "RICARDO SOUZA",
    content: "Atingiu a marca de 15 dias seguidos (STREAK)!",
    time: "HÁ 2 HORAS",
    icon: Zap,
    color: "#FFCC00"
  },
  {
    id: "4",
    type: "level",
    user: "ANA COSTA",
    content: "Subiu para o nível técnico VERMELHO (RX)!",
    time: "HÁ 5 HORAS",
    icon: Award,
    color: "#5856D6"
  },
];

export default function ActivityFeed() {
  return (
    <div style={{ marginTop: "48px", marginBottom: "40px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "24px" }}>
        <h2 className="font-display" style={{ 
          fontSize: "18px", 
          fontWeight: 950, 
          letterSpacing: "0.05em", 
          textTransform: "uppercase",
          color: "#000"
        }}>
          FEED DA COMUNIDADE
        </h2>
        <div style={{ flex: 1, height: "4px", background: "#000" }} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {MOCK_EVENTS.map((event, i) => {
          const Icon = event.icon;
          return (
            <div 
              key={event.id}
              style={{ 
                background: "#FFF", 
                border: "2px solid #000", 
                padding: "20px",
                boxShadow: "4px 4px 0px #000",
                display: "flex",
                gap: "16px",
                alignItems: "flex-start",
                animation: `entranceUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards ${i * 0.1}s`,
                opacity: 0,
              }}
            >
              <div style={{ 
                width: "44px", 
                height: "44px", 
                background: "#F0F0F0", 
                border: "2px solid #000", 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center",
                flexShrink: 0,
                boxShadow: `2px 2px 0px ${event.color}`
              }}>
                <Icon size={20} color={event.color} strokeWidth={3} />
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4px" }}>
                  <span className="font-headline" style={{ fontSize: "11px", fontWeight: 900, color: "#000", letterSpacing: "0.1em" }}>
                    {event.user}
                  </span>
                  <span style={{ fontSize: "9px", fontWeight: 700, color: "#000", opacity: 0.4 }}>
                    {event.time}
                  </span>
                </div>
                <p style={{ 
                  fontSize: "13px", 
                  fontWeight: 600,
                  color: "#000", 
                  lineHeight: "1.4",
                  letterSpacing: "-0.01em"
                }}>
                  {event.content}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <style jsx>{`
        @keyframes entranceUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

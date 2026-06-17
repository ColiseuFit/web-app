"use client";

import React from "react";
import { Trophy, Medal, Flame } from "lucide-react";
import AthleteAvatar from "@/components/Identity/AthleteAvatar";
import { getLevelInfo } from "@/lib/constants/levels";
import { LeaderboardEntry } from "./actions-leaderboard";

interface DailyResultsListProps {
  results: LeaderboardEntry[];
  formatDisplayName: (name: string) => string;
}

export default function DailyResultsList({ results, formatDisplayName }: DailyResultsListProps) {
  if (results.length === 0) {
    return (
      <div style={{ 
        padding: "48px 24px", 
        textAlign: "center", 
        background: "#FFF", 
        border: "3px dashed #000",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "12px",
        animation: "entrancePop 0.3s ease"
      }}>
        <Medal size={36} color="#000" style={{ opacity: 0.2 }} />
        <div style={{ fontSize: "12px", fontWeight: 900, color: "#000", textTransform: "uppercase", letterSpacing: "0.1em", lineHeight: 1.4 }}>
          Nenhum resultado registrado<br />nesta categoria hoje.
        </div>
      </div>
    );
  }

  const rankColors = ["#FBBF24", "#9CA3AF", "#B45309"];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {results.map((aluno, index) => {
        const isTop3 = index < 3;
        const rankColor = isTop3 ? rankColors[index] : "#E5E7EB";
        const levelInfo = getLevelInfo(aluno.performance_level);

        const cardBg = index === 0 
          ? "linear-gradient(135deg, #FFFDF2 0%, #FFFBEA 100%)"
          : index === 1
          ? "linear-gradient(135deg, #FAFAFA 0%, #F4F4F5 100%)"
          : index === 2
          ? "linear-gradient(135deg, #FFFBF9 0%, #FFF7F2 100%)"
          : "#FFF";

        return (
          <div 
            key={aluno.student_id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "12px 14px",
              background: cardBg,
              border: "2px solid #000",
              boxShadow: isTop3 ? `4px 4px 0px ${rankColor}` : "3px 3px 0px #000",
              position: "relative",
              transition: "transform 0.15s ease, box-shadow 0.15s ease",
              animation: "slideInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) both",
              animationDelay: `${index * 0.05}s`
            }}
          >
            {index === 0 && (
              <div style={{ position: "absolute", top: 0, left: 0, width: "4px", height: "100%", background: rankColor }} />
            )}

            {/* Avatar + Rank */}
            <div style={{ position: "relative", width: "44px", height: "44px", flexShrink: 0 }}>
              <AthleteAvatar
                url={aluno.avatar_url}
                name={aluno.student_name}
                size={44}
                borderWidth={2}
                shadowSize={0}
                rounded={true}
              />
              <div style={{
                position: "absolute",
                top: "-4px",
                left: "-4px",
                width: "18px",
                height: "18px",
                borderRadius: "50%",
                border: "1.5px solid #000",
                background: index < 3 ? rankColor : "#FFF",
                color: index < 3 ? "#000" : "#666",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "9px",
                fontWeight: 950,
                boxShadow: "1px 1px 0px #000",
                zIndex: 2
              }}>
                {index + 1}
              </div>
            </div>

            {/* Nome & Badges */}
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "4px", width: "100%" }}>
                {isTop3 && (
                  <div style={{ flexShrink: 0, display: "flex", alignItems: "center" }}>
                    {index === 0 && <Trophy size={13} fill="#FBBF24" color="#000" />}
                    {index === 1 && <Trophy size={13} fill="#9CA3AF" color="#000" />}
                    {index === 2 && <Trophy size={13} fill="#B45309" color="#000" />}
                  </div>
                )}
                <span style={{ 
                  fontSize: "14px", 
                  fontWeight: 950, 
                  color: "#000", 
                  lineHeight: "1.1", 
                  textTransform: "uppercase",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  flex: 1,
                  minWidth: 0
                }}>
                  {formatDisplayName(aluno.student_name)}
                </span>
              </div>
              
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "6px", flexWrap: "wrap" }}>
                <span style={{ 
                  fontSize: "8px", 
                  fontWeight: 900, 
                  background: levelInfo.color, 
                  color: levelInfo.textColor || "#FFF", 
                  padding: "2px 6px", 
                  border: "1px solid #000", 
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  display: "inline-flex",
                  alignItems: "center",
                  lineHeight: "1",
                  whiteSpace: "nowrap"
                }}>
                  <span>{levelInfo.label}</span>
                </span>

                <span style={{
                  fontSize: "8px",
                  fontWeight: 900,
                  background: "#000",
                  color: "#FFF",
                  padding: "2px 6px",
                  border: "1px solid #000",
                  textTransform: "uppercase",
                  fontFamily: "var(--font-mono, monospace)",
                  letterSpacing: "0.02em",
                  display: "inline-flex",
                  alignItems: "center",
                  lineHeight: "1",
                  whiteSpace: "nowrap"
                }}>
                  <span>{aluno.result_display}</span>
                </span>

                {aluno.is_cap && (
                  <span style={{ 
                    fontSize: "8px", 
                    fontWeight: 900, 
                    background: "#FEF2F2",
                    color: "#EF4444", 
                    padding: "2px 6px", 
                    border: "1px solid #EF4444", 
                    textTransform: "uppercase", 
                    display: "inline-flex", 
                    alignItems: "center", 
                    gap: "2px",
                    lineHeight: "1",
                    whiteSpace: "nowrap",
                    flexShrink: 0
                  }}>
                    <Flame size={8} style={{ flexShrink: 0 }} />
                    <span>CAP</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

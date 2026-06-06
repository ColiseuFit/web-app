"use client";

import React from "react";
import { Activity, Users, Trophy, Star } from "lucide-react";

interface CoachKpisProps {
  totalResults: number;
  uniqueStudents: number;
  totalWods: number;
  excellenceCount: number;
}

/**
 * CoachKpis: Grid displaying aggregate student performance metrics.
 * Built using CSS Variables, Lucide icons and brutalist elements.
 */
export default function CoachKpis({
  totalResults,
  uniqueStudents,
  totalWods,
  excellenceCount,
}: CoachKpisProps) {
  const kpiData = [
    {
      icon: <Activity size={18} />,
      label: "RESULTADOS",
      value: totalResults,
      color: "#222",
    },
    {
      icon: <Users size={18} />,
      label: "ALUNOS ÚNICOS",
      value: uniqueStudents,
      color: "#2980BA",
    },
    {
      icon: <Trophy size={18} />,
      label: "TREINOS",
      value: totalWods,
      color: "var(--red, #E31B23)",
    },
    {
      icon: <Star size={18} fill="#FFF" />,
      label: "EXCELÊNCIA",
      value: excellenceCount,
      color: "#C5A059",
    },
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(2, 1fr)",
        gap: "14px",
        marginBottom: "28px",
        animation: "fadeIn 0.4s ease-out",
      }}
    >
      {kpiData.map((kpi, i) => (
        <div
          key={i}
          style={{
            background: "#FFF",
            border: `2px solid ${kpi.color}`,
            boxShadow: `4px 4px 0px ${kpi.color}`,
            borderRadius: "6px",
            padding: "16px",
            display: "flex",
            alignItems: "center",
            gap: "14px",
            transition: "all 0.2s ease",
            cursor: "default",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translate(-2px, -2px)";
            e.currentTarget.style.boxShadow = `6px 6px 0px ${kpi.color}`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "none";
            e.currentTarget.style.boxShadow = `4px 4px 0px ${kpi.color}`;
          }}
        >
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "4px",
              background: kpi.color,
              color: "#FFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              boxShadow: "2px 2px 0px #000",
            }}
          >
            {kpi.icon}
          </div>
          <div>
            <div
              style={{
                fontSize: "26px",
                fontWeight: 950,
                color: "#000",
                lineHeight: 1,
                fontFamily: "'Space Grotesk', sans-serif",
              }}
            >
              {kpi.value}
            </div>
            <div
              style={{
                fontSize: "10px",
                fontWeight: 800,
                color: "#777",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginTop: "2px",
              }}
            >
              {kpi.label}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

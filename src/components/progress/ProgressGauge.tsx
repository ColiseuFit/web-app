"use client";

import React from "react";

interface ProgressGaugeProps {
  current: number;
  target: number;
  label: string;
}

export const ProgressGauge: React.FC<ProgressGaugeProps> = ({ current, target }) => {
  const radius = 75;
  const strokeWidth = 10;
  const normalizedRadius = radius - strokeWidth * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const progress = Math.min(current / target, 1);
  const strokeDashoffset = circumference - progress * circumference;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "transparent" }}>
      
      <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {/* SVG Gauge */}
        <svg
          height={radius * 2}
          width={radius * 2}
          style={{ transform: "rotate(-90deg)" }}
        >
          {/* Background circle track */}
          <circle
            stroke="#f0f0f0"
            fill="transparent"
            strokeWidth={strokeWidth}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
          
          {/* Progress circle arc */}
          <circle
            stroke={current >= target ? "#10b981" : "#E31B23"}
            fill="transparent"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference + " " + circumference}
            style={{ 
              strokeDashoffset,
              transition: "stroke-dashoffset 1s cubic-bezier(0.18, 0.89, 0.32, 1.28)"
            }}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
        </svg>

        {/* Text overlay */}
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <span className="font-display" style={{ fontSize: "56px", fontWeight: 900, fontStyle: "italic", color: "#000", lineHeight: 0.8 }}>
            {current}
          </span>
          <div style={{ height: "4px", width: "16px", backgroundColor: "#000", margin: "10px 0" }} />
          <span style={{ fontSize: "12px", color: "rgba(0,0,0,0.5)", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.2em" }}>
            ALVO {target}
          </span>
        </div>
      </div>

      <div style={{ marginTop: "24px", textAlign: "center", width: "100%" }}>
        <p className="font-headline" style={{ 
          fontSize: "10px", 
          color: "#FFF", 
          background: "#000",
          fontWeight: 900, 
          textTransform: "uppercase", 
          letterSpacing: "0.15em", 
          display: "inline-flex", 
          alignItems: "center", 
          justifyContent: "center", 
          gap: "8px",
          padding: "6px 16px",
          border: "2px solid #000"
        }}>
          {Math.round(progress * 100)}% DA META CONCLUÍDA
        </p>
      </div>
    </div>
  );
};

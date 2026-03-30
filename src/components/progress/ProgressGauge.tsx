"use client";

import React from "react";

interface ProgressGaugeProps {
  current: number;
  target: number;
  label: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const ProgressGauge: React.FC<ProgressGaugeProps> = ({ current, target, label }) => {
  const radius = 75;
  const strokeWidth = 10;
  const normalizedRadius = radius - strokeWidth * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const progress = Math.min(current / target, 1);
  const strokeDashoffset = circumference - progress * circumference;

  return (
    <div className="flex flex-col items-center justify-center relative overflow-hidden bg-transparent">
      
      <div className="relative flex items-center justify-center">
        {/* SVG Gauge */}
        <svg
          height={radius * 2}
          width={radius * 2}
          className="transform -rotate-90 filter drop-shadow-[0_0_12px_rgba(227,27,35,0.2)]"
        >
          <defs>
            <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="var(--red)" />
              <stop offset="100%" stopColor="#ff4d6d" />
            </linearGradient>
            <filter id="neonGlow">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Background circle track */}
          <circle
            stroke="var(--surface-highest)"
            fill="transparent"
            strokeWidth={strokeWidth}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
          
          {/* Progress circle arc */}
          <circle
            stroke="url(#gaugeGradient)"
            fill="transparent"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference + " " + circumference}
            style={{ 
              strokeDashoffset,
              filter: progress > 0 ? "url(#neonGlow)" : "none" 
            }}
            strokeLinecap="round"
            r={normalizedRadius}
            cx={radius}
            cy={radius}
            className="transition-all duration-1000 ease-in-out"
          />
        </svg>

        {/* Text overlay */}
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <span className="font-display" style={{ fontSize: "48px", fontWeight: 900, fontStyle: "italic", color: "white", lineHeight: 1 }}>
            {current}
          </span>
          <div style={{ height: "1px", width: "24px", backgroundColor: "var(--border-glow)", margin: "8px 0" }} />
          <span style={{ fontSize: "10px", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.4em" }}>
            /{target}
          </span>
        </div>
      </div>

      <div style={{ marginTop: "32px", textAlign: "center", position: "relative", zIndex: 10, padding: "0 16px" }}>
        <h3 style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.38em", marginBottom: "4px" }}>
          COMPROMISSO SEMANAL
        </h3>
        <p style={{ fontSize: "9px", color: "var(--text-muted)", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.15em", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
          <span style={{ width: "6px", height: "6px", backgroundColor: "var(--red)", borderRadius: "50%" }} className="animate-pulse" />
          {Math.round(progress * 100)}% CONCLUÍDO
        </p>
      </div>
    </div>
  );
};

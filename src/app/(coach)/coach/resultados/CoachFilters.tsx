"use client";

import React from "react";
import { Search, Calendar } from "lucide-react";

interface CoachFiltersProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  levelFilter: string;
  setLevelFilter: (lvl: string) => void;
  activePreset: string;
  handleDateFilterChange: (from: string, to: string) => void;
  customFrom: string;
  setCustomFrom: (d: string) => void;
  customTo: string;
  setCustomTo: (d: string) => void;
  todayStr: string;
  sevenDaysAgoStr: string;
  firstDayStr: string;
}

/**
 * CoachFilters: Handles search text, date presets/custom range, and level filter pills.
 * Follows strict aesthetics matching the brutalist theme.
 */
export default function CoachFilters({
  searchQuery,
  setSearchQuery,
  levelFilter,
  setLevelFilter,
  activePreset,
  handleDateFilterChange,
  customFrom,
  setCustomFrom,
  customTo,
  setCustomTo,
  todayStr,
  sevenDaysAgoStr,
  firstDayStr,
}: CoachFiltersProps) {
  const levelOptions = [
    { key: "todos", label: "Todos Níveis", color: "#111", text: "#FFF" },
    { key: "iniciante", label: "Iniciante", color: "#F5F5F5", text: "#000" },
    { key: "scale", label: "Scale", color: "#2DAB61", text: "#FFF" },
    { key: "intermediario", label: "Intermediário", color: "#2980BA", text: "#FFF" },
    { key: "rx", label: "RX", color: "#E52521", text: "#FFF" },
    { key: "elite", label: "Elite", color: "#C5A059", text: "#FFF" },
  ];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "18px",
        marginBottom: "28px",
        animation: "fadeIn 0.45s ease-out",
      }}
    >
      {/* FILTRO DE PERÍODO (DATAS) */}
      <div
        style={{
          background: "#FFF",
          border: "2px solid #000",
          borderRadius: "6px",
          boxShadow: "2px 2px 0px #000",
          padding: "16px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "12px",
            fontSize: "11px",
            fontWeight: 900,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: "#374151",
          }}
        >
          <Calendar size={14} />
          <span>Período de Resultados:</span>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "stretch",
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          {/* Presets Rápidos */}
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {[
              { key: "hoje", label: "Hoje", from: todayStr, to: todayStr },
              { key: "7dias", label: "7 Dias", from: sevenDaysAgoStr, to: todayStr },
              { key: "mes", label: "Este Mês", from: firstDayStr, to: todayStr },
              { key: "custom", label: "Personalizado", from: customFrom, to: customTo },
            ].map((p) => {
              const isActive = activePreset === p.key;
              return (
                <button
                  key={p.key}
                  onClick={() => {
                    if (p.key !== "custom") {
                      handleDateFilterChange(p.from, p.to);
                    } else {
                      handleDateFilterChange(customFrom, customTo);
                    }
                  }}
                  style={{
                    padding: "6px 12px",
                    fontSize: "11px",
                    fontWeight: 800,
                    textTransform: "uppercase",
                    border: "2px solid #000",
                    borderRadius: "4px",
                    background: isActive ? "#000" : "#FFF",
                    color: isActive ? "#FFF" : "#000",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          {/* Inputs Customizados de Intervalo */}
          {activePreset === "custom" && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                flex: "1 1 auto",
                minWidth: "240px",
              }}
            >
              <input
                type="date"
                value={customFrom}
                onChange={(e) => {
                  const from = e.target.value;
                  setCustomFrom(from);
                  if (from && customTo) handleDateFilterChange(from, customTo);
                }}
                style={{
                  padding: "4px 8px",
                  border: "2px solid #000",
                  borderRadius: "4px",
                  fontSize: "12px",
                  fontWeight: 700,
                  outline: "none",
                  width: "100%",
                }}
              />
              <span style={{ fontSize: "11px", fontWeight: 800 }}>ATÉ</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => {
                  const to = e.target.value;
                  setCustomTo(to);
                  if (customFrom && to) handleDateFilterChange(customFrom, to);
                }}
                style={{
                  padding: "4px 8px",
                  border: "2px solid #000",
                  borderRadius: "4px",
                  fontSize: "12px",
                  fontWeight: 700,
                  outline: "none",
                  width: "100%",
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* BUSCA POR NOME DE ALUNO */}
      <div style={{ position: "relative" }}>
        <Search
          size={18}
          style={{
            position: "absolute",
            left: "16px",
            top: "50%",
            transform: "translateY(-50%)",
            color: "#999",
            pointerEvents: "none",
          }}
        />
        <input
          type="text"
          placeholder="Buscar aluno por nome..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "14px 16px 14px 48px",
            fontSize: "14px",
            fontWeight: 600,
            border: "2px solid #000",
            borderRadius: "6px",
            background: "#FFF",
            color: "#000",
            outline: "none",
            boxShadow: "2px 2px 0px #000",
            transition: "all 0.15s ease",
          }}
          onFocus={(e) => {
            e.target.style.borderColor = "var(--red, #E31B23)";
            e.target.style.boxShadow = "4px 4px 0px #000";
          }}
          onBlur={(e) => {
            e.target.style.borderColor = "#000";
            e.target.style.boxShadow = "2px 2px 0px #000";
          }}
        />
      </div>

      {/* PÍLULAS DE FILTRO DE NÍVEIS */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
        {levelOptions.map((opt) => {
          const isSelected = levelFilter === opt.key;
          return (
            <button
              key={opt.key}
              onClick={() => setLevelFilter(opt.key)}
              style={{
                padding: "6px 14px",
                fontSize: "10px",
                fontWeight: 900,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                border: "2px solid #000",
                borderRadius: "20px",
                background: isSelected ? opt.color : "#FFF",
                color: isSelected ? opt.text : "#000",
                cursor: "pointer",
                boxShadow: isSelected ? "2px 2px 0px #000" : "none",
                transition: "all 0.15s cubic-bezier(0.4, 0, 0.2, 1)",
                whiteSpace: "nowrap",
                transform: isSelected ? "translate(-1px, -1px)" : "none",
              }}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.background = "#F9FAFB";
                  e.currentTarget.style.transform = "translateY(-1px)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.background = "#FFF";
                  e.currentTarget.style.transform = "none";
                }
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

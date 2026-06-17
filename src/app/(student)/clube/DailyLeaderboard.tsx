"use client";

import React, { useState, useEffect } from "react";
import { Calendar } from "lucide-react";
import { getCombinedLeaderboard } from "./actions-leaderboard";
import type { DailyLeaderboardData } from "./actions-daily-leaderboard";
import type { WeeklyLeaderboardData } from "./actions-weekly-leaderboard";
import { getLevelInfo, ALL_LEVELS } from "@/lib/constants/levels";
import DailyResultsList from "./DailyResultsList";
import WeeklyResultsList from "./WeeklyResultsList";

function formatDateBR(dateStr: string) {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function formatDisplayName(name: string) {
  if (!name) return "";
  const parts = name.trim().split(/\s+/);
  if (parts.length <= 2) return name;
  const last = parts[parts.length - 1];
  const first = parts[0];
  const lowercaseLast = last.toLowerCase();
  if (["filho", "neto", "junior", "jr", "sobrinho"].includes(lowercaseLast) && parts.length > 2) {
    return `${first} ${parts[parts.length - 2]} ${last}`;
  }
  return `${first} ${last}`;
}

export default function DailyLeaderboard() {
  const [dailyData, setDailyData] = useState<DailyLeaderboardData | null>(null);
  const [weeklyData, setWeeklyData] = useState<WeeklyLeaderboardData | null>(null);
  const [viewMode, setViewMode] = useState<"diario" | "semanal">("diario");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>("geral");

  useEffect(() => {
    async function loadAll() {
      setLoading(true);
      const res = await getCombinedLeaderboard();
      
      if (res.success) {
        if (res.daily) setDailyData(res.daily);
        if (res.weekly) setWeeklyData(res.weekly);
      } else {
        setError(res.error || "Erro ao carregar os rankings.");
      }
      setLoading(false);
    }
    loadAll();
  }, []);

  if (loading) {
    return (
      <div style={{ 
        background: "#FFF", 
        border: "3px solid #000", 
        boxShadow: "8px 8px 0px #000",
        padding: "24px 16px",
      }}>
        <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
          <div style={{ flex: 1, height: "38px", background: "#E5E7EB", border: "2px solid #000" }} className="skeleton-pulse" />
          <div style={{ flex: 1, height: "38px", background: "#E5E7EB", border: "2px solid #000" }} className="skeleton-pulse" />
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "24px", borderBottom: "2px dashed #E5E7EB", paddingBottom: "20px" }}>
          <div style={{ width: "120px", height: "20px", background: "#E5E7EB", border: "2px solid #000" }} className="skeleton-pulse" />
          <div style={{ width: "200px", height: "28px", background: "#E5E7EB", border: "2px solid #000", marginTop: "14px" }} className="skeleton-pulse" />
        </div>
        <div style={{ width: "100%", height: "40px", background: "#E5E7EB", border: "2px solid #000", marginBottom: "20px" }} className="skeleton-pulse" />
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {[1, 2, 3, 4].map((i) => (
            <div 
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "12px 14px",
                background: "#FFF",
                border: "2px solid #E5E7EB",
              }}
            >
              <div style={{ width: "44px", height: "44px", borderRadius: "50%", background: "#E5E7EB", border: "2px solid #E5E7EB", flexShrink: 0 }} className="skeleton-pulse" />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
                <div style={{ width: "60%", height: "14px", background: "#E5E7EB" }} className="skeleton-pulse" />
                <div style={{ width: "40%", height: "10px", background: "#E5E7EB" }} className="skeleton-pulse" />
              </div>
            </div>
          ))}
        </div>
        <style dangerouslySetInnerHTML={{ __html: `
          .skeleton-pulse { animation: pulse 1.5s ease-in-out infinite; }
          @keyframes pulse { 0% { opacity: 0.6; } 50% { opacity: 1; } 100% { opacity: 0.6; } }
        `}} />
      </div>
    );
  }

  if (error || !dailyData) {
    return (
      <div style={{ padding: "40px 20px", textAlign: "center", background: "#FFF", border: "3px solid #000", boxShadow: "8px 8px 0px #000" }}>
        <div style={{ fontSize: "14px", fontWeight: 900, color: "var(--red)", textTransform: "uppercase" }}>
          {error}
        </div>
      </div>
    );
  }

  const filteredDailyResults = activeFilter === "geral"
    ? dailyData.results
    : dailyData.results.filter((r) => getLevelInfo(r.performance_level).key === activeFilter);

  const filteredWeeklyResults = weeklyData
    ? (activeFilter === "geral"
      ? weeklyData.results
      : weeklyData.results.filter((r) => getLevelInfo(r.performance_level).key === activeFilter))
    : [];

  return (
    <div style={{ 
      background: "#FFF", 
      border: "3px solid #000", 
      boxShadow: "8px 8px 0px #000",
      padding: "24px 16px",
      animation: "entrancePop 0.4s cubic-bezier(0.16, 1, 0.3, 1)"
    }}>
      {/* ── SELETOR DE MODO (DIÁRIO / SEMANAL) ── */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
        <button
          onClick={() => setViewMode("diario")}
          style={{
            flex: 1,
            padding: "10px",
            fontSize: "11px",
            fontWeight: 900,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            background: viewMode === "diario" ? "#000" : "#FFF",
            color: viewMode === "diario" ? "#FFF" : "#000",
            border: "2px solid #000",
            boxShadow: viewMode === "diario" ? "2px 2px 0px #000" : "none",
            transform: viewMode === "diario" ? "translate(-1px, -1px)" : "none",
            cursor: "pointer",
            transition: "all 0.15s cubic-bezier(0.16, 1, 0.3, 1)"
          }}
        >
          Do Dia
        </button>
        <button
          onClick={() => setViewMode("semanal")}
          style={{
            flex: 1,
            padding: "10px",
            fontSize: "11px",
            fontWeight: 900,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            background: viewMode === "semanal" ? "#000" : "#FFF",
            color: viewMode === "semanal" ? "#FFF" : "#000",
            border: "2px solid #000",
            boxShadow: viewMode === "semanal" ? "2px 2px 0px #000" : "none",
            transform: viewMode === "semanal" ? "translate(-1px, -1px)" : "none",
            cursor: "pointer",
            transition: "all 0.15s cubic-bezier(0.16, 1, 0.3, 1)"
          }}
        >
          Da Semana
        </button>
      </div>

      {/* ── CABEÇALHO DO LEADERBOARD ── */}
      <div style={{ textAlign: "center", marginBottom: "24px", borderBottom: "2px dashed #000", paddingBottom: "20px" }}>
        <div style={{ 
          display: "inline-flex", 
          alignItems: "center", 
          gap: "6px", 
          background: "#000", 
          color: "#FFF", 
          padding: "6px 14px", 
          fontSize: "10px", 
          fontWeight: 900, 
          textTransform: "uppercase", 
          letterSpacing: "0.1em",
          whiteSpace: "nowrap",
          flexShrink: 0 
        }}>
          <Calendar size={12} style={{ flexShrink: 0 }} />
          <span style={{ flexShrink: 0, lineHeight: "1" }}>
            {viewMode === "diario" 
              ? formatDateBR(dailyData.date) 
              : weeklyData 
              ? `SEMANA: ${weeklyData.start_date} A ${weeklyData.end_date}` 
              : "SEMANA ATUAL"}
          </span>
        </div>
        <h2 style={{ 
          fontSize: "26px", 
          fontWeight: 950, 
          color: "#000", 
          marginTop: "14px", 
          lineHeight: 1.1, 
          textTransform: "uppercase", 
          letterSpacing: "-0.02em" 
        }}>
          {viewMode === "diario" ? dailyData.wod_title : "ACUMULADO SEMANAL"}
        </h2>
      </div>

      {/* ── SELETOR DE NÍVEL (DROP-DOWN NEO-BRUTALISTA) ── */}
      <div style={{ position: "relative", marginBottom: "24px" }}>
        <select
          value={activeFilter}
          onChange={(e) => setActiveFilter(e.target.value)}
          style={{
            width: "100%",
            padding: "12px 16px",
            fontSize: "11px",
            fontWeight: 900,
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            background: "#FFF",
            color: "#000",
            border: "2px solid #000",
            boxShadow: "3px 3px 0px #000",
            cursor: "pointer",
            outline: "none",
            borderRadius: "0px",
            appearance: "none",
            backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23000000' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
            backgroundRepeat: "no-repeat",
            backgroundPosition: "right 14px center",
            backgroundSize: "14px",
            paddingRight: "44px"
          }}
        >
          <option value="geral">GERAL (TODOS OS NÍVEIS)</option>
          {ALL_LEVELS.map((lvl) => (
            <option key={lvl.key} value={lvl.key}>
              {lvl.label.toUpperCase()}
            </option>
          ))}
        </select>
      </div>

      {/* ── CONTEÚDO LISTAGEM ── */}
      {viewMode === "diario" ? (
        <DailyResultsList results={filteredDailyResults} formatDisplayName={formatDisplayName} />
      ) : (
        <WeeklyResultsList results={filteredWeeklyResults} formatDisplayName={formatDisplayName} />
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes entrancePop {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes slideInUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}} />
    </div>
  );
}

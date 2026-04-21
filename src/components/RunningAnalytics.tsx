"use client";

import { useMemo } from "react";
import { formatPace } from "@/lib/constants/running";
import { TrendingUp, TrendingDown, Footprints, Zap, Calendar } from "lucide-react";

interface Workout {
  id: string;
  completed_at: string | null;
  actual_distance_km: number | null;
  actual_duration_seconds: number | null;
  actual_pace_seconds_per_km: number | null;
}

interface RunningAnalyticsProps {
  workouts: Workout[];
  stats: {
    totalKm: number;
    totalSessions: number;
    kmTrend: number;
    currentMonthKm: number;
  };
}

/**
 * RunningAnalytics — Dashboard de Performance Aluno.
 * Visualizações em SVG + CSS para performance máxima e estilo Neo-Brutalist.
 */
export default function RunningAnalytics({ workouts, stats }: RunningAnalyticsProps) {
  
  // Agrupar volume por semana (Últimas 4 semanas)
  const weeklyData = useMemo(() => {
    const now = new Date();
    const weeks = [0, 1, 2, 3].map(offset => {
      const start = new Date(now.getTime() - (offset + 1) * 7 * 24 * 60 * 60 * 1000);
      const end = new Date(now.getTime() - offset * 7 * 24 * 60 * 60 * 1000);
      
      const volume = workouts
        .filter(w => {
          const d = new Date(w.completed_at!);
          return d >= start && d < end;
        })
        .reduce((acc, w) => acc + (Number(w.actual_distance_km) || 0), 0);
      
      return { label: offset === 0 ? "Esta" : `${offset}s`, volume };
    }).reverse();
    
    return weeks;
  }, [workouts]);

  const maxVolume = Math.max(...weeklyData.map(d => d.volume), 1);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 24 }}>
      
      {/* ── CARD PRINCIPAL: VOLUME ── */}
      <div className="nb-card" style={{ padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <p style={{ fontSize: 9, fontWeight: 900, color: "#888", letterSpacing: "0.1em", textTransform: "uppercase", margin: 0 }}>
              Volume nas últimas 4 semanas
            </p>
            <h3 style={{ fontSize: 24, fontWeight: 950, margin: "4px 0 0 0" }}>
              {stats.currentMonthKm.toFixed(1)} <span style={{ fontSize: 14 }}>KM</span>
            </h3>
          </div>
          
          <div style={{ 
            display: "flex", 
            alignItems: "center", 
            gap: 4, 
            padding: "4px 8px", 
            background: stats.kmTrend >= 0 ? "#D1FAE5" : "#FEE2E2",
            border: "2px solid #000",
            fontSize: 11,
            fontWeight: 900
          }}>
            {stats.kmTrend >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {Math.abs(stats.kmTrend)}%
          </div>
        </div>

        {/* GRÁFICO DE BARRAS SVG */}
        <div style={{ height: 80, display: "flex", alignItems: "flex-end", gap: 12, paddingBottom: 24 }}>
          {weeklyData.map((week, i) => {
            const height = (week.volume / maxVolume) * 100;
            return (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                <div style={{ 
                  width: "100%", 
                  height: `${height}%`, 
                  background: i === 3 ? "var(--nb-red)" : "#000",
                  border: "2px solid #000",
                  transition: "height 0.5s ease-out"
                }} />
                <span style={{ fontSize: 8, fontWeight: 900, textTransform: "uppercase", color: "#666" }}>
                  {week.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── CARDS SECUNDÁRIOS ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div className="nb-card" style={{ padding: 16, background: "#FFF" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, color: "#3498DB" }}>
            <Calendar size={16} />
            <span style={{ fontSize: 9, fontWeight: 900, textTransform: "uppercase", color: "#666" }}>Acumulado Total</span>
          </div>
          <div style={{ fontSize: 18, fontWeight: 950 }}>{stats.totalKm.toFixed(1)} <span style={{ fontSize: 11 }}>KM</span></div>
        </div>

        <div className="nb-card" style={{ padding: 16, background: "#FFF" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, color: "#E67E22" }}>
            <Zap size={16} />
            <span style={{ fontSize: 9, fontWeight: 900, textTransform: "uppercase", color: "#666" }}>Consistência</span>
          </div>
          <div style={{ fontSize: 18, fontWeight: 950 }}>{stats.totalSessions} <span style={{ fontSize: 11 }}>Logados</span></div>
        </div>
      </div>
    </div>
  );
}

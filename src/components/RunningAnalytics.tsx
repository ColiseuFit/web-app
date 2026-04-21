"use client";

import { useMemo } from "react";
import { formatPace } from "@/lib/constants/running";
import { TrendingUp, TrendingDown, Footprints, Zap, Calendar } from "lucide-react";

/**
 * Brand Guidelines Strava §2: Proibido recriar logos manualmente.
 * Usa asset oficial "Powered by" do kit 1.2.
 */
const StravaPoweredByLogo = ({ height = 16, style }: { height?: number; style?: React.CSSProperties }) => (
  <img
    src="/strava/pwrdBy_strava_black.svg"
    alt="Powered by Strava"
    style={{ height, width: "auto", display: "block", ...style }}
  />
);


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
            <p style={{ fontSize: 9, fontWeight: 950, color: "#000", letterSpacing: "0.1em", textTransform: "uppercase", margin: 0 }}>
              Volume de Rodagem (Últimos 30 dias)
            </p>
            <h3 style={{ fontSize: 28, fontWeight: 950, margin: "4px 0 0 0", letterSpacing: "-0.04em" }}>
              {stats.currentMonthKm.toFixed(1)} <span style={{ fontSize: 14, fontWeight: 800 }}>KM</span>
            </h3>
          </div>
          
          <div style={{ 
            display: "flex", 
            alignItems: "center", 
            gap: 4, 
            padding: "4px 10px", 
            background: stats.kmTrend >= 0 ? "var(--nb-red)" : "#000",
            color: "#FFF",
            border: "2px solid #000",
            boxShadow: "2px 2px 0px rgba(0,0,0,0.1)",
            fontSize: 11,
            fontWeight: 900,
            textTransform: "uppercase"
          }}>
            {stats.kmTrend >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {Math.abs(stats.kmTrend)}%
          </div>
        </div>

        {/* GRÁFICO DE BARRAS SVG */}
        <div style={{ height: 100, display: "flex", alignItems: "flex-end", gap: 12, paddingBottom: 24, borderBottom: "2px dashed #EEE" }}>
          {weeklyData.map((week, i) => {
            const height = Math.max(8, (week.volume / maxVolume) * 100); // Mínimo de 8% para visibilidade
            return (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 10, height: "100%", justifyContent: "flex-end" }}>
                <div style={{ 
                  width: "100%", 
                  height: `${height}%`, 
                  background: i === 3 ? "var(--nb-red)" : "var(--nb-blue)",
                  border: "3px solid #000",
                  boxShadow: "2px 2px 0px rgba(0,0,0,0.1)",
                  transition: "all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                  position: "relative"
                }} className="nb-card-hover">
                   {week.volume > 0 && (
                     <div style={{ 
                       position: "absolute", 
                       top: -18, 
                       fontSize: 9, 
                       fontWeight: 900, 
                       width: "100%", 
                       textAlign: "center" 
                     }}>
                       {week.volume.toFixed(0)}
                     </div>
                   )}
                </div>
                <span style={{ fontSize: 8, fontWeight: 950, textTransform: "uppercase", color: "#666", letterSpacing: "0.05em" }}>
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
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, color: "var(--nb-blue)" }}>
            <Calendar size={16} />
            <span style={{ fontSize: 9, fontWeight: 950, textTransform: "uppercase", color: "#000", letterSpacing: "0.05em" }}>Acumulado Total</span>
          </div>
          <div style={{ fontSize: 18, fontWeight: 950 }}>{stats.totalKm.toFixed(1)} <span style={{ fontSize: 11 }}>KM</span></div>
        </div>

        <div className="nb-card" style={{ padding: 16, background: "#FFF" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, color: "var(--nb-yellow)" }}>
            <Zap size={16} />
            <span style={{ fontSize: 9, fontWeight: 950, textTransform: "uppercase", color: "#000", letterSpacing: "0.05em" }}>Consistência</span>
          </div>
          <div style={{ fontSize: 18, fontWeight: 950 }}>{stats.totalSessions} <span style={{ fontSize: 11 }}>Sessões</span></div>
        </div>
      </div>
      {/* Footer de Atribuição — Brand Guidelines §1.2: "Powered by Strava" com link obrigatório */}
      <div style={{ display: "flex", justifyContent: "center", marginTop: 24, borderTop: "2px dashed #EEE", paddingTop: 16 }}>
        <a
          href="https://www.strava.com"
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: "flex", alignItems: "center", gap: 6, textDecoration: "none" }}
          aria-label="Powered by Strava"
        >
          {/* Asset oficial — horizontal black (já contém o texto Powered By) */}
          <StravaPoweredByLogo height={18} style={{ opacity: 0.8 }} />
        </a>
      </div>
    </div>
  );
}

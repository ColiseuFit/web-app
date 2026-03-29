"use client";

import { useState, useEffect } from "react";
import { ActivityFeedCard } from "@/components/activity/ActivityFeedCard";

/**
 * Componente AnimatedNumber
 * Realiza uma interpolação suave (tween) de um valor numérico de 0 até o alvo.
 */
function AnimatedNumber({ value, duration = 1000, className = "" }: { value: number | string, duration?: number, className?: string }) {
    const [displayValue, setDisplayValue] = useState(0);
    const targetValue = typeof value === "string" ? parseFloat(value.replace(/[^0-9.]/g, "")) : value;
    const isString = typeof value === "string";

    useEffect(() => {
        let start = 0;
        const end = targetValue;
        if (start === end) {
            setDisplayValue(end);
            return;
        }

        let startTimestamp: number | null = null;
        const step = (timestamp: number) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            
            const easeOutCubic = 1 - Math.pow(1 - progress, 3);
            setDisplayValue(Math.floor(easeOutCubic * (end - start) + start));
            
            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };
        window.requestAnimationFrame(step);
    }, [value, targetValue, duration]);

    if (isNaN(targetValue)) return <span className={className}>{value}</span>;

    return (
        <span className={className}>
            {isString ? value.toString().replace(/[0-9.]+/, displayValue.toLocaleString()) : displayValue.toLocaleString()}
        </span>
    );
}

/**
 * ActivityDashboard (V1.2 - Iron Monolith)
 */
export default function ActivityDashboard({ history = [] }: { history?: any[] }) {
  const [activePeriod, setActivePeriod] = useState("Mês");
  const [isBroken, setIsBroken] = useState(false);
  const activePeriodLow = activePeriod.toLowerCase();

  // MOCK de atividades para preencher o dash se o histórico estiver vazio
  const mockActivities: any[] = [
    {
      id: "act-1",
      date: "HOJE, 26 MAR",
      title: "WOD: FRANTIC THURSDAY",
      description: "Intervalado de alta intensidade com foco em Double Unders e Box Jumps. Sensação térmica de 40 graus na caixa. Mantive o RX.",
      hashtags: ["ColiseuClube", "NuncaPareDeLutar", "DoubleUnder"],
      typeTag: "AMRAP",
      coach: "Tito",
      xp: 450,
      result: "8 Rounds + 12 Reps",
      metrics: [
        { label: "Tempo", value: "14:22", unit: "min" },
        { label: "Reps", value: "480" },
        { label: "RPE", value: "9", unit: "/10" }
      ],
      achievements: [
        { id: "s-1", type: "seal", icon: "bolt", color: "volt" },
        { id: "s-2", type: "pr", icon: "star", color: "red" }
      ],
      isExcellence: true
    }
  ];

  // Feed Unificado: Prop History + Mocks (priorizando prop)
  const unifiedFeed = history.length > 0 ? history : [...mockActivities];

  let chartData: { label: string; value: number }[] = [];
  
  if (activePeriodLow === "semana") {
    chartData = [
      { label: "D", value: -1 }, { label: "S", value: 1 }, { label: "T", value: 1 },
      { label: "Q", value: 2 }, { label: "Q", value: 1 }, { label: "S", value: -2 }, { label: "S", value: -2 }
    ];
  } else if (activePeriodLow === "ano") {
    chartData = [
        { label: "JAN", value: 22 }, { label: "FEV", value: 24 }, { label: "MAR", value: 18 },
        { label: "ABR", value: 0 }, { label: "MAI", value: 0 }, { label: "JUN", value: 0 },
        { label: "JUL", value: 0 }, { label: "AGO", value: 0 }, { label: "SET", value: 0 },
        { label: "OUT", value: 0 }, { label: "NOV", value: 0 }, { label: "DEZ", value: 0 }
    ];
  } else if (activePeriodLow === "tudo") {
    chartData = [
      { label: "2023", value: 210 }, { label: "2024", value: 245 }, { label: "2025", value: 282 }, { label: "2026", value: 142 }
    ];
  } else {
    chartData = Array.from({ length: 31 }, (_, i) => ({
        label: `${i + 1}`,
        value: i === 2 || i === 7 || i === 12 || i === 25 ? 2 : (i % 3 === 0 ? 1 : 0)
    }));
  }

  return (
    <div key={activePeriod} className="activity-dashboard-root">
      {/* ── GLOBAL ANIMATIONS ── */}
      <style dangerouslySetInnerHTML={{ __html: `
        .activity-dashboard-root { animation: fadeInNRC 0.8s cubic-bezier(0.16, 1, 0.3, 1); }
        .stagger-item { animation: staggeredInNRC 0.5s cubic-bezier(0.16, 1, 0.3, 1) both; }
        @keyframes fadeInNRC { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes staggeredInNRC { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
      `}} />
      
      {/* ── HEADER: STATUS DE FOGO ── */}
      <div 
        onClick={() => setIsBroken(!isBroken)}
        style={{ 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center", 
            marginBottom: "20px",
            background: isBroken ? "var(--surface-lowest)" : "linear-gradient(90deg, var(--surface-lowest) 0%, transparent 100%)",
            borderLeft: isBroken ? "4px solid var(--text-muted)" : "4px solid var(--red)",
            padding: "12px 16px",
            borderRadius: "0 4px 4px 0",
            cursor: "pointer",
            opacity: isBroken ? 0.8 : 1,
            transition: "0.5s cubic-bezier(0.16, 1, 0.3, 1)"
        }}>
        <div>
            <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                Status de Hoje (Quinta-feira, 26/03)
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
                <span className="font-display" style={{ fontSize: "24px", color: isBroken ? "var(--text-muted)" : "var(--text)" }}>
                    <AnimatedNumber value={isBroken ? 0 : 5} />
                </span>
                <span style={{ fontSize: "10px", fontWeight: 800, color: isBroken ? "var(--text-muted)" : "var(--red)", textTransform: "uppercase" }}>
                    {isBroken ? "Fogo Apagado" : "Dias de Fogo"}
                </span>
            </div>
        </div>
        <div style={{ 
            width: "40px", 
            height: "40px", 
            background: isBroken ? "rgba(255,255,255,0.05)" : "rgba(227,27,35,0.1)", 
            borderRadius: "50%", 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center",
            border: isBroken ? "1px solid var(--border-glow)" : "1px solid rgba(227,27,35,0.2)",
            position: "relative"
        }}>
            <span style={{ fontSize: "20px", filter: isBroken ? "grayscale(1) opacity(0.3)" : "none", transition: "0.5s" }}>{isBroken ? "❄️" : "⚡"}</span>
        </div>
      </div>

      {/* ── FILTROS DE PERÍODO ── */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "24px", overflowX: "auto", paddingBottom: "4px", scrollbarWidth: "none" }}>
        {["Semana", "Mês", "Ano", "Tudo"].map((period) => {
          const isActive = activePeriod.toLowerCase() === period.toLowerCase();
          return (
            <button
              key={period}
              onClick={() => setActivePeriod(period)}
              style={{
                padding: "8px 16px",
                borderRadius: "20px",
                border: isActive ? "1px solid var(--red)" : "1px solid var(--border-glow)",
                background: isActive ? "rgba(227,27,35,0.1)" : "var(--surface-lowest)",
                color: isActive ? "var(--red)" : "var(--text-muted)",
                fontSize: "10px",
                fontWeight: 800,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                cursor: "pointer",
                transition: "0.3s cubic-bezier(0.16, 1, 0.3, 1)"
              }}
            >
              {period}
            </button>
          );
        })}
      </div>

      {/* ── MATRIZ DE BATALHA ── */}
      <div style={{ marginBottom: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
            <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Frequência ({activePeriod})</span>
        </div>
        <div style={{ background: "var(--surface-lowest)", border: "1px solid var(--border-glow)", borderRadius: "4px", padding: "20px" }}>
            <div style={{ 
                display: "grid", 
                gridTemplateColumns: activePeriodLow === "mês" ? "repeat(7, 1fr)" : activePeriodLow === "ano" ? "repeat(3, 1fr)" : "repeat(7, 1fr)", 
                gap: "6px"
              }}>
                {chartData.map((data, i) => {
                  const isTrained = data.value > 0;
                  const isPR = data.value === 2;
                  return (
                    <div key={i} className="stagger-item" style={{ 
                      animationDelay: `${i * 0.015}s`,
                      aspectRatio: (activePeriodLow === "ano" || activePeriodLow === "tudo") ? "auto" : "1/1",
                      height: (activePeriodLow === "ano" || activePeriodLow === "tudo") ? "52px" : "auto",
                      background: isPR ? "var(--red)" : isTrained ? "rgba(227,27,35,0.4)" : "rgba(255,255,255,0.02)", 
                      border: "1px solid var(--border-glow)",
                      borderRadius: "2px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      position: 'relative'
                    }}>
                      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: "7px", fontWeight: 900, color: isTrained ? "rgba(255,255,255,0.7)" : "var(--text-muted)" }}>{data.label}</span>
                        {(activePeriodLow === 'ano' || activePeriodLow === 'tudo') && isTrained && (
                           <span style={{ fontSize: '14px', fontWeight: 900, color: 'white' }} className="font-display">
                             <AnimatedNumber value={data.value} />
                           </span>
                        )}
                      </div>
                      {isPR && <div style={{ position: "absolute", top: "-4px", right: "-4px", fontSize: "8px" }}>⭐</div>}
                    </div>
                  );
                })}
            </div>
        </div>
      </div>

      {/* ── ARSENAL DE GUERRA ── */}
      <div style={{ marginBottom: "40px" }}>
        <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "12px" }}>Arsenal de Guerra</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
          {[
            { name: "Burpees", v: activePeriodLow === "semana" ? 120 : 480, icon: "🔥" },
            { name: "Clean & Jerk", v: activePeriodLow === "semana" ? 45 : 180, icon: "🏋️" },
            { name: "Snatch", v: activePeriodLow === "semana" ? 30 : 120, icon: "⚡" },
            { name: "Pull-ups", v: activePeriodLow === "semana" ? 80 : 320, icon: "🐒" },
            { name: "Box Jumps", v: activePeriodLow === "semana" ? 60 : 240, icon: "📦" },
            { name: "Double Unders", v: activePeriodLow === "semana" ? 300 : 1200, icon: "🪢" },
          ].map((mv, i) => (
            <div key={i} className="stagger-item" style={{ animationDelay: `${0.4 + i * 0.05}s`, background: "var(--surface-lowest)", border: "1px solid var(--border-glow)", padding: "12px", borderRadius: "4px", textAlign: 'center' }}>
              <span style={{ fontSize: "16px" }}>{mv.icon}</span>
              <div className="font-display" style={{ fontSize: "18px", color: "var(--text)" }}>
                <AnimatedNumber value={mv.v} />
              </div>
              <span style={{ fontSize: "7px", color: "var(--text-muted)", textTransform: "uppercase" }}>{mv.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── TIMELINE: ATIVIDADES RECENTES ── */}
      <div style={{ marginBottom: "60px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
          <h3 style={{ fontSize: "10px", fontWeight: 900, color: "var(--text-muted)", letterSpacing: "0.2em", textTransform: "uppercase" }}>
            Atividades Recentes
          </h3>
          <div style={{ flex: 1, height: "1px", background: "linear-gradient(90deg, rgba(255,255,255,0.05), transparent)" }} />
        </div>

        <div>
          {unifiedFeed.map((act, i) => (
             <ActivityFeedCard key={act.id || i} {...act} />
          ))}
        </div>

        <button style={{
          width: "100%",
          padding: "16px",
          background: "transparent",
          border: "1px solid var(--border-glow)",
          color: "var(--text-muted)",
          fontSize: "9px",
          fontWeight: 800,
          textTransform: "uppercase",
          letterSpacing: "0.15em",
          borderRadius: "4px",
          cursor: "pointer"
        }}>
          Ver Mais Atividades
        </button>
      </div>

    </div>
  );
}

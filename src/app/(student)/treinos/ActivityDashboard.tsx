"use client";

import { useState, useEffect } from "react";

/**
 * Componente AnimatedNumber
 * Realiza uma interpolação suave (tween) de um valor numérico de 0 até o alvo.
 * Utiliza requestAnimationFrame para garantir 60fps e performance de elite.
 * 
 * @param {number | string} value - O valor final a ser exibido.
 * @param {number} [duration=1000] - Duração da animação em ms.
 * @param {string} [className=""] - Classes CSS adicionais.
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
            
            // Easing: easeOutCubic para um movimento mais natural
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
            {isString ? value.replace(/[0-9.]+/, displayValue.toLocaleString()) : displayValue.toLocaleString()}
        </span>
    );
}

/**
 * ActivityDashboard (V1.2 - Iron Monolith)
 * Dashboard de performance do aluno. Focado em visualização de dados brutalista e retenção (Streaks).
 * 
 * Funcionalidades principais:
 * 1. Battle Matrix: Heatmap de consistência (7 colunas para dias da semana).
 * 2. Arsenal de Guerra: Agregador de volume de movimentos específicos.
 * 3. Volumetria: Gráfico de tendência (Linha/Barra) com morphing suave.
 * 4. Protocolo de Fogo: Gamificação de frequência com lógica de "Descanso Protegido".
 */
export default function ActivityDashboard() {
  const [activePeriod, setActivePeriod] = useState("Mês");
  const [chartType, setChartType] = useState("line"); // 'line' ou 'bar' para o gráfico de volumetria
  const [isBroken, setIsBroken] = useState(false); // Estado de demonstração: simula quebra de streak (fogo apagado)
  const activePeriodLow = activePeriod.toLowerCase();

  /** 
   * MOCK DATA LOGIC
   * Em produção, isso será substituído por chamadas ao Supabase.
   * A estrutura de 'value' segue o contrato: -2 (Futuro), -1 (Descanso), 0 (Vazio), 1 (Treino), 2 (PR/Recorde).
   */
  let chartData: { label: string; value: number }[] = [];
  
  if (activePeriodLow === "semana") {
    chartData = [
      { label: "D", value: -1 }, // Descanso Protegido
      { label: "S", value: 1 }, 
      { label: "T", value: 1 },
      { label: "Q", value: 2 }, // PR (Destaque visual)
      { label: "Q", value: 1 }, // Registro de Hoje
      { label: "S", value: -2 }, // Datas futuras (tracejado)
      { label: "S", value: -2 },
    ];
  } else if (activePeriodLow === "ano") {
    // Agregado mensal: o 'value' aqui representa o total de treinos para visualização nas caixas informativas
    chartData = [
        { label: "JAN", value: 22 }, { label: "FEV", value: 24 }, { label: "MAR", value: 18 },
        { label: "ABR", value: 0 }, { label: "MAI", value: 0 }, { label: "JUN", value: 0 },
        { label: "JUL", value: 0 }, { label: "AGO", value: 0 }, { label: "SET", value: 0 },
        { label: "OUT", value: 0 }, { label: "NOV", value: 0 }, { label: "DEZ", value: 0 },
    ];
  } else if (activePeriodLow === "tudo") {
    chartData = [
      { label: "2023", value: 210 },
      { label: "2024", value: 245 },
      { label: "2025", value: 282 },
      { label: "2026", value: 142 }
    ];
  } else {
    // Mês (Padrão): Simulação de 31 dias para Março/2026
    chartData = Array.from({ length: 31 }, (_, i) => ({
        label: `${i + 1}`,
        value: i === 2 || i === 7 || i === 12 || i === 25 ? 2 : (i % 3 === 0 ? 1 : 0)
    }));
  }

  return (
    // 'key={activePeriod}' força o re-mount para disparar as animações de entrada (staggered entry)
    <div key={activePeriod} className="animate-in">
      
      {/* ── HEADER: STATUS DE FOGO (STREAK) ── 
          Indica a consistência ininterrupta. Se houver falha (isBroken), o visual muda para ❄️ (Gelo).
      */}
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

      {/* DEFINIÇÕES DE ANIMAÇÃO (CSS-in-JS) */}
      <style jsx>{`
        .animate-in {
            animation: fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        @keyframes staggeredIn {
            from { opacity: 0; transform: scale(0.9); }
            to { opacity: 1; transform: scale(1); }
        }
        .stagger-item {
            animation: staggeredIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
      `}</style>

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

      {/* ── MATRIZ DE BATALHA (HEATMAP) ── 
          Visualização de frequência estilo GitHub, adaptada para 7 dias da semana.
          Estratégia: Staggered entry (animação por delay) para efeito de "preenchimento progressivo".
      */}
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
                  const isTrained = data.value > 0 || data.value === 1 || data.value === 2;
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
                      transition: "background 0.3s ease",
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

      {/* ── ESTATÍSTICAS DO PERÍODO ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "32px" }}>
        {[
            { label: "Treinos", value: activePeriodLow === "semana" ? 3 : activePeriodLow === "mês" ? 14 : activePeriodLow === "ano" ? 142 : 315 },
            { label: "XP Conquistado", value: activePeriodLow === "semana" ? 450 : activePeriodLow === "mês" ? 2100 : activePeriodLow === "ano" ? 18400 : 42100 },
            { label: "Recordes (PRs)", value: activePeriodLow === "semana" ? 1 : activePeriodLow === "mês" ? 4 : activePeriodLow === "ano" ? 24 : 58 },
            { label: "Horas Ativas", value: activePeriodLow === "semana" ? 3 : activePeriodLow === "mês" ? 12 : activePeriodLow === "ano" ? 120 : 280 }
        ].map((stat, i) => (
            <div key={i} className="stagger-item" style={{ animationDelay: `${0.2 + i * 0.1}s`, background: "var(--surface-lowest)", border: "1px solid var(--border-glow)", padding: "16px", borderRadius: "4px" }}>
                <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "4px" }}>{stat.label}</div>
                <div className="font-display" style={{ fontSize: "28px", color: "var(--text)" }}>
                    <AnimatedNumber value={stat.value} />
                </div>
            </div>
        ))}
      </div>

      {/* ── VOLUMETRIA DE TREINO ── 
          Gráfico dinâmico que alterna entre Linha (Tendência) e Barra (Volume por Ponto).
      */}
      <div style={{ marginBottom: "32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <div style={{ fontSize: "12px", color: "var(--text)", fontWeight: 700 }}>Volumetria de Treino</div>
          
          {/* TOGGLE DE VISUALIZAÇÃO (REF: 47b7b875 / 7e51c494) */}
          <div style={{ display: "flex", background: "rgba(255,255,255,0.05)", borderRadius: "4px", padding: "2px" }}>
                <button onClick={() => setChartType("line")} style={{ padding: "4px 8px", background: chartType === "line" ? "var(--red)" : "transparent", border: "none", borderRadius: "2px", cursor: "pointer" }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M3 18l6-6 4 4 8-8" /></svg>
                </button>
                <button onClick={() => setChartType("bar")} style={{ padding: "4px 8px", background: chartType === "bar" ? "var(--red)" : "transparent", border: "none", borderRadius: "2px", cursor: "pointer" }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M18 20V10M12 20V4M6 20V14" /></svg>
                </button>
          </div>
        </div>
        
        <div style={{ background: "var(--surface-lowest)", border: "1px solid var(--border-glow)", borderRadius: "4px", padding: "20px", height: "140px", position: "relative" }}>
          <svg width="100%" height="100%" viewBox="0 0 400 100" preserveAspectRatio="none" style={{ transition: "0.5s" }}>
            <defs>
              <linearGradient id="g-v" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="var(--red)" stopOpacity="0.3" /><stop offset="100%" stopColor="var(--red)" stopOpacity="0" /></linearGradient>
              <linearGradient id="g-b" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="var(--red)" stopOpacity="0.8" /><stop offset="100%" stopColor="var(--red)" stopOpacity="0.2" /></linearGradient>
            </defs>
            {chartType === "line" ? (
                <path d={activePeriodLow === "semana" ? "M0,80 L80,70 L160,40 L240,60 L320,20 L400,30" : "M0,90 L40,85 L80,60 L120,70 L160,30 L200,40 L240,20 L280,35 L320,10 L400,15"} fill="url(#g-v)" stroke="var(--red)" strokeWidth="2" style={{ transition: "0.5s ease" }} />
            ) : (
                [80, 70, 40, 60, 20, 30].map((v, i) => <rect key={i} x={i * 66 + 10} y={v} width="30" height={100 - v} fill="url(#g-b)" rx="2" className="stagger-item" style={{ animationDelay: `${i * 0.05}s` }} />)
            )}
          </svg>
        </div>
      </div>

      {/* ── ARSENAL DE GUERRA ── 
          Unidades de movimento acumuladas. Proporciona escala visual para o esforço bruto.
      */}
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
    </div>
  );
}

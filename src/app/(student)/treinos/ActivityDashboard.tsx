"use client";

import { useState, useEffect } from "react";
import { ActivityFeedCard } from "@/components/activity/ActivityFeedCard";
import { Flame, Zap, BarChart3, Dumbbell, History, Target } from "lucide-react";
import { getTodayDate } from "@/lib/date-utils";

/**
 * Componente AnimatedNumber
 * Realiza uma interpolação suave (tween) de um valor numérico de 0 até o alvo.
 */
function AnimatedNumber({ value, duration = 1000, className = "" }: { value: number | string, duration?: number, className?: string }) {
    const [displayValue, setDisplayValue] = useState(0);
    const targetValue = typeof value === "string" ? parseFloat(value.replace(/[^0-9.]/g, "")) : value;
    const isString = typeof value === "string";

    useEffect(() => {
        const start = 0;
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
 * ActivityDashboard (V2.0 - Neo-Brutalist Light)
 */
interface ActivityItem {
  id: string;
  date: string;
  isoDate?: string;
  title: string;
  description: string;
  hashtags?: string[];
  typeTag?: string;
  resultType?: string;
  coach?: string;
  points?: number;
  result?: string | null;
  status?: string;
  tags?: string[];
  metrics: { label: string; value: string | number; unit?: string }[];
  achievements?: { id: string; type: "seal" | "pr"; icon: string; color: string }[];
  isExcellence?: boolean;
}

export default function ActivityDashboard({ history = [] }: { history?: ActivityItem[] }) {
  const [activePeriod, setActivePeriod] = useState("Mês");
  const [isBroken, setIsBroken] = useState(false);
  const activePeriodLow = activePeriod.toLowerCase();

  // Feed Unificado usa estritamente o histórico passado pelo banco
  const unifiedFeed = history;

  let chartData: { label: string; value: number }[] = [];
  
  // Assume server time / local time approx
  const todayStr = getTodayDate();
  const [currentYearStr, currentMonthStr] = todayStr.split('-');
  const todayMs = new Date(todayStr + "T12:00:00Z").getTime();
  
  const getDailyStatus = (isoDayStr: string) => {
    const checkinsOnDay = history.filter((h: any) => h.isoDate === isoDayStr);
    if (checkinsOnDay.length === 0) return 0;
    const hasConfirmed = checkinsOnDay.some((h: any) => h.status === 'confirmed');
    const hasExcellence = checkinsOnDay.some((h: any) => h.isExcellence);
    return hasExcellence ? 2 : (hasConfirmed ? 1 : 1);
  };

  if (activePeriodLow === "semana") {
    for (let i = 6; i >= 0; i--) {
       const ms = todayMs - i * 86400000;
       const d = new Date(ms);
       const iso = d.toISOString().split('T')[0];
       const dayNames = ["D", "S", "T", "Q", "Q", "S", "S"];
       chartData.push({ label: dayNames[d.getUTCDay()], value: getDailyStatus(iso) });
    }
  } else if (activePeriodLow === "ano") {
    const months = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
    for (let m = 1; m <= 12; m++) {
       const mStr = String(m).padStart(2, '0');
       const count = history.filter((h: any) => h.isoDate?.startsWith(`${currentYearStr}-${mStr}`)).length;
       chartData.push({ label: months[m - 1], value: count });
    }
  } else if (activePeriodLow === "tudo") {
    const years = [currentYearStr]; // Start with current year or expand based on real data span
    const lastItemIso = history.length > 0 ? history[history.length - 1].isoDate : undefined;
    const startYear = lastItemIso ? parseInt(lastItemIso.split('-')[0]) : parseInt(currentYearStr);
    for (let y = startYear; y <= parseInt(currentYearStr); y++) {
       const yStr = String(y);
       if (!years.includes(yStr)) years.push(yStr);
    }
    years.sort().forEach(yStr => {
      const count = history.filter((h: any) => h.isoDate?.startsWith(yStr)).length;
      chartData.push({ label: yStr, value: count });
    });
  } else {
    // Mês
    const daysInMonth = new Date(parseInt(currentYearStr), parseInt(currentMonthStr), 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
       const dStr = String(d).padStart(2, '0');
       const iso = `${currentYearStr}-${currentMonthStr}-${dStr}`;
       chartData.push({ label: `${d}`, value: getDailyStatus(iso) });
    }
  }

  // Calculate real streak
  let currentStreak = 0;
  let isStreakBroken = false;
  for (let i = 0; i < 365; i++) {
     const d = new Date(todayMs - i * 86400000);
     const iso = d.toISOString().split('T')[0];
     if (history.some((h: any) => h.isoDate === iso && (h.status === 'confirmed' || h.status === 'checked'))) {
        currentStreak++;
     } else {
        if (i === 0) {
           // Allow today to be missed without instantly showing broken (they still have time to train)
           // But if yesterday is also missed, streak is truly 0.
        } else {
           if (i === 1 && currentStreak === 0) isStreakBroken = true;
           break;
        }
     }
  }

  return (
    <div key={activePeriod} className="activity-dashboard-root">
      
      {/* ── HEADER: ATHLETE PERFORMANCE STATUS ── */}
      <div 
        onClick={() => setIsBroken(!isBroken)}
        style={{ 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center", 
            marginBottom: "32px",
            background: isBroken ? "#F0F0F0" : "#FFF",
            border: "3px solid #000",
            padding: "24px",
            boxShadow: isBroken ? "4px 4px 0px #000" : "12px 12px 0px #000",
            cursor: "pointer",
            transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
            transform: isBroken ? "translate(4px, 4px)" : "none",
            position: "relative",
            overflow: "hidden"
        }}>
        
        {/* Background Accent */}
        {!isBroken && (
          <div style={{
            position: "absolute",
            top: "-20px",
            right: "-20px",
            width: "80px",
            height: "80px",
            background: "var(--red)",
            opacity: 0.05,
            borderRadius: "50%",
            zIndex: 0
          }} />
        )}

        <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ 
              fontSize: "11px", 
              fontWeight: 900, 
              color: "#000", 
              letterSpacing: "0.15em", 
              textTransform: "uppercase", 
              opacity: 0.5,
              marginBottom: "8px"
            }}>
                CONSISTÊNCIA ATUAL
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
                <span className="font-display" style={{ fontSize: "56px", fontWeight: 950, color: "#000", lineHeight: 0.8 }}>
                    <AnimatedNumber value={isBroken ? 0 : currentStreak} />
                </span>
                <span className="font-headline" style={{ 
                  fontSize: "14px", 
                  fontWeight: 950, 
                  color: isBroken ? "#000" : "var(--red)", 
                  textTransform: "uppercase",
                  letterSpacing: "0.1em"
                }}>
                    {isBroken ? "OFF" : "DIAS SEGUIDOS"}
                </span>
            </div>
        </div>
        
        <div style={{ 
            width: "64px", 
            height: "64px", 
            background: isBroken ? "#FFF" : "linear-gradient(135deg, var(--red) 0%, #000 100%)", 
            border: "3px solid #000", 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center",
            boxShadow: isBroken ? "2px 2px 0px #000" : "6px 6px 0px #000",
            transform: !isBroken ? "rotate(-3deg)" : "none",
            transition: "all 0.3s ease",
            zIndex: 1
        }}>
            {isBroken ? <Zap size={28} color="#000" strokeWidth={3} /> : <Flame size={32} color="#FFF" strokeWidth={2.5} />}
        </div>
      </div>

      {/* ── FILTROS DE PERÍODO ── */}
      <div style={{ 
        display: "flex", 
        gap: "10px", 
        marginBottom: "32px", 
        overflowX: "auto", 
        paddingBottom: "8px", 
        scrollbarWidth: "none",
        WebkitOverflowScrolling: "touch"
      }}>
        {["Semana", "Mês", "Ano", "Tudo"].map((period) => {
          const isActive = activePeriod.toLowerCase() === period.toLowerCase();
          return (
            <button
              key={period}
              onClick={() => setActivePeriod(period)}
              style={{
                flexShrink: 0,
                padding: "10px 20px",
                border: "2px solid #000",
                background: isActive ? "#000" : "#FFF",
                color: isActive ? "#FFF" : "#000",
                fontSize: "11px",
                fontWeight: 900,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                cursor: "pointer",
                boxShadow: isActive ? "2px 2px 0px var(--red)" : "4px 4px 0px #000",
                transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                transform: isActive ? "translate(2px, 2px)" : "none"
              }}
            >
              {period}
            </button>
          );
        })}
      </div>

      {/* ── MAPA DE CONSISTÊNCIA (PERFORMANCE GRID) ── */}
      <div style={{ marginBottom: "40px" }}>
        <div style={{ 
          display: "flex", 
          alignItems: "center", 
          gap: "12px", 
          marginBottom: "16px",
          padding: "0 4px"
        }}>
            <BarChart3 size={18} strokeWidth={3} />
            <span style={{ 
              fontSize: "12px", 
              fontWeight: 950, 
              color: "#000", 
              textTransform: "uppercase", 
              letterSpacing: "0.12em" 
            }}>HISTÓRICO DE FREQUÊNCIA</span>
        </div>
        
        <div style={{ 
          background: "#FFF", 
          border: "4px solid #000", 
          padding: "24px", 
          boxShadow: "10px 10px 0px #000",
          position: "relative"
        }}>
            {/* Grid Legend */}
            <div style={{ 
              display: "flex", 
              justifyContent: "flex-end", 
              gap: "15px", 
              marginBottom: "20px",
              fontSize: "9px",
              fontWeight: 900,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              opacity: 0.6
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <div style={{ width: "10px", height: "10px", background: "#F0F0F0", border: "1px solid #000" }} /> DESCANSO
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <div style={{ width: "10px", height: "10px", background: "#000", border: "1px solid #000" }} /> TREINO
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <div style={{ width: "10px", height: "10px", background: "var(--red)", border: "1px solid #000" }} /> SCORE MAX
              </div>
            </div>

            <div style={{ 
                display: "grid", 
                gridTemplateColumns: activePeriodLow === "mês" ? "repeat(7, 1fr)" : activePeriodLow === "ano" ? "repeat(4, 1fr)" : "repeat(7, 1fr)", 
                gap: "10px"
              }}>
                {chartData.map((data, i) => {
                  const isTrained = data.value > 0;
                  const isMax = data.value === 2;
                  return (
                    <div key={i} style={{ 
                      aspectRatio: (activePeriodLow === "ano" || activePeriodLow === "tudo") ? "auto" : "1/1",
                      height: (activePeriodLow === "ano" || activePeriodLow === "tudo") ? "64px" : "auto",
                      background: isMax ? "var(--red)" : isTrained ? "#000" : "#F0F0F0", 
                      border: "2px solid #000",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      position: 'relative',
                      boxShadow: isTrained ? "3px 3px 0px rgba(0,0,0,0.15)" : "none",
                      animation: "entrancePop 0.4s cubic-bezier(0.16, 1, 0.3, 1) both",
                      animationDelay: `${i * 0.01}s`,
                      transform: isMax ? "scale(1.05)" : "none"
                    }}>
                      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column' }}>
                        <span style={{ 
                          fontSize: "9px", 
                          fontWeight: 950, 
                          color: isTrained ? "#FFF" : "#000", 
                          opacity: isTrained ? 1 : 0.2,
                          letterSpacing: "-0.05em"
                        }}>{data.label}</span>
                        {(activePeriodLow === 'ano' || activePeriodLow === 'tudo') && isTrained && (
                           <span style={{ fontSize: '20px', fontWeight: 950, color: 'white', lineHeight: 1 }} className="font-display">
                             <AnimatedNumber value={data.value} />
                           </span>
                        )}
                      </div>
                      {isMax && <div style={{ position: "absolute", top: "-5px", right: "-5px", background: "#000", border: "2px solid #FFF", borderRadius: "50%", width: "18px", height: "18px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", zIndex: 2 }}>🔥</div>}
                    </div>
                  );
                })}
            </div>
        </div>
      </div>

      {/* ── ACÚMULO DE PERFORMANCE (MOVEMENT ANALYTICS) ── */}
      <div style={{ marginBottom: "48px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
           <Dumbbell size={18} strokeWidth={3} />
           <span style={{ fontSize: "12px", fontWeight: 950, color: "#000", textTransform: "uppercase", letterSpacing: "0.12em" }}>VOLUME DE MOVIMENTO</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "20px" }}>
          {(() => {
            // Conta *apenas* treinos que o Coach finalizou (status === 'confirmed')
            const confirmedHistory = history.filter(h => h.status === 'confirmed');
            
            // Procura termos nas tags + no título + no texto completo do WOD
            const getTagVolume = (term: string) => confirmedHistory.filter(h => {
               const termLower = term.toLowerCase();
               const inTags = h.tags?.some(t => t.toLowerCase().includes(termLower));
               const inTitle = h.title?.toLowerCase().includes(termLower);
               // 'rawContent' é passado pelo page.tsx caso precisemos varrer o texto real do WOD
               const inContent = (h as any).rawContent?.toLowerCase().includes(termLower) || h.description?.toLowerCase().includes(termLower);
               
               return inTags || inTitle || inContent;
            }).length;

            return [
              { name: "Burpees", v: getTagVolume("Burpee") * 30, icon: Flame, color: "var(--red)", unit: "REP" },
              { name: "Clean & Jerk", v: getTagVolume("Clean") * 45, icon: Dumbbell, color: "#000", unit: "KG" },
              { name: "Snatch", v: getTagVolume("Snatch") * 30, icon: Zap, color: "#000", unit: "KG" },
              { name: "Pull-ups", v: getTagVolume("Pull") * 25, icon: Target, color: "var(--red)", unit: "REP" },
            ];
          })().map((mv, i) => {
            const Icon = mv.icon;
            return (
              <div key={i} style={{ 
                background: "#FFF", 
                border: "3px solid #000", 
                padding: "24px 20px", 
                boxShadow: "8px 8px 0px #000",
                textAlign: 'left',
                animation: "entrancePop 0.4s cubic-bezier(0.16, 1, 0.3, 1) both",
                animationDelay: `${0.3 + i * 0.1}s`,
                position: "relative"
              }}>
                <div style={{ 
                  display: "flex", 
                  padding: "10px", 
                  background: "#000", 
                  border: "2px solid #000", 
                  marginBottom: "16px",
                  width: "fit-content",
                  boxShadow: "2px 2px 0px var(--red)"
                }}>
                  <Icon size={20} color="#FFF" strokeWidth={2.5} />
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
                  <div className="font-display" style={{ fontSize: "36px", fontWeight: 950, color: "#000", lineHeight: 0.9 }}>
                    <AnimatedNumber value={mv.v} />
                  </div>
                  <span style={{ fontSize: "12px", fontWeight: 900, color: "var(--red)" }}>{mv.unit}</span>
                </div>
                <div style={{ 
                  fontSize: "10px", 
                  fontWeight: 950, 
                  color: "#000", 
                  textTransform: "uppercase", 
                  letterSpacing: "0.08em",
                  marginTop: "8px",
                  opacity: 0.6
                }}>
                  {mv.name}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── TIMELINE: ATIVIDADES RECENTES ── */}
      <div style={{ marginBottom: "60px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
          <History size={16} strokeWidth={3} />
          <h3 className="font-display" style={{ fontSize: "16px", fontWeight: 950, color: "#000", letterSpacing: "0.05em", textTransform: "uppercase" }}>
            HISTÓRICO RECENTE
          </h3>
          <div style={{ flex: 1, height: "4px", background: "#000" }} />
        </div>

        <div>
          {unifiedFeed.map((act, i) => (
             <ActivityFeedCard key={act.id || i} {...act} />
          ))}
        </div>

        <button style={{
          width: "100%",
          padding: "20px",
          background: "#FFF",
          border: "3px solid #000",
          color: "#000",
          fontSize: "11px",
          fontWeight: 950,
          textTransform: "uppercase",
          letterSpacing: "0.2em",
          cursor: "pointer",
          boxShadow: "6px 6px 0px #000",
          transition: "all 0.2s",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = "translate(2px, 2px)"; e.currentTarget.style.boxShadow = "4px 4px 0px #000"; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "6px 6px 0px #000"; }}
        >
          VER TODO O HISTÓRICO
        </button>
      </div>

      <style jsx>{`
          @keyframes entrancePop {
              from { opacity: 0; transform: scale(0.9) translateY(10px); }
              to { opacity: 1; transform: scale(1) translateY(0); }
          }
      `}</style>
    </div>
  );
}

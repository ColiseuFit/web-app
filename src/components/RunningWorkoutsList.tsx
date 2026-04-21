"use client";

import { useState, useMemo } from "react";
import { formatPace } from "@/lib/constants/running";
import RunningWorkoutForm from "./RunningWorkoutForm";
import { ChevronDown, ChevronRight, Calendar } from "lucide-react";

/**
 * Brand Guidelines Strava §2: Proibido recriar logos manualmente.
 * Usa o asset oficial stacked do kit 1.2 para atribuição em listas.
 */
const StravaOfficialBadge = () => (
  <div style={{ display: "flex", alignItems: "center", lineHeight: 0 }}>
    <img 
      src="/strava/pwrdBy_strava_stack_orange.svg" 
      alt="Powered by Strava" 
      style={{ height: 24, width: "auto" }} 
    />
  </div>
);

interface Workout {
  id: string;
  scheduled_date: string;
  target_description: string;
  target_distance_km: number | null;
  target_pace_description: string | null;
  completed_at: string | null;
  actual_distance_km: number | null;
  actual_pace_seconds_per_km: number | null;
  /** ID da atividade no Strava — presente quando o treino foi sincronizado via API */
  strava_activity_id?: number | null;
}

interface RunningWorkoutsListProps {
  workouts: Workout[];
}

export default function RunningWorkoutsList({ workouts }: RunningWorkoutsListProps) {
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(null);

  // ──────────────────────────────────────────────────────────────────────────
  // LÓGICA DE AGRUPAMENTO SEMANAL (THE ANCHOR)
  // ──────────────────────────────────────────────────────────────────────────
  // Para exibir os treinos em Accordions (Semana 1, Semana 2...), precisamos
  // de uma "âncora": a Segunda-Feira da semana do primeiro treino da planilha.
  // ──────────────────────────────────────────────────────────────────────────
  const baseMonday = useMemo(() => {
    if (workouts.length === 0) return new Date();
    const sorted = [...workouts].sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date));
    const firstDate = new Date(sorted[0].scheduled_date + "T12:00:00Z");
    const day = firstDate.getUTCDay();
    const diff = firstDate.getUTCDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(firstDate);
    monday.setUTCDate(diff);
    monday.setUTCHours(12, 0, 0, 0); // Mantem meio dia para evitar shift
    return monday;
  }, [workouts]);

  const grouped = useMemo(() => {
    const map: Record<number, Workout[]> = {};
    const sorted = [...workouts].sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date));

    sorted.forEach(w => {
      // Usamos "T12:00:00Z" para garantir que o cálculo de dias não seja 
      // afetado por shifts de fuso horário local que poderiam mover o treino 
      // para o dia anterior ou posterior.
      const d = new Date(w.scheduled_date + "T12:00:00Z");
      // Consider fallback for extreme timezone shifts + safety math
      const diffMs = d.getTime() - baseMonday.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      // Se diffDays negativo por alguma inconsistencia (não deve acontecer pois baseDate é no passado de baseMonday), cap em 0
      const weekNum = Math.max(1, Math.floor(diffDays / 7) + 1);
      
      if (!map[weekNum]) map[weekNum] = [];
      map[weekNum].push(w);
    });
    return map;
  }, [workouts, baseMonday]);

  // ──────────────────────────────────────────────────────────────────────────
  // ESTRATÉGIA UX: Foco Adaptativo
  // ──────────────────────────────────────────────────────────────────────────
  // Para reduzir a carga cognitiva, o sistema identifica qual é a primeira 
  // semana que ainda possui treinos pendentes e a expande automaticamente.
  // Se tudo estiver concluído, foca na Semana 1.
  // ──────────────────────────────────────────────────────────────────────────
  const initialExpandedWeek = useMemo(() => {
    const weekEntries = Object.entries(grouped).sort(([a], [b]) => Number(a) - Number(b));
    for (const [weekStr, weekWs] of weekEntries) {
      if (weekWs.some(w => !w.completed_at)) {
        return Number(weekStr);
      }
    }
    return 1;
  }, [grouped]);

  const [expandedWeeks, setExpandedWeeks] = useState<number[]>([initialExpandedWeek]);

  function toggleWeek(w: number) {
    setExpandedWeeks(prev => prev.includes(w) ? prev.filter(x => x !== w) : [...prev, w]);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>


      {workouts.length > 0 ? (
        Object.entries(grouped)
          .sort(([a], [b]) => Number(a) - Number(b))
          .map(([weekStr, weekWorkouts]) => {
            const weekNum = Number(weekStr);
            const isExpanded = expandedWeeks.includes(weekNum);
            const completedCount = weekWorkouts.filter(w => w.completed_at).length;
            const weekDone = completedCount === weekWorkouts.length;

            return (
              <div key={weekNum} style={{ marginBottom: "16px" }}>
                {/* Cabeçalho da Semana */}
                <div 
                  onClick={() => toggleWeek(weekNum)}
                  style={{ 
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "20px 16px", 
                    background: weekDone ? "#000" : "var(--nb-surface)", 
                    color: weekDone ? "#FFF" : "#000", 
                    cursor: "pointer", 
                    border: "4px solid #000",
                    boxShadow: weekDone ? "0px 0px 0px #000" : "6px 6px 0px #000", 
                    transition: "all 0.1s",
                    position: "relative"
                  }}
                  className="nb-card-hover"
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", zIndex: 2 }}>
                    <div style={{ 
                      background: weekDone ? "var(--nb-yellow)" : "#000", 
                      color: weekDone ? "#000" : "#FFF",
                      padding: "4px",
                      borderRadius: "2px",
                      display: "flex"
                    }}>
                      {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    </div>
                    <span style={{ fontSize: "16px", fontWeight: 950, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      SEMANA {weekNum}
                    </span>
                  </div>

                  {/* Barra de progresso sutil no fundo */}
                  {!weekDone && (
                    <div style={{ 
                      position: "absolute", 
                      bottom: 0, 
                      left: 0, 
                      height: "4px", 
                      width: `${(completedCount / weekWorkouts.length) * 100}%`,
                      background: "var(--nb-red)",
                      transition: "width 0.3s ease"
                    }} />
                  )}

                  <div style={{ display: "flex", alignItems: "center", gap: 10, zIndex: 2 }}>
                    <span style={{ 
                      fontSize: "10px", fontWeight: 900, 
                      background: weekDone ? "rgba(255,255,255,0.2)" : "#F3F4F6", 
                      color: weekDone ? "#FFF" : "#6B7280",
                      padding: "4px 10px", border: weekDone ? "none" : "2px solid #000",
                      textTransform: "uppercase"
                    }}>
                      {completedCount}/{weekWorkouts.length}
                    </span>
                  </div>
                </div>

                {/* Conteúdo da Semana (Sessões) */}
                {isExpanded && (
                  <div style={{ display: "grid", gap: "12px", marginTop: "12px", marginLeft: "12px" }}>
                    {weekWorkouts.map((workout, idx) => (
                      <div 
                        key={workout.id}
                        className="nb-card"
                        style={{ 
                          padding: "16px", 
                          background: workout.completed_at ? "var(--nb-surface)" : "#fff",
                          border: "3px solid #000",
                          boxShadow: "4px 4px 0px #000",
                          opacity: 1,
                          animation: `slideInUp ${0.2 + idx * 0.05}s ease-out forwards` 
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                          <span style={{ fontSize: "11px", fontWeight: 900, textTransform: "uppercase", color: "var(--nb-red)" }}>
                            {new Date(workout.scheduled_date + "T12:00:00Z").toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' })}
                          </span>
                          <div style={{ display: "flex", gap: "6px" }}>
                          {/* Badge Strava — Brand Guidelines §1.2: identifica atividade sincronizada */}
                            {workout.target_description.includes("Strava") && (
                              <StravaOfficialBadge />
                            )}
                            {workout.completed_at && (
                              <span style={{ fontSize: "9px", fontWeight: 950, background: "var(--nb-blue)", color: "#FFF", padding: "3px 8px", border: "1px solid #000" }}>CONCLUÍDO</span>
                            )}
                          </div>
                        </div>
                        <h4 className="font-headline" style={{ fontSize: "17px", fontWeight: 900, marginBottom: "4px" }}>
                          {workout.target_description}
                        </h4>
                        
                        {workout.completed_at ? (
                          <div style={{ display: "flex", gap: "16px", marginTop: "12px", padding: "10px", background: "var(--nb-blue)", color: "#FFF", border: "2px solid #000" }}>
                            <div style={{ flex: 1 }}>
                              <span style={{ fontSize: "9px", fontWeight: 950, color: "rgba(255,255,255,0.7)", display: "block", textTransform: "uppercase" }}>Resultado</span>
                              <span style={{ fontWeight: 950 }}>{workout.actual_distance_km} KM</span>
                            </div>
                            <div style={{ flex: 1 }}>
                              <span style={{ fontSize: "9px", fontWeight: 950, color: "rgba(255,255,255,0.7)", display: "block", textTransform: "uppercase" }}>Pace Médio</span>
                              <span style={{ fontWeight: 950 }}>{workout.actual_pace_seconds_per_km ? formatPace(workout.actual_pace_seconds_per_km) : '--:--'}/km</span>
                            </div>
                          </div>
                        ) : (
                          <>
                            {(workout.target_distance_km || workout.target_pace_description) && (
                              <div style={{ display: "flex", gap: "16px", marginTop: "12px", padding: "10px", background: "var(--nb-yellow)", border: "2px solid #000" }}>
                                {workout.target_distance_km && (
                                  <div style={{ flex: 1 }}>
                                    <span style={{ fontSize: "9px", fontWeight: 900, opacity: 0.6, display: "block" }}>META DISTÂNCIA</span>
                                    <span style={{ fontWeight: 900 }}>{workout.target_distance_km} KM</span>
                                  </div>
                                )}
                                {workout.target_pace_description && (
                                  <div style={{ flex: 1 }}>
                                    <span style={{ fontSize: "9px", fontWeight: 900, opacity: 0.6, display: "block" }}>META PACE</span>
                                    <span style={{ fontWeight: 900 }}>{workout.target_pace_description}</span>
                                  </div>
                                )}
                              </div>
                            )}
                            <button 
                              onClick={() => setSelectedWorkoutId(workout.id)}
                              className="nb-button"
                              style={{ 
                                marginTop: "12px", 
                                width: "100%", 
                                fontSize: "11px", 
                                padding: "12px",
                                background: "#000",
                                color: "#fff",
                                cursor: "pointer"
                              }}
                            >
                              REGISTRAR RESULTADO
                            </button>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
      ) : (
        <div style={{ padding: "40px", textAlign: "center", border: "2px dashed #CCC", background: "#FFF" }}>
          <Calendar size={24} color="#999" style={{ margin: "0 auto 12px" }} />
          <p style={{ margin: 0, fontSize: "12px", fontWeight: 900, color: "#666", textTransform: "uppercase" }}>Nenhum treino agendado.</p>
        </div>
      )}

      {selectedWorkoutId && (
        <RunningWorkoutForm 
          workout={workouts.find(w => w.id === selectedWorkoutId)!} 
          onClose={() => setSelectedWorkoutId(null)}
          onSuccess={() => {
            setSelectedWorkoutId(null);
          }}
        />
      )}
    </div>
  );
}

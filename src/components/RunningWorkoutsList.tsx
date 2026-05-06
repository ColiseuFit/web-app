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
  target_rest_time_description: string | null;
  completed_at: string | null;
  actual_distance_km: number | null;
  actual_pace_seconds_per_km: number | null;
  /** ID da atividade no Strava — presente quando o treino foi sincronizado via API */
  strava_activity_id?: number | null;
  // Novos campos do Template
  week_number?: number | null;
  session_order?: number | null;
}

interface RunningWorkoutsListProps {
  workouts: Workout[];
}

export default function RunningWorkoutsList({ workouts }: RunningWorkoutsListProps) {
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(null);

  // ──────────────────────────────────────────────────────────────────────────
  // LÓGICA DE AGRUPAMENTO SEMANAL (MODELO DE MOLDES)
  // ──────────────────────────────────────────────────────────────────────────
  // Agrupa diretamente pelo campo 'week_number'.
  // ──────────────────────────────────────────────────────────────────────────
  const grouped = useMemo(() => {
    const map: Record<number, Record<number, Workout[]>> = {};
    
    workouts.forEach(w => {
      const weekNum = w.week_number || 1;
      const order = w.session_order || 999;
      
      if (!map[weekNum]) map[weekNum] = {};
      if (!map[weekNum][order]) map[weekNum][order] = [];
      map[weekNum][order].push(w);
    });

    return map;
  }, [workouts]);

  // ──────────────────────────────────────────────────────────────────────────
  // ESTRATÉGIA UX: Foco Adaptativo
  // ──────────────────────────────────────────────────────────────────────────
  // Para reduzir a carga cognitiva, o sistema identifica qual é a primeira 
  // semana que ainda possui treinos pendentes e a expande automaticamente.
  // Se tudo estiver concluído, foca na Semana 1.
  // ──────────────────────────────────────────────────────────────────────────
  const initialExpandedWeek = useMemo(() => {
    const weekEntries = Object.entries(grouped).sort(([a], [b]) => Number(a) - Number(b));
    for (const [weekStr, sessions] of weekEntries) {
      const allWorkouts = Object.values(sessions).flat();
      if (allWorkouts.some(w => !w.completed_at)) {
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
          .map(([weekStr, weekSessions]) => {
            const weekNum = Number(weekStr);
            const isExpanded = expandedWeeks.includes(weekNum);
            const allWorkouts = Object.values(weekSessions).flat();
            const completedCount = allWorkouts.filter(w => w.completed_at).length;
            const weekDone = completedCount === allWorkouts.length;

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
                      width: `${(completedCount / allWorkouts.length) * 100}%`,
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
                      {completedCount}/{allWorkouts.length}
                    </span>
                  </div>
                </div>

                {/* Conteúdo da Semana (Sessões) */}
                {isExpanded && (
                  <div style={{ display: "grid", gap: "16px", marginTop: "16px", marginLeft: "12px" }}>
                    {Object.entries(weekSessions)
                      .sort(([a], [b]) => Number(a) - Number(b))
                      .map(([orderStr, sessionWorkouts], sIdx) => {
                        const sOrder = Number(orderStr);
                        const isSessionDone = sessionWorkouts.every(w => w.completed_at);
                        
                        return (
                          <div 
                            key={orderStr}
                            className="nb-card"
                            style={{ 
                              padding: "0px", 
                              background: isSessionDone ? "var(--nb-surface)" : "#fff",
                              border: "3px solid #000",
                              boxShadow: "4px 4px 0px #000",
                              overflow: "hidden",
                              animation: `slideInUp ${0.2 + sIdx * 0.05}s ease-out forwards` 
                            }}
                          >
                            <div style={{ 
                              background: isSessionDone ? "#000" : "#F3F4F6", 
                              color: isSessionDone ? "#FFF" : "#000",
                              padding: "8px 16px",
                              borderBottom: "2px solid #000",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center"
                            }}>
                              <span style={{ fontSize: "11px", fontWeight: 950, textTransform: "uppercase" }}>
                                {sOrder < 999 ? `Sessão ${sOrder}` : "Extra"}
                              </span>
                              {isSessionDone && (
                                <span style={{ fontSize: "8px", fontWeight: 950, color: "var(--nb-yellow)" }}>CONCLUÍDO</span>
                              )}
                            </div>

                            <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
                              {sessionWorkouts
                                .sort((a, b) => (a.block_order || 0) - (b.block_order || 0))
                                .map((workout, bIdx) => (
                                <div key={workout.id} style={{ 
                                  paddingBottom: bIdx === sessionWorkouts.length - 1 ? 0 : 12,
                                  borderBottom: bIdx === sessionWorkouts.length - 1 ? "none" : "1px dashed #DDD"
                                }}>
                                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                                    <h4 className="font-headline" style={{ fontSize: "16px", fontWeight: 900, margin: 0 }}>
                                      {workout.target_description}
                                    </h4>
                                    {workout.target_description.includes("Strava") && <StravaOfficialBadge />}
                                  </div>
                                  
                                  {workout.completed_at ? (
                                    <div style={{ display: "flex", gap: "16px", marginTop: "8px", padding: "8px", background: "var(--nb-blue)", color: "#FFF", border: "1px solid #000" }}>
                                      <div style={{ flex: 1 }}>
                                        <span style={{ fontSize: "8px", fontWeight: 950, color: "rgba(255,255,255,0.7)", display: "block", textTransform: "uppercase" }}>Resultado</span>
                                        <span style={{ fontWeight: 950, fontSize: "12px" }}>{workout.actual_distance_km} KM</span>
                                      </div>
                                      <div style={{ flex: 1 }}>
                                        <span style={{ fontSize: "8px", fontWeight: 950, color: "rgba(255,255,255,0.7)", display: "block", textTransform: "uppercase" }}>Pace</span>
                                        <span style={{ fontWeight: 950, fontSize: "12px" }}>{workout.actual_pace_seconds_per_km ? formatPace(workout.actual_pace_seconds_per_km) : '--:--'}/km</span>
                                      </div>
                                    </div>
                                  ) : (
                                    <>
                                      {(workout.target_distance_km || workout.target_pace_description || workout.target_rest_time_description) ? (
                                        <>
                                          <div style={{ display: "flex", gap: "12px", marginTop: "8px", padding: "8px", background: "var(--nb-yellow)", border: "1px solid #000", flexWrap: "wrap" }}>
                                            {workout.target_distance_km && (
                                              <div style={{ minWidth: "50px" }}>
                                                <span style={{ fontSize: "7px", fontWeight: 900, opacity: 0.6, display: "block", textTransform: "uppercase" }}>Dist</span>
                                                <span style={{ fontWeight: 900, fontSize: "11px" }}>{workout.target_distance_km}KM</span>
                                              </div>
                                            )}
                                            {workout.target_pace_description && (
                                              <div style={{ minWidth: "50px" }}>
                                                <span style={{ fontSize: "7px", fontWeight: 900, opacity: 0.6, display: "block", textTransform: "uppercase" }}>Pace</span>
                                                <span style={{ fontWeight: 900, fontSize: "11px" }}>{workout.target_pace_description}</span>
                                              </div>
                                            )}
                                            {workout.target_rest_time_description && (
                                              <div style={{ minWidth: "50px" }}>
                                                <span style={{ fontSize: "7px", fontWeight: 900, opacity: 0.6, display: "block", textTransform: "uppercase" }}>Desc</span>
                                                <span style={{ fontWeight: 900, fontSize: "11px" }}>{workout.target_rest_time_description}</span>
                                              </div>
                                            )}
                                          </div>
                                        </>
                                      ) : (
                                        <div style={{ 
                                          marginTop: "4px", 
                                          fontSize: "11px", 
                                          color: "#666", 
                                          fontStyle: "italic",
                                          padding: "4px 0"
                                        }}>
                                          💡 Orientação do Coach
                                        </div>
                                      )}
                                    </>
                                  )}
                                </div>
                              ))}

                              {/* Botão Único de Registro por Sessão */}
                              {!isSessionDone && (
                                <button 
                                  onClick={() => {
                                    const primary = sessionWorkouts.find(w => w.target_distance_km || w.target_pace_description) || sessionWorkouts[0];
                                    setSelectedWorkoutId(primary.id);
                                  }}
                                  className="nb-button"
                                  style={{ 
                                    width: "100%", 
                                    fontSize: "11px", 
                                    padding: "12px",
                                    background: "#000",
                                    color: "#fff",
                                    fontWeight: 900,
                                    cursor: "pointer",
                                    boxShadow: "4px 4px 0px var(--nb-yellow)"
                                  }}
                                >
                                  REGISTRAR SESSÃO COMPLETA
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
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

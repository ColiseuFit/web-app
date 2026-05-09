"use client";

import { useState, useMemo } from "react";
import { formatPace, RUNNING_CATEGORIES, RUNNING_ZONES } from "@/lib/constants/running";
import RunningWorkoutForm from "./RunningWorkoutForm";
import { ChevronDown, ChevronRight, Calendar, Zap, Timer, Coffee, CheckCircle2 } from "lucide-react";

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
  block_order?: number | null;
  title?: string | null;
  reps?: number | null;
  category?: string | null;
  target_zone?: string | null;
  target_unit?: string | null;
}

interface RunningWorkoutsListProps {
  workouts: Workout[];
}

/**
 * Componente de visualização do dashboard de corrida do aluno.
 * 
 * @description
 * Agrupa os treinos por semana e sessão, permitindo expandir/recolher semanas.
 * Exibe tanto a prescrição do coach (Yellow Box) quanto o resultado do aluno (Blue Box) 
 * para garantir transparência no progresso.
 * 
 * @protocolo_performance
 * - Agrupamento via useMemo para evitar re-calculos em cada render
 * - Expansão automática na semana atual (Smart Focus)
 */
export default function RunningWorkoutsList({ workouts }: RunningWorkoutsListProps) {
  const [selectedSessionWorkouts, setSelectedSessionWorkouts] = useState<Workout[] | null>(null);

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
                                {sOrder < 999 ? `Treino ${sOrder}` : "Treino Extra"}
                              </span>
                              {isSessionDone && (
                                <span style={{ fontSize: "8px", fontWeight: 950, color: "var(--nb-yellow)" }}>CONCLUÍDO</span>
                              )}
                            </div>

                            <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "12px" }}>
                              {sessionWorkouts
                                .sort((a, b) => (a.block_order || 0) - (b.block_order || 0))
                                .map((workout, bIdx) => (
                                  <div key={workout.id} style={{
                                    background: "#FAFAFA",
                                    border: "1px solid #E5E7EB",
                                    borderLeft: `4px solid ${RUNNING_CATEGORIES.find(c => c.id === workout.category)?.color || "#DDD"}`,
                                    borderRadius: "4px",
                                    padding: "14px",
                                    position: "relative"
                                  }}>
                                    <div style={{
                                      fontSize: "8px", fontWeight: 900, color: "#9CA3AF",
                                      textTransform: "uppercase", letterSpacing: "0.08em",
                                      marginBottom: "8px", display: "flex", justifyContent: "space-between"
                                    }}>
                                      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                                        <span>BLOCO {bIdx + 1} DE {sessionWorkouts.length}</span>
                                        {workout.title && (
                                          <span style={{ fontSize: "12px", color: "#000", fontWeight: 950 }}>{workout.title}</span>
                                        )}
                                      </div>
                                      {workout.completed_at && <span style={{ color: "var(--nb-blue)", alignSelf: "flex-start" }}>✔ CONCLUÍDO</span>}
                                    </div>
                                    <div style={{ display: "flex", gap: "6px", marginBottom: "12px", flexWrap: "wrap", alignItems: "center" }}>
                                      {workout.category && (() => {
                                        const cat = RUNNING_CATEGORIES.find(c => c.id === workout.category);
                                        return (
                                          <span style={{
                                            fontSize: "9px", fontWeight: 900, padding: "2px 6px",
                                            background: cat?.color || "#000",
                                            color: "#FFF", textTransform: "uppercase", letterSpacing: "0.04em",
                                            borderRadius: "2px"
                                          }}>
                                            {cat?.label || workout.category}
                                          </span>
                                        );
                                      })()}
                                      {workout.target_zone && workout.target_zone !== "livre" && (() => {
                                        const zone = RUNNING_ZONES.find(z => z.id === workout.target_zone);
                                        return (
                                          <span style={{
                                            fontSize: "9px", fontWeight: 950, padding: "2px 6px",
                                            background: zone?.color || "#000",
                                            color: "#FFF", textTransform: "uppercase", letterSpacing: "0.04em",
                                            borderRadius: "2px"
                                          }}>
                                            {zone?.label || workout.target_zone}
                                          </span>
                                        );
                                      })()}
                                      {workout.target_zone === "livre" && (
                                        <span style={{
                                          fontSize: "9px", fontWeight: 900, padding: "2px 6px",
                                          background: "#E5E7EB", color: "#374151", textTransform: "uppercase", letterSpacing: "0.04em",
                                          borderRadius: "2px"
                                        }}>
                                          LIVRE
                                        </span>
                                      )}
                                      {workout.target_description.includes("Strava") && (
                                        <div style={{ marginLeft: "auto" }}>
                                          <StravaOfficialBadge />
                                        </div>
                                      )}
                                    </div>

                                    {workout.completed_at ? (
                                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                        <div style={{ 
                                          display: "flex", flexWrap: "wrap", gap: "16px", padding: "10px", 
                                          background: "var(--nb-blue)", color: "#FFF", borderRadius: "4px",
                                          alignItems: "center"
                                        }}>
                                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                            <CheckCircle2 size={16} color="var(--nb-yellow)" />
                                            <div style={{ display: "flex", flexDirection: "column" }}>
                                              <span style={{ fontSize: "8px", fontWeight: 700, opacity: 0.8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Realizado</span>
                                              <span style={{ fontWeight: 900, fontSize: "14px", textTransform: "uppercase", color: "var(--nb-yellow)" }}>
                                                {workout.reps && workout.reps > 1 ? `${workout.reps}x ` : ""}
                                                {workout.actual_distance_km 
                                                  ? (workout.actual_distance_km < 1 
                                                      ? `${(workout.actual_distance_km * 1000).toFixed(0)}m` 
                                                      : `${workout.actual_distance_km}km`) 
                                                  : "CONCLUÍDO"}
                                              </span>
                                            </div>
                                          </div>
                                          {workout.actual_pace_seconds_per_km && (
                                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                              <Timer size={16} />
                                              <div style={{ display: "flex", flexDirection: "column" }}>
                                                <span style={{ fontSize: "8px", fontWeight: 700, opacity: 0.8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Pace Médio</span>
                                                <span style={{ fontWeight: 900, fontSize: "14px", textTransform: "uppercase" }}>
                                                  {formatPace(workout.actual_pace_seconds_per_km)}/km
                                                </span>
                                              </div>
                                            </div>
                                          )}
                                        </div>

                                        {(workout.target_distance_km || workout.target_pace_description || workout.target_rest_time_description || workout.reps) && (
                                          <div style={{ fontSize: "10px", fontWeight: 700, color: "#64748B", display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
                                            <span style={{ color: "#9CA3AF" }}>ALVO:</span>
                                            {(workout.target_distance_km || workout.reps) && (
                                              <span style={{ color: "#334155" }}>
                                                {workout.reps && workout.reps > 1 ? `${workout.reps}x ` : ""}
                                                {workout.target_distance_km ? (
                                                  workout.target_unit === "m"
                                                    ? `${((Number(workout.target_distance_km) || 0) >= 1 ? Number(workout.target_distance_km) : Number(workout.target_distance_km) * 1000).toFixed(0)}m`
                                                    : workout.target_unit === "min"
                                                      ? `${workout.target_distance_km}min`
                                                      : `${workout.target_distance_km}km`
                                                ) : ""}
                                              </span>
                                            )}
                                            {workout.target_pace_description && (
                                              <span style={{ color: "#334155" }}>• Pace {workout.target_pace_description}</span>
                                            )}
                                            {workout.target_rest_time_description && (
                                              <span style={{ color: "#334155" }}>• Desc {workout.target_rest_time_description}</span>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center" }}>
                                          {(workout.target_distance_km || workout.reps) && (
                                            <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", fontWeight: 900, color: "#000" }}>
                                              <Zap size={12} color="var(--nb-blue)" />
                                              {workout.reps && workout.reps > 1 ? <span style={{ color: "var(--nb-red)" }}>{workout.reps}x </span> : ""}
                                              {workout.target_distance_km ? (
                                                workout.target_unit === "m"
                                                  ? `${((Number(workout.target_distance_km) || 0) >= 1 ? Number(workout.target_distance_km) : Number(workout.target_distance_km) * 1000).toFixed(0)}m`
                                                  : workout.target_unit === "min"
                                                    ? `${workout.target_distance_km}min`
                                                    : `${workout.target_distance_km}km`
                                              ) : ""}
                                            </div>
                                          )}
                                          {workout.target_pace_description && (
                                            <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "10px", fontWeight: 800, color: "#475569" }}>
                                              <Timer size={12} color="#2980BA" />
                                              {workout.target_pace_description}
                                            </div>
                                          )}
                                          {workout.target_rest_time_description && (
                                            <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "10px", fontWeight: 800, color: "#475569" }}>
                                              <Coffee size={12} color="#2980BA" />
                                              {workout.target_rest_time_description}
                                            </div>
                                          )}
                                        </div>

                                        <div style={{ fontSize: "12px", fontWeight: 600, lineHeight: "1.6", color: "#334155", whiteSpace: "pre-line" }}>
                                          {workout.target_description}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ))}

                              {/* Botão Único de Registro por Sessão */}
                              {!isSessionDone && (
                                <button
                                  onClick={() => {
                                    setSelectedSessionWorkouts(sessionWorkouts);
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
                                  REGISTRAR TREINO COMPLETO
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

      {selectedSessionWorkouts && (
        <RunningWorkoutForm
          sessionWorkouts={selectedSessionWorkouts}
          onClose={() => setSelectedSessionWorkouts(null)}
          onSuccess={() => {
            setSelectedSessionWorkouts(null);
          }}
        />
      )}
    </div>
  );
}

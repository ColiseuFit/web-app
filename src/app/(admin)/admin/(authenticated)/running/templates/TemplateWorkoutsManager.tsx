"use client";

import React, { useState } from "react";
import { Plus, Trash2, ChevronDown, ChevronRight, Zap, Timer, Edit2, X, Check, Copy, ArrowRightCircle } from "lucide-react";
import { 
  createTemplateWorkout, 
  deleteTemplateWorkout, 
  updateTemplateWorkout, 
  createTemplateWorkoutsBatch,
  duplicateTemplateSession,
  deleteTemplateSession
} from "@/lib/actions/running_actions";

interface TemplateWorkout {
  id: string;
  week_number: number;
  session_order: number;
  target_description: string;
  target_distance_km: number | null;
  target_pace_description: string | null;
  target_rest_time_description: string | null;
}

interface Props {
  template: {
    id: string;
    title: string;
    duration_weeks: number;
    running_template_workouts: TemplateWorkout[];
  };
  onUpdate: () => void;
}

/**
 * Máscara para Pace (MM:SS/km)
 */
function maskPace(value: string): string {
  let val = value.replace(/\D/g, "");
  if (val.length > 4) val = val.slice(0, 4);
  if (val.length >= 3) {
    let mins = val.slice(0, -2);
    let secs = parseInt(val.slice(-2));
    if (secs > 59) secs = 59;
    return `${mins}:${secs.toString().padStart(2, "0")}/km`;
  }
  return val;
}

/**
 * Máscara para Tempo (MM:SS)
 */
function maskTime(value: string): string {
  let val = value.replace(/\D/g, "");
  if (val.length > 4) val = val.slice(0, 4);
  if (val.length >= 3) {
    let mins = val.slice(0, -2);
    let secs = parseInt(val.slice(-2));
    if (secs > 59) secs = 59;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }
  return val;
}

export default function TemplateWorkoutsManager({ template, onUpdate }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expandedWeeks, setExpandedWeeks] = useState<number[]>([1]);
  const [showAddForm, setShowAddForm] = useState<{ week: number } | null>(null);
  const [copyingSession, setCopyingSession] = useState<{ week: number, session: number } | null>(null);
  const [targetWeek, setTargetWeek] = useState<number>(1);
  const [editingWorkoutId, setEditingWorkoutId] = useState<string | null>(null);

  // Estados para máscaras e múltiplos blocos
  const [paceValue, setPaceValue] = useState("");
  const [restValue, setRestValue] = useState("");

  // Estado para os blocos no formulário de adição
  const [addBlocks, setAddBlocks] = useState<Array<{
    description: string;
    distance: string;
    pace: string;
    rest: string;
  }>>([{ description: "", distance: "", pace: "", rest: "" }]);

  // Agrupar treinos por semana e por ordem de sessão
  const groupedWorkouts = (template.running_template_workouts || []).reduce((acc, w) => {
    if (!acc[w.week_number]) acc[w.week_number] = {};
    if (!acc[w.week_number][w.session_order]) acc[w.week_number][w.session_order] = [];
    acc[w.week_number][w.session_order].push(w);
    return acc;
  }, {} as Record<number, Record<number, TemplateWorkout[]>>);

  // Ordenar ordens de sessão dentro de cada semana
  const sortedWeekOrders = (weekNum: number) => {
    return Object.keys(groupedWorkouts[weekNum] || {})
      .map(Number)
      .sort((a, b) => a - b);
  };

  const toggleWeek = (week: number) => {
    setExpandedWeeks(prev =>
      prev.includes(week) ? prev.filter(w => w !== week) : [...prev, week]
    );
  };

  const handleAddWorkout = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!showAddForm) return;

    setLoading(true);
    setError("");
    
    const formData = new FormData(e.currentTarget);
    const sessionOrder = parseInt(formData.get("sessionOrder") as string);

    try {
      // Usar a nova action de batch
      await createTemplateWorkoutsBatch(
        template.id,
        showAddForm.week,
        sessionOrder,
        addBlocks.map(b => ({
          targetDescription: b.description,
          targetDistanceKm: b.distance ? parseFloat(b.distance) : null,
          targetPaceDescription: b.pace || null,
          targetRestTimeDescription: b.rest || null,
        }))
      );

      setShowAddForm(null);
      setAddBlocks([{ description: "", distance: "", pace: "", rest: "" }]);
      if (onUpdate) onUpdate();
    } catch (err: any) {
      setError(err.message || "Erro ao adicionar treino");
    } finally {
      setLoading(false);
    }
  };

  const addBlockToForm = () => {
    setAddBlocks(prev => [...prev, { description: "", distance: "", pace: "", rest: "" }]);
  };

  const removeBlockFromForm = (idx: number) => {
    if (addBlocks.length === 1) return;
    setAddBlocks(prev => prev.filter((_, i) => i !== idx));
  };

  const updateBlockInForm = (idx: number, field: string, value: string) => {
    setAddBlocks(prev => {
      const next = [...prev];
      let finalValue = value;
      if (field === "pace") finalValue = maskPace(value);
      if (field === "rest") finalValue = maskTime(value);
      
      next[idx] = { ...next[idx], [field]: finalValue };
      return next;
    });
  };

  const handleUpdateWorkout = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const formData = new FormData(e.currentTarget);
    try {
      await updateTemplateWorkout(formData);
      setEditingWorkoutId(null);
      setPaceValue("");
      setRestValue("");
      if (onUpdate) onUpdate();
    } catch (err: any) {
      setError(err.message || "Erro ao atualizar treino");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteWorkout = async (id: string) => {
    if (!confirm("Deseja realmente remover este treino da planilha padrão?")) return;
    setLoading(true);
    try {
      await deleteTemplateWorkout(id);
      if (onUpdate) onUpdate();
    } catch (err: any) {
      alert(err.message || "Erro ao remover treino");
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (w: TemplateWorkout) => {
    setEditingWorkoutId(w.id);
    setPaceValue(w.target_pace_description || "");
    setRestValue(w.target_rest_time_description || "");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {Array.from({ length: template.duration_weeks }, (_, i) => i + 1).map(weekNum => {
        const isExpanded = expandedWeeks.includes(weekNum);
        const weekSessions = groupedWorkouts[weekNum] || {};
        const sessionCount = Object.keys(weekSessions).length;

        return (
          <div key={weekNum} className="nb-card" style={{ padding: 0, overflow: "hidden", background: "#FFF" }}>
            <div 
              onClick={() => toggleWeek(weekNum)}
              style={{ 
                padding: "16px 20px", 
                background: "#000", 
                color: "#FFF", 
                display: "flex", 
                justifyContent: "space-between", 
                alignItems: "center",
                cursor: "pointer"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                <span style={{ fontWeight: 950, fontSize: 14, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Semana {weekNum}
                </span>
              </div>
              <span style={{ fontSize: 11, fontWeight: 800, opacity: 0.7 }}>
                {sessionCount} Sessões
              </span>
            </div>

            {isExpanded && (
              <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 20 }}>
                {sortedWeekOrders(weekNum).map(sOrder => {
                  const sessionBlocks = groupedWorkouts[weekNum][sOrder];
                  
                  return (
                    <div key={sOrder} style={{ 
                      border: "3px solid #000", 
                      background: "#FFF",
                      boxShadow: "6px 6px 0px #000",
                      overflow: "hidden"
                    }}>
                      <div style={{ 
                        background: "#F3F4F6", 
                        padding: "8px 16px", 
                        borderBottom: "2px solid #000",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <span style={{ fontSize: 11, fontWeight: 900, textTransform: "uppercase" }}>Sessão {sOrder}</span>
                          <div style={{ fontSize: 9, fontWeight: 800, opacity: 0.6 }}>{sessionBlocks.length} Blocos</div>
                        </div>

                        <div style={{ display: "flex", gap: 8 }}>
                          {/* DUPLICAR: Mesma Semana */}
                          <button 
                            onClick={async () => {
                              if (loading) return;
                              setLoading(true);
                              try {
                                await duplicateTemplateSession(template.id, weekNum, sOrder);
                                onUpdate();
                              } catch (err: any) {
                                alert(err.message);
                              } finally {
                                setLoading(false);
                              }
                            }}
                            title="Duplicar na mesma semana"
                            style={{ background: "none", border: "none", cursor: "pointer", color: "#666", padding: 4 }}
                          >
                            <Copy size={14} />
                          </button>

                          {/* COPIAR: Outra Semana */}
                          <button 
                            onClick={() => {
                              setTargetWeek(weekNum + 1 > template.duration_weeks ? template.duration_weeks : weekNum + 1);
                              setCopyingSession({ week: weekNum, session: sOrder });
                            }}
                            title="Copiar para outra semana"
                            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--nb-blue)", padding: 4 }}
                          >
                            <ArrowRightCircle size={14} />
                          </button>
                          
                          <button 
                            onClick={async () => {
                              if (!confirm("Deseja excluir todos os blocos desta sessão?")) return;
                              if (loading) return;
                              setLoading(true);
                              try {
                                await deleteTemplateSession(template.id, weekNum, sOrder);
                                onUpdate();
                              } catch (err: any) {
                                alert(err.message);
                              } finally {
                                setLoading(false);
                              }
                            }}
                            title="Excluir Sessão"
                            style={{ background: "none", border: "none", cursor: "pointer", color: "#E74C3C", padding: 4 }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        {sessionBlocks.map((w, blockIdx) => (
                          <div key={w.id} style={{ 
                            padding: 16, 
                            borderBottom: blockIdx === sessionBlocks.length - 1 ? "none" : "1px dashed #CCC",
                            background: editingWorkoutId === w.id ? "#FFF8E1" : "transparent"
                          }}>
                            {editingWorkoutId === w.id ? (
                              <form onSubmit={handleUpdateWorkout}>
                                <input type="hidden" name="workoutId" value={w.id} />
                                <div style={{ display: "grid", gap: 12 }}>
                                  <div style={{ display: "grid", gridTemplateColumns: "80px 1fr", gap: 12 }}>
                                    <div>
                                      <label style={{ display: "block", fontSize: 9, fontWeight: 900, marginBottom: 4 }}>ORDEM</label>
                                      <input name="sessionOrder" type="number" required defaultValue={w.session_order} className="nb-input" style={{ width: "100%", padding: 8 }} />
                                    </div>
                                    <div>
                                      <label style={{ display: "block", fontSize: 9, fontWeight: 900, marginBottom: 4 }}>DESCRIÇÃO DO BLOCO</label>
                                      <input name="targetDescription" required defaultValue={w.target_description} className="nb-input" style={{ width: "100%", padding: 8 }} />
                                    </div>
                                  </div>
                                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                                    <div>
                                      <label style={{ display: "block", fontSize: 9, fontWeight: 900, marginBottom: 4 }}>DISTÂNCIA (KM)</label>
                                      <input name="targetDistanceKm" type="number" step="0.1" defaultValue={w.target_distance_km || ""} className="nb-input" style={{ width: "100%", padding: 8 }} />
                                    </div>
                                    <div>
                                      <label style={{ display: "block", fontSize: 9, fontWeight: 900, marginBottom: 4 }}>PACE</label>
                                      <input 
                                        name="targetPaceDescription" 
                                        value={paceValue}
                                        onChange={(e) => setPaceValue(maskPace(e.target.value))}
                                        className="nb-input" 
                                        style={{ width: "100%", padding: 8 }} 
                                      />
                                    </div>
                                    <div>
                                      <label style={{ display: "block", fontSize: 9, fontWeight: 900, marginBottom: 4 }}>DESCANSO</label>
                                      <input 
                                        name="targetRestTimeDescription" 
                                        value={restValue}
                                        onChange={(e) => setRestValue(maskTime(e.target.value))}
                                        className="nb-input" 
                                        style={{ width: "100%", padding: 8 }} 
                                      />
                                    </div>
                                  </div>
                                  <div style={{ display: "flex", gap: 8 }}>
                                    <button type="submit" disabled={loading} className="nb-button" style={{ flex: 1, padding: 8, background: "#27AE60", color: "#FFF", fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                                      <Check size={14} /> SALVAR
                                    </button>
                                    <button type="button" onClick={() => setEditingWorkoutId(null)} className="nb-button" style={{ flex: 1, padding: 8, background: "#EEE", color: "#000", fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                                      <X size={14} /> CANCELAR
                                    </button>
                                  </div>
                                </div>
                              </form>
                            ) : (
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 4 }}>{w.target_description}</div>
                                  <div style={{ display: "flex", gap: 12 }}>
                                    {w.target_distance_km && (
                                      <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 700, color: "#666" }}>
                                        <Zap size={10} /> {w.target_distance_km}km
                                      </div>
                                    )}
                                    {w.target_pace_description && (
                                      <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 700, color: "#666" }}>
                                        <Timer size={10} /> {w.target_pace_description}
                                      </div>
                                    )}
                                    {(!w.target_distance_km && !w.target_pace_description && !w.target_rest_time_description) && (
                                      <div style={{ fontSize: 9, fontWeight: 900, color: "#AAA", textTransform: "uppercase" }}>[ Bloco de Orientação ]</div>
                                    )}
                                  </div>
                                </div>
                                <div style={{ display: "flex", gap: 8, marginLeft: 16 }}>
                                  <button 
                                    onClick={() => startEditing(w)}
                                    disabled={loading}
                                    style={{ background: "none", border: "none", cursor: "pointer", color: "#000", opacity: 0.5 }}
                                    title="Editar Bloco"
                                  >
                                    <Edit2 size={16} />
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteWorkout(w.id)}
                                    disabled={loading}
                                    style={{ background: "none", border: "none", cursor: "pointer", color: "#E74C3C", opacity: 0.5 }}
                                    title="Remover Bloco"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {showAddForm?.week === weekNum ? (
                  <form onSubmit={handleAddWorkout} className="nb-card" style={{ padding: 24, background: "#FFF", border: "4px solid #000", boxShadow: "8px 8px 0px rgba(0,0,0,0.1)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                      <h3 style={{ fontSize: 14, fontWeight: 950, textTransform: "uppercase", margin: 0 }}>Nova Sessão de Treino</h3>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <label style={{ fontSize: 10, fontWeight: 900 }}>ORDEM:</label>
                        <input name="sessionOrder" type="number" required defaultValue={sortedWeekOrders(weekNum).length + 1} className="nb-input" style={{ width: 60, padding: "4px 8px" }} />
                      </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                      {addBlocks.map((block, idx) => (
                        <div key={idx} style={{ padding: 16, border: "2px solid #000", background: "#F9F9F9", position: "relative" }}>
                          {addBlocks.length > 1 && (
                            <button 
                              type="button" 
                              onClick={() => removeBlockFromForm(idx)}
                              style={{ position: "absolute", top: -10, right: -10, background: "#E74C3C", color: "#FFF", border: "2px solid #000", width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                            >
                              <X size={14} />
                            </button>
                          )}
                          <div style={{ marginBottom: 12 }}>
                            <label style={{ display: "block", fontSize: 9, fontWeight: 900, marginBottom: 4, textTransform: "uppercase", color: "#666" }}>Bloco {idx + 1}: Descrição</label>
                            <input 
                              required 
                              placeholder="Ex: 10min Aquecimento ou 5km Leve" 
                              value={block.description}
                              onChange={(e) => updateBlockInForm(idx, "description", e.target.value)}
                              className="nb-input" 
                              style={{ width: "100%", padding: 10 }} 
                            />
                            <div style={{ fontSize: 8, color: "#999", marginTop: 4 }}>
                              * Deixe os campos abaixo vazios se for apenas um bloco de orientação/texto.
                            </div>
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                            <div>
                              <label style={{ display: "block", fontSize: 9, fontWeight: 900, marginBottom: 4, textTransform: "uppercase", color: "#666" }}>Dist (KM)</label>
                              <input 
                                type="number" step="0.1" 
                                value={block.distance}
                                onChange={(e) => updateBlockInForm(idx, "distance", e.target.value)}
                                className="nb-input" 
                                style={{ width: "100%", padding: 8 }} 
                              />
                            </div>
                            <div>
                              <label style={{ display: "block", fontSize: 9, fontWeight: 900, marginBottom: 4, textTransform: "uppercase", color: "#666" }}>Pace</label>
                              <input 
                                placeholder="5:30/km"
                                value={block.pace}
                                onChange={(e) => updateBlockInForm(idx, "pace", e.target.value)}
                                className="nb-input" 
                                style={{ width: "100%", padding: 8 }} 
                              />
                            </div>
                            <div>
                              <label style={{ display: "block", fontSize: 9, fontWeight: 900, marginBottom: 4, textTransform: "uppercase", color: "#666" }}>Descanso</label>
                              <input 
                                placeholder="1:00"
                                value={block.rest}
                                onChange={(e) => updateBlockInForm(idx, "rest", e.target.value)}
                                className="nb-input" 
                                style={{ width: "100%", padding: 8 }} 
                              />
                            </div>
                          </div>
                        </div>
                      ))}

                      <button 
                        type="button" 
                        onClick={addBlockToForm}
                        style={{ padding: 10, border: "2px dashed #000", background: "none", fontWeight: 900, fontSize: 10, cursor: "pointer", textTransform: "uppercase" }}
                      >
                        + Adicionar Bloco à Sessão
                      </button>

                      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                        <button type="submit" disabled={loading} className="nb-button" style={{ flex: 1, padding: 12, background: "#000", color: "#FFF", fontSize: 11, fontWeight: 950 }}>
                          {loading ? "SALVANDO..." : "⚡ SALVAR SESSÃO COMPLETA"}
                        </button>
                        <button type="button" onClick={() => { setShowAddForm(null); setAddBlocks([{ description: "", distance: "", pace: "", rest: "" }]); }} className="nb-button" style={{ padding: 12, background: "#EEE", color: "#000", fontSize: 11, fontWeight: 900 }}>
                          CANCELAR
                        </button>
                      </div>
                      {error && <div style={{ color: "var(--nb-red)", fontSize: 10, fontWeight: "bold", textAlign: "center" }}>{error}</div>}
                    </div>
                  </form>
                ) : (
                  <button 
                    onClick={() => { setShowAddForm({ week: weekNum }); setAddBlocks([{ description: "", distance: "", pace: "", rest: "" }]); }}
                    style={{ 
                      padding: 12, 
                      border: "2px dashed #CCC", 
                      background: "none", 
                      color: "#666", 
                      fontWeight: 800, 
                      fontSize: 12,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      cursor: "pointer"
                    }}
                  >
                    <Plus size={16} /> ADICIONAR SESSÃO À SEMANA {weekNum}
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
      {/* MODAL COPIAR SESSÃO */}
      {copyingSession && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 400,
          display: "flex", justifyContent: "center", alignItems: "center",
          background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)"
        }}>
          <div className="nb-card" style={{ width: "100%", maxWidth: 350, background: "#FFF", padding: 24, border: "4px solid #000" }}>
            <h3 style={{ fontSize: 14, fontWeight: 950, marginBottom: 16, textTransform: "uppercase" }}>Copiar Sessão para Semana...</h3>
            
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 10, fontWeight: 950, marginBottom: 6 }}>SELECIONE A SEMANA DE DESTINO</label>
              <select 
                value={targetWeek} 
                onChange={(e) => setTargetWeek(parseInt(e.target.value))}
                className="nb-input"
                style={{ width: "100%", padding: 12 }}
              >
                {Array.from({ length: template.duration_weeks }, (_, i) => i + 1).map(w => (
                  <option key={w} value={w}>Semana {w}</option>
                ))}
              </select>
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <button 
                onClick={() => setCopyingSession(null)}
                className="nb-button"
                style={{ flex: 1, background: "#EEE", color: "#000", padding: 12, fontSize: 10, fontWeight: 900 }}
              >
                CANCELAR
              </button>
              <button 
                disabled={loading}
                onClick={async () => {
                  if (!copyingSession) return;
                  setLoading(true);
                  try {
                    await duplicateTemplateSession(template.id, copyingSession.week, copyingSession.session, targetWeek);
                    onUpdate();
                    setCopyingSession(null);
                  } catch (err: any) {
                    alert(err.message);
                  } finally {
                    setLoading(false);
                  }
                }}
                className="nb-button"
                style={{ flex: 1, background: "var(--nb-blue)", color: "#FFF", padding: 12, fontSize: 10, fontWeight: 900 }}
              >
                {loading ? "COPIANDO..." : "CONFIRMAR"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

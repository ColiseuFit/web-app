"use client";

import React, { useState } from "react";
import { Plus, Trash2, ChevronDown, ChevronRight, Zap, Timer, Edit2, X, Check, Copy, ArrowRightCircle, ArrowUp, ArrowDown } from "lucide-react";
import { 
  createTemplateWorkout, 
  deleteTemplateWorkout, 
  createTemplateWorkoutsBatch,
  updateTemplateWorkoutsBatch,
  updateTemplateWorkout,
  duplicateTemplateSession,
  deleteTemplateSession
} from "@/lib/actions/running_actions";
import { RUNNING_LEVELS, formatPace, RUNNING_CATEGORIES, RUNNING_ZONES, type RunningLevelKey } from "@/lib/constants/running";

interface TemplateWorkout {
  id: string;
  week_number: number;
  session_order: number;
  title?: string | null;
  target_description: string;
  target_distance_km: number | null;
  target_pace_description: string | null;
  target_rest_time_description: string | null;
  reps: number;
  category: string | null;
  target_zone: string | null;
  target_unit: string;
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
  const [showAddForm, setShowAddForm] = useState<{ week: number, sessionOrder?: number, isEdit?: boolean, originalSessionOrder?: number } | null>(null);
  const [copyingSession, setCopyingSession] = useState<{ week: number, session: number } | null>(null);
  const [targetWeek, setTargetWeek] = useState<number>(1);
  const [editingWorkoutId, setEditingWorkoutId] = useState<string | null>(null);

  // Estados para máscaras e múltiplos blocos
  const [paceValue, setPaceValue] = useState("");
  const [restValue, setRestValue] = useState("");

  // Estado para os blocos no formulário de adição
  const [addBlocks, setAddBlocks] = useState<Array<{
    title: string;
    description: string;
    distance: string;
    pace: string;
    rest: string;
    reps: number;
    category: string;
    zone: string;
    unit: string;
  }>>([{ 
    title: "", description: "", distance: "", pace: "", rest: "", 
    reps: 1, category: "corrida", zone: "Z2", unit: "km" 
  }]);

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
      if (showAddForm.isEdit && showAddForm.originalSessionOrder) {
        // Editando sessão inteira
        await updateTemplateWorkoutsBatch(
          template.id,
          showAddForm.week,
          sessionOrder,
          showAddForm.originalSessionOrder,
          addBlocks.map(b => ({
            title: b.title || null,
            targetDescription: b.description,
            targetDistanceKm: b.distance ? parseFloat(b.distance) : null,
            targetPaceDescription: b.pace || null,
            targetRestTimeDescription: b.rest || null,
            reps: b.reps,
            category: b.category,
            targetZone: b.zone,
            targetUnit: b.unit
          }))
        );
      } else {
        // Criando nova sessão
        await createTemplateWorkoutsBatch(
          template.id,
          showAddForm.week,
          sessionOrder,
          addBlocks.map(b => ({
            title: b.title || null,
            targetDescription: b.description,
            targetDistanceKm: b.distance ? parseFloat(b.distance) : null,
            targetPaceDescription: b.pace || null,
            targetRestTimeDescription: b.rest || null,
            reps: b.reps,
            category: b.category,
            targetZone: b.zone,
            targetUnit: b.unit
          }))
        );
      }

      setShowAddForm(null);
      setAddBlocks([{ 
        title: "", description: "", distance: "", pace: "", rest: "", 
        reps: 1, category: "corrida", zone: "Z2", unit: "km" 
      }]);
      if (onUpdate) onUpdate();
    } catch (err: any) {
      setError(err.message || "Erro ao processar sessão");
    } finally {
      setLoading(false);
    }
  };

  const addBlockToForm = () => {
    setAddBlocks(prev => [...prev, { 
      title: "", description: "", distance: "", pace: "", rest: "", 
      reps: 1, category: "corrida", zone: "Z2", unit: "km" 
    }]);
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
      
      const newBlock = { ...next[idx], [field]: finalValue };

      // Smart Defaults: Se mudar categoria, sugere a zona ideal
      if (field === "category") {
        if (value === "aquecimento" || value === "desaquecimento") {
          newBlock.zone = "LIVRE";
          newBlock.unit = "min";
        }
        if (value === "caminhada") newBlock.zone = "Z1";
        if (value === "tiro") newBlock.zone = "Z5";
        if (value === "tempo_run") newBlock.zone = "Z4";
        if (value === "longo") newBlock.zone = "Z2";
      }

      next[idx] = newBlock;
      return next;
    });
  };

  const moveBlockUp = (idx: number) => {
    if (idx === 0) return;
    setAddBlocks(prev => {
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next;
    });
  };

  const moveBlockDown = (idx: number) => {
    if (idx === addBlocks.length - 1) return;
    setAddBlocks(prev => {
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
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
              <span style={{ fontSize: 11, fontWeight: 800, opacity: 0.7, display: "flex", alignItems: "center", gap: 12 }}>
                <span>{sessionCount} Sessões</span>
                <span style={{ height: 12, width: 1, background: "rgba(255,255,255,0.3)" }}></span>
                <span style={{ color: "var(--nb-yellow)" }}>
                  {Object.values(weekSessions).reduce((acc, sess) => 
                    acc + sess.reduce((vol, b) => {
                      const dist = b.target_distance_km || 0;
                      const reps = b.reps || 1;
                      const unit = b.target_unit?.toLowerCase() || 'km';
                      if (unit === 'min') return vol;
                      if (unit === 'm') {
                        // Defesa: se dist >= 1, assumimos que está em metros e dividimos por 1000.
                        // Se dist < 1, já está em km.
                        return vol + ((dist >= 1 ? dist / 1000 : dist) * reps);
                      }
                      return vol + (dist * reps);
                    }, 0)
                  , 0).toFixed(1)} km Total
                </span>
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
                          {/* EDITAR SESSÃO COMPLETA */}
                          <button 
                            onClick={() => {
                              setShowAddForm({ week: weekNum, sessionOrder: sOrder, isEdit: true, originalSessionOrder: sOrder });
                              setAddBlocks(sessionBlocks.map(b => ({
                                title: b.title || "",
                                description: b.target_description || "",
                                distance: b.target_distance_km ? (b.target_unit === "m" && b.target_distance_km < 1 ? b.target_distance_km * 1000 : b.target_distance_km).toString() : "",
                                pace: b.target_pace_description || "",
                                rest: b.target_rest_time_description || "",
                                reps: b.reps || 1,
                                category: b.category || "corrida",
                                zone: b.target_zone || "Z2",
                                unit: b.target_unit || "km"
                              })));
                            }}
                            title="Editar Sessão Completa"
                            style={{ background: "none", border: "none", cursor: "pointer", color: "#666", padding: 4 }}
                          >
                            <Edit2 size={14} />
                          </button>

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
                                      <label style={{ display: "block", fontSize: 9, fontWeight: 900, marginBottom: 4 }}>TÍTULO DO BLOCO (OPCIONAL)</label>
                                      <input name="title" type="text" defaultValue={w.title || ""} placeholder="Ex: Aquecimento, Tiro, etc" className="nb-input" style={{ width: "100%", padding: 8, fontFamily: "inherit" }} />
                                    </div>
                                    <div>
                                      <label style={{ display: "block", fontSize: 9, fontWeight: 900, marginBottom: 4 }}>DESCRIÇÃO DO BLOCO</label>
                                      <textarea name="targetDescription" required defaultValue={w.target_description} className="nb-input" rows={4} style={{ width: "100%", padding: 8, resize: "vertical", lineHeight: 1.6, fontFamily: "inherit" }} />
                                    </div>
                                  </div>
                                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                                    <div>
                                      <label style={{ display: "block", fontSize: 9, fontWeight: 900, marginBottom: 4 }}>REPS</label>
                                      <input name="reps" type="number" min="1" defaultValue={w.reps} className="nb-input" style={{ width: "100%", padding: 8 }} />
                                    </div>
                                    <div>
                                      <label style={{ display: "block", fontSize: 9, fontWeight: 900, marginBottom: 4 }}>CATEGORIA</label>
                                      <select name="category" defaultValue={w.category || "corrida"} className="nb-input" style={{ width: "100%", padding: 8 }}>
                                        {RUNNING_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                                      </select>
                                    </div>
                                    <div>
                                      <label style={{ display: "block", fontSize: 9, fontWeight: 900, marginBottom: 4 }}>ZONA</label>
                                      <select name="targetZone" defaultValue={w.target_zone || "Z2"} className="nb-input" style={{ width: "100%", padding: 8 }}>
                                        {RUNNING_ZONES.map(z => <option key={z.id} value={z.id}>{z.label}</option>)}
                                      </select>
                                    </div>
                                  </div>

                                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                                    <div>
                                      <label style={{ display: "block", fontSize: 9, fontWeight: 900, marginBottom: 4 }}>DISTÂNCIA</label>
                                      <div style={{ display: "flex", gap: 4 }}>
                                        <input name="targetDistanceKm" type="number" step="0.1" defaultValue={w.target_distance_km ? (w.target_unit === "m" && w.target_distance_km < 1 ? w.target_distance_km * 1000 : w.target_distance_km) : ""} className="nb-input" style={{ flex: 1, padding: 8 }} />
                                        <select name="targetUnit" defaultValue={w.target_unit || "km"} className="nb-input" style={{ width: 60, padding: 4, fontSize: 9 }}>
                                          <option value="km">KM</option>
                                          <option value="m">M</option>
                                          <option value="min">MIN</option>
                                        </select>
                                      </div>
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
                                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                                    {w.category && (
                                      <span style={{ 
                                        fontSize: 8, 
                                        fontWeight: 900, 
                                        padding: "2px 6px", 
                                        background: RUNNING_CATEGORIES.find(c => c.id === w.category)?.color || "#000",
                                        color: "#FFF",
                                        textTransform: "uppercase"
                                      }}>
                                        {RUNNING_CATEGORIES.find(c => c.id === w.category)?.label || w.category}
                                      </span>
                                    )}
                                    {w.target_zone && (
                                      <span style={{ 
                                        fontSize: 8, 
                                        fontWeight: 950, 
                                        padding: "2px 6px", 
                                        background: RUNNING_ZONES.find(z => z.id === w.target_zone)?.color || "#000",
                                        color: "#FFF",
                                      }}>
                                        {w.target_zone}
                                      </span>
                                    )}
                                  </div>

                                  {w.title && (
                                    <div style={{ fontWeight: 950, fontSize: 14, textTransform: "uppercase", marginBottom: 4 }}>
                                      {w.title}
                                    </div>
                                  )}
                                  <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 4 }}>
                                    {(w.reps || 1) > 1 && <span style={{ color: "var(--nb-blue)", marginRight: 4 }}>{w.reps}x</span>}
                                    {w.target_description}
                                  </div>

                                  <div style={{ display: "flex", gap: 12 }}>
                                    {w.target_distance_km && (
                                      <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 700, color: "#666" }}>
                                        <Zap size={10} /> 
                                        {w.target_unit === "m" 
                                          ? `${w.target_distance_km && w.target_distance_km < 1 ? w.target_distance_km * 1000 : w.target_distance_km}m` 
                                          : w.target_unit === "min"
                                          ? `${w.target_distance_km}min`
                                          : `${w.target_distance_km}km`}
                                        
                                        {(w.reps || 1) > 1 && (
                                          <span style={{ opacity: 0.6, marginLeft: 2 }}>
                                            (Tot: {w.target_unit === "m" 
                                              ? `${((w.target_distance_km && w.target_distance_km >= 1 ? w.target_distance_km / 1000 : (w.target_distance_km || 0)) * w.reps).toFixed(2)}km` 
                                              : w.target_unit === "min"
                                              ? `${(w.target_distance_km || 0) * w.reps}min`
                                              : `${((w.target_distance_km || 0) * w.reps).toFixed(2)}km`})
                                          </span>
                                        )}
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
                      <h3 style={{ fontSize: 14, fontWeight: 950, textTransform: "uppercase", margin: 0 }}>
                        {showAddForm.isEdit ? "Editar Sessão Completa" : "Nova Sessão de Treino"}
                      </h3>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <label style={{ fontSize: 10, fontWeight: 900 }}>ORDEM:</label>
                        <input name="sessionOrder" type="number" required defaultValue={showAddForm.isEdit ? showAddForm.sessionOrder : sortedWeekOrders(weekNum).length + 1} className="nb-input" style={{ width: 60, padding: "4px 8px" }} />
                      </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                      {addBlocks.map((block, idx) => (
                        <div key={idx} style={{ padding: 16, border: "2px solid #000", background: "#F9F9F9", position: "relative" }}>
                          <div style={{ position: "absolute", top: -12, right: -12, display: "flex", gap: 4 }}>
                            {idx > 0 && (
                              <button
                                type="button"
                                onClick={() => moveBlockUp(idx)}
                                style={{ background: "#000", color: "#FFF", border: "2px solid #000", width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                                title="Mover para cima"
                              >
                                <ArrowUp size={14} />
                              </button>
                            )}
                            {idx < addBlocks.length - 1 && (
                              <button
                                type="button"
                                onClick={() => moveBlockDown(idx)}
                                style={{ background: "#000", color: "#FFF", border: "2px solid #000", width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                                title="Mover para baixo"
                              >
                                <ArrowDown size={14} />
                              </button>
                            )}
                            {addBlocks.length > 1 && (
                              <button 
                                type="button" 
                                onClick={() => removeBlockFromForm(idx)}
                                style={{ background: "#E74C3C", color: "#FFF", border: "2px solid #000", width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                                title="Remover bloco"
                              >
                                <X size={14} />
                              </button>
                            )}
                          </div>
                          
                          <div style={{ marginBottom: 16 }}>
                            <label style={{ display: "block", fontSize: 9, fontWeight: 900, marginBottom: 8, textTransform: "uppercase", color: "#666" }}>Título do Bloco (Opcional)</label>
                            <input 
                              type="text" 
                              value={block.title} 
                              onChange={(e) => updateBlockInForm(idx, "title", e.target.value)} 
                              className="nb-input" 
                              placeholder="Ex: Aquecimento, Tiro 1, etc"
                              style={{ width: "100%", padding: 8, fontFamily: "inherit", fontSize: 14 }} 
                            />
                          </div>

                          <div style={{ marginBottom: 16 }}>
                            <label style={{ display: "block", fontSize: 9, fontWeight: 900, marginBottom: 8, textTransform: "uppercase", color: "#666" }}>Categoria</label>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                              {RUNNING_CATEGORIES.map(cat => (
                                <button
                                  key={cat.id}
                                  type="button"
                                  onClick={() => updateBlockInForm(idx, "category", cat.id)}
                                  style={{
                                    padding: "6px 12px",
                                    fontSize: 9,
                                    fontWeight: 900,
                                    textTransform: "uppercase",
                                    border: "2px solid #000",
                                    background: block.category === cat.id ? cat.color : "#FFF",
                                    color: block.category === cat.id ? "#FFF" : "#000",
                                    cursor: "pointer",
                                    boxShadow: block.category === cat.id ? "none" : "2px 2px 0px #000",
                                    transform: block.category === cat.id ? "translate(1px, 1px)" : "none",
                                    transition: "all 0.1s ease"
                                  }}
                                >
                                  {cat.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div style={{ display: "grid", gridTemplateColumns: block.category === "tiro" ? "1fr 2fr" : "1fr", gap: 12, marginBottom: 16 }}>
                            {block.category === "tiro" && (
                            <div>
                              <label style={{ display: "block", fontSize: 9, fontWeight: 900, marginBottom: 4, textTransform: "uppercase", color: "#666" }}>Repetições</label>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <input 
                                  type="number" min="1"
                                  value={block.reps}
                                  onChange={(e) => updateBlockInForm(idx, "reps", e.target.value)}
                                  className="nb-input" 
                                  style={{ width: "100%", padding: 10, textAlign: "center", fontWeight: 900 }} 
                                />
                                <span style={{ fontWeight: 900, fontSize: 12 }}>x</span>
                              </div>
                            </div>
                            )}
                            <div>
                              <label style={{ display: "block", fontSize: 9, fontWeight: 900, marginBottom: 4, textTransform: "uppercase", color: "#666" }}>Intensidade (Zona)</label>
                              <div style={{ display: "flex", gap: 4 }}>
                                {RUNNING_ZONES.map(z => (
                                  <button
                                    key={z.id}
                                    type="button"
                                    onClick={() => updateBlockInForm(idx, "zone", z.id)}
                                    title={z.desc}
                                    style={{
                                      flex: 1,
                                      padding: "10px 0",
                                      fontSize: 10,
                                      fontWeight: 950,
                                      border: "2px solid #000",
                                      background: block.zone === z.id ? z.color : "#FFF",
                                      color: block.zone === z.id ? "#FFF" : "#000",
                                      cursor: "pointer",
                                      transition: "all 0.1s ease"
                                    }}
                                  >
                                    {z.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div style={{ marginBottom: 12 }}>
                            <label style={{ display: "block", fontSize: 9, fontWeight: 900, marginBottom: 4, textTransform: "uppercase", color: "#666" }}>Descrição do Bloco</label>
                            <textarea 
                              required 
                              placeholder="Ex: Tiro de 400m ou Corrida Leve" 
                              value={block.description}
                              onChange={(e) => updateBlockInForm(idx, "description", e.target.value)}
                              className="nb-input" 
                              rows={4}
                              style={{ width: "100%", padding: 10, resize: "vertical", lineHeight: 1.6, fontFamily: "inherit" }} 
                            />
                          </div>

                          <div style={{ display: "grid", gridTemplateColumns: block.category === "tiro" ? "1fr 1fr 1fr" : "1fr 1fr", gap: 12 }}>
                            <div>
                              <label style={{ display: "block", fontSize: 9, fontWeight: 900, marginBottom: 4, textTransform: "uppercase", color: "#666" }}>Distância</label>
                              <div style={{ display: "flex", gap: 4 }}>
                                <input 
                                  type="number" step="0.1" 
                                  value={block.distance}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (parseFloat(val) > 99999) return;
                                    updateBlockInForm(idx, "distance", val);
                                  }}
                                  onKeyDown={(e) => ["e", "E", "+", "-"].includes(e.key) && e.preventDefault()}
                                  className="nb-input" 
                                  style={{ flex: 1, padding: 8 }} 
                                />
                                <div style={{ display: "flex", border: "2px solid #000", borderRadius: 2, overflow: "hidden", width: 120 }}>
                                  <button 
                                    type="button"
                                    onClick={() => updateBlockInForm(idx, "unit", "km")}
                                    style={{ 
                                      flex: 1,
                                      background: (block.unit || "km") === "km" ? "#000" : "#FFF", 
                                      color: (block.unit || "km") === "km" ? "#FFF" : "#000", 
                                      border: "none",
                                      fontSize: 9, 
                                      padding: "8px 0",
                                      cursor: "pointer", 
                                      fontWeight: 950,
                                      transition: "all 0.2s"
                                    }}
                                  >
                                    KM
                                  </button>
                                  <button 
                                    type="button"
                                    onClick={() => updateBlockInForm(idx, "unit", "m")}
                                    style={{ 
                                      flex: 1,
                                      background: (block.unit || "km") === "m" ? "#000" : "#FFF", 
                                      color: (block.unit || "km") === "m" ? "#FFF" : "#000", 
                                      border: "none",
                                      borderLeft: "2px solid #000",
                                      fontSize: 9, 
                                      padding: "8px 0",
                                      cursor: "pointer", 
                                      fontWeight: 950,
                                      transition: "all 0.2s"
                                    }}
                                  >
                                    M
                                  </button>
                                  <button 
                                    type="button"
                                    onClick={() => updateBlockInForm(idx, "unit", "min")}
                                    style={{ 
                                      flex: 1,
                                      background: (block.unit || "km") === "min" ? "#000" : "#FFF", 
                                      color: (block.unit || "km") === "min" ? "#FFF" : "#000", 
                                      border: "none",
                                      borderLeft: "2px solid #000",
                                      fontSize: 9, 
                                      padding: "8px 0",
                                      cursor: "pointer", 
                                      fontWeight: 950,
                                      transition: "all 0.2s"
                                    }}
                                  >
                                    MIN
                                  </button>
                                </div>
                              </div>
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
                            {block.category === "tiro" && (
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
                            )}
                          </div>
                          
                          {/* Volume do Bloco */}
                          {block.distance && (
                            <div style={{ marginTop: 12, textAlign: "right", fontSize: 10, fontWeight: 900, color: "#666" }}>
                              Volume do Bloco: <span style={{ color: "#000" }}>
                                {block.reps > 1 ? `${block.reps}x ` : ""}
                                {block.distance}{block.unit}
                                {block.unit !== "min" && (
                                  <>{" "}= {
                                    block.unit === "km" 
                                      ? (parseFloat(block.distance) * block.reps).toFixed(2) + "km"
                                      : (parseFloat(block.distance) * block.reps / 1000).toFixed(2) + "km"
                                  }</>
                                )}
                              </span>
                            </div>
                          )}
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
                        <button type="button" onClick={() => { setShowAddForm(null); setAddBlocks([{ title: "", description: "", distance: "", pace: "", rest: "", reps: 1, category: "corrida", zone: "Z2", unit: "km" }]); }} className="nb-button" style={{ padding: 12, background: "#EEE", color: "#000", fontSize: 11, fontWeight: 900 }}>
                          CANCELAR
                        </button>
                      </div>
                      {error && <div style={{ color: "var(--nb-red)", fontSize: 10, fontWeight: "bold", textAlign: "center" }}>{error}</div>}
                    </div>
                  </form>
                ) : (
                  <button 
                    onClick={() => { setShowAddForm({ week: weekNum }); setAddBlocks([{ title: "", description: "", distance: "", pace: "", rest: "", reps: 1, category: "corrida", zone: "Z2", unit: "km" }]); }}
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

"use client";

import React, { useState } from "react";
import { Plus, Trash2, ChevronDown, ChevronRight, Zap, Timer } from "lucide-react";
import { createTemplateWorkout, deleteTemplateWorkout } from "@/lib/actions/running_actions";

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
  onUpdate?: () => void;
}

export default function TemplateWorkoutsManager({ template, onUpdate }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expandedWeeks, setExpandedWeeks] = useState<number[]>([1]);
  const [showAddForm, setShowAddForm] = useState<{ week: number } | null>(null);

  // Agrupar treinos por semana
  const groupedWorkouts = (template.running_template_workouts || []).reduce((acc, w) => {
    if (!acc[w.week_number]) acc[w.week_number] = [];
    acc[w.week_number].push(w);
    return acc;
  }, {} as Record<number, TemplateWorkout[]>);

  // Ordenar sessões dentro de cada semana
  Object.keys(groupedWorkouts).forEach(week => {
    groupedWorkouts[Number(week)].sort((a, b) => a.session_order - b.session_order);
  });

  const toggleWeek = (week: number) => {
    setExpandedWeeks(prev =>
      prev.includes(week) ? prev.filter(w => w !== week) : [...prev, week]
    );
  };

  const handleAddWorkout = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const formData = new FormData(e.currentTarget);
    try {
      await createTemplateWorkout(formData);
      setShowAddForm(null);
      if (onUpdate) onUpdate();
    } catch (err: any) {
      setError(err.message || "Erro ao adicionar treino");
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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {Array.from({ length: template.duration_weeks }, (_, i) => i + 1).map(weekNum => {
        const isExpanded = expandedWeeks.includes(weekNum);
        const workouts = groupedWorkouts[weekNum] || [];

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
                {workouts.length} Sessões
              </span>
            </div>

            {isExpanded && (
              <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
                {workouts.map(w => (
                  <div key={w.id} style={{ 
                    padding: 16, 
                    border: "2px solid #000", 
                    background: "#F9F9F9",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start"
                  }}>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 900, color: "var(--nb-red)", marginBottom: 4, textTransform: "uppercase" }}>
                        Sessão {w.session_order}
                      </div>
                      <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 8 }}>{w.target_description}</div>
                      <div style={{ display: "flex", gap: 12 }}>
                        {w.target_distance_km && (
                          <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700 }}>
                            <Zap size={12} /> {w.target_distance_km}km
                          </div>
                        )}
                        {w.target_pace_description && (
                          <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700 }}>
                            <Timer size={12} /> {w.target_pace_description}
                          </div>
                        )}
                      </div>
                    </div>
                    <button 
                      onClick={() => handleDeleteWorkout(w.id)}
                      disabled={loading}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "#666" }}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}

                {showAddForm?.week === weekNum ? (
                  <form onSubmit={handleAddWorkout} className="nb-card" style={{ padding: 16, background: "#FFF", border: "2px dashed #000" }}>
                    <input type="hidden" name="templateId" value={template.id} />
                    <input type="hidden" name="weekNumber" value={weekNum} />
                    
                    <div style={{ display: "grid", gap: 12 }}>
                      <div style={{ display: "grid", gridTemplateColumns: "100px 1fr", gap: 12 }}>
                        <div>
                          <label style={{ display: "block", fontSize: 9, fontWeight: 900, marginBottom: 4 }}>ORDEM</label>
                          <input name="sessionOrder" type="number" required defaultValue={workouts.length + 1} className="nb-input" style={{ width: "100%", padding: 8 }} />
                        </div>
                        <div>
                          <label style={{ display: "block", fontSize: 9, fontWeight: 900, marginBottom: 4 }}>DESCRIÇÃO DO TREINO</label>
                          <input name="targetDescription" required placeholder="Ex: Corrida Leve" className="nb-input" style={{ width: "100%", padding: 8 }} />
                        </div>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                        <div>
                          <label style={{ display: "block", fontSize: 9, fontWeight: 900, marginBottom: 4 }}>DISTÂNCIA (KM)</label>
                          <input name="targetDistanceKm" type="number" step="0.1" className="nb-input" style={{ width: "100%", padding: 8 }} />
                        </div>
                        <div>
                          <label style={{ display: "block", fontSize: 9, fontWeight: 900, marginBottom: 4 }}>PACE ALVO</label>
                          <input name="targetPaceDescription" placeholder="Ex: 5:30/km" className="nb-input" style={{ width: "100%", padding: 8 }} />
                        </div>
                        <div>
                          <label style={{ display: "block", fontSize: 9, fontWeight: 900, marginBottom: 4 }}>DESCANSO</label>
                          <input name="targetRestTimeDescription" placeholder="Ex: 2 min" className="nb-input" style={{ width: "100%", padding: 8 }} />
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: 8 }}>
                        <button type="submit" disabled={loading} className="nb-button" style={{ flex: 1, padding: 10, background: "#000", color: "#FFF", fontSize: 11 }}>
                          {loading ? "ADICIONANDO..." : "ADICIONAR SESSÃO"}
                        </button>
                        <button type="button" onClick={() => setShowAddForm(null)} className="nb-button" style={{ padding: 10, background: "#EEE", color: "#000", fontSize: 11 }}>
                          CANCELAR
                        </button>
                      </div>
                      {error && <div style={{ color: "var(--nb-red)", fontSize: 10, fontWeight: "bold" }}>{error}</div>}
                    </div>
                  </form>
                ) : (
                  <button 
                    onClick={() => setShowAddForm({ week: weekNum })}
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
    </div>
  );
}

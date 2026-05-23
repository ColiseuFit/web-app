"use client";

import { useState, useEffect } from "react";
import { LayoutGrid, CheckCircle2, Trash2 } from "lucide-react";
import { bulkCreateRunningWorkouts } from "@/lib/actions/running_actions";
import { RUNNING_CATEGORIES, RUNNING_ZONES } from "@/lib/constants/running";
import { maskPace, maskTime } from "./running-utils";

const MAX_SESSIONS_PER_WEEK = 7;

interface GeneratorProps {
  planId: string;
  studentId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function WeeklyPlanGenerator({ planId, studentId, onSuccess, onCancel }: GeneratorProps) {
  const [numSessionsPerWeek, setNumSessionsPerWeek] = useState<number>(3);
  
  // Cada sessão pode ter múltiplos blocos (ex: um bloco de corrida, outro só de fortalecimento/texto)
  interface SessionBlock {
    id: string;
    description: string;
    distance: string;
    unit: "km" | "m";
    pace: string;
    rest: string;
    reps: number;
    category: string;
    zone: string;
    showMetrics: boolean;
  }

  const [activeWeek, setActiveWeek] = useState(1);
  const [allWeeksConfigs, setAllWeeksConfigs] = useState<Record<number, Record<number, SessionBlock[]>>>({
    1: {}, 2: {}, 3: {}, 4: {}
  });

  const [startDate, setStartDate] = useState(() => {
    // Próxima segunda-feira em UTC (usado apenas como referência temporal para o banco)
    const d = new Date();
    const day = d.getUTCDay();
    const toMonday = day === 0 ? 1 : (8 - day) % 7 || 7;
    d.setUTCDate(d.getUTCDate() + toMonday);
    return d.toISOString().split("T")[0];
  });
  const [weeks, setWeeks] = useState(4);
  const [isGenerating, setIsGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [successCount, setSuccessCount] = useState<number | null>(null);

  const sessionKeys = Array.from({ length: numSessionsPerWeek }, (_, i) => i + 1);

  // Alias para a semana ativa
  const sessionConfigs = allWeeksConfigs[activeWeek] || {};

  const setSessionConfigs = (newConfigs: Record<number, SessionBlock[]>) => {
    setAllWeeksConfigs(prev => ({
      ...prev,
      [activeWeek]: newConfigs
    }));
  };

  // Inicializa configs para as sessões
  useEffect(() => {
    const next = { ...sessionConfigs };
    let changed = false;
    sessionKeys.forEach(sOrder => {
      if (!next[sOrder] || next[sOrder].length === 0) {
        next[sOrder] = [{
          id: Math.random().toString(36).substr(2, 9),
          description: "",
          distance: "",
          unit: "km",
          pace: "",
          rest: "",
          reps: 1,
          category: "corrida",
          zone: "Z2",
          showMetrics: false
        }];
        changed = true;
      }
    });
    if (changed) setSessionConfigs(next);
  }, [numSessionsPerWeek, activeWeek]);

  const addBlock = (sessionOrder: number) => {
    const newBlock: SessionBlock = {
      id: Math.random().toString(36).substr(2, 9),
      description: "",
      distance: "",
      unit: "km",
      pace: "",
      rest: "",
      reps: 1,
      category: "corrida",
      zone: "Z2",
      showMetrics: false
    };
    setSessionConfigs({
      ...sessionConfigs,
      [sessionOrder]: [...(sessionConfigs[sessionOrder] || []), newBlock]
    });
  };

  const removeBlock = (sessionOrder: number, blockId: string) => {
    setSessionConfigs({
      ...sessionConfigs,
      [sessionOrder]: (sessionConfigs[sessionOrder] || []).filter(s => s.id !== blockId)
    });
  };

  const updateBlock = (sessionOrder: number, blockId: string, updates: Partial<SessionBlock>) => {
    const items = [...(sessionConfigs[sessionOrder] || [])];
    const idx = items.findIndex(s => s.id === blockId);
    if (idx === -1) return;

    let finalUpdates = { ...updates };
    if (updates.pace) finalUpdates.pace = maskPace(updates.pace);
    if (updates.rest) finalUpdates.rest = maskTime(updates.rest);

    items[idx] = { ...items[idx], ...finalUpdates };
    setSessionConfigs({ ...sessionConfigs, [sessionOrder]: items });
  };

  const copyToAllSessions = (sourceSessionOrder: number) => {
    const sourceConfig = sessionConfigs[sourceSessionOrder];
    if (!sourceConfig) return;
    
    const newConfigs = { ...sessionConfigs };
    sessionKeys.forEach(sOrder => {
      newConfigs[sOrder] = sourceConfig.map(s => ({
        ...s,
        id: Math.random().toString(36).substr(2, 9)
      }));
    });
    setSessionConfigs(newConfigs);
  };

  const copyWeekOneToAll = () => {
    const week1 = JSON.parse(JSON.stringify(allWeeksConfigs[1]));
    setAllWeeksConfigs({
      1: week1,
      2: JSON.parse(JSON.stringify(week1)),
      3: JSON.parse(JSON.stringify(week1)),
      4: JSON.parse(JSON.stringify(week1)),
    });
  };

  async function handleGenerate() {
    setIsGenerating(true);
    setGenError(null);
    
    try {
      let currentTotal = 0;
      for (let w = 1; w <= weeks; w++) {
        // Fallback inteligente: se a semana atual não tiver nenhuma sessão configurada, usa a Semana 1 como base
        const currentWeekConfig = allWeeksConfigs[w];
        const hasSessions = currentWeekConfig && Object.values(currentWeekConfig).some(blocks => blocks.length > 0);
        const weekConfigs = hasSessions ? currentWeekConfig : allWeeksConfigs[1];
        const sessions: any[] = [];
        
        for (const sOrder of sessionKeys) {
          const items = weekConfigs[sOrder] || [];
          for (const item of items) {
            if (!item.description?.trim()) continue;

            let dist = item.distance ? parseFloat(item.distance) : null;
            if (dist !== null && item.unit === "m") {
              dist = dist / 1000;
            }

            sessions.push({
              sessionOrder: sOrder,
              description: item.description,
              targetDistanceKm: dist,
              targetPace: item.pace || null,
              targetRestTime: item.rest || null,
              reps: item.reps,
              category: item.category,
              targetZone: item.zone,
              targetUnit: item.unit
            });
          }
        }

        if (sessions.length > 0) {
          const weekStartDate = new Date(startDate + "T12:00:00Z");
          weekStartDate.setUTCDate(weekStartDate.getUTCDate() + (w - 1) * 7);
          const dateStr = weekStartDate.toISOString().split("T")[0];

          // weekOffset é w - 1 (para o bulkCreate começar com a semana certa)
          const result = await bulkCreateRunningWorkouts(planId, studentId, dateStr, 1, sessions, w - 1);
          currentTotal += result.count;
        }
      }

      setSuccessCount(currentTotal);
      setTimeout(() => onSuccess(), 1200);
    } catch (err: any) {
      setGenError(err.message || "Erro ao gerar sessões.");
    } finally {
      setIsGenerating(false);
    }
  }

  // Cálculo total considerando todas as semanas se configuradas, ou repetindo a 1
  const totalBlocks = weeks * sessionKeys.reduce((acc, sOrder) => acc + (sessionConfigs[sOrder]?.length || 1), 0);

  const inputSt: React.CSSProperties = {
    width: "100%", padding: "10px 12px", border: "2px solid #000",
    fontWeight: 700, fontSize: 13, boxSizing: "border-box" as const,
  };

  return (
    <div style={{ border: "4px solid #000", background: "#FFF", marginBottom: 20, boxShadow: "6px 6px 0px #000", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ background: "#000", color: "#FFF", padding: "14px 20px", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <LayoutGrid size={18} />
        <span className="font-display" style={{ fontSize: 16, fontWeight: 900, textTransform: "uppercase", letterSpacing: "-0.02em" }}>
          Gerador de Ciclo Customizado
        </span>
        <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 700, background: "rgba(255,255,255,0.15)", padding: "3px 10px" }}>
          {totalBlocks} bloco{totalBlocks !== 1 ? "s" : ""} serão criados
        </span>
      </div>

      {/* Toast de sucesso */}
      {successCount !== null && (
        <div style={{
          padding: "14px 20px", background: "#D1FAE5", borderBottom: "3px solid #059669",
          display: "flex", alignItems: "center", gap: 10,
          fontSize: 13, fontWeight: 800, color: "#065F46",
        }}>
          <CheckCircle2 size={18} style={{ color: "#059669", flexShrink: 0 }} />
          {successCount} sessões geradas com sucesso! Fechando...
        </div>
      )}

      <div style={{ padding: 20 }}>
        {/* Seletor de Sessões */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", fontSize: 11, fontWeight: 900, textTransform: "uppercase", marginBottom: 10, letterSpacing: "0.06em" }}>
            1. Sessões por semana
          </label>
          <div style={{ display: "flex", border: "2px solid #000", width: "fit-content" }}>
            <button type="button" onClick={() => setNumSessionsPerWeek(s => Math.max(1, s - 1))}
              style={{ padding: "10px 14px", border: "none", background: "#F3F3F3", fontWeight: 900, cursor: "pointer", fontSize: 16 }}
            >−</button>
            <div style={{ width: 60, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 18, background: "#FFF" }}>
              {numSessionsPerWeek}x
            </div>
            <button type="button" onClick={() => setNumSessionsPerWeek(s => Math.min(MAX_SESSIONS_PER_WEEK, s + 1))}
              style={{ padding: "10px 14px", border: "none", background: "#F3F3F3", fontWeight: 900, cursor: "pointer", fontSize: 16 }}
            >+</button>
          </div>
        </div>

        {/* Tabs de Semanas (Periodização) */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <label style={{ fontSize: 11, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              2. Periodização (Configuração por Semana)
            </label>
            {activeWeek > 1 && (
              <button
                type="button"
                onClick={copyWeekOneToAll}
                style={{ background: "#F3F4F6", border: "2px solid #000", padding: "4px 10px", fontSize: 10, fontWeight: 900, cursor: "pointer" }}
              >
                👯 COPIAR SEMANA 1 PARA TODAS
              </button>
            )}
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            {[1, 2, 3, 4].map(w => (
              <button
                key={w}
                type="button"
                onClick={() => setActiveWeek(w)}
                style={{
                  flex: 1, padding: "12px 10px", fontWeight: 950, fontSize: 12,
                  border: "3px solid #000",
                  background: activeWeek === w ? "#FFE24D" : "#FFF",
                  color: "#000",
                  cursor: "pointer",
                  boxShadow: activeWeek === w ? "none" : "4px 4px 0px #000",
                  transform: activeWeek === w ? "translate(2px, 2px)" : "none",
                  transition: "all 0.1s"
                }}
              >
                SEMANA {w} {w === 1 && <span style={{ fontSize: 9, opacity: 0.5 }}>(BASE)</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Config por Sessão */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ 
            display: "flex", 
            flexDirection: "column", 
            gap: 20 
          }}>
            {sessionKeys.map(sOrder => {
                const items = sessionConfigs[sOrder] || [];
                
                return (
                  <div key={sOrder} style={{ border: "3px solid #000", padding: "16px", background: "#FDFDFD", boxShadow: "8px 8px 0px rgba(0,0,0,0.05)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, borderBottom: "2px solid #000", paddingBottom: 8 }}>
                      <div style={{ fontSize: 14, fontWeight: 950, textTransform: "uppercase", color: "#000", display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ background: "#000", color: "#FFF", padding: "2px 6px", borderRadius: 2 }}>{sOrder}</span>
                        SESSÃO {sOrder}
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          type="button"
                          onClick={() => copyToAllSessions(sOrder)}
                          title="Copiar este treino para todas as outras sessões da semana"
                          style={{ background: "#FFF", border: "2px solid #000", padding: "4px 8px", fontSize: 9, fontWeight: 900, cursor: "pointer" }}
                        >
                          REPLICAR SESSÃO
                        </button>
                        <button
                          type="button"
                          onClick={() => addBlock(sOrder)}
                          style={{ background: "#000", color: "#FFF", border: "none", padding: "4px 10px", fontSize: 9, fontWeight: 900, cursor: "pointer" }}
                        >
                          + BLOCO
                        </button>
                      </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {items.map((item) => (
                        <div key={item.id} style={{ background: "#FFF", border: "2px solid #000", padding: 12, position: "relative" }}>
                          {items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeBlock(sOrder, item.id)}
                              style={{ position: "absolute", top: 8, right: 8, background: "none", border: "none", color: "#F00", cursor: "pointer" }}
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                          
                          <div style={{ marginBottom: 10 }}>
                            <label style={{ display: "block", fontSize: 9, fontWeight: 900, color: "#888", marginBottom: 4, textTransform: "uppercase" }}>DESCRIÇÃO DO BLOCO</label>
                            <input
                              placeholder={`ex: 10x 400m ou 5km Rodagem`}
                              value={item.description}
                              onChange={e => updateBlock(sOrder, item.id, { description: e.target.value })}
                              maxLength={60}
                              style={{ ...inputSt, border: "2px solid #000" }}
                            />
                          </div>

                          {item.showMetrics && (
                            <div style={{ marginBottom: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                              <div>
                                <label style={{ display: "block", fontSize: 9, fontWeight: 900, color: "#888", marginBottom: 4, textTransform: "uppercase" }}>Categoria</label>
                                <select 
                                  value={item.category} 
                                  onChange={e => updateBlock(sOrder, item.id, { category: e.target.value })}
                                  style={inputSt}
                                >
                                  {RUNNING_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                                </select>
                              </div>
                              <div>
                                <label style={{ display: "block", fontSize: 9, fontWeight: 900, color: "#888", marginBottom: 4, textTransform: "uppercase" }}>Intensidade (Zona)</label>
                                <select 
                                  value={item.zone} 
                                  onChange={e => updateBlock(sOrder, item.id, { zone: e.target.value })}
                                  style={inputSt}
                                >
                                  {RUNNING_ZONES.map(z => <option key={z.id} value={z.id}>{z.label}</option>)}
                                </select>
                              </div>
                            </div>
                          )}

                          {item.showMetrics && (
                            <div style={{ marginBottom: 12 }}>
                               <label style={{ display: "block", fontSize: 9, fontWeight: 900, color: "#888", marginBottom: 4, textTransform: "uppercase" }}>Repetições (Multiplicador)</label>
                               <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                 <input
                                   type="number" min="1"
                                   value={item.reps}
                                   onChange={e => updateBlock(sOrder, item.id, { reps: parseInt(e.target.value) || 1 })}
                                   style={{ ...inputSt, width: 80, textAlign: "center" }}
                                 />
                                 <span style={{ fontWeight: 900, fontSize: 14 }}>x</span>
                                 <div style={{ fontSize: 10, color: "#666", fontWeight: 700 }}>
                                   {item.reps > 1 ? "Série com " + item.reps + " repetições" : "Execução única"}
                                 </div>
                               </div>
                            </div>
                          )}

                          {!item.showMetrics ? (
                            <div style={{ display: "flex", gap: 8 }}>
                              <button
                                type="button"
                                onClick={() => updateBlock(sOrder, item.id, { showMetrics: true })}
                                style={{ background: "#EEE", border: "1px solid #000", padding: "4px 8px", fontSize: 9, fontWeight: 900, cursor: "pointer", textTransform: "uppercase" }}
                              >
                                + Metas (Km/Pace/Desc)
                              </button>
                            </div>
                          ) : (
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                              <div>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", height: 24, marginBottom: 4 }}>
                                  <label style={{ fontSize: 10, fontWeight: 900, color: "#888", textTransform: "uppercase", margin: 0 }}>DIST.</label>
                                  <div style={{ display: "flex", border: "2px solid #000", borderRadius: 4, overflow: "hidden" }}>
                                    <button 
                                      type="button" 
                                      onClick={() => updateBlock(sOrder, item.id, { unit: "km" })}
                                      style={{ fontSize: 10, fontWeight: 900, padding: "2px 8px", border: "none", background: item.unit === "km" ? "#000" : "#FFF", color: item.unit === "km" ? "#FFF" : "#000", cursor: "pointer" }}
                                    >KM</button>
                                    <div style={{ width: 2, background: "#000" }} />
                                    <button 
                                      type="button" 
                                      onClick={() => updateBlock(sOrder, item.id, { unit: "m" })}
                                      style={{ fontSize: 10, fontWeight: 900, padding: "2px 8px", border: "none", background: item.unit === "m" ? "#000" : "#FFF", color: item.unit === "m" ? "#FFF" : "#000", cursor: "pointer" }}
                                    >M</button>
                                  </div>
                                </div>
                                <input
                                  type="number" step="0.1" min="0" max="99999"
                                  value={item.distance}
                                  onKeyDown={(e) => {
                                    if (["e", "E", "+", "-"].includes(e.key)) {
                                      e.preventDefault();
                                    }
                                  }}
                                  onChange={e => {
                                    if (e.target.value.length <= 6) {
                                      updateBlock(sOrder, item.id, { distance: e.target.value });
                                    }
                                  }}
                                  style={{ ...inputSt, border: "2px solid #000" }}
                                />
                              </div>
                              <div>
                                <div style={{ display: "flex", alignItems: "center", height: 24, marginBottom: 4 }}>
                                  <label style={{ fontSize: 10, fontWeight: 900, color: "#888", textTransform: "uppercase", margin: 0 }}>PACE</label>
                                </div>
                                <input
                                  placeholder="6:00"
                                  value={item.pace}
                                  onChange={e => updateBlock(sOrder, item.id, { pace: e.target.value })}
                                  style={{ ...inputSt, border: "2px solid #000" }}
                                />
                              </div>
                              <div>
                                <div style={{ display: "flex", alignItems: "center", height: 24, marginBottom: 4 }}>
                                  <label style={{ fontSize: 10, fontWeight: 900, color: "#888", textTransform: "uppercase", margin: 0 }}>DESC.</label>
                                </div>
                                <input
                                  placeholder="1:00"
                                  value={item.rest}
                                  onChange={e => updateBlock(sOrder, item.id, { rest: e.target.value })}
                                  style={{ ...inputSt, border: "2px solid #000" }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Data + Semanas */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", fontSize: 11, fontWeight: 900, textTransform: "uppercase", marginBottom: 10, letterSpacing: "0.06em" }}>
            3. Período do plano
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 10, fontWeight: 800, color: "#666", marginBottom: 4 }}>DATA DE INÍCIO DA SEMANA 1</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                style={inputSt}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 10, fontWeight: 800, color: "#666", marginBottom: 4 }}>NÚMERO DE SEMANAS</label>
              <div style={{ display: "flex", border: "2px solid #000" }}>
                <button type="button" onClick={() => setWeeks(w => Math.max(1, w - 1))}
                  style={{ padding: "10px 14px", border: "none", background: "#F3F3F3", fontWeight: 900, cursor: "pointer", fontSize: 16 }}
                >−</button>
                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 18, background: "#FFF" }}>
                  {weeks}
                </div>
                <button type="button" onClick={() => setWeeks(w => Math.min(16, w + 1))}
                  style={{ padding: "10px 14px", border: "none", background: "#F3F3F3", fontWeight: 900, cursor: "pointer", fontSize: 16 }}
                >+</button>
              </div>
              <div style={{ fontSize: 10, color: "#999", fontWeight: 700, marginTop: 4 }}>
                Até {(() => { const d = new Date(startDate + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + weeks * 7); return d.toLocaleDateString("pt-BR"); })()}
              </div>
            </div>
          </div>
        </div>

        {genError && (
          <div style={{ padding: "10px 14px", background: "#FEF2F2", border: "2px solid #FECACA", fontSize: 12, fontWeight: 700, color: "#DC2626", marginBottom: 16 }}>
            {genError}
          </div>
        )}

        <div style={{ height: 40 }} /> {/* Spacer para o footer sticky */}

        {/* Resumo + Ações — sticky no fundo do painel */}
        <div style={{
          position: "sticky", bottom: 0,
          background: "#FFF",
          borderTop: "2px solid #E5E5E5",
          padding: "14px 20px",
          marginTop: 4,
        }}>
          <div style={{ background: "#F3F4F6", border: "2px solid #E5E5E5", padding: "10px 14px", marginBottom: 12, fontSize: 12, fontWeight: 700, color: "#444" }}>
            ✅ Serão criados <strong>{totalBlocks} blocos</strong> — {numSessionsPerWeek}x/semana × {weeks} semanas · Até {(() => { const d = new Date(startDate + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + weeks * 7); return d.toLocaleDateString("pt-BR"); })()}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating || sessionKeys.length === 0 || successCount !== null}
              className="admin-btn admin-btn-primary"
              style={{ flex: 1, height: 48, fontSize: 13, fontWeight: 950 }}
            >
              {isGenerating ? `GERANDO ${totalBlocks} BLOCOS...` : `⚡ GERAR ${totalBlocks} BLOCOS`}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="admin-btn admin-btn-ghost"
              style={{ width: 120, height: 48 }}
            >
              CANCELAR
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

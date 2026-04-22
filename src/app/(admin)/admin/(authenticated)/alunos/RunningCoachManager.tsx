"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Zap, Plus, Calendar, Trash2, Archive,
  CheckCircle2, Clock, TrendingUp, Target, Activity, Wind,
  LayoutGrid, ChevronDown, ChevronUp
} from "lucide-react";
import {
  getStudentRunningData,
  assignRunningPlan,
  createRunningWorkout,
  deleteRunningWorkout,
  archiveRunningPlan,
  getStudentRunningHistory,
  bulkCreateRunningWorkouts,
  type WeekDaySession,
} from "@/lib/actions/running_actions";
import { RUNNING_LEVELS, formatPace, type RunningLevelKey } from "@/lib/constants/running";
import RunningAnalytics from "@/components/RunningAnalytics";

interface Props {
  studentId: string;
}

// ── Utilitários ──────────────────────────────────────────────────────────────

/**
 * Formata segundos totais em string "Xh Ymin" ou "Zmin".
 */
function formatDuration(totalSeconds: number): string {
  if (!totalSeconds) return "—";
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}min`;
  return `${m}min`;
}

/**
 * Calcula métricas agregadas de um array de treinos concluídos.
 * Retorna: volume total (km), pace médio (seg/km), taxa de adesão (%), RPE médio
 */
function calcKPIs(workouts: any[]) {
  const completed = workouts.filter((w) => w.completed_at);
  const total = workouts.length;
  const done = completed.length;

  const volumeKm = completed.reduce((acc, w) => acc + (parseFloat(w.actual_distance_km) || 0), 0);
  const pacesWithData = completed.filter((w) => w.actual_pace_seconds_per_km > 0);
  const avgPace = pacesWithData.length > 0
    ? Math.round(pacesWithData.reduce((acc, w) => acc + w.actual_pace_seconds_per_km, 0) / pacesWithData.length)
    : 0;
  const rpeValues = completed.filter((w) => w.rpe).map((w) => w.rpe);
  const avgRpe = rpeValues.length > 0
    ? (rpeValues.reduce((a, b) => a + b, 0) / rpeValues.length).toFixed(1)
    : "—";
  const adhesion = total > 0 ? Math.round((done / total) * 100) : 0;

  return { volumeKm: volumeKm.toFixed(1), avgPace, adhesion, avgRpe, done, total };
}

// ── Skeleton Screen (Iron Monolith — sem tela branca) ────────────────────────

function RunningSkeletonLoader() {
  return (
    <div style={{ padding: "0", animation: "pulse 1.5s infinite" }}>
      {/* KPIs skeleton */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
        {[...Array(4)].map((_, i) => (
          <div key={i} style={{ height: 72, background: "#F0F0F0", border: "2px solid #E5E5E5" }} />
        ))}
      </div>
      {/* Plan header skeleton */}
      <div style={{ height: 80, background: "#F0F0F0", marginBottom: 24 }} />
      {/* Workout rows skeleton */}
      {[...Array(3)].map((_, i) => (
        <div key={i} style={{ height: 64, background: "#F0F0F0", marginBottom: 10, border: "2px solid #E5E5E5" }} />
      ))}
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }`}</style>
    </div>
  );
}

// ── Painel de KPIs ────────────────────────────────────────────────────────────

function KpiPanel({ workouts }: { workouts: any[] }) {
  const kpis = calcKPIs(workouts);

  const items = [
    { icon: <TrendingUp size={18} />, label: "Volume Total", value: `${kpis.volumeKm} km`, color: "#3498DB" },
    { icon: <Wind size={18} />, label: "Pace Médio", value: kpis.avgPace > 0 ? formatPace(kpis.avgPace) : "—", color: "#8E44AD" },
    { icon: <Target size={18} />, label: "Adesão", value: `${kpis.adhesion}%`, color: kpis.adhesion >= 80 ? "#27AE60" : kpis.adhesion >= 50 ? "#F39C12" : "#E74C3C" },
    { icon: <Activity size={18} />, label: "RPE Médio", value: kpis.avgRpe, color: "#E67E22" },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 24 }}>
      {items.map((item, i) => (
        <div key={i} style={{
          padding: "14px 16px",
          border: "3px solid #000",
          borderLeft: `6px solid ${item.color}`,
          background: "#FFF",
          boxShadow: "3px 3px 0px #000",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: item.color, marginBottom: 6 }}>
            {item.icon}
            <span style={{ fontSize: 9, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em", color: "#555" }}>
              {item.label}
            </span>
          </div>
          <div style={{ fontSize: 20, fontWeight: 950, color: "#000", lineHeight: 1 }}>
            {item.value}
          </div>
          {i === 2 && (
            <div style={{ fontSize: 9, color: "#999", marginTop: 2 }}>
              {kpis.done}/{kpis.total} sessões
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Componente Principal ──────────────────────────────────────────────────────

/**
 * RunningCoachManager — Central de Gestão de Corrida (Coach/Admin).
 *
 * @architecture
 * - Os dados são carregados via Server Action `getStudentRunningData` ao montar.
 * - Exclusões usam "optimistic UI": remoção local imediata antes da confirmação do servidor.
 * - O arquivamento do plano recarrega o estado para refletir o novo status.
 * - Todas as actions de escrita verificam role (admin/coach) via RLS + verificação manual.
 */
// ── Dias da semana (SSoT) ─────────────────────────────────────────────────────
const DAYS_OF_WEEK = [
  { idx: 1, short: "SEG", full: "Segunda" },
  { idx: 2, short: "TER", full: "Terça" },
  { idx: 3, short: "QUA", full: "Quarta" },
  { idx: 4, short: "QUI", full: "Quinta" },
  { idx: 5, short: "SEX", full: "Sexta" },
  { idx: 6, short: "SÁB", full: "Sábado" },
  { idx: 0, short: "DOM", full: "Domingo" },
];

// ── Gerador de Semana Padrão ──────────────────────────────────────────────────

interface GeneratorProps {
  planId: string;
  studentId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

/**
 * WeeklyPlanGenerator — Cria múltiplas sessões a partir de um modelo semanal.
 *
 * @flow
 * 1. Coach seleciona os dias da semana
 * 2. Configura descrição/distância/pace para cada dia
 * 3. Define data de início + nº de semanas
 * 4. Gera tudo em 1 clique via bulkCreateRunningWorkouts
 */
function WeeklyPlanGenerator({ planId, studentId, onSuccess, onCancel }: GeneratorProps) {
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 3, 5]); // Seg, Qua, Sex
  const [dayConfigs, setDayConfigs] = useState<Record<number, { description: string; distance: string; pace: string }>>({});
  const [startDate, setStartDate] = useState(() => {
    // Próxima segunda-feira em UTC
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

  function toggleDay(idx: number) {
    setSelectedDays(prev =>
      prev.includes(idx) ? prev.filter(d => d !== idx) : [...prev, idx]
    );
  }

  function updateConfig(dayIdx: number, field: "description" | "distance" | "pace", value: string) {
    setDayConfigs(prev => ({
      ...prev,
      [dayIdx]: { ...prev[dayIdx], description: prev[dayIdx]?.description || "", distance: prev[dayIdx]?.distance || "", pace: prev[dayIdx]?.pace || "", [field]: value },
    }));
  }

  async function handleGenerate() {
    // Validação
    for (const dayIdx of selectedDays) {
      if (!dayConfigs[dayIdx]?.description?.trim()) {
        setGenError(`Adicione uma descrição para ${DAYS_OF_WEEK.find(d => d.idx === dayIdx)?.full}.`);
        return;
      }
    }

    const sessions: WeekDaySession[] = selectedDays.map(dayIdx => ({
      dayOfWeek: dayIdx,
      description: dayConfigs[dayIdx]?.description || "",
      targetDistanceKm: dayConfigs[dayIdx]?.distance ? parseFloat(dayConfigs[dayIdx].distance) : null,
      targetPace: dayConfigs[dayIdx]?.pace || null,
    }));

    setIsGenerating(true);
    setGenError(null);
    try {
      const result = await bulkCreateRunningWorkouts(planId, studentId, startDate, weeks, sessions);
      setSuccessCount(result.count);
      // Aguarda 1.2s para o coach ver o feedback antes de fechar
      setTimeout(() => onSuccess(), 1200);
    } catch (err: any) {
      setGenError(err.message || "Erro ao gerar sessões.");
    } finally {
      setIsGenerating(false);
    }
  }

  const totalSessions = selectedDays.length * weeks;

  const inputSt: React.CSSProperties = {
    width: "100%", padding: "10px 12px", border: "2px solid #000",
    fontWeight: 700, fontSize: 13, boxSizing: "border-box" as const,
  };

  return (
    <div style={{ border: "4px solid #000", background: "#FFF", marginBottom: 20, boxShadow: "6px 6px 0px #000", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ background: "#000", color: "#FFF", padding: "14px 20px", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <LayoutGrid size={18} />
        <span style={{ fontSize: 14, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Gerador de Semana Padrão
        </span>
        <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 700, background: "rgba(255,255,255,0.15)", padding: "3px 10px" }}>
          {totalSessions} sessão{totalSessions !== 1 ? "ões" : ""} serão criadas
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
        {/* Seletor de dias */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", fontSize: 11, fontWeight: 900, textTransform: "uppercase", marginBottom: 10, letterSpacing: "0.06em" }}>
            1. Selecione os dias da semana
          </label>
          <div style={{ display: "flex", gap: 6 }}>
            {DAYS_OF_WEEK.map(d => {
              const active = selectedDays.includes(d.idx);
              return (
                <button
                  key={d.idx}
                  type="button"
                  onClick={() => toggleDay(d.idx)}
                  style={{
                    flex: 1, padding: "10px 4px", fontWeight: 900, fontSize: 11,
                    border: active ? "3px solid #000" : "2px solid #DDD",
                    background: active ? "#000" : "#F9F9F9",
                    color: active ? "#FFF" : "#AAA",
                    cursor: "pointer", transition: "all 0.1s",
                  }}
                >
                  {d.short}
                </button>
              );
            })}
          </div>
        </div>

        {/* Config por dia */}
        {selectedDays.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 900, textTransform: "uppercase", marginBottom: 10, letterSpacing: "0.06em" }}>
              2. Configure cada dia
            </label>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[...selectedDays]
                .sort((a, b) => {
                  // Dom vai por último
                  const ai = a === 0 ? 7 : a;
                  const bi = b === 0 ? 7 : b;
                  return ai - bi;
                })
                .map(dayIdx => {
                  const day = DAYS_OF_WEEK.find(d => d.idx === dayIdx)!;
                  return (
                    <div key={dayIdx} style={{ border: "2px solid #E5E5E5", padding: "12px 14px", background: "#FAFAFA" }}>
                      <div style={{ fontSize: 11, fontWeight: 900, textTransform: "uppercase", marginBottom: 10, color: "#555", letterSpacing: "0.06em" }}>
                        📅 {day.full}
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 90px 100px", gap: 8 }}>
                        <input
                          placeholder={`Descrição* — ex: 5km Leve`}
                          value={dayConfigs[dayIdx]?.description || ""}
                          onChange={e => updateConfig(dayIdx, "description", e.target.value)}
                          style={inputSt}
                        />
                        <input
                          type="number" step="0.01" min="0" max="999"
                          placeholder="km"
                          value={dayConfigs[dayIdx]?.distance || ""}
                          onChange={e => {
                            if (e.target.value.length > 6) return;
                            updateConfig(dayIdx, "distance", e.target.value);
                          }}
                          style={inputSt}
                        />
                        <input
                          placeholder="Ex: 5:45"
                          value={dayConfigs[dayIdx]?.pace || ""}
                          onChange={e => updateConfig(dayIdx, "pace", e.target.value)}
                          style={inputSt}
                          title="Digite apenas números para formar o Pace"
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Data + Semanas */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", fontSize: 11, fontWeight: 900, textTransform: "uppercase", marginBottom: 10, letterSpacing: "0.06em" }}>
            3. Período do plano
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 10, fontWeight: 800, color: "#666", marginBottom: 4 }}>DATA DE INÍCIO</label>
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
                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 18 }}>
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

        {/* Resumo + Ações — sticky no fundo do painel */}
        <div style={{
          position: "sticky", bottom: 0,
          background: "#FFF",
          borderTop: "2px solid #E5E5E5",
          padding: "14px 20px",
          marginTop: 4,
        }}>
          <div style={{ background: "#F3F4F6", border: "2px solid #E5E5E5", padding: "10px 14px", marginBottom: 12, fontSize: 12, fontWeight: 700, color: "#444" }}>
            ✅ Serão criadas <strong>{totalSessions} sessões</strong> — {selectedDays.length}x/semana × {weeks} semanas · Até {(() => { const d = new Date(startDate + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + weeks * 7); return d.toLocaleDateString("pt-BR"); })()}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating || selectedDays.length === 0 || successCount !== null}
              className="admin-btn admin-btn-primary"
              style={{ flex: 1, height: 48, fontSize: 13, fontWeight: 950 }}
            >
              {isGenerating ? `GERANDO ${totalSessions} SESSÕES...` : `⚡ GERAR ${totalSessions} SESSÕES`}
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

export default function RunningCoachManager({ studentId }: Props) {
  const [data, setData] = useState<{ plan: any; workouts: any[] } | null>(null);
  const [history, setHistory] = useState<{ workouts: any[]; stats: any } | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAssigning, setIsAssigning] = useState(false);
  const [showWorkoutForm, setShowWorkoutForm] = useState(false);
  const [showBulkForm, setShowBulkForm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper para formatar o pace enquanto digita (robusto)
  const [targetPaceValue, setTargetPaceValue] = useState("");
  const handlePaceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, ""); // Apenas números
    
    // Limita a 4 dígitos (ex: 9959 -> 99:59)
    if (val.length > 4) val = val.slice(0, 4);

    if (val.length >= 3) {
      let mins = val.slice(0, -2);
      let secs = parseInt(val.slice(-2));
      
      // Ajuste se segundos > 59
      if (secs > 59) {
        secs = 59;
        val = mins + "59";
      }
      
      val = `${mins}:${secs.toString().padStart(2, "0")}/km`;
    }
    setTargetPaceValue(val);
  };

  /**
   * loadData: carrega dados do plano e histórico em paralelo.
   * NOTA: separado do useEffect para permitir re-chamadas manuais (após mutações).
   * O flag `ignore` previne setState em componente desmontado.
   */
  const loadData = useCallback(async (signal?: { ignore: boolean }) => {
    setLoading(true);
    setError(null);
    try {
      const [res, hist] = await Promise.all([
        getStudentRunningData(studentId),
        getStudentRunningHistory(studentId)
      ]);
      // Aborta setState se o componente foi desmontado enquanto aguardávamos
      if (signal?.ignore) return;
      setData(res);
      setHistory(hist);
    } catch (err) {
      if (signal?.ignore) return;
      setError("Erro ao carregar dados de corrida.");
      console.error(err);
    } finally {
      if (!signal?.ignore) setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    // Flag de cleanup: evita o warning "Can't perform a React state update
    // on a component that hasn't mounted yet" quando o componente desmonta
    // antes da Promise resolver (ex: troca de aluno no painel admin).
    const guard = { ignore: false };
    loadData(guard);
    return () => { guard.ignore = true; };
  }, [loadData]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  async function handleAssign(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    try {
      await assignRunningPlan(studentId, formData.get("title") as string, formData.get("level") as string);
      setIsAssigning(false);
      loadData();
    } catch (err) {
      setError("Erro ao criar plano.");
    }
  }

  async function handleAddWorkout(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.append("studentId", studentId);
    formData.append("planId", data?.plan.id);
    try {
      await createRunningWorkout(formData);
      (e.target as HTMLFormElement).reset();
      setTargetPaceValue(""); // Reseta a máscara
      setShowWorkoutForm(false);
      loadData();
    } catch (err) {
      setError("Erro ao adicionar sessão.");
    }
  }

  /**
   * handleDelete: Remove uma sessão pendente com feedback optimista.
   * A sessão é removida da UI imediatamente antes da confirmação do servidor.
   */
  async function handleDelete(workoutId: string) {
    // Optimistic update: remove from local state immediately
    setData((prev) =>
      prev ? { ...prev, workouts: prev.workouts.filter((w) => w.id !== workoutId) } : prev
    );
    setDeletingId(workoutId);
    try {
      await deleteRunningWorkout(workoutId);
    } catch (err: any) {
      setError(err.message || "Erro ao remover sessão.");
      loadData(); // revert by reloading
    } finally {
      setDeletingId(null);
    }
  }

  async function handleArchive() {
    if (!data?.plan) return;
    setIsArchiving(true);
    try {
      await archiveRunningPlan(data.plan.id);
      loadData();
    } catch (err) {
      setError("Erro ao encerrar plano.");
    } finally {
      setIsArchiving(false);
    }
  }

  // ── Renders ───────────────────────────────────────────────────────────────

  if (loading) return <RunningSkeletonLoader />;

  if (error) (
    <div style={{ padding: 20, background: "#FEF2F2", border: "2px solid #FECACA", fontSize: 13, fontWeight: 700, color: "#DC2626" }}>
      {error}
    </div>
  );

  // Empty state — sem plano ativo
  if (!data?.plan && !isAssigning) {
    return (
      <div style={{ padding: "60px 24px", textAlign: "center", border: "4px dashed #DDD" }}>
        <Zap size={48} style={{ color: "#CCC", marginBottom: 20 }} />
        <p style={{ fontSize: 16, fontWeight: 900, color: "#999", margin: "0 0 8px 0" }}>
          NENHUM PLANO DE CORRIDA ATIVO
        </p>
        <p style={{ fontSize: 12, color: "#BBB", marginBottom: 24 }}>
          Crie um plano para começar a prescrever sessões de corrida para este aluno.
        </p>
        <button
          onClick={() => setIsAssigning(true)}
          className="admin-btn admin-btn-primary"
          style={{ padding: "12px 32px" }}
        >
          <Plus size={16} /> CRIAR PLANO DE CORRIDA
        </button>
      </div>
    );
  }

  // Formulário de novo plano
  if (isAssigning) {
    return (
      <div style={{ border: "4px solid #000", padding: 32 }}>
        <h3 style={{ fontSize: 16, fontWeight: 900, marginBottom: 24, textTransform: "uppercase" }}>
          Novo Plano de Corrida
        </h3>
        <form onSubmit={handleAssign} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 900, textTransform: "uppercase", marginBottom: 8 }}>
              Título do Plano *
            </label>
            <input
              name="title"
              placeholder="Ex: Preparação 5km — Iniciante"
              required
              style={{ width: "100%", padding: 12, border: "3px solid #000", fontWeight: 700, boxSizing: "border-box" }}
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 900, textTransform: "uppercase", marginBottom: 8 }}>
              Nível Alvo
            </label>
            <select name="level" required style={{ width: "100%", padding: 12, border: "3px solid #000", fontWeight: 800 }}>
              {Object.entries(RUNNING_LEVELS).map(([key, info]) => (
                <option key={key} value={key}>{info.label}</option>
              ))}
            </select>
          </div>
          {error && <p style={{ color: "#DC2626", fontSize: 12, fontWeight: 700 }}>{error}</p>}
          <div style={{ display: "flex", gap: 12 }}>
            <button type="submit" className="admin-btn admin-btn-primary" style={{ flex: 1, height: 48 }}>
              CRIAR PLANO
            </button>
            <button type="button" onClick={() => setIsAssigning(false)} className="admin-btn admin-btn-ghost" style={{ flex: 1, height: 48 }}>
              CANCELAR
            </button>
          </div>
        </form>
      </div>
    );
  }

  const isArchived = data?.plan?.status === "archived";

  return (
    <div style={{ width: "100%" }}>

      {/* ── PAINEL DE KPIs ── */}
      {data && data.workouts.length > 0 && (
        <KpiPanel workouts={data.workouts} />
      )}

      {/* ── PERFORMANCE VISUAL ── */}
      {history && history.workouts.length > 0 && (
        <div style={{ marginBottom: 32 }}>
           <p style={{ fontSize: 9, fontWeight: 900, color: "#888", letterSpacing: "0.12em", textTransform: "uppercase", margin: "0 0 12px 0" }}>
              Tendência de Performance (Últimos 30/60 dias)
           </p>
           <RunningAnalytics 
             workouts={history.workouts} 
             stats={history.stats} 
           />
        </div>
      )}

      {/* ── HEADER DO PLANO ── */}
      <div style={{
        padding: "20px 24px",
        border: "4px solid #000",
        background: isArchived ? "#F3F4F6" : "#000",
        color: isArchived ? "#666" : "#FFF",
        marginBottom: 24,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 16,
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{
              fontSize: 9,
              fontWeight: 900,
              background: isArchived ? "#DDD" : (RUNNING_LEVELS[data?.plan?.level_tag as RunningLevelKey]?.color || "#FFF"),
              color: isArchived || !data?.plan?.level_tag ? "#000" : "#FFF",
              padding: "2px 8px",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              border: isArchived ? "1px solid #CCC" : "none"
            }}>
              {data?.plan?.level_tag}
            </span>
            {isArchived && (
              <span style={{ fontSize: 9, fontWeight: 900, background: "#888", color: "#FFF", padding: "2px 8px" }}>
                ARQUIVADO
              </span>
            )}
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 950, margin: 0, textTransform: "uppercase" }}>{data?.plan?.title}</h3>
          <p style={{ fontSize: 10, margin: "4px 0 0 0", opacity: 0.7, fontWeight: 700 }}>
            Iniciado em {new Date(data?.plan?.created_at).toLocaleDateString("pt-BR")}
          </p>
        </div>

        {!isArchived && (
          <button
            onClick={handleArchive}
            disabled={isArchiving}
            className="admin-btn admin-btn-ghost"
            style={{
              border: "2px solid rgba(255,255,255,0.3)",
              color: "#FFF",
              fontSize: 11,
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
            title="Encerrar e arquivar este ciclo de treino"
          >
            <Archive size={14} />
            {isArchiving ? "ENCERRANDO..." : "ENCERRAR PLANO"}
          </button>
        )}

        {isArchived && (
          <button
            onClick={() => setIsAssigning(true)}
            className="admin-btn admin-btn-primary"
            style={{ fontSize: 11, flexShrink: 0 }}
          >
            <Plus size={14} /> NOVO PLANO
          </button>
        )}
      </div>

      {/* ── TIMELINE DE SESSÕES ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Calendar size={18} />
          <h4 style={{ fontSize: 14, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>
            Sessões Prescritas
          </h4>
        </div>
        {!isArchived && !showWorkoutForm && !showBulkForm && (
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => setShowWorkoutForm(true)}
              className="admin-btn admin-btn-ghost"
              style={{ padding: "8px 14px", fontSize: 11, border: "2px solid #000" }}
              title="Adicionar uma sessão individual"
            >
              <Plus size={14} /> AVULSA
            </button>
            <button
              onClick={() => setShowBulkForm(true)}
              className="admin-btn admin-btn-primary"
              style={{ padding: "8px 14px", fontSize: 11 }}
              title="Gerar semanas completas de treino de uma vez"
            >
              <LayoutGrid size={14} /> SEMANA PADRÃO
            </button>
          </div>
        )}
      </div>

      {/* Gerador de Semana Padrão */}
      {showBulkForm && !isArchived && data?.plan && (
        <WeeklyPlanGenerator
          planId={data.plan.id}
          studentId={studentId}
          onSuccess={() => { setShowBulkForm(false); loadData(); }}
          onCancel={() => setShowBulkForm(false)}
        />
      )}

      {/* Formulário de criar sessão avulsa */}
      {showWorkoutForm && !isArchived && (
        <div style={{
          padding: 24,
          border: "4px solid #000",
          background: "#FFF",
          marginBottom: 20,
          boxShadow: "6px 6px 0px #000",
          position: "relative"
        }}>
          <form onSubmit={handleAddWorkout}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 140px", gap: 16, marginBottom: 16 }}>
              <div>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 900, marginBottom: 6, textTransform: "uppercase" }}>
                  <Activity size={14} /> DESCRIÇÃO DO TREINO *
                </label>
                <input
                  name="description"
                  placeholder="Ex: 5km Rodagem Leve"
                  required
                  autoFocus
                  style={{ width: "100%", padding: "14px 16px", border: "3px solid #000", fontWeight: 800, boxSizing: "border-box", fontSize: 14 }}
                />
              </div>
              <div>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 900, marginBottom: 6, textTransform: "uppercase" }}>
                  <Calendar size={14} /> DATA *
                </label>
                <input
                  name="date"
                  type="date"
                  required
                  defaultValue={new Date().toISOString().split('T')[0]}
                  style={{ width: "100%", padding: "14px 16px", border: "3px solid #000", fontWeight: 800, boxSizing: "border-box" }}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
              <div>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 900, marginBottom: 6, textTransform: "uppercase" }}>
                  <Target size={14} /> DISTÂNCIA ALVO (km)
                </label>
                <input
                  name="target_distance_km"
                  type="number"
                  step="0.01"
                  min="0"
                  max="999"
                  placeholder="Ex: 5.0"
                  onInput={(e) => {
                    const val = e.currentTarget.value;
                    if (val.length > 6) e.currentTarget.value = val.slice(0, 6);
                  }}
                  style={{ width: "100%", padding: "14px 16px", border: "3px solid #000", fontWeight: 800, boxSizing: "border-box" }}
                />
              </div>
              <div>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 900, marginBottom: 6, textTransform: "uppercase" }}>
                  <Wind size={14} /> PACE ALVO
                </label>
                <input
                  name="target_pace"
                  type="text"
                  placeholder="Ex: 6:00"
                  value={targetPaceValue}
                  onChange={handlePaceChange}
                  maxLength={10}
                  style={{ width: "100%", padding: "14px 16px", border: "3px solid #000", fontWeight: 800, boxSizing: "border-box" }}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <button type="submit" className="admin-btn admin-btn-primary" style={{ flex: 1, height: 50, fontSize: 12, fontWeight: 950 }}>
                SALVAR SESSÃO
              </button>
              <button type="button" onClick={() => setShowWorkoutForm(false)} className="admin-btn admin-btn-ghost" style={{ width: 120, height: 50, fontSize: 12, fontWeight: 950 }}>
                CANCELAR
              </button>
            </div>
          </form>
        </div>
      )}

      {error && (
        <div style={{ marginBottom: 12, padding: "10px 14px", background: "#FEF2F2", border: "2px solid #FECACA", fontSize: 12, fontWeight: 700, color: "#DC2626" }}>
          {error}
        </div>
      )}

      {/* Lista de sessões */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {!data?.workouts || data.workouts.length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center", border: "2px dashed #DDD" }}>
            <p style={{ fontSize: 12, color: "#999", fontWeight: 700, margin: 0 }}>
              NENHUMA SESSÃO PRESCRITA PARA ESTE PLANO
            </p>
          </div>
        ) : (
          data.workouts.map((w) => {
            const isCompleted = !!w.completed_at;
            return (
              <div
                key={w.id}
                style={{
                  padding: "16px 20px",
                  border: `3px solid ${isCompleted ? "#BBF7D0" : "#000"}`,
                  background: isCompleted ? "#F0FDF4" : "#FFF",
                  borderLeft: isCompleted ? "6px solid #22C55E" : "6px solid #3498DB",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 12,
                  opacity: deletingId === w.id ? 0.4 : 1,
                  transition: "opacity 0.2s ease",
                }}
              >
                <div style={{ flex: 1 }}>
                  {/* Data + Status */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    {isCompleted
                      ? <CheckCircle2 size={14} color="#22C55E" />
                      : <Clock size={14} color="#3498DB" />
                    }
                    <span style={{ fontSize: 10, fontWeight: 900, color: isCompleted ? "#22C55E" : "#3498DB", textTransform: "uppercase" }}>
                      {isCompleted ? "Realizado" : "Pendente"} —{" "}
                      {new Date(w.scheduled_date).toLocaleDateString("pt-BR", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" })}
                    </span>
                  </div>

                  {/* Descrição */}
                  <div style={{ fontSize: 14, fontWeight: 900, color: "#000", marginBottom: (w.target_distance_km || w.target_pace_description) ? 4 : (isCompleted ? 10 : 0) }}>
                    {w.target_description}
                  </div>

                  {/* Metas Prescritas */}
                  {!isCompleted && (w.target_distance_km || w.target_pace_description) && (
                    <div style={{ display: "flex", gap: 12, marginBottom: 8 }}>
                      {w.target_distance_km && (
                        <div style={{ fontSize: 10, fontWeight: 900, color: "#E67E22", background: "#FFF3E0", padding: "2px 6px", border: "1px solid #FFE0B2" }}>
                          META: {w.target_distance_km} KM
                        </div>
                      )}
                      {w.target_pace_description && (
                        <div style={{ fontSize: 10, fontWeight: 900, color: "#8E44AD", background: "#F3E5F5", padding: "2px 6px", border: "1px solid #E1BEE7" }}>
                          PACE: {w.target_pace_description}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Dados de execução (só para concluídos) */}
                  {isCompleted && (
                    <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                      {w.actual_distance_km && (
                        <div style={{ fontSize: 12, fontWeight: 900, color: "#15803D" }}>
                          📍 {parseFloat(w.actual_distance_km).toFixed(1)} km
                        </div>
                      )}
                      {w.actual_pace_seconds_per_km > 0 && (
                        <div style={{ fontSize: 12, fontWeight: 900, color: "#1D4ED8" }}>
                          ⏱ {formatPace(w.actual_pace_seconds_per_km)} /km
                        </div>
                      )}
                      {w.actual_duration_seconds > 0 && (
                        <div style={{ fontSize: 12, fontWeight: 700, color: "#555" }}>
                          🕐 {formatDuration(w.actual_duration_seconds)}
                        </div>
                      )}
                      {w.rpe && (
                        <div style={{ fontSize: 12, fontWeight: 900, color: w.rpe >= 8 ? "#DC2626" : w.rpe >= 6 ? "#D97706" : "#059669" }}>
                          💢 RPE {w.rpe}/10
                        </div>
                      )}
                    </div>
                  )}

                  {/* Notas do aluno */}
                  {isCompleted && w.student_notes && (
                    <div style={{
                      marginTop: 10,
                      padding: "8px 12px",
                      background: "#FFF",
                      border: "2px solid #D1FAE5",
                      fontSize: 12,
                      color: "#374151",
                      fontStyle: "italic",
                      lineHeight: 1.4,
                      wordBreak: "break-word",
                    }}>
                      <span style={{ fontStyle: "normal", fontWeight: 900, color: "#059669", fontSize: 10 }}>NOTA DO ALUNO: </span>
                      {w.student_notes}
                    </div>
                  )}
                </div>

                {/* Ação: deletar sessão pendente */}
                {!isCompleted && !isArchived && (
                  <button
                    onClick={() => handleDelete(w.id)}
                    disabled={deletingId === w.id}
                    className="admin-btn admin-btn-ghost"
                    style={{ padding: "6px 8px", color: "#EF4444", flexShrink: 0, marginTop: 2 }}
                    title="Remover sessão pendente"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

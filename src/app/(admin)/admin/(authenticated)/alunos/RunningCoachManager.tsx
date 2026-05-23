"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Zap, Plus, Calendar, Trash2, Archive, Edit2,
  CheckCircle2, Clock, TrendingUp, Target, Activity, Wind,
  LayoutGrid, ChevronDown, ChevronUp
} from "lucide-react";
import {
  getStudentRunningData,
  createRunningWorkout,
  deleteRunningWorkout,
  archiveRunningPlan,
  getStudentRunningHistory,
  updateRunningWorkout,
  getRunningTemplates,
  assignTemplateToStudent,
} from "@/lib/actions/running_actions";
import { RUNNING_LEVELS, formatPace, RUNNING_CATEGORIES, RUNNING_ZONES, type RunningLevelKey } from "@/lib/constants/running";
import RunningAnalytics from "@/components/RunningAnalytics";
import { formatDuration, calcKPIs, maskPace, maskTime } from "./running-utils";
import WeeklyPlanGenerator from "./WeeklyPlanGenerator";

interface Props {
  studentId: string;
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
export default function RunningCoachManager({ studentId }: Props) {
  const [data, setData] = useState<{ plan: any; workouts: any[]; profile?: any } | null>(null);
  const [history, setHistory] = useState<{ workouts: any[]; stats: any } | null>(null);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAssigning, setIsAssigning] = useState(false);
  const [showWorkoutForm, setShowWorkoutForm] = useState(false);
  const [showBulkForm, setShowBulkForm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Edit Workout State
  const [editingWorkoutId, setEditingWorkoutId] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editForm, setEditForm] = useState({
    description: "",
    date: "",
    week_number: "1",
    target_distance_km: "",
    target_pace: "",
    target_rest_time: ""
  });

  // Helper para formatar o pace enquanto digita (robusto)
  const [targetPaceValue, setTargetPaceValue] = useState("");
  const handlePaceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTargetPaceValue(maskPace(e.target.value));
  };

  const [targetRestValue, setTargetRestValue] = useState("");
  const handleRestChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTargetRestValue(maskTime(e.target.value));
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
      const [res, hist, tmpls] = await Promise.all([
        getStudentRunningData(studentId),
        getStudentRunningHistory(studentId),
        getRunningTemplates()
      ]);
      // Aborta setState se o componente foi desmontado enquanto aguardávamos
      if (signal?.ignore) return;
      setData(res);
      setHistory(hist);
      setTemplates(tmpls);
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
    const templateId = formData.get("templateId") as string;
    
    if (!templateId) {
      setError("Selecione uma planilha padrão.");
      return;
    }

    try {
      await assignTemplateToStudent(templateId, studentId);
      setIsAssigning(false);
      loadData();
    } catch (err) {
      setError("Erro ao atribuir planilha.");
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
      setTargetRestValue("");
      setShowWorkoutForm(false);
      loadData();
    } catch (err) {
      setError("Erro ao adicionar sessão.");
    }
  }

  async function handleUpdateWorkout(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editingWorkoutId) return;
    
    setIsUpdating(true);
    const formData = new FormData(e.currentTarget);
    formData.append("workoutId", editingWorkoutId);
    
    try {
      await updateRunningWorkout(formData);
      setEditingWorkoutId(null);
      loadData();
    } catch (err: any) {
      setError(err.message || "Erro ao atualizar sessão.");
    } finally {
      setIsUpdating(false);
    }
  }

  function startEditing(w: any) {
    setEditingWorkoutId(w.id);
    setEditForm({
      description: w.target_description || "",
      date: w.scheduled_date ? w.scheduled_date.split("T")[0] : "",
      week_number: String(w.week_number || 1),
      target_distance_km: w.target_distance_km ? String(w.target_distance_km) : "",
      target_pace: w.target_pace_description ? w.target_pace_description.replace("/km", "") : "",
      target_rest_time: w.target_rest_time_description || ""
    });
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
          Atribuir Planilha Padrão
        </h3>
        {templates.length === 0 ? (
           <div style={{ padding: 20, background: "#FFF3E0", border: "2px solid #FF9800", color: "#E65100", fontSize: 13, fontWeight: 700 }}>
              Você ainda não criou nenhuma Planilha Padrão. Vá para a aba <strong>Planilhas Padrão</strong> para criar bases (Iniciante, Intermediário) antes de atribuir a um aluno.
           </div>
        ) : (
          <form onSubmit={handleAssign} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 900, textTransform: "uppercase", marginBottom: 8 }}>
                Selecione a Planilha Padrão *
              </label>
              <select
                name="templateId"
                required
                style={{ width: "100%", padding: 12, border: "3px solid #000", fontWeight: 700, boxSizing: "border-box", appearance: "none", backgroundColor: "#FFF" }}
              >
                <option value="">-- ESCOLHA UMA PLANILHA --</option>
                {templates.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.title} ({t.frequency_per_week}x/semana - {t.duration_weeks} semanas)
                  </option>
                ))}
              </select>
            </div>
            {error && <p style={{ color: "#DC2626", fontSize: 12, fontWeight: 700 }}>{error}</p>}
            <div style={{ display: "flex", gap: 12 }}>
              <button type="submit" className="admin-btn admin-btn-primary" style={{ flex: 1, height: 48 }}>
                ATRIBUIR AO ALUNO
              </button>
              <button type="button" onClick={() => setIsAssigning(false)} className="admin-btn admin-btn-ghost" style={{ flex: 1, height: 48 }}>
                CANCELAR
              </button>
            </div>
          </form>
        )}
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
              <LayoutGrid size={14} /> GERADOR MANUAL
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
            <div style={{ display: "grid", gridTemplateColumns: "1fr 140px 100px", gap: 16, marginBottom: 16 }}>
              <div>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 900, marginBottom: 6, textTransform: "uppercase" }}>
                  <Activity size={14} /> DESCRIÇÃO DO TREINO *
                </label>
                <input
                  name="description"
                  placeholder="Ex: 5km Rodagem Leve"
                  required
                  autoFocus
                  maxLength={50}
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
              <div>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 900, marginBottom: 6, textTransform: "uppercase" }}>
                  SEM *
                </label>
                <input
                  name="week_number"
                  type="number"
                  min="1"
                  required
                  defaultValue="1"
                  style={{ width: "100%", padding: "14px 16px", border: "3px solid #000", fontWeight: 800, boxSizing: "border-box" }}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 900, marginBottom: 6, textTransform: "uppercase" }}>REPETIÇÕES</label>
                <input name="reps" type="number" min="1" defaultValue="1" style={{ width: "100%", padding: "12px 16px", border: "3px solid #000", fontWeight: 800 }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 900, marginBottom: 6, textTransform: "uppercase" }}>CATEGORIA</label>
                <select name="category" style={{ width: "100%", padding: "12px 16px", border: "3px solid #000", fontWeight: 800 }}>
                  {RUNNING_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 900, marginBottom: 6, textTransform: "uppercase" }}>ZONA</label>
                <select name="target_zone" style={{ width: "100%", padding: "12px 16px", border: "3px solid #000", fontWeight: 800 }}>
                  {RUNNING_ZONES.map(z => <option key={z.id} value={z.id}>{z.label}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
              <div>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 900, marginBottom: 6, textTransform: "uppercase" }}>
                  <Target size={14} /> DISTÂNCIA
                </label>
                <div style={{ display: "flex", gap: 6 }}>
                  <input
                    name="target_distance_km"
                    type="number"
                    step="0.01"
                    max="999.9"
                    onKeyDown={(e) => ["e", "E", "+", "-"].includes(e.key) && e.preventDefault()}
                    placeholder="Valor"
                    style={{ flex: 1, padding: "12px 16px", border: "3px solid #000", fontWeight: 800 }}
                  />
                  <select name="target_unit" style={{ width: 70, padding: "12px 8px", border: "3px solid #000", fontWeight: 800 }}>
                    <option value="km">KM</option>
                    <option value="m">M</option>
                    <option value="min">MIN</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 900, marginBottom: 6, textTransform: "uppercase" }}>
                  <Wind size={14} /> PACE ALVO
                </label>
                <input
                  name="target_pace"
                  type="text"
                  placeholder="6:00"
                  value={targetPaceValue}
                  onChange={handlePaceChange}
                  maxLength={10}
                  style={{ width: "100%", padding: "14px 16px", border: "3px solid #000", fontWeight: 800, boxSizing: "border-box" }}
                />
              </div>
              <div>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 900, marginBottom: 6, textTransform: "uppercase" }}>
                  <Clock size={14} /> DESCANSO
                </label>
                <input
                  name="target_rest_time"
                  type="text"
                  placeholder="1:00"
                  value={targetRestValue}
                  onChange={handleRestChange}
                  maxLength={5}
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
      {/* Lista de sessões agrupadas por semana */}
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {!data?.workouts || data.workouts.length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center", border: "2px dashed #DDD" }}>
            <p style={{ fontSize: 12, color: "#999", fontWeight: 700, margin: 0 }}>
              NENHUMA SESSÃO PRESCRITA PARA ESTE PLANO
            </p>
          </div>
        ) : (
          // ────────────────────────────────────────────────────────────────────────
          // MOTOR DE AGRUPAMENTO SEMANAL (Iron Monolith)
          // ────────────────────────────────────────────────────────────────────────
          // Agrupa treinos pelo 'week_number'. Se nulo, assume 'Semana 1' (legacy fallback).
          // O agrupamento no Admin espelha o comportamento do Dashboard do Aluno para
          // garantir paridade visual entre o que o Coach prescreve e o que o Aluno vê.
          // ────────────────────────────────────────────────────────────────────────
          Object.entries(
            data.workouts.reduce((acc, w) => {
              const week = w.week_number || 1;
              if (!acc[week]) acc[week] = [];
              acc[week].push(w);
              return acc;
            }, {} as Record<number, any[]>)
          )
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([weekNum, weekWorkouts]) => {
              const workouts = weekWorkouts as any[];
              const completedCount = workouts.filter((w: any) => w.completed_at).length;
              const totalCount = workouts.length;

              return (
                <div key={weekNum} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {/* Cabeçalho da Semana */}
                  <div style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "space-between",
                    padding: "10px 16px",
                    background: "#000",
                    color: "#FFF",
                    borderRadius: "2px",
                    border: "2px solid #000",
                    boxShadow: "4px 4px 0px rgba(0,0,0,0.1)"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Calendar size={14} className="text-nb-yellow" />
                      <span style={{ fontSize: 12, fontWeight: 950, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        SEMANA {weekNum}
                      </span>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 800, background: "rgba(255,255,255,0.2)", padding: "2px 8px", borderRadius: "10px" }}>
                      {completedCount}/{totalCount} SESSÕES
                    </span>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {(weekWorkouts as any[]).map((w: any) => {
                      const isCompleted = !!w.completed_at;

                      // Inline Edit Form
                      if (editingWorkoutId === w.id) {
                        return (
                          <div
                            key={w.id}
                            style={{
                              padding: 24,
                              border: "4px solid #000",
                              background: "#FFF",
                              marginBottom: 10,
                              boxShadow: "6px 6px 0px #000",
                              position: "relative"
                            }}
                          >
                            <form onSubmit={handleUpdateWorkout}>
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 140px 100px", gap: 16, marginBottom: 16 }}>
                                <div>
                                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 900, marginBottom: 6, textTransform: "uppercase" }}>
                                    <Activity size={14} /> DESCRIÇÃO DO TREINO *
                                  </label>
                                  <input
                                    name="description"
                                    value={editForm.description}
                                    onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                                    required
                                    autoFocus
                                    maxLength={50}
                                    style={{ width: "100%", padding: "14px 16px", border: "3px solid #000", fontWeight: 800, boxSizing: "border-box", fontSize: 14 }}
                                  />
                                </div>
                                <div>
                                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 900, marginBottom: 6, textTransform: "uppercase" }}>
                                    <Calendar size={14} /> DATA
                                  </label>
                                  <input
                                    name="date"
                                    type="date"
                                    value={editForm.date}
                                    onChange={e => setEditForm({ ...editForm, date: e.target.value })}
                                    style={{ width: "100%", padding: "14px 16px", border: "3px solid #000", fontWeight: 800, boxSizing: "border-box" }}
                                  />
                                </div>
                                <div>
                                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 900, marginBottom: 6, textTransform: "uppercase" }}>
                                    SEM *
                                  </label>
                                  <input
                                    name="week_number"
                                    type="number"
                                    min="1"
                                    required
                                    value={editForm.week_number}
                                    onChange={e => setEditForm({ ...editForm, week_number: e.target.value })}
                                    style={{ width: "100%", padding: "14px 16px", border: "3px solid #000", fontWeight: 800, boxSizing: "border-box" }}
                                  />
                                </div>
                              </div>

                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
                                <div>
                                  <label style={{ display: "block", fontSize: 11, fontWeight: 900, marginBottom: 6, textTransform: "uppercase" }}>REPS</label>
                                  <input name="reps" type="number" min="1" defaultValue={w.reps || 1} style={{ width: "100%", padding: "12px 16px", border: "3px solid #000", fontWeight: 800 }} />
                                </div>
                                <div>
                                  <label style={{ display: "block", fontSize: 11, fontWeight: 900, marginBottom: 6, textTransform: "uppercase" }}>CATEGORIA</label>
                                  <select name="category" defaultValue={w.category || "corrida"} style={{ width: "100%", padding: "12px 16px", border: "3px solid #000", fontWeight: 800 }}>
                                    {RUNNING_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                                  </select>
                                </div>
                                <div>
                                  <label style={{ display: "block", fontSize: 11, fontWeight: 900, marginBottom: 6, textTransform: "uppercase" }}>ZONA</label>
                                  <select name="target_zone" defaultValue={w.target_zone || "Z2"} style={{ width: "100%", padding: "12px 16px", border: "3px solid #000", fontWeight: 800 }}>
                                    {RUNNING_ZONES.map(z => <option key={z.id} value={z.id}>{z.label}</option>)}
                                  </select>
                                </div>
                              </div>

                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
                                <div>
                                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 900, marginBottom: 6, textTransform: "uppercase" }}>
                                    <Target size={14} /> DISTÂNCIA
                                  </label>
                                  <div style={{ display: "flex", gap: 6 }}>
                                    <input
                                      name="target_distance_km"
                                      type="number"
                                      step="0.01"
                                      max="999.9"
                                      onKeyDown={(e) => ["e", "E", "+", "-"].includes(e.key) && e.preventDefault()}
                                      value={editForm.target_distance_km}
                                      onChange={e => {
                                        const val = e.target.value;
                                        if (parseFloat(val) > 999.9) return;
                                        setEditForm({ ...editForm, target_distance_km: val });
                                      }}
                                      style={{ flex: 1, padding: "12px 16px", border: "3px solid #000", fontWeight: 800 }}
                                    />
                                    <select name="target_unit" defaultValue={w.target_unit || "km"} style={{ width: 80, padding: "12px 8px", border: "3px solid #000", fontWeight: 800 }}>
                                      <option value="km">KM</option>
                                      <option value="m">M</option>
                                      <option value="min">MIN</option>
                                    </select>
                                  </div>
                                </div>
                                <div>
                                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 900, marginBottom: 6, textTransform: "uppercase" }}>
                                    <Wind size={14} /> PACE ALVO
                                  </label>
                                  <input
                                    name="target_pace"
                                    type="text"
                                    placeholder="6:00"
                                    value={editForm.target_pace}
                                    onChange={e => setEditForm({ ...editForm, target_pace: maskPace(e.target.value) })}
                                    maxLength={10}
                                    style={{ width: "100%", padding: "14px 16px", border: "3px solid #000", fontWeight: 800, boxSizing: "border-box" }}
                                  />
                                </div>
                                <div>
                                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 900, marginBottom: 6, textTransform: "uppercase" }}>
                                    <Clock size={14} /> DESCANSO
                                  </label>
                                  <input
                                    name="target_rest_time"
                                    type="text"
                                    placeholder="1:00"
                                    value={editForm.target_rest_time}
                                    onChange={e => setEditForm({ ...editForm, target_rest_time: maskTime(e.target.value) })}
                                    maxLength={5}
                                    style={{ width: "100%", padding: "14px 16px", border: "3px solid #000", fontWeight: 800, boxSizing: "border-box" }}
                                  />
                                </div>
                              </div>

                              <div style={{ display: "flex", gap: 12 }}>
                                <button type="submit" disabled={isUpdating} className="admin-btn admin-btn-primary" style={{ flex: 1, height: 50, fontSize: 12, fontWeight: 950 }}>
                                  {isUpdating ? "SALVANDO..." : "SALVAR ALTERAÇÕES"}
                                </button>
                                <button type="button" onClick={() => setEditingWorkoutId(null)} className="admin-btn admin-btn-ghost" style={{ width: 120, height: 50, fontSize: 12, fontWeight: 950 }}>
                                  CANCELAR
                                </button>
                              </div>
                            </form>
                          </div>
                        );
                      }

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
                            {/* Data + Status + Sessão */}
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                              {isCompleted
                                ? <CheckCircle2 size={14} color="#22C55E" />
                                : <Clock size={14} color="#3498DB" />
                              }
                              <span style={{ fontSize: 10, fontWeight: 900, color: isCompleted ? "#22C55E" : "#3498DB", textTransform: "uppercase" }}>
                                {isCompleted ? "Realizado" : "Pendente"} 
                                {w.scheduled_date && ` — ${new Date(w.scheduled_date).toLocaleDateString("pt-BR", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" })}`}
                                {w.session_order && ` — SESSÃO ${w.session_order}`}
                              </span>
                            </div>

                            {/* Descrição */}
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

                            <div style={{ fontSize: 14, fontWeight: 900, color: "#000", marginBottom: (w.target_distance_km || w.target_pace_description) ? 4 : (isCompleted ? 10 : 0) }}>
                              {w.reps > 1 && <span style={{ color: "var(--nb-blue)", marginRight: 4 }}>{w.reps}x</span>}
                              {w.target_description}
                            </div>

                            {/* Metas Prescritas */}
                            {!isCompleted && (w.target_distance_km || w.target_pace_description || w.target_rest_time_description) && (
                              <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                                {w.target_distance_km && (
                                  <div style={{ fontSize: 9, fontWeight: 900, color: "#E67E22", background: "#FFF3E0", padding: "2px 6px", border: "1px solid #FFE0B2", textTransform: "uppercase" }}>
                                    META: {w.target_unit === "m" 
                                      ? `${((Number(w.target_distance_km) || 0) >= 1 ? Number(w.target_distance_km) : Number(w.target_distance_km) * 1000).toFixed(0)}M` 
                                      : w.target_unit === "min" ? `${w.target_distance_km}MIN` : `${w.target_distance_km}KM`}
                                    {w.reps > 1 && ` (TOTAL: ${w.target_unit === "min" ? (Number(w.target_distance_km) * w.reps) + "MIN" : (w.target_unit === "m" ? (((Number(w.target_distance_km) || 0) >= 1 ? Number(w.target_distance_km) : Number(w.target_distance_km) * 1000) * w.reps).toFixed(0) + "M" : (Number(w.target_distance_km) * w.reps).toFixed(1) + "KM")})`}
                                  </div>
                                )}
                                {w.target_pace_description && (
                                  <div style={{ fontSize: 9, fontWeight: 900, color: "#8E44AD", background: "#F3E5F5", padding: "2px 6px", border: "1px solid #E1BEE7", textTransform: "uppercase" }}>
                                    PACE: {w.target_pace_description}
                                  </div>
                                )}
                                {w.target_rest_time_description && (
                                  <div style={{ fontSize: 9, fontWeight: 900, color: "#2980B9", background: "#EBF5FB", padding: "2px 6px", border: "1px solid #AED6F1", textTransform: "uppercase" }}>
                                    DESC: {w.target_rest_time_description}
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

                          {/* Ações (Editar e Deletar) */}
                          {!isCompleted && !isArchived && (
                            <div style={{ display: "flex", gap: 8, flexShrink: 0, marginTop: 2 }}>
                              <button
                                onClick={() => startEditing(w)}
                                className="admin-btn admin-btn-ghost"
                                style={{ padding: "6px 8px", color: "#3498DB" }}
                                title="Editar sessão prescrita"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                onClick={() => handleDelete(w.id)}
                                disabled={deletingId === w.id}
                                className="admin-btn admin-btn-ghost"
                                style={{ padding: "6px 8px", color: "#EF4444" }}
                                title="Remover sessão pendente"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
        )}
      </div>

    </div>
  );
}

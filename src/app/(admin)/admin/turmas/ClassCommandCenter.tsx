"use client";

/**
 * ClassCommandCenter: Centro de Comando Unificado de Aula.
 *
 * @architecture Iron Monolith Pattern
 * Componente de missão crítica que funde a gestão de check-ins, matrículas fixas 
 * e o motor de fechamento de aula em um único workspace de alta fidelidade.
 *
 * SSoT (Single Source of Truth):
 * - class_enrollments → SSoT para alunos matriculados (Reserva fixa).
 * - check_ins         → SSoT para presença operacional (Dados vivos do dia).
 * - class_sessions    → SSoT para marcador de finalização (Lockdown de dados).
 * - class_substitutions → SSoT para substituições de instrutor (Data-specific override).
 *
 * @security
 * - Todas as mutações passam por Server Actions (./actions.ts) com validação de Role.
 * - Proteção contra bypass de RLS no cliente.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import {
  X,
  CheckCircle,
  Loader2,
  ShieldCheck,
  Search,
  UserPlus,
  UserX,
  UserMinus,
  Users,
  AlertOctagon,
  Clock,
  User,
  CalendarCheck,
  Lock,
  Unlock,
  RefreshCw,
  RotateCcw,
  ClipboardCheck,
  UserSearch,
  Zap,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import {
  getSlotCheckins,
  getSlotEnrollments,
  closeClassAction,
  searchStudentsCoachAction,
  manualCheckinAction,
  markAsAbsentAction,
  unmarkAsAbsentAction,
  addSubstitution,
  reopenClassAction,
} from "./actions";
import { getLevelInfo } from "@/lib/constants/levels";
import { DAY_LABELS } from "@/lib/constants/calendar";

// ── Types ──────────────────────────────────────────────────────

interface ClassSlot {
  id: string;
  name: string;
  time_start: string;
  day_of_week?: number;
  capacity: number;
  coach_name?: string | null;
  default_coach_id?: string | null;
}

interface Enrollment {
  id: string;
  student_id: string;
  profiles: {
    id: string;
    full_name: string | null;
    level: string | null;
    avatar_url: string | null;
  };
}

interface Checkin {
  id: string;
  student_id: string;
  status: string;
  profiles: {
    id: string;
    full_name: string | null;
    display_name: string | null;
    avatar_url: string | null;
    level: string | null;
  } | null;
}

interface StudentResult {
  id: string;
  full_name?: string | null;
  display_name?: string | null;
}

type ToastType = "error" | "success" | "warning";
interface ToastState { message: string; type: ToastType }

import ConfirmModal from "@/components/ConfirmModal";

interface ClassCommandCenterProps {
  slot: ClassSlot;
  isClosed?: boolean;
  onClose: () => void;
  onSuccess: (subUpdate?: { id: string; date: string; coachId: string | null; coachName: string | null }) => void;
  coaches: { id: string; full_name: string | null }[];
  substitutions?: Record<string, { id: string; full_name: string }>;
  activeDate: string;
}

// ── Helpers ────────────────────────────────────────────────────

function getDisplayName(p: Checkin["profiles"] | StudentResult | Enrollment["profiles"] | null): string {
  if (!p) return "Aluno";
  return (p as any).display_name || (p as any).full_name || "Aluno";
}

function friendlyError(raw: string): string {
  if (raw?.includes("duplicate key")) return "Aluno já está nesta aula.";
  return raw || "Erro desconhecido.";
}

function formatTime(t: string): string {
  return t?.slice(0, 5) || "—";
}

// ── Component ──────────────────────────────────────────────────

export default function ClassCommandCenter({
  slot,
  isClosed = false,
  onClose,
  onSuccess,
  coaches = [],
  substitutions = {},
  activeDate,
}: ClassCommandCenterProps) {
  // ── Data State ──
  const [loadingEnrollments, setLoadingEnrollments] = useState(true);
  const [loadingCheckins, setLoadingCheckins] = useState(true);
  const [isSwappingCoach, setIsSwappingCoach] = useState(false);
  const [swapping, setSwapping] = useState(false);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [checkins, setCheckins] = useState<Checkin[]>([]);

  // ── Operations ──
  const [submitting, setSubmitting] = useState(false);
  const [reopening, setReopening] = useState(false);
  const [showReopenConfirm, setShowReopenConfirm] = useState(false);
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());

  // ── Search / Add ──
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<StudentResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
 
  // ── Confirmation ──
  const [showConfirmEmpty, setShowConfirmEmpty] = useState(false);

  // ── Toast ──
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const today = activeDate;

  const showToast = useCallback((message: string, type: ToastType = "error") => {
    setToast({ message, type });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 4500);
  }, []);

  // ── Data Fetching ──

  /**
   * CARGA DE MATRÍCULAS: Recupera os alunos com vaga fixa neste horário.
   * 
   * @operation Sincroniza o estado local 'enrollments' com a tabela 'class_enrollments'.
   */
  const loadEnrollments = useCallback(async () => {
    setLoadingEnrollments(true);
    const res = await getSlotEnrollments(slot.id);
    if (res.data) setEnrollments(res.data as unknown as Enrollment[]);
    setLoadingEnrollments(false);
  }, [slot.id]);

  /**
   * CARGA DE CHECK-INS: Recupera a lista de presença operacional para a data ativa.
   * 
   * @operation Sincroniza 'checkins' com a tabela 'check_ins' filtrada por 'activeDate'.
   */
  const loadCheckins = useCallback(async () => {
    setLoadingCheckins(true);
    const res = await getSlotCheckins(slot.id, today);
    if (res.data) setCheckins(res.data as Checkin[]);
    setLoadingCheckins(false);
  }, [slot.id, today]);

  useEffect(() => {
    loadEnrollments();
    loadCheckins();
  }, [loadEnrollments, loadCheckins]);

  /**
   * SUBSTITUIÇÃO DE PROFESSOR (Override).
   * 
   * @operation
   * 1. Resolve Conflito: Se 'targetCoachId' === 'default_coach_id', remove a substituição do DB.
   * 2. Persistência: Upsert na tabela 'class_substitutions' para a data específica.
   * 3. Sincronização: Notifica o componente pai via 'onSuccess' para atualizar a grade visual.
   * 
   * @param {string | null} targetCoachId - UUID do novo instrutor ou default.
   * @param {string | null} coachName - Nome para feedback imediato na UI.
   */
  async function handleCoachSwap(targetCoachId: string | null, coachName: string | null) {
    setSwapping(true);
    try {
      // Se o ID selecionado for igual ao ID padrão, removemos a substituição (null)
      const effectiveCoachId = targetCoachId === slot.default_coach_id ? null : targetCoachId;
      
      const res = await addSubstitution(slot.id, effectiveCoachId, activeDate);
      if (res.error) {
        showToast(res.error, "error");
      } else {
        const isReset = !effectiveCoachId;
        showToast(isReset ? "Professor redefinido para o padrão." : "Professor alterado para esta aula!", "success");
        setIsSwappingCoach(false);
        
        // Se for reset, passamos undefined para remover do mapa local do pai
        onSuccess(effectiveCoachId ? { 
          id: slot.id, 
          date: activeDate, 
          coachId: effectiveCoachId, 
          coachName: coachName || "Professor" 
        } : { 
          id: slot.id, 
          date: activeDate, 
          coachId: null, 
          coachName: null 
        });
      }
    } catch (e) {
      showToast("Falha ao comunicar com o servidor.", "error");
    } finally {
      setSwapping(false);
    }
  };

  const activeSub = substitutions[`${slot.id}-${activeDate}`];
  
  const coachDisplay = (() => {
    if (activeSub && activeSub.id !== slot.default_coach_id) return activeSub.full_name;
    
    // Fallback to default coach relationship
    const dc = coaches.find(c => c.id === slot.default_coach_id);
    if (dc) return dc.full_name;
    
    // Fallback to legacy string field
    return slot.coach_name || null;
  })();

  const isSubstituted = !!activeSub && activeSub.id !== slot.default_coach_id;

  const activeDayLabel = activeDate ? DAY_LABELS[new Date(activeDate + 'T00:00:00').getDay()] : "";

  // ── Search ──
  useEffect(() => {
    if (searchQuery.trim().length < 2) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      const res = await searchStudentsCoachAction(searchQuery.trim());
      if (res.data) {
        const checkedInIds = checkins.map(c => c.student_id);
        setSearchResults(res.data.filter((s: StudentResult) => !checkedInIds.includes(s.id)));
      }
      setSearching(false);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery, checkins]);

  // ── Handlers ──

  /**
   * ADICIONAR ALUNO (Manual): Insere um aluno na aula via busca rápida.
   * 
   * @operation 
   * - Invoca 'manualCheckinAction' (Actions) que faz bypass de regras de horário.
   * - Atribui pontos instantâneos e valida a presença (Confirmado).
   * 
   * @param {StudentResult} student - Objeto do aluno selecionado no dropdown.
   */
  const handleAddStudent = async (student: StudentResult) => {
    setAddingId(student.id);
    const res = await manualCheckinAction(slot.id, today, student.id);
    if (res.success) {
      setSearchQuery("");
      setSearchResults([]);
      showToast(`${getDisplayName(student)} adicionado.`, "success");
      await loadCheckins();
    } else {
      showToast(friendlyError(res.error || "Erro"));
    }
    setAddingId(null);
  };

  /**
   * ALTERAR FALTA/PRESENÇA (Attendance Toggle).
   * 
   * @operation 
   * - Status 'missed': Invalida pontuação, mas mantém rastro para análise de no-show.
   * - Status 'confirmed': Valida presença e prepara para pontuação final.
   * - Concorrência: Proteção via `togglingIds` para evitar cliques duplos/race conditions.
   * 
   * @param {string} checkinId - UUID do check-in operacional.
   */
  const handleToggleAbsent = async (checkinId: string) => {
    if (togglingIds.has(checkinId)) return;
    const checkin = checkins.find(c => c.id === checkinId);
    if (!checkin) return;

    setTogglingIds(prev => { const n = new Set(prev); n.add(checkinId); return n; });
    try {
      const isAbsent = checkin.status === "missed";
      const res = isAbsent ? await unmarkAsAbsentAction(checkinId) : await markAsAbsentAction(checkinId);
      if (res.success) {
        await loadCheckins();
        showToast(isAbsent ? "Presença restaurada." : "Falta registrada.", "success");
      } else {
        showToast(res.error || "Erro ao salvar.");
      }
    } finally {
      setTogglingIds(prev => { const n = new Set(prev); n.delete(checkinId); return n; });
    }
  };

  /**
   * FECHAMENTO DE AULA (Session Finalization).
   * 
   * @lifecycle
   * - Gate de Pontuação: Aciona o motor que distribui XP/Score baseado na lista de presentes.
   * - Lockdown: Cria registro em 'class_sessions', bloqueando futuras edições no app do aluno.
   * - Limpeza: Descarta automaticamente alunos marcados com 'falta' no relatório final.
   */
  const handleCloseClass = async () => {
    const presentIds = checkins
      .filter(c => c.status !== "missed")
      .map(c => c.student_id);

    if (presentIds.length === 0 && !showConfirmEmpty) {
      setShowConfirmEmpty(true);
      return;
    }

    setSubmitting(true);
    const res = await closeClassAction(slot.id, today, presentIds);
    if (res.success) {
      onSuccess();
    } else {
      showToast(res.error || "Erro ao fechar.");
    }
    setSubmitting(false);
    setShowConfirmEmpty(false);
  };

  const handleReopenClass = async () => {
    setShowReopenConfirm(false);
    setReopening(true);
    try {
      const res = await reopenClassAction(slot.id, today);
      if (res.error) {
        showToast(res.error);
        return;
      }
      showToast("Aula reaberta com sucesso!", "success");
      loadCheckins();
    } catch (e) {
      showToast("Erro ao reabrir aula.");
    } finally {
      setReopening(false);
    }
  };

  // ── Derived ──
  const presentCount = checkins.filter(c => c.status !== "missed").length;
  const enrolledNotCheckedIn = enrollments.filter(
    en => !checkins.some(c => c.student_id === en.student_id)
  );


  // ── Render ─────────────────────────────────────────────────

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "rgba(0,0,0,0.88)",
      backdropFilter: "blur(10px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 100, padding: 16
    }}>
      <div style={{
        width: "100%", maxWidth: 1400,
        background: "#FFF",
        border: "4px solid #000",
        boxShadow: "40px 40px 0px rgba(0,0,0,0.2)",
        position: "relative",
        display: "flex", flexDirection: "column",
        maxHeight: "98vh",
      }}>

        {/* ── Toast ── */}
        {toast && (
          <div style={{
            position: "absolute", top: -72, left: 0, right: 0,
            background: toast.type === "success" ? "#000" : toast.type === "warning" ? "#D97706" : "#DC2626",
            color: "#FFF", border: "3px solid #000",
            padding: "14px 24px", zIndex: 110,
            display: "flex", alignItems: "center", gap: 12,
            boxShadow: "8px 8px 0 rgba(0,0,0,0.1)"
          }}>
            {toast.type === "success" ? <CheckCircle size={18} /> : <AlertOctagon size={18} />}
            <span style={{ fontSize: 13, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {toast.message}
            </span>
            <button onClick={() => setToast(null)} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "#FFF" }}>
              <X size={18} />
            </button>
          </div>
        )}

        {/* ── Header ── */}
        <div style={{
          padding: "16px 32px",
          borderBottom: "4px solid #000",
          background: isClosed ? "#374151" : "#000",
          color: "#FFF",
          display: "flex", justifyContent: "space-between", alignItems: "center"
        }}>
          <div>
            <div style={{ fontSize: 9, fontWeight: 900, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.25em", marginBottom: 4 }}>
              {isClosed ? "AULA ENCERRADA" : "CENTRO DE COMANDO"}
            </div>
            <h2 style={{ fontSize: 24, fontWeight: 900, textTransform: "uppercase", margin: 0, display: "flex", alignItems: "center", gap: 12, letterSpacing: "-0.03em" }}>
              {isClosed ? <Lock size={24} /> : <ShieldCheck size={24} />}
              {slot.name}
            </h2>
            <div style={{ display: "flex", gap: 20, marginTop: 10, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 800, color: "rgba(255,255,255,0.7)" }}>
                <Clock size={13} /> {formatTime(slot.time_start)}
                {slot.day_of_week !== undefined && ` — ${DAY_LABELS[slot.day_of_week]}`}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {!isSwappingCoach ? (
                  <button
                    onClick={() => !isClosed && setIsSwappingCoach(true)}
                    disabled={isClosed}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: 12,
                      fontWeight: 800,
                      color: isSubstituted ? "#EAB308" : "rgba(255,255,255,0.7)",
                      background: isSubstituted ? "rgba(234, 179, 8, 0.15)" : "rgba(255,255,255,0.1)",
                      border: `1px solid ${isSubstituted ? "#EAB308" : "rgba(255,255,255,0.2)"}`,
                      padding: "4px 10px",
                      borderRadius: 4,
                      cursor: isClosed ? "default" : "pointer",
                      textTransform: "uppercase",
                      transition: "all 0.2s"
                    }}
                    onMouseEnter={e => { if(!isClosed) e.currentTarget.style.background = isSubstituted ? "rgba(234, 179, 8, 0.25)" : "rgba(255,255,255,0.2)"; }}
                    onMouseLeave={e => { if(!isClosed) e.currentTarget.style.background = isSubstituted ? "rgba(234, 179, 8, 0.15)" : "rgba(255,255,255,0.1)"; }}
                  >
                    {isSubstituted ? (
                      <>
                        <RefreshCw size={13} stroke="#EAB308" />
                        <span style={{ color: "#EAB308" }}>{coachDisplay?.split(" ")[0]} (SUB)</span>
                      </>
                    ) : (
                      <>
                        <User size={13} stroke="#9CA3AF" />
                        <span style={{ color: "#FFF" }}>{coachDisplay?.split(" ")[0]}</span>
                        {!isClosed && <RefreshCw size={11} style={{ marginLeft: 4, opacity: 0.4 }} />}
                      </>
                    )}
                  </button>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#FFF", padding: "4px 10px", borderRadius: 4, border: "2px solid #000" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#000" }}>
                      <UserPlus size={14} />
                      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        {coaches.map(c => (
                          <div 
                            key={c.id} 
                            onClick={() => handleCoachSwap(c.id, c.full_name)}
                            style={{
                              padding: "4px 8px",
                              cursor: "pointer",
                              fontSize: 11,
                              fontWeight: 900,
                              textTransform: "uppercase",
                              background: "#fff",
                              borderBottom: "1px solid #eee"
                            }}
                          >
                            {c.full_name}
                          </div>
                        ))}
                      </div>
                    </div>
                    <button 
                      onClick={() => setIsSwappingCoach(false)}
                      style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex", color: "#000", borderRadius: 3 }}
                      onMouseEnter={e => e.currentTarget.style.background = "#F3F4F6"}
                      onMouseLeave={e => e.currentTarget.style.background = "none"}
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.1)", border: "2px solid rgba(255,255,255,0.3)",
              cursor: "pointer", color: "#FFF", width: 44, height: 44,
              display: "flex", alignItems: "center", justifyContent: "center",
              borderRadius: 4, flexShrink: 0
            }}
          >
            <X size={24} />
          </button>
        </div>

        {/* ── Body ── */}
        <div style={{ flex: 1, overflowY: "auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>

          {/* ── LEFT: Presença (Check-ins) ── */}
          <div style={{ borderRight: "3px solid #000", display: "flex", flexDirection: "column" }}>

            {/* Section Header */}
            <div style={{ borderBottom: "3px solid #000", padding: "12px 14px", display: "flex", alignItems: "center", gap: 10, background: "#FFF" }}>
              <ClipboardCheck size={18} />
              <div style={{ fontSize: 13, fontWeight: 900 }}>LISTA DE PRESENÇA ({activeDayLabel})</div>
            </div>

            {/* Search / Add */}
            {!isClosed && (
              <div style={{ padding: "12px 16px", borderBottom: "2px solid #E5E7EB", background: "#FAFAFA" }}>
                <div style={{ position: "relative" }}>
                  <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#000" }} />
                  <input
                    placeholder="Adicionar aluno ao check-in..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    style={{ width: "100%", padding: "9px 12px 9px 36px", border: "2px solid #000", fontSize: 12, fontWeight: 700, outline: "none", background: "#FFF", boxSizing: "border-box" }}
                  />
                  {searching && <Loader2 size={14} className="animate-spin" style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)" }} />}
                </div>
                {searchQuery.length >= 2 && !searching && (
                  <div style={{ border: "2px solid #000", borderTop: "none", background: "#FFF", maxHeight: 180, overflowY: "auto" }}>
                    {searchResults.length === 0 ? (
                      <div style={{ padding: 16, textAlign: "center", fontSize: 11, fontWeight: 800, color: "#999" }}>NENHUM ALUNO ENCONTRADO</div>
                    ) : searchResults.map(s => (
                      <div key={s.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderBottom: "1px solid #F3F4F6" }}>
                        <span style={{ fontSize: 12, fontWeight: 800 }}>{getDisplayName(s)}</span>
                        <button
                          onClick={() => handleAddStudent(s)}
                          disabled={addingId === s.id}
                          style={{ padding: "5px 12px", background: "#000", color: "#FFF", border: "none", fontWeight: 900, cursor: "pointer", fontSize: 11, display: "flex", alignItems: "center", gap: 6 }}
                        >
                          {addingId === s.id ? <Loader2 size={12} className="animate-spin" /> : <UserPlus size={13} />} ADD
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Checkins List */}
            <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
              {loadingCheckins ? (
                <div style={{ padding: 40, textAlign: "center" }}><Loader2 size={28} className="animate-spin" style={{ margin: "0 auto", color: "#CCC" }} /></div>
              ) : checkins.length === 0 ? (
                <div style={{ padding: "40px 20px", textAlign: "center", border: "2px dashed #DDD", background: "#F9FAFB" }}>
                  <Users size={32} style={{ color: "#CCC", margin: "0 auto 12px" }} />
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#999" }}>NENHUM CHECK-IN REGISTRADO</div>
                </div>
              ) : checkins.map(c => {
                const isPresent = c.status !== "missed";
                const isBusy = togglingIds.has(c.id);
                const levelColor = getLevelInfo(c.profiles?.level || "INTRO").color;
                return (
                  <div
                    key={c.id}
                    onClick={() => !isClosed && handleToggleAbsent(c.id)}
                    style={{
                      padding: "16px 24px",
                      border: `2px solid ${isPresent ? "#000" : "#DC2626"}`,
                      cursor: isClosed ? "default" : (isBusy ? "wait" : "pointer"),
                      background: isPresent ? "#FFF" : "#FEF2F2",
                      boxShadow: `6px 6px 0 ${isPresent ? "rgba(0,0,0,0.08)" : "rgba(220,38,38,0.12)"}`,
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      opacity: isBusy ? 0.6 : 1,
                      transition: "all 0.1s",
                      borderLeft: `6px solid ${isPresent ? levelColor : "#DC2626"}`,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 900, textTransform: "uppercase", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {getDisplayName(c.profiles)}
                        </div>
                        <div style={{ fontSize: 11, fontWeight: 900, marginTop: 4, color: isPresent ? "#16A34A" : "#DC2626" }}>
                          {isPresent ? "● PRESENTE" : "● FALTA"}
                        </div>
                      </div>
                    </div>
                    {!isClosed && (
                      <div
                        style={{ flexShrink: 0, marginLeft: 8 }}
                        title={isPresent ? "Marcar falta" : "Restaurar presença"}
                      >
                        {isBusy
                          ? <Loader2 size={16} className="animate-spin" />
                          : isPresent
                            ? <UserX size={16} color="#DC2626" />
                            : <RefreshCw size={16} color="#16A34A" />
                        }
                      </div>
                    )}
                    {isClosed && (
                      <div style={{ flexShrink: 0, marginLeft: 8 }}>
                        {isPresent
                          ? <CheckCircle size={16} color="#16A34A" />
                          : <UserX size={16} color="#DC2626" />
                        }
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── RIGHT: Matriculados Fixos ── */}
          <div style={{ display: "flex", flexDirection: "column" }}>

            {/* Section Header */}
            <div style={{ padding: "14px 20px", borderBottom: "2px solid #000", background: "#F9FAFB" }}>
              <div style={{ fontWeight: 900, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", display: "flex", alignItems: "center", gap: 8 }}>
                <Users size={14} /> MATRICULADOS FIXOS ({enrollments.length}/{slot.capacity})
              </div>
              <div style={{ fontSize: 10, color: "#999", marginTop: 2 }}>Alunos com reserva permanente neste horário</div>
            </div>

            {/* Enrolled List */}
            <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 6 }}>
              {loadingEnrollments ? (
                <div style={{ padding: 40, textAlign: "center" }}><Loader2 size={28} className="animate-spin" style={{ margin: "0 auto", color: "#CCC" }} /></div>
              ) : enrollments.length === 0 ? (
                <div style={{ padding: "40px 20px", textAlign: "center", border: "2px dashed #DDD", background: "#F9FAFB" }}>
                  <Users size={32} style={{ color: "#CCC", margin: "0 auto 12px" }} />
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#999" }}>NENHUM ALUNO MATRICULADO</div>
                  <div style={{ fontSize: 10, color: "#CCC", marginTop: 4 }}>Use a aba MATRÍCULAS para cadastrar</div>
                </div>
              ) : enrollments.map(en => {
                const hasCheckin = checkins.some(c => c.student_id === en.student_id);
                const checkin = checkins.find(c => c.student_id === en.student_id);
                const isPresent = hasCheckin && checkin?.status !== "missed";
                const levelColor = getLevelInfo(en.profiles?.level || "INTRO").color;

                return (
                  <div
                    key={en.id}
                    style={{
                      padding: "14px 20px",
                      border: "2px solid #E5E7EB",
                      background: isPresent ? "#F0FDF4" : hasCheckin ? "#FEF2F2" : "#FFF",
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      borderLeft: `6px solid ${isPresent ? "#16A34A" : hasCheckin ? "#DC2626" : levelColor}`,
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 800, textTransform: "uppercase", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {getDisplayName(en.profiles)}
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 900, marginTop: 2, color: isPresent ? "#16A34A" : hasCheckin ? "#DC2626" : "#9CA3AF" }}>
                        {isPresent ? "✓ PRESENTE" : hasCheckin ? "✗ FALTA" : "○ SEM CHECK-IN"}
                      </div>
                    </div>
                    {/* Status icon */}
                    <div style={{ flexShrink: 0, marginLeft: 8 }}>
                      {isPresent
                        ? <CheckCircle size={14} color="#16A34A" />
                        : hasCheckin
                          ? <UserX size={14} color="#DC2626" />
                          : <UserMinus size={14} color="#D1D5DB" />
                      }
                    </div>
                  </div>
                );
              })}

              {/* Enrolled not checked in — alert section */}
              {!isClosed && enrolledNotCheckedIn.length > 0 && (
                <div style={{ marginTop: 8, padding: "10px 14px", border: "2px dashed #EAB308", background: "#FEFCE8" }}>
                  <div style={{ fontSize: 10, fontWeight: 900, color: "#A16207", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    ⚠ {enrolledNotCheckedIn.length} matriculado(s) sem check-in
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        {/* ── Scoreboard ── */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
          borderTop: "4px solid #000",
          background: "#F9FAFB"
        }}>
          <div style={{ padding: "12px 24px", borderRight: "2px solid #E5E7EB" }}>
            <div style={{ fontSize: 9, fontWeight: 900, color: "#666", textTransform: "uppercase", letterSpacing: "0.1em" }}>Presentes ({activeDayLabel})</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: "#16A34A", lineHeight: 1.1, marginTop: 2 }}>
              {loadingCheckins ? "—" : presentCount}
              <span style={{ fontSize: 14, color: "#9CA3AF", fontWeight: 700 }}> / {slot.capacity}</span>
            </div>
          </div>
          <div style={{ padding: "12px 24px", borderRight: "2px solid #E5E7EB" }}>
            <div style={{ fontSize: 9, fontWeight: 900, color: "#666", textTransform: "uppercase", letterSpacing: "0.1em" }}>Matriculados Fixos</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: "#2563EB", lineHeight: 1.1, marginTop: 2 }}>
              {loadingEnrollments ? "—" : enrollments.length}
              <span style={{ fontSize: 14, color: "#9CA3AF", fontWeight: 700 }}> / {slot.capacity}</span>
            </div>
          </div>
          <div style={{ padding: "12px 24px" }}>
            <div style={{ fontSize: 9, fontWeight: 900, color: "#666", textTransform: "uppercase", letterSpacing: "0.1em" }}>Ausentes Fixos</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: enrolledNotCheckedIn.length > 0 ? "#DC2626" : "#9CA3AF", lineHeight: 1.1, marginTop: 2 }}>
              {loadingEnrollments || loadingCheckins ? "—" : enrolledNotCheckedIn.length}
              <span style={{ fontSize: 14, color: "#9CA3AF", fontWeight: 700 }}> sem check-in</span>
            </div>
          </div>
        </div>

        <div style={{ padding: "24px 48px", borderTop: "4px solid #000", background: "#F9FAFB", display: "flex", gap: 24, alignItems: "center" }}>
          <button
            onClick={onClose}
            style={{ padding: "20px 32px", border: "4px solid #000", background: "#FFF", fontWeight: 900, fontSize: 15, cursor: "pointer", textTransform: "uppercase" }}
          >
            VOLTAR
          </button>
 
          {!isClosed && !showConfirmEmpty && (
            <button
              disabled={submitting || loadingCheckins}
              onClick={handleCloseClass}
              style={{
                flex: 1, padding: 24,
                background: submitting ? "#666" : "#000",
                color: "#FFF", border: "none",
                fontWeight: 900, fontSize: 18,
                cursor: submitting ? "wait" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                gap: 16, textTransform: "uppercase", letterSpacing: "0.05em",
                boxShadow: "10px 10px 0 rgba(0,0,0,0.15)",
                transition: "all 0.15s"
              }}
            >
              {submitting
                ? <><Loader2 size={24} className="animate-spin" /> PROCESSANDO...</>
                : <><ShieldCheck size={28} /> CONFIRMAR FECHAMENTO DA AULA</>
              }
            </button>
          )}
          {isClosed && (
            <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr auto", gap: 16 }}>
              <div style={{
                padding: 24, background: "#F1F5F9", border: "2px solid #94A3B8",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
                color: "#475569", fontWeight: 900, textTransform: "uppercase"
              }}>
                <Lock size={20} /> AULA ENCERRADA — SOMENTE LEITURA
              </div>
              <button
                disabled={reopening}
                onClick={() => setShowReopenConfirm(true)}
                style={{ 
                  padding: "0 24px", background: "#FFF", border: "3px solid #000", 
                  fontWeight: 900, fontSize: 13, cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 8, textTransform: "uppercase"
                }}
              >
                {reopening ? <Loader2 size={16} className="animate-spin" /> : <Unlock size={18} />}
                Reabrir Turma
              </button>
            </div>
          )}

          {/* Action Confirmation Modals */}
          {showReopenConfirm && (
            <ConfirmModal
              title="Reabrir Aula"
              message="Tem certeza que deseja reabrir esta aula? Isso removerá os pontos dos alunos presentes e permitirá novas edições."
              confirmLabel="REABRIR AGORA"
              onConfirm={handleReopenClass}
              onCancel={() => setShowReopenConfirm(false)}
              isDanger={true}
            />
          )}

          {showConfirmEmpty && (
            <ConfirmModal
              title="Aviso de Segurança"
              message="VOCÊ ESTÁ FECHANDO UMA AULA SEM ALUNOS PRESENTES. Deseja prosseguir com o fechamento mesmo assim?"
              confirmLabel="SIM, FECHAR AULA VAZIA"
              onConfirm={handleCloseClass}
              onCancel={() => setShowConfirmEmpty(false)}
              isDanger={true}
            />
          )}
        </div>
      </div>
    </div>
  );
}

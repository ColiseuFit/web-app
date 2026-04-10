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
  ArrowLeftRight,
  Trash2,
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
  getSlotWaitlist,
  removeFromWaitlist,
  triggerWaitlistPromotion,
  addToWaitlist,
  deleteCheckinAction,
  migrateCheckinAction,
} from "./actions";
import { getLevelInfo } from "@/lib/constants/levels";
import { DAY_LABELS } from "@/lib/constants/calendar";
import { AthleteIdentity, AthleteAvatar } from "@/components/Identity/AthleteIdentity";
import { getDisplayName } from "@/lib/identity-utils";

// ── Types ──────────────────────────────────────────────────────

interface ClassSlot {
  id: string;
  name: string;
  time_start: string;
  day_of_week?: number;
  capacity: number;
  coach_name?: string | null;
  default_coach_id?: string | null;
  profiles?: { full_name: string } | null;
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
  daySlots?: ClassSlot[];
  occupancy?: Record<string, number>;
}

// ── Helpers ────────────────────────────────────────────────────


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
  daySlots = [],
  occupancy = {},
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
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [showMigrateModal, setShowMigrateModal] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<{ id: string; name: string } | null>(null);
  const [isMigratingAction, setIsMigratingAction] = useState(false);
  const [waitlist, setWaitlist] = useState<any[]>([]);
  const [loadingWaitlist, setLoadingWaitlist] = useState(true);
  const [promoting, setPromoting] = useState<string | null>(null);
 
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

  const loadEnrollments = useCallback(async () => {
    setLoadingEnrollments(true);
    const res = await getSlotEnrollments(slot.id);
    if (res.data) setEnrollments(res.data as unknown as Enrollment[]);
    setLoadingEnrollments(false);
  }, [slot.id]);

  const loadCheckins = useCallback(async () => {
    setLoadingCheckins(true);
    const res = await getSlotCheckins(slot.id, today);
    if (res.data) setCheckins(res.data as Checkin[]);
    setLoadingCheckins(false);
  }, [slot.id, today]);

  const loadWaitlist = useCallback(async () => {
    setLoadingWaitlist(true);
    const res = await getSlotWaitlist(slot.id);
    if (res.data) setWaitlist(res.data);
    setLoadingWaitlist(false);
  }, [slot.id]);

  useEffect(() => {
    loadEnrollments();
    loadCheckins();
    loadWaitlist();
  }, [loadEnrollments, loadCheckins, loadWaitlist]);

  async function handleCoachSwap(targetCoachId: string | null, coachName: string | null) {
    setSwapping(true);
    try {
      const effectiveCoachId = targetCoachId === slot.default_coach_id ? null : targetCoachId;
      
      const res = await addSubstitution(slot.id, effectiveCoachId, activeDate);
      if (res.error) {
        showToast(res.error, "error");
      } else {
        const isReset = !effectiveCoachId;
        showToast(isReset ? "Professor redefinido para o padrão." : "Professor alterado para esta aula!", "success");
        setIsSwappingCoach(false);
        
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
    const dc = coaches.find(c => c.id === slot.default_coach_id);
    if (dc) return dc.full_name;
    return slot.coach_name || null;
  })();

  const isSubstituted = !!activeSub && activeSub.id !== slot.default_coach_id;
  const activeDayLabel = activeDate ? DAY_LABELS[new Date(activeDate + 'T00:00:00').getDay()] : "";

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

  const handleDeleteCheckin = async (id: string) => {
    setRemovingId(id);
    try {
      const res = await deleteCheckinAction(id);
      if (!res.success) {
        showToast(res.error || "Erro ao remover.");
      } else {
        showToast("Presença removida", "success");
        setShowDeleteModal(null);
        await loadCheckins();
      }
    } catch (e) {
      showToast("Falha ao remover");
    } finally {
      setRemovingId(null);
    }
  };

  const handleMigrateCheckin = async (targetSlotId: string) => {
    if (!showMigrateModal) return;
    
    setIsMigratingAction(true);
    try {
      const res = await migrateCheckinAction(showMigrateModal, targetSlotId, today);
      if (res.success) {
        showToast("Aluno migrado com sucesso!", "success");
        setShowMigrateModal(null);
        await loadCheckins();
      } else {
        showToast(res.error || "Erro ao migrar.");
      }
    } finally {
      setIsMigratingAction(false);
    }
  };

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

  const handleRemoveFromWaitlist = async (id: string) => {
    const res = await removeFromWaitlist(id);
    if (res.success) {
      showToast("Removido da lista de espera.", "success");
      await loadWaitlist();
    } else {
      showToast(res.error || "Erro ao remover.");
    }
  };

  const handlePromoteFromWaitlist = async () => {
    setPromoting("all");
    const res = await triggerWaitlistPromotion(slot.id, true);
    if (res.success) {
      showToast("Aluno promovido com sucesso!", "success");
      await Promise.all([loadEnrollments(), loadWaitlist()]);
    } else if (res.message) {
      showToast(res.message, "warning");
    } else {
      showToast(res.error || "Erro na promoção.");
    }
    setPromoting(null);
  };

  const handleWaitlistCheckin = async (studentId: string, fullName: string) => {
    setTogglingIds(prev => { const n = new Set(prev); n.add(studentId); return n; });
    const res = await manualCheckinAction(slot.id, today, studentId);
    if (res.success) {
      showToast(`${fullName.split(" ")[0]} adicionado à aula de hoje.`, "success");
      await Promise.all([loadCheckins(), loadWaitlist()]);
    } else {
      showToast(res.error || "Erro ao fazer check-in.");
    }
    setTogglingIds(prev => { const n = new Set(prev); n.delete(studentId); return n; });
  };

  const presentCount = checkins.filter(c => c.status !== "missed").length;
  const enrollmentsNotCheckedIn = enrollments.filter(
    en => !checkins.some(c => c.student_id === en.student_id)
  );

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "rgba(0,0,0,0.88)",
      backdropFilter: "blur(10px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 100, padding: "20px"
    }}>
      <div style={{
        width: "96%", maxWidth: 1800,
        background: "#FFF",
        border: "4px solid #000",
        boxShadow: "60px 60px 0px rgba(0,0,0,0.25)",
        position: "relative",
        display: "flex", flexDirection: "column",
        maxHeight: "96vh",
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
            <div style={{ fontSize: 9, fontWeight: 900, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.4em", marginBottom: 4 }}>
              {isClosed ? "AULA ENCERRADA" : "PAINEL DA AULA"}
            </div>
            <h2 style={{ fontSize: 28, fontWeight: 900, textTransform: "uppercase", margin: 0, display: "flex", alignItems: "center", gap: 14, letterSpacing: "-0.04em" }}>
              {isClosed ? <Lock size={28} /> : <ShieldCheck size={28} />}
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
        <div style={{ flex: 1, overflowY: "auto", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 0 }}>

          {/* ── COLUMN 1: Lista de Presença ── */}
          <div style={{ borderRight: "3px solid #000", display: "flex", flexDirection: "column", background: "#FFF" }}>
            <div style={{ borderBottom: "3px solid #000", padding: "14px 20px", display: "flex", alignItems: "center", gap: 10, background: "#FFF" }}>
              <ClipboardCheck size={18} strokeWidth={2.5} color="#000" />
              <div style={{ fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.08em" }}>Presença ({activeDayLabel})</div>
            </div>

            {!isClosed && (
              <div style={{ padding: "16px", borderBottom: "2px solid #EEE", background: "#FAFAFA" }}>
                <div style={{ position: "relative" }}>
                  <Search size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#000", opacity: 0.5 }} />
                  <input
                    placeholder="Adicionar aluno..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    style={{ width: "100%", padding: "12px 12px 12px 42px", border: "3px solid #000", fontSize: 13, fontWeight: 700, outline: "none", background: "#FFF", boxSizing: "border-box" }}
                  />
                  {searching && <Loader2 size={16} className="animate-spin" style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)" }} />}
                </div>
                {searchQuery.length >= 2 && !searching && (
                  <div style={{ border: "3px solid #000", borderTop: "none", background: "#FFF", maxHeight: 250, overflowY: "auto", boxShadow: "10px 10px 0 rgba(0,0,0,0.1)", zIndex: 10 }}>
                    {searchResults.length === 0 ? (
                      <div style={{ padding: 20, textAlign: "center", fontSize: 11, fontWeight: 800, color: "#999" }}>NENHUM ALUNO ENCONTRADO</div>
                    ) : searchResults.map(s => (
                      <div key={s.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid #EEE" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <AthleteIdentity
                            profile={s as any}
                            avatarSize={32}
                          />
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            onClick={() => handleAddStudent(s)}
                            disabled={addingId === s.id}
                            style={{ padding: "6px 12px", background: "#000", color: "#FFF", border: "none", fontWeight: 900, cursor: "pointer", fontSize: 11, display: "flex", alignItems: "center", gap: 6 }}
                          >
                            {addingId === s.id ? <Loader2 size={12} className="animate-spin" /> : <UserPlus size={14} />} PRESENÇA
                          </button>
                          <button
                            onClick={async () => {
                              setAddingId(s.id);
                              const res = await addToWaitlist(slot.id, s.id);
                              if (res.success) {
                                showToast("Adicionado à fila.", "success");
                                await loadWaitlist();
                              } else {
                                showToast(res.error || "Erro");
                              }
                              setAddingId(null);
                            }}
                            disabled={addingId === s.id}
                            style={{ padding: "6px 12px", background: "#FFF", color: "#000", border: "2px solid #000", fontWeight: 900, cursor: "pointer", fontSize: 11, display: "flex", alignItems: "center", gap: 6 }}
                          >
                            {addingId === s.id ? <Loader2 size={12} className="animate-spin" /> : <Clock size={14} />} FILA
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 10 }}>
              {loadingCheckins ? (
                <div style={{ padding: 60, textAlign: "center" }}><Loader2 size={32} className="animate-spin" style={{ margin: "0 auto", color: "#000", opacity: 0.1 }} /></div>
              ) : checkins.length === 0 ? (
                <div style={{ padding: "60px 20px", textAlign: "center", border: "4px dashed #EEE", background: "#FAFAFA" }}>
                  <Users size={40} style={{ color: "#DDD", margin: "0 auto 16px" }} />
                  <div style={{ fontSize: 13, fontWeight: 900, color: "#999", textTransform: "uppercase" }}>Ninguém fez check-in ainda</div>
                </div>
              ) : checkins.map(c => {
                const isPresent = c.status !== "missed";
                const isAbsent = c.status === "missed";
                const name = getDisplayName(c.profiles);
                const levelInfo = getLevelInfo(c.profiles?.level || "INTRO");
                return (
                  <div
                    key={c.id}
                    style={{
                      padding: "16px 20px",
                      border: "3px solid #000",
                      background: isPresent ? "#FFF" : "#FEF2F2",
                      boxShadow: isPresent ? "6px 6px 0 rgba(0,0,0,0.05)" : "6px 6px 0 rgba(220,38,38,0.1)",
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      borderLeft: `10px solid ${isPresent ? levelInfo.color : "#DC2626"}`,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 14, flex: 1, minWidth: 0, marginRight: 16 }}>
                      <AthleteAvatar
                        profile={c.profiles}
                        size={52}
                      />

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ 
                          fontSize: 16, 
                          fontWeight: 900, 
                          textTransform: "uppercase",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis"
                        }} title={name}>
                          {name}
                        </div>
                        <div style={{ fontSize: 11, fontWeight: 900, marginTop: 4, color: isPresent ? "#16A34A" : "#DC2626", display: "flex", alignItems: "center", gap: 6 }}>
                          {isPresent ? "PRESENÇA CONFIRMADA" : "FALTA NO SISTEMA"}
                        </div>
                      </div>
                    </div>
                    
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      {/* Toggle Absence */}
                      <button
                        onClick={() => handleToggleAbsent(c.id)}
                        disabled={isClosed || togglingIds.has(c.id)}
                        title={isAbsent ? "Restaurar Presença" : "Marcar Falta"}
                        style={{
                          width: 46, height: 46,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          background: isAbsent ? "#E5E7EB" : "#FEE2E2",
                          color: isAbsent ? "#6B7280" : "#DC2626",
                          border: "3px solid #000",
                          cursor: isClosed ? "default" : "pointer",
                          opacity: isClosed ? 0.4 : 1,
                          transition: "all 0.1s",
                          boxShadow: isAbsent ? "none" : "4px 4px 0 rgba(220,38,38,0.1)"
                        }}
                        onMouseEnter={e => { if (!isClosed && !isAbsent) { e.currentTarget.style.transform = "translate(-2px, -2px)"; e.currentTarget.style.boxShadow = "6px 6px 0 #DC2626"; } }}
                        onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = isAbsent ? "none" : "4px 4px 0 rgba(220,38,38,0.1)"; }}
                      >
                        {togglingIds.has(c.id) ? <Loader2 size={20} className="animate-spin" /> : isAbsent ? <RotateCcw size={22} strokeWidth={2.5} /> : <UserX size={22} strokeWidth={2.5} />}
                      </button>

                      {!isClosed && (
                        <>
                          {/* Migrate Student */}
                          <button
                            onClick={() => setShowMigrateModal(c.id)}
                            title="Migrar para outro horário"
                            style={{
                              width: 46, height: 46,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              background: "#F3F4F6",
                              color: "#374151",
                              border: "2px solid #000",
                              cursor: "pointer",
                              transition: "all 0.1s",
                              boxShadow: "4px 4px 0 rgba(0,0,0,0.1)"
                            }}
                            onMouseEnter={e => { e.currentTarget.style.transform = "translate(-2px, -2px)"; e.currentTarget.style.boxShadow = "6px 6px 0 #000"; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "4px 4px 0 rgba(0,0,0,0.1)"; }}
                          >
                            <ArrowLeftRight size={22} strokeWidth={2.5} />
                          </button>

                          {/* Remove Check-in */}
                          <button
                            onClick={() => setShowDeleteModal({ id: c.id, name })}
                            disabled={removingId === c.id}
                            title="Remover presença (liberar vaga)"
                            style={{
                              width: 46, height: 46,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              background: "#FFF",
                              color: "#9CA3AF",
                              border: "3px solid #000",
                              cursor: "pointer",
                              transition: "all 0.1s",
                              boxShadow: "4px 4px 0 rgba(0,0,0,0.05)"
                            }}
                            onMouseEnter={e => { e.currentTarget.style.transform = "translate(-2px, -2px)"; e.currentTarget.style.boxShadow = "6px 6px 0 #DC2626"; e.currentTarget.style.color = "#DC2626"; e.currentTarget.style.borderColor = "#DC2626"; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "4px 4px 0 rgba(0,0,0,0.05)"; e.currentTarget.style.color = "#9CA3AF"; e.currentTarget.style.borderColor = "#000"; }}
                          >
                            {removingId === c.id ? <Loader2 size={20} className="animate-spin" /> : <UserMinus size={22} strokeWidth={2.5} />}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── COLUMN 2: Matriculados Fixos ── */}
          <div style={{ display: "flex", flexDirection: "column", background: "#FFF", borderLeft: "1px solid #E5E7EB" }}>
            <div style={{ padding: "14px 20px", borderBottom: "3px solid #000", background: "#FFF" }}>
              <div style={{ fontWeight: 900, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", display: "flex", alignItems: "center", gap: 10 }}>
                <Users size={18} strokeWidth={2.5} color="#000" /> Alunos Fixos ({enrollments.length}/{slot.capacity})
              </div>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 8 }}>
              {loadingEnrollments ? (
                <div style={{ padding: 60, textAlign: "center" }}><Loader2 size={32} className="animate-spin" style={{ margin: "0 auto", color: "#000", opacity: 0.1 }} /></div>
              ) : enrollments.length === 0 ? (
                <div style={{ padding: "60px 20px", textAlign: "center", border: "4px dashed #EEE", background: "#FAFAFA" }}>
                  <Users size={40} style={{ color: "#DDD", margin: "0 auto 16px" }} />
                  <div style={{ fontSize: 13, fontWeight: 900, color: "#999", textTransform: "uppercase" }}>Nenhum aluno matriculado</div>
                </div>
              ) : enrollments.map(en => {
                const checkin = checkins.find(c => c.student_id === en.student_id);
                const isPresent = !!checkin && checkin.status !== "missed";
                const isMissed = !!checkin && checkin.status === "missed";
                const levelInfo = getLevelInfo(en.profiles?.level || "INTRO");

                return (
                  <div
                    key={en.id}
                    style={{
                      padding: "14px 20px",
                      border: "2px solid #EEE",
                      background: isPresent ? "#F0FDF4" : isMissed ? "#FEF2F2" : "#FFF",
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      borderLeft: `8px solid ${isPresent ? "#16A34A" : isMissed ? "#DC2626" : levelInfo.color}`,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                      <AthleteAvatar
                        profile={en.profiles}
                        size={42}
                      />

                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 800, textTransform: "uppercase", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{getDisplayName(en.profiles)}</div>
                        <div style={{ fontSize: 10, fontWeight: 900, marginTop: 4, color: isPresent ? "#16A34A" : isMissed ? "#DC2626" : "#AAA" }}>
                          {isPresent ? "✓ PRESENTE" : isMissed ? "✗ FALTA" : "○ AGUARDANDO"}
                        </div>
                      </div>
                    </div>
                    {isPresent ? <CheckCircle size={16} color="#16A34A" /> : isMissed ? <UserX size={16} color="#DC2626" /> : <Clock size={16} color="#DDD" />}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── COLUMN 3: Fila de Espera ── */}
          <div style={{ borderLeft: "3px solid #000", display: "flex", flexDirection: "column", background: "#FAFAFA" }}>
            <div style={{ padding: "14px 20px", borderBottom: "3px solid #000", background: "#F5F5F5" }}>
              <div style={{ fontWeight: 900, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", display: "flex", alignItems: "center", gap: 10 }}>
                <Clock size={18} strokeWidth={2.5} color="#000" /> Fila de Espera ({waitlist.length})
              </div>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 8 }}>
              {loadingWaitlist ? (
                <div style={{ padding: 60, textAlign: "center" }}><Loader2 size={32} className="animate-spin" style={{ margin: "0 auto", color: "#000", opacity: 0.1 }} /></div>
              ) : waitlist.length === 0 ? (
                <div style={{ padding: "60px 20px", textAlign: "center", border: "4px dashed #DDD", background: "#F5F5F5" }}>
                  <RotateCcw size={40} style={{ color: "#DDD", margin: "0 auto 16px" }} />
                  <div style={{ fontSize: 13, fontWeight: 900, color: "#BBB", textTransform: "uppercase" }}>Fila Vazia</div>
                </div>
              ) : waitlist.map((w, idx) => (
                <div
                  key={w.id}
                  style={{
                    padding: "14px 18px",
                    border: "2px solid #000",
                    background: "#FFF",
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    boxShadow: "4px 4px 0 rgba(0,0,0,0.05)"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                    <div style={{ position: "relative" }}>
                      <AthleteAvatar
                        profile={w.profiles}
                        size={42}
                      />
                      <div style={{ 
                        position: "absolute", bottom: -4, right: -4,
                        width: 20, height: 20, background: "#000", color: "#FFF", border: "2px solid #FFF",
                        borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 900 
                      }}>
                        {idx + 1}
                      </div>
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 800, textTransform: "uppercase", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {getDisplayName(w.profiles)}
                      </div>
                      <div style={{ fontSize: 9, fontWeight: 700, color: "#999", textTransform: "uppercase", marginTop: 2 }}>
                         {new Date(w.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                  {!isClosed && (
                    <div style={{ display: "flex", gap: 4 }}>
                      <button
                        onClick={() => handleWaitlistCheckin(w.student_id, getDisplayName(w.profiles))}
                        disabled={togglingIds.has(w.student_id)}
                        style={{ padding: 6, background: "#DCFCE7", color: "#16A34A", border: "2px solid #000", cursor: "pointer", borderRadius: 4 }}
                        title="Check-in apenas hoje"
                      >
                         <UserPlus size={14} />
                      </button>
                      <button
                        onClick={() => handleRemoveFromWaitlist(w.id)}
                        style={{ padding: 6, background: "#FEF2F2", color: "#DC2626", border: "2px solid #000", cursor: "pointer", borderRadius: 4 }}
                        title="Remover"
                      >
                        <UserMinus size={14} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {!isClosed && waitlist.length > 0 && (
              <div style={{ padding: 16, borderTop: "4px solid #000", background: "#FFF" }}>
                <button
                  disabled={promoting === "all" || enrollments.length >= slot.capacity}
                  onClick={handlePromoteFromWaitlist}
                  style={{
                    width: "100%", padding: "16px",
                    background: enrollments.length >= slot.capacity ? "#EEE" : "#000",
                    color: enrollments.length >= slot.capacity ? "#AAA" : "#FFF",
                    border: "3px solid #000", fontWeight: 900, fontSize: 13,
                    textTransform: "uppercase", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                    boxShadow: enrollments.length >= slot.capacity ? "none" : "6px 6px 0 #000"
                  }}
                >
                  {promoting === "all" ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
                  Promover para Matrícula Fixa
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Footer / Scoreboard ── */}
        <div style={{
          borderTop: "3px solid #000",
          background: "#FFF",
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)"
        }}>
          <div style={{ padding: "18px 24px", borderRight: "3px solid #000", display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ background: "#DCFCE7", color: "#16A34A", padding: "10px", display: "flex", border: "3px solid #000", boxShadow: "3px 3px 0 #000" }}>
              <Users size={22} strokeWidth={2.5} />
            </div>
            <div>
              <div style={{ fontSize: 9, fontWeight: 900, color: "#888", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 2 }}>Presentes</div>
              <div style={{ fontSize: 26, fontWeight: 900, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
                <span style={{ color: "#16A34A" }}>{presentCount}</span>
                <span style={{ color: "#D1D5DB", margin: "0 4px", fontSize: 18 }}>/</span>
                <span style={{ color: "#111", fontSize: 20 }}>{slot.capacity}</span>
              </div>
            </div>
          </div>

          <div style={{ padding: "18px 24px", borderRight: "3px solid #000", display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ background: "#F3F4F6", color: "#000", padding: "10px", display: "flex", border: "3px solid #000", boxShadow: "3px 3px 0 #000" }}>
              <CalendarCheck size={22} strokeWidth={2.5} />
            </div>
            <div>
              <div style={{ fontSize: 9, fontWeight: 900, color: "#888", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 2 }}>Matriculados</div>
              <div style={{ fontSize: 26, fontWeight: 900, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
                <span style={{ color: "#111" }}>{enrollments.length}</span>
                <span style={{ color: "#D1D5DB", margin: "0 4px", fontSize: 18 }}>/</span>
                <span style={{ color: "#888", fontSize: 20 }}>{slot.capacity}</span>
              </div>
            </div>
          </div>

          <div style={{ padding: "18px 24px", borderRight: "3px solid #000", display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ background: "#FEF2F2", color: "#DC2626", padding: "10px", display: "flex", border: "3px solid #000", boxShadow: "3px 3px 0 #000" }}>
              <UserX size={22} strokeWidth={2.5} />
            </div>
            <div>
              <div style={{ fontSize: 9, fontWeight: 900, color: "#888", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 2 }}>Ausentes</div>
              <div style={{ fontSize: 26, fontWeight: 900, lineHeight: 1, fontVariantNumeric: "tabular-nums", color: checkins.filter(c => c.status === "missed").length > 0 ? "#DC2626" : "#111" }}>
                {checkins.filter(c => c.status === "missed").length}
              </div>
            </div>
          </div>

          <div style={{ padding: "18px 24px", display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ background: "#FFFBEB", color: "#D97706", padding: "10px", display: "flex", border: "3px solid #000", boxShadow: "3px 3px 0 #000" }}>
              <Clock size={22} strokeWidth={2.5} />
            </div>
            <div>
              <div style={{ fontSize: 9, fontWeight: 900, color: "#888", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 2 }}>Fila de Espera</div>
              <div style={{ fontSize: 26, fontWeight: 900, lineHeight: 1, fontVariantNumeric: "tabular-nums", color: waitlist.length > 0 ? "#D97706" : "#111" }}>
                {waitlist.length}
              </div>
            </div>
          </div>
        </div>

        {/* ── Action Bar ── */}
        <div style={{
          padding: "20px 28px",
          borderTop: "3px solid #000",
          background: "#F9FAFB",
          display: "flex", gap: 16
        }}>
          <button
            onClick={onClose}
            style={{
              padding: "0 28px",
              height: 60,
              background: "#FFF",
              border: "3px solid #000",
              fontWeight: 900,
              fontSize: 14,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              cursor: "pointer",
              boxShadow: "4px 4px 0 rgba(0,0,0,0.15)",
              transition: "all 0.1s"
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = "translate(-2px, -2px)"; e.currentTarget.style.boxShadow = "6px 6px 0 rgba(0,0,0,0.2)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "4px 4px 0 rgba(0,0,0,0.15)"; }}
          >
            Voltar
          </button>

          {!isClosed ? (
            <button
              onClick={handleCloseClass}
              disabled={submitting}
              style={{
                flex: 1,
                height: 60,
                background: submitting ? "#333" : "#000",
                color: "#FFF",
                border: "3px solid #000",
                fontWeight: 900,
                fontSize: 17,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                cursor: submitting ? "wait" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
                boxShadow: "6px 6px 0 #000",
                transition: "all 0.1s"
              }}
              onMouseEnter={e => { if (!submitting) { e.currentTarget.style.background = "#1F2937"; e.currentTarget.style.transform = "translate(-2px, -2px)"; e.currentTarget.style.boxShadow = "8px 8px 0 #000"; } }}
              onMouseLeave={e => { if (!submitting) { e.currentTarget.style.background = "#000"; e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "6px 6px 0 #000"; } }}
            >
              {submitting ? <Loader2 size={20} className="animate-spin" /> : <ShieldCheck size={20} />}
              Confirmar Fechamento da Aula
            </button>
          ) : (
            <button
              onClick={() => setShowReopenConfirm(true)}
              disabled={reopening}
              style={{
                flex: 1,
                height: 60,
                background: "#EF4444",
                color: "#FFF",
                border: "3px solid #000",
                fontWeight: 900,
                fontSize: 17,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                cursor: reopening ? "wait" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
                boxShadow: "6px 6px 0 rgba(0,0,0,0.15)",
                transition: "all 0.1s"
              }}
              onMouseEnter={e => { if (!reopening) { e.currentTarget.style.background = "#DC2626"; e.currentTarget.style.transform = "translate(-2px, -2px)"; } }}
              onMouseLeave={e => { if (!reopening) { e.currentTarget.style.background = "#EF4444"; e.currentTarget.style.transform = "none"; } }}
            >
              {reopening ? <Loader2 size={20} className="animate-spin" /> : <Unlock size={20} />}
              Reabrir Aula para Edição
            </button>
          )}
        </div>

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
            title="Aviso"
            message="Você está fechando uma aula sem alunos presentes. Deseja prosseguir?"
            confirmLabel="SIM, FECHAR AULA VAZIA"
            onConfirm={handleCloseClass}
            onCancel={() => setShowConfirmEmpty(false)}
            isDanger={true}
          />
        )}

        {/* ── MODAL DE MIGRAÇÃO ── */}
        {showMigrateModal && (
          <div style={{
            position: "fixed", inset: 0, zIndex: 1000,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(0,0,0,0.85)", backdropFilter: "blur(4px)"
          }}>
            <div style={{
              width: "90%", maxWidth: 1100, maxHeight: "85vh",
              background: "#FFF", border: "4px solid #000",
              boxShadow: "24px 24px 0 #000", padding: 40,
              display: "flex", flexDirection: "column", position: "relative"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 12 }}>
                    <h3 style={{ fontSize: 28, fontWeight: 900, textTransform: "uppercase", letterSpacing: "-0.02em" }}>Migrar Aluno</h3>
                    <div style={{ display: "flex", gap: 8 }}>
                      <div style={{ background: "#000", color: "#FFF", padding: "4px 12px", fontSize: 12, fontWeight: 900, textTransform: "uppercase" }}>
                        {DAY_LABELS[new Date(activeDate + "T12:00:00").getUTCDay()]}
                      </div>
                      <div style={{ background: "#F3F4F6", color: "#000", padding: "4px 12px", fontSize: 12, fontWeight: 900, border: "2px solid #000" }}>
                        {new Date(activeDate + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })}
                      </div>
                    </div>
                  </div>
                  
                  <p style={{ fontSize: 15, color: "#4B5563", fontWeight: 700 }}>
                    Selecione o novo horário de destino para este aluno na data acima.
                  </p>
                </div>
                <button 
                  onClick={() => setShowMigrateModal(null)} 
                  style={{ 
                    width: 44, height: 44, background: "#000", color: "#FFF", 
                    display: "flex", alignItems: "center", justifyContent: "center", 
                    border: "3px solid #000", cursor: "pointer", transition: "all 0.1s" 
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = "#FFF"; e.currentTarget.style.color = "#000"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "#000"; e.currentTarget.style.color = "#FFF"; }}
                >
                  <X size={24} strokeWidth={2.5} />
                </button>
              </div>
              
              <div style={{ 
                display: "grid", 
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", 
                gap: 16, 
                overflowY: "auto", 
                padding: "4px 4px 20px 4px" 
              }}>
                {daySlots
                  .filter(s => String(s.id) !== String(slot.id))
                  .sort((a,b) => a.time_start.localeCompare(b.time_start))
                  .map(target => (
                    <button
                      key={target.id}
                      disabled={isMigratingAction}
                      onClick={() => handleMigrateCheckin(target.id)}
                      style={{
                        padding: "20px 24px",
                        textAlign: "left",
                        background: "#FFF",
                        border: "3px solid #000",
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        cursor: isMigratingAction ? "wait" : "pointer",
                        transition: "all 0.1s",
                        boxShadow: "4px 4px 0 #000"
                      }}
                      onMouseEnter={e => { if (!isMigratingAction) { e.currentTarget.style.transform = "translate(-2px, -2px)"; e.currentTarget.style.boxShadow = "8px 8px 0 #000"; e.currentTarget.style.background = "#F9FAFB"; } }}
                      onMouseLeave={e => { if (!isMigratingAction) { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "4px 4px 0 #000"; e.currentTarget.style.background = "#FFF"; } }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                        <div style={{ background: "#000", color: "#FFF", padding: "8px 12px", fontSize: 18, fontWeight: 900, border: "2px solid #000" }}>
                          {formatTime(target.time_start)}
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 900, textTransform: "uppercase", color: "#000" }}>{target.name}</div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
                            {(() => {
                              const occKey = `${target.id}-${activeDate}`;
                              const currentOcc = occupancy[occKey] || 0;
                              const isFull = currentOcc >= target.capacity;
                              return (
                                <div style={{ 
                                  fontSize: 10, fontWeight: 800, textTransform: "uppercase", 
                                  background: isFull ? "#FEE2E2" : "#F3F4F6", 
                                  color: isFull ? "#991B1B" : "#6B7280",
                                  padding: "2px 6px", border: isFull ? "1px solid #DC2626" : "none"
                                }}>
                                  Ocupação: {currentOcc}/{target.capacity}
                                </div>
                              );
                            })()}
                            {(() => {
                              const sub = substitutions[`${target.id}-${activeDate}`];
                              const coachName = sub 
                                ? sub.full_name 
                                : (target.coach_name || target.profiles?.full_name);

                              return (
                                <div style={{ 
                                  fontSize: 10, fontWeight: 800, color: coachName ? "#059669" : "#DC2626", 
                                  textTransform: "uppercase", display: "flex", alignItems: "center", gap: 4 
                                }}>
                                  <User size={10} /> {coachName || "SEM PROFESSOR"}
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                      <ChevronRight size={20} strokeWidth={2.5} color="#9CA3AF" />
                    </button>
                  ))
                }
                {daySlots.filter(s => s.id !== slot.id).length === 0 && (
                  <div style={{ padding: 24, textAlign: "center", background: "#F3F4F6", border: "2px dashed #D1D5DB", borderRadius: 4 }}>
                    Nenhum outro horário disponível hoje.
                  </div>
                )}
              </div>

              {isMigratingAction && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginTop: 32, color: "#4B5563", fontWeight: 700 }}>
                  <Loader2 className="animate-spin" />
                  Processando Migração...
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── CUSTOM DELETE CONFIRM MODAL ── */}
        {showDeleteModal && (
          <div style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(0,0,0,0.85)", zIndex: 9999,
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 20, backdropFilter: "blur(4px)"
          }}>
            <div style={{
              width: "100%", maxWidth: 460,
              background: "#FFF", border: "4px solid #000",
              boxShadow: "12px 12px 0 #000",
              padding: 40, position: "relative"
            }}>
              <div style={{ width: 64, height: 64, background: "#FEE2E2", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24 }}>
                <UserMinus size={32} color="#DC2626" strokeWidth={2.5} />
              </div>

              <h2 style={{ fontSize: 24, fontWeight: 900, textTransform: "uppercase", marginBottom: 12, lineHeight: 1.1 }}>
                Remover Aluno?
              </h2>
              <p style={{ color: "#4B5563", fontSize: 16, lineHeight: 1.5, marginBottom: 32 }}>
                Você está prestes a remover o check-in de <strong style={{ color: "#000" }}>{showDeleteModal.name}</strong>. 
                Isso liberará a vaga instantaneamente para a fila de espera.
              </p>

              <div style={{ display: "flex", gap: 12 }}>
                <button
                  onClick={() => setShowDeleteModal(null)}
                  style={{
                    flex: 1, padding: "16px", fontWeight: 900, textTransform: "uppercase",
                    background: "#F3F4F6", border: "3px solid #000", cursor: "pointer",
                    transition: "all 0.1s"
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "4px 4px 0 #000"; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleDeleteCheckin(showDeleteModal.id)}
                  disabled={removingId === showDeleteModal.id}
                  style={{
                    flex: 2, padding: "16px", fontWeight: 900, textTransform: "uppercase",
                    background: "#DC2626", color: "#FFF", border: "3px solid #000", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    transition: "all 0.1s"
                  }}
                  onMouseEnter={e => { if (removingId !== showDeleteModal.id) { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "4px 4px 0 #000"; } }}
                  onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}
                >
                  {removingId === showDeleteModal.id ? <Loader2 className="animate-spin" /> : "Confirmar Remoção"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

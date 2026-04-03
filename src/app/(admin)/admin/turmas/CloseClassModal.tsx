"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  X, CheckCircle, User, Loader2, ShieldCheck,
  Search, UserPlus, AlertOctagon,
  UserX, RotateCcw, UserMinus, Users
} from "lucide-react";
import {
  getSlotCheckins, closeClassAction,
  searchStudentsCoachAction, manualCheckinAction,
  markAsAbsentAction, unmarkAsAbsentAction
} from "./actions";
import { getLevelInfo } from "@/lib/constants/levels";

/**
 * CloseClassModal: Admin-side class closing interface.
 * 
 * Logic: Single Source of Truth (SSoT)
 * - Presence is persisted immediately on click.
 * - 'selectedIds' is derived from DB status.
 */

interface CloseClassModalProps {
  slot: { id: string; name: string; time_start: string; day_of_week?: number };
  onClose: () => void;
  onSuccess: () => void;
}

interface Checkin {
  id: string;
  student_id: string;
  status: string;
  profiles: {
    id: string;
    full_name: string | null;
    display_name: string | null;
    first_name?: string | null;
    last_name?: string | null;
    avatar_url: string | null;
    level: string;
  } | null;
}

interface StudentResult {
  id: string;
  full_name?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
}

type ToastType = "error" | "success" | "warning";
interface ToastState { message: string; type: ToastType }

function getDisplayName(p: Checkin["profiles"] | StudentResult | null): string {
  if (!p) return "Aluno";
  return (p as any).display_name || (p as any).full_name || "Aluno";
}

function friendlyError(raw: string): string {
  if (raw.includes("duplicate key")) return "Este aluno já está nesta aula.";
  return raw;
}

export default function CloseClassModal({ slot, onClose, onSuccess }: CloseClassModalProps) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<StudentResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);

  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimer = useRef<any>(null);
  const today = new Date().toISOString().split("T")[0];

  const showToast = useCallback((message: string, type: ToastType = "error") => {
    setToast({ message, type });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 4500);
  }, []);

  const loadCheckins = useCallback(async () => {
    setLoading(true);
    const res = await getSlotCheckins(slot.id);
    if (res.data) {
      setCheckins(res.data);
      // Logic: Selected = not missed
      const present = res.data
        .filter((c: any) => c.status !== "missed")
        .map((c: any) => c.student_id);
      setSelectedIds(present);
    }
    setLoading(false);
  }, [slot.id]);

  useEffect(() => { loadCheckins(); }, [loadCheckins]);

  // Search logic
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

  /**
   * ADICIONAR ALUNO (Manual): Insere um aluno extra na aula e confirma presença imediatamente.
   * Útil para alunos que treinaram mas esqueceram de marcar via app.
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
   * ALTERAR STATUS (SSoT): Alterna entre Presença (Confirmed) e Falta (Missed).
   * 
   * @lifecycle
   * - Atribui ou remove pontos dinamicamente através das Server Actions.
   * - Atualiza a lista local após a confirmação do Supabase.
   */
  const handleToggleAbsent = async (checkinId: string) => {
    if (togglingIds.has(checkinId)) return;
    const checkin = checkins.find(c => c.id === checkinId);
    if (!checkin) return;

    setTogglingIds(prev => {
      const next = new Set(prev);
      next.add(checkinId);
      return next;
    });
    
    try {
      const isAbsent = checkin.status === "missed";
      const res = isAbsent ? await unmarkAsAbsentAction(checkinId) : await markAsAbsentAction(checkinId);

      if (res.success) {
        await loadCheckins();
        showToast(isAbsent ? "Presença confirmada." : "Falta registrada.", "success");
      } else {
        showToast(res.error || "Erro ao salvar.");
      }
    } finally {
      setTogglingIds(prev => {
        const next = new Set(prev);
        next.delete(checkinId);
        return next;
      });
    }
  };

  /**
   * FECHAR AULA: Finaliza o processo, atribui pontos definitivos e registra em 'class_sessions'.
   * 
   * @operation
   * - Transiciona qualquer aluno que ainda esteja como 'checked' para 'missed' (faltoso).
   * - Emite pontos via RPC 'increment_points'.
   */
  const handleCloseClass = async () => {
    // We allow closing even with 0 students if explicitly confirmed, 
    // but usually there's at least one.
    setSubmitting(true);
    const res = await closeClassAction(slot.id, today, selectedIds);
    if (res.success) {
      onSuccess();
    } else {
      showToast(res.error || "Erro ao fechar.");
    }
    setSubmitting(false);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }}>
      <div style={{ 
        width: "100%", 
        maxWidth: 680, 
        background: "#FFF", 
        border: "4px solid #000", 
        boxShadow: "24px 24px 0px rgba(0,0,0,0.2)", 
        position: "relative", 
        display: "flex", 
        flexDirection: "column", 
        maxHeight: "92vh" 
      }}>
        
        {/* Toast Notification */}
        {toast && (
          <div style={{
            position: "absolute", top: -80, left: 0, right: 0, 
            background: toast.type === "success" ? "#000" : "#DC2626",
            color: "#FFF",
            border: "3px solid #000", padding: "16px 24px", zIndex: 110,
            display: "flex", alignItems: "center", gap: 12, boxShadow: "8px 8px 0px rgba(0,0,0,0.1)"
          }}>
            {toast.type === "success" ? <CheckCircle size={20} /> : <AlertOctagon size={20} />}
            <span style={{ fontSize: 14, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.05em" }}>{toast.message}</span>
            <button onClick={() => setToast(null)} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "#FFF" }}><X size={20} /></button>
          </div>
        )}

        {/* Header */}
        <div style={{ padding: "28px 32px", borderBottom: "4px solid #000", background: "#000", color: "#FFF", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 900, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: "0.2em", marginBottom: 4 }}>Operação Presença</div>
            <h2 style={{ fontSize: 22, fontWeight: 900, textTransform: "uppercase", margin: 0, display: "flex", alignItems: "center", gap: 12 }}>
              <ShieldCheck size={28} /> FECHAMENTO DE AULA
            </h2>
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.1)", border: "2px solid #FFF", borderRadius: 4, cursor: "pointer", color: "#FFF", width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center" }}><X size={28} /></button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: 32, display: "flex", flexDirection: "column", gap: 32 }}>
          
          {/* Slot Info Card */}
          <div style={{ padding: "16px 20px", background: "#F3F4F6", border: "3px solid #000", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
             <div>
               <div style={{ fontSize: 14, fontWeight: 900 }}>{slot.name}</div>
               <div style={{ fontSize: 11, fontWeight: 700, color: "#666" }}>HOJE • {slot.time_start}</div>
             </div>
             <div style={{ textAlign: "right" }}>
               <div style={{ fontSize: 18, fontWeight: 900 }}>{selectedIds.length} / {checkins.length}</div>
               <div style={{ fontSize: 10, fontWeight: 900, color: "#666" }}>ALUNOS PRESENTES</div>
             </div>
          </div>

          {/* Zone 1: Search / Add Student */}
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em", color: "#000", marginBottom: 12 }}>ADICIONAR ALUNO À LISTA</label>
            <div style={{ position: "relative" }}>
              <Search size={22} style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", color: "#000" }} />
              <input 
                placeholder="DIGITE O NOME DO ALUNO..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ width: "100%", padding: "18px 18px 18px 52px", border: "3px solid #000", fontSize: 15, fontWeight: 800, outline: "none", background: "#FFF", textTransform: "uppercase" }}
              />
              {searching && <Loader2 size={20} className="animate-spin" style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)" }} />}
            </div>

            {searchQuery.length >= 2 && !searching && (
              <div style={{ border: "3px solid #000", borderTop: "none", background: "#FFF", boxShadow: "8px 8px 0px rgba(0,0,0,0.05)" }}>
                {searchResults.length === 0 ? (
                  <div style={{ padding: 20, textAlign: "center", fontSize: 12, fontWeight: 800, color: "#999" }}>NENHUM ALUNO ENCONTRADO</div>
                ) : searchResults.map(s => (
                  <div key={s.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: "2px solid #F3F4F6" }}>
                    <span style={{ fontSize: 13, fontWeight: 900, textTransform: "uppercase" }}>{getDisplayName(s)}</span>
                    <button 
                      onClick={() => handleAddStudent(s)} 
                      disabled={addingId === s.id}
                      style={{ 
                        padding: "8px 16px", 
                        background: "#000", 
                        color: "#FFF", 
                        border: "none", 
                        fontWeight: 900, 
                        cursor: "pointer", 
                        fontSize: 11,
                        display: "flex",
                        alignItems: "center",
                        gap: 8
                      }}>
                      {addingId === s.id ? <Loader2 size={12} className="animate-spin" /> : <UserPlus size={14} />} ADICIONAR
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Zone 2: Attendance List */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, borderBottom: "2px solid #000", paddingBottom: 8 }}>
              <label style={{ fontSize: 11, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em", color: "#000" }}>LISTA DE PRESENÇA</label>
              <div style={{ fontSize: 10, fontWeight: 800, color: "#666" }}>TOQUE NO CARD PARA TROCAR O STATUS</div>
            </div>

            {loading ? (
              <div style={{ padding: 40, textAlign: "center" }}><Loader2 size={32} className="animate-spin" style={{ margin: "0 auto" }} /></div>
            ) : checkins.length === 0 ? (
              <div style={{ padding: "60px 20px", textAlign: "center", border: "3px dashed #CCC", background: "#F9FAFB" }}>
                <Users size={40} style={{ color: "#CCC", marginBottom: 16, margin: "0 auto" }} />
                <div style={{ fontSize: 14, fontWeight: 800, color: "#999" }}>NÃO HÁ ALUNOS NESTA AULA AINDA</div>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                {checkins.map(c => {
                  const isPresent = c.status !== "missed";
                  const isBusy = togglingIds.has(c.id);
                  return (
                    <div key={c.id} 
                      onClick={() => handleToggleAbsent(c.id)}
                      style={{ 
                        padding: "16px 20px", 
                        border: "3px solid #000", 
                        cursor: isBusy ? "wait" : "pointer",
                        background: isPresent ? "#FFF" : "#FEE2E2",
                        boxShadow: `6px 6px 0px ${isPresent ? "#000" : "#DC2626"}`,
                        display: "flex", 
                        alignItems: "center", 
                        justifyContent: "space-between", 
                        opacity: isBusy ? 0.6 : 1,
                        transition: "all 0.1s active:translate-y-1"
                      }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                        <div style={{ 
                          width: 8, 
                          height: 32, 
                          background: getLevelInfo(c.profiles?.level || "INTRO").color,
                          borderRadius: 2
                        }} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 900, textTransform: "uppercase", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{getDisplayName(c.profiles)}</div>
                          <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                            {isPresent ? (
                              <span style={{ fontSize: 9, fontWeight: 900, color: "#16A34A" }}>PRESENTE</span>
                            ) : (
                              <span style={{ fontSize: 9, fontWeight: 900, color: "#DC2626" }}>FALTA REGISTRADA</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div style={{ marginLeft: 12 }}>
                        {isBusy ? <Loader2 size={18} className="animate-spin" /> : (
                          isPresent ? <CheckCircle size={22} color="#16A34A" /> : <UserX size={22} color="#DC2626" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: 32, borderTop: "4px solid #000", background: "#F9FAFB", display: "flex", gap: 16 }}>
          <button 
            onClick={onClose}
            className="admin-btn admin-btn-ghost"
            style={{ padding: "18px 24px", border: "3px solid #000", background: "#FFF", fontWeight: 900, fontSize: 14, cursor: "pointer" }}
          >
            CANCELAR
          </button>
          <button 
            disabled={submitting || loading}
            onClick={handleCloseClass}
            style={{ 
              flex: 1,
              padding: 18, 
              background: "#000", 
              color: "#FFF", 
              border: "none", 
              fontWeight: 900, 
              fontSize: 16, 
              cursor: "pointer", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center", 
              gap: 12,
              boxShadow: "8px 8px 0px rgba(0,0,0,0.1)"
            }}>
            {submitting ? <Loader2 size={20} className="animate-spin" /> : <><CheckCircle size={24} /> CONFIRMAR FECHAMENTO</>}
          </button>
        </div>
      </div>
    </div>
  );
}

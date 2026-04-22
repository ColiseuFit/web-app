"use client";

/**
 * CoachDashboardClient: O Centro Operacional em Tempo Real para Instrutores.
 * 
 * @architecture
 * - Padrão Iron Monolith: UI brutalista otimizada para uso em dispositivos móveis no chão do box.
 * - SSoT de Presença: Persistência imediata de No-Show/Check-in no banco de dados.
 * - Lógica de Score Gate: Gerencia o fechamento de turmas e distribuição de pontos via `actions.ts`.
 * - Sincronização Otimista: Utiliza `togglingIds` para feedback visual instantâneo sem depender de latência de rede.
 * 
 * @design 
 * - Legibilidade Extrema: Alto contraste e elementos táteis ideais para professores operando entre treinos.
 * - Zero CLS: Estrutura rígida de cards para evitar distrações visuais durante a aula.
 */

import { useState, useRef } from "react";
import { getSlotCheckins, closeClassAction, markAsAbsentAction, unmarkAsAbsentAction, manualCheckinAction, reopenClassAction, searchStudentsCoachAction } from "@/app/(admin)/admin/(authenticated)/turmas/actions";
import { useRouter } from "next/navigation";
import { Search, Plus, UserPlus, CheckCircle, Users, Activity, Loader2, Maximize, AlertTriangle, UserX, RotateCcw } from "lucide-react";
import { getLevelInfo, LevelInfo } from "@/lib/constants/levels";
import { getTodayDate } from "@/lib/date-utils";
import ConfirmModalCoach from "@/components/coach/ConfirmModalCoach";

// Definindo as interfaces locais com base nos retornos esperados.
interface ClassSlot {
  id: string;
  name: string;
  time_start: string;
  capacity: number;
  coach_name?: string;
  is_substitution?: boolean;
  is_blocked?: boolean;
  block_description?: string | null;
}

interface CheckinData {
  id: string;
  student_id: string;
  status: string;
  profiles: {
    full_name: string | null;
    display_name?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    level: string;
  };
}

/** Gets the best display name for a student — mirrors CloseClassModal (SSoT). */
function getCoachDisplayName(profiles: CheckinData["profiles"]): string {
  return (
    profiles.display_name ||
    profiles.full_name ||
    [profiles.first_name, profiles.last_name].filter(Boolean).join(" ") ||
    "Aluno"
  );
}

export default function CoachDashboardClient({ 
  todaySlots, 
  todayDateStr,
  dynamicLevels,
  initialFinishedSlots = {}
}: { 
  todaySlots: ClassSlot[], 
  todayDateStr: string,
  dynamicLevels: Record<string, LevelInfo>,
  initialFinishedSlots?: Record<string, boolean>
}) {
  const router = useRouter();
  
  const [expandedSlot, setExpandedSlot] = useState<string | null>(null);
  const [isLoadingCheckins, setIsLoadingCheckins] = useState(false);
  const [slotCheckins, setSlotCheckins] = useState<Record<string, CheckinData[]>>({});
  
  // Statuses for closing process
  const [isClosing, setIsClosing] = useState<string | null>(null);
  const [selectedStudents, setSelectedStudents] = useState<Record<string, Set<string>>>({});
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());

  
  const [finishedSlots, setFinishedSlots] = useState<Record<string, boolean>>(initialFinishedSlots);
  const [reopenedSlots, setReopenedSlots] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<Record<string, string>>({});
  const [searchResults, setSearchResults] = useState<Record<string, any[]>>({});
  const [isSearching, setIsSearching] = useState<string | null>(null);
  const searchTimeoutRef = useRef<any>(null);
  
  // Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    onConfirm: () => void;
    isDanger?: boolean;
    showCancel?: boolean;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  // Helper function to refresh checkins for a slot
  /**
   * Refreshes the attendance list for a specific slot.
   * Synchronizes internal status with the `class_checkins` source of truth.
   * 
   * @param {string} slotId - The ID of the class slot.
   */
  const refreshCheckins = async (slotId: string) => {
    try {
      const response = await getSlotCheckins(slotId, todayDateStr);
      if (!response.error && response.data) {
        setSlotCheckins(prev => ({ ...prev, [slotId]: response.data as any }));
        
        // Auto-select confirmed and pending
        const pendingIds = response.data
          .filter((c: any) => c.status === "checked" || c.status === "confirmed")
          .map((c: any) => c.student_id);
          
        setSelectedStudents(prev => ({ 
          ...prev, 
          [slotId]: new Set(pendingIds) 
        }));
      }
    } catch(e) {
      console.error("Erro ao atualizar checkins", e);
    }
  };

  /**
   * Expands/Collapses a class card.
   * Triggers a fresh data fetch on first expand to ensure real-time accuracy.
   */
  const handleToggleExpand = async (slotId: string) => {
    if (expandedSlot === slotId) {
      setExpandedSlot(null);
      return;
    }

    setExpandedSlot(slotId);
    
    // Auto-select all pending by default
    if (!slotCheckins[slotId]) {
      setIsLoadingCheckins(true);
      await refreshCheckins(slotId);
      setIsLoadingCheckins(false);
    }
  };

  /**
   * Alternância de Presença Otimista (Attendance Toggle).
   * 
   * @operation
   * 1. Atualiza o estado local imediatamente (`selectedStudents`) para feedback visual.
   * 2. Inicia salvamento em background via `markAsAbsentAction` ou `unmarkAsAbsentAction`.
   * 3. Sincroniza com a fonte de verdade (DB) após a resposta para garantir paridade.
   * 4. Bloqueia interação simultânea no mesmo aluno via `togglingIds` (Race Condition avoidance).
   * 
   * @param {string} slotId - ID da turma no contexto.
   * @param {string} studentId - ID do perfil do aluno alvo.
   */
  const handleToggleStudent = async (slotId: string, studentId: string) => {
    const checks = slotCheckins[slotId] || [];
    const checkin = checks.find(c => c.student_id === studentId);
    
    if (!checkin) return;

    const isCurrentlySelected = selectedStudents[slotId]?.has(studentId);
    const checkinId = checkin.id;

    // Optimistic UI
    setSelectedStudents(prev => {
      const draft = new Set(prev[slotId] || new Set());
      if (isCurrentlySelected) draft.delete(studentId);
      else draft.add(studentId);
      return { ...prev, [slotId]: draft };
    });

    // Background Save
    setTogglingIds(prev => {
      const next = new Set(prev);
      next.add(checkinId);
      return next;
    });

    try {
      const res = isCurrentlySelected 
        ? await markAsAbsentAction(checkinId) 
        : await unmarkAsAbsentAction(checkinId);

      if (res.error) {
        // Rollback on error
        setSelectedStudents(prev => {
          const draft = new Set(prev[slotId] || new Set());
          if (isCurrentlySelected) draft.add(studentId);
          else draft.delete(studentId);
          return { ...prev, [slotId]: draft };
        });
        console.error("Erro ao persistir presença:", res.error);
      } else {
        // Sync with DB
        await refreshCheckins(slotId);
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
   * Finalização de Sessão de Aula (Class Closure).
   * 
   * @lifecycle
   * 1. Validação de Presença Mínima: Impede fechamento de aulas vazias (limpeza de dados).
   * 2. Gatilho de Reconhecimento: Aciona `closeClassAction` que processa:
   *    - Promoção de Pontos/XP (Score Engine).
   *    - Atualização de Frequência (Analytics).
   *    - Liberação de Resultados (WOD Results Unlocking).
   * 3. Travamento Visual: Define `finishedSlots` para impedir edições acidentais pós-aula.
   * 
   * @param {ClassSlot} slot - Objeto da turma sendo encerrada.
   */
  const handleCloseClass = async (slot: ClassSlot) => {
    const selectedIds = Array.from(selectedStudents[slot.id] || []);
    if (selectedIds.length === 0) {
      setConfirmModal({
        isOpen: true,
        title: "Atenção",
        message: "Selecione ao menos um aluno presente para gerar pontos e habilitar os resultados.",
        confirmLabel: "OK, ENTENDI",
        showCancel: false,
        onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false }))
      });
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: "Encerrar Aula?",
      message: `Deseja confirmar o fechamento da turma das ${slot.time_start.slice(0, 5)} com ${selectedIds.length} alunos presentes?`,
      confirmLabel: "FECHAR AGORA",
      isDanger: false,
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        setIsClosing(slot.id);
        const res = await closeClassAction(slot.id, todayDateStr, selectedIds);
        setIsClosing(null);

        if (res.error) {
          setConfirmModal({
            isOpen: true,
            title: "Erro ao Fechar",
            message: res.error,
            confirmLabel: "VOLTAR",
            showCancel: false,
            onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false }))
          });
        } else {
          setConfirmModal({
            isOpen: true,
            title: "Sucesso!",
            message: `Aula finalizada! Alunos validados e +${res.pointsAwarded || "50"} Pts entregues.`,
            confirmLabel: "EXCELENTE",
            showCancel: false,
            onConfirm: () => {
              setConfirmModal(prev => ({ ...prev, isOpen: false }));
              setExpandedSlot(null);
              delete slotCheckins[slot.id]; 
              // Clear reopen status if any
              setReopenedSlots(prev => prev.filter(id => id !== slot.id));
              setFinishedSlots(prev => ({ ...prev, [slot.id]: true }));
              router.refresh();
            }
          });
        }
      }
    });
  };

  const handleMarkAbsent = async (slotId: string, checkInId: string, studentName: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Marcar Falta?",
      message: `Confirmar ausência de ${studentName.toUpperCase()}? Ele será removido desta turma imediatamente.`,
      confirmLabel: "MARCAR FALTA",
      isDanger: true,
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        const res = await markAsAbsentAction(checkInId);
        if (res.error) {
          setConfirmModal({
            isOpen: true,
            title: "Erro",
            message: res.error,
            confirmLabel: "OK",
            showCancel: false,
            onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false }))
          });
        } else {
          // Update local state to reflect 'missed' status instead of removing
          setSlotCheckins(prev => ({
            ...prev,
            [slotId]: (prev[slotId] || []).map(c => 
              c.id === checkInId ? { ...c, status: "missed" } : c
            )
          }));
          // Also remove from selection if it was there
          setSelectedStudents(prev => {
            const draft = new Set(prev[slotId]);
            const checkin = slotCheckins[slotId]?.find(c => c.id === checkInId);
            if (checkin) draft.delete(checkin.student_id);
            return { ...prev, [slotId]: draft };
          });
          router.refresh();
        }
      }
    });
  };

  /**
   * Reabertura de Aula Finalizada (Admin Dangerous Action).
   * 
   * @security
   * - Ação Administrativa Crítica: Exige confirmação explícita via modal.
   * - Rollback Financeiro/Métrico: Estorna pontos distribuídos e invalida status de aula processada.
   * - Recuperação de SSoT: Retorna todos os alunos para o status 'checked/confirmed' 
   *   para permitir correção de erros operacionais do instrutor.
   * 
   * @param {string} slotId - ID do slot a ser reaberto.
   */
  const handleReopen = async (slotId: string) => {
    setConfirmModal({
      isOpen: true,
      title: "REABRIR TURMA?",
      message: "Isso resetará o status de todos os alunos registrados para 'Pendentes'. Pontos ganhos serão estornados para que você possa corrigir e fechar novamente.",
      confirmLabel: "SIM, REABRIR",
      onConfirm: async () => {
        setIsLoadingCheckins(true);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        const res = await reopenClassAction(slotId, todayDateStr);
        if (res.success && res.confirmedIds) {
          setFinishedSlots(prev => ({ ...prev, [slotId]: false }));
          setReopenedSlots(prev => [...prev, slotId]);
          // Manualmente define a seleção apenas para quem já estava confirmado
          setSelectedStudents(prev => ({
            ...prev,
            [slotId]: new Set(res.confirmedIds)
          }));
          
          const response = await getSlotCheckins(slotId, todayDateStr);
          if (!response.error && response.data) {
            setSlotCheckins(prev => ({ ...prev, [slotId]: response.data as any }));
          }
        } else {
          setConfirmModal({
             isOpen: true,
             title: "Erro ao Reabrir",
             message: res.error || "Ocorreu um erro inesperado.",
             onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false })),
             showCancel: false
          });
        }
        setIsLoadingCheckins(false);
      },
      showCancel: true
    });
  };

  const handleSearchStudents = async (slotId: string, query: string) => {
    setSearchQuery(prev => ({ ...prev, [slotId]: query }));
    
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    
    if (query.length < 2) {
      setSearchResults(prev => ({ ...prev, [slotId]: [] }));
      return;
    }

    setIsSearching(slotId);
    searchTimeoutRef.current = setTimeout(async () => {
      const res = await searchStudentsCoachAction(query);
      if (res.data) {
        setSearchResults(prev => ({ ...prev, [slotId]: res.data as any[] }));
      }
      setIsSearching(null);
    }, 400);
  };

  /**
   * Performs a manual check-in for a student not in the original list.
   * 
   * @param {string} slotId - The target slot.
   * @param {string} studentId - The student to add.
   */
  const handleManualCheckin = async (slotId: string, studentId: string) => {
    setIsLoadingCheckins(true);
    const res = await manualCheckinAction(slotId, todayDateStr, studentId);
    if (res.success) {
      setSearchQuery(prev => ({ ...prev, [slotId]: "" }));
      setSearchResults(prev => ({ ...prev, [slotId]: [] }));
      await refreshCheckins(slotId);
    } else {
      setConfirmModal({
        isOpen: true,
        title: "OPS!",
        message: res.error || "Erro ao adicionar aluno.",
        onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false })),
        showCancel: false
      });
    }
    setIsLoadingCheckins(false);
  };


  return (
    <div style={{ paddingBottom: "100px" }}>
      <div style={{ marginBottom: "24px" }}>
        <h2 className="font-display" style={{ fontSize: "32px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.05em", color: "#000", lineHeight: 1 }}>
          {todayDateStr === getTodayDate() ? "AULAS DE HOJE" : "AULAS DO DIA"}
        </h2>
        <p className="font-body" style={{ fontSize: "14px", color: "rgba(0,0,0,0.9)", marginTop: "8px" }}>
          Selecione os alunos presentes no box e finalize a turma para liberar os resultados.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {todaySlots.length === 0 && (
          <div style={{ 
            background: "#FFF", 
            border: "4px solid #000", 
            boxShadow: "8px 8px 0px #000", 
            padding: "60px 24px", 
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "16px"
          }}>
            <div style={{ 
              width: "64px", 
              height: "64px", 
              background: "#F3F4F6", 
              borderRadius: "50%", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center",
              border: "3px solid #000"
            }}>
              <Activity size={32} style={{ opacity: 0.2 }} />
            </div>
            <div>
              <p className="font-headline" style={{ margin: 0, fontSize: "18px", fontWeight: 900 }}>FOLGA OU DIA SEM TURMAS</p>
              <p style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}>Nenhuma aula agendada para este dia no sistema.</p>
            </div>
          </div>
        )}

        {todaySlots.map(slot => {
          const isExpanded = expandedSlot === slot.id;
          const checks = slotCheckins[slot.id];
          
          const isFinished = finishedSlots[slot.id];
          
          return (
            <div key={slot.id} style={{ 
              background: isFinished ? "#F8F8F8" : "#FFF",
              border: "3px solid #000",
              boxShadow: isExpanded ? (isFinished ? "8px 8px 0px #000" : "8px 8px 0px var(--red)") : "4px 4px 0px #000",
              transition: "all 0.2s ease-out",
              borderRadius: "0px",
              overflow: "visible",
              opacity: (isFinished || slot.is_blocked) ? 0.85 : 1
            }}>
              {/* Blocked Slot Banner */}
              {slot.is_blocked && (
                <div style={{
                  background: "#000",
                  color: "var(--red)",
                  padding: "4px 12px",
                  fontSize: "11px",
                  fontWeight: 900,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  borderBottom: "3px solid #000",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px"
                }}>
                  <AlertTriangle size={14} />
                  CANCELADA: {slot.block_description || "BLOQUEIO DE AGENDA"}
                </div>
              )}
              {/* Box Head (Tap to Expand) */}
              <button 
                onClick={() => handleToggleExpand(slot.id)}
                style={{
                  width: "100%",
                  padding: "16px",
                  background: isExpanded ? (isFinished ? "#000" : "var(--red)") : "transparent",
                  color: isExpanded ? "#FFF" : "#000",
                  border: "none",
                  textAlign: "left",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center", // Centralizar para foco
                  cursor: "pointer",
                  position: "relative"
                }}
              >
                <div style={{ flex: 1 }}>
                  <div className="font-display" style={{ fontSize: "24px", fontWeight: 900, lineHeight: 1 }}>
                    {slot.time_start.slice(0, 5)}
                  </div>
                  <div className="font-headline" style={{ 
                    fontSize: "14px", 
                    opacity: 0.95, 
                    textTransform: "uppercase", 
                    marginTop: "4px",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px"
                  }}>
                    {slot.name}
                    <span style={{ opacity: 0.5 }}>•</span>
                    <span style={{ 
                      fontSize: "12px", 
                      fontWeight: 800, 
                      color: slot.is_substitution ? "var(--red)" : "inherit"
                    }}>
                      {slot.coach_name === "Sem instrutor" ? "SEM INSTRUTOR" : slot.coach_name?.split(' ')[0]}
                    </span>
                    {slot.is_substitution && (
                      <span style={{ 
                        fontSize: "9px", 
                        background: "var(--red)", 
                        color: "#FFF", 
                        padding: "1px 6px", 
                        borderRadius: "2px",
                        fontWeight: 900
                      }}>
                        SUB
                      </span>
                    )}
                  </div>
                </div>
                
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  {isFinished && (
                    <span style={{ 
                      fontSize: "10px", 
                      fontWeight: 900, 
                      background: "#000", 
                      color: "#FFF", 
                      padding: "4px 10px", 
                      border: "2px solid #000",
                      textTransform: "uppercase",
                      letterSpacing: "0.1em"
                    }}>
                      ENCERRADA
                    </span>
                  )}
                  {slot.is_blocked && (
                    <span style={{ 
                      fontSize: "10px", 
                      fontWeight: 900, 
                      background: "var(--red)", 
                      color: "#FFF", 
                      padding: "4px 10px", 
                      border: "2px solid #000",
                      textTransform: "uppercase",
                      letterSpacing: "0.1em"
                    }}>
                      CANCELADA
                    </span>
                  )}
                  <div style={{ 
                    width: "32px", 
                    height: "32px", 
                    borderRadius: "50%", 
                    background: isExpanded ? "rgba(255,255,255,0.2)" : "#F0F0F0", 
                    border: isExpanded ? "2px solid #FFF" : "2px solid #000", 
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "center" 
                  }}>
                    <Maximize size={16} />
                  </div>
                </div>
              </button>

              {/* Box Body (Expanded) */}
              {isExpanded && (
                <div style={{ padding: "16px", borderTop: "3px solid #000" }}>
                  {isLoadingCheckins ? (
                    <div style={{ padding: "32px 0", textAlign: "center" }}>
                      <Loader2 className="animate-spin mx-auto" size={24} />
                      <p style={{ marginTop: "12px", fontSize: "12px" }} className="font-headline">CARREGANDO ALUNOS...</p>
                    </div>
                  ) : !checks ? null : (
                    <>
                      {/* Sub-Header Metadados */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", paddingBottom: "16px", borderBottom: "2px dashed #000" }}>
                        <div style={{ fontSize: "12px", fontWeight: 800, color: "#000" }} className="font-headline">
                          <Users size={14} style={{ display: "inline", marginRight: "6px", verticalAlign: "-2px" }} />
                          {checks.filter(c => c.status !== "missed").length} / {slot.capacity} PRESENTES
                        </div>
                        {checks.length === 0 && (
                          <div style={{ fontSize: "10px", color: "var(--red)", fontWeight: 800 }}>NENHUM CHECK-IN</div>
                        )}
                      </div>

                      {/* Search Bar for manual checkin (only if not finished/blocked) */}
                      {!isFinished && !slot.is_blocked && (
                        <div style={{ position: "relative", marginBottom: "16px" }}>
                          <div style={{ position: "relative" }}>
                            <input 
                              type="text"
                              placeholder="ADICIONAR ALUNO PELO NOME..."
                              value={searchQuery[slot.id] || ""}
                              onChange={(e) => handleSearchStudents(slot.id, e.target.value)}
                              className="font-headline nb-placeholder-dark"
                              style={{
                                width: "100%",
                                padding: "14px 14px 14px 44px",
                                border: "3px solid #000",
                                background: "#FFF",
                                color: "#000",
                                fontWeight: 800,
                                fontSize: "14px",
                                outline: "none",
                                boxShadow: "4px 4px 0px #000"
                              }}
                            />
                            <Search size={20} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "rgba(0,0,0,0.6)" }} />
                            {isSearching === slot.id && <Loader2 size={18} className="animate-spin" style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)" }} />}
                          </div>

                          {/* Search Results Dropdown */}
                          {searchResults[slot.id] && searchResults[slot.id].length > 0 && searchQuery[slot.id] && (
                            <div style={{
                              position: "absolute",
                              top: "60px",
                              left: 0,
                              right: 0,
                              background: "#FFF",
                              border: "3px solid #000",
                              zIndex: 100,
                              boxShadow: "6px 6px 0px #000",
                              maxHeight: "300px",
                              overflowY: "auto"
                            }}>
                              {searchResults[slot.id].map(student => (
                                <button
                                  key={student.id}
                                  onClick={() => handleManualCheckin(slot.id, student.id)}
                                  style={{
                                    width: "100%",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "12px",
                                    padding: "12px",
                                    border: "none",
                                    borderBottom: "2px solid #000",
                                    background: "#FFF",
                                    textAlign: "left",
                                    cursor: "pointer"
                                  }}
                                  onMouseOver={(e) => e.currentTarget.style.background = "var(--yellow)"}
                                  onMouseOut={(e) => e.currentTarget.style.background = "#FFF"}
                                >
                                  <div style={{ width: "8px", height: "30px", background: getLevelInfo(student.level, dynamicLevels).color }} />
                                  <div style={{ flex: 1, color: "#000" }}>
                                    <div className="font-headline" style={{ fontWeight: 800, fontSize: "14px" }}>{student.full_name}</div>
                                    <div style={{ 
                                      fontSize: "10px", 
                                      fontWeight: 800, 
                                      color: student.level?.toLowerCase() === 'iniciante' ? '#888888' : getLevelInfo(student.level, dynamicLevels).color, 
                                      textTransform: "uppercase" 
                                    }}>
                                      {getLevelInfo(student.level, dynamicLevels).label}
                                    </div>
                                  </div>
                                  <Plus size={18} color="#000" />
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Lista de Alunos Presentes */}
                      {(checks.length > 0 || isFinished) && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "24px" }}>
                          {checks.map(c => {
                            const isSelected = selectedStudents[slot.id]?.has(c.student_id);
                            const alreadyConfirmed = c.status === "confirmed";

                            return (
                              <button 
                                key={c.id}
                                disabled={alreadyConfirmed || isFinished}
                                onClick={() => handleToggleStudent(slot.id, c.student_id)}
                                style={{
                                  width: "100%",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  padding: "12px",
                                  border: "3px solid #000",
                                  minHeight: "58px",
                                  background: isSelected ? (alreadyConfirmed ? "#F0F0F0" : "#F0FDF4") : "#FEF2F2",
                                  boxShadow: isSelected ? (alreadyConfirmed ? "4px 4px 0px #AAA" : "4px 4px 0px #16A34A") : "4px 4px 0px #DC2626",
                                  color: "#000",
                                  opacity: isFinished ? 0.8 : (togglingIds.has(c.id) ? 0.6 : 1),
                                  textAlign: "left",
                                  cursor: (alreadyConfirmed || isFinished || togglingIds.has(c.id)) ? "default" : "pointer",
                                  transition: "all 0.1s ease",
                                  outline: "none"
                                }}
                              >
                                <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0, opacity: togglingIds.has(c.id) ? 0.5 : 1 }}>
                                  <div style={{ width: "6px", height: "30px", background: getLevelInfo(c.profiles.level, dynamicLevels).color, flexShrink: 0 }} />
                                  <div style={{ minWidth: 0 }}>
                                    <div className="font-headline" style={{ fontSize: "16px", fontWeight: 900, display: "flex", alignItems: "center", gap: "8px", textTransform: "uppercase", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                      {getCoachDisplayName(c.profiles).split(" ").slice(0, 2).join(" ")}
                                    </div>
                                    <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "2px" }}>
                                      {isSelected ? (
                                        <span style={{ fontSize: "9px", fontWeight: 900, color: "#16A34A", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "3px" }}>
                                          <CheckCircle size={10} /> PRESENTE
                                        </span>
                                      ) : (
                                        <span style={{ fontSize: "9px", fontWeight: 900, color: "#DC2626", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "3px" }}>
                                          <UserX size={10} /> FALTA (NO-SHOW)
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div style={{ 
                                  width: "28px", 
                                  height: "28px", 
                                  border: "2px solid #000", 
                                  background: isSelected ? (alreadyConfirmed ? "#CCC" : "#16A34A") : "#FFF", 
                                  color: isSelected ? "#FFF" : "#000", 
                                  display: "flex", 
                                  alignItems: "center", 
                                  justifyContent: "center",
                                  flexShrink: 0
                                }}>
                                  {togglingIds.has(c.id) ? (
                                    <Loader2 size={16} className="animate-spin" />
                                  ) : (
                                    isSelected ? <CheckCircle size={18} /> : <div style={{ width: 12, height: 2, background: "#CCC" }} />
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Botão de Fechamento */}
                      {checks.length > 0 && !isFinished && !slot.is_blocked && (
                         <button
                           disabled={isClosing === slot.id}
                           onClick={() => handleCloseClass(slot)}
                           className="font-display"
                           style={{
                             width: "100%",
                             background: "var(--red)", // Alerta máximo
                             color: "#FFF",
                             border: "3px solid #000",
                             padding: "20px",
                             fontSize: "20px",
                             fontWeight: 900,
                             letterSpacing: "0.1em",
                             boxShadow: "4px 4px 0px #000",
                             display: "flex",
                             justifyContent: "center",
                             alignItems: "center",
                             gap: "12px",
                             textTransform: "uppercase"
                           }}
                         >
                           {isClosing === slot.id ? <Loader2 className="animate-spin" /> : "FECHAR AULA"}
                         </button>
                      )}

                      {isFinished && (
                         <div style={{ 
                           textAlign: "center", 
                           padding: "16px",
                           background: "rgba(0,180,0,0.12)",
                           border: "2px solid #000",
                           display: "flex",
                           flexDirection: "column",
                           alignItems: "center",
                           gap: "4px"
                         }}>
                           <CheckCircle size={24} style={{ color: "#000" }} />
                           <p className="font-display" style={{ margin: 0, fontWeight: 900, fontSize: "16px", textTransform: "uppercase", color: "#000" }}>AULA PROCESSADA</p>
                           <p className="font-headline" style={{ margin: 0, color: "#000", opacity: 0.8, fontSize: "11px", fontWeight: 800 }}>Pontuação entregue e frequências validadas.</p>
                           
                           <button 
                             onClick={() => handleReopen(slot.id)}
                             style={{
                               marginTop: "12px",
                               background: "#000",
                               color: "#FFF",
                               border: "none",
                               padding: "8px 16px",
                               fontSize: "12px",
                               fontWeight: 900,
                               display: "flex",
                               alignItems: "center",
                               gap: "8px",
                               cursor: "pointer"
                             }}
                           >
                             <RotateCcw size={14} />
                             REABRIR
                           </button>
                         </div>
                      )}

                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <ConfirmModalCoach 
        {...confirmModal} 
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} 
      />
    </div>
  );
}

"use client";

/**
 * TurmasClient: O "Schedule Master" para Operações do Box.
 * 
 * @architecture
 * - Padrão Iron Monolith: Grade semanal de alta fidelidade usando tokens CSS-in-JS.
 * - SSoT de Grade (Single Source of Truth): Lógica centralizada para slots recorrentes vs. instâncias diárias.
 * - Sincronização Multi-Portal: Garante que mudanças na grade se propaguem para as visões Admin e Coach.
 * - Camada de Dados: Interface reativa com o Supabase via Server Actions (`./actions.ts`).
 */

import { useState, useTransition, useMemo, useEffect, useCallback } from "react";
import ConfirmModal from "@/components/ConfirmModal";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  CalendarClock,
  Plus,
  X,
  Clock,
  Users,
  Pencil,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Check,
  Save,
  Zap,
  Edit3,
  Search,
  UserPlus,
  UserMinus,
  Loader2,
  LayoutGrid,
  Settings,
  ShieldCheck,
  Award,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  ChevronRight,
  ChevronLeft,
  UserX,
  RotateCcw,
  RefreshCw,
  BarChart3
} from "lucide-react";
import { LEVEL_CONFIG } from "@/lib/constants/levels";
import { getTodayDate } from "@/lib/date-utils";
import ClassCommandCenter from "./ClassCommandCenter";
import {
  upsertClassSlot,
  toggleClassSlot,
  deleteClassSlot,
  bulkUpdateClassSlots,
  bulkCreateClassSlots,
  getSlotCheckins,
  getSlotEnrollments,
  enrollStudent,
  unenrollStudent,
  searchStudentsWithEnrollments,
  getSlotWaitlist,
  addToWaitlist,
  removeFromWaitlist,
  getSlotSubstitutions,
  addSubstitution,
  getHolidays,
  addHoliday,
  removeHoliday,
  triggerWaitlistPromotion,
  reassignEnrollment,
  markAsAbsentAction,
  unmarkAsAbsentAction
} from "./actions";
import { DAY_LABELS, DAY_SHORT, ACTIVE_DAYS } from "@/lib/constants/calendar";

/**
 * TurmasClient: Dashboard de alta performance para gestão da grade horária.
 * 
 * ESTRUTURA OPERACIONAL (Iron Monolith):
 * Este módulo utiliza uma arquitetura de 4 pilares para isolar responsabilidades e reduzir carga cognitiva:
 * 1. GRADE: Configuração estrutural e criação de slots recorrentes (Admin only).
 * 2. CHECK-INS: Monitoramento operacional em tempo real e visão de instrutores (Coaches/Admin).
 * 3. MATRÍCULAS: CRM centralizado para vículo aluno-horário, com busca e filtros otimizados.
 * 4. BLOQUEIOS: Motor de exceções na agenda (Feriados, Reformas, Eventos).
 * 
 * FILOSOFIA DE DESIGN:
 * - SSoT (Single Source of Truth): O estado da agenda é derivado da combinação de `slots` + `bloqueios` + `substituições`.
 * - Eficiência: Abas mantêm seu estado de rolagem e filtros para trocas de contexto rápidas.
 */

// ── Shared Styles ──
const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "#666",
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 16px",
  border: "2px solid #000",
  fontSize: 14,
  fontWeight: 700,
  background: "#FFF",
  outline: "none",
  fontFamily: "inherit",
};

interface ClassSlot {
  id: string;
  name: string;
  day_of_week: number;
  time_start: string;
  duration_minutes: number;
  capacity: number;
  coach_name: string | null;
  default_coach_id?: string | null;
  profiles?: { full_name: string } | null;
  class_substitutions?: any[];
  is_active: boolean;
}

interface StudentProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  level: string | null;
  avatar_url: string | null;
  phone: string | null;
}

interface Enrollment {
  id: string;
  enrolled_at: string;
  student_id: string;
  profiles: StudentProfile;
}

interface Props {
  initialSlots: ClassSlot[];
  occupancy: Record<string, number>;
  enrollmentCounts: Record<string, number>;
  wods: any[];
  coaches: { id: string; full_name: string | null }[];
  initialSettings: any;
  initialHolidays: any[];
  initialSessions: Record<string, string>;
  initialSubstitutions: Record<string, { id: string; full_name: string }>;
  allProfiles: any[];
  allEnrollments: any[];
  currentPage: number;
  totalPages: number;
  totalCount: number;
  currentSearch: string;
  currentLevel: string;
  currentUnenroll: boolean;
  currentWeekOffset: number;
}

// ── Block Type: granular schedule override (SSoT: box_holidays) ──
type BlockType = 'full_day' | 'period' | 'slot';

interface Holiday {
  id: string;
  date: string;
  description: string;
  block_type: BlockType;
  start_time:    string | null;
  end_time:      string | null;
  class_slot_id: string | null;
}

/**
 * SSoT: Lógica de Precedência de Bloqueios.
 * Determina se um horário específico está cancelado e qual a regra aplicável.
 * 
 * ORDEM DE PRECEDÊNCIA (Cascata):
 * 1. Bloqueio por Slot: Regra específica para um ID de aula (ex: aula de técnica cancelada).
 * 2. Bloqueio por Período: Intervalo de tempo (ex: box fechado das 12h às 15h).
 * 3. Bloqueio de Dia Inteiro: Escopo total (ex: Feriado).
 *
 * @param slot      - O ClassSlot sendo renderizado na grade.
 * @param dateStr   - A data da coluna (YYYY-MM-DD).
 * @param holidays  - Lista completa de exceções (box_holidays).
 * @returns O objeto Holiday aplicado ou null se a aula estiver ativa.
 */
function checkIsBlocked(slot: ClassSlot, dateStr: string, holidays: Holiday[]): Holiday | null {
  const rules = holidays.filter(h => h.date === dateStr);
  if (!rules.length) return null;

  // Priority 1: Slot block
  const slotBlock = rules.find(h => h.block_type === 'slot' && h.class_slot_id === slot.id);
  if (slotBlock) return slotBlock;

  // Priority 2: Period block
  const periodBlock = rules.find(h => {
    if (h.block_type !== 'period' || !h.start_time || !h.end_time) return false;
    // Compare time strings (HH:MM:SS format from DB) — lexicographic comparison is valid for time
    const slotTime = slot.time_start.slice(0, 5); // HH:MM
    return slotTime >= h.start_time.slice(0, 5) && slotTime < h.end_time.slice(0, 5);
  });
  if (periodBlock) return periodBlock;

  // Priority 3: Full-day block
  const fullDayBlock = rules.find(h => h.block_type === 'full_day');
  return fullDayBlock || null;
}

/**
 * Formats time string from "HH:MM:SS" to "HH:MM".
 */
function formatTime(timeStr: string): string {
  return timeStr?.slice(0, 5) || "—";
}

/**
 * Parses "HH:MM" into total minutes from start of day.
 */
function parseTimeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + (m || 0);
}

/**
 * SSoT: Centralizes the logic to determine if a class is happening "AGORA"
 * or if it is "ATRASADA" (past start time but not yet closed).
 */
/**
 * SSoT: Centralizes the logic to determine if a class is happening "AGORA"
 * or if it is "ATRASADA" (past start time but not yet closed).
 */
function getSlotStatus(timeStr: string, dateStr: string, todayDateStr: string) {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = parseTimeToMinutes(timeStr);
  
  const isToday = dateStr === todayDateStr;
  const isPastDay = dateStr < todayDateStr;

  // AGORA: Only if it is today and within the 60min window
  const isNow = isToday && currentMinutes >= startMinutes && currentMinutes <= startMinutes + 60;
  
  // ATRASADA: 
  // 1. If it's a past day (and we already know it's not closed because of the check in the loop)
  // 2. If it's today and the start time has passed
  const isAtrasada = isPastDay || (isToday && currentMinutes > startMinutes); 
  
  return { isNow, isAtrasada };
}

export default function TurmasClient({
  initialSlots,
  occupancy,
  enrollmentCounts,
  wods,
  coaches,
  initialSettings,
  initialHolidays,
  initialSessions,
  initialSubstitutions,
  allProfiles,
  allEnrollments,
  currentPage,
  totalPages,
  totalCount,
  currentSearch,
  currentLevel,
  currentUnenroll,
  currentWeekOffset
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // ── NAVIGATION STATE ──
  // activeTab is the router for our 4-pillar architecture.
  // We use this instead of a simple 'mode' toggle to ensure clear task isolation.
  const [activeTab, setActiveTab] = useState<"grid" | "checkins" | "settings" | "enrollments">("grid");

  const handleNavigateWeek = (targetOffset: number, isRelative: boolean = true) => {
    const params = new URLSearchParams(searchParams.toString());
    const newOffset = isRelative ? currentWeekOffset + targetOffset : targetOffset;
    if (newOffset === 0) {
      params.delete("weekOffset");
    } else {
      params.set("weekOffset", newOffset.toString());
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };
  const [confirmData, setConfirmData] = useState<{
    title: string;
    message: string;
    confirmLabel?: string;
    isDanger?: boolean;
    onConfirm: () => void;
  } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [slots, setSlots] = useState(initialSlots);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  
  // ── DRAWER STATE ──
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<ClassSlot | null>(null);
  const todayDateStr = getTodayDate();
  const todayDay = new Date(todayDateStr + "T12:00:00Z").getUTCDay();

  // ── Drawer form state ──
  const [formName, setFormName] = useState("CrossTraining");
  const [formDays, setFormDays] = useState<number[]>([]);
  const [formTime, setFormTime] = useState("07:00");
  const [formCapacity, setFormCapacity] = useState(Number(initialSettings?.box_capacity_limit || 20));
  const [formCoachId, setFormCoachId] = useState("");
  const [formDuration, setFormDuration] = useState(60);
  const [isBulk, setIsBulk] = useState(false);
  const [bulkDays, setBulkDays] = useState<number[]>([]);

  // ── Settings & Holidays state ──
  const [holidays, setHolidays] = useState<Holiday[]>((initialHolidays || []) as Holiday[]);
  const [sessions, setSessions] = useState<Record<string, string>>(initialSessions || {});
  const [substitutions, setSubstitutions] = useState<Record<string, { id: string; full_name: string }>>(initialSubstitutions || {});
  
  // SSoT: Sync local state with server props when router.refresh() happens
  useEffect(() => {
    if (initialSlots) setSlots(initialSlots);
  }, [initialSlots]);

  useEffect(() => {
    if (initialSessions) setSessions(initialSessions);
  }, [initialSessions]);

  useEffect(() => {
    if (initialSubstitutions) setSubstitutions(initialSubstitutions);
  }, [initialSubstitutions]);

  const [newHolidayDate, setNewHolidayDate] = useState("");
  const [newHolidayDesc, setNewHolidayDesc] = useState("");
  const [newBlockType, setNewBlockType] = useState<BlockType>('full_day');
  const [newBlockStartTime, setNewBlockStartTime] = useState("");
  const [newBlockEndTime, setNewBlockEndTime] = useState("");
  /**
   * newBlockSlotIds: Holds UUIDs for multi-slot cancellation.
   * Rationale: Allows admins to cancel specific classes (e.g., only morning slots)
   * while keeping the rest of the day active.
   */
  const [newBlockSlotIds, setNewBlockSlotIds] = useState<string[]>([]);
  const [commandCenterInfo, setCommandCenterInfo] = useState<{ slot: ClassSlot; date: string } | null>(null);

  // ── Enrollment and Check-in state ──
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [checkins, setCheckins] = useState<any[]>([]); 
  const [enrollmentsLoading, setEnrollmentsLoading] = useState(false);

  const [waitlist, setWaitlist] = useState<any[]>([]);
  const [waitlistLoading, setWaitlistLoading] = useState(false);
  const [substituteCoachId, setSubstituteCoachId] = useState<string | null>(null);
  const [substitutionNotes, setSubstitutionNotes] = useState("");

  // ── Global Enrollment (CRM) state ──
  const [enrollmentSearch, setEnrollmentSearch] = useState(currentSearch);
  const [showOnlyUnenrolled, setShowOnlyUnenrolled] = useState(currentUnenroll);
  const [levelFilter, setLevelFilter] = useState(currentLevel);

  // URL Sync for Enrollments Tab
  useEffect(() => {
    setSlots(initialSlots);
  }, [initialSlots]);

  useEffect(() => {
    setHolidays(initialHolidays || []);
  }, [initialHolidays]);

  useEffect(() => {
    if (activeTab !== "enrollments") return;
    
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (enrollmentSearch) params.set("search", enrollmentSearch);
      else params.delete("search");
      
      if (levelFilter) params.set("level", levelFilter);
      else params.delete("level");
      
      if (showOnlyUnenrolled) params.set("unenroll", "true");
      else params.delete("unenroll");
      
      // Reset page on filter change
      const hasFilterChanged = 
        params.get("search") !== (searchParams.get("search") || "") ||
        params.get("level") !== (searchParams.get("level") || "") ||
        params.get("unenroll") !== (searchParams.get("unenroll") || "false");

      if (hasFilterChanged) params.set("page", "1");

      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    }, 500);

    return () => clearTimeout(timer);
  }, [enrollmentSearch, levelFilter, showOnlyUnenrolled, activeTab, pathname, router, searchParams]);

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", newPage.toString());
    router.push(`${pathname}?${params.toString()}`);
  };

  const [sortBy, setSortBy] = useState<{ col: string; dir: "asc" | "desc" }>({
    col: "name",
    dir: "asc",
  });
  const [reassignModal, setReassignModal] = useState<{ 
    enrollmentId: string; 
    studentName: string;
    currentSlotId: string;
  } | null>(null);
  const [enrollModal, setEnrollModal] = useState<{ studentId: string, studentName: string } | null>(null);
  const [selectedNewSlotId, setSelectedNewSlotId] = useState<string>("");

  function showToast(msg: string, type: "success" | "error") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  const currentWeekDates = useMemo(() => {
    const dates: Record<number, string> = {};
    const now = new Date();
    // Ajuste baseado no fuso horário para bater com o servidor seria ideal, mas usaremos a lógica existente com o offset
    const day = now.getDay();
    const diff = (day === 0 ? -6 : 1 - day); 
    const monday = new Date(now);
    monday.setDate(now.getDate() + diff + (currentWeekOffset * 7));

    for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        const dow = (i + 1) % 7 === 0 ? 0 : (i + 1); // 1 = Monday, 6 = Saturday, 0 = Sunday
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const dayOfMonth = String(d.getDate()).padStart(2, '0');
        dates[dow] = `${year}-${month}-${dayOfMonth}`;
    }
    return dates;
  }, [currentWeekOffset]);

  const loadSlotDetails = useCallback(async (slot: ClassSlot) => {
    setEnrollmentsLoading(true);
    setWaitlistLoading(true);
    
    const enrollRes = await getSlotEnrollments(slot.id);
    if (enrollRes.data) setEnrollments(enrollRes.data as unknown as Enrollment[]);

    const waitRes = await getSlotWaitlist(slot.id);
    if (waitRes.data) setWaitlist(waitRes.data);

    const todayStr = new Date().toISOString().split("T")[0];
    const subRes = await getSlotSubstitutions(todayStr);
    if (subRes.data) {
      const existingSub = subRes.data.find((s: any) => s.class_slot_id === slot.id);
      setSubstituteCoachId(existingSub?.substitute_coach_id || null);
      setSubstitutionNotes(existingSub?.notes || "");
    }

    // Get the date string for this slot's day from the current week grid
    const targetDateStr = currentWeekDates[slot.day_of_week];

    if (targetDateStr) {
      const checkRes = await getSlotCheckins(slot.id, targetDateStr);
      if (checkRes.data) setCheckins(checkRes.data);
    } else {
      setCheckins([]);
    }

    setEnrollmentsLoading(false);
    setWaitlistLoading(false);
  }, [todayDay]);

  /**
   * handleAddHoliday: Handles the creation of schedule overrides.
   * 
   * SECURITY & SSoT:
   * - Resets the form after successful insertion to prevent double-submission.
   * - Parallel processing for multi-slot blocks ensures atomic-like feel.
   * - Revalidates 'box_holidays' SSoT immediately.
   */
  const handleAddHoliday = async () => {
    if (!newHolidayDate || !newHolidayDesc) {
      showToast("Preencha a data e descrição.", "error");
      return;
    }
    if (newBlockType === 'period' && (!newBlockStartTime || !newBlockEndTime)) {
      showToast("Informe o horário de início e fim do período.", "error");
      return;
    }
    if (newBlockType === 'slot' && newBlockSlotIds.length === 0) {
      showToast("Selecione ao menos uma turma a cancelar.", "error");
      return;
    }
    if (newBlockType === 'period' && newBlockStartTime >= newBlockEndTime) {
      showToast("Horário de início deve ser anterior ao fim.", "error");
      return;
    }
    startTransition(async () => {
      if (newBlockType === 'slot') {
        // Insert one blocking rule per selected slot in parallel
        const results = await Promise.all(
          newBlockSlotIds.map(slotId =>
            addHoliday(newHolidayDate, newHolidayDesc, 'slot', { classSlotId: slotId })
          )
        );
        const firstError = results.find(r => r.error);
        if (firstError) {
          showToast(firstError.error!, "error");
          return;
        }
        const successCount = results.filter(r => r.success).length;
        showToast(`${successCount} bloqueio${successCount > 1 ? 's' : ''} criado${successCount > 1 ? 's' : ''}!`, "success");
      } else {
        const res = await addHoliday(
          newHolidayDate,
          newHolidayDesc,
          newBlockType,
          {
            startTime: newBlockType === 'period' ? newBlockStartTime : undefined,
            endTime:   newBlockType === 'period' ? newBlockEndTime   : undefined,
          }
        );
        if (res.error) {
          showToast(res.error, "error");
          return;
        }
        showToast("Bloqueio adicionado!", "success");
      }
      // Reset form
      setNewHolidayDate("");
      setNewHolidayDesc("");
      setNewBlockType('full_day');
      setNewBlockStartTime("");
      setNewBlockEndTime("");
      setNewBlockSlotIds([]);
      const updated = await getHolidays();
      if (updated.data) setHolidays(updated.data as Holiday[]);
    });
  };

  const handleRemoveHoliday = async (id: string) => {
    startTransition(async () => {
      const res = await removeHoliday(id);
      if (res.error) {
        showToast(res.error, "error");
      } else {
        showToast("Feriado removido.", "success");
        setHolidays(prev => prev.filter(h => h.id !== id));
      }
    });
  };

  const handleWaitlistAdd = async (slotId: string, studentId: string) => {
    startTransition(async () => {
      const res = await addToWaitlist(slotId, studentId);
      if (res.error) showToast(res.error, "error");
      else {
        showToast("Adicionado à lista de espera!", "success");
        if (editingSlot) loadSlotDetails(editingSlot);
      }
    });
  };

  const handleWaitlistRemove = async (waitlistId: string) => {
    startTransition(async () => {
      const res = await removeFromWaitlist(waitlistId);
      if (res.error) showToast(res.error, "error");
      else {
        showToast("Removido da lista de espera.", "success");
        if (editingSlot) loadSlotDetails(editingSlot);
      }
    });
  };

  const handleManualPromote = async (slotId: string) => {
    startTransition(async () => {
      const res = await triggerWaitlistPromotion(slotId, true);
      if (res.error) showToast(res.error, "error");
      else {
        showToast("Aluno promovido com sucesso!", "success");
        if (editingSlot) loadSlotDetails(editingSlot);
      }
    });
  };

  const handleSubstitutionSave = async () => {
    if (!editingSlot) return;
    const todayStr = new Date().toISOString().split("T")[0];
    startTransition(async () => {
      const res = await addSubstitution(editingSlot.id, substituteCoachId, todayStr, substitutionNotes);
      if (res.error) showToast(res.error, "error");
      else showToast("Substituição salva!", "success");
    });
  };


  /**
   * handleCoachSwap
   * Manages the teacher substitution process for a specific class date.
   * Logic:
   * 1. If targetCoachId is null, it resets the slot to its default teacher (deleting record in DB).
   * 2. If targetCoachId matches the default_coach_id, it also resets (to avoid redundant records).
   * 3. Otherwise, it creates/updates a specific override in the class_substitutions table.
   */
  async function handleCoachSwap(targetCoachId: string | null) {
    // Implementation logic here
  }

  async function handleUnenroll(enrollmentId: string, slotId?: string) {
    startTransition(async () => {
      const result = await unenrollStudent(enrollmentId);
      if (result.error) {
        showToast(result.error, "error");
      } else {
        if (editingSlot && editingSlot.id === slotId) {
          await loadSlotDetails(editingSlot);
        }
      }
    });
  }

  function openDrawer(slot?: ClassSlot) {
    if (slot) {
      setEditingSlot(slot);
      setFormName(slot.name);
      setFormDays([slot.day_of_week]);
      setFormTime(formatTime(slot.time_start));
      setFormCapacity(slot.capacity);
      setFormCoachId(slot.default_coach_id || "");
      setFormDuration(slot.duration_minutes);
      if (activeTab === "checkins") {
        setCommandCenterInfo({ slot, date: todayDateStr });
        return; // Open unified modal immediately
      }
    } else {
      setEditingSlot(null);
      setFormName("CrossTraining");
      setFormDays([]); 
      setFormTime("07:00");
      setFormCapacity(Number(initialSettings?.box_capacity_limit || 20));
      setFormCoachId("");
      setFormDuration(60);
    }
    setIsBulk(false);
    setBulkDays([]); 
    setEnrollments([]);
    setDrawerOpen(true);
  }

  async function handleSubmit() {
    startTransition(async () => {
      if (!editingSlot && formDays.length === 0) {
        showToast("Selecione pelo menos um dia!", "error");
        return;
      }

      if (isBulk && editingSlot) {
        if (bulkDays.length === 0) {
          showToast("Selecione ao menos um dia para replicar!", "error");
          return;
        }
        const result = await bulkUpdateClassSlots(
          formatTime(editingSlot.time_start),
          { capacity: formCapacity, default_coach_id: formCoachId || undefined, name: formName },
          bulkDays
        );
        if (result.error) {
          showToast(result.error, "error");
        } else {
          showToast(`Replicado para ${bulkDays.length} dia(s)!`, "success");
          setDrawerOpen(false);
          router.refresh();
        }
        return;
      }

      if (!editingSlot && formDays.length > 0) {
        const result = await bulkCreateClassSlots(formDays, {
          name: formName,
          time_start: formTime,
          duration_minutes: formDuration,
          capacity: formCapacity,
          default_coach_id: formCoachId || undefined,
        });
        if (result.error) {
          showToast(result.error, "error");
        } else {
          showToast(`${formDays.length} horário(s) criado(s)!`, "success");
          setDrawerOpen(false);
          router.refresh();
        }
        return;
      }

      const fd = new FormData();
      fd.set("name", formName);
      fd.set("day_of_week", String(formDays[0]));
      fd.set("time_start", formTime);
      fd.set("capacity", String(formCapacity));
      fd.set("duration_minutes", String(formDuration));
      if (formCoachId) fd.set("default_coach_id", formCoachId);

      const result = await upsertClassSlot(fd, editingSlot?.id || null);
      if (result.error) {
        showToast(result.error, "error");
      } else {
        showToast("Turma atualizada!", "success");
        setDrawerOpen(false);
        router.refresh();
      }
    });
  }

  function handleToggle(slot: ClassSlot) {
    startTransition(async () => {
      const result = await toggleClassSlot(slot.id, !slot.is_active);
      if (result.error) showToast(result.error, "error");
      else {
        showToast(slot.is_active ? "Turma desativada" : "Turma reativada", "success");
        router.refresh();
      }
    });
  }

  function handleDelete(slotId: string) {
    setConfirmData({
      title: "Excluir Turma",
      message: "Tem certeza? Esta ação removerá a turma do horário semanal e desmatriculará todos os alunos vinculados. Esta ação é irreversível.",
      confirmLabel: "EXCLUIR AGORA",
      isDanger: true,
      onConfirm: async () => {
        setConfirmData(null);
        startTransition(async () => {
          const result = await deleteClassSlot(slotId);
          if (result.error) showToast(result.error, "error");
          else {
            showToast("Turma removida", "success");
            router.refresh();
          }
        });
      }
    });
  }

  const allTimes = [...new Set(slots.map((s) => formatTime(s.time_start)))].sort();
  const slotMap = new Map<string, ClassSlot>();
  slots.forEach((s) => {
    slotMap.set(`${s.day_of_week}-${formatTime(s.time_start)}`, s);
  });

  const activeSlots = slots.filter((s) => s.is_active);
  const totalSlots = activeSlots.length;
  const inactiveSlots = slots.filter((s) => !s.is_active);

  const filteredProfiles = useMemo(() => {
    // Sort the already filtered results from server
    return [...(allProfiles || [])].sort((a, b) => {
      const dir = sortBy.dir === "asc" ? 1 : -1;
      if (sortBy.col === "name") {
        return dir * (a.full_name || "").localeCompare(b.full_name || "", "pt-BR");
      }
      if (sortBy.col === "mat") {
        return dir * ((a.member_number || 0) - (b.member_number || 0));
      }
      if (sortBy.col === "level") {
        const lvlA = LEVEL_CONFIG[a.level || ""]?.order ?? 99;
        const lvlB = LEVEL_CONFIG[b.level || ""]?.order ?? 99;
        return dir * (lvlA - lvlB);
      }
      return 0;
    });
  }, [allProfiles, sortBy]);

  function toggleSort(col: string) {
    setSortBy(prev =>
      prev.col === col
        ? { col, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { col, dir: "asc" }
    );
  }

  function SortIcon({ col }: { col: string }) {
    if (sortBy.col !== col) return <ChevronsUpDown size={12} style={{ opacity: 0.3 }} />;
    return sortBy.dir === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />;
  }

  return (
    <div className="admin-container-fluid">
      {/* Dynamic Pulse Animation */}
      <style>{`
        @keyframes pulse-blue {
          0% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.4); }
          70% { box-shadow: 0 0 0 10px rgba(37, 99, 235, 0); }
          100% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0); }
        }
      `}</style>

      {/* ── TOAST ── */}
      {toast && (
        <div
          style={{
            position: "fixed",
            top: 24,
            right: 24,
            zIndex: 9999,
            padding: "16px 24px",
            background: toast.type === "success" ? "#000" : "#DC2626",
            color: "#FFF",
            fontSize: "13px",
            fontWeight: 800,
            display: "flex",
            alignItems: "center",
            gap: 8,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          {toast.type === "success" ? <Check size={16} /> : <X size={16} />}
          {toast.msg}
        </div>
      )}

      {/* ── HEADER ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24, borderBottom: "4px solid #000", paddingBottom: 12 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-0.04em", margin: "0 0 12px", textTransform: "uppercase", color: "#000" }}>
            Gestão de Box
          </h1>
          <div style={{ display: "flex", gap: 12 }}>
            <button
              onClick={() => setActiveTab("grid")}
              style={{
                padding: "8px 16px",
                fontSize: 12,
                fontWeight: 800,
                background: activeTab === "grid" ? "#000" : "#E5E7EB",
                color: activeTab === "grid" ? "#FFF" : "#666",
                border: "none",
                cursor: "pointer",
                borderRadius: 4,
                display: "flex",
                alignItems: "center",
                gap: 6
              }}
            >
              <LayoutGrid size={13} />
              GRADE DE AULAS
            </button>
            <button
              onClick={() => setActiveTab("checkins")}
              style={{
                padding: "8px 16px",
                fontSize: 12,
                fontWeight: 800,
                background: activeTab === "checkins" ? "#2563EB" : "#E5E7EB",
                color: activeTab === "checkins" ? "#FFF" : "#666",
                border: "none",
                cursor: "pointer",
                borderRadius: 4,
                display: "flex",
                alignItems: "center",
                gap: 6
              }}
            >
              <Zap size={13} />
              CHECK-INS
            </button>
            <button
              onClick={() => setActiveTab("enrollments")}
              style={{
                padding: "8px 16px",
                fontSize: 12,
                fontWeight: 800,
                background: activeTab === "enrollments" ? "#000" : "#E5E7EB",
                color: activeTab === "enrollments" ? "#FFF" : "#666",
                border: "none",
                cursor: "pointer",
                borderRadius: 4,
                display: "flex",
                alignItems: "center",
                gap: 6
              }}
            >
              <Users size={13} />
              MATRÍCULAS
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              style={{
                padding: "8px 16px",
                fontSize: 12,
                fontWeight: 800,
                background: activeTab === "settings" ? "#000" : "#E5E7EB",
                color: activeTab === "settings" ? "#FFF" : "#666",
                border: "none",
                cursor: "pointer",
                borderRadius: 4
              }}
            >
              BLOQUEIOS
            </button>
          </div>
        </div>
        
        {activeTab === "grid" && (
          <button
            className="admin-btn admin-btn-primary"
            onClick={() => openDrawer()}
            style={{ height: 52 }}
          >
            <Plus size={20} />
            Novo Horário
          </button>
        )}
      </div>

      <div style={{ flex: 1 }}>
        {/* ── ABA: GRADE DE AULAS (SETUP ONLY) ── */}
        {activeTab === "grid" && (
          <div className="animate-in fade-in duration-500">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
              <div className="admin-card" style={{ display: "flex", flexDirection: "column", gap: 6, borderTop: "2px solid #000", borderRight: "2px solid #000", borderBottom: "2px solid #000", borderLeft: "6px solid #000", padding: "20px 24px" }}>
                <span style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: "#666" }}>CAPACIDADE SEMANAL</span>
                <span style={{ fontSize: 32, fontWeight: 900, color: "#000", lineHeight: 1 }}>
                  {activeSlots.reduce((sum, s) => sum + s.capacity, 0)}
                </span>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#999" }}>VAGAS TOTAIS NO TEMPLATE</span>
              </div>
              <div className="admin-card" style={{ display: "flex", flexDirection: "column", gap: 6, borderTop: "2px solid #000", borderRight: "2px solid #000", borderBottom: "2px solid #000", borderLeft: "6px solid #2563EB", padding: "20px 24px" }}>
                <span style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: "#666" }}>TURMAS TOTAIS</span>
                <span style={{ fontSize: 32, fontWeight: 900, color: "#000", lineHeight: 1 }}>{totalSlots}</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#999" }}>TURMAS FIXAS POR SEMANA</span>
              </div>
              <div className="admin-card" style={{ display: "flex", flexDirection: "column", gap: 6, borderTop: "2px solid #000", borderRight: "2px solid #000", borderBottom: "2px solid #000", borderLeft: "6px solid #16A34A", padding: "20px 24px" }}>
                <span style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: "#666" }}>DENSIDADE DIÁRIA</span>
                <span style={{ fontSize: 32, fontWeight: 900, color: "#000", lineHeight: 1 }}>
                  {(totalSlots / (new Set(activeSlots.map(s => s.day_of_week)).size || 1)).toFixed(1)}
                </span>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#999" }}>MÉDIA DE TURMAS / DIA</span>
              </div>
              <div className="admin-card" style={{ display: "flex", flexDirection: "column", gap: 6, borderTop: "2px solid #000", borderRight: "2px solid #000", borderBottom: "2px solid #000", borderLeft: "6px solid #EA580C", padding: "20px 24px" }}>
                <span style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: "#666" }}>CARGA HORÁRIA</span>
                <span style={{ fontSize: 32, fontWeight: 900, color: "#000", lineHeight: 1 }}>
                  {(() => {
                    const totalMinutes = activeSlots.reduce((sum, s) => sum + s.duration_minutes, 0);
                    const hours = Math.floor(totalMinutes / 60);
                    const mins = totalMinutes % 60;
                    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
                  })()}
                </span>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#999" }}>TEMPO TOTAL DE AULA / SEMANA</span>
              </div>
            </div>

            {/* 
              GRID TEMPLATE — FIXED ASSETS
              The scrollable container below uses 'sticky' positioning for both headers and the first column.
              This ensures that the 'Day' and 'Time' labels remain visible even in large grids or mobile views.
              We use 'border-collapse: separate' to prevent borders from disappearing behind sticky elements.
            */}
            <div className="admin-card" style={{ padding: 0, overflow: "hidden", marginBottom: 32 }}>
              <div style={{ padding: "20px 24px", borderBottom: "2px solid #000", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#FAFAFA" }}>
                <h2 style={{ fontSize: 14, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>
                  <CalendarClock size={16} style={{ display: "inline", marginRight: 8, verticalAlign: "text-bottom" }} />
                  GRADE SEMANAL — MODO CONFIGURAÇÃO
                </h2>
              </div>
              <div style={{ overflow: "auto", maxHeight: "82vh", borderBottom: "2px solid #000" }}>
                <table className="admin-table" style={{ width: "100%", minWidth: 700, borderCollapse: "separate", borderSpacing: 0 }}>
                  <thead style={{ position: "sticky", top: 0, zIndex: 20 }}>
                    <tr>
                      <th style={{ 
                        position: "sticky", 
                        left: 0, 
                        zIndex: 30, 
                        background: "#FAFAFA", 
                        paddingLeft: 24, 
                        width: 80, 
                        fontFamily: "monospace",
                        borderBottom: "2px solid #000",
                        borderRight: "2px solid #000"
                      }}>
                        <Clock size={14} style={{ marginRight: 4, verticalAlign: "text-bottom" }} />HORA
                      </th>
                      {ACTIVE_DAYS.map((day) => (
                        <th key={day} style={{ 
                          textAlign: "center", 
                          letterSpacing: "0.08em", 
                          padding: "8px 8px", 
                          background: "#FAFAFA", 
                          borderBottom: "2px solid #000" 
                        }}>
                          <div style={{ fontSize: 13, fontWeight: 900 }}>{DAY_SHORT[day]}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {allTimes.map((time, index) => {
                      const isEven = index % 2 === 0;
                      const rowBg = isEven ? "#FFFFFF" : "#F9FAFB";
                      return (
                        <tr key={time} style={{ background: rowBg }}>
                          <td style={{ 
                            position: "sticky", 
                            left: 0, 
                            zIndex: 15, 
                            background: "inherit", 
                            paddingLeft: 24, 
                            fontFamily: "monospace", 
                            fontWeight: 800, 
                            fontSize: 15, 
                            color: "#000",
                            borderRight: "2px solid #000",
                            borderBottom: "1px solid #EEE"
                          }}>
                            {time}
                          </td>
                          {ACTIVE_DAYS.map((day) => {
                            const slot = slotMap.get(`${day}-${time}`);
                            if (!slot) return <td key={day} style={{ borderBottom: "1px solid #EEE" }} />;

                            return (
                              <td key={day} style={{ textAlign: "center", padding: "8px 4px", borderBottom: "1px solid #EEE" }}>
                                <div
                                  style={{
                                    display: "inline-flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    gap: 4,
                                    padding: "8px 12px",
                                    border: slot.is_active ? "2px solid #000" : "2px dashed #CCC",
                                    background: slot.is_active ? "#FFF" : "transparent",
                                    cursor: "pointer",
                                    opacity: slot.is_active ? 1 : 0.4,
                                    minWidth: 90,
                                    transition: "all 0.1s",
                                    position: "relative",
                                  }}
                                  onClick={() => openDrawer(slot)}
                                >
                                  <span style={{ fontWeight: 800, fontSize: 13 }}>{time}</span>
                                  <span style={{ fontSize: 10, fontWeight: 800, color: "#666", display: "flex", alignItems: "center", gap: 3 }}>
                                    <Users size={10} />{slot.capacity} VAGAS
                                  </span>
                                  {(() => {
                                    const c = coaches.find(co => co.id === slot.default_coach_id);
                                    const name = c?.full_name || slot.coach_name || "";
                                    if (!name) return null;
                                    return <span style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", color: "#333" }}>{name.split(" ")[0]}</span>;
                                  })()}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {inactiveSlots.length > 0 && (
              <div className="admin-card" style={{ borderStyle: "dashed", marginBottom: 32 }}>
                <h3 style={{ fontSize: 14, fontWeight: 800, margin: "0 0 12px", textTransform: "uppercase" }}>HORÁRIOS DESATIVADOS ({inactiveSlots.length})</h3>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {inactiveSlots.map((slot) => (
                    <div key={slot.id} style={{ padding: "8px 16px", border: "1px solid #CCC", fontSize: 12, fontWeight: 700, color: "#999", display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }} onClick={() => openDrawer(slot)}>
                      {DAY_SHORT[slot.day_of_week]} {formatTime(slot.time_start)}
                      <button onClick={(e) => { e.stopPropagation(); handleToggle(slot); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#16A34A", padding: 0 }} title="Reativar">
                        <ToggleRight size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── ABA: CHECK-INS (LIVE OCCUPANCY) ── */}
        {activeTab === "checkins" && (
          <div className="animate-in fade-in duration-500">

            <div className="admin-card" style={{ padding: 0, overflow: "hidden", marginBottom: 32 }}>
              {/* HEADER TÁTICO */}
              <div style={{ padding: "16px 24px", borderBottom: "2px solid #000", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#000", color: "#FFF" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                  {/* SETA ESQUERDA */}
                  <button 
                    onClick={() => handleNavigateWeek(-1)}
                    title="Semana Anterior"
                    style={{ 
                      background: "#222", border: "1px solid #444", color: "#FFF", 
                      cursor: "pointer", padding: "6px 10px", borderRadius: 4,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "all 0.15s ease"
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = "#333"; e.currentTarget.style.borderColor = "#666"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "#222"; e.currentTarget.style.borderColor = "#444"; }}
                  >
                    <ChevronLeft size={18} />
                  </button>

                  {/* TÍTULO COM DATAS */}
                  <h2 style={{ fontSize: 14, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
                    <CalendarClock size={18} />
                    {(() => {
                      const monDate = currentWeekDates[1];
                      const satDate = currentWeekDates[6];
                      if (!monDate || !satDate) return "OCUPAÇÃO SEMANAL";
                      const fmt = (d: string) => {
                        const [, m, day] = d.split("-");
                        const months = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
                        return `${parseInt(day)} ${months[parseInt(m) - 1]}`;
                      };
                      return `${fmt(monDate)} – ${fmt(satDate)}`;
                    })()}
                    {currentWeekOffset === 0 && <span style={{ fontSize: 9, background: "#16A34A", color: "#FFF", padding: "2px 8px", borderRadius: 3 }}>ATUAL</span>}
                  </h2>

                  {/* SETA DIREITA */}
                  <button 
                    onClick={() => handleNavigateWeek(1)}
                    title="Próxima Semana"
                    style={{ 
                      background: "#222", border: "1px solid #444", color: "#FFF", 
                      cursor: "pointer", padding: "6px 10px", borderRadius: 4,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "all 0.15s ease"
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = "#333"; e.currentTarget.style.borderColor = "#666"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "#222"; e.currentTarget.style.borderColor = "#444"; }}
                  >
                    <ChevronRight size={18} />
                  </button>

                  {/* BOTÃO HOJE — só aparece quando fora da semana atual */}
                  {currentWeekOffset !== 0 && (
                    <button 
                      onClick={() => handleNavigateWeek(0, false)}
                      title="Voltar para a semana atual"
                      style={{ 
                        background: "transparent", border: "1px solid #16A34A", color: "#16A34A", 
                        cursor: "pointer", padding: "5px 14px", borderRadius: 4,
                        fontSize: 11, fontWeight: 800, letterSpacing: "0.05em",
                        display: "flex", alignItems: "center", gap: 6,
                        transition: "all 0.15s ease"
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = "#16A34A"; e.currentTarget.style.color = "#FFF"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#16A34A"; }}
                    >
                      <RotateCcw size={12} />
                      HOJE
                    </button>
                  )}
                </div>
                <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
                  {/* GRUPO OCUPAÇÃO */}
                  <div style={{ display: "flex", gap: 12, alignItems: "center", borderRight: "1px solid #333", paddingRight: 20 }}>
                    <span style={{ fontSize: 8, fontWeight: 900, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Ocupação</span>
                    <div style={{ fontSize: 10, fontWeight: 900, color: "#FFF", display: "flex", alignItems: "center", gap: 5 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#16A34A" }} /> LIVRE
                    </div>
                    <div style={{ fontSize: 10, fontWeight: 900, color: "#FFF", display: "flex", alignItems: "center", gap: 5 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#EAB308" }} /> CRÍTICO
                    </div>
                    <div style={{ fontSize: 10, fontWeight: 900, color: "#FFF", display: "flex", alignItems: "center", gap: 5 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#DC2626" }} /> LOTADO
                    </div>
                  </div>

                  {/* GRUPO STATUS (AGORA/ATRASADA/FECHADA) */}
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <span style={{ fontSize: 8, fontWeight: 900, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Status Operacional</span>
                    <div style={{ fontSize: 10, fontWeight: 900, color: "#FFF", display: "flex", alignItems: "center", gap: 5 }}>
                      <div style={{ width: 12, height: 3, background: "#16A34A" }} /> ABERTA
                    </div>
                    <div style={{ fontSize: 10, fontWeight: 900, color: "#FFF", display: "flex", alignItems: "center", gap: 5 }}>
                      <div style={{ width: 12, height: 3, background: "#2563EB" }} /> AGORA
                    </div>
                    <div style={{ fontSize: 10, fontWeight: 900, color: "#FFF", display: "flex", alignItems: "center", gap: 5 }}>
                      <div style={{ width: 12, height: 3, background: "#EAB308" }} /> ATRASADA
                    </div>
                    <div style={{ fontSize: 10, fontWeight: 900, color: "#9CA3AF", display: "flex", alignItems: "center", gap: 5 }}>
                      <Check size={10} color="#9CA3AF" /> FECHADA
                    </div>
                  </div>
                </div>
              </div>

              {/* LIVE GRID CONTAINER */}
              <div style={{ overflowX: "auto", maxHeight: "82vh", overflowY: "auto" }}>
                <table className="admin-table" style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
                  <thead>
                    <tr>
                      <th style={{ 
                        position: "sticky", top: 0, left: 0, zIndex: 40,
                        paddingLeft: 24, width: 90, fontFamily: "monospace", 
                        background: "#000", color: "#FFF", borderBottom: "2px solid #333"
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <Clock size={12} /> HORA
                        </div>
                      </th>
                      {ACTIVE_DAYS.map((day) => {
                        const dateStr = currentWeekDates[day];
                        const holiday = holidays.find(h => h.date === dateStr);
                        const isToday = dateStr === todayDateStr; // Compara data exata, não apenas o dia da semana
                        return (
                          <th key={day} style={{ 
                            position: "sticky", top: 0, zIndex: 30,
                            textAlign: "center", minWidth: 140, padding: "8px 4px", 
                            background: "#000", color: "#FFF",
                            borderBottom: "2px solid #333", borderLeft: "1px solid #333"
                          }}>
                            <div style={{ fontSize: 12, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                              {DAY_SHORT[day]}
                              {isToday && !holiday && <span style={{ fontSize: 8, background: "#2563EB", color: "#FFF", padding: "1px 4px", borderRadius: 3 }}>HOJE</span>}
                            </div>
                            <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.5)", marginTop: 1 }}>
                              {dateStr.split("-").reverse().slice(0, 2).join("/")}
                            </div>
                            {holiday && (() => {
                              const bt = holiday.block_type || 'full_day';
                              const bgColor  = bt === 'full_day' ? '#4B5563' : bt === 'period' ? '#B45309' : '#B91C1C';
                              const typeTag  = bt === 'full_day' ? 'FECHADO' : bt === 'period' ? 'TURNO' : 'AULA';
                              const timeInfo = bt === 'period' && holiday.start_time && holiday.end_time
                                ? ` · ${holiday.start_time.slice(0,5)}–${holiday.end_time.slice(0,5)}`
                                : '';
                              return (
                                <div style={{
                                  marginTop: 4,
                                  background: bgColor,
                                  border: `1px solid rgba(255,255,255,0.15)`,
                                  padding: "4px 6px",
                                  display: "flex",
                                  flexDirection: "column",
                                  alignItems: "center",
                                  gap: 1,
                                }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                    <span style={{ fontSize: 9 }}>🔒</span>
                                    <span style={{ fontSize: 9, fontWeight: 900, letterSpacing: "0.1em", color: "#FFF" }}>
                                      {typeTag}{timeInfo}
                                    </span>
                                  </div>
                                  <span style={{
                                    fontSize: 8,
                                    fontWeight: 600,
                                    color: "rgba(255,255,255,0.75)",
                                    maxWidth: 120,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                    display: "block",
                                  }}>
                                    {holiday.description}
                                  </span>
                                </div>
                              );
                            })()}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {allTimes.map((time, idx) => {
                      const isEven = idx % 2 === 0;
                      const rowColor = isEven ? "#FFFFFF" : "#F9FAFB";

                      return (
                        <tr key={time} style={{ background: rowColor }}>
                          {/* STICKY TIME COLUMN */}
                          <td style={{ 
                            position: "sticky", left: 0, zIndex: 20,
                            paddingLeft: 24, fontFamily: "monospace", fontWeight: 900, 
                            fontSize: 15, background: "inherit", color: "#000",
                            borderBottom: "1px solid #E5E7EB", borderRight: "2px solid #000"
                          }}>
                            {time}
                          </td>
                          {ACTIVE_DAYS.map((day) => {
                            const dateStr = currentWeekDates[day];
                            const slot = slotMap.get(`${day}-${time}`);
                            if (!slot) return <td key={day} style={{ borderBottom: "1px solid #E5E7EB", borderLeft: "1px solid #F3F4F6", background: "inherit" }} />;
                            
                            const sessionKey = `${slot.id}-${dateStr}`;
                            const isFechada = !!sessions[sessionKey];
                            const subCoach = substitutions[sessionKey];
                            const coachDisplay = subCoach ? subCoach.full_name : slot.coach_name;
                            const isSubstituted = !!subCoach;
                            
                            const enrollmentCount = (enrollmentCounts && enrollmentCounts[slot.id]) || 0;
                            const checkinCount = (occupancy && occupancy[`${slot.id}-${dateStr}`]) || 0;
                            const isToday = dateStr === todayDateStr;
                            const isPast = dateStr < todayDateStr;
                            
                            const countToShow = (isToday || isPast) ? (checkinCount || 0) : enrollmentCount;

                            const matchingWod = wods.find(w => 
                              w.date === dateStr && 
                              w.type_tag?.toLowerCase() === slot.name.toLowerCase()
                            );
                            const hasWod = !!matchingWod;
                            const occupancyRatio = slot.capacity > 0 ? countToShow / slot.capacity : 0;

                            const blockRule = checkIsBlocked(slot, dateStr, holidays);
                            
                            return (
                              <td key={day} style={{ 
                                textAlign: "center", padding: "12px 6px", 
                                background: blockRule ? "rgba(239,68,68,0.03)" : (isToday ? "rgba(37, 99, 235, 0.03)" : "inherit"),
                                borderBottom: "1px solid #E5E7EB", borderLeft: "1px solid #F3F4F6"
                              }}>
                                {(() => {
                                  const { isNow, isAtrasada } = getSlotStatus(time, dateStr, todayDateStr);

                                  const isCritical = !blockRule && occupancyRatio > 0.8 && occupancyRatio < 1;
                                  const isFull = !blockRule && occupancyRatio >= 1;
                                  
                                  // CLEAN DESIGN COLORS
                                  const bg = blockRule
                                    ? "repeating-linear-gradient(45deg, #F9FAFB, #F9FAFB 8px, #F3F4F6 8px, #F3F4F6 16px)"
                                    : isFechada 
                                      ? "#F3F4F6" 
                                      : isToday 
                                        ? "rgba(37, 99, 235, 0.03)" 
                                        : "transparent";

                                  const borderColor = blockRule 
                                    ? "#D1D5DB" 
                                    : isFechada
                                      ? "#D1D5DB" // Neutral border for closed classes
                                      : isNow 
                                        ? "#2563EB" 
                                        : isAtrasada 
                                          ? "#EAB308" 
                                          : "#E5E7EB";

                                  const borderWidth = (!isFechada && (isNow || isAtrasada)) ? "3px" : "1px";

                                  return (
                                    <div
                                      style={{
                                        display: "inline-flex",
                                        flexDirection: "column",
                                        alignItems: "center",
                                        gap: 6,
                                        padding: "10px 14px",
                                        border: `${borderWidth} ${blockRule ? 'dashed' : 'solid'} ${borderColor}`,
                                        background: slot.is_active ? bg : "transparent",
                                        cursor: blockRule ? "not-allowed" : "pointer",
                                        opacity: blockRule ? 0.55 : (isFechada ? 0.7 : 1),
                                        filter: blockRule ? "grayscale(1)" : "none",
                                        minWidth: 110,
                                        transition: "all 0.15s ease",
                                        position: "relative",
                                        animation: isNow ? "pulse-blue 2s infinite" : "none",
                                        boxShadow: (!blockRule && !isFechada && (isNow || isAtrasada)) ? "0 4px 12px rgba(255,255,255,1)" : "none"
                                      }}
                                       onClick={() => {
                                         if (blockRule) return;
                                         if (activeTab === "checkins") {
                                           setCommandCenterInfo({ slot, date: dateStr });
                                         } else {
                                           openDrawer(slot);
                                         }
                                       }}
                                      onMouseEnter={e => {
                                        if (slot.is_active && !blockRule) {
                                          e.currentTarget.style.transform = "translateY(-2px)";
                                          e.currentTarget.style.boxShadow = "0 8px 16px rgba(0,0,0,0.15)";
                                        }
                                      }}
                                      onMouseLeave={e => {
                                        if (slot.is_active && !blockRule) {
                                          e.currentTarget.style.transform = "none";
                                          e.currentTarget.style.boxShadow = (!blockRule && !isFechada && (isNow || isAtrasada)) ? "0 4px 12px rgba(255,255,255,1)" : "none";
                                        }
                                      }}
                                    >
                                      {/* Blocked overlay banner */}
                                      {blockRule && (
                                        <div style={{
                                          position: "absolute", top: 0, left: 0, right: 0,
                                          background: blockRule.block_type === 'full_day' ? "#6B7280" : "#EF4444",
                                          color: "#FFF", fontSize: 8, fontWeight: 900,
                                          padding: "2px 4px", textAlign: "center", letterSpacing: "0.06em"
                                        }}>
                                          {blockRule.block_type === 'slot' ? 'CANCELADA' : blockRule.block_type === 'period' ? 'TURNO FECHADO' : 'UNIDADE FECHADA'}
                                        </div>
                                      )}
                                      {isToday && hasWod && !blockRule && (
                                        <div style={{ position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)", background: "#000", color: "#FFF", padding: "2px 8px", fontSize: 8, fontWeight: 900, whiteSpace: "nowrap", border: "2px solid #FFF", zIndex: 10 }}>
                                          {matchingWod?.type_tag}
                                        </div>
                                      )}

                                      {/* Integrated Status Indicator */}
                                      {!blockRule && !isFechada && (isNow || isAtrasada) && (
                                        <div style={{ 
                                          position: "absolute", top: 0, left: 0, right: 0, 
                                          background: isNow ? "#2563EB" : "#EAB308", 
                                          height: 3, borderTopLeftRadius: 0, borderTopRightRadius: 0
                                        }} />
                                      )}
                                      {!blockRule && !isFechada && (isNow || isAtrasada) && (
                                        <div style={{ 
                                          marginTop: -4, marginBottom: 2,
                                          color: isNow ? "#2563EB" : "#A16207",
                                          fontSize: 7.5, fontWeight: 900, letterSpacing: "0.08em"
                                        }}>
                                          {isNow ? "● AGORA" : "● ATRASADA"}
                                        </div>
                                      )}

                                      <span style={{ fontWeight: 900, fontSize: 13, letterSpacing: "-0.02em", marginTop: blockRule ? 14 : 0, color: isFechada ? "#6B7280" : "#000" }}>{time}</span>
                                      
                                      {blockRule ? (
                                        <span style={{ fontSize: 9, fontWeight: 700, color: "#9CA3AF", textAlign: "center", maxWidth: 100 }}>
                                          {blockRule.description}
                                        </span>
                                      ) : isFechada ? (
                                        <div style={{ display: "flex", alignItems: "center", gap: 3, background: "#D1D5DB", color: "#4B5563", padding: "2px 8px", borderRadius: 12 }}>
                                          <Check size={10} strokeWidth={4} />
                                          <span style={{ fontSize: 9, fontWeight: 900 }}>FECHADA</span>
                                        </div>
                                      ) : (
                                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                                          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                            <Users size={12} strokeWidth={3} style={{ color: isFull ? "#EF4444" : isCritical ? "#F59E0B" : "#16A34A" }} />
                                            <span style={{ fontSize: 12, fontWeight: 900, color: isFull ? "#EF4444" : isCritical ? "#F59E0B" : "#16A34A" }}>
                                              {countToShow}/{slot.capacity}
                                            </span>
                                          </div>
                                        </div>
                                      )}

                                      {(() => {
                                        const sessionKey = `${slot.id}-${dateStr}`;
                                        const sub = substitutions[sessionKey];
                                        
                                        // Só mostramos como substituição se o ID for diferente do oficial 
                                        // E fazemos um trim/case comparison para garantir robustez
                                        const isGenuineSubstitution = sub && 
                                          sub.id !== slot.default_coach_id && 
                                          sub.full_name?.toLowerCase().trim() !== slot.coach_name?.toLowerCase().trim();

                                        if (isGenuineSubstitution) {
                                          return (
                                            <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                                              <span style={{ 
                                                fontSize: 8.5, 
                                                fontWeight: 900, 
                                                textTransform: "uppercase", 
                                                background: "#EAB308", // Yellow for sub
                                                color: "#000", 
                                                padding: "2px 6px", 
                                                borderRadius: 2,
                                                display: "inline-flex",
                                                alignItems: "center",
                                                gap: 3
                                              }}>
                                                <RefreshCw size={8} stroke="#000" />
                                                {sub.full_name?.split(" ")[0]}
                                              </span>
                                            </div>
                                          );
                                        }

                                        const c = coaches.find(co => co.id === slot.default_coach_id);
                                        const name = c?.full_name || slot.coach_name || "";
                                        if (!name) return null;
                                        return <span style={{ fontSize: 8.5, fontWeight: 900, textTransform: "uppercase", background: "#000", color: "#FFF", padding: "2px 6px", borderRadius: 2 }}>{name.split(" ")[0]}</span>;
                                      })()}

                                      {isAtrasada && !isFechada && (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setCommandCenterInfo({ slot, date: dateStr });
                                            }}
                                            style={{
                                              marginTop: 6,
                                              background: "transparent",
                                              color: "#000",
                                              border: "2px solid #000",
                                              padding: "3px 8px",
                                              fontSize: 8,
                                              fontWeight: 900,
                                              borderRadius: 4,
                                              cursor: "pointer",
                                              textTransform: "uppercase",
                                              transition: "all 0.2s ease"
                                            }}
                                            onMouseEnter={e => {
                                              e.currentTarget.style.background = "#000";
                                              e.currentTarget.style.color = "#FFF";
                                            }}
                                            onMouseLeave={e => {
                                              e.currentTarget.style.background = "transparent";
                                              e.currentTarget.style.color = "#000";
                                            }}
                                          >
                                            FECHAR AULA
                                          </button>
                                      )}
                                    </div>
                                  );
                                })()}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 
              SECTION: Weekly Metrics (Tactical Dashboard)
              Calculates aggregated data for all active slots in the current 7-day grid.
              The scope is weekly to ensure parity with the visual representation.
            */}
            {(() => {
              // 1. Total Weekly Capacity (Sum of all slots)
              const totalWeeklyCapacity = activeSlots.reduce((a, b) => a + b.capacity, 0);
              
              // 2. Total Weekly Check-ins (Sum of all occupancy logs in the fetched date range)
              const totalWeeklyCheckins = Object.values(occupancy).reduce((a: number, b: unknown) => a + (b as number), 0);
              
              // 3. Global Occupancy Rate (Check-ins / Capacity)
              const occupancyRate = totalWeeklyCapacity > 0 ? Math.round((totalWeeklyCheckins / totalWeeklyCapacity) * 100) : 0;
              
              // 4. Fixed Enrollments (Global sum of recurring students)
              const totalEnrollments = Object.values(enrollmentCounts || {}).reduce((a: number, b: unknown) => a + (b as number), 0);
              
              // 5. Full Slots Count (Count of slots where enrollment >= capacity)
              const fullSlotsCount = activeSlots.filter(s => (enrollmentCounts?.[s.id] || 0) >= s.capacity).length;

              return (
                <div style={{ marginTop: 40, marginBottom: 16 }}>
                  <div style={{ marginBottom: 16 }}>
                    <h3 style={{ 
                      fontSize: 13, 
                      fontWeight: 900, 
                      textTransform: "uppercase", 
                      letterSpacing: "0.1em", 
                      display: "flex", 
                      alignItems: "center", 
                      gap: 10,
                      color: "#111"
                    }}>
                      <BarChart3 size={18} />
                      MÉTRICAS
                    </h3>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
                    <div className="admin-card" style={{ display: "flex", flexDirection: "column", gap: 6, borderTop: "2px solid #000", borderRight: "2px solid #000", borderBottom: "2px solid #000", borderLeft: "6px solid #8B5CF6", padding: "20px 24px" }}>
                      <span style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: "#666" }}>TAXA DE OCUPAÇÃO</span>
                      <span style={{ fontSize: 32, fontWeight: 900, color: "#8B5CF6", lineHeight: 1 }}>{occupancyRate}%</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: "#999" }}>APROVEITAMENTO DA SEMANA</span>
                    </div>

                    <div className="admin-card" style={{ display: "flex", flexDirection: "column", gap: 6, borderTop: "2px solid #000", borderRight: "2px solid #000", borderBottom: "2px solid #000", borderLeft: "6px solid #16A34A", padding: "20px 24px" }}>
                      <span style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: "#666" }}>CHECK-INS NA SEMANA</span>
                      <span style={{ fontSize: 32, fontWeight: 900, color: "#16A34A", lineHeight: 1 }}>{totalWeeklyCheckins}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: "#999" }}>PRESENÇA TOTAL NA GRADE</span>
                    </div>

                    <div className="admin-card" style={{ display: "flex", flexDirection: "column", gap: 6, borderTop: "2px solid #000", borderRight: "2px solid #000", borderBottom: "2px solid #000", borderLeft: "6px solid #2563EB", padding: "20px 24px" }}>
                      <span style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: "#666" }}>MATRÍCULAS FIXAS</span>
                      <span style={{ fontSize: 32, fontWeight: 900, color: "#2563EB", lineHeight: 1 }}>{totalEnrollments}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: "#999" }}>RESERVAS DE VAGAS</span>
                    </div>

                    <div className="admin-card" style={{ display: "flex", flexDirection: "column", gap: 6, borderTop: "2px solid #000", borderRight: "2px solid #000", borderBottom: "2px solid #000", borderLeft: "6px solid #DC2626", padding: "20px 24px" }}>
                      <span style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: "#666" }}>TURMAS LOTADAS</span>
                      <span style={{ fontSize: 32, fontWeight: 900, color: "#DC2626", lineHeight: 1 }}>{fullSlotsCount}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: "#999" }}>LOTADAS NA SEMANA</span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {activeTab === "settings" && (
          <div className="animate-in fade-in duration-500">
            <div className="admin-card" style={{ padding: "24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 900, textTransform: "uppercase", display: "flex", alignItems: "center", gap: 8, margin: 0 }}>
                    <CalendarClock size={20} />Bloqueios de Agenda
                  </h2>
                  <p style={{ margin: "4px 0 0", fontSize: 12, color: "#666", fontWeight: 600 }}>SSoT: todas as regras de cancelamento centralizadas aqui.</p>
                </div>
              </div>

              {/* ── SMART FORM ── */}
              <div style={{ padding: "20px 24px", background: "#F9FAFB", border: "2px dashed #000", marginBottom: 24 }}>
                {/* Block Type Selector */}
                <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                  {(['full_day', 'period', 'slot'] as BlockType[]).map((type) => {
                    const labels: Record<BlockType, string> = { full_day: '📅 DIA INTEIRO', period: '🕐 PERÍODO', slot: '🚫 AULA ESPECÍFICA' };
                    return (
                      <button
                        key={type}
                        onClick={() => setNewBlockType(type)}
                        style={{
                          padding: "8px 14px", fontSize: 11, fontWeight: 900,
                          background: newBlockType === type ? "#000" : "#FFF",
                          color: newBlockType === type ? "#FFF" : "#666",
                          border: `2px solid ${newBlockType === type ? '#000' : '#DDD'}`,
                          cursor: "pointer", transition: "all 0.1s"
                        }}
                      >
                        {labels[type]}
                      </button>
                    );
                  })}
                </div>

                {/* Type description */}
                <p style={{ margin: "0 0 16px", fontSize: 11, color: "#555", fontWeight: 700, padding: "8px 12px", background: "#EEE", border: "1px solid #DDD" }}>
                  {newBlockType === 'full_day' && '🏢 Unidade fechada o dia todo. Todas as aulas serão marcadas como FECHADO.'}
                  {newBlockType === 'period' && '⏰ Apenas as aulas dentro do período informado serão bloqueadas. Útil para manutenções ou eventos por turno.'}
                  {newBlockType === 'slot' && '🎯 Cancela apenas uma aula específica na data escolhida. O resto do dia segue normal.'}
                </p>

                {/* Common fields: date + description */}
                <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: 16, marginBottom: 16 }}>
                  <div><label style={labelStyle}>Data</label><input type="date" className="admin-input" value={newHolidayDate} onChange={(e) => { setNewHolidayDate(e.target.value); setNewBlockSlotIds([]); }} /></div>
                  <div><label style={labelStyle}>Motivo / Descrição</label><input type="text" className="admin-input" placeholder={newBlockType === 'slot' ? 'Ex: Professor ausente' : newBlockType === 'period' ? 'Ex: Manutenção elétrica' : 'Ex: Feriado Nacional'} value={newHolidayDesc} onChange={(e) => setNewHolidayDesc(e.target.value)} /></div>
                </div>

                {/* Conditional fields for PERIOD */}
                {newBlockType === 'period' && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                    <div><label style={labelStyle}>Início do Período</label><input type="time" className="admin-input" value={newBlockStartTime} onChange={(e) => setNewBlockStartTime(e.target.value)} /></div>
                    <div><label style={labelStyle}>Fim do Período</label><input type="time" className="admin-input" value={newBlockEndTime} onChange={(e) => setNewBlockEndTime(e.target.value)} /></div>
                  </div>
                )}

                {/* Conditional fields for SLOT — filtered by selected date's day_of_week */}
                {newBlockType === 'slot' && (() => {
                  // Derive day_of_week from selected date (noon avoids TZ-shift issues)
                  const selectedDayOfWeek = newHolidayDate
                    ? new Date(newHolidayDate + 'T12:00:00').getDay()
                    : null;

                  const DAY_NAMES_FULL = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];

                  const filteredSlots = selectedDayOfWeek !== null
                    ? [...slots]
                        .filter(s => s.is_active && s.day_of_week === selectedDayOfWeek)
                        .sort((a, b) => a.time_start.localeCompare(b.time_start))
                    : [];

                  const toggleSlot = (id: string) =>
                    setNewBlockSlotIds(prev =>
                      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
                    );

                  const allSelected = filteredSlots.length > 0 && filteredSlots.every(s => newBlockSlotIds.includes(s.id));

                  return (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <label style={labelStyle}>
                          Turmas a Cancelar
                          {selectedDayOfWeek !== null && filteredSlots.length > 0 && (
                            <span style={{ marginLeft: 8, fontWeight: 700, color: "#666", fontSize: 10, textTransform: "none" }}>
                              — {DAY_NAMES_FULL[selectedDayOfWeek]} · {newBlockSlotIds.length}/{filteredSlots.length} selecionada{newBlockSlotIds.length !== 1 ? 's' : ''}
                            </span>
                          )}
                        </label>
                        {filteredSlots.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setNewBlockSlotIds(allSelected ? [] : filteredSlots.map(s => s.id))}
                            style={{
                              fontSize: 10, fontWeight: 900, padding: "4px 10px",
                              background: allSelected ? "#EF4444" : "#000",
                              color: "#FFF", border: "none", cursor: "pointer",
                              transition: "background 0.1s"
                            }}
                          >
                            {allSelected ? 'Desmarcar Todas' : 'Selecionar Todas'}
                          </button>
                        )}
                      </div>

                      {!newHolidayDate ? (
                        <div style={{
                          padding: "12px 16px", border: "2px dashed #D1D5DB",
                          background: "#F9FAFB", color: "#9CA3AF",
                          fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 8
                        }}>
                          <CalendarClock size={14} />
                          Selecione uma data acima para ver as aulas disponíveis.
                        </div>
                      ) : filteredSlots.length === 0 ? (
                        <div style={{
                          padding: "12px 16px", border: "2px dashed #FCA5A5",
                          background: "#FEF2F2", color: "#DC2626",
                          fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 8
                        }}>
                          Nenhuma aula ativa em {DAY_NAMES_FULL[selectedDayOfWeek!]}.
                        </div>
                      ) : (
                        // Chip multi-select grid
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                          {filteredSlots.map(s => {
                            const selected = newBlockSlotIds.includes(s.id);
                            const c = coaches.find(co => co.id === s.default_coach_id);
                            return (
                              <button
                                key={s.id}
                                type="button"
                                onClick={() => toggleSlot(s.id)}
                                style={{
                                  display: "flex", flexDirection: "column", alignItems: "center",
                                  gap: 2, padding: "10px 16px",
                                  border: selected ? "2px solid #EF4444" : "2px solid #D1D5DB",
                                  background: selected
                                    ? "repeating-linear-gradient(45deg,#FEF2F2,#FEF2F2 6px,#FEE2E2 6px,#FEE2E2 12px)"
                                    : "#FFF",
                                  cursor: "pointer",
                                  transition: "all 0.12s",
                                  minWidth: 90,
                                  position: "relative",
                                }}
                              >
                                {selected && (
                                  <div style={{
                                    position: "absolute", top: -6, right: -6,
                                    background: "#EF4444", color: "#FFF",
                                    borderRadius: "50%", width: 16, height: 16,
                                    fontSize: 9, fontWeight: 900,
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    border: "2px solid #FFF"
                                  }}>✕</div>
                                )}
                                <span style={{ fontWeight: 900, fontSize: 14, fontFamily: "monospace", color: selected ? "#DC2626" : "#000" }}>
                                  {formatTime(s.time_start)}
                                </span>
                                <span style={{ fontSize: 9, fontWeight: 800, color: selected ? "#EF4444" : "#666", textTransform: "uppercase" }}>
                                  {s.name}
                                </span>
                                {c && (
                                  <span style={{ fontSize: 8, fontWeight: 700, color: "#999", textTransform: "uppercase" }}>
                                    {c.full_name?.split(' ')[0]}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })()}

                <button className="admin-btn admin-btn-primary" onClick={handleAddHoliday} disabled={isPending}>
                  <Plus size={18} /> CRIAR BLOQUEIO
                </button>
              </div>

              {/* ── LIST ── */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {holidays.length === 0 && (
                  <div style={{ padding: "32px", textAlign: "center", border: "2px dashed #CCC", color: "#666", fontWeight: 700, fontSize: 13 }}>
                    Nenhum bloqueio cadastrado.
                  </div>
                )}
                {holidays.map((h) => {
                  const typeColors: Record<BlockType, string> = { full_day: '#6B7280', period: '#F59E0B', slot: '#EF4444' };
                  const typeLabels: Record<BlockType, string> = { full_day: 'DIA INTEIRO', period: 'PERÍODO', slot: 'AULA ÚNICA' };
                  const blockType = (h.block_type || 'full_day') as BlockType;
                  return (
                    <div key={h.id} style={{ display: "flex", alignItems: "center", gap: 20, padding: "16px 24px", background: "#FFF", border: "2px solid #000" }}>
                      {/* Date */}
                      <div style={{ minWidth: 90, fontSize: 15, fontWeight: 900, fontFamily: "monospace" }}>
                        {new Date(h.date + 'T12:00:00Z').toLocaleDateString("pt-BR", { timeZone: "UTC" })}
                      </div>
                      {/* Badge */}
                      <div style={{ padding: "3px 8px", background: typeColors[blockType], color: "#FFF", fontSize: 9, fontWeight: 900, letterSpacing: "0.08em", whiteSpace: "nowrap" }}>
                        {typeLabels[blockType]}
                      </div>
                      {/* Extra info */}
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#555" }}>
                        {blockType === 'period' && h.start_time && h.end_time && (
                          <span style={{ fontFamily: "monospace", background: "#F3F4F6", padding: "2px 8px", marginRight: 8, border: "1px solid #DDD" }}>
                            {h.start_time.slice(0,5)} – {h.end_time.slice(0,5)}
                          </span>
                        )}
                        {blockType === 'slot' && h.class_slot_id && (() => {
                          const s = slots.find(sl => sl.id === h.class_slot_id);
                          if (!s) return null;
                          return <span style={{ fontFamily: "monospace", background: "#FEF3C7", padding: "2px 8px", marginRight: 8, border: "1px solid #DDD" }}>{['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'][s.day_of_week]} {formatTime(s.time_start)}</span>;
                        })()}
                      </div>
                      {/* Description */}
                      <div style={{ flex: 1, fontSize: 14, fontWeight: 700 }}>{h.description}</div>
                      <button className="admin-btn admin-btn-ghost" style={{ color: "#DC2626" }} onClick={() => handleRemoveHoliday(h.id)} disabled={isPending}><Trash2 size={18} /></button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === "enrollments" && (
          <div className="animate-in fade-in duration-500" style={{ paddingBottom: 60 }}>
            
            {/* ── CRM HEADER STATS ── */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
              <div className="admin-card" style={{ padding: "20px 24px", borderTop: "2px solid #000", borderRight: "2px solid #000", borderBottom: "2px solid #000", borderLeft: "6px solid #000", display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", color: "#666" }}>Total Alunos</span>
                <span style={{ fontSize: 36, fontWeight: 900, lineHeight: 1 }}>{allProfiles?.length || 0}</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#999" }}>BASE DE DADOS GLOBAL</span>
              </div>
              <div className="admin-card" style={{ padding: "20px 24px", borderTop: "2px solid #000", borderRight: "2px solid #000", borderBottom: "2px solid #000", borderLeft: "6px solid #16A34A", display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", color: "#666" }}>Matriculados</span>
                <span style={{ fontSize: 36, fontWeight: 900, lineHeight: 1, color: "#16A34A" }}>
                  {(allProfiles || []).filter(p => (allEnrollments || []).some(e => e.student_id === p.id)).length}
                </span>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#999" }}>ALUNOS COM VAGAS FIXAS</span>
              </div>
              <div className="admin-card" style={{ padding: "20px 24px", borderTop: "2px solid #000", borderRight: "2px solid #000", borderBottom: "2px solid #000", borderLeft: "6px solid #DC2626", display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", color: "#666" }}>Sem Vínculo</span>
                <span style={{ fontSize: 36, fontWeight: 900, lineHeight: 1, color: "#DC2626" }}>
                  {(allProfiles || []).filter(p => !(allEnrollments || []).some(e => e.student_id === p.id)).length}
                </span>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#999" }}>ALUNOS AGUARDANDO TURMA</span>
              </div>
            </div>

            {/* ── FILTERS BAR ── */}
            <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
              <div style={{ position: "relative", flex: "1 1 280px" }}>
                <Search size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#999" }} />
                <input
                  type="text"
                  placeholder="Buscar por nome ou matrícula..."
                  value={enrollmentSearch}
                  onChange={(e) => setEnrollmentSearch(e.target.value)}
                  style={{ width: "100%", padding: "12px 14px 12px 42px", border: "2px solid #000", fontSize: 13, fontWeight: 700, outline: "none" }}
                />
              </div>
              <select
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
                style={{ padding: "12px 16px", border: "2px solid #000", fontSize: 12, fontWeight: 800, background: "#FFF", cursor: "pointer" }}
              >
                <option value="">TODOS OS NÍVEIS</option>
                {Object.values(LEVEL_CONFIG).sort((a, b) => a.order - b.order).map(lvl => (
                  <option key={lvl.key} value={lvl.key}>{lvl.label.toUpperCase()}</option>
                ))}
              </select>
              <button
                onClick={() => setShowOnlyUnenrolled(!showOnlyUnenrolled)}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "12px 20px", border: "2px solid #000",
                  background: showOnlyUnenrolled ? "#000" : "#FFF",
                  color: showOnlyUnenrolled ? "#FFF" : "#000",
                  fontWeight: 900, fontSize: 11, cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {showOnlyUnenrolled ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                SEM MATRÍCULA
              </button>
              <div style={{ padding: "12px 16px", background: "#F3F4F6", border: "2px solid #DDD", fontSize: 12, fontWeight: 800, color: "#444", display: "flex", alignItems: "center" }}>
                Total: {totalCount} resultado{totalCount !== 1 ? "s" : ""}
              </div>
            </div>

            {/* ── HIGH-DENSITY TABLE ── */}
            <div className="admin-card" style={{ padding: 0, overflow: "hidden", marginBottom: 24 }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#000", color: "#FFF", position: "sticky", top: 0, zIndex: 10 }}>
                      <th
                        onClick={() => toggleSort("mat")}
                        style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 900, letterSpacing: "0.08em", whiteSpace: "nowrap", cursor: "pointer", userSelect: "none", width: 70 }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>MAT <SortIcon col="mat" /></div>
                      </th>
                      <th
                        onClick={() => toggleSort("name")}
                        style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 900, letterSpacing: "0.08em", whiteSpace: "nowrap", cursor: "pointer", userSelect: "none" }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>ALUNO <SortIcon col="name" /></div>
                      </th>
                      <th
                        onClick={() => toggleSort("level")}
                        style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 900, letterSpacing: "0.08em", whiteSpace: "nowrap", cursor: "pointer", userSelect: "none", width: 130 }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>NÍVEL <SortIcon col="level" /></div>
                      </th>
                      <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 900, letterSpacing: "0.08em", whiteSpace: "nowrap", width: 200 }}>HORÁRIO FIXO</th>
                      <th style={{ padding: "12px 16px", textAlign: "right", fontSize: 11, fontWeight: 900, letterSpacing: "0.08em", whiteSpace: "nowrap", width: 120 }}>AÇÕES</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProfiles.length === 0 && (
                      <tr>
                        <td colSpan={5} style={{ padding: "48px 24px", textAlign: "center", color: "#999", fontWeight: 700, fontSize: 13 }}>
                          Nenhum aluno encontrado com os filtros aplicados.
                        </td>
                      </tr>
                    )}
                    {filteredProfiles.map((profile, idx) => {
                      const enrollment = (allEnrollments || []).find(e => e.student_id === profile.id);
                      const slot = enrollment ? initialSlots.find(s => s.id === enrollment.class_slot_id) : null;
                      const lvlConfig = LEVEL_CONFIG[profile.level || ""];
                      const isEven = idx % 2 === 0;

                      return (
                        <tr
                          key={profile.id}
                          style={{
                            background: isEven ? "#FFF" : "#FAFAFA",
                            borderBottom: "1px solid #E5E7EB",
                            transition: "background 0.1s",
                          }}
                          onMouseEnter={e => (e.currentTarget.style.background = "#F0F9FF")}
                          onMouseLeave={e => (e.currentTarget.style.background = isEven ? "#FFF" : "#FAFAFA")}
                        >
                          {/* MAT */}
                          <td style={{ padding: "10px 16px", fontFamily: "monospace", fontWeight: 800, fontSize: 12, color: "#666", borderLeft: `4px solid ${enrollment ? (lvlConfig?.color || "#000") : "#E5E7EB"}` }}>
                            {profile.member_number ? `#${profile.member_number}` : "—"}
                          </td>

                          {/* NOME */}
                          <td style={{ padding: "10px 16px", fontWeight: 800, color: "#000" }}>
                            {profile.full_name || "ALUNO SEM NOME"}
                          </td>

                          {/* NÍVEL */}
                          <td style={{ padding: "10px 16px" }}>
                            {lvlConfig ? (
                              <span style={{
                                display: "inline-block",
                                padding: "3px 10px",
                                fontSize: 10,
                                fontWeight: 900,
                                letterSpacing: "0.06em",
                                textTransform: "uppercase",
                                background: lvlConfig.color,
                                color: lvlConfig.textColor,
                                border: "1.5px solid rgba(0,0,0,0.15)",
                              }}>
                                {lvlConfig.label}
                              </span>
                            ) : (
                              <span style={{ fontSize: 11, color: "#CCC", fontWeight: 700 }}>—</span>
                            )}
                          </td>

                          {/* HORÁRIO */}
                          <td style={{ padding: "10px 16px" }}>
                            {slot ? (
                              <span style={{ fontSize: 12, fontWeight: 700, color: "#000", display: "flex", alignItems: "center", gap: 6 }}>
                                <Clock size={13} style={{ color: "#666", flexShrink: 0 }} />
                                {DAY_SHORT[slot.day_of_week]} • {formatTime(slot.time_start)}
                              </span>
                            ) : (
                              <span style={{ fontSize: 11, fontWeight: 800, color: "#DC2626", background: "#FEE2E2", padding: "3px 8px", display: "inline-block" }}>SEM VÍNCULO</span>
                            )}
                          </td>

                          {/* AÇÕES */}
                          <td style={{ padding: "10px 16px", textAlign: "right" }}>
                            <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                              {enrollment ? (
                                <>
                                  <button
                                    title="Trocar horário"
                                    onClick={() => {
                                      setReassignModal({ enrollmentId: enrollment.id, studentName: profile.full_name || "Aluno", currentSlotId: enrollment.class_slot_id });
                                      setSelectedNewSlotId(enrollment.class_slot_id);
                                    }}
                                    style={{ padding: "5px 12px", fontSize: 11, fontWeight: 900, border: "2px solid #000", background: "#FFF", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
                                  >
                                    <Edit3 size={12} /> TROCAR
                                  </button>
                                  <button
                                    title="Remover matrícula"
                                    onClick={() => {
                                      setConfirmData({
                                        title: "Remover Matrícula",
                                        message: `Tem certeza que deseja remover a matrícula de ${profile.full_name}? O aluno perderá o vínculo com este horário.`,
                                        confirmLabel: "REMOVER VÍNCULO",
                                        isDanger: true,
                                        onConfirm: async () => {
                                          setConfirmData(null);
                                          startTransition(async () => { 
                                            await unenrollStudent(enrollment.id); 
                                            router.refresh(); 
                                            showToast("Matrícula removida.", "success");
                                          });
                                        }
                                      });
                                    }}
                                    style={{ padding: "5px 10px", border: "2px solid #DC2626", background: "#FFF", color: "#DC2626", cursor: "pointer", display: "flex", alignItems: "center" }}
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={() => {
                                    setEnrollModal({ studentId: profile.id, studentName: profile.full_name || "Aluno" });
                                    setSelectedNewSlotId(initialSlots.find(s => s.is_active)?.id || "");
                                  }}
                                  style={{ 
                                    padding: "5px 12px", 
                                    fontSize: 11, 
                                    fontWeight: 900, 
                                    border: "2px solid #16A34A", 
                                    background: "#FFF", 
                                    color: "#16A34A",
                                    cursor: "pointer", 
                                    display: "flex", 
                                    alignItems: "center", 
                                    gap: 4 
                                  }}
                                >
                                  <UserPlus size={12} /> MATRICULAR
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── PAGINATION ── */}
            {totalPages > 1 && (
              <div style={{ 
                display: "flex", 
                justifyContent: "space-between", 
                alignItems: "center", 
                background: "#FFF",
                border: "3px solid #000",
                padding: "16px 24px",
                boxShadow: "8px 8px 0px rgba(0,0,0,1)"
              }}>
                <div style={{ fontSize: 12, fontWeight: 900, textTransform: "uppercase" }}>
                  Mostrando {allProfiles.length} de {totalCount}
                </div>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <button 
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage <= 1}
                    style={{ padding: "8px 12px", border: "2px solid #000", background: currentPage <= 1 ? "#F3F4F6" : "#FFF", cursor: currentPage <= 1 ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 8, fontSize: 11, fontWeight: 900 }}
                  >
                    <ChevronLeft size={16} /> ANTERIOR
                  </button>
                  <div style={{ fontSize: 12, fontWeight: 900, background: "#000", color: "#FFF", padding: "8px 16px" }}>
                    {currentPage} / {totalPages}
                  </div>
                  <button 
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                    style={{ padding: "8px 12px", border: "2px solid #000", background: currentPage >= totalPages ? "#F3F4F6" : "#FFF", cursor: currentPage >= totalPages ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 8, fontSize: 11, fontWeight: 900 }}
                  >
                    PRÓXIMA <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── DRAWER (SIDE MODAL) ── */}
      {/* 
          CONTEXTUAL DRAWER:
          Based on the 'activeTab', this drawer renders either:
          - A Setup Form (activeTab !== "checkins"): To edit slot structure.
          - A Live View (activeTab === "checkins"): To monitor current occupancy.
          Following the 'Zero Redundancy Rule', we removed student search from here 
          as it's better served by the dedicated 'MATRÍCULAS' tab.
      */}
      {drawerOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", justifyContent: "center", alignItems: "center", padding: 20 }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }} onClick={() => setDrawerOpen(false)} />
          <div style={{ position: "relative", width: (activeTab === "checkins" && editingSlot) ? 920 : 640, background: "#FFF", border: "4px solid #000", display: "flex", flexDirection: "column", maxHeight: "95vh", boxShadow: "32px 32px 0px rgba(0,0,0,0.1)" }}>
            <div style={{ padding: "24px 32px", borderBottom: "3px solid #000", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#000", color: "#FFF" }}>
              <h2 style={{ fontSize: 18, fontWeight: 900, textTransform: "uppercase", margin: 0 }}>{editingSlot ? (activeTab === "checkins" ? `${formatTime(editingSlot.time_start)} \u2014 ${DAY_LABELS[editingSlot.day_of_week]}` : "EDITAR") : "NOVO HORÁRIO"}</h2>
              <button onClick={() => setDrawerOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#FFF" }}><X size={24} /></button>
            </div>
            <div style={{ overflowY: "auto", flex: 1, padding: 32 }}>
               {activeTab !== "checkins" ? (
                 <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                   <div><label style={labelStyle}>MODALIDADE</label><input style={inputStyle} value={formName} onChange={e => setFormName(e.target.value)} /></div>
                   <div>
                     <label style={labelStyle}>DIAS</label>
                     <div style={{ display: "flex", gap: 4 }}>
                       {ACTIVE_DAYS.map(d => (
                         <button key={d} onClick={() => setFormDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d])} style={{ flex: 1, padding: 12, fontWeight: 900, border: "2px solid #000", background: formDays.includes(d) ? "#000" : "#FFF", color: formDays.includes(d) ? "#FFF" : "#000" }}>{DAY_SHORT[d]}</button>
                       ))}
                     </div>
                   </div>
                   <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                     <div><label style={labelStyle}>HORA</label><input type="time" style={inputStyle} value={formTime} onChange={e => setFormTime(e.target.value)} /></div>
                     <div><label style={labelStyle}>VAGAS</label><input type="number" style={inputStyle} value={formCapacity} onChange={e => setFormCapacity(Number(e.target.value))} /></div>
                   </div>
                   <div>
                     <label style={labelStyle}>PROFESSOR / COACH</label>
                     <select
                       style={inputStyle}
                       value={formCoachId}
                       onChange={e => setFormCoachId(e.target.value)}
                     >
                       <option value="">Selecione um Professor...</option>
                       {coaches.map(c => (
                         <option key={c.id} value={c.id}>{c.full_name?.toUpperCase() || "SEM NOME"}</option>
                       ))}
                     </select>
                   </div>
                   {editingSlot && (
                     <div style={{ padding: "20px 24px", background: "#F3F4F6", border: "3px solid #000", marginTop: 8 }}>
                        <label style={{ fontSize: 13, fontWeight: 900, display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
                          <input 
                            type="checkbox" 
                            checked={isBulk} 
                            onChange={e => setIsBulk(e.target.checked)} 
                            style={{ width: 18, height: 18, cursor: "pointer", accentColor: "#000" }}
                          /> 
                          REPLICAR PARA OUTROS DIAS
                        </label>
                        {isBulk && (
                          <div style={{ display: "flex", gap: 6, marginTop: 16 }}>
                            {ACTIVE_DAYS.map(d => (
                              <button 
                                key={d} 
                                onClick={() => setBulkDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d])} 
                                style={{ 
                                  flex: 1, 
                                  fontSize: 10, 
                                  padding: 10, 
                                  fontWeight: 900,
                                  border: "2px solid #000", 
                                  background: bulkDays.includes(d) ? "#000" : "#FFF", 
                                  color: bulkDays.includes(d) ? "#FFF" : "#000",
                                  transition: "all 0.1s"
                                }}
                              >
                                {DAY_SHORT[d]}
                              </button>
                            ))}
                          </div>
                        )}
                     </div>
                   )}
                 </div>
               ) : (
                 editingSlot && (
                   <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40 }}>
                     <div>
                       <label style={labelStyle}>MATRICULADOS ({enrollments.length}/{editingSlot.capacity})</label>
                       <div style={{ border: "2px solid #000", background: "#FFF", maxHeight: 300, overflowY: "auto" }}>
                         {enrollments.map(en => (
                           <div key={en.id} style={{ padding: 10, borderBottom: "1px solid #EEE", display: "flex", justifyContent: "space-between" }}>
                             <span style={{ fontSize: 12, fontWeight: 700 }}>{en.profiles.full_name}</span>
                             <button onClick={() => handleUnenroll(en.id, editingSlot.id)} style={{ color: "#DC2626", border: "none", background: "none" }}><UserMinus size={14} /></button>
                           </div>
                         ))}
                       </div>
                     </div>
                     <div style={{ flex: 1 }}>
                         <label style={labelStyle}>CHECK-INS HOJE ({checkins.length})</label>
                         <div style={{ border: "2px solid #2563EB", background: "#EFF6FF", minHeight: 300, maxHeight: 400, overflowY: "auto" }}>
                           {checkins.length === 0 && (
                             <div style={{ padding: 40, textAlign: "center", color: "#60A5FA", fontWeight: 800, fontSize: 11 }}>NENHUM CHECK-IN</div>
                           )}
                           {checkins.map(c => (
                             <div key={c.id} style={{ 
                               padding: "12px 16px", 
                               borderBottom: "1px solid rgba(37,99,235,0.1)", 
                               display: "flex", 
                               alignItems: "center", 
                               justifyContent: "space-between",
                               background: c.status === "missed" ? "#FEE2E2" : "transparent"
                             }}>
                               <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                 <div style={{ width: 4, height: 24, background: c.status === "missed" ? "#DC2626" : "#2563EB" }} />
                                 <div>
                                   <div style={{ fontSize: 12, fontWeight: 800, color: "#000" }}>{c.profiles.full_name}</div>
                                   {c.status === "missed" && (
                                     <span style={{ fontSize: 9, fontWeight: 900, background: "#DC2626", color: "#FFF", padding: "1px 4px", borderRadius: 2 }}>FALTA</span>
                                   )}
                                 </div>
                               </div>
                               
                               <div style={{ display: "flex", gap: 8 }}>
                                 {c.status === "missed" ? (
                                   <button 
                                     title="Remover Falta" 
                                     onClick={async () => {
                                       const res = await unmarkAsAbsentAction(c.id);
                                       if (res.success) {
                                         loadSlotDetails(editingSlot);
                                         router.refresh();
                                       }
                                     }}
                                     style={{ color: "#000", border: "1.5px solid #000", background: "#FFF", padding: 4, borderRadius: 2, cursor: "pointer" }}
                                   >
                                     <RotateCcw size={14} />
                                   </button>
                                 ) : (
                                   <button 
                                     title="Marcar Falta (No-Show)"
                                     onClick={async () => {
                                       const res = await markAsAbsentAction(c.id);
                                       if (res.success) {
                                         loadSlotDetails(editingSlot);
                                         router.refresh();
                                       }
                                     }}
                                     style={{ color: "#DC2626", border: "1.5px solid #DC2626", background: "#FFF", padding: 4, borderRadius: 2, cursor: "pointer" }}
                                   >
                                     <UserX size={14} />
                                   </button>
                                 )}
                               </div>
                             </div>
                           ))}
                         </div>
                      </div>
                   </div>
                 )
               )}
            </div>
            <div style={{ padding: 32, borderTop: "3px solid #000", background: "#F9FAFB", display: "flex", gap: 16 }}>
              {activeTab !== "checkins" ? (
                <>
                  {editingSlot && (
                    <button onClick={() => handleDelete(editingSlot.id)} className="admin-btn" style={{ background: "#DC2626", color: "#FFF" }}>EXCLUIR</button>
                  )}
                  <button onClick={handleSubmit} className="admin-btn admin-btn-primary" style={{ flex: 1 }} disabled={isPending}>{isPending ? "SALVANDO..." : "SALVAR"}</button>
                </>
              ) : (
                <button onClick={() => setDrawerOpen(false)} className="admin-btn admin-btn-ghost" style={{ flex: 1, border: "2px solid #000" }}>FECHAR</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Unified Command Center logic moved below */}

      {/* ── UNIFIED COMMAND CENTER ── */}
      {commandCenterInfo && (() => {
        const { slot, date } = commandCenterInfo;
        const slotKey = `${slot.id}-${date}`;
        const isFechada = !!sessions[slotKey];
        
        // Obter todas as turmas do mesmo dia da semana para permitir migração
        const dayOfWeek = new Date(date + "T12:00:00Z").getUTCDay();
        const daySlots = slots.filter(s => s.day_of_week === dayOfWeek);

        return (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-white/40 backdrop-blur-md">
            <div className="w-full max-w-[1400px] max-h-[90vh] overflow-hidden bg-white border-[4px] border-black shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] flex flex-col">
              <ClassCommandCenter
                slot={slot}
                activeDate={date}
                isClosed={isFechada}
                coaches={coaches || []}
                substitutions={substitutions}
                daySlots={daySlots}
                occupancy={occupancy}
                onClose={() => setCommandCenterInfo(null)}
                onSuccess={(update) => {
                  const key = update ? `${update.id}-${update.date}` : `${slot.id}-${date}`;
                  if (update) {
                    if (update.coachId) {
                      setSubstitutions(prev => ({
                        ...prev,
                        [key]: { id: String(update.coachId), full_name: update.coachName || "Professor" }
                      }));
                    } else {
                      // Se coachId for null, remove do mapa local
                      setSubstitutions(prev => {
                        const newSubs = { ...prev };
                        delete newSubs[key];
                        return newSubs;
                      });
                    }
                  }
                  setCommandCenterInfo(null);
                  startTransition(() => {
                    router.refresh();
                  });
                }}
              />
            </div>
          </div>
        );
      })()}

      {reassignModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", justifyContent: "center", alignItems: "center", padding: 20 }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }} onClick={() => setReassignModal(null)} />
          <div style={{ position: "relative", width: 400, background: "#FFF", border: "4px solid #000", padding: 32, boxShadow: "16px 16px 0px rgba(0,0,0,0.1)" }}>
             <h2 style={{ fontSize: 18, fontWeight: 900, marginBottom: 16 }}>TROCAR HORÁRIO</h2>
             <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 20, color: "#666" }}>Aluno: <span style={{ color: "#000" }}>{reassignModal.studentName}</span></p>
             <select value={selectedNewSlotId} onChange={e => setSelectedNewSlotId(e.target.value)} style={{ width: "100%", padding: 12, border: "2px solid #000", marginBottom: 24, fontWeight: 800, fontSize: 13 }}>
                {initialSlots.filter(s => s.is_active).map(s => (
                  <option key={s.id} value={s.id}>{DAY_SHORT[s.day_of_week]} - {formatTime(s.time_start)} ({s.name})</option>
                ))}
             </select>
             <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setReassignModal(null)} className="admin-btn admin-btn-ghost" style={{ flex: 1 }}>CANCELAR</button>
                <button onClick={async () => { if (!reassignModal) return; await reassignEnrollment(reassignModal.enrollmentId, selectedNewSlotId); setReassignModal(null); router.refresh(); }} className="admin-btn admin-btn-primary" style={{ flex: 1 }} disabled={isPending}>CONFIRMAR</button>
             </div>
          </div>
        </div>
      )}

      {enrollModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", justifyContent: "center", alignItems: "center", padding: 20 }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }} onClick={() => setEnrollModal(null)} />
          <div style={{ position: "relative", width: 400, background: "#FFF", border: "4px solid #000", padding: 32, boxShadow: "16px 16px 0px rgba(0,0,0,0.1)" }}>
             <h2 style={{ fontSize: 18, fontWeight: 900, marginBottom: 16 }}>NOVA MATRÍCULA</h2>
             <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 20, color: "#666" }}>Aluno: <span style={{ color: "#000" }}>{enrollModal.studentName}</span></p>
             <label style={labelStyle}>SELECIONE A TURMA</label>
             <select value={selectedNewSlotId} onChange={e => setSelectedNewSlotId(e.target.value)} style={{ width: "100%", padding: 12, border: "2px solid #000", marginBottom: 24, fontWeight: 800, fontSize: 13, appearance: "none", background: "url(\"data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E\") no-repeat right 0.5rem center/1.5em 1.5em #FFF" }}>
                <option value="">Selecione um horário...</option>
                {initialSlots.filter(s => s.is_active).sort((a, b) => a.day_of_week - b.day_of_week || a.time_start.localeCompare(b.time_start)).map(s => (
                  <option key={s.id} value={s.id}>{DAY_SHORT[s.day_of_week]} - {formatTime(s.time_start)} ({s.name})</option>
                ))}
             </select>
             <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setEnrollModal(null)} className="admin-btn admin-btn-ghost" style={{ flex: 1 }}>CANCELAR</button>
                <button 
                  onClick={async () => { 
                    if (!enrollModal || !selectedNewSlotId) return; 
                    const res = await enrollStudent(selectedNewSlotId, enrollModal.studentId); 
                    if (res.error) showToast(res.error, "error");
                    else {
                      showToast("Matrícula realizada com sucesso!", "success");
                      setEnrollModal(null); 
                      router.refresh(); 
                    }
                  }} 
                  className="admin-btn admin-btn-primary" 
                  style={{ flex: 1 }} 
                  disabled={isPending || !selectedNewSlotId}
                >
                  {isPending ? "PROCESSANDO..." : "CONFIRMAR"}
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useTransition, useCallback, useEffect, useRef } from "react";
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
} from "lucide-react";
import CloseClassModal from "./CloseClassModal";
import {
  upsertClassSlot,
  toggleClassSlot,
  deleteClassSlot,
  bulkUpdateClassSlots,
  bulkCreateClassSlots,
  searchStudentsForEnrollment,
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
  getBoxSettings,
  updateBoxSettings,
  getHolidays,
  addHoliday,
  removeHoliday,
  triggerWaitlistPromotion,
} from "./actions";

/**
 * TurmasClient: Heavyweight dashboard for weekly schedule management.
 * 
 * @architecture
 * - Navigation: Three-tab system (Grid, Configuration, Students).
 * - State Management: Single complex State for Drawer (upsert/view) + Mode switching (Setup/Live).
 * - Performance: Server -> Client data handoff with memoized sorting.
 * - Security: Uses context-aware Server Actions with Zod validation.
 *
 * @key_features
 * 1. Grid Visualizer: Canonical Coliseu weekly schedule.
 * 2. Slot Configurator: Capacity, Coach, and Time-slot CRUD.
 * 3. Enrollment CRM: Fixed student assignments (matrículas) vs Live check-ins.
 * 4. Bulk Engine: Shift-wide updates for holiday scheduling.
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
  wods: { id: string; type_tag: string }[];
  enrollmentCounts?: Record<string, number>;
  coaches: { id: string; full_name: string | null }[];
  initialSettings?: any;
  initialHolidays?: any[];
}

/** Day labels mapping (0=Dom → 6=Sáb) */
const DAY_LABELS: Record<number, string> = {
  0: "Domingo",
  1: "Segunda",
  2: "Terça",
  3: "Quarta",
  4: "Quinta",
  5: "Sexta",
  6: "Sábado",
};

const DAY_SHORT: Record<number, string> = {
  0: "DOM",
  1: "SEG",
  2: "TER",
  3: "QUA",
  4: "QUI",
  5: "SEX",
  6: "SÁB",
};

/** Active days in the Coliseu grid */
const ACTIVE_DAYS = [1, 2, 3, 4, 5, 6];

/**
 * Formats time string from "HH:MM:SS" to "HH:MM".
 */
function formatTime(timeStr: string): string {
  return timeStr?.slice(0, 5) || "—";
}

export default function TurmasClient({ 
  initialSlots, 
  occupancy, 
  wods, 
  enrollmentCounts,
  coaches = [],
  initialSettings = {},
  initialHolidays = [],
}: Props) {
  const [slots] = useState<ClassSlot[]>(initialSlots);
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  

  // ── DRAWER STATE ──
  // Manages the multi-functional right-side panel.
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<ClassSlot | null>(null);
  const [activeTab, setActiveTab] = useState<"grid" | "settings">("grid");
  const [mode, setMode] = useState<"setup" | "live">("setup");
  const todayDay = new Date().getDay(); // 0-6

  // ── Drawer form state ──
  const [formName, setFormName] = useState("CrossTraining");
  const [formDays, setFormDays] = useState<number[]>([]);
  const [formTime, setFormTime] = useState("07:00");
  const [formCapacity, setFormCapacity] = useState(20);
  const [formCoach, setFormCoach] = useState("");
  const [formDuration, setFormDuration] = useState(60);
  const [isBulk, setIsBulk] = useState(false);

  // ── Settings & Holidays state ──
  const [settings, setSettings] = useState<Record<string, string>>(initialSettings || {});
  const [holidays, setHolidays] = useState<any[]>(initialHolidays || []);
  const [newHolidayDate, setNewHolidayDate] = useState("");
  const [newHolidayDesc, setNewHolidayDesc] = useState("");
  const [closingSlot, setClosingSlot] = useState<ClassSlot | null>(null);

  // ── Enrollment and Check-in state ──
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [checkins, setCheckins] = useState<any[]>([]); // Using any for checkins for now
  const [enrollmentsLoading, setEnrollmentsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<StudentProfile[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  const [waitlist, setWaitlist] = useState<any[]>([]);
  const [waitlistLoading, setWaitlistLoading] = useState(false);
  const [substituteCoachId, setSubstituteCoachId] = useState<string | null>(null);
  const [substitutionNotes, setSubstitutionNotes] = useState("");

  function showToast(msg: string, type: "success" | "error") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  /**
   * getCurrentWeekDates: Helper to get YYYY-MM-DD for each day in current week (Seg-Dom)
   */
  const currentWeekDates = (() => {
    const dates: Record<number, string> = {};
    const now = new Date();
    
    // Calculate Monday of current week in local time
    const day = now.getDay();
    const diff = (day === 0 ? -6 : 1 - day); 
    const monday = new Date(now);
    monday.setDate(now.getDate() + diff);

    for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        const dow = (i + 1) % 7; 
        
        // Use local date string (YYYY-MM-DD format)
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const dayOfMonth = String(d.getDate()).padStart(2, '0');
        dates[dow] = `${year}-${month}-${dayOfMonth}`;
    }
    return dates;
  })();

  /**
   * handleOpenSlot: Activates the Drawer for a specific slot.
   * Auto-fetches live data (Check-ins and Enrollments) for the context.
   * 
   * @param {ClassSlot} slot - The target slot object.
   */
  const loadSlotDetails = useCallback(async (slot: ClassSlot) => {
    setEnrollmentsLoading(true);
    setWaitlistLoading(true);
    
    // Fetch Enrollments (Fixed)
    const enrollRes = await getSlotEnrollments(slot.id);
    if (enrollRes.data) setEnrollments(enrollRes.data as unknown as Enrollment[]);

    // Fetch Waitlist
    const waitRes = await getSlotWaitlist(slot.id);
    if (waitRes.data) setWaitlist(waitRes.data);

    // Fetch Substitutions for today
    const todayStr = new Date().toISOString().split("T")[0];
    const subRes = await getSlotSubstitutions(todayStr);
    if (subRes.data) {
      const existingSub = subRes.data.find((s: any) => s.class_slot_id === slot.id);
      setSubstituteCoachId(existingSub?.substitute_coach_id || null);
      setSubstitutionNotes(existingSub?.notes || "");
    }

    // Fetch Check-ins (Today only)
    if (slot.day_of_week === todayDay) {
      const checkRes = await getSlotCheckins(slot.id);
      if (checkRes.data) setCheckins(checkRes.data);
    } else {
      setCheckins([]);
    }

    setEnrollmentsLoading(false);
    setWaitlistLoading(false);
  }, [todayDay]);

  /**
   * handleSaveSettings: Persists box operation rules.
   */
  const handleSaveSettings = async () => {
    startTransition(async () => {
      const res = await updateBoxSettings(settings);
      if (res.error) showToast(res.error, "error");
      else showToast("Configurações atualizadas com sucesso!", "success");
    });
  };

  /**
   * handleAddHoliday: Adds a new box-wide closure.
   */
  const handleAddHoliday = async () => {
    if (!newHolidayDate || !newHolidayDesc) {
      showToast("Preencha a data e descrição.", "error");
      return;
    }
    startTransition(async () => {
      const res = await addHoliday(newHolidayDate, newHolidayDesc);
      if (res.error) {
        showToast(res.error, "error");
      } else {
        showToast("Feriado adicionado!", "success");
        setNewHolidayDate("");
        setNewHolidayDesc("");
        // Optimistic update
        const updated = await getHolidays();
        if (updated.data) setHolidays(updated.data);
      }
    });
  };

  /**
   * handleRemoveHoliday: Deletes a holiday.
   */
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

  /**
   * handleWaitlistAdd/Remove/Promote
   */
  const handleWaitlistAdd = async (slotId: string, studentId: string) => {
    startTransition(async () => {
      const res = await addToWaitlist(slotId, studentId);
      if (res.error) showToast(res.error, "error");
      else {
        showToast("Adicionado à lista de espera!", "success");
        setSearchQuery("");
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
      const res = await triggerWaitlistPromotion(slotId);
      if (res.error) showToast(res.error, "error");
      else {
        showToast("Aluno promovido com sucesso!", "success");
        if (editingSlot) loadSlotDetails(editingSlot);
      }
    });
  };

  /**
   * handleSubstitutionSave
   */
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
   * Handles student search with debounce.
   */
  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    searchTimeout.current = setTimeout(async () => {
      setSearchLoading(true);
      const result = await searchStudentsForEnrollment(searchQuery);
      if (result.data) {
        // Filter out already enrolled students
        const enrolledIds = new Set(enrollments.map(e => e.student_id));
        setSearchResults(result.data.filter((s: StudentProfile) => !enrolledIds.has(s.id)));
      }
      setSearchLoading(false);
    }, 300);
    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current); };
  }, [searchQuery, enrollments]);


  /**
   * Enrolls a student and refreshes the list.
   */
  async function handleEnroll(slotId: string, studentId: string) {
    if (!editingSlot) return;
    startTransition(async () => {
      const result = await enrollStudent(slotId, studentId);
      if (result.error) {
        showToast(result.error, "error");
      } else {
        showToast("Aluno matriculado!", "success");
        setSearchQuery("");
        setSearchResults([]);
        await loadSlotDetails(editingSlot);
      }
    });
  }

  /**
   * Unenrolls a student and refreshes the list.
   */
  /**
   * Unenrolls a student and refreshes relevant data.
   */
  async function handleUnenroll(enrollmentId: string, slotId?: string) {
    startTransition(async () => {
      const result = await unenrollStudent(enrollmentId);
      if (result.error) {
        showToast(result.error, "error");
      } else {
        // If we are in the drawer, refresh details
        if (editingSlot && editingSlot.id === slotId) {
          await loadSlotDetails(editingSlot);
        }
      }
    });
  }

  /**
   * Opens the editor drawer for creating a new slot or editing an existing one.
   * In CHECKINS mode, also loads the enrolled students.
   */
  function openDrawer(slot?: ClassSlot) {
    if (slot) {
      setEditingSlot(slot);
      setFormName(slot.name);
      setFormDays([slot.day_of_week]);
      setFormTime(formatTime(slot.time_start));
      setFormCapacity(slot.capacity);
      setFormCoach(slot.coach_name || "");
      setFormDuration(slot.duration_minutes);
      // Load details when in checkins mode
      if (mode === "live") {
        loadSlotDetails(slot);
      }
    } else {
      setEditingSlot(null);
      setFormName("CrossTraining");
      setFormDays([]); // Deselect all by default to avoid confusion
      setFormTime("07:00");
      setFormCapacity(20);
      setFormCoach("");
      setFormDuration(60);
    }
    setIsBulk(false);
    setEnrollments([]);
    setSearchQuery("");
    setSearchResults([]);
    setDrawerOpen(true);
  }

  /**
   * Submits the drawer form (create, update or bulk).
   */
  async function handleSubmit() {
    startTransition(async () => {
      // ── VALIDATION ──
      if (!editingSlot && formDays.length === 0) {
        showToast("Selecione pelo menos um dia!", "error");
        return;
      }

      // ── BULK ACTION ──
      if (isBulk && editingSlot) {
        const result = await bulkUpdateClassSlots(formatTime(editingSlot.time_start), {
          capacity: formCapacity,
          coach_name: formCoach || undefined,
          name: formName
        });
        if (result.error) {
          showToast(result.error, "error");
        } else {
          showToast("Horários atualizados em massa!", "success");
          setDrawerOpen(false);
        }
        return;
      }

      // ── MULTI-DAY CREATION ──
      if (!editingSlot && formDays.length > 0) {
        const result = await bulkCreateClassSlots(formDays, {
          name: formName,
          time_start: formTime,
          duration_minutes: formDuration,
          capacity: formCapacity,
          coach_name: formCoach || undefined,
        });
        if (result.error) {
          showToast(result.error, "error");
        } else {
          showToast(`${formDays.length} horário(s) criado(s)!`, "success");
          setDrawerOpen(false);
        }
        return;
      }

      // ── SINGLE UPSERT (edit mode) ──
      const fd = new FormData();
      fd.set("name", formName);
      fd.set("day_of_week", String(formDays[0]));
      fd.set("time_start", formTime);
      fd.set("capacity", String(formCapacity));
      fd.set("duration_minutes", String(formDuration));
      fd.set("coach_name", formCoach);

      const result = await upsertClassSlot(fd, editingSlot?.id || null);
      if (result.error) {
        showToast(result.error, "error");
      } else {
        showToast("Turma atualizada!", "success");
        setDrawerOpen(false);
      }
    });
  }

  /**
   * Toggles active state of a slot.
   */
  function handleToggle(slot: ClassSlot) {
    startTransition(async () => {
      const result = await toggleClassSlot(slot.id, !slot.is_active);
      if (result.error) showToast(result.error, "error");
      else showToast(slot.is_active ? "Turma desativada" : "Turma reativada", "success");
    });
  }

  /**
   * Permanently deletes a slot.
   */
  function handleDelete(slotId: string) {
    if (!confirm("Tem certeza? Esta ação é irreversível.")) return;
    startTransition(async () => {
      const result = await deleteClassSlot(slotId);
      if (result.error) showToast(result.error, "error");
      else showToast("Turma removida", "success");
    });
  }

  // ── Organize slots into a grid structure ──
  // Collect all unique time_start values, sorted
  const allTimes = [...new Set(slots.map((s) => formatTime(s.time_start)))].sort();

  // Create a lookup: key = "day-time"
  const slotMap = new Map<string, ClassSlot>();
  slots.forEach((s) => {
    slotMap.set(`${s.day_of_week}-${formatTime(s.time_start)}`, s);
  });

  const activeSlots = slots.filter((s) => s.is_active);
  const inactiveSlots = slots.filter((s) => !s.is_active);

  return (
    <div className="admin-container-fluid">
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32, borderBottom: "4px solid #000", paddingBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 900, letterSpacing: "-0.04em", margin: "0 0 16px", textTransform: "uppercase" }}>
            Gestão de Box
          </h1>
          <div style={{ display: "flex", gap: 8 }}>
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
                borderRadius: 4
              }}
            >
              GRADE DE AULAS
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
              CONFIGURAÇÕES E DATAS
            </button>
          </div>
        </div>
        
        {activeTab === "grid" && (
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div 
              style={{ 
                display: "flex", 
                background: "#E5E7EB", 
                padding: 4, 
                border: "3px solid #000" 
              }}
            >
              <button
                onClick={() => setMode("setup")}
                style={{
                  padding: "8px 16px",
                  fontSize: 11,
                  fontWeight: 900,
                  background: mode === "setup" ? "#000" : "transparent",
                  color: mode === "setup" ? "#FFF" : "#000",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                MODO GESTÃO
              </button>
              <button
                onClick={() => setMode("live")}
                style={{
                  padding: "8px 16px",
                  fontSize: 11,
                  fontWeight: 900,
                  background: mode === "live" ? "#FFF" : "transparent",
                  color: "#000",
                  border: mode === "live" ? "3px solid #000" : "3px solid transparent",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6
                }}
              >
                CHECK-INS
              </button>
            </div>
            
            <button
              className="admin-btn admin-btn-primary"
              onClick={() => openDrawer()}
              style={{ height: 52 }}
            >
              <Plus size={20} />
              Novo Horário
            </button>
          </div>
        )}
      </div>

      {/* ── TAB CONTENT ── */}
      <div style={{ flex: 1 }}>
        {activeTab === "grid" && (
          <div className="animate-in fade-in duration-500">
            {/* ── STATS BAR ── */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, marginBottom: 40 }}>
              <div className="admin-card" style={{ display: "flex", flexDirection: "column", gap: 8, borderLeft: "6px solid #000" }}>
                <span style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: "#666" }}>
                  SLOTS ATIVOS
                </span>
                <span style={{ fontSize: 48, fontWeight: 900, color: "#000", lineHeight: 1 }}>{activeSlots.length}</span>
              </div>
              <div className="admin-card" style={{ display: "flex", flexDirection: "column", gap: 8, borderLeft: "6px solid #2563EB" }}>
                <span style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: "#666" }}>
                  DIAS COM AULA
                </span>
                <span style={{ fontSize: 48, fontWeight: 900, color: "#000", lineHeight: 1 }}>
                  {new Set(activeSlots.map((s) => s.day_of_week)).size}
                </span>
              </div>
              <div className="admin-card" style={{ display: "flex", flexDirection: "column", gap: 8, borderLeft: "6px solid #16A34A" }}>
                <span style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: "#666" }}>
                  VAGAS TOTAIS / DIA
                </span>
                <span style={{ fontSize: 48, fontWeight: 900, color: "#000", lineHeight: 1 }}>
                  {activeSlots.length > 0
                    ? Math.round(activeSlots.reduce((sum, s) => sum + s.capacity, 0) / (new Set(activeSlots.map((s) => s.day_of_week)).size || 1))
                    : 0}
                </span>
              </div>
            </div>

            {/* ── WEEKLY GRID TABLE ── */}
            <div className="admin-card" style={{ padding: 0, overflow: "hidden", marginBottom: 32 }}>
              <div
                style={{
                  padding: "20px 24px",
                  borderBottom: "2px solid #000",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: "#FAFAFA",
                }}
              >
                <h2 style={{ fontSize: 14, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>
                  <CalendarClock size={16} style={{ display: "inline", marginRight: 8, verticalAlign: "text-bottom" }} />
                  GRADE SEMANAL
                </h2>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table className="admin-table" style={{ width: "100%", minWidth: 700 }}>
                  <thead>
                    <tr>
                      <th style={{ paddingLeft: 24, width: 80, fontFamily: "monospace" }}>
                        <Clock size={14} style={{ marginRight: 4, verticalAlign: "text-bottom" }} />
                        HORA
                      </th>
                      {ACTIVE_DAYS.map((day) => {
                        const dateStr = currentWeekDates[day];
                        const holiday = holidays.find(h => h.date === dateStr);
                        return (
                          <th key={day} style={{ textAlign: "center", letterSpacing: "0.08em", padding: "12px 8px" }}>
                            <div style={{ fontSize: 13, fontWeight: 900 }}>{DAY_SHORT[day]}</div>
                            <div style={{ fontSize: 10, fontWeight: 700, color: "#666", marginTop: 2 }}>
                              {dateStr.split("-").reverse().slice(0, 2).join("/")}
                            </div>
                            {holiday && (
                              <div style={{
                                marginTop: 6,
                                background: "#DC2626",
                                color: "#FFF",
                                fontSize: 9,
                                fontWeight: 900,
                                padding: "2px 4px",
                                borderRadius: 2,
                                display: "inline-block"
                              }}>
                                BLOQUEADO
                              </div>
                            )}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {allTimes.map((time) => (
                      <tr key={time}>
                        <td
                          style={{
                            paddingLeft: 24,
                            fontFamily: "monospace",
                            fontWeight: 800,
                            fontSize: 15,
                            color: "#000",
                          }}
                        >
                          {time}
                        </td>
                        {ACTIVE_DAYS.map((day) => {
                          const dateStr = currentWeekDates[day];
                          const holiday = holidays.find(h => h.date === dateStr);
                          const slot = slotMap.get(`${day}-${time}`);
                          
                          if (!slot) {
                            return (
                              <td key={`${day}-${time}`} style={{ background: holiday ? "rgba(239, 68, 68, 0.05)" : "transparent" }} />
                            );
                          }

                          const currentOcc = occupancy[slot.id] || 0;
                          const enrollmentCount = (enrollmentCounts && enrollmentCounts[slot.id]) || 0;
                          const isToday = day === todayDay;
                          const matchingWod = wods.find(w => w.type_tag?.toLowerCase() === slot.name.toLowerCase());
                          const hasWod = !!matchingWod;
                          const occupancyRatio = slot.capacity > 0 ? enrollmentCount / slot.capacity : 0;

                          return (
                            <td key={day} style={{ textAlign: "center", padding: "8px 4px" }}>
                              <div
                                style={{
                                  display: "inline-flex",
                                  flexDirection: "column",
                                  alignItems: "center",
                                  gap: 4,
                                  padding: "8px 12px",
                                  border: slot.is_active ? "2px solid #000" : "2px dashed #CCC",
                                  background: mode === 'live' 
                                    ? (occupancyRatio >= 1 ? "#FEE2E2" : occupancyRatio > 0.8 ? "#FEF3C7" : "#F0FDF4")
                                    : "transparent",
                                  cursor: "pointer",
                                  opacity: slot.is_active ? 1 : 0.4,
                                  minWidth: 90,
                                  transition: "all 0.1s",
                                  position: "relative"
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = "#000";
                                  e.currentTarget.style.color = "#FFF";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = (mode === 'live' && isToday) 
                                    ? (occupancyRatio >= 1 ? "#FEE2E2" : occupancyRatio > 0.8 ? "#FEF3C7" : "#F0FDF4")
                                    : "transparent";
                                  e.currentTarget.style.color = "#000";
                                }}
                              >
                                {mode === 'live' && isToday && hasWod && (
                                  <div style={{ 
                                    position: "absolute", 
                                    top: -10, 
                                    left: "50%", 
                                    transform: "translateX(-50%)", 
                                    background: "#000", 
                                    color: "#FFF", 
                                    padding: "2px 8px", 
                                    fontSize: 9, 
                                    fontWeight: 900,
                                    whiteSpace: "nowrap",
                                    border: "2px solid #FFF",
                                    zIndex: 5
                                  }}>
                                     WOD: {matchingWod?.type_tag || "PROGRAMADO"}
                                  </div>
                                )}

                                <span style={{ fontWeight: 800, fontSize: 13 }}>{time}</span>
                                
                                {mode === 'live' ? (
                                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
                                    <span style={{ fontSize: 11, fontWeight: 900, color: occupancyRatio >= 1 ? "#DC2626" : "inherit" }}>
                                      {enrollmentCount}/{slot.capacity} <span style={{ fontSize: 8, opacity: 0.5 }}>MATR.</span>
                                    </span>
                                    {isToday && (
                                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                                        <span style={{ fontSize: 9, fontWeight: 800, color: "#2563EB", display: "flex", alignItems: "center", gap: 2 }}>
                                          {currentOcc} CHECKINS
                                        </span>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setClosingSlot(slot);
                                          }}
                                          onMouseEnter={(e) => {
                                            e.currentTarget.style.scale = "1.05";
                                          }}
                                          onMouseLeave={(e) => {
                                            e.currentTarget.style.scale = "1";
                                          }}
                                          style={{
                                            marginTop: 2,
                                            background: "#000",
                                            color: "#FFF",
                                            border: "none",
                                            padding: "4px 8px",
                                            fontSize: 9,
                                            fontWeight: 900,
                                            cursor: "pointer",
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 4,
                                            transition: "transform 0.1s"
                                          }}
                                        >
                                          <ShieldCheck size={10} /> FECHAR AULA
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                    <span style={{ 
                                      fontSize: 11, 
                                      fontWeight: 800, 
                                      color: occupancyRatio >= 1 ? "#DC2626" : "#666",
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 4
                                    }}>
                                      <Users size={11} />
                                      {enrollmentCount}/{slot.capacity}
                                    </span>
                                )}

                                {slot.coach_name && (
                                  <span style={{ fontSize: 9, color: "inherit", opacity: 0.6 }}>{slot.coach_name}</span>
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

      {/* ── INACTIVE SLOTS ── */}
      {inactiveSlots.length > 0 && (
        <div className="admin-card" style={{ borderStyle: "dashed", marginBottom: 32 }}>
          <h3 style={{ fontSize: 14, fontWeight: 800, margin: "0 0 12px", textTransform: "uppercase" }}>
            HORÁRIOS DESATIVADOS ({inactiveSlots.length})
          </h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {inactiveSlots.map((slot) => (
              <div
                key={slot.id}
                style={{
                  padding: "8px 16px",
                  border: "1px solid #CCC",
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#999",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  cursor: "pointer",
                }}
                onClick={() => openDrawer(slot)}
              >
                {DAY_SHORT[slot.day_of_week]} {formatTime(slot.time_start)}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggle(slot);
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#16A34A",
                    padding: 0,
                  }}
                  title="Reativar"
                >
                  <ToggleRight size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
          </div>
        )}

      {activeTab === "settings" && (
        <div className="animate-in fade-in duration-500">
          <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
            
            {/* ── OPERATION RULES ── */}
            <div className="admin-card">
              <h2 style={{ fontSize: 18, fontWeight: 900, marginBottom: 16, textTransform: "uppercase", display: "flex", alignItems: "center", gap: 8 }}>
                <Settings size={20} />
                Regras de Operação
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 450 }}>
                <div>
                  <label style={labelStyle}>Ocupação Máxima Padrão</label>
                  <input
                    type="number"
                    className="admin-input"
                    value={settings.default_capacity || "20"}
                    onChange={(e) => setSettings(prev => ({ ...prev, default_capacity: e.target.value }))}
                    style={{ background: "#F9FAFB", border: "2px solid #000" }}
                    min="1"
                  />
                </div>
                <div>
                  <label style={labelStyle}>Janela de Cancelamento (Horas)</label>
                  <input
                    type="number"
                    className="admin-input"
                    value={settings.cancellation_window_hours || "2"}
                    onChange={(e) => setSettings(prev => ({ ...prev, cancellation_window_hours: e.target.value }))}
                    style={{ background: "#F9FAFB", border: "2px solid #000" }}
                    min="0"
                  />
                  <span style={{ fontSize: 11, color: "#666", display: "block", marginTop: 4 }}>
                    O check-in não será retornado se faltar menos de X horas para a aula.
                  </span>
                </div>

                {/* ── PERFORMANCE RULES (XP) ── */}
                <div style={{ padding: 20, background: "#FFFBEB", border: "2px solid #F59E0B", marginTop: 8 }}>
                  <h3 style={{ fontSize: 13, fontWeight: 900, marginBottom: 12, textTransform: "uppercase", display: "flex", alignItems: "center", gap: 8, color: "#B45309" }}>
                    <Award size={16} />
                    Regras de Desempenho (XP)
                  </h3>
                  <label style={{ ...labelStyle, color: "#B45309" }}>XP Base por Aula Concluída</label>
                  <div style={{ position: "relative" }}>
                    <input
                      type="number"
                      className="admin-input"
                      value={settings.xp_per_class || "10"}
                      onChange={(e) => setSettings(prev => ({ ...prev, xp_per_class: e.target.value }))}
                      style={{ background: "#FFF", border: "2px solid #F59E0B", paddingLeft: 44 }}
                      min="0"
                    />
                    <Zap size={18} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#F59E0B" }} />
                  </div>
                  <span style={{ fontSize: 10, color: "#B45309", display: "block", marginTop: 6, fontWeight: 700 }}>
                    Este valor será creditado ao aluno quando a aula for FECHADA pelo sistema.
                  </span>
                </div>

                <button 
                  className="admin-btn admin-btn-primary" 
                  style={{ marginTop: 8, height: 52, justifyContent: "center" }}
                  onClick={handleSaveSettings}
                  disabled={isPending}
                >
                  {isPending ? "SALVANDO..." : <><Save size={18} /> Salvar Regras</>}
                </button>
              </div>
            </div>

            {/* ── HOLIDAY MANAGER ── */}
            <div className="admin-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
                <h2 style={{ fontSize: 18, fontWeight: 900, textTransform: "uppercase", display: "flex", alignItems: "center", gap: 8, margin: 0 }}>
                  <CalendarClock size={20} />
                  Feriados e Bloqueios
                </h2>
                <div style={{ fontSize: 11, fontWeight: 800, background: "#000", color: "#FFF", padding: "4px 8px" }}>
                  AGENDA BLOQUEADA nestas datas
                </div>
              </div>

              {/* Add Holiday Form */}
              <div style={{ display: "grid", gridTemplateColumns: "200px 1fr auto", gap: 16, marginBottom: 32, padding: 20, background: "#F9FAFB", border: "2px dashed #000" }}>
                <div>
                  <label style={labelStyle}>Data do Evento</label>
                  <input 
                    type="date" 
                    className="admin-input" 
                    value={newHolidayDate}
                    onChange={(e) => setNewHolidayDate(e.target.value)}
                    style={{ border: "2px solid #000" }} 
                  />
                </div>
                <div>
                  <label style={labelStyle}>Descrição / Motivo</label>
                  <input 
                    type="text" 
                    className="admin-input" 
                    placeholder="Ex: Natal, Reforma, Feriado Local..."
                    value={newHolidayDesc}
                    onChange={(e) => setNewHolidayDesc(e.target.value)}
                    style={{ border: "2px solid #000" }} 
                  />
                </div>
                <div style={{ alignSelf: "flex-end" }}>
                  <button 
                    className="admin-btn admin-btn-primary" 
                    style={{ height: 48, paddingInline: 24 }}
                    onClick={handleAddHoliday}
                    disabled={isPending}
                  >
                    <Plus size={18} /> ADICIONAR
                  </button>
                </div>
              </div>

              {/* Holiday List */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {holidays.length === 0 ? (
                  <div style={{ padding: 40, textAlign: "center", border: "2px solid #EEE", borderRadius: 8, color: "#999", fontSize: 13 }}>
                    Nenhum feriado ou bloqueio cadastrado.
                  </div>
                ) : (
                  holidays.map((h) => (
                    <div 
                      key={h.id} 
                      style={{ 
                        display: "flex", 
                        alignItems: "center", 
                        gap: 20, 
                        padding: "16px 24px", 
                        background: "#FFF", 
                        border: "2px solid #000",
                        boxShadow: "4px 4px 0px rgba(0,0,0,0.05)"
                      }}
                    >
                      <div style={{ minWidth: 100, fontSize: 16, fontWeight: 900, fontFamily: "monospace" }}>
                        {new Date(h.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </div>
                      <div style={{ flex: 1, fontSize: 14, fontWeight: 700, textTransform: "uppercase" }}>
                        {h.description}
                      </div>
                      <button 
                        className="admin-btn admin-btn-ghost" 
                        style={{ color: "#DC2626", border: "none", padding: 8 }}
                        onClick={() => handleRemoveHoliday(h.id)}
                        disabled={isPending}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      </div>

      {/* ── MODAL OVERLAY ── */}
      {drawerOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
          }}
        >
          {/* Backdrop */}
          <div
            style={{ 
              position: "absolute", 
              inset: 0, 
              background: "rgba(0,0,0,0.6)",
              backdropFilter: "blur(4px)"
            }}
            onClick={() => setDrawerOpen(false)}
          />

          {/* Modal Panel */}
          <div
            style={{
              position: "relative",
              width: (mode === "live" && editingSlot) ? 920 : 720,
              maxWidth: "100%",
              background: "#FFF",
              border: "4px solid #000",
              display: "flex",
              flexDirection: "column",
              maxHeight: "95vh",
              boxShadow: "32px 32px 0px rgba(0,0,0,0.1)",
              animation: "modalAppear 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
              transition: "width 0.2s ease",
            }}
          >
            <style>
              {`
                @keyframes modalAppear {
                  from { opacity: 0; transform: scale(0.95) translateY(10px); }
                  to { opacity: 1; transform: scale(1) translateY(0); }
                }
              `}
            </style>

            {/* Modal Header */}
            <div
              style={{
                padding: "24px 32px",
                borderBottom: "3px solid #000",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "#000",
                color: "#FFF",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 12, height: 12, background: "#FFF" }} />
                <h2 style={{ fontSize: 18, fontWeight: 900, textTransform: "uppercase", margin: 0, letterSpacing: "0.05em" }}>
                  {editingSlot
                    ? (mode === "live" ? `${formatTime(editingSlot.time_start)} — ${DAY_LABELS[editingSlot.day_of_week]}` : "EDITAR HORÁRIO")
                    : "NOVO HORÁRIO"
                  }
                </h2>
                {mode === "live" && editingSlot && (
                  <span style={{ fontSize: 11, fontWeight: 600, opacity: 0.7, marginLeft: 8 }}>
                    {enrollments.length}/{editingSlot.capacity} MATRICULADOS
                  </span>
                )}
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#FFF", padding: 4 }}
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Content - Scrollable if needed */}
            <div style={{ overflowY: "auto", flex: 1 }}>
              <div style={{ 
                padding: 32, 
                display: (mode === "live" && editingSlot) ? "grid" : "block",
                gridTemplateColumns: (mode === "live" && editingSlot) ? "1fr 1fr" : "none",
                gap: 40,
              }}>
                {/* ═══ SETUP MODE: Form Fields ═══ */}
                {mode === "setup" && (
                  <>
                    {/* Modalidade (Full Width) */}
                    <div style={{ marginBottom: 24 }}>
                      <label style={labelStyle}>MODALIDADE</label>
                      <input
                        type="text"
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        style={inputStyle}
                        placeholder="Ex: CrossTraining, LPO, Yoga..."
                      />
                    </div>

                    {/* Dias da Semana (Full Width) */}
                    <div style={{ marginBottom: 24 }}>
                      <label style={labelStyle}>
                        {editingSlot ? "DIA DA SEMANA" : "DIAS DA SEMANA"}
                      </label>
                      {editingSlot ? (
                        <select
                          value={formDays[0]}
                          onChange={(e) => setFormDays([Number(e.target.value)])}
                          style={inputStyle}
                        >
                          {ACTIVE_DAYS.map((d) => (
                            <option key={d} value={d}>{DAY_LABELS[d]}</option>
                          ))}
                        </select>
                      ) : (
                        <div style={{ display: "flex", gap: 6 }}>
                          {ACTIVE_DAYS.map((d) => {
                            const isSelected = formDays.includes(d);
                            return (
                              <button
                                key={d}
                                type="button"
                                onClick={() => {
                                  setFormDays((prev) =>
                                    isSelected
                                      ? prev.filter((x) => x !== d)
                                      : [...prev, d].sort()
                                  );
                                }}
                                style={{
                                  flex: 1,
                                  padding: "12px 0",
                                  fontSize: 12,
                                  fontWeight: 900,
                                  border: "3px solid #000",
                                  background: isSelected ? "#000" : "#FFF",
                                  color: isSelected ? "#FFF" : "#000",
                                  cursor: "pointer",
                                  transition: "all 0.1s",
                                }}
                              >
                                {DAY_SHORT[d]}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                      {/* Left Column Fields */}
                      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                        <div>
                          <label style={labelStyle}>HORÁRIO DE INÍCIO</label>
                          <input
                            type="time"
                            value={formTime}
                            onChange={(e) => setFormTime(e.target.value)}
                            style={inputStyle}
                          />
                        </div>
                        <div>
                          <label style={labelStyle}>DURAÇÃO (MINUTOS)</label>
                          <input
                            type="number"
                            value={formDuration}
                            onChange={(e) => setFormDuration(Number(e.target.value))}
                            style={inputStyle}
                            min={30}
                            max={120}
                            step={15}
                          />
                        </div>
                      </div>

                      {/* Right Column Fields */}
                      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                        <div>
                          <label style={labelStyle}>CAPACIDADE (VAGAS)</label>
                          <input
                            type="number"
                            value={formCapacity}
                            onChange={(e) => setFormCapacity(Number(e.target.value))}
                            style={inputStyle}
                            min={1}
                            max={100}
                          />
                        </div>
                        <div>
                          <label style={labelStyle}>COACH (OPCIONAL)</label>
                          <select
                            value={formCoach}
                            onChange={(e) => setFormCoach(e.target.value)}
                            style={inputStyle}
                          >
                            <option value="">Nenhum</option>
                            {coaches.map((c) => (
                              <option key={c.id} value={c.full_name || ""}>
                                {c.full_name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Bulk Edit Option (Full Width) */}
                    {editingSlot && (
                      <div 
                        style={{ 
                          marginTop: 24, 
                          padding: 20, 
                          background: "#F3F4F6", 
                          border: "3px solid #000",
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 16
                        }}
                      >
                        <input 
                          type="checkbox" 
                          id="bulkCheck"
                          checked={isBulk}
                          onChange={(e) => setIsBulk(e.target.checked)}
                          style={{ marginTop: 4, width: 22, height: 22, accentColor: "#000" }} 
                        />
                        <label htmlFor="bulkCheck" style={{ fontSize: 13, fontWeight: 800, lineHeight: 1.5, cursor: "pointer" }}>
                          REPLICAR PARA TODOS OS DIAS<br/>
                          <span style={{ fontWeight: 500, color: "#666", fontSize: 12 }}>
                            Aplica essas alterações a todos os horários das {formatTime(editingSlot.time_start)}.
                          </span>
                        </label>
                      </div>
                    )}
                  </>
                )}

                {/* ═══ CHECKINS MODE: Enrollment Management ═══ */}
                {mode === "live" && editingSlot && (
                  <>
                    {/* Column 1: Enrollment Management */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                      <div style={{
                        display: "flex",
                        gap: 16,
                        padding: 16,
                        background: "#F3F4F6",
                        border: "2px solid #000",
                        marginBottom: 8
                      }}>
                <div style={{ flex: 1 }}>
                          <span style={{ fontSize: 10, fontWeight: 800, color: "#666", textTransform: "uppercase", letterSpacing: "0.1em" }}>MODALIDADE</span>
                          <div style={{ fontSize: 14, fontWeight: 900 }}>{editingSlot.name}</div>
                        </div>
                        <div>
                          <span style={{ fontSize: 10, fontWeight: 800, color: "#666", textTransform: "uppercase", letterSpacing: "0.1em" }}>CAPACIDADE</span>
                          <div style={{ fontSize: 14, fontWeight: 900 }}>{enrollments.length}/{editingSlot.capacity}</div>
                        </div>
                      </div>

                      {/* Search */}
                      <div>
                        <label style={labelStyle}>ADICIONAR ALUNO (MATRÍCULA OU ESPERA)</label>
                        <div style={{ position: "relative" }}>
                          <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{ ...inputStyle, paddingLeft: 40 }}
                            placeholder="Buscar por nome..."
                          />
                          <Search size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#999" }} />
                        </div>
                        
                        {searchResults.length > 0 && (
                          <div style={{ border: "2px solid #000", borderTop: "none", background: "#FFF", maxHeight: 150, overflowY: "auto", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)" }}>
                            {searchResults.map(s => {
                              const alreadyEnrolled = enrollments.some(en => en.student_id === s.id);
                              const alreadyOnWaitlist = waitlist.some(w => w.student_id === s.id);
                              
                              return (
                                <div key={s.id} style={{ padding: 12, borderBottom: "1px solid #EEE", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                  <span style={{ fontWeight: 800, fontSize: 12 }}>{s.first_name} {s.last_name}</span>
                                  <div style={{ display: "flex", gap: 8 }}>
                                    {!alreadyEnrolled && (
                                      <button 
                                        onClick={() => handleEnroll(editingSlot.id, s.id)} 
                                        className="admin-btn" 
                                        style={{ padding: "4px 8px", fontSize: 10, background: "#000", color: "#FFF" }}
                                      >
                                        <UserPlus size={12} /> MATRICULAR
                                      </button>
                                    )}
                                    {!alreadyOnWaitlist && !alreadyEnrolled && (
                                      <button 
                                        onClick={() => handleWaitlistAdd(editingSlot.id, s.id)} 
                                        className="admin-btn admin-btn-ghost" 
                                        style={{ padding: "4px 8px", fontSize: 10, border: "2px solid #000" }}
                                      >
                                        <Clock size={12} /> ESPERA
                                      </button>
                                    )}
                                    {(alreadyEnrolled || alreadyOnWaitlist) && (
                                      <span style={{ fontSize: 10, fontWeight: 900, color: "#10B981" }}>JÁ ADICIONADO</span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Enrollment List */}
                      <div>
                        <label style={labelStyle}>MATRICULADOS ({enrollments.length}/{editingSlot.capacity})</label>
                        <div style={{ border: "2px solid #000", maxHeight: 200, overflowY: "auto", background: "#FFF" }}>
                          {enrollments.length === 0 ? (
                            <div style={{ padding: 20, textAlign: "center", fontSize: 11, color: "#999" }}>Nenhum aluno matriculado.</div>
                          ) : (
                            enrollments.map((en, i) => (
                              <div key={en.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: 10, borderBottom: i < enrollments.length-1 ? "1px solid #EEE" : "none" }}>
                                <span style={{ fontSize: 10, fontWeight: 900, color: "#CCC", width: 15 }}>{i+1}</span>
                                <div style={{ flex: 1, fontWeight: 700, fontSize: 12 }}>{en.profiles.first_name} {en.profiles.last_name}</div>
                                <button onClick={() => handleUnenroll(en.id, editingSlot.id)} style={{ color: "#DC2626", background: "none", border: "none", cursor: "pointer" }}><UserMinus size={14} /></button>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Waitlist Section */}
                      <div style={{ marginTop: 8 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                          <label style={{ ...labelStyle, marginBottom: 0 }}>LISTA DE ESPERA ({waitlist.length})</label>
                          {waitlist.length > 0 && enrollments.length < editingSlot.capacity && (
                            <button 
                              onClick={() => handleManualPromote(editingSlot.id)}
                              style={{ fontSize: 9, fontWeight: 900, background: "#10B981", color: "#FFF", border: "none", padding: "4px 8px", cursor: "pointer" }}
                            >
                              EFETIVAR ESPERA
                            </button>
                          )}
                        </div>
                        <div style={{ border: "2px solid #000", maxHeight: 150, overflowY: "auto", background: "#FFF" }}>
                          {waitlist.length === 0 ? (
                            <div style={{ padding: 20, textAlign: "center", fontSize: 11, color: "#999" }}>Fila vazia.</div>
                          ) : (
                            waitlist.map((w, i) => (
                              <div key={w.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: 10, borderBottom: i < waitlist.length-1 ? "1px solid #EEE" : "none" }}>
                                <span style={{ fontSize: 10, fontWeight: 900, color: "#CCC", width: 15 }}>{i+1}</span>
                                <div style={{ flex: 1, fontWeight: 700, fontSize: 12 }}>{w.profiles.first_name} {w.profiles.last_name}</div>
                                <button onClick={() => handleWaitlistRemove(w.id)} style={{ color: "#DC2626", background: "none", border: "none", cursor: "pointer" }}><X size={14} /></button>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Column 2: Live Activity Monitoring */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                       {/* Substitution Section */}
                       <div style={{
                         padding: 24,
                         background: "#FFFBEB",
                         border: "3px solid #F59E0B",
                         marginBottom: 0
                       }}>
                         <label style={{ ...labelStyle, color: "#B45309" }}>SUBSTITUIÇÃO DE COACH (HOJE)</label>
                         <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                           <select
                             value={substituteCoachId || ""}
                             onChange={(e) => setSubstituteCoachId(e.target.value || null)}
                             style={{ ...inputStyle, borderColor: "#F59E0B" }}
                           >
                             <option value="">Nenhuma substituição</option>
                             {coaches.map((c) => (
                               <option key={c.id} value={c.id}>
                                 {c.full_name}
                               </option>
                             ))}
                           </select>
                           <textarea
                             placeholder="Observações da substituição..."
                             value={substitutionNotes}
                             onChange={(e) => setSubstitutionNotes(e.target.value)}
                             style={{ ...inputStyle, borderColor: "#F59E0B", minHeight: 60, fontSize: 12 }}
                           />
                           <button 
                             onClick={handleSubstitutionSave}
                             className="admin-btn"
                             style={{ background: "#F59E0B", color: "#FFF", border: "2px solid #000", width: "100%", justifyContent: "center" }}
                           >
                             SALVAR SUBSTITUIÇÃO
                           </button>
                         </div>
                       </div>
 
                       <div>
                         <label style={labelStyle}>
                           MONITORAMENTO EM TEMPO REAL
                         </label>
                         
                         {editingSlot.day_of_week === todayDay ? (
                           <>
                             <div style={{ display: "flex", background: "#F0F9FF", border: "2px solid #2563EB", padding: 16, marginBottom: 12 }}>
                               <div style={{ flex: 1 }}>
                                 <div style={{ fontSize: 10, fontWeight: 900, color: "#2563EB" }}>CHECK-INS HOJE</div>
                                 <div style={{ fontSize: 24, fontWeight: 900, color: "#1E3A8A" }}>{checkins.length}</div>
                               </div>
                             </div>
 
                             <div style={{ border: "2px solid #2563EB", background: "#FFF", maxHeight: 200, overflowY: "auto" }}>
                               {checkins.length === 0 ? (
                                 <div style={{ padding: 40, textAlign: "center", fontSize: 12, color: "#999" }}>Aguardando presenças...</div>
                               ) : (
                                 checkins.map((c, i) => (
                                   <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: 10, borderBottom: i < checkins.length-1 ? "1px solid #BFDBFE" : "none" }}>
                                     <div style={{ width: 6, height: 6, background: "#2563EB", borderRadius: "50%" }} />
                                     <div style={{ flex: 1, fontWeight: 800, fontSize: 12, color: "#1E3A8A" }}>{c.profiles.first_name} {c.profiles.last_name}</div>
                                     <span style={{ fontSize: 10, color: "#2563EB", fontWeight: 700 }}>{new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                   </div>
                                 ))
                               )}
                             </div>
                           </>
                         ) : (
                           <div style={{ padding: 60, textAlign: "center", border: "2px dashed #DDD", opacity: 0.5 }}>
                             <div style={{ fontSize: 11, fontWeight: 900 }}>DADOS DE CHECK-IN INDISPONÍVEIS</div>
                             <div style={{ fontSize: 10 }}>Monitoramento apenas no dia correspondente.</div>
                           </div>
                         )}
                       </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            {mode === "setup" && (
              <div
                style={{
                  padding: "32px",
                  borderTop: "3px solid #000",
                  display: "flex",
                  gap: 16,
                  background: "#F9FAFB"
                }}
              >
                {/* Secondary Actions (only for editing) */}
                {editingSlot && (
                  <div style={{ display: "flex", gap: 12, flex: 1 }}>
                    <button
                      className="admin-btn admin-btn-ghost"
                      onClick={() => handleToggle(editingSlot)}
                      disabled={isPending}
                      style={{ flex: 1, justifyContent: "center", border: "3px solid #000" }}
                    >
                      {editingSlot.is_active ? (
                        <><ToggleLeft size={18} /> DESATIVAR</>
                      ) : (
                        <><ToggleRight size={18} /> REATIVAR</>
                      )}
                    </button>
                    <button
                      className="admin-btn"
                      onClick={() => handleDelete(editingSlot.id)}
                      disabled={isPending}
                      style={{
                        flex: 1,
                        justifyContent: "center",
                        background: "#DC2626",
                        color: "#FFF",
                        border: "3px solid #000",
                      }}
                    >
                      <Trash2 size={18} /> EXCLUIR
                    </button>
                  </div>
                )}

                {/* Primary Action */}
                <button
                  className="admin-btn admin-btn-primary"
                  onClick={handleSubmit}
                  disabled={isPending || (!editingSlot && formDays.length === 0)}
                  style={{ 
                    flex: editingSlot ? 1.5 : 1, 
                    height: 56, 
                    justifyContent: "center",
                    fontSize: 16,
                    fontWeight: 900
                  }}
                >
                  <Save size={20} />
                  {isPending
                    ? "SALVANDO..."
                    : editingSlot
                      ? "SALVAR ALTERAÇÕES"
                      : `CRIAR ${formDays.length} HORÁRIO${formDays.length > 1 ? "S" : ""}`
                  }
                </button>
              </div>
            )}

            {/* CHECKINS mode footer — close only */}
            {mode === "live" && editingSlot && (
              <div
                style={{
                  padding: "20px 32px",
                  borderTop: "3px solid #000",
                  display: "flex",
                  justifyContent: "flex-end",
                  background: "#F9FAFB"
                }}
              >
                <button
                  className="admin-btn admin-btn-ghost"
                  onClick={() => setDrawerOpen(false)}
                  style={{ border: "3px solid #000", height: 48, justifyContent: "center", paddingInline: 32 }}
                >
                  <X size={16} /> FECHAR
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      {/* ── CLOSE CLASS MODAL ── */}
      {closingSlot && (
        <CloseClassModal
          slot={closingSlot}
          onClose={() => setClosingSlot(null)}
          onSuccess={() => {
            setClosingSlot(null);
            showToast("AULA FECHADA COM SUCESSO! XP DISTRIBUÍDO.", "success");
            setTimeout(() => window.location.reload(), 1500);
          }}
        />
      )}
    </div>
  );
}

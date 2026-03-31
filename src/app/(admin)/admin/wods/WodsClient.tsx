"use client";

import { useState, useTransition, useMemo } from "react";
import {
  Calendar, Plus, Save, Dumbbell, Clock, X, Trash2,
  Flame, Zap, Timer, ChevronDown, Eye, Pencil, Copy, BookOpen
} from "lucide-react";
import { upsertWod, deleteWod } from "../../actions";
import BenchmarkLibraryModal from "@/components/admin/BenchmarkLibraryModal";

/**
 * WodsClient: Brutalist Split-Screen WOD Builder & Benchmark Integration.
 * 
 * @architecture
 * - Heavy Client Component orchestrating multiple sub-states (Forms, Modals, Mobile Preview).
 * - Implements Optimistic Updates / UI transitions (`useTransition`) before sending the final 
 *   payload to `upsertWod` Server Action.
 * 
 * @businessLogic
 * - **WOD Engine:** Emits real-time visual feedback to the Right Panel (Mobile Preview) mimicking
 *   exactly what the student sees in the Activity Timeline.
 * - **Benchmark Library:** Integrates `BenchmarkLibraryModal` to auto-populate complex `wods` fields
 *   (title, tag, time_cap, metric, content) accelerating coach workflows.
 * 
 * @design
 * - 50/50 Split Screen. Left = Operational Forms (Iron Monolith UI). Right = Device Mock.
 * 
 * @param {WodData[]} initialWods - Current week's WODs injected by the Server wrapper bypassing client fetch.
 * @param weekDates Pre-calculated dates for the calendar strip.
 */

interface Wod {
  id: string;
  date: string;
  title: string;
  warm_up: string | null;
  technique: string | null;
  wod_content: string;
  type_tag: string | null;
  time_cap: string | null;
  result_type: string | null;
}

interface WodsClientProps {
  initialWods: Wod[];
  weekDates: { label: string; date: string; isToday: boolean }[];
}

/** All supported workout modalities */
const WOD_MODALITIES = [
  "AMRAP", "AMRAP REPEATS", "AMRAP WITH BUY-IN",
  "EMOM", "EMOM MULTI",
  "FOR TIME", "RFT: SAME REPS", "RFT: VARYING REPS", "RFT WITH BOOKENDS",
  "EACH ROUND FOR TIME",
  "DEATH BY REPS", "FGB STYLE",
  "TABATA", "CHIPPER",
  "WEIGHTLIFTING SETS", "STRENGTH",
  "FREE WOD STYLE"
];

const RESULT_TYPES = [
  { value: "reps", label: "Repetições / Rounds" },
  { value: "time", label: "Tempo (HH:MM:SS)" },
  { value: "load", label: "Carga Máxima (kg)" },
  { value: "rounds", label: "Rounds + Reps" },
];

/** Active editor tab */
type EditorTab = "warmup" | "skill" | "wod";

export default function WodsClient({ initialWods, weekDates }: WodsClientProps) {
  const [selectedDate, setSelectedDate] = useState(
    weekDates.find((d) => d.isToday)?.date ?? weekDates[0].date
  );
  const [showEditor, setShowEditor] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<EditorTab>("warmup");
  const [showModalitySelect, setShowModalitySelect] = useState(false);
  const [isBenchmarkModalOpen, setIsBenchmarkModalOpen] = useState(false);

  // Find existing WOD for selected date
  const currentWod = initialWods.find((w) => w.date === selectedDate);

  // ── Form State ──
  const [wodType, setWodType] = useState(currentWod?.title || "AMRAP");
  const [warmup, setWarmup] = useState(currentWod?.warm_up || "");
  const [technique, setTechnique] = useState(currentWod?.technique || "");
  const [wodContent, setWodContent] = useState(currentWod?.wod_content || "");
  const [typeTag, setTypeTag] = useState(currentWod?.type_tag || "AMRAP");
  const [timeCap, setTimeCap] = useState(currentWod?.time_cap || "");
  const [resultType, setResultType] = useState(currentWod?.result_type || "reps");

  const selectedDay = weekDates.find((d) => d.date === selectedDate);

  // ── Handlers ──
  function handleDateChange(date: string) {
    setSelectedDate(date);
    const wod = initialWods.find((w) => w.date === date);
    setWodType(wod?.title || "AMRAP");
    setWarmup(wod?.warm_up || "");
    setTechnique(wod?.technique || "");
    setWodContent(wod?.wod_content || "");
    setTypeTag(wod?.type_tag || "AMRAP");
    setTimeCap(wod?.time_cap || "");
    setResultType(wod?.result_type || "reps");
    setShowEditor(false);
    setActiveTab("warmup");
  }

  function openEditor() {
    if (currentWod) {
      setWodType(currentWod.title);
      setWarmup(currentWod.warm_up || "");
      setTechnique(currentWod.technique || "");
      setWodContent(currentWod.wod_content || "");
      setTypeTag(currentWod.type_tag || "AMRAP");
      setTimeCap(currentWod.time_cap || "");
      setResultType(currentWod.result_type || "reps");
    }
    setShowEditor(true);
    setActiveTab("warmup");
  }

  async function handleSave() {
    const formData = new FormData();
    formData.append("date", selectedDate);
    formData.append("title", wodType);
    formData.append("warm_up", warmup);
    formData.append("technique", technique);
    formData.append("wod_content", wodContent);
    formData.append("type_tag", typeTag);
    formData.append("time_cap", timeCap);
    formData.append("result_type", resultType);

    startTransition(async () => {
      const result = await upsertWod(formData);
      if (result.success) {
        setShowEditor(false);
      } else {
        alert(result.error);
      }
    });
  }

  async function handleDelete() {
    if (!confirm("Tem certeza que deseja remover a programação deste dia?")) return;
    startTransition(async () => {
      const result = await deleteWod(selectedDate);
      if (result.success) {
        handleDateChange(selectedDate);
      } else {
        alert(result.error);
      }
    });
  }

  // ── Preview Data (live) ──
  const previewHasContent = !!(warmup || technique || wodContent);

  return (
    <div className="admin-container-fluid">
      {/* ── PAGE HEADER ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "32px" }}>
        <div>
          <h1 style={{ fontSize: "32px", fontWeight: 800, letterSpacing: "-0.03em", margin: "0 0 4px" }}>
            Quadro de Treinos
          </h1>
          <p style={{ fontSize: "14px", color: "#666", fontWeight: 500, margin: 0 }}>
            Programação Diária e Metodologia Coliseu
          </p>
        </div>
        <div style={{ display: "flex", gap: "12px" }}>
          {currentWod && !showEditor && (
            <button
              onClick={handleDelete}
              disabled={isPending}
              className="admin-btn admin-btn-ghost"
              style={{ color: "#DC2626", height: "48px" }}
            >
              <Trash2 size={18} />
              REMOVER
            </button>
          )}
          <button
            onClick={() => showEditor ? setShowEditor(false) : openEditor()}
            disabled={isPending}
            className={`admin-btn ${showEditor ? "admin-btn-secondary" : "admin-btn-primary"}`}
            style={{ height: "48px" }}
          >
            {showEditor ? <X size={18} /> : <Pencil size={18} />}
            {showEditor ? "CANCELAR" : (currentWod ? "EDITAR PROGRAMAÇÃO" : "PUBLICAR TREINO")}
          </button>
        </div>
      </div>

      {/* ── WEEK CALENDAR STRIP ── */}
      <div
        className="admin-card"
        style={{ display: "flex", padding: 0, overflow: "hidden", marginBottom: "32px" }}
      >
        {weekDates.map((day) => {
          const isSelected = day.date === selectedDate;
          const hasWod = initialWods.some((w) => w.date === day.date);
          const dayNum = new Date(day.date + "T00:00:00Z").getUTCDate();
          return (
            <button
              key={day.date}
              onClick={() => handleDateChange(day.date)}
              style={{
                flex: 1, padding: "24px 12px", border: "none",
                borderRight: "2px solid #000",
                background: isSelected ? "#000" : "#FFF",
                color: isSelected ? "#FFF" : "#000",
                cursor: "pointer", display: "flex", flexDirection: "column",
                alignItems: "center", gap: "4px",
                transition: "all 0.1s ease", position: "relative"
              }}
            >
              {hasWod && (
                <div style={{
                  position: "absolute", top: "10px", right: "10px",
                  width: "6px", height: "6px", borderRadius: "50%",
                  background: isSelected ? "var(--brand-primary, #E31B23)" : "#000"
                }} />
              )}
              <span style={{ fontSize: "11px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", opacity: isSelected ? 0.7 : 0.5 }}>
                {day.label}
              </span>
              <span style={{ fontSize: "28px", fontWeight: 900, lineHeight: 1 }}>{dayNum}</span>
              {day.isToday && (
                <div style={{
                  marginTop: "8px", padding: "2px 8px",
                  background: isSelected ? "#FFF" : "#000",
                  color: isSelected ? "#000" : "#FFF",
                  fontSize: "9px", fontWeight: 900, textTransform: "uppercase"
                }}>
                  HOJE
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* ── EDITOR (SPLIT SCREEN) or VIEW ── */}
      {showEditor ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0", minHeight: "700px" }}>

          {/* ═══ LEFT: CONSTRUCTION ZONE ═══ */}
          <div className="admin-card" style={{ borderRight: "3px solid #000", borderRadius: 0, padding: 0, display: "flex", flexDirection: "column", height: "100%" }}>

            {/* Editor Header */}
            <div style={{
              padding: "20px 28px", borderBottom: "2px solid #000",
              display: "flex", justifyContent: "space-between", alignItems: "center",
              flexShrink: 0
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Pencil size={18} />
                <span style={{ fontSize: "13px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  BUILD WORKOUT
                </span>
              </div>
              <div style={{
                padding: "4px 12px", background: "#000", color: "#FFF",
                fontSize: "11px", fontWeight: 800, textTransform: "uppercase"
              }}>
                {selectedDay?.label} — {new Date(selectedDate + "T00:00:00Z").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" })}
              </div>
            </div>

            {/* ── TABS: Warm-up | Skill | WOD ── */}
            <div style={{ display: "flex", borderBottom: "2px solid #000", flexShrink: 0 }}>
              {([
                { key: "warmup" as EditorTab, label: "Warm-up", icon: <Flame size={14} /> },
                { key: "skill" as EditorTab, label: "Skill / Técnica", icon: <Zap size={14} /> },
                { key: "wod" as EditorTab, label: "WOD", icon: <Dumbbell size={14} /> },
              ]).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    flex: 1, padding: "16px 12px", border: "none",
                    borderBottom: activeTab === tab.key ? "3px solid #000" : "3px solid transparent",
                    background: activeTab === tab.key ? "#F9FAFB" : "#FFF",
                    color: activeTab === tab.key ? "#000" : "#999",
                    cursor: "pointer", display: "flex", alignItems: "center",
                    justifyContent: "center", gap: "8px",
                    fontSize: "12px", fontWeight: 800, textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    transition: "all 0.15s ease",
                  }}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* ── TAB CONTENT ── */}
            <div style={{ padding: "28px", flex: 1, overflowY: "auto" }}>

              {/* ━━ WARM-UP TAB ━━ */}
              {activeTab === "warmup" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  <div>
                    <label style={labelStyle}>Cadastre o Aquecimento</label>
                    <textarea
                      rows={12}
                      value={warmup}
                      onChange={(e) => setWarmup(e.target.value)}
                      placeholder={"Ex:\n3 Rounds\n200m Run\n10 Air Squats\n10 Push-ups\n10 Ring Rows"}
                      style={textareaStyle}
                    />
                  </div>
                  <p style={hintStyle}>
                    💡 Dica: Cada linha vira uma instrução separada para o aluno. Mantenha o formato limpo.
                  </p>
                </div>
              )}

              {/* ━━ SKILL / TECHNIQUE TAB ━━ */}
              {activeTab === "skill" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  <div>
                    <label style={labelStyle}>Adicione um cabeçalho (opcional)</label>
                    <input
                      type="text"
                      value={wodType}
                      onChange={(e) => setWodType(e.target.value)}
                      placeholder="Ex: Back Squat 5x5"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Cadastre a Técnica / Força</label>
                    <textarea
                      rows={10}
                      value={technique}
                      onChange={(e) => setTechnique(e.target.value)}
                      placeholder={"Ex:\n5x3 Back Squat @ 80% 1RM\nRest 2:00 between sets\n\nSuperset:\n3x12 RDL @ moderate\n3x15 Hip Thrusts"}
                      style={textareaStyle}
                    />
                  </div>
                </div>
              )}

              {/* ━━ WOD TAB ━━ */}
              {activeTab === "wod" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

                  {/* Modality Selector */}
                  <div>
                    <label style={labelStyle}>Selecione a Modalidade</label>
                    <div style={{ position: "relative" }}>
                      <button
                        onClick={() => setShowModalitySelect(!showModalitySelect)}
                        style={{
                          width: "100%", padding: "14px 16px", border: "2px solid #000",
                          background: "#FFF", cursor: "pointer", display: "flex",
                          justifyContent: "space-between", alignItems: "center",
                          fontSize: "14px", fontWeight: 700, textAlign: "left"
                        }}
                      >
                        {typeTag || "Selecione..."}
                        <ChevronDown size={18} />
                      </button>

                      {showModalitySelect && (
                        <div style={{
                          position: "absolute", top: "100%", left: 0, right: 0,
                          maxHeight: "280px", overflowY: "auto",
                          background: "#FFF", border: "2px solid #000",
                          borderTop: "none", zIndex: 50,
                        }}>
                          {WOD_MODALITIES.map((mod) => (
                            <button
                              key={mod}
                              onClick={() => { setTypeTag(mod); setShowModalitySelect(false); }}
                              style={{
                                width: "100%", padding: "12px 16px", border: "none",
                                borderBottom: "1px solid #EEE",
                                background: typeTag === mod ? "#000" : "#FFF",
                                color: typeTag === mod ? "#FFF" : "#000",
                                cursor: "pointer", textAlign: "left",
                                fontSize: "13px", fontWeight: typeTag === mod ? 800 : 500,
                              }}
                            >
                              {mod}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Time Cap + Result Type */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                    <div>
                      <label style={labelStyle}>Time Cap</label>
                      <div style={{ position: "relative" }}>
                        <input
                          type="text"
                          value={timeCap}
                          onChange={(e) => setTimeCap(e.target.value)}
                          placeholder="Ex: 15:00"
                          style={inputStyle}
                        />
                        <Timer size={16} style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", color: "#999" }} />
                      </div>
                    </div>
                    <div>
                      <label style={labelStyle}>Tipo de Resultado</label>
                      <select
                        value={resultType}
                        onChange={(e) => setResultType(e.target.value)}
                        style={{ ...inputStyle, cursor: "pointer" }}
                      >
                        {RESULT_TYPES.map((rt) => (
                          <option key={rt.value} value={rt.value}>{rt.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* WOD Content */}
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                      <label style={{ ...labelStyle, marginBottom: 0 }}>Cadastre o WOD (Metcon)</label>
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); setIsBenchmarkModalOpen(true); }}
                        className="admin-btn admin-btn-ghost"
                        style={{ fontSize: "10px", padding: "6px 12px", height: "auto", border: "1px solid #000", background: "#FFF" }}
                      >
                        <BookOpen size={12} style={{ marginRight: "4px" }} /> CARREGAR BENCHMARK
                      </button>
                    </div>
                    <textarea
                      rows={10}
                      value={wodContent}
                      onChange={(e) => setWodContent(e.target.value)}
                      placeholder={"Ex:\n21-15-9\nThrusters (43/30kg)\nPull-ups"}
                      style={{
                        ...textareaStyle,
                        fontFamily: "'Inter', monospace",
                        fontSize: "16px",
                        fontWeight: 700,
                        lineHeight: 1.5,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* ── SAVE BAR ── */}
            <div style={{
              padding: "20px 28px", borderTop: "2px solid #000",
              display: "flex", justifyContent: "space-between", alignItems: "center",
              background: "#FAFAFA"
            }}>
              <button
                onClick={() => setShowEditor(false)}
                className="admin-btn admin-btn-ghost"
                style={{ fontSize: "13px" }}
              >
                Voltar
              </button>
              <button
                onClick={handleSave}
                disabled={isPending}
                className="admin-btn admin-btn-primary"
                style={{ height: "52px", padding: "0 32px", fontSize: "14px" }}
              >
                <Save size={18} />
                {isPending ? "SALVANDO..." : "SALVAR E PUBLICAR"}
              </button>
            </div>
          </div>

          {/* ═══ RIGHT: LIVE PREVIEW ═══ */}
          <div style={{ background: "#111", color: "#FFF", position: "relative", overflow: "hidden" }}>

            {/* Preview Header */}
            <div style={{
              padding: "16px 24px", borderBottom: "1px solid rgba(255,255,255,0.08)",
              display: "flex", alignItems: "center", gap: "10px",
            }}>
              <Eye size={16} style={{ opacity: 0.5 }} />
              <span style={{ fontSize: "10px", fontWeight: 800, letterSpacing: "0.25em", color: "rgba(255,255,255,0.4)", textTransform: "uppercase" }}>
                Pré-visualização do Aluno
              </span>
            </div>

            {/* Simulated Phone Frame */}
            <div style={{ padding: "28px 24px" }}>

              {/* WOD Header Section */}
              <div style={{ marginBottom: "28px" }}>
                <span style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.3em", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", display: "block", marginBottom: "10px" }}>
                  WOD — {selectedDay?.label}
                </span>
                <h2 style={{
                  fontSize: "36px", fontWeight: 900, lineHeight: 0.9,
                  letterSpacing: "-0.02em", fontFamily: "var(--font-display, 'Inter')",
                }}>
                  {wodType.split(" ")[0] || "TREINO"}
                  <br />
                  <span style={{ color: "#E31B23" }}>{wodType.split(" ").slice(1).join(" ")}</span>
                </h2>
              </div>

              {/* Specs Bar */}
              <div style={{ display: "flex", gap: "12px", marginBottom: "28px" }}>
                <div style={{ background: "rgba(255,255,255,0.05)", padding: "8px 14px", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <span style={{ fontSize: "8px", fontWeight: 800, color: "rgba(255,255,255,0.3)", display: "block", marginBottom: "2px" }}>MODALIDADE</span>
                  <span style={{ fontSize: "12px", fontWeight: 900, color: "#FFF" }}>{typeTag || "—"}</span>
                </div>
                {timeCap && (
                  <div style={{ background: "rgba(255,255,255,0.05)", padding: "8px 14px", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <span style={{ fontSize: "8px", fontWeight: 800, color: "rgba(255,255,255,0.3)", display: "block", marginBottom: "2px" }}>TIME CAP</span>
                    <span style={{ fontSize: "12px", fontWeight: 900, color: "#E31B23" }}>{timeCap}</span>
                  </div>
                )}
                <div style={{ background: "rgba(255,255,255,0.05)", padding: "8px 14px", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <span style={{ fontSize: "8px", fontWeight: 800, color: "rgba(255,255,255,0.3)", display: "block", marginBottom: "2px" }}>RESULTADO</span>
                  <span style={{ fontSize: "12px", fontWeight: 900, color: "#FFF" }}>
                    {RESULT_TYPES.find(r => r.value === resultType)?.label.split(" ")[0] || "—"}
                  </span>
                </div>
              </div>

              {/* Content Sections */}
              <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

                {/* Warm-up Preview */}
                {warmup && (
                  <div style={{ opacity: 0.8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                      <h3 style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.3em", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", margin: 0 }}>AQUECIMENTO</h3>
                      <div style={{ flex: 1, height: "1px", background: "linear-gradient(90deg, rgba(255,255,255,0.1), transparent)" }} />
                    </div>
                    <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.6)", lineHeight: 1.6, whiteSpace: "pre-line", margin: 0 }}>
                      {warmup}
                    </p>
                  </div>
                )}

                {/* Technique Preview */}
                {technique && (
                  <div style={{ opacity: 0.9 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                      <h3 style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.3em", color: "#5B8DEF", textTransform: "uppercase", margin: 0 }}>TÉCNICA / SKILL</h3>
                      <div style={{ flex: 1, height: "1px", background: "linear-gradient(90deg, #5B8DEF33, transparent)" }} />
                    </div>
                    <p style={{ fontSize: "15px", fontWeight: 600, color: "#FFF", lineHeight: 1.5, whiteSpace: "pre-line", margin: 0 }}>
                      {technique}
                    </p>
                  </div>
                )}

                {/* WOD Preview */}
                {wodContent && (
                  <div style={{
                    background: "rgba(227,27,35,0.04)", padding: "20px",
                    border: "1px solid rgba(227,27,35,0.15)", position: "relative"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
                      <h3 style={{ fontSize: "9px", fontWeight: 800, letterSpacing: "0.2em", color: "#E31B23", textTransform: "uppercase", margin: 0 }}>
                        DETALHES DO WOD
                      </h3>
                      <div style={{ flex: 1, height: "1px", background: "linear-gradient(90deg, rgba(227,27,35,0.3), transparent)" }} />
                    </div>
                    <p style={{ fontSize: "17px", fontWeight: 700, whiteSpace: "pre-line", lineHeight: 1.4, margin: 0 }}>
                      {wodContent}
                    </p>
                  </div>
                )}

                {!previewHasContent && (
                  <div style={{ textAlign: "center", padding: "60px 20px", opacity: 0.3 }}>
                    <Dumbbell size={40} style={{ marginBottom: "16px" }} />
                    <p style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase" }}>
                      Comece preenchendo o Warm-up...
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

      ) : (
        /* ═══ VIEW MODE (non-editing) ═══ */
        <div className="admin-card" style={{ padding: "32px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "32px", borderBottom: "2px solid #000", paddingBottom: "20px" }}>
            <Calendar size={24} />
            <h2 style={{ fontSize: "20px", fontWeight: 800, textTransform: "uppercase", margin: 0 }}>
              {selectedDay?.label}, {new Date(selectedDate + "T00:00:00Z").toLocaleDateString("pt-BR", { day: "2-digit", month: "long", timeZone: "UTC" })}
            </h2>
          </div>

          {currentWod ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "40px" }}>
              {/* Header Tags */}
              <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                <div style={{ display: "inline-flex", padding: "8px 16px", background: "#000", color: "#FFF", fontWeight: 900, fontSize: "14px" }}>
                  {currentWod.title}
                </div>
                {currentWod.type_tag && (
                  <div style={{ padding: "6px 12px", border: "2px solid #000", fontSize: "12px", fontWeight: 800 }}>
                    {currentWod.type_tag}
                  </div>
                )}
                {currentWod.time_cap && (
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px", border: "2px solid #000", fontSize: "12px", fontWeight: 800 }}>
                    <Timer size={14} />
                    {currentWod.time_cap}
                  </div>
                )}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "40px" }}>
                <div>
                  <h3 style={{ fontSize: "12px", fontWeight: 800, textTransform: "uppercase", color: "#666", marginBottom: "16px", letterSpacing: "0.05em" }}>PARTE A: AQUECIMENTO</h3>
                  <div style={{ fontSize: "16px", fontWeight: 600, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                    {currentWod.warm_up || "Nenhuma instrução definida."}
                  </div>
                </div>
                <div>
                  <h3 style={{ fontSize: "12px", fontWeight: 800, textTransform: "uppercase", color: "#666", marginBottom: "16px", letterSpacing: "0.05em" }}>PARTE B: TÉCNICA / FORÇA</h3>
                  <div style={{ fontSize: "16px", fontWeight: 600, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                    {currentWod.technique || "Nenhuma instrução definida."}
                  </div>
                </div>
              </div>

              <div>
                <h3 style={{ fontSize: "12px", fontWeight: 800, textTransform: "uppercase", color: "#666", marginBottom: "16px", letterSpacing: "0.05em" }}>PARTE C: WOD</h3>
                <div style={{
                  fontSize: "24px", fontWeight: 800, lineHeight: 1.4,
                  whiteSpace: "pre-wrap", background: "#F9FAFB",
                  padding: "32px", borderLeft: "8px solid #000"
                }}>
                  {currentWod.wod_content}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "80px 0" }}>
              <Dumbbell size={48} style={{ marginBottom: "20px", opacity: 0.2 }} />
              <p style={{ fontSize: "18px", fontWeight: 600, color: "#999", margin: 0 }}>
                Nenhum treino publicado para esta data.
              </p>
              <button
                onClick={openEditor}
                className="admin-btn admin-btn-ghost"
                style={{ marginTop: "24px", textDecoration: "underline" }}
              >
                + Adicionar Programação
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── MODALS ── */}
      <BenchmarkLibraryModal
        isOpen={isBenchmarkModalOpen}
        onClose={() => setIsBenchmarkModalOpen(false)}
        onSelect={(b) => {
          setWodContent(b.wod_content);
          setWodType(b.title);
          setTypeTag(b.type_tag);
          setTimeCap(b.time_cap);
          setResultType(b.result_type);
        }}
      />
    </div>
  );
}

// ── Shared Styles ──
const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "11px",
  fontWeight: 800,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#333",
  marginBottom: "8px",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "14px 16px",
  border: "2px solid #E5E7EB",
  fontSize: "14px",
  fontWeight: 600,
  background: "#FFF",
  transition: "border-color 0.15s ease",
  outline: "none",
  boxSizing: "border-box",
};

const textareaStyle: React.CSSProperties = {
  width: "100%",
  padding: "16px",
  border: "2px solid #E5E7EB",
  fontSize: "14px",
  fontWeight: 500,
  lineHeight: 1.6,
  resize: "vertical",
  background: "#FFF",
  outline: "none",
  fontFamily: "inherit",
  boxSizing: "border-box",
};

const hintStyle: React.CSSProperties = {
  fontSize: "12px",
  color: "#888",
  fontWeight: 500,
  margin: 0,
};

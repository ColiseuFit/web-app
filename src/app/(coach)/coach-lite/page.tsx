import { createClient } from "@/lib/supabase/server";
import { getTodayDate, checkIsSlotBlocked, resolveSlotCoach } from "@/lib/date-utils";
import { getCachedLevels } from "@/lib/constants/levels_actions";
import { getSlotCheckins, searchStudentsCoachAction } from "@/app/(admin)/admin/turmas/actions";
import DateNavigator from "@/components/coach/DateNavigator";
import { Search, Plus, UserPlus, CheckCircle, Users, Activity, Expand, Eye, UserX, Info, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { toggleLiteAttendance, addLiteStudent, closeLiteClass } from "./actions";

/**
 * Coach Lite Dashboard (100% SSR + Server Actions)
 * Otimizado especificamente para rodar no iOS 9 / Browsers Legados.
 * NADA DE JAVASCRIPT CLIENT-SIDE (sem useState, useRouter, Hydration).
 * Cada clique aciona uma Action nativa (HTML `<form>`) e um refetch ultrarrápido SSoT.
 */
export default async function CoachLitePage(props: { searchParams: Promise<{ date?: string, expand?: string, q?: string, error?: string }> }) {
  const supabase = await createClient();
  const searchParams = await props.searchParams;
  
  const activeDateStr = searchParams.date || getTodayDate();
  const expandedSlotId = searchParams.expand || null;
  const errorMsg = searchParams.error || null;
  const searchQuery = searchParams.q || "";
  
  const dynamicLevels = await getCachedLevels();
  const activeDateObj = new Date(activeDateStr + "T00:00:00Z");
  const dayOfWeek = activeDateObj.getUTCDay();

  // 1. Busca Turmas
  const { data: rawSlots } = await supabase
    .from("class_slots")
    .select(`
      *,
      coach_profile:default_coach_id (full_name),
      class_substitutions (
        substitute_coach_id,
        coach_profile:substitute_coach_id (full_name),
        date
      )
    `)
    .eq("day_of_week", dayOfWeek)
    .order("time_start", { ascending: true });
    
  const { data: holidays } = await supabase.from("box_holidays").select("*").eq("date", activeDateStr);

  const slots = (rawSlots || []).map(slot => {
    const coachData = resolveSlotCoach(slot, activeDateStr);
    const blockRule = checkIsSlotBlocked(slot.id, slot.time_start, activeDateStr, holidays || []);
    return {
      ...slot,
      coach_name: coachData.name,
      is_substitution: coachData.isSubstitution,
      is_blocked: !!blockRule,
      block_description: blockRule?.description || null
    };
  });

  // 2. Turmas Encerradas (SSoT)
  const initialFinishedSlots: Record<string, boolean> = {};
  const { data: finalizations } = await supabase.from("class_sessions").select("class_slot_id").eq("date", activeDateStr);
  if (finalizations) finalizations.forEach(f => { if (f.class_slot_id) initialFinishedSlots[f.class_slot_id] = true; });

  // 3. Dados Dinâmicos da Turma Expandida
  let expandedCheckins: any[] = [];
  let studentSearchResults: any[] = [];
  
  if (expandedSlotId) {
    const checkinsRes = await getSlotCheckins(expandedSlotId, activeDateStr);
    if (checkinsRes.data) expandedCheckins = checkinsRes.data;

    // Busca manual (Pure HTML GET form behavior)
    if (searchQuery.length >= 2) {
      const searchRes = await searchStudentsCoachAction(searchQuery);
      if (searchRes.data) studentSearchResults = searchRes.data;
    }
  }

  // Helpers SSoT
  function getLevelColor(level: string) {
    return dynamicLevels[level.toLowerCase()]?.color || "#CCCCCC";
  }
  
  function getLevelLabel(level: string) {
    return dynamicLevels[level.toLowerCase()]?.label || level.toUpperCase();
  }

  return (
    <>
      <DateNavigator activeDateStr={activeDateStr} />
      
      <div style={{ paddingBottom: "100px", maxWidth: "800px", margin: "0 auto", padding: "16px" }}>
        {/* LITE BANNER */}
        <div style={{ background: "#000", color: "#FFF", padding: "8px 16px", fontSize: "11px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", display: "flex", gap: "8px", alignItems: "center", marginBottom: "24px" }}>
          <Info size={14} /> MODO LITE ATIVO (IPAD 2)
        </div>

        <div style={{ marginBottom: "24px" }}>
          <h2 className="font-display" style={{ fontSize: "32px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.05em", color: "#000", lineHeight: 1 }}>
            {activeDateStr === getTodayDate() ? "AULAS DE HOJE" : "AULAS DO DIA"}
          </h2>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {slots.length === 0 && (
            <div style={{ background: "#FFF", border: "4px solid #000", boxShadow: "8px 8px 0px #000", padding: "60px 24px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
              <Activity size={32} style={{ opacity: 0.2 }} />
              <div>
                <p className="font-headline" style={{ margin: 0, fontSize: "18px", fontWeight: 900 }}>FOLGA OU DIA SEM TURMAS</p>
                <p style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}>Nenhuma aula agendada no sistema.</p>
              </div>
            </div>
          )}

          {slots.map(slot => {
            const isExpanded = expandedSlotId === slot.id;
            const isFinished = initialFinishedSlots[slot.id];

            return (
              <div key={slot.id} id={`slot-${slot.id}`} style={{ 
                background: isFinished ? "#F8F8F8" : "#FFF",
                border: "3px solid #000",
                boxShadow: isExpanded ? (isFinished ? "8px 8px 0px #000" : "8px 8px 0px var(--red)") : "4px 4px 0px #000",
                borderRadius: "0px",
                overflow: "visible",
              }}>
                {slot.is_blocked && (
                  <div style={{ background: "#000", color: "var(--red)", padding: "6px 12px", fontSize: "11px", fontWeight: 900, textTransform: "uppercase", borderBottom: "3px solid #000", display: "flex", alignItems: "center", gap: "8px" }}>
                    <AlertTriangle size={14} /> CANCELADA: {slot.block_description}
                  </div>
                )}
                
                {/* 
                  Instead of onClick via JS, we use a pure HTML native link to expand! 
                  And to ensure we don't drop the current date, we include `?date=` too.
                */}
                <Link 
                  href={isExpanded ? `?date=${activeDateStr}` : `?date=${activeDateStr}&expand=${slot.id}#slot-${slot.id}`}
                  style={{
                    display: "block",
                    textDecoration: "none",
                    width: "100%",
                    padding: "16px",
                    background: isExpanded ? (isFinished ? "#000" : "var(--red)") : "transparent",
                    color: isExpanded ? "#FFF" : "#000",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div className="font-display" style={{ fontSize: "24px", fontWeight: 900, lineHeight: 1 }}>
                        {slot.time_start.slice(0, 5)}
                      </div>
                      <div className="font-headline" style={{ fontSize: "14px", marginTop: "4px", display: "flex", alignItems: "center", gap: "6px" }}>
                        {slot.name} <span style={{ opacity: 0.5 }}>•</span> {slot.coach_name?.split(' ')[0]}
                      </div>
                    </div>
                    
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      {isFinished && <span style={{ fontSize: "10px", fontWeight: 900, background: "#000", color: "#FFF", padding: "4px 10px", border: "2px solid #000" }}>ENCERRADA</span>}
                      {slot.is_blocked && <span style={{ fontSize: "10px", fontWeight: 900, background: "var(--red)", color: "#FFF", padding: "4px 10px", border: "2px solid #000" }}>CANCELADA</span>}
                      <div style={{ width: "32px", height: "32px", borderRadius: "50%", border: isExpanded ? "2px solid #FFF" : "2px solid #000", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {isExpanded ? "-" : "+"}
                      </div>
                    </div>
                  </div>
                </Link>

                {/* AREA EXPANDIDA (Carregada estaticamente do servidor!) */}
                {isExpanded && (
                  <div style={{ padding: "16px", borderTop: "3px solid #000" }}>
                    
                    {errorMsg && (
                      <div style={{ background: "#FEF2F2", color: "#9F1239", padding: "12px", borderLeft: "4px solid #E11D48", marginBottom: "16px", fontWeight: 800, fontSize: "12px" }}>
                        {errorMsg}
                      </div>
                    )}

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", paddingBottom: "16px", borderBottom: "2px dashed #000" }}>
                      <div style={{ fontSize: "12px", fontWeight: 800, color: "#000" }}>
                        <Users size={14} style={{ display: "inline", marginRight: "6px", verticalAlign: "-2px" }} />
                        {expandedCheckins.filter(c => c.status !== "missed").length} / {slot.capacity} PRESENTES
                      </div>
                    </div>

                    {!isFinished && !slot.is_blocked && (
                      <div style={{ marginBottom: "24px" }}>
                        <form method="GET" action="/coach-lite" style={{ display: "flex", gap: "8px" }}>
                          <input type="hidden" name="date" value={activeDateStr} />
                          <input type="hidden" name="expand" value={slot.id} />
                          <input 
                            name="q"
                            type="text" 
                            defaultValue={searchQuery}
                            placeholder="Buscar aluno no sistema..." 
                            style={{ flex: 1, padding: "12px 14px", border: "2px solid #000", outline: "none", fontSize: "13px", fontWeight: 800, WebkitAppearance: "none", boxSizing: "border-box" }}
                          />
                          <button type="submit" style={{ background: "#000", color: "#FFF", border: "none", padding: "0 16px", fontWeight: 900, fontSize: "11px", letterSpacing: "0.1em", cursor: "pointer", WebkitAppearance: "none", boxSizing: "border-box" }}>
                            BUSCAR
                          </button>
                        </form>
                        
                        {/* Resultados de Busca */}
                        {studentSearchResults.length > 0 && (
                          <div style={{ marginTop: "8px", border: "2px solid #000", background: "#F5F5F5" }}>
                            {studentSearchResults.map(student => (
                              <form action={addLiteStudent} key={student.id}>
                                <input type="hidden" name="slotId" value={slot.id} />
                                <input type="hidden" name="dateStr" value={activeDateStr} />
                                <input type="hidden" name="studentId" value={student.id} />
                                <button type="submit" style={{ width: "100%", textAlign: "left", padding: "12px", background: "none", border: "none", borderBottom: "1px solid #CCC", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
                                  <div>
                                    <div style={{ fontWeight: 800, fontSize: "13px", color: "#000" }}>{student.full_name}</div>
                                    <div style={{ fontSize: "10px", color: getLevelColor(student.level), fontWeight: 900 }}>{getLevelLabel(student.level)}</div>
                                  </div>
                                  <Plus size={16} />
                                </button>
                              </form>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "24px" }}>
                      {expandedCheckins.map(c => {
                        const isSelected = c.status === "checked" || c.status === "confirmed";
                        const alreadyConfirmed = c.status === "confirmed";
                        
                        return (
                          <div key={c.id}>
                            <form action={toggleLiteAttendance}>
                              <input type="hidden" name="checkinId" value={c.id} />
                              <input type="hidden" name="isSelected" value={isSelected ? "true" : "false"} />
                              
                              <button 
                                type="submit"
                                disabled={alreadyConfirmed || isFinished}
                                style={{
                                  width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                                  padding: "16px", border: "3px solid #000", minHeight: "58px",
                                  background: isSelected ? (alreadyConfirmed ? "#F0F0F0" : "#F0FDF4") : "#FEF2F2",
                                  color: "#000", opacity: isFinished ? 0.8 : 1, textAlign: "left", cursor: "pointer",
                                  WebkitAppearance: "none", boxSizing: "border-box"
                                }}
                              >
                                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                  <div style={{ width: "6px", height: "30px", background: getLevelColor(c.profiles.level) }} />
                                  <div>
                                    <div className="font-headline" style={{ fontSize: "16px", fontWeight: 900, textTransform: "uppercase" }}>
                                      {c.profiles.display_name || c.profiles.full_name?.split(" ").slice(0, 2).join(" ")}
                                    </div>
                                    <div style={{ marginTop: "2px", fontSize: "9px", fontWeight: 900, color: isSelected ? "#16A34A" : "#DC2626" }}>
                                      {isSelected ? "PRESENTE" : "FALTA"}
                                    </div>
                                  </div>
                                </div>

                                <div style={{ 
                                  width: "28px", height: "28px", border: "2px solid #000", 
                                  background: isSelected ? (alreadyConfirmed ? "#CCC" : "#16A34A") : "#FFF", 
                                  color: isSelected ? "#FFF" : "#000", display: "flex", alignItems: "center", justifyContent: "center"
                                }}>
                                  {isSelected ? <CheckCircle size={18} /> : <div style={{ width: 12, height: 2, background: "#CCC" }} />}
                                </div>
                              </button>
                            </form>
                          </div>
                        );
                      })}
                    </div>

                    {expandedCheckins.length > 0 && !isFinished && !slot.is_blocked && (
                      <form action={closeLiteClass}>
                        <input type="hidden" name="slotId" value={slot.id} />
                        <input type="hidden" name="dateStr" value={activeDateStr} />
                        {/* Send array of currently selected IDs (checked or confirmed statuses) */}
                        <input 
                          type="hidden" 
                          name="selectedIds" 
                          value={expandedCheckins.filter(c => c.status === "checked" || c.status === "confirmed").map(c => c.student_id).join(",")} 
                        />
                        <button
                          type="submit"
                          style={{
                               width: "100%", background: "var(--red)", color: "#FFF", border: "3px solid #000", padding: "20px",
                               fontSize: "20px", fontWeight: 900, letterSpacing: "0.1em", boxShadow: "4px 4px 0px #000",
                               display: "flex", justifyContent: "center", alignItems: "center", gap: "12px", textTransform: "uppercase",
                               cursor: "pointer", WebkitAppearance: "none", boxSizing: "border-box"
                          }}
                        >
                          FECHAR AULA E DAR PONTOS
                        </button>
                      </form>
                    )}

                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

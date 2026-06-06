"use client";

import React, { useState, useEffect } from "react";
import { Trophy, Medal, Flame, Calendar } from "lucide-react";
import { 
  getDailyLeaderboard, 
  DailyLeaderboardData, 
  LeaderboardEntry, 
  getWeeklyLeaderboard, 
  WeeklyLeaderboardData, 
  WeeklyLeaderboardEntry 
} from "./actions-leaderboard";
import { getLevelInfo, ALL_LEVELS } from "@/lib/constants/levels";
import AthleteAvatar from "@/components/Identity/AthleteAvatar";

// Helper para formatar a data no formato brasileiro (DD/MM/AAAA)
function formatDateBR(dateStr: string) {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

// Helper para formatar o nome exibido (Nome + Sobrenome final) mantendo o layout limpo no mobile
function formatDisplayName(name: string) {
  if (!name) return "";
  const parts = name.trim().split(/\s+/);
  if (parts.length <= 2) return name;
  const last = parts[parts.length - 1];
  const first = parts[0];
  const lowercaseLast = last.toLowerCase();
  if (["filho", "neto", "junior", "jr", "sobrinho"].includes(lowercaseLast) && parts.length > 2) {
    return `${first} ${parts[parts.length - 2]} ${last}`;
  }
  return `${first} ${last}`;
}

export default function DailyLeaderboard() {
  const [dailyData, setDailyData] = useState<DailyLeaderboardData | null>(null);
  const [weeklyData, setWeeklyData] = useState<WeeklyLeaderboardData | null>(null);
  const [viewMode, setViewMode] = useState<"diario" | "semanal">("diario");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>("geral");

  useEffect(() => {
    async function loadAll() {
      setLoading(true);
      const [resDaily, resWeekly] = await Promise.all([
        getDailyLeaderboard(),
        getWeeklyLeaderboard()
      ]);
      
      if (resDaily.success && resDaily.data) {
        setDailyData(resDaily.data);
      } else {
        setError(resDaily.error || "Erro ao carregar o Leaderboard Diário.");
      }
      
      if (resWeekly.success && resWeekly.data) {
        setWeeklyData(resWeekly.data);
      }
      
      setLoading(false);
    }
    loadAll();
  }, []);

  if (loading) {
    return (
      <div style={{ 
        background: "#FFF", 
        border: "3px solid #000", 
        boxShadow: "8px 8px 0px #000",
        padding: "24px 16px",
      }}>
        {/* Toggle skeleton */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
          <div style={{ flex: 1, height: "38px", background: "#E5E7EB", border: "2px solid #000" }} className="skeleton-pulse" />
          <div style={{ flex: 1, height: "38px", background: "#E5E7EB", border: "2px solid #000" }} className="skeleton-pulse" />
        </div>

        {/* Header Skeleton */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "24px", borderBottom: "2px dashed #E5E7EB", paddingBottom: "20px" }}>
          <div style={{ width: "120px", height: "20px", background: "#E5E7EB", border: "2px solid #000" }} className="skeleton-pulse" />
          <div style={{ width: "200px", height: "28px", background: "#E5E7EB", border: "2px solid #000", marginTop: "14px" }} className="skeleton-pulse" />
        </div>

        {/* Dropdown Skeleton */}
        <div style={{ width: "100%", height: "40px", background: "#E5E7EB", border: "2px solid #000", marginBottom: "20px" }} className="skeleton-pulse" />

        {/* Rows Skeleton */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {[1, 2, 3, 4].map((i) => (
            <div 
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "12px 14px",
                background: "#FFF",
                border: "2px solid #E5E7EB",
              }}
            >
              <div style={{ width: "44px", height: "44px", borderRadius: "50%", background: "#E5E7EB", border: "2px solid #E5E7EB", flexShrink: 0 }} className="skeleton-pulse" />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
                <div style={{ width: "60%", height: "14px", background: "#E5E7EB" }} className="skeleton-pulse" />
                <div style={{ width: "40%", height: "10px", background: "#E5E7EB" }} className="skeleton-pulse" />
              </div>
            </div>
          ))}
        </div>
        
        <style dangerouslySetInnerHTML={{ __html: `
          .skeleton-pulse {
            animation: pulse 1.5s ease-in-out infinite;
          }
          @keyframes pulse {
            0% { opacity: 0.6; }
            50% { opacity: 1; }
            100% { opacity: 0.6; }
          }
        `}} />
      </div>
    );
  }

  if (error || !dailyData) {
    return (
      <div style={{ padding: "40px 20px", textAlign: "center", background: "#FFF", border: "3px solid #000", boxShadow: "8px 8px 0px #000" }}>
        <div style={{ fontSize: "14px", fontWeight: 900, color: "var(--red)", textTransform: "uppercase" }}>
          {error}
        </div>
      </div>
    );
  }

  // Filtrar alunos pela categoria selecionada usando a função normalizadora SSoT
  const filteredDailyResults = activeFilter === "geral"
    ? dailyData.results
    : dailyData.results.filter((r) => getLevelInfo(r.performance_level).key === activeFilter);

  const filteredWeeklyResults = weeklyData
    ? (activeFilter === "geral"
      ? weeklyData.results
      : weeklyData.results.filter((r) => getLevelInfo(r.performance_level).key === activeFilter))
    : [];

  return (
    <div style={{ 
      background: "#FFF", 
      border: "3px solid #000", 
      boxShadow: "8px 8px 0px #000",
      padding: "24px 16px",
      animation: "entrancePop 0.4s cubic-bezier(0.16, 1, 0.3, 1)"
    }}>
      {/* ── SELETOR DE MODO (DIÁRIO / SEMANAL) ── */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
        <button
          onClick={() => setViewMode("diario")}
          style={{
            flex: 1,
            padding: "10px",
            fontSize: "11px",
            fontWeight: 900,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            background: viewMode === "diario" ? "#000" : "#FFF",
            color: viewMode === "diario" ? "#FFF" : "#000",
            border: "2px solid #000",
            boxShadow: viewMode === "diario" ? "2px 2px 0px #000" : "none",
            transform: viewMode === "diario" ? "translate(-1px, -1px)" : "none",
            cursor: "pointer",
            transition: "all 0.15s cubic-bezier(0.16, 1, 0.3, 1)"
          }}
        >
          Do Dia
        </button>
        <button
          onClick={() => setViewMode("semanal")}
          style={{
            flex: 1,
            padding: "10px",
            fontSize: "11px",
            fontWeight: 900,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            background: viewMode === "semanal" ? "#000" : "#FFF",
            color: viewMode === "semanal" ? "#FFF" : "#000",
            border: "2px solid #000",
            boxShadow: viewMode === "semanal" ? "2px 2px 0px #000" : "none",
            transform: viewMode === "semanal" ? "translate(-1px, -1px)" : "none",
            cursor: "pointer",
            transition: "all 0.15s cubic-bezier(0.16, 1, 0.3, 1)"
          }}
        >
          Da Semana
        </button>
      </div>

      {/* ── CABEÇALHO DO LEADERBOARD ── */}
      <div style={{ textAlign: "center", marginBottom: "24px", borderBottom: "2px dashed #000", paddingBottom: "20px" }}>
        <div style={{ 
          display: "inline-flex", 
          alignItems: "center", 
          gap: "6px", 
          background: "#000", 
          color: "#FFF", 
          padding: "6px 14px", 
          fontSize: "10px", 
          fontWeight: 900, 
          textTransform: "uppercase", 
          letterSpacing: "0.1em",
          whiteSpace: "nowrap",
          flexShrink: 0 
        }}>
          <Calendar size={12} style={{ flexShrink: 0 }} />
          <span style={{ flexShrink: 0, lineHeight: "1" }}>
            {viewMode === "diario" 
              ? formatDateBR(dailyData.date) 
              : weeklyData 
              ? `SEMANA: ${weeklyData.start_date} A ${weeklyData.end_date}` 
              : "SEMANA ATUAL"}
          </span>
        </div>
        <h2 style={{ 
          fontSize: "26px", 
          fontWeight: 950, 
          color: "#000", 
          marginTop: "14px", 
          lineHeight: 1.1, 
          textTransform: "uppercase", 
          letterSpacing: "-0.02em" 
        }}>
          {viewMode === "diario" ? dailyData.wod_title : "ACUMULADO SEMANAL"}
        </h2>
      </div>

      {/* ── SELETOR DE NÍVEL (DROP-DOWN NEO-BRUTALISTA) ── */}
      <div style={{ position: "relative", marginBottom: "24px" }}>
        <select
          value={activeFilter}
          onChange={(e) => setActiveFilter(e.target.value)}
          style={{
            width: "100%",
            padding: "12px 16px",
            fontSize: "11px",
            fontWeight: 900,
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            background: "#FFF",
            color: "#000",
            border: "2px solid #000",
            boxShadow: "3px 3px 0px #000",
            cursor: "pointer",
            outline: "none",
            borderRadius: "0px",
            appearance: "none",
            backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23000000' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
            backgroundRepeat: "no-repeat",
            backgroundPosition: "right 14px center",
            backgroundSize: "14px",
            paddingRight: "44px"
          }}
        >
          <option value="geral">GERAL (TODOS OS NÍVEIS)</option>
          {ALL_LEVELS.map((lvl) => (
            <option key={lvl.key} value={lvl.key}>
              {lvl.label.toUpperCase()}
            </option>
          ))}
        </select>
      </div>

      {/* ── CONTEÚDO LISTAGEM ── */}
      {viewMode === "diario" ? (
        /* ──── ABA DIÁRIA ──── */
        filteredDailyResults.length === 0 ? (
          <div style={{ 
            padding: "48px 24px", 
            textAlign: "center", 
            background: "#FFF", 
            border: "3px dashed #000",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "12px",
            animation: "entrancePop 0.3s ease"
          }}>
            <Medal size={36} color="#000" style={{ opacity: 0.2 }} />
            <div style={{ fontSize: "12px", fontWeight: 900, color: "#000", textTransform: "uppercase", letterSpacing: "0.1em", lineHeight: 1.4 }}>
              Nenhum resultado registrado<br />nesta categoria hoje.
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {filteredDailyResults.map((aluno, index) => {
              const isTop3 = index < 3;
              const rankColors = ["#FBBF24", "#9CA3AF", "#B45309"];
              const rankColor = index < 3 ? rankColors[index] : "#E5E7EB";
              const levelInfo = getLevelInfo(aluno.performance_level);

              const cardBg = index === 0 
                ? "linear-gradient(135deg, #FFFDF2 0%, #FFFBEA 100%)"
                : index === 1
                ? "linear-gradient(135deg, #FAFAFA 0%, #F4F4F5 100%)"
                : index === 2
                ? "linear-gradient(135deg, #FFFBF9 0%, #FFF7F2 100%)"
                : "#FFF";

              return (
                <div 
                  key={aluno.student_id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "12px 14px",
                    background: cardBg,
                    border: "2px solid #000",
                    boxShadow: isTop3 ? `4px 4px 0px ${rankColor}` : "3px 3px 0px #000",
                    position: "relative",
                    transition: "transform 0.15s ease, box-shadow 0.15s ease",
                    animation: "slideInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) both",
                    animationDelay: `${index * 0.05}s`
                  }}
                >
                  {index === 0 && (
                    <div style={{ position: "absolute", top: 0, left: 0, width: "4px", height: "100%", background: rankColor }} />
                  )}

                  {/* Avatar + Rank */}
                  <div style={{ position: "relative", width: "44px", height: "44px", flexShrink: 0 }}>
                    <AthleteAvatar
                      url={aluno.avatar_url}
                      name={aluno.student_name}
                      size={44}
                      borderWidth={2}
                      shadowSize={0}
                      rounded={true}
                    />
                    <div style={{
                      position: "absolute",
                      top: "-4px",
                      left: "-4px",
                      width: "18px",
                      height: "18px",
                      borderRadius: "50%",
                      border: "1.5px solid #000",
                      background: index < 3 ? rankColor : "#FFF",
                      color: index < 3 ? "#000" : "#666",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "9px",
                      fontWeight: 950,
                      boxShadow: "1px 1px 0px #000",
                      zIndex: 2
                    }}>
                      {index + 1}
                    </div>
                  </div>

                  {/* Nome & Badges */}
                  <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px", width: "100%" }}>
                      {isTop3 && (
                        <div style={{ flexShrink: 0, display: "flex", alignItems: "center" }}>
                          {index === 0 && <Trophy size={13} fill="#FBBF24" color="#000" />}
                          {index === 1 && <Trophy size={13} fill="#9CA3AF" color="#000" />}
                          {index === 2 && <Trophy size={13} fill="#B45309" color="#000" />}
                        </div>
                      )}
                      <span style={{ 
                        fontSize: "14px", 
                        fontWeight: 950, 
                        color: "#000", 
                        lineHeight: "1.1", 
                        textTransform: "uppercase",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        flex: 1,
                        minWidth: 0
                      }}>
                        {formatDisplayName(aluno.student_name)}
                      </span>
                    </div>
                    
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "6px", flexWrap: "wrap" }}>
                      <span style={{ 
                        fontSize: "8px", 
                        fontWeight: 900, 
                        background: levelInfo.color, 
                        color: levelInfo.textColor || "#FFF", 
                        padding: "2px 6px", 
                        border: "1px solid #000", 
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        display: "inline-flex",
                        alignItems: "center",
                        lineHeight: "1",
                        whiteSpace: "nowrap"
                      }}>
                        {levelInfo.label}
                      </span>

                      <span style={{
                        fontSize: "8px",
                        fontWeight: 900,
                        background: "#000",
                        color: "#FFF",
                        padding: "2px 6px",
                        border: "1px solid #000",
                        textTransform: "uppercase",
                        fontFamily: "var(--font-mono, monospace)",
                        letterSpacing: "0.02em",
                        display: "inline-flex",
                        alignItems: "center",
                        lineHeight: "1",
                        whiteSpace: "nowrap"
                      }}>
                        {aluno.result_display}
                      </span>

                      {aluno.is_cap && (
                        <span style={{ 
                          fontSize: "8px", 
                          fontWeight: 900, 
                          background: "#FEF2F2",
                          color: "#EF4444", 
                          padding: "2px 6px", 
                          border: "1px solid #EF4444", 
                          textTransform: "uppercase", 
                          display: "inline-flex", 
                          alignItems: "center", 
                          gap: "2px",
                          lineHeight: "1",
                          whiteSpace: "nowrap"
                        }}>
                          <Flame size={8} style={{ flexShrink: 0 }} />
                          <span>CAP</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* ──── ABA SEMANAL ──── */
        filteredWeeklyResults.length === 0 ? (
          <div style={{ 
            padding: "48px 24px", 
            textAlign: "center", 
            background: "#FFF", 
            border: "3px dashed #000",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "12px",
            animation: "entrancePop 0.3s ease"
          }}>
            <Medal size={36} color="#000" style={{ opacity: 0.2 }} />
            <div style={{ fontSize: "12px", fontWeight: 900, color: "#000", textTransform: "uppercase", letterSpacing: "0.1em", lineHeight: 1.4 }}>
              Nenhum resultado registrado<br />nesta categoria na semana.
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {filteredWeeklyResults.map((aluno, index) => {
              const isTop3 = index < 3;
              const rankColors = ["#FBBF24", "#9CA3AF", "#B45309"];
              const rankColor = index < 3 ? rankColors[index] : "#E5E7EB";
              const levelInfo = getLevelInfo(aluno.performance_level);

              const cardBg = index === 0 
                ? "linear-gradient(135deg, #FFFDF2 0%, #FFFBEA 100%)"
                : index === 1
                ? "linear-gradient(135deg, #FAFAFA 0%, #F4F4F5 100%)"
                : index === 2
                ? "linear-gradient(135deg, #FFFBF9 0%, #FFF7F2 100%)"
                : "#FFF";

              return (
                <div 
                  key={aluno.student_id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "12px 14px",
                    background: cardBg,
                    border: "2px solid #000",
                    boxShadow: isTop3 ? `4px 4px 0px ${rankColor}` : "3px 3px 0px #000",
                    position: "relative",
                    transition: "transform 0.15s ease, box-shadow 0.15s ease",
                    animation: "slideInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) both",
                    animationDelay: `${index * 0.05}s`
                  }}
                >
                  {index === 0 && (
                    <div style={{ position: "absolute", top: 0, left: 0, width: "4px", height: "100%", background: rankColor }} />
                  )}

                  {/* Avatar + Rank */}
                  <div style={{ position: "relative", width: "44px", height: "44px", flexShrink: 0 }}>
                    <AthleteAvatar
                      url={aluno.avatar_url}
                      name={aluno.student_name}
                      size={44}
                      borderWidth={2}
                      shadowSize={0}
                      rounded={true}
                    />
                    <div style={{
                      position: "absolute",
                      top: "-4px",
                      left: "-4px",
                      width: "18px",
                      height: "18px",
                      borderRadius: "50%",
                      border: "1.5px solid #000",
                      background: index < 3 ? rankColor : "#FFF",
                      color: index < 3 ? "#000" : "#666",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "9px",
                      fontWeight: 950,
                      boxShadow: "1px 1px 0px #000",
                      zIndex: 2
                    }}>
                      {index + 1}
                    </div>
                  </div>

                  {/* Nome & Badges */}
                  <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px", width: "100%" }}>
                      {isTop3 && (
                        <div style={{ flexShrink: 0, display: "flex", alignItems: "center" }}>
                          {index === 0 && <Trophy size={13} fill="#FBBF24" color="#000" />}
                          {index === 1 && <Trophy size={13} fill="#9CA3AF" color="#000" />}
                          {index === 2 && <Trophy size={13} fill="#B45309" color="#000" />}
                        </div>
                      )}
                      <span style={{ 
                        fontSize: "14px", 
                        fontWeight: 950, 
                        color: "#000", 
                        lineHeight: "1.1", 
                        textTransform: "uppercase",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        flex: 1,
                        minWidth: 0
                      }}>
                        {formatDisplayName(aluno.student_name)}
                      </span>
                    </div>
                    
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "6px", flexWrap: "wrap" }}>
                      {/* Categoria */}
                      <span style={{ 
                        fontSize: "8px", 
                        fontWeight: 900, 
                        background: levelInfo.color, 
                        color: levelInfo.textColor || "#FFF", 
                        padding: "2px 6px", 
                        border: "1px solid #000", 
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        display: "inline-flex",
                        alignItems: "center",
                        lineHeight: "1",
                        whiteSpace: "nowrap"
                      }}>
                        {levelInfo.label}
                      </span>

                      {/* Frequência (WODs Concluídos) */}
                      <span style={{ 
                        fontSize: "8px", 
                        fontWeight: 900, 
                        background: "#F3F4F6", 
                        color: "#000", 
                        padding: "2px 6px", 
                        border: "1px solid #000", 
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        display: "inline-flex",
                        alignItems: "center",
                        lineHeight: "1",
                        whiteSpace: "nowrap"
                      }}>
                        {aluno.wods_completed} WODS
                      </span>

                      {/* Pontos Acumulados */}
                      <span style={{
                        fontSize: "8px",
                        fontWeight: 900,
                        background: "#000",
                        color: "#FFF",
                        padding: "2px 6px",
                        border: "1px solid #000",
                        textTransform: "uppercase",
                        fontFamily: "var(--font-mono, monospace)",
                        letterSpacing: "0.02em",
                        display: "inline-flex",
                        alignItems: "center",
                        lineHeight: "1",
                        whiteSpace: "nowrap"
                      }}>
                        {aluno.total_points} PTS
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes entrancePop {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes slideInUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}} />
    </div>
  );
}

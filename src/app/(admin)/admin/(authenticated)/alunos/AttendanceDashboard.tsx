"use client";

/**
 * 📊 AttendanceDashboard Component (Iron Monolith CRM Module)
 * 
 * Painel consolidado para auditoria e controle de presenças, faltas (no-shows) e inatividade de alunos.
 * 
 * @architecture
 * - Implementado como um Client Component isolado para gerenciar interações ricas da UI (filtros, paginação local, ações).
 * - Centraliza a visualização operacional através de 3 painéis de atenção (No-Shows, Faltantes, Fechamentos Pendentes) e uma tabela de histórico.
 * 
 * @security
 * - Role Check: Apenas administradores ou recepção conseguem buscar dados válidos.
 * - Validação de Sessão: As chamadas de Server Actions validam a role do usuário conectado no lado do servidor.
 * 
 * @utc_dates
 * - Alinhado com o Timezone SSoT (UTC-3 Anchor).
 * - Datas no formato YYYY-MM-DD são passadas diretamente e renderizadas localmente com `toLocaleDateString("pt-BR", { timeZone: "UTC" })`
 *   para anular distorções causadas pelo fuso horário do browser do usuário.
 * 
 * @ui_polish
 * - Skeleton screens integrados com shimmer animado no primeiro carregamento (`loading && !stats`).
 * - Barra de progresso horizontal Neo-Brutalista (`bar-loader`) embutida no cabeçalho durante consultas em background.
 * - Ícones estabilizados com flex-shrink e textos encapsulados em tags <span>.
 * 
 * @param {AttendanceDashboardProps} props - Propriedades passadas pelo componente pai.
 * @returns {JSX.Element} Painel administrativo Neo-Brutalista.
 */
import React, { useState, useEffect, useMemo } from "react";
import { 
  CheckCircle, UserX, Users, AlertTriangle, 
  Activity, TrendingUp, Phone, Loader2, RotateCcw, 
  Trash2, Search, ChevronDown 
} from "lucide-react";
import { LevelInfo } from "@/lib/constants/levels";
import AthleteIdentity from "@/components/Identity/AthleteIdentity";
import { getAttendanceDashboardStats } from "../../../actions";
import { markAsAbsentAction, unmarkAsAbsentAction, deleteCheckinAction } from "../turmas/actions";

interface AttendanceDashboardProps {
  dynamicLevels?: Record<string, LevelInfo>;
}

export default function AttendanceDashboard({ dynamicLevels }: AttendanceDashboardProps) {
  const getTodayStr = () => new Date().toISOString().split("T")[0];
  const getPastDateStr = (daysAgo: number) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().split("T")[0];
  };
  const getFirstDayOfMonthStr = () => `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-01`;

  const todayStr = getTodayStr();
  const sevenDaysAgoStr = getPastDateStr(6);
  const firstDayStr = getFirstDayOfMonthStr();

  const [activePreset, setActivePreset] = useState<"hoje" | "7dias" | "mes" | "custom">("7dias");
  const [dateFrom, setDateFrom] = useState(sevenDaysAgoStr);
  const [dateTo, setDateTo] = useState(todayStr);
  const [searchQuery, setSearchQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState("Todos");

  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const [noShowsPage, setNoShowsPage] = useState(1);
  const noShowsPageSize = 12;
  const noShowsTotalPages = Math.ceil((stats?.topNoShows?.length || 0) / noShowsPageSize) || 1;
  const paginatedNoShows = useMemo(() => {
    if (!stats?.topNoShows) return [];
    return stats.topNoShows.slice((noShowsPage - 1) * noShowsPageSize, noShowsPage * noShowsPageSize);
  }, [stats?.topNoShows, noShowsPage]);

  const [missingPage, setMissingPage] = useState(1);
  const missingPageSize = 12;
  const missingTotalPages = Math.ceil((stats?.missingStudents?.length || 0) / missingPageSize) || 1;
  const paginatedMissing = useMemo(() => {
    if (!stats?.missingStudents) return [];
    return stats.missingStudents.slice((missingPage - 1) * missingPageSize, missingPage * missingPageSize);
  }, [stats?.missingStudents, missingPage]);

  const [pendingClassesPage, setPendingClassesPage] = useState(1);
  const pendingClassesPageSize = 10;
  const pendingClassesTotalPages = Math.ceil((stats?.pendingClasses?.length || 0) / pendingClassesPageSize) || 1;
  const paginatedPendingClasses = useMemo(() => {
    if (!stats?.pendingClasses) return [];
    return stats.pendingClasses.slice((pendingClassesPage - 1) * pendingClassesPageSize, pendingClassesPage * pendingClassesPageSize);
  }, [stats?.pendingClasses, pendingClassesPage]);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAttendanceDashboardStats(dateFrom, dateTo);
      if (res.error) setError(res.error);
      else setStats(res.stats);
    } catch (err) {
      console.error(err);
      setError("Erro de rede ao buscar dados.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    setCurrentPage(1);
    setNoShowsPage(1);
    setMissingPage(1);
    setPendingClassesPage(1);
  }, [dateFrom, dateTo]);

  const handlePresetChange = (preset: "hoje" | "7dias" | "mes" | "custom") => {
    setActivePreset(preset);
    if (preset === "hoje") {
      setDateFrom(todayStr);
      setDateTo(todayStr);
    } else if (preset === "7dias") {
      setDateFrom(sevenDaysAgoStr);
      setDateTo(todayStr);
    } else if (preset === "mes") {
      setDateFrom(firstDayStr);
      setDateTo(todayStr);
    }
  };

  const handleAction = async (checkinId: string, confirmMsg: string, actionFn: (id: string) => Promise<{ error?: string }>) => {
    if (!window.confirm(confirmMsg)) return;
    setActionLoadingId(checkinId);
    try {
      const res = await actionFn(checkinId);
      if (res.error) alert("Erro: " + res.error);
      else await fetchStats();
    } catch (err) {
      console.error(err);
      alert("Erro ao realizar a ação.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredCheckins = useMemo(() => {
    if (!stats?.checkinsList) return [];
    return stats.checkinsList.filter((c: any) => {
      const nameMatch = searchQuery
        ? c.student?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.student?.display_name?.toLowerCase().includes(searchQuery.toLowerCase())
        : true;
      const levelMatch = levelFilter !== "Todos" ? c.student?.level === levelFilter : true;
      return nameMatch && levelMatch;
    });
  }, [stats?.checkinsList, searchQuery, levelFilter]);

  const paginatedCheckins = useMemo(() => {
    const fromIndex = (currentPage - 1) * pageSize;
    return filteredCheckins.slice(fromIndex, fromIndex + pageSize);
  }, [filteredCheckins, currentPage]);

  const totalPages = Math.ceil(filteredCheckins.length / pageSize) || 1;

  if (loading && !stats) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "24px", animation: "fadeIn 0.2s ease-out" }}>
        {/* ── FILTER HEADER SKELETON ── */}
        <div style={{ height: "86px", background: "#FFF", border: "3px solid #000", padding: "16px", boxShadow: "4px 4px 0px #000", display: "flex", alignItems: "center" }}>
          <div className="skeleton" style={{ width: "240px", height: "36px", background: "#EEE" }} />
        </div>

        {/* ── KPI SKELETONS ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "16px" }}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="admin-card" style={{ height: "102px", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "20px" }}>
              <div className="skeleton" style={{ width: "80px", height: "12px", background: "#EEE" }} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <div className="skeleton" style={{ width: "40px", height: "32px", background: "#EEE" }} />
                <div className="skeleton" style={{ width: "20px", height: "20px", borderRadius: "50%", background: "#EEE" }} />
              </div>
            </div>
          ))}
        </div>

        {/* ── PANELS SKELETON ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))", gap: "24px" }}>
          {[1, 2, 3].map((panelIdx) => (
            <div key={panelIdx} className="admin-card" style={{ padding: 0, height: "480px", overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", borderBottom: "2px solid #000", background: "#FAFAFA", height: "50px", display: "flex", alignItems: "center" }}>
                <div className="skeleton" style={{ width: "120px", height: "20px", background: "#EEE" }} />
              </div>
              <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: "20px" }}>
                {[1, 2, 3, 4, 5].map((itemIdx) => (
                  <div key={itemIdx} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div className="skeleton" style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#EEE" }} />
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
                      <div className="skeleton" style={{ width: "60%", height: "14px", background: "#EEE" }} />
                      <div className="skeleton" style={{ width: "40%", height: "10px", background: "#F5F5F5" }} />
                    </div>
                    <div className="skeleton" style={{ width: "28px", height: "28px", background: "#EEE" }} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <style>{`
          @keyframes shimmer {
            0% { opacity: 0.5; }
            50% { opacity: 1; }
            100% { opacity: 0.5; }
          }
          .skeleton {
            animation: shimmer 1.5s infinite ease-in-out;
          }
        `}</style>
      </div>
    );
  }

  const levelsList = dynamicLevels ? Object.values(dynamicLevels).sort((a, b) => (a.order || 0) - (b.order || 0)) : [];

  return (
    <div style={{ animation: "fadeIn 0.25s ease-out" }}>
      {/* ── FILTER HEADER ── */}
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "16px", marginBottom: "28px", background: "#FFF", border: "3px solid #000", padding: "16px", boxShadow: "4px 4px 0px #000", position: "relative", overflow: "hidden" }}>
        {loading && (
          <div style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            width: "100%",
            height: "4px",
            background: "#FFF",
            borderTop: "1px solid #000"
          }}>
            <div className="bar-loader" />
          </div>
        )}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {(["hoje", "7dias", "mes", "custom"] as const).map((preset) => (
            <button
              key={preset}
              onClick={() => handlePresetChange(preset)}
              style={{
                padding: "8px 16px", border: "2px solid #000",
                background: activePreset === preset ? "#000" : "#FFF",
                color: activePreset === preset ? "#FFF" : "#000",
                fontSize: "12px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.05em", cursor: "pointer",
                boxShadow: activePreset === preset ? "none" : "2px 2px 0px #000",
                transform: activePreset === preset ? "translate(2px, 2px)" : "none", transition: "all 0.1s ease"
              }}
            >
              {preset === "hoje" ? "Hoje" : preset === "7dias" ? "7 Dias" : preset === "mes" ? "Este Mês" : "Personalizado"}
            </button>
          ))}
        </div>

        {activePreset === "custom" && (
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={{ padding: "8px 12px", border: "2px solid #000", fontSize: "13px", fontWeight: 700 }} />
            <span style={{ fontWeight: 800, fontSize: "12px" }}>ATÉ</span>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={{ padding: "8px 12px", border: "2px solid #000", fontSize: "13px", fontWeight: 700 }} />
          </div>
        )}
      </div>

      {error && <div style={{ background: "#FEF2F2", border: "2px solid #DC2626", color: "#DC2626", padding: "16px", marginBottom: "24px", fontWeight: 700 }}>{error}</div>}

      {stats && (
        <>
          {/* ── KPI CARDS GRID ── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "16px", marginBottom: "32px" }}>
            <div className="admin-card" style={{ display: "flex", flexDirection: "column", gap: "8px", borderLeft: "6px solid #16A34A" }}>
              <span style={{ fontSize: "10px", fontWeight: 800, color: "#666", textTransform: "uppercase" }}>Presenças (Treinos)</span>
              <div style={{ display: "flex", alignItems: "baseline", gap: "8px", justifyContent: "space-between" }}>
                <span style={{ fontSize: "32px", fontWeight: 900, color: "#000" }}>{stats.totalAttendances}</span>
                <CheckCircle size={20} color="#16A34A" />
              </div>
            </div>

            <div className="admin-card" style={{ display: "flex", flexDirection: "column", gap: "8px", borderLeft: "6px solid #DC2626" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <span style={{ fontSize: "10px", fontWeight: 800, color: "#666", textTransform: "uppercase" }}>Alunos No-Show</span>
                <span style={{ fontSize: "9px", color: "#666", opacity: 0.7 }}>Reservou vaga e não compareceu</span>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "8px", justifyContent: "space-between" }}>
                <span style={{ fontSize: "32px", fontWeight: 900, color: "#000" }}>{stats.totalNoShows}</span>
                <UserX size={20} color="#DC2626" />
              </div>
            </div>

            <div className="admin-card" style={{ display: "flex", flexDirection: "column", gap: "8px", borderLeft: "6px solid #2563EB" }}>
              <span style={{ fontSize: "10px", fontWeight: 800, color: "#666", textTransform: "uppercase" }}>Alunos Frequentes</span>
              <div style={{ display: "flex", alignItems: "baseline", gap: "8px", justifyContent: "space-between" }}>
                <span style={{ fontSize: "32px", fontWeight: 900, color: "#000" }}>{stats.uniqueActiveCount}</span>
                <Users size={20} color="#2563EB" />
              </div>
            </div>

            <div className="admin-card" style={{ display: "flex", flexDirection: "column", gap: "8px", borderLeft: "6px solid #F59E0B" }}>
              <span style={{ fontSize: "10px", fontWeight: 800, color: "#666", textTransform: "uppercase" }}>Ocupação Média</span>
              <div style={{ display: "flex", alignItems: "baseline", gap: "8px", justifyContent: "space-between" }}>
                <span style={{ fontSize: "32px", fontWeight: 900, color: "#000" }}>{stats.avgOccupancyPercent}%</span>
                <TrendingUp size={20} color="#F59E0B" />
              </div>
            </div>

            <div className="admin-card" style={{ display: "flex", flexDirection: "column", gap: "8px", borderLeft: "6px solid #7C3AED" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <span style={{ fontSize: "10px", fontWeight: 800, color: "#666", textTransform: "uppercase" }}>Aulas Fechadas</span>
                {stats.totalPendingClasses > 0 ? (
                  <span style={{ fontSize: "9px", color: "#DC2626", fontWeight: 700 }}>{stats.totalPendingClasses} pendentes de fechamento</span>
                ) : (
                  <span style={{ fontSize: "9px", color: "#16A34A", fontWeight: 700 }}>Todas as aulas fechadas</span>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "8px", justifyContent: "space-between" }}>
                <span style={{ fontSize: "32px", fontWeight: 900, color: "#000" }}>{stats.totalCompletedClasses}</span>
                <Activity size={20} color="#7C3AED" />
              </div>
            </div>

            <div className="admin-card" style={{ display: "flex", flexDirection: "column", gap: "8px", borderLeft: "6px solid #6B7280" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <span style={{ fontSize: "10px", fontWeight: 800, color: "#666", textTransform: "uppercase" }}>Alunos Faltantes</span>
                <span style={{ fontSize: "9px", color: "#666", opacity: 0.7 }}>Não marcam presença nem treinam</span>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "8px", justifyContent: "space-between" }}>
                <span style={{ fontSize: "32px", fontWeight: 900, color: "#000" }}>{stats.inactiveCount}</span>
                <AlertTriangle size={20} color="#6B7280" />
              </div>
            </div>
          </div>

          {/* ── ATTENTION PANELS ── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))", gap: "24px", marginBottom: "36px" }}>
            {/* Top No-Shows */}
            <div className="admin-card" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", borderBottom: "2px solid #000", background: "#FAFAFA", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <UserX size={16} />
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <h3 style={{ fontSize: "12px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>Alunos No-Show</h3>
                    <span style={{ fontSize: "9px", color: "#666", opacity: 0.7, marginTop: "2px" }}>Reservaram vaga e não compareceram</span>
                  </div>
                </div>
                {noShowsTotalPages > 1 && (
                  <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                    <button onClick={() => setNoShowsPage(p => Math.max(p - 1, 1))} disabled={noShowsPage === 1} className="admin-btn" style={{ padding: "2px 8px", fontSize: "10px", height: "24px", fontWeight: 900 }}>&larr;</button>
                    <span style={{ fontSize: "10px", fontWeight: 900 }}>{noShowsPage}/{noShowsTotalPages}</span>
                    <button onClick={() => setNoShowsPage(p => Math.min(p + 1, noShowsTotalPages))} disabled={noShowsPage === noShowsTotalPages} className="admin-btn" style={{ padding: "2px 8px", fontSize: "10px", height: "24px", fontWeight: 900 }}>&rarr;</button>
                  </div>
                )}
              </div>
              <div style={{ padding: "8px 0" }}>
                {stats.topNoShows.length === 0 ? (
                  <p style={{ padding: "24px", textAlign: "center", color: "#666", fontSize: "12px", margin: 0 }}>Nenhum no-show registrado no período.</p>
                ) : (
                  paginatedNoShows.map(({ student, count }: any) => (
                    <div key={student.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", borderBottom: "1px solid #F3F4F6" }}>
                      <AthleteIdentity profile={student} avatarSize={36} />
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <span style={{ background: "#FEE2E2", color: "#DC2626", padding: "3px 8px", fontSize: "11px", fontWeight: 800, border: "1px solid #DC2626" }}>
                          {count} NO-SHOW{count > 1 ? "S" : ""}
                        </span>
                        {student.phone && (
                          <a
                            href={`https://wa.me/55${student.phone.replace(/\D/g, "")}?text=Olá ${student.display_name || student.full_name?.split(" ")[0]}, sentimos sua falta nos treinos do Coliseu! Está tudo bem?`}
                            target="_blank" rel="noopener noreferrer" className="admin-btn admin-btn-ghost"
                            style={{ height: "30px", width: "30px", padding: 0 }} title="Cobrar pelo WhatsApp"
                          >
                            <Phone size={14} />
                          </a>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Alunos Sumidos */}
            <div className="admin-card" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", borderBottom: "2px solid #000", background: "#FAFAFA", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <AlertTriangle size={16} />
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <h3 style={{ fontSize: "12px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>Alunos Faltantes</h3>
                    <span style={{ fontSize: "9px", color: "#666", opacity: 0.7, marginTop: "2px" }}>Ausentes há mais de 10 dias</span>
                  </div>
                </div>
                {missingTotalPages > 1 && (
                  <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                    <button onClick={() => setMissingPage(p => Math.max(p - 1, 1))} disabled={missingPage === 1} className="admin-btn" style={{ padding: "2px 8px", fontSize: "10px", height: "24px", fontWeight: 900 }}>&larr;</button>
                    <span style={{ fontSize: "10px", fontWeight: 900 }}>{missingPage}/{missingTotalPages}</span>
                    <button onClick={() => setMissingPage(p => Math.min(p + 1, missingTotalPages))} disabled={missingPage === missingTotalPages} className="admin-btn" style={{ padding: "2px 8px", fontSize: "10px", height: "24px", fontWeight: 900 }}>&rarr;</button>
                  </div>
                )}
              </div>
              <div style={{ padding: "8px 0" }}>
                {stats.missingStudents.length === 0 ? (
                  <p style={{ padding: "24px", textAlign: "center", color: "#666", fontSize: "12px", margin: 0 }}>Todos os alunos treinaram recentemente. Excelente!</p>
                ) : (
                  paginatedMissing.map((student: any) => (
                    <div key={student.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", borderBottom: "1px solid #F3F4F6" }}>
                      <AthleteIdentity profile={student} avatarSize={36} subtitle={`Último treino: ${student.last_presence}`} />
                      <div>
                        {student.phone && (
                          <a
                            href={`https://wa.me/55${student.phone.replace(/\D/g, "")}?text=Olá ${student.display_name || student.full_name?.split(" ")[0]}, tudo bem? Sentimos sua falta aqui no Coliseu! Bora voltar aos treinos?`}
                            target="_blank" rel="noopener noreferrer" className="admin-btn admin-btn-ghost"
                            style={{ height: "30px", width: "30px", padding: 0 }} title="Chamar no WhatsApp"
                          >
                            <Phone size={14} />
                          </a>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Fechamentos Pendentes */}
            <div className="admin-card" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", borderBottom: "2px solid #000", background: "#FAFAFA", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Activity size={16} />
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <h3 style={{ fontSize: "12px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>Fechamentos Pendentes</h3>
                    <span style={{ fontSize: "9px", color: "#666", opacity: 0.7, marginTop: "2px" }}>Turmas que ainda não foram encerradas</span>
                  </div>
                </div>
                {pendingClassesTotalPages > 1 && (
                  <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                    <button onClick={() => setPendingClassesPage(p => Math.max(p - 1, 1))} disabled={pendingClassesPage === 1} className="admin-btn" style={{ padding: "2px 8px", fontSize: "10px", height: "24px", fontWeight: 900 }}>&larr;</button>
                    <span style={{ fontSize: "10px", fontWeight: 900 }}>{pendingClassesPage}/{pendingClassesTotalPages}</span>
                    <button onClick={() => setPendingClassesPage(p => Math.min(p + 1, pendingClassesTotalPages))} disabled={pendingClassesPage === pendingClassesTotalPages} className="admin-btn" style={{ padding: "2px 8px", fontSize: "10px", height: "24px", fontWeight: 900 }}>&rarr;</button>
                  </div>
                )}
              </div>
              <div style={{ padding: "8px 0" }}>
                {stats.pendingClasses.length === 0 ? (
                  <p style={{ padding: "24px", textAlign: "center", color: "#666", fontSize: "12px", margin: 0 }}>Todas as turmas foram fechadas corretamente!</p>
                ) : (
                  paginatedPendingClasses.map((item: any, idx: number) => {
                    const formattedDate = new Date(item.date + "T12:00:00Z").toLocaleDateString("pt-BR", { timeZone: "UTC" });
                    return (
                      <div key={`${item.class_slot_id}-${item.date}-${idx}`} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", borderBottom: "1px solid #F3F4F6" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                          <span style={{ fontSize: "12px", fontWeight: 800, textTransform: "uppercase" }}>{item.name}</span>
                          <span style={{ fontSize: "10px", color: "#666", fontWeight: 600 }}>{formattedDate} &bull; {item.time_start || "—"}</span>
                        </div>
                        <a
                          href="/admin/turmas"
                          className="admin-btn"
                          style={{ padding: "6px 12px", fontSize: "11px", textDecoration: "none", display: "inline-flex", alignItems: "center" }}
                        >
                          Ir Fechar
                        </a>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* ── AUDIT TABLE SECTION ── */}
          <div style={{ marginBottom: "16px" }}>
            <h2 className="font-display" style={{ fontSize: "18px", fontWeight: 900, marginBottom: "16px" }}>Histórico e Auditoria de Presenças</h2>
            
            <div style={{ display: "flex", gap: "16px", marginBottom: "16px", alignItems: "center" }}>
              <div style={{ flex: 1, position: "relative" }}>
                <Search size={18} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "#666" }} />
                <input
                  type="text" placeholder="Filtrar ocorrências por nome de aluno..." value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  style={{ paddingLeft: "44px", border: "2px solid #000", fontWeight: 500 }}
                />
              </div>
              <div style={{ position: "relative", minWidth: "180px" }}>
                <select
                  value={levelFilter} onChange={(e) => { setLevelFilter(e.target.value); setCurrentPage(1); }}
                  style={{ appearance: "none", paddingRight: "40px", border: "2px solid #000", fontWeight: 700, textTransform: "uppercase", fontSize: "11px" }}
                >
                  <option value="Todos">Todos os Níveis</option>
                  {levelsList.map(l => <option key={l.key} value={l.key}>{l.label}</option>)}
                </select>
                <ChevronDown size={16} style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
              </div>
            </div>

            <div className="admin-card" style={{ padding: 0, overflow: "hidden" }}>
              {filteredCheckins.length === 0 ? (
                <p style={{ padding: "40px", textAlign: "center", color: "#666", fontSize: "13px", margin: 0 }}>Nenhuma presença ou no-show correspondente aos filtros.</p>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th style={{ paddingLeft: "24px" }}>Aluno</th>
                        <th style={{ width: "110px" }}>Data</th>
                        <th style={{ width: "80px" }}>Horário</th>
                        <th style={{ width: "140px" }}>Turma</th>
                        <th style={{ width: "165px" }}>Status</th>
                        <th style={{ width: "210px", textAlign: "center", paddingRight: "24px" }}>Ações Rápidas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedCheckins.map((c: any) => {
                        const isMissed = c.status === "missed";
                        const isConfirmed = c.status === "confirmed";
                        return (
                          <tr key={c.id} style={{ opacity: actionLoadingId === c.id ? 0.5 : 1 }}>
                            <td style={{ paddingLeft: "24px" }}><AthleteIdentity profile={c.student} avatarSize={36} /></td>
                            <td style={{ fontSize: "12px", fontWeight: 700 }}>
                              {new Date(c.wod_date + "T12:00:00Z").toLocaleDateString("pt-BR", { timeZone: "UTC" })}
                            </td>
                            <td style={{ fontSize: "12px", fontWeight: 600 }}>{c.time_slot || "—"}</td>
                            <td style={{ fontSize: "12px", fontWeight: 800, textTransform: "uppercase" }}>{c.class_name}</td>
                            <td>
                              {isConfirmed && <span style={{ display: "inline-block", whiteSpace: "nowrap", background: "#F0FDF4", color: "#16A34A", border: "1px solid #16A34A", padding: "4px 8px", fontSize: "10px", fontWeight: 900 }}>CONFIRMADO</span>}
                              {isMissed && <span style={{ display: "inline-block", whiteSpace: "nowrap", background: "#FEF2F2", color: "#DC2626", border: "1px solid #DC2626", padding: "4px 8px", fontSize: "10px", fontWeight: 900 }}>NO-SHOW (FALTA)</span>}
                              {!isConfirmed && !isMissed && <span style={{ display: "inline-block", whiteSpace: "nowrap", background: "#F3F4F6", color: "#666", border: "1px solid #666", padding: "4px 8px", fontSize: "10px", fontWeight: 900 }}>PENDENTE</span>}
                            </td>
                            <td style={{ paddingRight: "24px" }}>
                              <div style={{ display: "flex", gap: "8px", justifyContent: "center", alignItems: "center" }}>
                                {isMissed ? (
                                  <button
                                    onClick={() => handleAction(c.id, "Deseja reverter a falta deste aluno para 'Pendente'?", unmarkAsAbsentAction)}
                                    disabled={!!actionLoadingId} className="admin-btn"
                                    style={{ padding: "6px 12px", fontSize: "11px", display: "flex", alignItems: "center", gap: "4px", whiteSpace: "nowrap", flexShrink: 0 }} title="Reverter falta"
                                  >
                                    <RotateCcw size={12} style={{ flexShrink: 0 }} /> <span style={{ flexShrink: 0 }}>Reverter</span>
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleAction(c.id, "Deseja marcar falta (No-Show) para este aluno?", markAsAbsentAction)}
                                    disabled={!!actionLoadingId || isMissed} className="admin-btn"
                                    style={{ padding: "6px 12px", fontSize: "11px", display: "flex", alignItems: "center", gap: "4px", whiteSpace: "nowrap", flexShrink: 0 }} title="Marcar falta"
                                  >
                                    <UserX size={12} style={{ flexShrink: 0 }} /> <span style={{ flexShrink: 0 }}>Falta</span>
                                  </button>
                                )}
                                <button
                                  onClick={() => handleAction(c.id, "Tem certeza que deseja excluir permanentemente o check-in?", deleteCheckinAction)}
                                  disabled={!!actionLoadingId} className="admin-btn admin-btn-ghost"
                                  style={{ height: "30px", width: "30px", padding: 0, color: "#DC2626", flexShrink: 0 }} title="Excluir Check-in"
                                >
                                  <Trash2 size={13} style={{ flexShrink: 0 }} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {totalPages > 1 && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "16px" }}>
                <span style={{ fontSize: "12px", fontWeight: 700 }}>
                  Mostrando {filteredCheckins.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, filteredCheckins.length)} de {filteredCheckins.length} registros
                </span>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1} className="admin-btn" style={{ padding: "6px 12px", fontSize: "11px" }}>Anterior</button>
                  <span style={{ fontSize: "12px", fontWeight: 800 }}>Pág {currentPage} de {totalPages}</span>
                  <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages} className="admin-btn" style={{ padding: "6px 12px", fontSize: "11px" }}>Próxima</button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
      <style>{`
        @keyframes shimmer {
          0% { opacity: 0.5; }
          50% { opacity: 1; }
          100% { opacity: 0.5; }
        }
        @keyframes barLoading {
          0% { left: -30%; width: 30%; }
          50% { left: 40%; width: 50%; }
          100% { left: 100%; width: 30%; }
        }
        .skeleton {
          animation: shimmer 1.5s infinite ease-in-out;
        }
        .bar-loader {
          position: absolute;
          height: 100%;
          background: #000;
          animation: barLoading 1.2s infinite linear;
        }
      `}</style>
    </div>
  );
}

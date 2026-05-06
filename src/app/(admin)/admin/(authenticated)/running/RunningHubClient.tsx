"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, Zap, Footprints, Clock, ArrowRight, User, AlertCircle, TrendingUp, X, Timer, LayoutTemplate } from "lucide-react";
import AthleteIdentity from "@/components/Identity/AthleteIdentity";
import { RUNNING_LEVELS, RUNNING_STATUSES, RunningLevelKey, RunningStatusKey } from "@/lib/constants/running";
import RunningCoachManager from "../alunos/RunningCoachManager";
import RunningIdentityEditor from "../alunos/RunningIdentityEditor";
import { updateStudent } from "../../../actions";

interface RunningHubClientProps {
  runners: any[];
}

export default function RunningHubClient({ runners }: RunningHubClientProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | RunningStatusKey>("all");
  const [selectedRunner, setSelectedRunner] = useState<any | null>(null);

  const filteredRunners = runners.filter(r => {
    const matchSearch = r.profiles?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
                        r.profiles?.display_name?.toLowerCase().includes(search.toLowerCase());
    const runnerStatus = r.profiles?.running_status || "active";
    const matchStatus = statusFilter === "all" || runnerStatus === statusFilter;
    return matchSearch && matchStatus;
  });

  const css = `
    .admin-table th {
      text-transform: uppercase;
      font-size: 11px;
      font-weight: 900;
      color: #666;
      background: #F8F8F8;
      border-bottom: 2px solid #000;
      letter-spacing: 0.1em;
    }
    .admin-table tr {
      transition: all 0.2s ease;
    }
    .admin-table tr:hover {
      background: #FAFAFA;
      transform: scale(1.002);
    }
    .nb-input {
      border: 3px solid #000;
      border-radius: 0;
      font-weight: 700;
      outline: none;
      transition: all 0.2s;
    }
    .nb-input:focus {
      box-shadow: 4px 4px 0px var(--nb-red);
      transform: translate(-2px, -2px);
    }
    .stats-card {
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      cursor: default;
    }
    .stats-card:hover {
      transform: translate(-4px, -4px);
      box-shadow: 8px 8px 0px #000;
    }
    .runner-modal-content::-webkit-scrollbar {
      width: 10px;
    }
    .runner-modal-content::-webkit-scrollbar-track {
      background: #F8F8F8;
    }
    .runner-modal-content::-webkit-scrollbar-thumb {
      background: #000;
      border: 2px solid #F8F8F8;
    }
    @keyframes slideInRight {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `;

  // Estatísticas Rápidas
  const totalRunners = runners.length;
  const recentLogs = runners.filter(r => {
    if (!r.stats.latest_log) return false;
    return r.stats.last_log_days <= 7;
  }).length;
  const missingPrescription = runners.filter(r => {
    const noPlan = !r.stats.has_active_plan;
    const planFinished = r.stats.has_active_plan && r.stats.total_prescribed > 0 && r.stats.total_prescribed === r.stats.total_logged;
    const abandoned = r.stats.last_log_days > 14 && r.stats.last_log_days < 999;
    return noPlan || planFinished || abandoned;
  }).length;

  return (
    <div className="admin-page-content" style={{ animation: "fadeIn 0.4s ease", position: "relative" }}>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      
      {/* ── HEADER ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "40px", flexWrap: "wrap", gap: "20px" }}>
        <div>
          <h1 className="font-display" style={{ fontSize: "32px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "-0.02em", margin: 0 }}>
            Running <span style={{ color: "var(--nb-red)" }}>Hub</span>
          </h1>
          <p style={{ color: "#666", fontWeight: 600, fontSize: "14px", marginTop: "4px" }}>
            Visão estratégica e gestão de atletas do programa de corrida.
          </p>
        </div>
        
        <Link 
          href="/admin/running/templates" 
          style={{ 
            display: "flex", 
            alignItems: "center", 
            gap: "8px", 
            background: "#FFF", 
            color: "#000", 
            padding: "12px 24px",
            border: "3px solid #000",
            boxShadow: "4px 4px 0px #000",
            fontWeight: 900,
            textTransform: "uppercase",
            fontSize: "12px",
            letterSpacing: "0.05em",
            textDecoration: "none",
            transition: "transform 0.1s, box-shadow 0.1s"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translate(-2px, -2px)";
            e.currentTarget.style.boxShadow = "6px 6px 0px var(--nb-red)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translate(0px, 0px)";
            e.currentTarget.style.boxShadow = "4px 4px 0px #000";
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = "translate(2px, 2px)";
            e.currentTarget.style.boxShadow = "2px 2px 0px #000";
          }}
        >
          <LayoutTemplate size={18} />
          PLANILHAS PADRÃO
        </Link>
      </div>

      {/* ── STATS CARDS ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "24px", marginBottom: "40px" }}>
        <div className="stats-card" style={{ padding: "24px", background: "#000", color: "#FFF", border: "3px solid #000", boxShadow: "4px 4px 0px #000" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
            <Zap size={24} style={{ color: "var(--nb-blue)" }} />
            <span style={{ fontSize: "11px", fontWeight: 900, textTransform: "uppercase", opacity: 0.6 }}>Ativos</span>
          </div>
          <div style={{ fontSize: "36px", fontWeight: 900 }}>{totalRunners}</div>
          <div style={{ fontSize: "11px", fontWeight: 700, opacity: 0.8, textTransform: "uppercase", marginTop: "8px" }}>Atletas no Programa</div>
        </div>

        <div className="stats-card" style={{ padding: "24px", background: "#FFF", border: "3px solid #000", boxShadow: "4px 4px 0px #000" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
            <TrendingUp size={24} style={{ color: "var(--nb-blue)" }} />
            <span style={{ fontSize: "11px", fontWeight: 900, textTransform: "uppercase", color: "#666" }}>Engajamento</span>
          </div>
          <div style={{ fontSize: "36px", fontWeight: 900 }}>{recentLogs}</div>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "#666", textTransform: "uppercase", marginTop: "8px" }}>Treinos Logados (7D)</div>
        </div>

        <div className="stats-card" style={{ padding: "24px", background: "#FFF", border: "3px solid #000", boxShadow: "4px 4px 0px #000", borderLeft: "8px solid var(--nb-red)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
            <AlertCircle size={24} style={{ color: "var(--nb-red)" }} />
            <span style={{ fontSize: "11px", fontWeight: 900, textTransform: "uppercase", color: "#666" }}>Atenção</span>
          </div>
          <div style={{ fontSize: "36px", fontWeight: 900, color: missingPrescription > 0 ? "var(--nb-red)" : "inherit" }}>{missingPrescription}</div>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "#666", textTransform: "uppercase", marginTop: "8px" }}>Sem Prescrição Ativa</div>
        </div>
      </div>

      {/* ── SEARCH & TABLE ── */}
      <div style={{ display: "flex", gap: "16px", marginBottom: "24px" }}>
        <div style={{ flex: 1, position: "relative" }}>
          <Search size={18} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "#000" }} />
          <input 
            type="search" 
            placeholder="Buscar corredor..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="nb-input"
            style={{ width: "100%", paddingLeft: "44px", height: "48px" }} 
          />
        </div>
        <select 
          className="nb-input"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          style={{ width: "200px", height: "48px", fontWeight: 900, cursor: "pointer", textTransform: "uppercase" }}
        >
          <option value="all">TODOS OS STATUS</option>
          <option value="active">ATIVOS</option>
          <option value="inactive">INATIVOS</option>
          <option value="suspended">SUSPENSOS</option>
        </select>
      </div>

      <div className="nb-card-blue" style={{ padding: 0, overflow: "hidden" }}>
        <table className="admin-table" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: "16px 24px" }}>Atleta</th>
              <th style={{ textAlign: "left", padding: "16px" }}>Nível</th>
              <th style={{ textAlign: "center", padding: "16px" }}>Status</th>
              <th style={{ textAlign: "center", padding: "16px" }}>Progresso</th>
              <th style={{ textAlign: "left", padding: "16px" }}>Último Log</th>
              <th style={{ textAlign: "right", padding: "16px 24px" }}>Ação</th>
            </tr>
          </thead>
           <tbody>
            {filteredRunners.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: "80px 24px", textAlign: "center" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", opacity: 0.5 }}>
                    <Footprints size={48} />
                    <span style={{ fontWeight: 800, fontSize: "14px", textTransform: "uppercase" }}>
                      {search ? "Nenhum atleta encontrado para esta busca" : "Nenhum atleta ativo no programa de corrida"}
                    </span>
                  </div>
                </td>
              </tr>
            ) : filteredRunners.map((runner) => {
              const isAbandoned = runner.stats.last_log_days > 14 && runner.stats.last_log_days < 999;
              const isFinished = runner.stats.has_active_plan && runner.stats.total_prescribed > 0 && runner.stats.total_prescribed === runner.stats.total_logged;
              const noPlan = !runner.stats.has_active_plan;
              
              const isAlert = isAbandoned || isFinished || noPlan;

              return (
                <tr key={runner.id} style={{ borderBottom: "1px solid #EEE" }}>
                  <td style={{ padding: "16px 24px" }}>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <AthleteIdentity 
                        profile={runner.profiles} 
                        avatarSize={40}
                      />
                      {runner.active_plan_title && (
                        <span style={{ fontSize: 9, fontWeight: 800, color: "var(--nb-blue)", marginTop: 4, textTransform: "uppercase" }}>
                          Plano: {runner.active_plan_title}
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: "16px" }}>
                    {(() => {
                      const runningLevelKey = (runner.profiles?.running_level as RunningLevelKey) || "iniciante";
                      const lvl = RUNNING_LEVELS[runningLevelKey] ?? RUNNING_LEVELS.iniciante;
                      const textColor = "#FFF";
                      const isDefault = !runner.profiles?.running_level;

                      return (
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                          <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                            <span style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px",
                              padding: "4px 10px",
                              border: "2px solid #000",
                              background: lvl.color,
                              color: textColor,
                              fontSize: "10px",
                              fontWeight: 900,
                              textTransform: "uppercase",
                              letterSpacing: "0.08em",
                              whiteSpace: "nowrap",
                            }}>
                              <Zap size={10} />
                              {lvl.label}
                            </span>
                          </div>
                          {runner.profiles?.running_pace && (
                            <span style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px",
                              padding: "2px 8px",
                              border: "2px solid #000",
                              background: "#FFF",
                              color: "#000",
                              fontSize: "10px",
                              fontWeight: 900,
                              textTransform: "uppercase",
                              letterSpacing: "0.08em",
                              whiteSpace: "nowrap",
                              width: "fit-content"
                            }}>
                              <Timer size={10} /> {(() => {
                                try {
                                  const parsed = JSON.parse(runner.profiles.running_pace);
                                  if (Array.isArray(parsed)) {
                                    if (parsed.length === 0) return "S/ PACE";
                                    if (parsed.length === 1) return parsed[0].pace;
                                    return `${parsed.length} MARCOS`;
                                  }
                                  return runner.profiles.running_pace;
                                } catch {
                                  return runner.profiles.running_pace;
                                }
                              })()}
                            </span>
                          )}
                          {isDefault && (
                            <span style={{ fontSize: "8px", fontWeight: 700, color: "#999", textTransform: "uppercase" }}>
                              padrão
                            </span>
                          )}
                        </div>
                      );
                    })()}
                  </td>
                  <td style={{ padding: "16px", textAlign: "center" }}>
                    {(() => {
                      const statusKey = (runner.profiles?.running_status as RunningStatusKey) || "active";
                      const status = RUNNING_STATUSES[statusKey] || RUNNING_STATUSES.active;
                      const isYellow = statusKey === "suspended";
                      return (
                        <span style={{
                          padding: "4px 10px",
                          border: "2px solid #000",
                          background: status.color,
                          color: isYellow ? "#000" : "#FFF",
                          fontSize: "10px",
                          fontWeight: 900,
                          textTransform: "uppercase",
                          whiteSpace: "nowrap",
                          boxShadow: "2px 2px 0px #000"
                        }}>
                          {status.label}
                        </span>
                      );
                    })()}
                  </td>
                  <td style={{ padding: "16px", textAlign: "center" }}>
                        {noPlan ? (
                          <span style={{ fontSize: 9, fontWeight: 900, color: "var(--nb-red)" }}>SEM PLANO</span>
                        ) : (
                          <span style={{ fontSize: 10, fontWeight: 800, color: "#666" }}>
                            {runner.stats.total_logged} de {runner.stats.total_prescribed}
                          </span>
                        )}
                  </td>
                  <td style={{ padding: "16px" }}>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span style={{ fontSize: "11px", fontWeight: 800, color: isAbandoned ? "var(--nb-red)" : "#000" }}>
                        {runner.stats.latest_log ? new Date(runner.stats.latest_log).toLocaleDateString("pt-BR") : "Nunca"}
                      </span>
                      {isAbandoned && (
                        <span style={{ fontSize: 8, fontWeight: 950, color: "var(--nb-red)", textTransform: "uppercase" }}>
                          {runner.stats.last_log_days} dias inativo
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: "16px 24px", textAlign: "right" }}>
                    <button 
                      onClick={() => setSelectedRunner(runner)}
                      className="nb-button-compact"
                      style={{ 
                        background: isAlert ? "var(--nb-red)" : "#000", 
                        color: "#FFF",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "8px 16px",
                        fontSize: "11px",
                        fontWeight: 900,
                        textTransform: "uppercase"
                      }}
                    >
                      Gerenciar <ArrowRight size={14} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── MODAL DE GESTÃO DO ATLETA ── */}
      {/* Padrão: mesmo layout de todos os modais admin (TurmasClient, etc.)  */}
      {selectedRunner && (
        <div style={{
          position: "fixed",
          inset: 0,
          zIndex: 200,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          padding: 20,
        }}>
          {/* Overlay com blur */}
          <div
            style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
            onClick={() => setSelectedRunner(null)}
          />

          {/* Painel centralizado */}
          <div style={{
            position: "relative",
            width: "100%",
            maxWidth: 1100,
            background: "#FFF",
            border: "4px solid #000",
            display: "flex",
            flexDirection: "column",
            maxHeight: "92vh",
            boxShadow: "32px 32px 0px rgba(0,0,0,0.1)",
          }}>
            {/* Header preto */}
            <div style={{
              padding: "20px 28px",
              borderBottom: "3px solid #000",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "#000",
              color: "#FFF",
              flexShrink: 0,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <User size={20} />
                <h2 style={{ fontSize: 18, fontWeight: 900, textTransform: "uppercase", margin: 0 }}>
                  Gestão de {selectedRunner.profiles.full_name}
                </h2>
              </div>
              <button
                onClick={() => setSelectedRunner(null)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#FFF", display: "flex" }}
                title="Fechar"
              >
                <X size={24} />
              </button>
            </div>

            {/* Conteúdo com scroll */}
            <div className="runner-modal-content" style={{ overflowY: "auto", flex: 1, padding: 28, background: "#FDFDFD" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
                <RunningIdentityEditor 
                  student={selectedRunner.profiles} 
                  onUpdate={() => {
                    router.refresh();
                    // Opcional: fechar modal ou mostrar toast
                  }}
                  updateStudentAction={updateStudent}
                />
                
                <div style={{ borderTop: "2px dashed #EEE", paddingTop: 8 }}>
                  <RunningCoachManager studentId={selectedRunner.profiles.id} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

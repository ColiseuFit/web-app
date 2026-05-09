"use client";

import React, { useState } from "react";
import { Footprints, TrendingUp, History, LayoutGrid, Zap, Timer, User } from "lucide-react";
import RunningWorkoutsList from "./RunningWorkoutsList";
import RunningAnalytics from "./RunningAnalytics";
import RunningProfileTab from "./RunningProfileTab";
import { formatPace, RUNNING_CATEGORIES, RUNNING_ZONES } from "@/lib/constants/running";
import Link from "next/link";
import AlertModal from "@/components/AlertModal";

/**
 * Componente de botão oficial "Connect with Strava".
 * Usa o asset SVG oficial do kit de marca Strava (1.1).
 * PROIBIDO modificar tamanho, cores ou distorcer a imagem (Brand Guidelines §2).
 */
const StravaConnectButton = ({ onClick }: { onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    style={{ display: "inline-block", lineHeight: 0, background: "none", border: "none", padding: 0, cursor: "pointer" }}
    aria-label="Connect with Strava"
  >
    {/* Botão oficial PNG/SVG — não modificar cores nem proporções */}
    <img
      src="/strava/btn_connect_orange.svg"
      alt="Connect with Strava"
      style={{ height: 48, width: "auto", display: "block" }}
    />
  </button>
);

/**
 * Logo Strava "Powered by" oficial.
 * Renderizado como <img> apontando para o asset oficial do kit 1.2.
 */
const StravaPoweredByLogo = ({ color = "black", height = 24, style }: { color?: "black" | "white"; height?: number; style?: React.CSSProperties }) => (
  <img
    src={`/strava/pwrdBy_strava_${color}.svg`}
    alt="Powered by Strava"
    style={{ height, width: "auto", display: "block", ...style }}
  />
);

interface RunningHubTabsProps {
  activePlan: any;
  historyData: any;
  stravaIntegration: any;
  metrics: {
    totalKmMonth: number;
    timeDisplay: string;
    completedThisMonth: number;
    completedInPlan: number;
    totalWorkoutsInPlan: number;
  };
  runnerProfile?: any;
}

export default function RunningHubTabs({
  activePlan,
  historyData,
  stravaIntegration,
  metrics,
  runnerProfile
}: RunningHubTabsProps) {
  const [activeTab, setActiveTab] = useState<"inicio" | "planilha" | "evolucao" | "perfil">("inicio");
  const [showAlert, setShowAlert] = useState(false);

  const workouts = activePlan?.running_workouts ?? [];

  return (
    <div style={{ padding: "0 16px" }}>
      {/* TABS SELECTOR */}
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "1fr 1fr 1fr 1fr", 
        gap: 8, 
        marginBottom: 24,
        background: "#FFF",
        padding: "6px",
        border: "4px solid #000",
        boxShadow: "6px 6px 0px #000"
      }}>
        <button 
          onClick={() => setActiveTab("inicio")}
          style={{
            padding: "10px 4px",
            background: activeTab === "inicio" ? "var(--nb-red)" : "transparent",
            color: activeTab === "inicio" ? "#FFF" : "#000",
            border: activeTab === "inicio" ? "2px solid #000" : "none",
            fontSize: 10,
            fontWeight: 900,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            transition: "all 0.2s"
          }}
        >
          <LayoutGrid size={14} /> INÍCIO
        </button>
        <button 
          onClick={() => setActiveTab("planilha")}
          style={{
            padding: "10px 4px",
            background: activeTab === "planilha" ? "var(--nb-blue)" : "transparent",
            color: activeTab === "planilha" ? "#FFF" : "#000",
            border: activeTab === "planilha" ? "2px solid #000" : "none",
            fontSize: 10,
            fontWeight: 900,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            transition: "all 0.2s"
          }}
        >
          <Footprints size={14} /> PLANILHA
        </button>
        <button 
          onClick={() => setActiveTab("evolucao")}
          style={{
            padding: "10px 4px",
            background: activeTab === "evolucao" ? "var(--nb-yellow)" : "transparent",
            color: activeTab === "evolucao" ? "#000" : "#000",
            border: activeTab === "evolucao" ? "2px solid #000" : "none",
            fontSize: 10,
            fontWeight: 900,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            transition: "all 0.2s"
          }}
        >
          <TrendingUp size={14} /> EVOLUÇÃO
        </button>
        <button 
          onClick={() => setActiveTab("perfil")}
          style={{
            padding: "10px 4px",
            background: activeTab === "perfil" ? "var(--nb-blue)" : "transparent",
            color: activeTab === "perfil" ? "#FFF" : "#000",
            border: activeTab === "perfil" ? "2px solid #000" : "none",
            fontSize: 10,
            fontWeight: 900,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            transition: "all 0.2s"
          }}
        >
          <User size={14} /> PERFIL
        </button>
      </div>

      {/* TAB CONTENT: INÍCIO */}
      {activeTab === "inicio" && (
        <div className="animate-in">
          {/* Métricas Rápidas */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 24 }}>
             <div style={{ padding: "16px 12px", background: "#FFF", border: "3px solid #000", boxShadow: "4px 4px 0px #000" }}>
               <Footprints size={16} color="var(--nb-red)" style={{ marginBottom: 6 }} />
               <div style={{ fontSize: 20, fontWeight: 950 }}>{metrics.totalKmMonth.toFixed(1)}</div>
               <div style={{ fontSize: 8, fontWeight: 900, color: "#888", textTransform: "uppercase" }}>KM MÊS</div>
             </div>
             <div style={{ padding: "16px 12px", background: "#FFF", border: "3px solid #000", boxShadow: "4px 4px 0px #000" }}>
               <Timer size={16} color="var(--nb-blue)" style={{ marginBottom: 6 }} />
               <div style={{ fontSize: 20, fontWeight: 950 }}>{metrics.timeDisplay}</div>
               <div style={{ fontSize: 8, fontWeight: 900, color: "#888", textTransform: "uppercase" }}>ATIVO</div>
             </div>
             <div style={{ padding: "16px 12px", background: "#FFF", border: "3px solid #000", boxShadow: "4px 4px 0px #000" }}>
               <Zap size={16} color="var(--nb-yellow)" style={{ marginBottom: 6 }} />
               <div style={{ fontSize: 20, fontWeight: 950 }}>{metrics.completedThisMonth}</div>
               <div style={{ fontSize: 8, fontWeight: 900, color: "#888", textTransform: "uppercase" }}>SESSÕES</div>
             </div>
          </div>

          {/* Selo obrigatório — Brand Guidelines §1.2: "Powered by Strava" */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 32 }}>
            <a
              href="https://www.strava.com"
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: "inline-block", opacity: 0.55, lineHeight: 0 }}
              aria-label="Powered by Strava"
            >
              {/* Asset oficial do kit 1.2 — horizontal black */}
              <StravaPoweredByLogo color="black" height={24} style={{ opacity: 0.6 }} />
            </a>
          </div>

          {/* Link para página de suporte oficial — Exigência Strava API */}
          <div style={{ textAlign: "center", marginTop: -20, marginBottom: 32 }}>
            <Link 
              href="/programas/running/suporte"
              style={{ 
                fontSize: 10, 
                fontWeight: 900, 
                color: "#999", 
                textTransform: "uppercase", 
                textDecoration: "underline" 
              }}
            >
              Ajuda e Suporte da Integração
            </Link>
          </div>

          {/* Próxima Sessão / Resumo */}
          {activePlan && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <Zap size={14} color="var(--nb-red)" />
                <span style={{ fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.05em" }}>Resumo do Plano Atual</span>
              </div>
              <div className="nb-card" style={{ padding: 20, background: "#FFF", position: "relative" }}>
                 <div style={{ fontSize: 18, fontWeight: 950, marginBottom: 4 }}>{activePlan.title}</div>
                 <div style={{ fontSize: 12, fontWeight: 700, color: "#666" }}>
                   {metrics.completedInPlan} de {metrics.totalWorkoutsInPlan} sessões concluídas
                 </div>
                 <div style={{ marginTop: 16, height: 10, background: "#EEE", border: "2px solid #000", borderRadius: 5, overflow: "hidden" }}>
                   <div style={{ 
                     height: "100%", 
                     width: `${(metrics.completedInPlan / metrics.totalWorkoutsInPlan) * 100}%`, 
                     background: "var(--nb-blue)",
                     transition: "width 0.5s ease"
                   }} />
                 </div>
                 <button 
                  onClick={() => setActiveTab("planilha")}
                  style={{ 
                    marginTop: 20, 
                    width: "100%", 
                    padding: "12px", 
                    background: "#000", 
                    color: "#FFF", 
                    fontSize: 11, 
                    fontWeight: 900, 
                    border: "none", 
                    cursor: "pointer",
                    textTransform: "uppercase"
                  }}>
                   Ver Planilha Completa
                 </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: PLANILHA */}
      {activeTab === "planilha" && (
        <div className="animate-in">
          {!activePlan ? (
            <div style={{ padding: "40px 20px", textAlign: "center", background: "#FFF", border: "3px dashed #CCC" }}>
              <p style={{ fontWeight: 900, color: "#999" }}>NENHUM PLANO ATIVO</p>
            </div>
          ) : (
            <RunningWorkoutsList workouts={workouts} />
          )}
        </div>
      )}

      {/* TAB CONTENT: EVOLUÇÃO */}
      {activeTab === "evolucao" && (
        <div className="animate-in">
          <RunningAnalytics workouts={historyData.workouts} stats={historyData.stats} />
          
          {/* Histórico Completo */}
          <div style={{ marginTop: 32 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <History size={16} />
              <h3 style={{ fontSize: 12, fontWeight: 950, textTransform: "uppercase", margin: 0 }}>Histórico de Atividades</h3>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {(() => {
                // Agrupar por sessão (week_number - session_order)
                const groupedSessions: Record<string, any[]> = {};
                historyData.workouts.forEach((w: any) => {
                   const key = `${w.week_number}-${w.session_order}`;
                   if (!groupedSessions[key]) groupedSessions[key] = [];
                   groupedSessions[key].push(w);
                });
                
                // Ordenar sessões por data (pegar a data do primeiro bloco concluído)
                const sortedSessionKeys = Object.keys(groupedSessions).sort((a, b) => {
                   const dateA = new Date(groupedSessions[a][0].completed_at!).getTime();
                   const dateB = new Date(groupedSessions[b][0].completed_at!).getTime();
                   return dateB - dateA; // Decrescente
                });

                return sortedSessionKeys.map(sessionKey => {
                   const sessionBlocks = groupedSessions[sessionKey].sort((a, b) => (a.block_order || 0) - (b.block_order || 0));
                   const firstBlock = sessionBlocks[0];
                   
                   // Calcular volume total da sessão
                   let sessionTotalKm = 0;
                   sessionBlocks.forEach(b => {
                      if (b.actual_distance_km) {
                         sessionTotalKm += parseFloat(String(b.actual_distance_km));
                      }
                   });
                   const isMeters = sessionTotalKm > 0 && sessionTotalKm < 1;
                   const displaySessionVol = isMeters ? (sessionTotalKm * 1000).toFixed(0) : sessionTotalKm.toFixed(1);
                   const displaySessionUnit = isMeters ? "M" : "KM";

                   return (
                     <div key={sessionKey} className="nb-card" style={{ padding: 0, background: "#FFF", overflow: "hidden" }}>
                        {/* Header da Sessão */}
                        <div style={{ background: "#000", color: "#FFF", padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                           <div style={{ display: "flex", flexDirection: "column" }}>
                              <span style={{ fontSize: 9, fontWeight: 900, color: "var(--nb-yellow)", textTransform: "uppercase" }}>
                                {new Date(firstBlock.completed_at!).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "2-digit" })}
                              </span>
                              <span style={{ fontSize: 14, fontWeight: 950, textTransform: "uppercase" }}>
                                TREINO {firstBlock.session_order < 999 ? firstBlock.session_order : "EXTRA"}
                              </span>
                           </div>
                           <div style={{ textAlign: "right" }}>
                              <div style={{ fontSize: 10, fontWeight: 700, color: "#999", textTransform: "uppercase" }}>Volume da Sessão</div>
                              <div style={{ fontSize: 18, fontWeight: 950, color: "var(--nb-blue)", lineHeight: 1.1 }}>
                                {sessionTotalKm > 0 ? displaySessionVol : "-"} <span style={{ fontSize: 10 }}>{sessionTotalKm > 0 ? displaySessionUnit : ""}</span>
                              </div>
                           </div>
                        </div>

                        {/* Blocos da Sessão */}
                        <div style={{ padding: "16px 12px", display: "flex", flexDirection: "column", gap: "12px" }}>
                          {sessionBlocks.map((w: any, bIdx: number) => {
                             const cat = w.category ? RUNNING_CATEGORIES.find(c => c.id === w.category) : null;
                             const zone = w.target_zone ? RUNNING_ZONES.find(z => z.id === w.target_zone) : null;
                             const isBlockMeters = w.actual_distance_km && w.actual_distance_km < 1;
                             const displayBlockVol = isBlockMeters ? (w.actual_distance_km * 1000).toFixed(0) : w.actual_distance_km;
                             const displayBlockUnit = isBlockMeters ? "M" : "KM";

                             return (
                               <div key={w.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: bIdx === sessionBlocks.length - 1 ? "none" : "1px dashed #E5E7EB", paddingBottom: bIdx === sessionBlocks.length - 1 ? 0 : 12 }}>
                                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                     <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                                        {cat && <span style={{ fontSize: 9, fontWeight: 900, background: cat.color, color: "#FFF", padding: "2px 6px", borderRadius: 2, textTransform: "uppercase" }}>{cat.label}</span>}
                                        {zone && zone.id !== "livre" && <span style={{ fontSize: 9, fontWeight: 950, background: zone.color, color: "#FFF", padding: "2px 6px", borderRadius: 2, textTransform: "uppercase" }}>{zone.label}</span>}
                                        {w.reps && w.reps > 1 && <span style={{ fontSize: 9, fontWeight: 900, color: "var(--nb-red)" }}>{w.reps}x</span>}
                                     </div>
                                     <div style={{ fontSize: 11, fontWeight: 600, color: "#64748B" }}>
                                        {w.target_distance_km || w.target_pace_description ? (
                                          <>
                                            Alvo: {
                                              w.target_distance_km ? (
                                                w.target_unit === "m"
                                                  ? `${((Number(w.target_distance_km) || 0) >= 1 ? Number(w.target_distance_km) : Number(w.target_distance_km) * 1000).toFixed(0)}m `
                                                  : w.target_unit === "min"
                                                    ? `${w.target_distance_km}min `
                                                    : `${w.target_distance_km}km `
                                              ) : ""
                                            }
                                            {w.target_pace_description ? `@ ${w.target_pace_description}` : ""}
                                          </>
                                        ) : (
                                          <span style={{ fontStyle: "italic" }}>Bloco Concluído</span>
                                        )}
                                     </div>
                                  </div>

                                  <div style={{ textAlign: "right" }}>
                                     {w.actual_distance_km ? (
                                       <>
                                          <div style={{ fontSize: 14, fontWeight: 950, color: "var(--nb-blue)" }}>
                                            {displayBlockVol}<span style={{ fontSize: 9, marginLeft: 2 }}>{displayBlockUnit}</span>
                                          </div>
                                          {w.actual_pace_seconds_per_km && (
                                            <div style={{ fontSize: 10, fontWeight: 700, color: "#64748B", marginTop: 2 }}>
                                              {formatPace(w.actual_pace_seconds_per_km)}/km
                                            </div>
                                          )}
                                       </>
                                     ) : (
                                       <span style={{ fontSize: 10, fontWeight: 900, background: "var(--nb-yellow)", padding: "4px 8px", border: "2px solid #000", color: "#000" }}>CONCLUÍDO</span>
                                     )}
                                  </div>
                               </div>
                             );
                          })}
                        </div>
                        
                        {(() => {
                           const stravaBlock = sessionBlocks.find(b => b.strava_activity_id || b.target_description?.includes("Strava"));
                           if (stravaBlock) {
                             return (
                               <div style={{ background: "#FAFAFA", padding: "10px 16px", borderTop: "2px solid #000", textAlign: "right" }}>
                                 <a
                                   href={stravaBlock.strava_activity_id ? `https://www.strava.com/activities/${stravaBlock.strava_activity_id}` : "https://www.strava.com/dashboard"}
                                   target="_blank"
                                   rel="noopener noreferrer"
                                   style={{ fontSize: 9, fontWeight: 950, color: "#FC5200", textDecoration: "underline", textTransform: "uppercase" }}
                                 >
                                   View on Strava
                                 </a>
                               </div>
                             );
                           }
                           return null;
                        })()}
                     </div>
                   );
                });
              })()}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: PERFIL */}
      {activeTab === "perfil" && (
        <RunningProfileTab 
          runnerProfile={runnerProfile}
          stravaIntegration={stravaIntegration}
          StravaPoweredByLogo={StravaPoweredByLogo}
          StravaConnectButton={StravaConnectButton}
          setShowAlert={setShowAlert}
        />
      )}

      {showAlert && (
        <AlertModal
          title="Homologação em Curso"
          message="A integração com o Strava está em processo final de aprovação. Em breve você poderá conectar sua conta e sincronizar seus treinos automaticamente!"
          type="info"
          onClose={() => setShowAlert(false)}
        />
      )}
    </div>
  );
}

"use client";

import React, { useState } from "react";
import { Footprints, TrendingUp, History, LayoutGrid, Zap, Timer } from "lucide-react";
import RunningWorkoutsList from "./RunningWorkoutsList";
import RunningAnalytics from "./RunningAnalytics";
import { formatPace } from "@/lib/constants/running";
import Link from "next/link";

/**
 * Componente de botão oficial "Connect with Strava".
 * Usa o asset SVG oficial do kit de marca Strava (1.1).
 * PROIBIDO modificar tamanho, cores ou distorcer a imagem (Brand Guidelines §2).
 */
const StravaConnectButton = ({ href }: { href: string }) => (
  <a
    href={href}
    style={{ display: "inline-block", lineHeight: 0 }}
    aria-label="Connect with Strava"
  >
    {/* Botão oficial PNG/SVG — não modificar cores nem proporções */}
    <img
      src="/strava/btn_connect_orange.svg"
      alt="Connect with Strava"
      style={{ height: 48, width: "auto", display: "block" }}
    />
  </a>
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
}

export default function RunningHubTabs({
  activePlan,
  historyData,
  stravaIntegration,
  metrics
}: RunningHubTabsProps) {
  const [activeTab, setActiveTab] = useState<"inicio" | "planilha" | "evolucao">("inicio");

  const workouts = activePlan?.running_workouts ?? [];

  return (
    <div style={{ padding: "0 16px" }}>
      {/* TABS SELECTOR */}
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "1fr 1fr 1fr", 
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

          {/* Integração Strava */}
          <div style={{
            background: stravaIntegration ? "#FC4C02" : "#FFF",
            border: "4px solid #000",
            boxShadow: "6px 6px 0px #000",
            padding: "20px",
            marginBottom: "32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            position: "relative",
            overflow: "hidden"
          }} className="nb-card-hover">
            {/* Watermark de fundo — asset oficial, sem alteração de cor (grayscale via CSS) */}
            <div style={{
              position: "absolute",
              right: "-20px",
              bottom: "5px",
              opacity: 0.12,
              pointerEvents: "none",
              transform: "rotate(-10deg)"
            }}>
              <StravaPoweredByLogo color={stravaIntegration ? "white" : "black"} height={40} />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 12, position: "relative", zIndex: 2 }}>
              {/* Ícone Strava: logo oficial em fundo laranja */}
              <div style={{
                border: "3px solid #000",
                boxShadow: "2px 2px 0px #000",
                lineHeight: 0,
                background: "#FC5200",
                padding: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}>
                <img 
                  src="/strava/pwrdBy_strava_stack_white.svg" 
                  alt="Strava" 
                  style={{ height: 32, width: "auto" }} 
                />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 950, color: stravaIntegration ? "#FFF" : "#000", textTransform: "uppercase", letterSpacing: "0.02em" }}>
                  {stravaIntegration ? "SINCRONIZADO COM STRAVA" : "CONECTAR AO STRAVA"}
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: stravaIntegration ? "#4ade80" : "#9ca3af" }} />
                  <span style={{ fontSize: 9, fontWeight: 800, color: stravaIntegration ? "rgba(255,255,255,0.8)" : "#666", textTransform: "uppercase" }}>
                    {stravaIntegration ? "Status: Ativo" : "Status: Pendente"}
                  </span>
                </div>
              </div>
            </div>
            
            {stravaIntegration ? (
              <div style={{ 
                background: "rgba(255,255,255,0.2)", 
                padding: "6px 10px", 
                border: "1px solid rgba(255,255,255,0.4)",
                fontSize: 9,
                fontWeight: 900,
                color: "#FFF",
                textTransform: "uppercase"
              }}>
                CONECTADO
              </div>
            ) : (
              /* Botão oficial "Connect with Strava" — Brand Guidelines §1.1 */
              <StravaConnectButton href="/api/auth/strava" />
            )}
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
            
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {historyData.workouts.map((w: any) => (
                <div key={w.id} className="nb-card" style={{ padding: 16, background: "#FFF" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 9, fontWeight: 900, color: "var(--nb-red)", textTransform: "uppercase" }}>
                        {new Date(w.completed_at!).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "2-digit" })}
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 800 }}>{w.target_description || "Corrida Registrada"}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 16, fontWeight: 950 }}>{w.actual_distance_km} KM</div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#666" }}>{formatPace(w.actual_pace_seconds_per_km)}/km</div>
                      {/* Link obrigatório quando dado vem do Strava — Brand Guidelines §3 */}
                      {(w.strava_activity_id || w.target_description?.includes("Strava")) && (
                        <a
                          href={w.strava_activity_id ? `https://www.strava.com/activities/${w.strava_activity_id}` : "https://www.strava.com/dashboard"}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            fontSize: 9,
                            fontWeight: 950,
                            color: "#FC5200",
                            textDecoration: "underline",
                            textTransform: "uppercase",
                            display: "block",
                            marginTop: 4
                          }}
                        >
                          View on Strava
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

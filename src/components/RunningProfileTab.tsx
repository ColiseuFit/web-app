"use client";

import React, { useState } from "react";
import { User, Activity, Edit2, Check, Timer, Zap } from "lucide-react";
import { updateRunningPace } from "@/lib/actions/running_actions";
import { RUNNING_LEVELS, type RunningLevelKey } from "@/lib/constants/running";

interface RunningProfileTabProps {
  runnerProfile: {
    avatar_url?: string;
    birth_date?: string;
    gender?: string;
    weight?: number;
    running_level?: string;
    running_pace?: { distance: number | string; pace: string }[];
    running_target_pace?: string;
  };
  stravaIntegration: any;
  StravaPoweredByLogo: React.ElementType;
  StravaConnectButton: React.ElementType;
  setShowAlert: (v: boolean) => void;
}

/**
 * RunningProfileTab — Painel de Identidade e Performance do Corredor.
 * 
 * @logic
 * - Marcos de Performance: Dados de "referência" definidos pelo Coach (ex: pace de 5k, 10k). Somente leitura para o aluno.
 * - Meu Pace Alvo: Meta pessoal definida pelo aluno para seus treinos atuais. Editável via 'Blue Mode'.
 * - Design: Neo-Brutalismo com cards de borda sólida e sombras rígidas.
 * 
 * @param runnerProfile Dados consolidados do perfil vindos do servidor.
 */
export default function RunningProfileTab({
  runnerProfile,
  stravaIntegration,
  StravaPoweredByLogo,
  StravaConnectButton,
  setShowAlert
}: RunningProfileTabProps) {
  // Estado para edição do pace
  const [isEditingPace, setIsEditingPace] = useState(false);
  const defaultPace = runnerProfile?.running_target_pace || "";
  const [paceInput, setPaceInput] = useState(defaultPace);
  const [isSaving, setIsSaving] = useState(false);

  // Calcula idade se tiver data de nascimento
  let age = "--";
  if (runnerProfile?.birth_date) {
    const bd = new Date(runnerProfile.birth_date);
    if (!isNaN(bd.getTime())) {
      const diff = Date.now() - bd.getTime();
      age = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25)).toString();
    }
  }

  // Pega label do nível
  const rawLevel = (runnerProfile?.running_level || "iniciante").toLowerCase() as RunningLevelKey;
  const levelLabel = RUNNING_LEVELS[rawLevel]?.label || rawLevel;

  const handleSavePace = async () => {
    setIsSaving(true);
    try {
      const data = new FormData();
      data.append("pace", paceInput);
      
      const res = await updateRunningPace(data);
      if (res?.error) {
        alert("Erro ao salvar Pace: " + res.error);
      } else {
        setIsEditingPace(false);
      }
    } catch (e) {
      alert("Erro inesperado.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="animate-in">
      
      {/* ── RUNNER ID CARD ── */}
      <div style={{
        background: "#FFF",
        border: "4px solid #000",
        boxShadow: "6px 6px 0px #000",
        padding: "24px",
        marginBottom: "24px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        position: "relative"
      }}>
        {/* Avatar Centralizado */}
        <div style={{
          width: 80,
          height: 80,
          borderRadius: "50%",
          border: "3px solid #000",
          boxShadow: "4px 4px 0px #000",
          overflow: "hidden",
          background: "#EEE",
          marginBottom: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}>
          {runnerProfile?.avatar_url ? (
            <img src={runnerProfile.avatar_url} alt="Atleta" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <User size={32} color="#999" />
          )}
        </div>

        <div style={{ fontSize: 18, fontWeight: 950, textTransform: "uppercase", marginBottom: 16 }}>
          IDENTIDADE DO ATLETA
        </div>

        {/* Biometria (Peso, Idade) */}
        <div style={{ display: "flex", gap: 16, width: "100%", justifyContent: "center", marginBottom: 24 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 10, fontWeight: 900, color: "#999", textTransform: "uppercase" }}>IDADE</div>
            <div style={{ fontSize: 24, fontWeight: 950 }}>{age} <span style={{ fontSize: 12 }}>anos</span></div>
          </div>
          <div style={{ width: 2, background: "#EEE" }} />
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 10, fontWeight: 900, color: "#999", textTransform: "uppercase" }}>PESO ATUAL</div>
            <div style={{ fontSize: 24, fontWeight: 950 }}>{runnerProfile?.weight || "--"} <span style={{ fontSize: 12 }}>kg</span></div>
          </div>
        </div>

        {/* Nível do Atleta (Read-only) */}
        <div style={{ width: "100%", borderTop: "2px solid #EEE", paddingTop: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 900, color: "#999", textTransform: "uppercase", marginBottom: 8 }}>
            NÍVEL DE CORRIDA ATUAL (Atribuído)
          </div>
          <div style={{ 
            background: "var(--nb-yellow)", 
            padding: "12px", 
            border: "2px solid #000",
            display: "flex",
            alignItems: "center",
            gap: 12
          }}>
            <Activity size={20} strokeWidth={3} />
            <span style={{ fontSize: 16, fontWeight: 950, textTransform: "uppercase" }}>{levelLabel}</span>
          </div>
        </div>
      </div>

      {/* ── MARCOS DE PERFORMANCE (COACH) ── */}
      <div style={{
        background: "#FFF",
        border: "4px solid #000",
        boxShadow: "6px 6px 0px #000",
        padding: "24px",
        marginBottom: "24px"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <Activity size={20} />
          <h2 style={{ fontSize: 14, fontWeight: 950, textTransform: "uppercase", margin: 0 }}>Marcos de Performance</h2>
        </div>
        
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
           {(runnerProfile?.running_pace || []).length > 0 ? (
             runnerProfile!.running_pace!.map((mark: any, i: number) => {
               let dateFormatted = "";
               if (mark.date) {
                 const d = new Date(mark.date + "T12:00:00Z");
                 if (!isNaN(d.getTime())) {
                   dateFormatted = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }).format(d);
                 }
               }
               return (
                 <div key={i} style={{ 
                   background: "#000", 
                   color: "#FFF", 
                   padding: "12px 16px", 
                   border: "2px solid var(--nb-yellow)",
                   boxShadow: "4px 4px 0px #000",
                   display: "flex", 
                   flexDirection: "column", 
                   gap: 2,
                   position: "relative",
                   overflow: "hidden"
                 }}>
                   {/* Decorador de fundo */}
                   <div style={{ position: "absolute", right: -5, top: -5, opacity: 0.1, color: "#FFF" }}>
                     <Zap size={32} fill="currentColor" />
                   </div>

                   <div style={{ fontSize: 10, fontWeight: 900, color: "var(--nb-yellow)", textTransform: "uppercase", letterSpacing: "0.1em" }}>{mark.distance} KM</div>
                   <div style={{ fontSize: 22, fontWeight: 950, letterSpacing: "-0.02em" }}>{mark.pace}</div>
                   {dateFormatted && (
                     <div style={{ fontSize: 8, color: "rgba(255,255,255,0.5)", fontWeight: 800, marginTop: 4 }}>RECORDADO EM {dateFormatted}</div>
                   )}
                 </div>
               );
             })
           ) : (
             <div style={{ color: "#999", fontWeight: 700, fontSize: 12, gridColumn: "span 2" }}>Nenhum Marco registrado pelo Coach.</div>
           )}
        </div>
      </div>

      {/* ── PACE ALVO (ALUNO) ── */}
      <div style={{
        background: "var(--nb-blue)",
        color: "#FFF",
        border: "4px solid #000",
        boxShadow: "6px 6px 0px #000",
        padding: "24px",
        marginBottom: "32px"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Timer size={20} color="#FFF" />
            <h2 style={{ fontSize: 14, fontWeight: 950, textTransform: "uppercase", margin: 0 }}>Meu Pace Alvo</h2>
          </div>
          {!isEditingPace && (
            <button 
              onClick={() => setIsEditingPace(true)}
              style={{ background: "#FFF", color: "#000", border: "2px solid #000", padding: "4px 8px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontWeight: 900, fontSize: 10, textTransform: "uppercase" }}
            >
              <Edit2 size={12} strokeWidth={3} /> Editar
            </button>
          )}
        </div>

        {isEditingPace ? (
          <div style={{ display: "flex", gap: 10, alignItems: "stretch" }}>
            <div style={{ flex: 1, position: "relative" }}>
              <input 
                type="text" 
                value={paceInput}
                onChange={e => {
                  let val = e.target.value.replace(/\D/g, "");
                  if (val.length > 4) val = val.substring(0, 4);
                  if (val.length > 2) {
                    val = val.substring(0, 2) + ":" + val.substring(2, 4);
                  }
                  setPaceInput(val);
                }}
                placeholder="00:00"
                style={{ 
                  width: "100%", 
                  padding: "16px", 
                  paddingRight: "60px",
                  border: "3px solid #000", 
                  fontSize: 20, 
                  fontWeight: 950, 
                  color: "#000",
                  background: "#FFF",
                  outline: "none"
                }}
              />
              <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 10, fontWeight: 900, color: "#999", textTransform: "uppercase" }}>min/km</span>
            </div>
            <button 
              onClick={handleSavePace}
              disabled={isSaving}
              style={{ 
                background: "var(--nb-yellow)", 
                color: "#000", 
                border: "3px solid #000", 
                width: "60px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                boxShadow: "4px 4px 0px #000",
                active: { transform: "translate(2px, 2px)", boxShadow: "2px 2px 0px #000" }
              } as any}
            >
              {isSaving ? "..." : <Check size={28} strokeWidth={3} />}
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontSize: 32, fontWeight: 950, letterSpacing: "-0.02em" }}>
              {runnerProfile?.running_target_pace || "--:--"}
            </span>
            <span style={{ fontSize: 14, fontWeight: 800, opacity: 0.8, textTransform: "uppercase" }}>min/km</span>
          </div>
        )}
      </div>

      {/* ── STRAVA INTEGRATION (Moved from Inicio) ── */}
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
          <StravaConnectButton onClick={() => setShowAlert(true)} />
        )}
      </div>

    </div>
  );
}

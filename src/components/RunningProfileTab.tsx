"use client";

import React, { useState } from "react";
import { User, Activity, Edit2, Check, Timer } from "lucide-react";
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
  };
  stravaIntegration: any;
  StravaPoweredByLogo: React.ElementType;
  StravaConnectButton: React.ElementType;
  setShowAlert: (v: boolean) => void;
}

export default function RunningProfileTab({
  runnerProfile,
  stravaIntegration,
  StravaPoweredByLogo,
  StravaConnectButton,
  setShowAlert
}: RunningProfileTabProps) {
  // Estado para edição do pace
  const [isEditingPace, setIsEditingPace] = useState(false);
  const defaultPace = runnerProfile?.running_pace?.[0]?.pace || "";
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
      // Formata pace (espera-se MM:SS)
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

      {/* ── PACE SETTINGS ── */}
      <div style={{
        background: "#FFF",
        border: "4px solid #000",
        boxShadow: "6px 6px 0px #000",
        padding: "24px",
        marginBottom: "32px"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Timer size={20} />
            <h2 style={{ fontSize: 16, fontWeight: 950, textTransform: "uppercase", margin: 0 }}>Meu Pace Alvo</h2>
          </div>
          {!isEditingPace && (
            <button 
              onClick={() => setIsEditingPace(true)}
              style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, color: "var(--nb-blue)", fontWeight: 900, fontSize: 10, textTransform: "uppercase" }}
            >
              <Edit2 size={12} strokeWidth={3} /> Editar
            </button>
          )}
        </div>

        {isEditingPace ? (
          <div style={{ display: "flex", gap: 8 }}>
            <input 
              type="text" 
              value={paceInput}
              onChange={e => setPaceInput(e.target.value)}
              placeholder="Ex: 05:30"
              style={{ flex: 1, padding: "12px", border: "3px solid #000", fontSize: 16, fontWeight: 900 }}
            />
            <button 
              onClick={handleSavePace}
              disabled={isSaving}
              style={{ background: "var(--nb-blue)", color: "#FFF", border: "3px solid #000", padding: "0 16px", fontWeight: 950, cursor: "pointer" }}
            >
              {isSaving ? "..." : <Check size={20} />}
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
             {(runnerProfile?.running_pace || []).length > 0 ? (
               runnerProfile!.running_pace!.map((mark, i) => (
                 <div key={i} style={{ background: "#000", color: "#FFF", padding: "8px 16px", fontWeight: 900, fontSize: 14 }}>
                   {mark.distance}KM: {mark.pace}
                 </div>
               ))
             ) : (
               <div style={{ color: "#999", fontWeight: 700, fontSize: 12 }}>Nenhum Pace definido.</div>
             )}
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

"use client";

import React, { useState, useEffect } from "react";
import { Zap, Clock, Weight, Award, User, Target, Trophy, CheckCircle2, Share2, Pencil } from "lucide-react";
import { LEVEL_CONFIG, getLevelInfo, ALL_LEVELS } from "@/lib/constants/levels";
import { ShareActivityModal } from "./ShareActivityModal";
import ResultEntryBlock from "./ResultEntryBlock";

interface ActivityMetric {
  label: string;
  value: string | number;
  unit?: string;
}

interface Achievement {
  id: string;
  type: "seal" | "pr";
  icon: string;
  color: string;
}

/**
 * Props do ActivityFeedCard.
 * @param resultType - Tipo de resultado esperado pelo WOD: "time" | "reps" | "load".
 *                     Herdado de `wods.result_type` via page.tsx.
 *                     Controla qual input é renderizado na seção "Lançar Resultado".
 * @param result     - Resultado salvo no check-in. Se null e status === 'confirmed',
 *                     exibe o input de entrada. Se preenchido, exibe o badge de score.
 * @param status     - SSoT status do check-in: 'checked' | 'confirmed' | 'missed' | etc.
 */
interface ActivityFeedCardProps {
  id: string;
  date: string;
  title: string;
  description: string;
  hashtags?: string[];
  metrics: ActivityMetric[];
  achievements?: Achievement[];
  isExcellence?: boolean;
  points?: number;
  coach?: string;
  result?: string | null;
  resultType?: string;
  typeTag?: string;
  status?: string;
  time?: string;
  performanceLevel?: string | null;
  studentLevel?: string | null;
  rawContent?: string;
  isoDate?: string;
}

// ─── ACTIVITY FEED CARD ──────────────────────────────────────────────────────

const getIcon = (iconName: string) => {
  switch (iconName) {
    case "bolt": return <Zap size={14} strokeWidth={3} />;
    case "timer": return <Clock size={14} strokeWidth={3} />;
    case "monitor_weight": return <Weight size={14} strokeWidth={3} />;
    case "workspace_premium": return <Award size={14} strokeWidth={3} />;
    default: return <Target size={14} strokeWidth={3} />;
  }
};

/**
 * ActivityFeedCard (Neo-Brutalist Light Edition — V2.1)
 * 
 * O "Diário de Bordo" do aluno Coliseu com entrada de resultado integrada.
 * 
 * @change v2.1 — Resultado removido do WodView e migrado para cá. O input é
 *   tipado conforme `result_type` do WOD e só aparece após confirmação do Coach.
 */
export const ActivityFeedCard: React.FC<ActivityFeedCardProps> = ({
  id,
  date,
  title,
  description,
  hashtags = [],
  metrics,
  achievements = [],
  isExcellence = false,
  points,
  coach,
  result,
  resultType,
  typeTag,
  status,
  time,
  performanceLevel,
  studentLevel,
  rawContent,
  isoDate,
}) => {
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [localResult, setLocalResult] = useState<string | null>(result ?? null);
  const [localLevel, setLocalLevel] = useState<string | null>(performanceLevel ?? null);

  // Sync com props do servidor
  React.useEffect(() => {
    setLocalResult(result ?? null);
    setLocalLevel(performanceLevel ?? null);
  }, [result, performanceLevel]);

  // Verificar se o resultado pode ser editado pelo aluno (dentro da janela de 24 horas da data do WOD)
  let isEditable = false;
  if (isoDate) {
    const wodDateObj = new Date(isoDate + "T23:59:59-03:00");
    const diffTime = Date.now() - wodDateObj.getTime();
    const diffHours = diffTime / (1000 * 60 * 60);
    isEditable = diffHours <= 24;
  }

  // Treino confirmado sem resultado registrado = exibe entrada
  const showResultEntry = (status === "confirmed" && !localResult) || isEditing;
  // Resultado existente e treino confirmado = exibe badge se não estiver editando
  const showResultBadge = status === "confirmed" && !!localResult && !isEditing;

  return (
    <div
      id={showResultEntry ? "resultado" : undefined}
      style={{
      background: "#FFF",
      border: "3px solid #000",
      padding: "24px",
      marginBottom: "24px",
      position: "relative",
      boxShadow: isExcellence 
        ? "8px 8px 0px var(--red)" 
        : typeTag === "CORRIDA" 
          ? "6px 6px 0px #3498DB" 
          : "6px 6px 0px #000",
      transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
    }}>

      {/* ── TOP BADGES ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <div style={{ display: "flex", gap: "8px" }}>
          {typeTag && (
            <span style={{
              fontSize: "9px",
              fontWeight: 900,
              color: "#FFF",
              background: typeTag === "CORRIDA" ? "#3498DB" : "#000",
              padding: "4px 8px",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              boxShadow: typeTag === "CORRIDA" ? "2px 2px 0px #000" : "2px 2px 0px var(--red)"
            }}>
              {typeTag}
            </span>
          )}
          {isExcellence && (
            <span style={{
              fontSize: "9px",
              fontWeight: 900,
              color: "#000",
              background: "#FFF",
              border: "2px solid var(--red)",
              padding: "2px 8px",
              letterSpacing: "0.1em",
              textTransform: "uppercase"
            }}>
              RECORDE PESSOAL
            </span>
          )}
        </div>
        <span style={{ fontSize: "10px", fontWeight: 900, color: "#000", opacity: 0.4, letterSpacing: "0.05em" }}>
          {date.toUpperCase()}{time ? ` • ${time}` : ""}
        </span>
      </div>

      {/* ── HEADER ── */}
      <div style={{ marginBottom: "24px" }}>
        <h4 className="font-display" style={{ fontSize: "24px", fontWeight: 950, color: "#000", textTransform: "uppercase", lineHeight: 0.9, marginBottom: "8px" }}>
          {title}
        </h4>
        <p style={{ 
          fontSize: "13px", 
          color: "#000", 
          fontWeight: 500, 
          marginBottom: "16px", 
          lineHeight: "1.4", 
          opacity: 0.8,
          whiteSpace: "pre-wrap" 
        }}>
          {description?.replace(/\\n/g, "\n")}
        </p>

        {/* Score Badge (resultado já salvo) */}
        {showResultBadge && (
          <div style={{
            fontSize: "12px",
            fontWeight: 900,
            color: "#FFF",
            background: "#000",
            padding: "12px 18px",
            border: "2px solid #000",
            boxShadow: "4px 4px 0px var(--red)",
            display: "inline-flex",
            alignItems: "center",
            gap: "10px",
            marginBottom: "16px",
            letterSpacing: "0.1em",
            textTransform: "uppercase"
          }}>
            <Trophy size={16} color="var(--nb-yellow, #FFEF61)" strokeWidth={3} />
            SCORE FINAL: <span style={{ color: typeTag === "CORRIDA" ? "#3498DB" : "var(--nb-red, #E31B23)", marginLeft: "4px", marginRight: "8px" }}>{localResult}</span>
            {localLevel && (
              <span style={{
                 background: localLevel.startsWith("RPE") ? "#000" : getLevelInfo(localLevel).color,
                 color: localLevel.startsWith("RPE") ? "#FFF" : getLevelInfo(localLevel).textColor,
                 fontSize: "9px",
                 padding: "2px 6px",
                 border: localLevel.startsWith("RPE") ? "1px solid #3498DB" : "none",
                 boxShadow: "2px 2px 0px rgba(255,255,255,0.2)"
              }}>
                {localLevel.startsWith("RPE") ? localLevel : getLevelInfo(localLevel).label}
              </span>
            )}
            
            <button
              onClick={() => setIsShareModalOpen(true)}
              style={{
                background: "#FFF",
                border: "2px solid #000",
                color: "#000",
                marginLeft: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                padding: "6px",
                boxShadow: "2px 2px 0px var(--red)",
                transition: "transform 0.1s"
              }}
              title="Compartilhar resultado"
            >
              <Share2 size={16} strokeWidth={2.5} />
            </button>

            {isEditable && (
              <button
                onClick={() => setIsEditing(true)}
                style={{
                  background: "#FFF",
                  border: "2px solid #000",
                  color: "#000",
                  marginLeft: "4px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  padding: "6px",
                  boxShadow: "2px 2px 0px var(--red)",
                  transition: "transform 0.1s"
                }}
                title="Editar resultado"
              >
                <Pencil size={16} strokeWidth={2.5} />
              </button>
            )}
          </div>
        )}

        {/* Input tipado (só para confirmados sem resultado ou em edição) */}
        {showResultEntry && (
          <ResultEntryBlock 
            checkInId={id} 
            resultType={resultType || "reps"} 
            defaultLevel={localLevel || studentLevel} 
            initialResult={localResult}
            onCancel={isEditing ? () => setIsEditing(false) : undefined}
            onSaveSuccess={(newRes, newLvl) => {
              setLocalResult(newRes);
              setLocalLevel(newLvl);
              setIsEditing(false);
            }}
          />
        )}

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "12px" }}>
          {hashtags.map((tag, i) => (
            <span key={i} style={{ fontSize: "10px", fontWeight: 900, color: "var(--red)", textTransform: "uppercase" }}>
              {tag.startsWith("#") ? tag : `#${tag}`}
            </span>
          ))}
        </div>
      </div>

      {/* ── METRICS GRID ── */}
      {metrics && metrics.length > 0 && (
        <div style={{
          display: "grid",
          gridTemplateColumns: `repeat(${metrics.length}, 1fr)`,
          gap: "16px",
          marginBottom: (achievements.length > 0 || coach || points) ? "24px" : "0",
          paddingTop: "20px",
          borderTop: "2px solid #F0F0F0"
        }}>
          {metrics.map((metric, i) => (
            <div key={i} style={{ textAlign: "left" }}>
              <div className="font-display" style={{ fontSize: "24px", fontWeight: 900, color: "#000", lineHeight: 1 }}>
                {metric.value}<span style={{ fontSize: "12px", fontWeight: 900, opacity: 0.4, marginLeft: "4px" }}>{metric.unit}</span>
              </div>
              <div style={{ fontSize: "9px", fontWeight: 900, color: "#000", textTransform: "uppercase", letterSpacing: "0.1em", marginTop: "4px", opacity: 0.5 }}>
                {metric.label}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── FOOTER ── */}
      {(achievements.length > 0 || coach || points) && (
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          paddingTop: "20px",
          borderTop: "2px solid #F0F0F0"
        }}>
          <div style={{ display: "flex", gap: "12px" }}>
            {achievements.map((ach) => (
              <div key={ach.id} style={{
                width: "32px",
                height: "32px",
                background: ach.color === "volt" ? "#000" : "var(--red)",
                border: "2px solid #000",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "2px 2px 0px #000"
              }}>
                <div style={{ color: ach.color === "volt" ? "var(--red)" : "#FFF" }}>
                  {getIcon(ach.icon)}
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
            {coach && (
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <User size={14} color="#000" strokeWidth={3} />
                <span style={{ fontSize: "10px", fontWeight: 900, color: "#000", textTransform: "uppercase" }}>COACH {coach}</span>
              </div>
            )}
            {points !== undefined && points > 0 && (
              <div style={{
                background: typeTag === "CORRIDA" ? "#3498DB" : "var(--red)",
                padding: "2px 10px",
                border: "2px solid #000",
                display: "flex",
                alignItems: "center",
                gap: "4px"
              }}>
                <span style={{ fontSize: "12px", fontWeight: 950, color: "#FFF" }}>+{points}</span>
                <span style={{ fontSize: "8px", fontWeight: 900, color: "#FFF" }}>PTS</span>
              </div>
            )}
          </div>
        </div>
      )}

      {isShareModalOpen && (
        <ShareActivityModal
          onClose={() => setIsShareModalOpen(false)}
          title={title}
          dateStr={date}
          wodContent={rawContent || description}
          result={localResult || null}
          levelInfo={getLevelInfo(localLevel || studentLevel || "iniciante")}
        />
      )}
    </div>
  );
};

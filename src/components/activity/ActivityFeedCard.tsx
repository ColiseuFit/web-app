"use client";

import React, { useState } from "react";
import { Zap, Clock, Weight, Award, User, Target, Trophy, CheckCircle2 } from "lucide-react";
import { updateWodResult } from "@/app/(student)/actions";
import { LEVEL_CONFIG, getLevelInfo, ALL_LEVELS } from "@/lib/constants/levels";

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
}

// ─── TYPED RESULT INPUT ──────────────────────────────────────────────────────

/**
 * ResultEntryBlock: Bloco de entrada de resultados tipado conforme `result_type` do WOD.
 * 
 * @logic
 * - Só renderiza quando `status === 'confirmed'` e nenhum resultado foi salvo ainda.
 * - Estados Otimistas: o resultado é exibido imediatamente no badge local antes
 *   da confirmação do banco de dados (useState `savedResult`).
 * - "time": placeholder MM:SS, validação de regex antes de salvar.
 * - "reps": input numérico, unidade em REP.
 * - "load": input numérico, unidade em KG.
 * 
 * @security
 *   A Server Action `updateWodResult` valida via Zod e RLS garante que o aluno
 *   só atualize seu próprio check-in (`student_id = auth.uid()`).
 * 
 * @param checkInId  - UUID do registro de check-in a ser atualizado.
 * @param resultType - Tipo de resultado ("time" | "reps" | "load").
 */
function ResultEntryBlock({ 
  checkInId, 
  resultType, 
  defaultLevel 
}: { 
  checkInId: string; 
  resultType: string; 
  defaultLevel?: string | null 
}) {
  // Estados para inputs separados de tempo
  const [min, setMin] = useState("");
  const [sec, setSec] = useState("");
  
  // Estado para reps/carga
  const [numericValue, setNumericValue] = useState("");

  // Estado para Nível de Performance (Coliseu Levels)
  const [selectedLevel, setSelectedLevel] = useState<string>(defaultLevel || "iniciante");
  
  const [saving, setSaving] = useState(false);
  const [savedResult, setSavedResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setError(null);
    let finalValueRes = "";
    let displayValue = "";

    if (resultType === "time") {
      if (!min.trim() || !sec.trim()) {
        setError("Preencha minutos e segundos.");
        return;
      }
      const m = parseInt(min);
      const s = parseInt(sec);
      if (isNaN(m) || isNaN(s)) {
        setError("Digite apenas números.");
        return;
      }
      if (s >= 60) {
        setError("Segundos devem ser < 60.");
        return;
      }
      // Formata como MM:SS
      const formattedM = min.padStart(2, "0");
      const formattedS = sec.padStart(2, "0");
      finalValueRes = `${formattedM}:${formattedS}`;
      displayValue = `${finalValueRes} MIN`;
    } else {
      if (!numericValue.trim()) {
        setError("Digite um valor válido.");
        return;
      }
      if (resultType !== "rounds" && isNaN(Number(numericValue))) {
        setError("Digite apenas números.");
        return;
      }
      finalValueRes = numericValue.trim();
      const unitMap: Record<string, string> = { load: "KG", rounds: "RDS", reps: "REP" };
      displayValue = `${finalValueRes} ${unitMap[resultType] ?? "REP"}`;
    }

    setSaving(true);
    setSavedResult(displayValue);

    const res = await updateWodResult(checkInId, finalValueRes, selectedLevel);
    setSaving(false);
    if (!res.success) {
      setSavedResult(null);
      setError("Erro ao salvar. Tente novamente.");
    }
  };

  if (savedResult) {
    return (
      <div style={{
        marginTop: "20px",
        padding: "20px",
        background: "#000",
        border: "2px solid #000",
        boxShadow: "4px 4px 0px var(--nb-red, #E31B23)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        animation: "slideInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        position: "relative",
        overflow: "hidden"
      }}>
        {/* Subtle victory glow */}
        <div style={{
          position: "absolute",
          top: "-50%",
          left: "-20%",
          width: "100%",
          height: "200%",
          background: "radial-gradient(circle, rgba(227,27,35,0.15) 0%, transparent 70%)",
          zIndex: 0
        }} />

        <div style={{ display: "flex", alignItems: "center", gap: "12px", zIndex: 1 }}>
          <div style={{
            width: "40px",
            height: "40px",
            borderRadius: "50%",
            background: "var(--nb-red, #E31B23)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "2px solid #FFF",
            boxShadow: "0 0 15px rgba(227,27,35,0.4)"
          }}>
            <CheckCircle2 size={24} color="#FFF" strokeWidth={3} />
          </div>
          <div>
            <div style={{ fontSize: "9px", fontWeight: 900, color: "rgba(255,255,255,0.6)", letterSpacing: "0.15em", textTransform: "uppercase" }}>MISSÃO CUMPRIDA</div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
               <div style={{ fontSize: "18px", fontWeight: 950, color: "#FFF", letterSpacing: "-0.02em" }}>{savedResult}</div>
               <span style={{
                 background: getLevelInfo(selectedLevel).color,
                 color: getLevelInfo(selectedLevel).textColor,
                 fontSize: "9px",
                 fontWeight: 900,
                 padding: "2px 6px",
                 textTransform: "uppercase",
                 boxShadow: "2px 2px 0px rgba(255,255,255,0.2)"
               }}>
                 {getLevelInfo(selectedLevel).label}
               </span>
            </div>
          </div>
        </div>

        <Trophy size={32} color="rgba(255,255,255,0.1)" strokeWidth={2} style={{ zIndex: 1 }} />
      </div>
    );
  }

  return (
    <div style={{
      marginTop: "20px",
      padding: "20px",
      background: "var(--nb-yellow, #FFEF61)",
      border: "3px solid #000",
      boxShadow: "6px 6px 0px #000",
      position: "relative",
      animation: "entranceUp 0.5s ease-out"
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
        <div style={{
          background: "#000",
          width: "24px",
          height: "24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}>
          <Trophy size={14} color="var(--nb-yellow, #FFEF61)" strokeWidth={3} />
        </div>
        <span style={{ fontSize: "11px", fontWeight: 950, letterSpacing: "0.1em", textTransform: "uppercase", color: "#000" }}>
          NÍVEL DE EXECUÇÃO
        </span>
      </div>

      {/* Nível Selector */}
      <div style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "8px",
        paddingBottom: "12px",
        marginBottom: "16px",
      }}>
        {ALL_LEVELS.map((level) => {
          const isSelected = selectedLevel === level.key;
          return (
            <button
              key={level.key}
              type="button"
              onClick={() => setSelectedLevel(level.key)}
              style={{
                flexShrink: 0,
                padding: "8px 12px",
                background: isSelected ? level.color : "#FFF",
                color: isSelected ? level.btnTextColor : "#000",
                border: "2px solid #000",
                fontSize: "10px",
                fontWeight: 900,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                cursor: "pointer",
                boxShadow: isSelected ? "2px 2px 0px #000" : "3px 3px 0px #000",
                transform: isSelected ? "translate(1px, 1px)" : "none",
                transition: "all 0.1s ease"
              }}
            >
              {level.label}
            </button>
          );
        })}
      </div>

      <div style={{ fontSize: "9px", fontWeight: 900, color: "rgba(0,0,0,0.5)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        RESULTADO DO WOD ({selectedLevel.toUpperCase()})
      </div>

      <div style={{ display: "flex", gap: "10px", alignItems: "flex-end" }}>
        {resultType === "time" ? (
          <div style={{ display: "flex", gap: "10px", flex: 1, alignItems: "center" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "9px", fontWeight: 900, color: "rgba(0,0,0,0.5)", marginBottom: "6px", textAlign: "center" }}>MINUTOS</div>
              <input
                type="tel"
                placeholder="00"
                value={min}
                onChange={(e) => { setMin(e.target.value.replace(/\D/g, "").slice(0, 2)); setError(null); }}
                style={{
                  width: "100%",
                  padding: "14px",
                  border: "2px solid #000",
                  fontSize: "22px",
                  fontWeight: 950,
                  textAlign: "center",
                  background: "#FFF",
                  outline: "none",
                  boxShadow: "inset 4px 4px 0px rgba(0,0,0,0.05)"
                }}
              />
            </div>
            <span style={{ fontSize: "24px", fontWeight: 950, paddingTop: "20px", color: "#000" }}>:</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "9px", fontWeight: 900, color: "rgba(0,0,0,0.5)", marginBottom: "6px", textAlign: "center" }}>SEGUNDOS</div>
              <input
                type="tel"
                placeholder="00"
                value={sec}
                onChange={(e) => { setSec(e.target.value.replace(/\D/g, "").slice(0, 2)); setError(null); }}
                style={{
                  width: "100%",
                  padding: "14px",
                  border: "2px solid #000",
                  fontSize: "22px",
                  fontWeight: 950,
                  textAlign: "center",
                  background: "#FFF",
                  outline: "none",
                  boxShadow: "inset 4px 4px 0px rgba(0,0,0,0.05)"
                }}
              />
            </div>
          </div>
        ) : (
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "9px", fontWeight: 900, color: "rgba(0,0,0,0.5)", marginBottom: "6px" }}>
              {resultType === "load" ? "CARGA MÁXIMA (KG)" : resultType === "rounds" ? "ROUNDS + REPS" : "TOTAL DE REPETIÇÕES"}
            </div>
            <input
              type={resultType === "rounds" ? "text" : "tel"}
              placeholder={resultType === "rounds" ? "Ex: 5+12" : "0"}
              value={numericValue}
              onChange={(e) => { 
                const val = e.target.value;
                setNumericValue(resultType === "rounds" ? val.replace(/[^\d+]/g, "") : val.replace(/\D/g, "")); 
                setError(null); 
              }}
              style={{
                width: "100%",
                padding: "14px",
                border: "2px solid #000",
                fontSize: "22px",
                fontWeight: 950,
                background: "#FFF",
                outline: "none",
                boxShadow: "inset 4px 4px 0px rgba(0,0,0,0.05)"
              }}
            />
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            height: "58px",
            padding: "0 28px",
            background: "#000",
            color: "#FFF",
            border: "none",
            fontWeight: 950,
            fontSize: "12px",
            letterSpacing: "0.15em",
            cursor: saving ? "not-allowed" : "pointer",
            transition: "all 0.1s ease",
            boxShadow: "4px 4px 0px rgba(0,0,0,0.2)",
            position: "relative",
            overflow: "hidden"
          }}
          onMouseDown={(e) => { if(!saving) e.currentTarget.style.transform = "translate(2px, 2px)"; }}
          onMouseUp={(e) => { if(!saving) e.currentTarget.style.transform = "translate(0, 0)"; }}
        >
          {saving ? (
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div className="nb-spinner" />
              <span>SALVANDO</span>
            </div>
          ) : "SALVAR"}
        </button>
      </div>

      {error && (
        <div style={{ 
          marginTop: "12px", 
          padding: "8px 12px", 
          background: "rgba(227,27,35,0.1)", 
          borderLeft: "4px solid var(--nb-red, #E31B23)",
          fontSize: "10px", 
          fontWeight: 800, 
          color: "var(--nb-red, #E31B23)",
          textTransform: "uppercase"
        }}>
          {error}
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .nb-spinner {
          width: 14px;
          height: 14px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #FFF;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}} />
    </div>
  );
}

// ─── ACTIVITY FEED CARD ──────────────────────────────────────────────────────

/**
 * ActivityFeedCard (Neo-Brutalist Light Edition — V2.1)
 * 
 * O "Diário de Bordo" do atleta Coliseu com entrada de resultado integrada.
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
}) => {

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case "bolt": return <Zap size={14} strokeWidth={3} />;
      case "timer": return <Clock size={14} strokeWidth={3} />;
      case "monitor_weight": return <Weight size={14} strokeWidth={3} />;
      case "workspace_premium": return <Award size={14} strokeWidth={3} />;
      default: return <Target size={14} strokeWidth={3} />;
    }
  };

  // Treino confirmado sem resultado registrado = exibe entrada
  const showResultEntry = status === "confirmed" && !result;
  // Resultado existente e treino confirmado = exibe badge
  const showResultBadge = status === "confirmed" && !!result;

  return (
    <div style={{
      background: "#FFF",
      border: "3px solid #000",
      padding: "24px",
      marginBottom: "24px",
      position: "relative",
      boxShadow: isExcellence ? "8px 8px 0px var(--red)" : "6px 6px 0px #000",
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
              background: "#000",
              padding: "4px 8px",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              boxShadow: "2px 2px 0px var(--red)"
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
            SCORE FINAL: <span style={{ color: "var(--nb-red, #E31B23)", marginLeft: "4px", marginRight: "8px" }}>{result}</span>
            <span style={{
               background: getLevelInfo(performanceLevel).color,
               color: getLevelInfo(performanceLevel).textColor,
               fontSize: "9px",
               padding: "2px 6px",
               boxShadow: "2px 2px 0px rgba(255,255,255,0.2)"
            }}>
              {getLevelInfo(performanceLevel).label}
            </span>
          </div>
        )}

        {/* Input tipado (só para confirmados sem resultado) */}
        {showResultEntry && (
          <ResultEntryBlock 
            checkInId={id} 
            resultType={resultType || "reps"} 
            defaultLevel={studentLevel} 
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
                background: "var(--red)",
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
    </div>
  );
};

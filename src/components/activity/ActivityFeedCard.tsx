"use client";

import React, { useState } from "react";
import { Zap, Clock, Weight, Award, User, Target, Trophy, CheckCircle2, Share2 } from "lucide-react";
import { updateWodResult } from "@/app/(student)/actions";
import { LEVEL_CONFIG, getLevelInfo, ALL_LEVELS } from "@/lib/constants/levels";
import { ShareActivityModal } from "./ShareActivityModal";

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
}

// ─── TYPED RESULT INPUT ──────────────────────────────────────────────────────

/**
 * ResultEntryBlock: Bloco de entrada de resultados tipado conforme `result_type` do WOD.
 * 
 * @logic
 * - Só renderiza quando `status === 'confirmed'` e nenhum resultado foi salvo ainda.
 * - Estados Otimistas: o resultado é exibido imediatamente no badge local antes
 *   da confirmação do banco de dados (useState `savedResult`).
 * - **Single vs Multi-Result**: Se `resultType` contém múltiplos tipos (ex: "time,rounds"),
 *   exibe todos empilhados como opcionais. A action `handleSave` exige "ao menos um" válido.
 * 
 * @security & @validation
 * - Zod Validation: Server Action `updateWodResult` valida os payloads.
 * - RLS: Garante que o aluno só atualize seu próprio check-in (`student_id = auth.uid()`).
 * - Zero-Garbage Policy: Inputs numéricos (`type="text" inputMode="numeric"`) sanitizados em
 *   tempo real (stripping de letras/símbolos) e text-inputs bloqueiam caracteres perigosos.
 * 
 * @param checkInId  - UUID do registro de check-in a ser atualizado.
 * @param resultType - Tipo(s) de resultado (ex: "time" ou "time,rounds,reps").
 * @param defaultLevel - Nível de performance pre-selecionado (ex: "iniciante").
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
  
  // Estado para outros tipos
  const [resultsMap, setResultsMap] = useState<Record<string, string>>({});

  // Parse dos tipos permitidos (compatibilidade com legado string única)
  const resultTypes = (resultType || "text").split(",").map(t => t.trim()).filter(Boolean);

  // Estado para Nível de Performance (Coliseu Levels)
  const [selectedLevel, setSelectedLevel] = useState<string>(defaultLevel || "iniciante");
  
  const [saving, setSaving] = useState(false);
  const [savedResult, setSavedResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * handleSave — Persiste o resultado do WOD no banco.
   *
   * @logic
   * - Se o WOD tem UM tipo de resultado: campo é obrigatório.
   * - Se o WOD tem MÚLTIPLOS tipos (ex: "time,rounds,reps"): cada campo
   *   é opcional, mas ao menos UM deve ser preenchido.
   *   Isso reflete a semântica CrossFit: "For Time" com time cap → aluno
   *   registra tempo SE completou, ou rounds+reps SE foi cappado.
   *
   * @validation
   * - time: minutos 0-99, segundos 0-59, ambos devem ser preenchidos se um deles for
   * - numéricos (reps, rounds, load, etc.): somente dígitos, valor positivo, max 99999
   * - text: sanitizado contra injection, max 50 caracteres
   */
  const handleSave = async () => {
    setError(null);
    const partsRes: string[] = [];
    const partsDisplay: string[] = [];
    const isMulti = resultTypes.length > 1;

    const unitMap: Record<string, string> = {
      load: "KG", rounds: "RDS", reps: "REP",
      distance: "M", calories: "CAL", points: "PTS", text: ""
    };

    for (const rt of resultTypes) {
      if (rt === "time") {
        const hasMin = min.trim().length > 0;
        const hasSec = sec.trim().length > 0;

        // Se preencheu parcialmente (só min ou só sec), exigir ambos
        if (hasMin !== hasSec) {
          setError("Preencha minutos e segundos completos.");
          return;
        }

        // Se não preencheu nenhum: obrigatório em single, ignora em multi
        if (!hasMin && !hasSec) {
          if (!isMulti) { setError("Preencha minutos e segundos."); return; }
          continue;
        }

        const m = parseInt(min);
        const s = parseInt(sec);
        if (isNaN(m) || m < 0 || m > 99) {
          setError("Minutos inválidos (0-99).");
          return;
        }
        if (isNaN(s) || s < 0 || s >= 60) {
          setError("Segundos inválidos (0-59).");
          return;
        }
        const fmt = `${min.padStart(2, "0")}:${sec.padStart(2, "0")}`;
        partsRes.push(fmt);
        partsDisplay.push(`${fmt} MIN`);
      } else {
        const val = resultsMap[rt] || "";

        // Se não preencheu: obrigatório em single, ignora em multi
        if (!val.trim()) {
          if (!isMulti) { setError("Preencha o campo de resultado."); return; }
          continue;
        }

        if (rt === "text") {
          // Text: sanitizado, max 50 chars
          const sanitized = val.trim().slice(0, 50);
          if (sanitized.length === 0) continue;
          partsRes.push(sanitized);
          partsDisplay.push(sanitized);
        } else {
          // Numéricos: deve ser inteiro válido e positivo
          const numVal = Number(val);
          if (isNaN(numVal) || numVal < 0) {
            setError("Digite apenas números válidos e positivos.");
            return;
          }
          if (numVal > 99999) {
            setError("Valor muito alto. Verifique o preenchimento.");
            return;
          }
          partsRes.push(val.trim());
          const u = unitMap[rt];
          partsDisplay.push(u ? `${val.trim()} ${u}` : val.trim());
        }
      }
    }

    // Gate final: ao menos UM campo preenchido
    if (partsRes.length === 0) {
      setError(isMulti
        ? "Preencha ao menos um campo de resultado."
        : "Preencha o campo de resultado.");
      return;
    }

    const finalValueRes = partsRes.join(" | ");
    const displayValue = partsDisplay.join(" | ");

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
            <div style={{ fontSize: "9px", fontWeight: 900, color: "rgba(255,255,255,0.6)", letterSpacing: "0.15em", textTransform: "uppercase" }}>TREINO CONCLUÍDO</div>
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

      {/* Instrução contextual: muda conforme quantidade de tipos */}
      <div style={{ fontSize: "9px", fontWeight: 900, color: "rgba(0,0,0,0.5)", marginBottom: resultTypes.length > 1 ? "4px" : "8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {resultTypes.length > 1
          ? "PREENCHA O QUE SE APLICA AO SEU RESULTADO"
          : `RESULTADO DO WOD (${selectedLevel.toUpperCase()})`
        }
      </div>
      {resultTypes.length > 1 && (
        <div style={{ fontSize: "8px", fontWeight: 700, color: "rgba(0,0,0,0.35)", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Completou o treino? Preencha só o tempo. Não completou? Preencha rounds e repetições.
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {resultTypes.map((rt) => {
          const isMulti = resultTypes.length > 1;
          if (rt === "time") {
            return (
              <div key={rt}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                  <span style={{ fontSize: "9px", fontWeight: 900, color: "rgba(0,0,0,0.5)", textTransform: "uppercase" }}>TEMPO</span>
                  {isMulti && <span style={{ fontSize: "7px", fontWeight: 800, color: "rgba(0,0,0,0.25)", border: "1px solid rgba(0,0,0,0.15)", padding: "1px 5px", letterSpacing: "0.05em" }}>OPCIONAL</span>}
                </div>
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "8px", fontWeight: 900, color: "rgba(0,0,0,0.35)", marginBottom: "4px", textAlign: "center" }}>MINUTOS</div>
                    <input
                      type="tel"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder="00"
                      maxLength={2}
                      value={min}
                      onChange={(e) => { setMin(e.target.value.replace(/\D/g, "").slice(0, 2)); setError(null); }}
                      style={{
                        width: "100%", padding: "14px", border: "2px solid #000",
                        fontSize: "22px", fontWeight: 950, textAlign: "center",
                        background: "#FFF", outline: "none", boxShadow: "inset 4px 4px 0px rgba(0,0,0,0.05)"
                      }}
                    />
                  </div>
                  <span style={{ fontSize: "24px", fontWeight: 950, paddingTop: "20px", color: "#000" }}>:</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "8px", fontWeight: 900, color: "rgba(0,0,0,0.35)", marginBottom: "4px", textAlign: "center" }}>SEGUNDOS</div>
                    <input
                      type="tel"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder="00"
                      maxLength={2}
                      value={sec}
                      onChange={(e) => { setSec(e.target.value.replace(/\D/g, "").slice(0, 2)); setError(null); }}
                      style={{
                        width: "100%", padding: "14px", border: "2px solid #000",
                        fontSize: "22px", fontWeight: 950, textAlign: "center",
                        background: "#FFF", outline: "none", boxShadow: "inset 4px 4px 0px rgba(0,0,0,0.05)"
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          } else {
             const labels: Record<string, string> = {
                load: "CARGA (KG)", rounds: "ROUNDS", text: "OBSERVAÇÃO",
                distance: "DISTÂNCIA (M)", calories: "CALORIAS", points: "PONTOS", reps: "REPETIÇÕES"
             };
             const placeholders: Record<string, string> = {
                load: "Ex: 60", rounds: "Ex: 5", text: "Ex: Completado",
                distance: "Ex: 400", calories: "Ex: 30", points: "Ex: 100", reps: "Ex: 50"
             };
             /** Limites de caracteres por tipo para prevenir input absurdo */
             const maxLens: Record<string, number> = {
                load: 4, rounds: 4, text: 50,
                distance: 6, calories: 5, points: 5, reps: 5
             };
             return (
               <div key={rt}>
                 <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
                   <span style={{ fontSize: "9px", fontWeight: 900, color: "rgba(0,0,0,0.5)", textTransform: "uppercase" }}>
                     {labels[rt] || "VALOR"}
                   </span>
                   {isMulti && <span style={{ fontSize: "7px", fontWeight: 800, color: "rgba(0,0,0,0.25)", border: "1px solid rgba(0,0,0,0.15)", padding: "1px 5px", letterSpacing: "0.05em" }}>OPCIONAL</span>}
                 </div>
                 <input
                   type={rt === "text" ? "text" : "tel"}
                   inputMode={rt === "text" ? "text" : "numeric"}
                   pattern={rt === "text" ? undefined : "[0-9]*"}
                   placeholder={placeholders[rt] || "0"}
                   maxLength={maxLens[rt] || 6}
                   value={resultsMap[rt] || ""}
                   onChange={(e) => {
                     const val = e.target.value;
                     let formatted: string;
                     if (rt === "text") {
                       // Text: alfanuméricos + espaços + pontuação básica. Strip chars perigosos.
                       formatted = val.replace(/[<>{}|\\^`~]/g, "").slice(0, 50);
                     } else {
                       // Numéricos: somente dígitos, zero tolerância a letras/símbolos
                       formatted = val.replace(/\D/g, "").slice(0, maxLens[rt] || 6);
                     }
                     setResultsMap(prev => ({ ...prev, [rt]: formatted }));
                     setError(null);
                   }}
                   style={{
                     width: "100%", padding: "14px", border: "2px solid #000",
                     fontSize: "22px", fontWeight: 950, background: "#FFF", outline: "none",
                     boxShadow: "inset 4px 4px 0px rgba(0,0,0,0.05)"
                   }}
                 />
               </div>
             );
          }
        })}

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
}) => {
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

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
            SCORE FINAL: <span style={{ color: typeTag === "CORRIDA" ? "#3498DB" : "var(--nb-red, #E31B23)", marginLeft: "4px", marginRight: "8px" }}>{result}</span>
            {performanceLevel && (
              <span style={{
                 background: performanceLevel.startsWith("RPE") ? "#000" : getLevelInfo(performanceLevel).color,
                 color: performanceLevel.startsWith("RPE") ? "#FFF" : getLevelInfo(performanceLevel).textColor,
                 fontSize: "9px",
                 padding: "2px 6px",
                 border: performanceLevel.startsWith("RPE") ? "1px solid #3498DB" : "none",
                 boxShadow: "2px 2px 0px rgba(255,255,255,0.2)"
              }}>
                {performanceLevel.startsWith("RPE") ? performanceLevel : getLevelInfo(performanceLevel).label}
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
          result={result || null}
          levelInfo={getLevelInfo(performanceLevel || studentLevel || "iniciante")}
        />
      )}
    </div>
  );
};

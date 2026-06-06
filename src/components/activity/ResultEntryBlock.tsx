"use client";

import React, { useState, useEffect } from "react";
import { Trophy, CheckCircle2 } from "lucide-react";
import { updateWodResult } from "@/app/(student)/actions";
import { getLevelInfo, ALL_LEVELS } from "@/lib/constants/levels";

/**
 * Props do componente ResultEntryBlock.
 */
interface ResultEntryBlockProps {
  /** UUID único do check-in a ser atualizado no banco de dados. */
  checkInId: string;
  /** Tipo ou lista de tipos de resultado (ex: "time", "load", "reps", "time,reps"). */
  resultType: string;
  /** Nível de performance padrão pré-selecionado (geralmente o nível atual do aluno). */
  defaultLevel?: string | null;
  /** Resultado inicial pré-existente (usado para popular os inputs em modo de edição). */
  initialResult?: string | null;
  /** Callback opcional acionado quando o usuário cancela a edição do formulário. */
  onCancel?: () => void;
  /** Callback acionado após o salvamento bem-sucedido na API do servidor. */
  onSaveSuccess?: (newResult: string, newLevel: string) => void;
}

/**
 * ResultEntryBlock - Formulário de entrada de score e proficiência do WOD.
 * 
 * @architecture
 * - Padrão Iron Monolith (Neo-Brutalist): Visual de alto contraste com feedback tátil.
 * - Input Masking: Higienização de strings em tempo real (regex no client-side).
 * - Estado de Dupla Confirmação: Solicita segunda confirmação antes de disparar a Server Action.
 * 
 * @security
 * - RLS Enforced: Apenas o próprio aluno associado ao check_in_id pode salvar.
 * - Sanitização: Limpeza de tags HTML e caracteres reservados contra XSS no input de texto.
 */
export default function ResultEntryBlock({ 
  checkInId, 
  resultType, 
  defaultLevel,
  initialResult,
  onCancel,
  onSaveSuccess
}: ResultEntryBlockProps) {
  // Estados para controle de minutos e segundos no tipo 'time'
  const [min, setMin] = useState("");
  const [sec, setSec] = useState("");
  
  // Estado para armazenar valores de tipos arbitrários (ex: reps, load)
  const [resultsMap, setResultsMap] = useState<Record<string, string>>({});

  // Separa os tipos de resultado caso o WOD requeira múltiplos (ex: "time,rounds")
  const resultTypes = (resultType || "text").split(",").map(t => t.trim()).filter(Boolean);

  // Nível Coliseu selecionado pelo aluno
  const [selectedLevel, setSelectedLevel] = useState<string>(defaultLevel || "iniciante");
  
  const [saving, setSaving] = useState(false);
  const [savedResult, setSavedResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  // Popula previamente os campos ao entrar em modo de edição de um score existente
  useEffect(() => {
    if (!initialResult) return;

    const parts = initialResult.split("|").map(p => p.trim());
    const newResultsMap: Record<string, string> = {};

    parts.forEach((partVal) => {
      // Tenta achar o padrão prefixo:valor (ex: "time:15:30" ou "reps:120")
      const match = partVal.match(/^([a-z]+):(.+)$/i);
      
      if (match) {
        const [, prefix, value] = match;
        const rt = prefix.toLowerCase();
        
        if (rt === "time") {
          const cleanTime = value.split(" ")[0]; // "15:30"
          const [m, s] = cleanTime.split(":");
          setMin(m || "");
          setSec(s || "");
        } else if (rt === "text") {
          newResultsMap[rt] = value;
        } else {
          // Extrai parte numérica para reps, load, distance, etc.
          const cleanVal = value.replace(/[^\d]/g, "");
          newResultsMap[rt] = cleanVal || value;
        }
      } else {
        // Fallback para leitura legado (sem prefixo) pareando pelo índice caso o array antigo exista
        // Isso tenta preencher dados muito antigos que não tenham o novo padrão
        resultTypes.forEach((rt, idx) => {
           const legacyVal = parts[idx] || "";
           if (rt === "time" && legacyVal.includes(":")) {
             const cleanTime = legacyVal.split(" ")[0];
             const [m, s] = cleanTime.split(":");
             setMin(m || "");
             setSec(s || "");
           } else if (rt !== "time" && legacyVal) {
             const cleanVal = legacyVal.replace(/[^\d]/g, "");
             if (cleanVal) newResultsMap[rt] = cleanVal;
           }
        });
      }
    });

    setResultsMap(newResultsMap);
  }, [initialResult, resultType]);

  /**
   * Valida os dados e salva o resultado no banco.
   * 
   * @logic
   * - Para WODs de métrica única: o preenchimento do campo é obrigatório.
   * - Para WODs multi-métrica: pelo menos um campo deve ser preenchido (cenários time cap).
   * - Conversões de tempo exigem range de segundos entre 00 e 59.
   * - Campos numéricos são sanitizados e limitados a 99999 para evitar estouro de range.
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

        if (hasMin !== hasSec) {
          setError("Preencha minutos e segundos completos.");
          setIsConfirming(false);
          return;
        }

        if (!hasMin && !hasSec) {
          if (!isMulti) { 
            setError("Preencha minutos e segundos."); 
            setIsConfirming(false); 
            return; 
          }
          continue;
        }

        const m = parseInt(min);
        const s = parseInt(sec);
        if (isNaN(m) || m < 0 || m > 99) {
          setError("Minutos inválidos (0-99).");
          setIsConfirming(false);
          return;
        }
        if (isNaN(s) || s < 0 || s >= 60) {
          setError("Segundos inválidos (0-59).");
          setIsConfirming(false);
          return;
        }
        const fmt = `${min.padStart(2, "0")}:${sec.padStart(2, "0")}`;
        partsRes.push(`time:${fmt}`);
        partsDisplay.push(`${fmt} MIN`);
      } else {
        const val = resultsMap[rt] || "";

        if (!val.trim()) {
          if (!isMulti) { 
            setError("Preencha o campo de resultado."); 
            setIsConfirming(false); 
            return; 
          }
          continue;
        }

        if (rt === "text") {
          // Sanitização estrita contra injeção e truncamento em 50 caracteres
          const sanitized = val.trim().slice(0, 50);
          if (sanitized.length === 0) continue;
          partsRes.push(sanitized);
          partsDisplay.push(sanitized);
        } else {
          const numVal = Number(val);
          if (isNaN(numVal) || numVal < 0) {
            setError("Digite apenas números válidos e positivos.");
            setIsConfirming(false);
            return;
          }
          if (numVal > 99999) {
            setError("Valor muito alto. Verifique o preenchimento.");
            setIsConfirming(false);
            return;
          }
          partsRes.push(`${rt}:${val.trim()}`);
          const u = unitMap[rt];
          partsDisplay.push(u ? `${val.trim()} ${u}` : val.trim());
        }
      }
    }

    if (partsRes.length === 0) {
      setError(isMulti
        ? "Preencha ao menos um campo de resultado."
        : "Preencha o campo de resultado.");
      setIsConfirming(false);
      return;
    }

    const finalValueRes = partsRes.join(" | ");
    const displayValue = partsDisplay.join(" | ");

    setSaving(true);
    setSavedResult(displayValue);

    try {
      const res = await updateWodResult(checkInId, finalValueRes, selectedLevel);
      setSaving(false);
      if (!res.success) {
        setSavedResult(null);
        setIsConfirming(false);
        setError(res.error || "Erro ao salvar. Tente novamente.");
      } else {
        if (onSaveSuccess) {
          onSaveSuccess(displayValue, selectedLevel);
        }
      }
    } catch (e: any) {
      setSaving(false);
      setSavedResult(null);
      setIsConfirming(false);
      setError("Erro de conexão com o servidor. Tente novamente.");
      console.error("Erro ao atualizar resultado do WOD:", e);
    }
  };

  /**
   * Gerencia a transição de estado da dupla confirmação ou dispara a persistência.
   */
  const handleButtonClick = () => {
    if (isConfirming) {
      handleSave();
    } else {
      setError(null);
      
      const isMulti = resultTypes.length > 1;
      let hasValue = false;
      
      for (const rt of resultTypes) {
        if (rt === "time") {
          const hasMin = min.trim().length > 0;
          const hasSec = sec.trim().length > 0;
          if (hasMin !== hasSec) {
            setError("Preencha minutos e segundos completos.");
            return;
          }
          if (hasMin && hasSec) hasValue = true;
        } else {
          const val = resultsMap[rt] || "";
          if (val.trim()) hasValue = true;
        }
      }

      if (!hasValue) {
        setError(isMulti 
          ? "Preencha ao menos um campo de resultado." 
          : "Preencha o campo de resultado.");
        return;
      }

      setIsConfirming(true);
    }
  };

  const handleCancelConfirmation = () => {
    setIsConfirming(false);
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

      {/* Seletor de Nível (Coliseu Levels SSoT) */}
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

      {/* Instruções contextuais sobre o preenchimento */}
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
                       // Remove tags HTML e strings de injeção comuns
                       formatted = val.replace(/[<>{}|\\^`~]/g, "").slice(0, 50);
                     } else {
                       // Permite apenas dígitos numéricos puros (Zero-Garbage Policy)
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

        <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
          <button
            onClick={handleButtonClick}
            disabled={saving}
            style={{
              flex: 1,
              height: "58px",
              background: isConfirming ? "var(--nb-red, #E31B23)" : "#000",
              color: "#FFF",
              border: "3px solid #000",
              fontWeight: 950,
              fontSize: "12px",
              letterSpacing: "0.15em",
              cursor: saving ? "not-allowed" : "pointer",
              transition: "all 0.15s ease",
              boxShadow: isConfirming ? "4px 4px 0px #000" : "4px 4px 0px rgba(0,0,0,0.2)",
              position: "relative",
              overflow: "hidden"
            }}
          >
            {saving ? (
              <div style={{ display: "flex", alignItems: "center", gap: "6px", justifyContent: "center" }}>
                <div className="nb-spinner" />
                <span>SALVANDO</span>
              </div>
            ) : isConfirming ? (
              "CONFIRMAR SCORE?"
            ) : (
              "SALVAR"
            )}
          </button>

          {isConfirming && !saving && (
            <button
              onClick={handleCancelConfirmation}
              type="button"
              style={{
                padding: "0 20px",
                background: "#FFF",
                color: "#000",
                border: "3px solid #000",
                fontWeight: 950,
                fontSize: "12px",
                letterSpacing: "0.15em",
                cursor: "pointer",
                boxShadow: "3px 3px 0px #000",
                transition: "all 0.1s ease"
              }}
            >
              VOLTAR
            </button>
          )}
        </div>

        {onCancel && !saving && (
          <button
            onClick={onCancel}
            type="button"
            style={{
              marginTop: "8px",
              width: "100%",
              height: "44px",
              background: "#FFF",
              color: "#EF4444",
              border: "2px solid #000",
              fontWeight: 900,
              fontSize: "11px",
              letterSpacing: "0.1em",
              cursor: "pointer",
              boxShadow: "3px 3px 0px #000",
              textTransform: "uppercase"
            }}
          >
            Cancelar Edição
          </button>
        )}
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

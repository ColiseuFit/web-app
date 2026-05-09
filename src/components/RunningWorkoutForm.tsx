"use client";

import { useState } from "react";
import { logRunningSession } from "@/lib/actions/running_actions";
import { MessageSquare, Star, X, Zap, Check } from "lucide-react";
import { timeToSeconds, RUNNING_CATEGORIES, RUNNING_ZONES } from "@/lib/constants/running";
import AlertModal from "./AlertModal";

interface RunningWorkoutFormProps {
  sessionWorkouts: {
    id: string;
    target_description: string;
    target_distance_km: number | null;
    target_pace_description: string | null;
    target_rest_time_description: string | null;
    reps?: number | null;
    category?: string | null;
    target_zone?: string | null;
    target_unit?: string | null;
  }[];
  onClose: () => void;
  onSuccess: () => void;
}

type BlockResult = {
  workoutId: string;
  completed: boolean;
  actualDistance: string;
  durationStr: string;
  isEditing: boolean;
  reps: number;
};

/**
 * RunningWorkoutForm - Formulário Full-Screen para registro de sessões de corrida multi-bloco.
 * 
 * @description
 * Este componente permite que o atleta registre o resultado real de cada bloco prescrito pelo coach.
 * Ele gerencia o estado local de múltiplos blocos, calculando o pace e validando o esforço (RPE).
 * Para evitar conflitos de rolagem em dispositivos móveis, utiliza uma arquitetura "Full-Screen Takeover"
 * (`position: fixed`, `z-index: 9999`) e um "Sticky Footer" para o botão de salvar.
 * 
 * @param {RunningWorkoutFormProps} props - Propriedades do componente
 * @param {Array} props.sessionWorkouts - Lista de blocos que compõem a sessão do dia
 * @param {Function} props.onClose - Função para fechar o modal/overlay
 * @param {Function} props.onSuccess - Callback acionado após o registro bem sucedido no backend
 * 
 * @returns {React.ReactElement} Interface de formulário sobreposta (takeover)
 * 
 * @protocolo_ui Neo-Brutalismo (Iron Monolith)
 * - Feedback de validação via banner vermelho (proibido alert() nativo)
 * - Botões com estado de carregamento e labels contextuais
 * - Contraste agressivo e badges padronizados via `RUNNING_CATEGORIES` e `RUNNING_ZONES`.
 */
export default function RunningWorkoutForm({ sessionWorkouts, onClose, onSuccess }: RunningWorkoutFormProps) {
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);

  const [rpe, setRpe] = useState<number>(0);
  const [notes, setNotes] = useState<string>("");
  const [errorAlert, setErrorAlert] = useState<{ title: string; message: string } | null>(null);

  const [blocks, setBlocks] = useState<BlockResult[]>(
    sessionWorkouts.map(w => {
      let initialDistance = "";
      let initialDuration = "";

      if (w.target_distance_km) {
        if (w.target_unit === "min") {
          initialDuration = `${String(Math.floor(w.target_distance_km)).padStart(2, '0')}:00`;
        } else if (w.target_unit === "m") {
          // Defesa: se o valor no banco já for >= 1 (ex: 200), assumimos que já está em metros. 
          // Se for < 1 (ex: 0.2), aí sim multiplicamos por 1000 para exibir como metros.
          const baseDist = w.target_distance_km >= 1 ? w.target_distance_km : w.target_distance_km * 1000;
          initialDistance = Math.round(baseDist * (w.reps || 1)).toString();
        } else {
          initialDistance = (w.target_distance_km * (w.reps || 1)).toString();
        }
      }

      return {
        workoutId: w.id,
        completed: true,
        actualDistance: initialDistance,
        durationStr: initialDuration,
        isEditing: false,
        reps: w.reps || 1
      };
    })
  );

  const updateBlock = (id: string, field: keyof BlockResult, value: any) => {
    setBlocks(prev => prev.map(b => b.workoutId === id ? { ...b, [field]: value } : b));
  };

  const handleDurationChange = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, "");
    if (val.length > 6) val = val.slice(0, 6);

    if (val.length >= 3) {
      const parts = [];
      let secs = val.slice(-2);
      let mins = val.slice(-4, -2);
      const hours = val.slice(0, -4);

      if (parseInt(secs) > 59) secs = "59";
      if (mins && parseInt(mins) > 59) mins = "59";

      if (hours) parts.push(hours);
      parts.push(mins || "00");
      parts.push(secs);
      val = parts.join(":");
    }
    updateBlock(id, "durationStr", val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rpe === 0) {
      setErrorAlert({
        title: "Esforço Obrigatório",
        message: "Por favor, selecione o nível de esforço (RPE) da sessão para continuar."
      });
      setLoading(false);
      return;
    }

    // Validação inteligente de blocos concluídos
    for (const b of blocks) {
      if (!b.completed) continue;
      const w = sessionWorkouts.find(sw => sw.id === b.workoutId);
      if (!w) continue;

      const unit = w.target_unit?.toLowerCase() || "km";
      
      // Se o coach prescreveu tempo, o aluno deve logar quanto tempo fez
      if (unit === "min" && !b.durationStr) {
        setErrorAlert({
          title: "Tempo Pendente",
          message: `O bloco "${w.target_description}" é baseado em tempo. Por favor, registre a duração real.`
        });
        setLoading(false);
        return;
      }

      // Se o coach prescreveu distância, o aluno deve logar quanto correu
      if ((unit === "km" || unit === "m") && !b.actualDistance) {
        setErrorAlert({
          title: "Distância Pendente",
          message: `O bloco "${w.target_description}" exige o registro da distância percorrida.`
        });
        setLoading(false);
        return;
      }
    }

    try {
      const payload = {
        rpe,
        notes,
        blocks: blocks.map(b => {
          const w = sessionWorkouts.find(sw => sw.id === b.workoutId);
          let dist = b.actualDistance ? parseFloat(b.actualDistance) : null;

          // Conversão de volta para KM se o usuário digitou em Metros
          if (dist !== null && w?.target_unit === "m") {
            dist = dist / 1000;
          }

          return {
            workoutId: b.workoutId,
            completed: b.completed,
            actualDistance: dist,
            durationSeconds: b.durationStr ? timeToSeconds(b.durationStr) : null,
            reps: b.reps,
          };
        })
      };

      const formData = new FormData();
      formData.append("data", JSON.stringify(payload));

      const res = await logRunningSession(formData);

      if (res.success) {
        setXpEarned(res.pointsAwarded || 10);
        setShowSuccess(true);
        onSuccess();
      }
    } catch (err) {
      console.error(err);
      setErrorAlert({
        title: "Falha na Conexão",
        message: "Não foi possível salvar seu treino. Verifique sua conexão e tente novamente."
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      background: "#fff",
      zIndex: 9999,
      display: "flex", flexDirection: "column",
      animation: "slideInUp 0.25s ease-out"
    }}>
      {/* Cabeçalho Fixo */}
      <div style={{
        padding: "16px 20px",
        borderBottom: "3px solid #000",
        background: "#fff",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        flexShrink: 0
      }}>
        <h3 className="font-display" style={{ fontSize: "20px", fontWeight: 900, textTransform: "uppercase", margin: 0 }}>
          REGISTRAR <span style={{ color: "var(--nb-red)" }}>TREINO</span>
        </h3>
        <button
          onClick={onClose}
          style={{
            background: "#F3F4F6", border: "2px solid #000", borderRadius: "50%",
            width: "36px", height: "36px", display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer"
          }}
        >
          <X size={18} strokeWidth={3} />
        </button>
      </div>

      {showSuccess ? (
        /* ── Tela de Sucesso ── */
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div style={{ textAlign: "center", animation: "slideInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)" }}>
            <div style={{ width: "80px", height: "80px", background: "var(--nb-yellow)", border: "4px solid #000", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
              <Zap size={40} fill="#000" />
            </div>
            <h2 className="font-display" style={{ fontSize: "32px", fontWeight: 950, marginBottom: "4px" }}>MISSÃO CONCLUÍDA!</h2>
            <p className="font-headline" style={{ fontSize: "12px", fontWeight: 900, opacity: 0.6, textTransform: "uppercase", marginBottom: "24px" }}>
              Treino registrado com sucesso
            </p>
            <div style={{ background: "#000", color: "#FFF", padding: "16px", border: "3px solid #000", boxShadow: "6px 6px 0 var(--nb-red)", marginBottom: "32px" }}>
              <div style={{ fontSize: "10px", fontWeight: 900, opacity: 0.7, textTransform: "uppercase" }}>Gamificação</div>
              <div style={{ fontSize: "24px", fontWeight: 950, color: "var(--nb-yellow)" }}>+{xpEarned} XP</div>
              <div style={{ fontSize: "11px", fontWeight: 900 }}>RECOMPENSA DE PERFORMANCE</div>
            </div>
            <button onClick={onClose} className="nb-button" style={{ width: "100%", background: "#000", color: "#FFF", padding: "16px" }}>
              VOLTAR AO HUB
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch", padding: "20px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ fontSize: "12px", fontWeight: 900, textTransform: "uppercase" }}>Resumo do Treino:</div>
              {sessionWorkouts.map((w) => {
                const blockState = blocks.find(b => b.workoutId === w.id)!;
                const unit = w.target_unit?.toLowerCase() || "km";

                return (
                  <div key={w.id} style={{
                    border: "1px solid #e5e5e5",
                    borderLeft: blockState.completed ? "4px solid var(--nb-yellow)" : "4px solid #ddd",
                    padding: "16px",
                    background: "#fff",
                    opacity: blockState.completed ? 1 : 0.6,
                    transition: "all 0.2s ease"
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", gap: "6px", marginBottom: "8px", flexWrap: "wrap", alignItems: "center" }}>
                          {w.category && (() => {
                            const cat = RUNNING_CATEGORIES.find(c => c.id === w.category);
                            return (
                              <span style={{
                                fontSize: "10px", fontWeight: 900, padding: "3px 8px",
                                background: cat?.color || "#000",
                                color: "#FFF", textTransform: "uppercase", letterSpacing: "0.04em",
                                borderRadius: "2px"
                              }}>
                                {cat?.label || w.category}
                              </span>
                            );
                          })()}
                          {w.target_zone && w.target_zone !== "livre" && (() => {
                            const zone = RUNNING_ZONES.find(z => z.id === w.target_zone);
                            return (
                              <span style={{
                                fontSize: "10px", fontWeight: 900, padding: "3px 8px",
                                background: zone?.color || "#000",
                                color: "#FFF", textTransform: "uppercase", letterSpacing: "0.04em",
                                borderRadius: "2px"
                              }}>
                                {zone?.label || w.target_zone} · {zone?.desc || ""}
                              </span>
                            );
                          })()}
                          {w.target_zone === "livre" && (
                            <span style={{
                              fontSize: "10px", fontWeight: 900, padding: "3px 8px",
                              background: "#E5E7EB", color: "#374151", textTransform: "uppercase", letterSpacing: "0.04em",
                              borderRadius: "2px"
                            }}>
                              LIVRE
                            </span>
                          )}
                        </div>

                        <div style={{ fontWeight: 500, fontSize: "13px", lineHeight: "1.5", color: "#333", marginBottom: "12px" }}>
                          {w.target_description}
                        </div>

                        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                          {(w.target_distance_km || w.reps) && (
                            <span style={{
                              fontSize: "9px", fontWeight: 800, padding: "2px 6px",
                              background: "#F3F4F6", color: "#000", textTransform: "uppercase", letterSpacing: "0.02em", border: "1px solid #DDD"
                            }}>
                              {w.reps && w.reps > 1 ? `${w.reps}x ` : ""}
                              {w.target_distance_km ? (
                                unit === "m" 
                                    ? `${((Number(w.target_distance_km) || 0) >= 1 ? Number(w.target_distance_km) : Number(w.target_distance_km) * 1000).toFixed(0)}m`
                                    : unit === "min" ? `${w.target_distance_km}min` : `${w.target_distance_km}km`
                              ) : ""}
                            </span>
                          )}
                          {w.target_pace_description && (
                            <span style={{
                              fontSize: "9px", fontWeight: 800, padding: "2px 6px",
                              background: "#F3F4F6", color: "#000", textTransform: "uppercase", letterSpacing: "0.02em", border: "1px solid #DDD"
                            }}>
                              PACE {w.target_pace_description}
                            </span>
                          )}
                          {w.target_rest_time_description && (
                            <span style={{
                              fontSize: "9px", fontWeight: 800, padding: "2px 6px",
                              background: "#F3F4F6", color: "#000", textTransform: "uppercase", letterSpacing: "0.02em", border: "1px solid #DDD"
                            }}>
                              DESC {w.target_rest_time_description}
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => updateBlock(w.id, "completed", !blockState.completed)}
                        style={{
                          width: "24px", height: "24px", flexShrink: 0,
                          border: blockState.completed ? "none" : "2px solid #ccc",
                          background: blockState.completed ? "var(--nb-blue)" : "#fff",
                          borderRadius: "50%",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          cursor: "pointer", marginTop: "2px"
                        }}
                      >
                        {blockState.completed && <Check size={14} color="#fff" strokeWidth={3} />}
                      </button>
                    </div>

                    {blockState.completed && (
                      <div style={{ marginTop: 8 }}>
                        {!blockState.isEditing ? (
                          <button
                            type="button"
                            onClick={() => updateBlock(w.id, "isEditing", true)}
                            style={{
                              background: "#F3F4F6", border: "1px solid #DDD", padding: "4px 8px", color: "#666",
                              fontSize: "9px", fontWeight: 800, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px"
                            }}
                          >
                            <Zap size={10} /> AJUSTAR RESULTADO REAL
                          </button>
                        ) : (
                          <div style={{ display: "flex", gap: "10px", marginTop: "12px", paddingTop: "12px", borderTop: "2px dashed rgba(0,0,0,0.1)" }}>
                            <div style={{ width: "60px" }}>
                              <label style={{ fontSize: "9px", fontWeight: 900, display: "block", marginBottom: "4px" }}>
                                REPS
                              </label>
                              <input
                                type="number" min="1"
                                className="nb-input"
                                style={{ width: "100%", padding: "8px", fontSize: "11px", background: "#fff", textAlign: "center" }}
                                value={blockState.reps}
                                onChange={(e) => updateBlock(w.id, "reps", parseInt(e.target.value) || 1)}
                              />
                            </div>
                            {unit !== "min" && (
                              <div style={{ flex: 1 }}>
                                <label style={{ fontSize: "9px", fontWeight: 900, display: "block", marginBottom: "4px" }}>
                                  DISTÂNCIA ({unit.toUpperCase()})
                                </label>
                                <input
                                  type="number" step="0.01" min="0"
                                  className="nb-input"
                                  style={{ width: "100%", padding: "8px", fontSize: "11px", background: "#fff" }}
                                  value={blockState.actualDistance}
                                  onChange={(e) => updateBlock(w.id, "actualDistance", e.target.value)}
                                />
                              </div>
                            )}
                            <div style={{ flex: 1 }}>
                              <label style={{ fontSize: "9px", fontWeight: 900, display: "block", marginBottom: "4px" }}>
                                TEMPO TOTAL
                              </label>
                              <input
                                type="text" placeholder="MM:SS"
                                className="nb-input"
                                style={{ width: "100%", padding: "8px", fontSize: "11px", background: "#fff" }}
                                value={blockState.durationStr}
                                onChange={(e) => handleDurationChange(w.id, e)}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* AVALIAÇÃO GERAL DA SESSÃO */}
            <div style={{ borderTop: "3px solid #000", paddingTop: "20px" }}>
              <div style={{ marginBottom: "20px" }}>
                <label className="font-headline" style={{ fontSize: "11px", fontWeight: 900, marginBottom: "6px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <Star size={14} /> ESFORÇO DO TREINO (RPE 1-10)
                </label>
                <div style={{ display: "flex", gap: "4px", justifyContent: "space-between" }}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(val => (
                    <button
                      key={val} type="button" onClick={() => setRpe(val)}
                      style={{
                        flex: 1, height: "32px", border: "2px solid #000",
                        background: rpe === val ? "var(--nb-red)" : "#fff",
                        color: rpe === val ? "#fff" : "#000",
                        fontWeight: 900, fontSize: "12px", cursor: "pointer"
                      }}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-headline" style={{ fontSize: "11px", fontWeight: 900, marginBottom: "6px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <MessageSquare size={14} /> NOTAS DO TREINO
                </label>
                <textarea
                  value={notes} onChange={e => setNotes(e.target.value)}
                  placeholder="Como você se sentiu neste treino?"
                  className="nb-input" maxLength={140}
                  style={{ width: "100%", padding: "12px", minHeight: "80px", resize: "none" }}
                />
              </div>
            </div>

            </div>

            <div style={{ 
              position: "sticky", bottom: "-20px",
              padding: "16px 0 0", marginTop: "4px",
              background: "#fff"
            }}>
              <button
                type="submit" disabled={loading}
                className="nb-button"
                style={{
                  width: "100%",
                  background: rpe === 0 ? "#666" : "var(--nb-red)",
                  color: "#fff",
                  padding: "16px",
                  opacity: rpe === 0 ? 0.7 : 1,
                  cursor: rpe === 0 ? "not-allowed" : "pointer"
                }}
              >
                {loading ? "SALVANDO..." : rpe === 0 ? "SELECIONE O ESFORÇO" : "SALVAR TREINO COMPLETO"}
              </button>
            </div>
        </form>
      )}

      {errorAlert && (
        <AlertModal
          title={errorAlert.title}
          message={errorAlert.message}
          type="error"
          onClose={() => setErrorAlert(null)}
        />
      )}
    </div>
  );
}

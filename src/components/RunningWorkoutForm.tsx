"use client";

import { useState } from "react";
import { logRunningSession } from "@/lib/actions/running_actions";
import { MessageSquare, Star, X, Zap, Check } from "lucide-react";
import { timeToSeconds } from "@/lib/constants/running";
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
 * Formulário avançado para registro de sessões de corrida multi-bloco.
 * 
 * @description
 * Este componente permite que o atleta registre o resultado real de cada bloco prescrito pelo coach.
 * Ele gerencia o estado local de múltiplos blocos, calculando o pace e validando o esforço (RPE).
 * 
 * @protocolo_ui Neo-Brutalismo (Iron Monolith)
 * - Feedback de validação via banner vermelho (proibido alert() nativo)
 * - Botões com estado de carregamento e labels contextuais
 * - Contraste agressivo para legibilidade em movimento
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
    <div className="modal-overlay" style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1000, padding: "20px", overflowY: "auto"
    }}>
      <div
        className="nb-card"
        style={{
          width: "100%", maxWidth: "400px", background: "#fff", padding: "24px",
          position: "relative", animation: "slideInUp 0.3s ease-out",
          maxHeight: "90vh", overflowY: "auto"
        }}
      >
        <button
          onClick={onClose}
          style={{ position: "absolute", top: "12px", right: "12px", background: "none", border: "none", cursor: "pointer" }}
        >
          <X size={24} />
        </button>

        <h3 className="font-display" style={{ fontSize: "24px", fontWeight: 900, textTransform: "uppercase", marginBottom: "16px" }}>
          REGISTRAR <span style={{ color: "var(--nb-red)" }}>SESSÃO</span>
        </h3>

        {showSuccess ? (
          <div style={{ textAlign: "center", padding: "20px 0", animation: "slideInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)" }}>
            <div style={{ width: "80px", height: "80px", background: "var(--nb-yellow)", border: "4px solid #000", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
              <Zap size={40} fill="#000" />
            </div>
            <h2 className="font-display" style={{ fontSize: "32px", fontWeight: 950, marginBottom: "4px" }}>MISSÃO CONCLUÍDA!</h2>
            <p className="font-headline" style={{ fontSize: "12px", fontWeight: 900, opacity: 0.6, textTransform: "uppercase", marginBottom: "24px" }}>
              Sessão registrada com sucesso
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
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ fontSize: "12px", fontWeight: 900, textTransform: "uppercase" }}>Detalhes da Sessão:</div>
              {sessionWorkouts.map((w) => {
                const blockState = blocks.find(b => b.workoutId === w.id)!;
                const unit = w.target_unit?.toLowerCase() || "km";

                return (
                  <div key={w.id} style={{
                    border: "2px solid #000", padding: "12px",
                    background: blockState.completed ? "var(--nb-yellow)" : "#f5f5f5",
                    opacity: blockState.completed ? 1 : 0.7,
                    transition: "all 0.2s ease"
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <div style={{ fontWeight: 900, textTransform: "uppercase", fontSize: "12px" }}>{w.target_description}</div>
                        <div style={{ display: "flex", gap: "8px", marginTop: "4px", color: blockState.completed ? "var(--nb-red)" : "#666", flexWrap: "wrap", fontSize: "10px" }}>
                          {w.category && <span>[{w.category}]</span>}
                          {(w.target_distance_km || w.reps) && (
                            <span>
                              {w.reps && w.reps > 1 ? `${w.reps}x ` : ""}
                              {w.target_distance_km ? `${w.target_distance_km}${unit.toUpperCase()}` : ""}
                            </span>
                          )}
                          {(w.target_pace_description || w.target_zone) && (
                            <span>
                              {w.target_zone && w.target_zone !== "livre" ? w.target_zone : (w.target_pace_description ? `PACE ${w.target_pace_description}` : "LIVRE")}
                            </span>
                          )}
                          {w.target_rest_time_description && <span>DESC. {w.target_rest_time_description}</span>}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => updateBlock(w.id, "completed", !blockState.completed)}
                        style={{
                          width: "28px", height: "28px", flexShrink: 0,
                          border: "2px solid #000",
                          background: blockState.completed ? "#000" : "#fff",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          cursor: "pointer"
                        }}
                      >
                        {blockState.completed && <Check size={16} color="#fff" strokeWidth={4} />}
                      </button>
                    </div>

                    {blockState.completed && (
                      <div style={{ marginTop: 8 }}>
                        {!blockState.isEditing ? (
                          <button
                            type="button"
                            onClick={() => updateBlock(w.id, "isEditing", true)}
                            style={{
                              background: "none", border: "none", padding: 0, color: "#666",
                              fontSize: "9px", fontWeight: 900, textDecoration: "underline", cursor: "pointer"
                            }}
                          >
                            ✎ AJUSTAR RESULTADO
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
                  <Star size={14} /> ESFORÇO DA SESSÃO (RPE 1-10)
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
                  <MessageSquare size={14} /> NOTAS DA SESSÃO
                </label>
                <textarea
                  value={notes} onChange={e => setNotes(e.target.value)}
                  placeholder="Como você se sentiu nesta sessão?"
                  className="nb-input" maxLength={140}
                  style={{ width: "100%", padding: "12px", minHeight: "80px", resize: "none" }}
                />
              </div>
            </div>

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
              {loading ? "SALVANDO..." : rpe === 0 ? "SELECIONE O ESFORÇO" : "SALVAR SESSÃO COMPLETA"}
            </button>
          </form>
        )}
      </div>

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

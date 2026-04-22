"use client";

import { useState } from "react";
import { logRunningWorkout } from "@/lib/actions/running_actions";
import { Clock, Footprints, MessageSquare, Star, X, Activity, Zap } from "lucide-react";
import { formatPace, timeToSeconds } from "@/lib/constants/running";

interface RunningWorkoutFormProps {
  workout: {
    id: string;
    target_description: string;
    target_distance_km: number | null;
    target_pace_description: string | null;
    target_rest_time_description: string | null;
  };
  onClose: () => void;
  onSuccess: () => void;
}

export default function RunningWorkoutForm({ workout, onClose, onSuccess }: RunningWorkoutFormProps) {
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  const [distance, setDistance] = useState<string>("");
  const [durationStr, setDurationStr] = useState<string>(""); // MM:SS ou HH:MM:SS
  const [rpe, setRpe] = useState<number>(5);
  const [notes, setNotes] = useState<string>("");

  // Máscara de duração
  const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, ""); // Apenas números
    if (val.length > 6) val = val.slice(0, 6); // Limite HHMMSS

    if (val.length >= 3) {
      const parts = [];
      const secs = val.slice(-2);
      const mins = val.slice(-4, -2);
      const hours = val.slice(0, -4);
      
      if (hours) parts.push(hours);
      parts.push(mins || "00");
      parts.push(secs);
      val = parts.join(":");
    }
    setDurationStr(val);
  };

  // Cálculo de Pace em tempo real
  const currentDistance = parseFloat(distance);
  const currentSeconds = timeToSeconds(durationStr);
  const currentPace = (currentDistance > 0 && currentSeconds > 0) 
    ? formatPace(currentSeconds / currentDistance)
    : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("workoutId", workout.id);
      formData.append("distance", distance);
      
      // Converter mm:ss ou hh:mm:ss para segundos
      const totalSeconds = timeToSeconds(durationStr);

      formData.append("duration", totalSeconds.toString());
      formData.append("rpe", rpe.toString());
      formData.append("notes", notes);

      await logRunningWorkout(formData);
      
      // Cálculo de XP (v2.1): Distância * 5, mínimo 10 XP
      const calculatedXp = Math.max(10, Math.round(parseFloat(distance) * 5));
      setXpEarned(calculatedXp);
      setShowSuccess(true);
      
      onSuccess();
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar treino");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(0,0,0,0.8)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000,
      padding: "20px"
    }}>
      <div 
        className="nb-card" 
        style={{ 
          width: "100%", 
          maxWidth: "400px", 
          background: "#fff", 
          padding: "24px",
          position: "relative",
          animation: "slideInUp 0.3s ease-out"
        }}
      >
        <button 
          onClick={onClose}
          style={{ position: "absolute", top: "12px", right: "12px", background: "none", border: "none", cursor: "pointer" }}
        >
          <X size={24} />
        </button>

        <h3 className="font-display" style={{ fontSize: "24px", fontWeight: 900, textTransform: "uppercase", marginBottom: "8px" }}>
          REGISTRAR <span style={{ color: "var(--nb-red)" }}>TREINO</span>
        </h3>

        {showSuccess ? (
          <div style={{ 
            textAlign: "center", 
            padding: "20px 0",
            animation: "slideInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)"
          }}>
            <div style={{ 
              width: "80px", 
              height: "80px", 
              background: "var(--nb-yellow)", 
              border: "4px solid #000", 
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 20px"
            }}>
              <Zap size={40} fill="#000" />
            </div>
            
            <h2 className="font-display" style={{ fontSize: "32px", fontWeight: 950, marginBottom: "4px" }}>
              MISSÃO CONCLUÍDA!
            </h2>
            <p className="font-headline" style={{ fontSize: "12px", fontWeight: 900, opacity: 0.6, textTransform: "uppercase", marginBottom: "24px" }}>
              Treino registrado com sucesso
            </p>

            <div style={{ 
              background: "#000", 
              color: "#FFF", 
              padding: "16px",
              border: "3px solid #000",
              boxShadow: "6px 6px 0 var(--nb-red)",
              marginBottom: "32px"
            }}>
              <div style={{ fontSize: "10px", fontWeight: 900, opacity: 0.7, textTransform: "uppercase" }}>Gamificação</div>
              <div style={{ fontSize: "24px", fontWeight: 950, color: "var(--nb-yellow)" }}>+{xpEarned} XP</div>
              <div style={{ fontSize: "11px", fontWeight: 900 }}>RECOMPENSA DE PERFORMANCE</div>
            </div>

            <button 
              onClick={onClose}
              className="nb-button"
              style={{ width: "100%", background: "#000", color: "#FFF", padding: "16px" }}
            >
              VOLTAR AO HUB
            </button>
          </div>
        ) : (
          <>
            {/* Referência da Meta */}
            <div style={{ 
              background: "var(--nb-yellow)", 
              border: "2px solid #000", 
              padding: "10px", 
              marginBottom: "20px",
              fontSize: "12px",
              fontWeight: 900
            }}>
              <div style={{ opacity: 0.6, fontSize: "10px", textTransform: "uppercase", marginBottom: "4px" }}>Meta Prescrita:</div>
              <div>{workout.target_description}</div>
              {(workout.target_distance_km || workout.target_pace_description || workout.target_rest_time_description) && (
                <div style={{ display: "flex", gap: "12px", marginTop: "4px", color: "var(--nb-red)", flexWrap: "wrap" }}>
                  {workout.target_distance_km && <span>{workout.target_distance_km} KM</span>}
                  {workout.target_pace_description && <span>PACE {workout.target_pace_description}</span>}
                  {workout.target_rest_time_description && <span>DESC. {workout.target_rest_time_description}</span>}
                </div>
              )}
            </div>

            <form onSubmit={handleSubmit} style={{ display: "grid", gap: "20px" }}>
              
              <div>
                <label className="font-headline" style={{ fontSize: "11px", fontWeight: 900, marginBottom: "6px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <Footprints size={14} /> DISTÂNCIA FINAL (KM)
                </label>
                <input 
                  type="number" 
                  step="0.01" 
                  min="0"
                  max="999"
                  required
                  value={distance}
                  onChange={e => {
                    let val = e.target.value;
                    if (val === "") {
                      setDistance("");
                      return;
                    }
                    if (parseFloat(val) > 999.99) return;
                    if (val.length > 6) return;
                    setDistance(val);
                  }}
                  placeholder="Ex: 5.50"
                  className="nb-input"
                  style={{ width: "100%", padding: "12px" }}
                />
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <label className="font-headline" style={{ fontSize: "11px", fontWeight: 900, display: "flex", alignItems: "center", gap: "6px" }}>
                    <Clock size={14} /> TEMPO TOTAL (MM:SS ou HH:MM:SS)
                  </label>
                  {currentPace && (
                    <div style={{ fontSize: "10px", fontWeight: 900, color: "var(--nb-red)", display: "flex", alignItems: "center", gap: "4px", background: "#f8f8f8", padding: "2px 6px", border: "1px solid #ddd" }}>
                      <Activity size={10} /> PACE: {currentPace} /km
                    </div>
                  )}
                </div>
                <input 
                  type="text" 
                  required
                  value={durationStr}
                  onChange={handleDurationChange}
                  placeholder="Ex: 27:30"
                  className="nb-input"
                  style={{ width: "100%", padding: "12px" }}
                />
              </div>

              <div>
                <label className="font-headline" style={{ fontSize: "11px", fontWeight: 900, marginBottom: "6px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <Star size={14} /> ESFORÇO (RPE 1-10)
                </label>
                <div style={{ display: "flex", gap: "4px", justifyContent: "space-between" }}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setRpe(val)}
                      style={{
                        flex: 1,
                        height: "32px",
                        border: "2px solid #000",
                        background: rpe === val ? "var(--nb-red)" : "#fff",
                        color: rpe === val ? "#fff" : "#000",
                        fontWeight: 900,
                        fontSize: "12px",
                        cursor: "pointer"
                      }}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-headline" style={{ fontSize: "11px", fontWeight: 900, marginBottom: "6px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <MessageSquare size={14} /> NOTAS DO ATLETA
                </label>
                <textarea 
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Como você se sentiu?"
                  className="nb-input"
                  maxLength={140}
                  style={{ width: "100%", padding: "12px", minHeight: "80px", resize: "none" }}
                />
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="nb-button" 
                style={{ 
                  width: "100%", 
                  background: "var(--nb-red)", 
                  color: "#fff", 
                  padding: "16px",
                  marginTop: "10px"
                }}
              >
                {loading ? "SALVANDO..." : "SALVAR RESULTADO"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

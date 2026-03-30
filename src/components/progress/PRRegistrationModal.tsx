"use client";

import { useState, useEffect } from "react";
import { X, Lock, CheckCircle } from "lucide-react";
import { upsertPersonalRecord } from "@/app/(student)/actions";
import { hapticSelect, hapticConfirm } from "@/lib/haptic";

interface PRRegistrationModalProps {
  onClose: () => void;
  onSuccess: () => void;
  initialLevel?: "L1" | "L2" | "L3" | "L4" | "L5";
}

/**
 * Modal de Registro de PR - Versão Visual Identity (Official Icons)
 * Asset-First Selection with Strict Progression.
 */
export default function PRRegistrationModal({ onClose, onSuccess, initialLevel }: PRRegistrationModalProps) {
  const [movementName, setMovementName] = useState("");
  const [category, setCategory] = useState<"lpo" | "strength" | "gymnastics" | "benchmark">("lpo");
  const [value, setValue] = useState("");
  const [unit, setUnit] = useState<"kg" | "time" | "reps">("kg");
  const [level, setLevel] = useState<"L1" | "L2" | "L3" | "L4" | "L5">(initialLevel || "L1");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = "unset"; };
  }, []);

  const levelOrder = ["L1", "L2", "L3", "L4", "L5"];
  const maxLevelIndex = levelOrder.indexOf(initialLevel || "L1");

  const levelConfigs = {
    L1: { 
      color: "#ffffff", label: "INICIANTE", 
      icon: "/levels/icone-coliseu-levels-iniciante.svg",
      bg: "rgba(255,255,255,0.02)", border: "rgba(255,255,255,0.1)" 
    },
    L2: { 
      color: "#2dab61", label: "SCALE", 
      icon: "/levels/icone-coliseu-levels-scale.svg",
      bg: "rgba(45,171,97,0.03)", border: "rgba(45,171,97,0.15)" 
    },
    L3: { 
      color: "#2980ba", label: "INTERMEDIÁRIO", 
      icon: "/levels/icone-coliseu-levels-intermediario.svg",
      bg: "rgba(41,128,186,0.03)", border: "rgba(41,128,186,0.15)" 
    },
    L4: { 
      color: "#e52521", label: "RX", 
      icon: "/levels/icone-coliseu-levels-rx.svg",
      bg: "rgba(229,37,33,0.03)", border: "rgba(229,37,33,0.15)" 
    },
    L5: { 
      color: "#C5A059", label: "ELITE", 
      icon: "/levels/icone-coliseu-levels-elite.svg",
      bg: "rgba(197, 160, 89, 0.03)", border: "rgba(197, 160, 89, 0.2)" 
    }
  };

  const handleConfirm = async () => {
    if (!movementName || !value) return;
    
    setLoading(true);
    const prData = {
      movement_key: movementName.toLowerCase().replace(/\s+/g, "_"),
      value: Number(value),
      unit,
      category,
      level,
      date: new Date().toISOString().split("T")[0]
    };

    const result = await upsertPersonalRecord(prData);
    setLoading(false);

    if (result.success) {
      hapticConfirm();
      onSuccess();
    } else {
      alert("Erro ao registrar: " + result.error);
    }
  };

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: "rgba(0,0,0,0.92)", zIndex: 3000,
      display: "flex", alignItems: "flex-end", backdropFilter: "blur(12px)",
      animation: "modalFadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)"
    }}>
      <div style={{
        backgroundColor: "var(--surface-lowest)", 
        width: "100%", maxWidth: "480px", margin: "0 auto",
        borderTopLeftRadius: "32px", borderTopRightRadius: "32px",
        maxHeight: "94vh", display: "flex", flexDirection: "column",
        position: "relative", boxShadow: "0 -25px 100px rgba(0,0,0,0.9)",
        border: "1px solid var(--border-glow)", borderBottom: "none"
      }}>
        
        {/* DRAG INDICATOR */}
        <div onClick={onClose} style={{ padding: "12px 0 20px", display: "flex", justifyContent: "center", cursor: "pointer" }}>
          <div style={{ width: "40px", height: "4px", backgroundColor: "rgba(255,255,255,0.15)", borderRadius: "2px" }} />
        </div>

        {/* HEADER */}
        <div style={{ padding: "0 24px 24px", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <p style={{ fontSize: "9px", fontWeight: 800, color: "var(--red)", letterSpacing: "0.25em", textTransform: "uppercase", marginBottom: "4px" }}>
                REGISTRO DE PERFORMANCE
              </p>
              <h2 className="font-display" style={{ fontSize: "28px", lineHeight: 1, letterSpacing: "-0.02em" }}>ALCANÇAR MARCA</h2>
            </div>
            <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <X size={24} />
            </button>
          </div>
        </div>

        {/* SCROLLABLE FORM */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0 24px 32px", scrollbarWidth: "none" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            
            {/* MOVIMENTO */}
            <div>
              <label style={{ fontSize: "9px", fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.1em", display: "block", marginBottom: "10px" }}>MOVIMENTO / EXERCÍCIO</label>
              <input 
                value={movementName}
                onChange={(e) => setMovementName(e.target.value)}
                placeholder="Ex: Snatch, Fran, Burpees..."
                style={{
                  width: "100%", background: "rgba(255,255,255,0.02)", border: "1px solid var(--border-glow)",
                  padding: "18px", color: "#fff", fontSize: "16px", fontWeight: 600, outline: "none",
                  borderRadius: "4px", transition: "border 0.2s"
                }}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              {/* RESULTADO */}
              <div>
                <label style={{ fontSize: "9px", fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.1em", display: "block", marginBottom: "10px" }}>CARGA / TEMPO</label>
                <input 
                  type="number"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="0.00"
                  style={{
                    width: "100%", background: "rgba(255,255,255,0.02)", border: "1px solid var(--border-glow)",
                    padding: "18px", color: "#fff", fontSize: "22px", fontWeight: 900, outline: "none",
                    borderRadius: "4px"
                  }}
                />
              </div>

              {/* UNIDADE */}
              <div>
                <label style={{ fontSize: "9px", fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.1em", display: "block", marginBottom: "10px" }}>UNIDADE</label>
                <select 
                  value={unit}
                  onChange={(e) => setUnit(e.target.value as "kg" | "time" | "reps")}
                  style={{
                    width: "100%", background: "rgba(255,255,255,0.02)", border: "1px solid var(--border-glow)",
                    padding: "18px", color: "#fff", fontSize: "14px", fontWeight: 700, outline: "none",
                    appearance: "none", borderRadius: "4px"
                  }}
                >
                  <option value="kg">KG</option>
                  <option value="reps">REPS</option>
                  <option value="time">SEG</option>
                </select>
              </div>
            </div>

            {/* CATEGORIA */}
            <div>
              <label style={{ fontSize: "9px", fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.1em", display: "block", marginBottom: "10px" }}>CATEGORIA DO MOVIMENTO</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "6px" }}>
                {(["lpo", "strength", "gymnastics", "benchmark"] as const).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => { hapticSelect(); setCategory(cat); }}
                    style={{
                      padding: "10px 4px", fontSize: "8px", fontWeight: 900, textTransform: "uppercase",
                      background: category === cat ? "var(--red)" : "rgba(255,255,255,0.02)",
                      border: "1px solid", borderColor: category === cat ? "var(--red)" : "var(--border-glow)",
                      color: category === cat ? "#fff" : "var(--text-muted)", cursor: "pointer", transition: "0.2s",
                      letterSpacing: "0.1em", borderRadius: "2px"
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ fontSize: "9px", fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", display: "block", marginBottom: "12px" }}>REQUISITO TÉCNICO (NÍVEL)</label>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {(Object.keys(levelConfigs) as Array<keyof typeof levelConfigs>).map((lvl, index) => {
                  const config = levelConfigs[lvl];
                  const isSelected = level === lvl;
                  const isLocked = index > maxLevelIndex;
                  const isCurrentLevel = lvl === (initialLevel || "L1");

                  return (
                    <button
                      key={lvl}
                      disabled={isLocked}
                      onClick={() => { hapticSelect(); setLevel(lvl); }}
                      style={{
                        width: "100%", height: "64px",
                        background: isSelected ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.01)",
                        border: isSelected ? `1px solid ${config.color}` : "1px solid var(--border-glow)",
                        color: isSelected ? "#fff" : "var(--text-muted)",
                        fontSize: "11px", fontWeight: 900,
                        opacity: isLocked ? 0.15 : 1,
                        cursor: isLocked ? "not-allowed" : "pointer",
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "0 16px", borderRadius: "4px",
                        transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
                        animation: isCurrentLevel && isSelected ? "levelPulse 3s infinite ease-in-out" : "none",
                        position: "relative",
                        overflow: "hidden"
                      }}
                    >
                      {/* ICON & LABEL */}
                      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                        <div style={{ 
                          width: "36px", height: "36px", flexShrink: 0,
                          filter: isLocked ? "grayscale(100%)" : (isSelected ? `drop-shadow(0 0 8px ${config.color}80)` : "none")
                        }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={config.icon} alt={config.label} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                        </div>
                        <div style={{ textAlign: "left" }}>
                          <span style={{ fontSize: "8px", color: config.color, display: "block", marginBottom: "2px" }}>{lvl}</span>
                          <span style={{ fontSize: "11px", letterSpacing: "0.1em" }}>{config.label}</span>
                        </div>
                      </div>
                      
                      {isLocked ? (
                        <Lock size={18} style={{ opacity: 0.5 }} />
                      ) : isSelected ? (
                        <CheckCircle size={22} color={config.color} />
                      ) : null}

                      {/* BG EFFECT ON ACTIVE */}
                      {isSelected && (
                        <div style={{
                          position: "absolute", inset: 0, background: `linear-gradient(90deg, transparent, ${config.color}10, transparent)`,
                          pointerEvents: "none"
                        }} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

          </div>
        </div>

        {/* FOOTER */}
        <div style={{ padding: "24px 24px 44px", borderTop: "1px solid rgba(255,255,255,0.05)", background: "var(--surface-lowest)" }}>
          <button
            onClick={handleConfirm}
            disabled={!movementName || !value || loading}
            style={{
              width: "100%", padding: "20px", background: movementName && value ? "var(--red)" : "rgba(255,255,255,0.03)",
              border: "none", color: movementName && value ? "#fff" : "rgba(255,255,255,0.15)", 
              fontSize: "12px", fontWeight: 900, cursor: !movementName || !value || loading ? "not-allowed" : "pointer",
              textTransform: "uppercase", fontFamily: "var(--font-display)",
              transition: "all 0.5s ease", borderRadius: "1px", letterSpacing: "0.2em",
              boxShadow: movementName && value ? "0 15px 40px rgba(227,27,35,0.25)" : "none"
            }}
          >
            {loading ? "SINCRONIZANDO..." : "REGISTRAR RECORDE"}
          </button>
        </div>

      </div>

      <style jsx global>{`
        @keyframes modalFadeIn {
          from { opacity: 0; transform: translateY(100%); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes levelPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.01); border-color: #fff; }
        }
      `}</style>
    </div>
  );
}

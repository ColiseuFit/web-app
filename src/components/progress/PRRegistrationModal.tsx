"use client";

import { useState, useEffect } from "react";
import { X, Lock, CheckCircle } from "lucide-react";
import { upsertPersonalRecord } from "@/app/(student)/actions";
import { hapticSelect, hapticConfirm } from "@/lib/haptic";
import AlertModal from "../AlertModal";

import { getLevelInfo, ALL_LEVELS } from "@/lib/constants/levels";

interface PRRegistrationModalProps {
  onClose: () => void;
  onSuccess: () => void;
  initialLevel?: string;
}

export default function PRRegistrationModal({ onClose, onSuccess, initialLevel }: PRRegistrationModalProps) {
  const [movementName, setMovementName] = useState("");
  const [category, setCategory] = useState<"lpo" | "strength" | "gymnastics" | "benchmark">("lpo");
  const [value, setValue] = useState("");
  const [unit, setUnit] = useState<"kg" | "time" | "reps">("kg");
  const [level, setLevel] = useState<string>(initialLevel || "L1");
  const [loading, setLoading] = useState(false);
  const [alertMsg, setAlertMsg] = useState<string | null>(null);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = "unset"; };
  }, []);

  const levelOrder = ALL_LEVELS.map(l => l.id);
  const currentLevelId = getLevelInfo(initialLevel || "L1").id;
  const maxLevelIndex = levelOrder.indexOf(currentLevelId);

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
      setAlertMsg(result.error || "Erro ao registrar PR. Tente novamente.");
    }
  };

  return (
    <>
    {alertMsg && (
      <AlertModal
        type="error"
        title="ERRO AO REGISTRAR"
        message={alertMsg}
        buttonLabel="ENTENDI"
        onClose={() => setAlertMsg(null)}
      />
    )}
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: "rgba(255,255,255,0.98)", zIndex: 3000,
      display: "flex", alignItems: "flex-end",
      animation: "modalSlideUp 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28)"
    }}>
      <div style={{
        backgroundColor: "#FFF", 
        width: "100%", maxWidth: "500px", margin: "0 auto",
        maxHeight: "96vh", display: "flex", flexDirection: "column",
        position: "relative", boxShadow: "0 -10px 40px rgba(0,0,0,0.05)",
        border: "3px solid #000", borderBottom: "none"
      }}>
        
        {/* CLOSE BUTTON */}
        <button 
          onClick={onClose} 
          style={{ 
            position: "absolute", top: "16px", right: "16px",
            background: "#000", border: "none", color: "#FFF", 
            cursor: "pointer", width: "32px", height: "32px",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 10
          }}
        >
          <X size={20} />
        </button>

        {/* HEADER */}
        <div style={{ padding: "32px 24px 24px", flexShrink: 0, borderBottom: "2px solid #000" }}>
          <p style={{ fontSize: "10px", fontWeight: 900, color: "#E31B23", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "8px" }}>
            CONTROLE DE PERFORMANCE
          </p>
          <h2 className="font-display" style={{ fontSize: "32px", lineHeight: 0.9, color: "#000", textTransform: "uppercase" }}>
            REGISTRAR <br />NOVA MARCA
          </h2>
        </div>

        {/* SCROLLABLE FORM */}
        <div style={{ flex: 1, overflowY: "auto", padding: "32px 24px", scrollbarWidth: "none" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            
            {/* MOVIMENTO */}
            <div>
              <label style={{ fontSize: "10px", fontWeight: 900, color: "#000", letterSpacing: "0.1em", display: "block", marginBottom: "12px", textTransform: "uppercase" }}>MOVIMENTO / EXERCÍCIO</label>
              <input 
                value={movementName}
                onChange={(e) => setMovementName(e.target.value)}
                placeholder="Ex: SNATCH, FRAN..."
                style={{
                  width: "100%", background: "#FFF", border: "2px solid #000",
                  padding: "16px", color: "#000", fontSize: "16px", fontWeight: 900, outline: "none",
                  boxShadow: "4px 4px 0px #f0f0f0"
                }}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              {/* RESULTADO */}
              <div>
                <label style={{ fontSize: "10px", fontWeight: 900, color: "#000", letterSpacing: "0.1em", display: "block", marginBottom: "12px", textTransform: "uppercase" }}>RESULTADO</label>
                <input 
                  type="number"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="0.00"
                  style={{
                    width: "100%", background: "#FFF", border: "2px solid #000",
                    padding: "16px", color: "#000", fontSize: "20px", fontWeight: 900, outline: "none",
                    boxShadow: "4px 4px 0px #f0f0f0"
                  }}
                />
              </div>

              {/* UNIDADE */}
              <div>
                <label style={{ fontSize: "10px", fontWeight: 900, color: "#000", letterSpacing: "0.1em", display: "block", marginBottom: "12px", textTransform: "uppercase" }}>UNIDADE</label>
                <select 
                  value={unit}
                  onChange={(e) => setUnit(e.target.value as "kg" | "time" | "reps")}
                  style={{
                    width: "100%", background: "#FFF", border: "2px solid #000",
                    padding: "18px", color: "#000", fontSize: "14px", fontWeight: 900, outline: "none",
                    appearance: "none", borderRadius: "0"
                  }}
                >
                  <option value="kg">KG (PESO)</option>
                  <option value="reps">REPETIÇÕES</option>
                  <option value="time">TEMPO (SEG)</option>
                </select>
              </div>
            </div>

            {/* CATEGORIA */}
            <div>
              <label style={{ fontSize: "10px", fontWeight: 900, color: "#000", letterSpacing: "0.1em", display: "block", marginBottom: "12px", textTransform: "uppercase" }}>CATEGORIA</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                {(["lpo", "strength", "gymnastics", "benchmark"] as const).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => { hapticSelect(); setCategory(cat); }}
                    style={{
                      padding: "12px 0", fontSize: "9px", fontWeight: 900, textTransform: "uppercase",
                      background: category === cat ? "#000" : "#FFF",
                      border: "2px solid #000",
                      color: category === cat ? "#FFF" : "#000",
                      cursor: "pointer", transition: "0.1s",
                      letterSpacing: "0.1em",
                      boxShadow: category === cat ? "none" : "3px 3px 0px #000",
                      transform: category === cat ? "translate(2px, 2px)" : "none",
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ fontSize: "10px", fontWeight: 900, color: "#000", letterSpacing: "0.1em", textTransform: "uppercase", display: "block", marginBottom: "16px" }}>REQUISITO TÉCNICO (NÍVEL)</label>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {ALL_LEVELS.map((lvlInfo, index) => {
                  const isSelected = level === lvlInfo.id;
                  const isLocked = index > maxLevelIndex;

                  return (
                    <button
                      key={lvlInfo.id}
                      disabled={isLocked}
                      onClick={() => { hapticSelect(); setLevel(lvlInfo.id); }}
                      style={{
                        width: "100%", height: "70px",
                        background: isSelected ? "#000" : "#FFF",
                        border: "2px solid #000",
                        color: isSelected ? "#FFF" : "#000",
                        fontSize: "12px", fontWeight: 900,
                        opacity: isLocked ? 0.2 : 1,
                        cursor: isLocked ? "not-allowed" : "pointer",
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "0 20px",
                        transition: "all 0.1s ease",
                        boxShadow: isSelected ? "none" : "4px 4px 0px rgba(0,0,0,0.05)",
                        transform: isSelected ? "translate(2px, 2px)" : "none",
                        position: "relative"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                        <div style={{ 
                          width: "32px", height: "32px", flexShrink: 0,
                          filter: isLocked ? "grayscale(100%)" : "none",
                          border: isSelected ? "1px solid #FFF" : "1px solid #000",
                          background: "#FFF", padding: "4px"
                        }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={lvlInfo.icon} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                        </div>
                        <div style={{ textAlign: "left" }}>
                          <span style={{ fontSize: "8px", color: isSelected ? "#FFF" : lvlInfo.color, display: "block", marginBottom: "2px", fontWeight: 900 }}>{lvlInfo.id}</span>
                          <span style={{ fontSize: "12px", letterSpacing: "0.1em", textTransform: "uppercase" }}>{lvlInfo.label}</span>
                        </div>
                      </div>
                      
                      {isLocked ? (
                        <Lock size={16} style={{ opacity: 0.5 }} />
                      ) : isSelected ? (
                        <CheckCircle size={20} color="#E31B23" />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>

          </div>
        </div>

        {/* FOOTER */}
        <div style={{ padding: "24px 24px 48px", borderTop: "2px solid #000", background: "#f9f9f9" }}>
          <button
            onClick={handleConfirm}
            disabled={!movementName || !value || loading}
            style={{
              width: "100%", padding: "22px", 
              background: movementName && value ? "#000" : "#ccc",
              border: "2px solid #000", 
              color: "#FFF", 
              fontSize: "14px", fontWeight: 900, 
              cursor: !movementName || !value || loading ? "not-allowed" : "pointer",
              textTransform: "uppercase", 
              letterSpacing: "0.2em",
              boxShadow: movementName && value ? "6px 6px 0px #E31B23" : "none"
            }}
          >
            {loading ? "PROCESSANDO..." : "CONFIRMAR REGISTRO"}
          </button>
        </div>

      </div>

      <style jsx global>{`
        @keyframes modalSlideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </div>
    </>
  );
}

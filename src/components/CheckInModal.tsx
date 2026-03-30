"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { performCheckIn } from "@/app/(student)/actions";
import { hapticSelect, hapticConfirm } from "@/lib/haptic";
import XpToast from "./XpToast";

interface CheckInModalProps {
  wodId: string;
  date: string; // YYYY-MM-DD
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * Modal de Seleção de Turma (Bottom Sheet).
 * Layout Final Otimizado (UX/UI Refinada).
 * Inclui Haptic Feedback e XP Toast pós-confirmação.
 */
export default function CheckInModal({ wodId, date, onClose, onSuccess }: CheckInModalProps) {
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  const dateObj = new Date(date + "T00:00:00Z");
  const isSaturday = dateObj.getUTCDay() === 6;

  const scheduleData = isSaturday 
    ? [
        { time: "06:30", period: "MANHÃ", vagas: 8, total: 20 },
        { time: "08:30", period: "MANHÃ", vagas: 15, total: 20 },
      ]
    : [
        { time: "05:00", period: "MANHÃ", vagas: 5, total: 20 },
        { time: "06:00", period: "MANHÃ", vagas: 12, total: 20 },
        { time: "07:00", period: "MANHÃ", vagas: 8, total: 20 },
        { time: "08:00", period: "MANHÃ", vagas: 18, total: 20 },
        { time: "11:00", period: "ALMOÇO", vagas: 10, total: 15 },
        { time: "16:00", period: "TARDE", vagas: 4, total: 20 },
        { time: "17:00", period: "TARDE", vagas: 15, total: 20 },
        { time: "18:00", period: "NOITE", vagas: 7, total: 25 },
        { time: "19:00", period: "NOITE", vagas: 22, total: 25 },
        { time: "20:00", period: "NOITE", vagas: 12, total: 25 },
      ];

  const formattedDate = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "short"
  }).format(dateObj).replace("-feira", "");

  const handleSlotSelect = (time: string) => {
    hapticSelect(); // Feedback tátil ao selecionar horário
    setSelectedSlot(time);
  };

  const handleConfirm = async () => {
    if (!selectedSlot) return;
    setLoading(true);

    const result = await performCheckIn(wodId, selectedSlot);
    setLoading(false);

    if (result.success) {
      hapticConfirm(); // Vibração de confirmação de sinalização
      onSuccess();
    } else {
      alert(result.error);
    }
  };

  return (
    <>
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: "rgba(0,0,0,0.85)", zIndex: 2000,
        display: "flex", alignItems: "flex-end", animation: "fadeIn 0.2s ease",
        backdropFilter: "blur(6px)"
      }}>
        <div style={{
          backgroundColor: "var(--surface-lowest)", 
          width: "100%", maxWidth: "480px", margin: "0 auto",
          borderTopLeftRadius: "24px", borderTopRightRadius: "24px",
          maxHeight: "85vh",
          display: "flex", flexDirection: "column", position: "relative",
          boxShadow: "0 -20px 60px rgba(0,0,0,0.6)",
          overflow: "hidden",
          border: "1px solid var(--border-glow)",
          borderBottom: "none"
        }}>
          
          {/* HEADER FIXO */}
          <div style={{ padding: "16px 24px 24px", flexShrink: 0, position: "relative" }}>
            <div onClick={onClose} style={{
              width: "36px", height: "4px", backgroundColor: "rgba(255,255,255,0.1)",
              borderRadius: "2px", margin: "0 auto 24px", cursor: "pointer"
            }} />
            
            <button 
              onClick={onClose}
              style={{
                position: "absolute", top: "24px", right: "24px",
                background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)",
                color: "var(--text-dim)", width: "30px", height: "30px", borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer"
              }}
            >
              <X size={18} />
            </button>

            <p style={{ fontSize: "8px", fontWeight: 800, color: "var(--red)", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "6px" }}>
              SINALIZAR CHECK-IN
            </p>
            <h2 className="font-display" style={{ fontSize: "22px", lineHeight: 1, letterSpacing: "-0.02em" }}>TREINO DE HOJE</h2>
            <p style={{ 
              fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", 
              marginTop: "8px", textTransform: "capitalize", letterSpacing: "0.02em"
            }}>
              {formattedDate}
            </p>
          </div>

          {/* ÁREA ROLÁVEL */}
          <div style={{ flex: 1, overflowY: "auto", padding: "0 24px", scrollbarWidth: "none" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", paddingBottom: "32px" }}>
              {scheduleData.map((slot) => {
                const isSelected = selectedSlot === slot.time;
                const occupancyPct = (slot.vagas / slot.total) * 100;

                return (
                  <div
                    key={slot.time}
                    onClick={() => handleSlotSelect(slot.time)}
                    style={{
                      padding: "16px 20px",
                      background: isSelected ? "var(--red)" : "rgba(255,255,255,0.02)",
                      border: `1px solid ${isSelected ? "var(--red)" : "rgba(255,255,255,0.04)"}`,
                      cursor: "pointer",
                      transition: "all 0.1s ease",
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "22px", fontWeight: 900, fontFamily: "var(--font-display)", color: isSelected ? "#fff" : "var(--text)", lineHeight: 1 }}>
                        {slot.time}
                      </div>
                      <div style={{ fontSize: "8px", fontWeight: 700, letterSpacing: "0.1em", color: isSelected ? "rgba(255,255,255,0.7)" : "var(--text-muted)", marginTop: "4px" }}>
                        {slot.period}
                      </div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "10px", fontWeight: 800, color: isSelected ? "#fff" : "var(--text-dim)", marginBottom: "6px" }}>
                        {slot.vagas}/{slot.total} VAGAS
                      </div>
                      <div style={{ width: "60px", height: "2px", backgroundColor: isSelected ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.05)", position: "relative" }}>
                        <div style={{ 
                          position: "absolute", left: 0, top: 0, height: "100%", width: `${occupancyPct}%`, 
                          backgroundColor: isSelected ? "#fff" : "var(--red)",
                        }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* FOOTER FIXO */}
          <div style={{ 
            padding: "20px 24px 40px", backgroundColor: "var(--surface-lowest)", 
            borderTop: "1px solid rgba(255,255,255,0.05)", flexShrink: 0 
          }}>
            <button
              onClick={handleConfirm}
              disabled={!selectedSlot || loading}
              style={{
                width: "100%", padding: "18px", background: selectedSlot ? "var(--red)" : "rgba(255,255,255,0.03)",
                border: "none", color: selectedSlot ? "#fff" : "rgba(255,255,255,0.15)", fontSize: "11px", fontWeight: 900,
                letterSpacing: "0.2em", cursor: !selectedSlot || loading ? "not-allowed" : "pointer",
                textTransform: "uppercase", fontFamily: "var(--font-display)",
                boxShadow: selectedSlot ? "0 0 40px rgba(227,27,35,0.25)" : "none",
                transition: "all 0.3s ease",
                borderRadius: "2px"
              }}
            >
              {loading ? "PROCESSANDO..." : selectedSlot ? `CONFIRMAR ${selectedSlot}` : "ESCOLHA UM HORÁRIO"}
            </button>
          </div>
        </div>

        <style jsx global>{`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(30px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
    </>
  );
}

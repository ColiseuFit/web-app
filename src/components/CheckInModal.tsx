"use client";

import { useState, useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import { performCheckIn, getAvailableSlots } from "@/app/(student)/actions";
import { hapticSelect, hapticConfirm } from "@/lib/haptic";
import PointsToast from "./PointsToast";

interface CheckInModalProps {
  wodId: string;
  date: string; // YYYY-MM-DD
  onClose: () => void;
  onSuccess: () => void;
}

interface DynamicSlot {
  id: string;
  time_start: string;
  capacity: number;
  name: string;
  occupancy?: number;
}

/**
 * Modal de Seleção de Turma (Bottom Sheet).
 * Grade Dinâmica: Busca horários reais configurados pelo Gestor.
 */
export default function CheckInModal({ wodId, date, onClose, onSuccess }: CheckInModalProps) {
  const [slots, setSlots] = useState<DynamicSlot[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [loadingSubmit, setLoadingSubmit] = useState(false);

  useEffect(() => {
    async function loadSlots() {
      setLoadingSlots(true);
      const res = await getAvailableSlots(date);
      if (res.data) {
        setSlots(res.data.map(s => ({
          id: s.id,
          time_start: s.time_start.slice(0, 5),
          capacity: s.capacity,
          name: s.name,
          occupancy: 0 // TODO: Buscar ocupação real do dia no futuro
        })));
      }
      setLoadingSlots(false);
    }
    loadSlots();

    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [date]);

  const dateObj = new Date(date + "T00:00:00Z");

  const getPeriod = (time: string) => {
    const hour = parseInt(time.split(":")[0]);
    if (hour < 11) return "MANHÃ";
    if (hour < 14) return "ALMOÇO";
    if (hour < 18) return "TARDE";
    return "NOITE";
  };

  const formattedDate = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC"
  }).format(dateObj).replace("-feira", "");

  const todayStr = new Date().toLocaleDateString("en-CA");
  const isToday = date === todayStr;

  const handleSlotSelect = (id: string, time: string) => {
    hapticSelect();
    setSelectedSlotId(id);
    setSelectedTime(time);
  };

  const handleConfirm = async () => {
    if (!selectedSlotId || !selectedTime) return;
    setLoadingSubmit(true);

    const result = await performCheckIn(wodId, selectedTime, selectedSlotId);
    setLoadingSubmit(false);

    if (result.success) {
      hapticConfirm();
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
            <h2 className="font-display" style={{ fontSize: "22px", lineHeight: 1, letterSpacing: "-0.02em" }}>
              {isToday ? "TREINO DE HOJE" : "TREINO DO DIA"}
            </h2>
            <p style={{ 
              fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", 
              marginTop: "8px", textTransform: "capitalize", letterSpacing: "0.02em"
            }}>
              {formattedDate}
            </p>
          </div>

          {/* ÁREA ROLÁVEL */}
          <div style={{ flex: 1, overflowY: "auto", padding: "0 24px", scrollbarWidth: "none" }}>
            {loadingSlots ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px", gap: "12px" }}>
                <Loader2 size={24} className="animate-spin" style={{ color: "var(--red)" }} />
                <span style={{ fontSize: "10px", fontWeight: 800, color: "var(--text-dim)", letterSpacing: "0.1em" }}>BUSCANDO GRADE...</span>
              </div>
            ) : slots.length === 0 ? (
              <div style={{ padding: "40px 20px", textAlign: "center", background: "rgba(255,255,255,0.01)", border: "1px dashed rgba(255,255,255,0.05)" }}>
                <p style={{ fontSize: "12px", color: "var(--text-dim)", fontWeight: 600 }}>Nenhuma turma disponível para este dia.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", paddingBottom: "32px" }}>
                {slots.map((slot) => {
                  const isSelected = selectedSlotId === slot.id;
                  const period = getPeriod(slot.time_start);

                  return (
                    <div
                      key={slot.id}
                      onClick={() => handleSlotSelect(slot.id, slot.time_start)}
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
                          {slot.time_start}
                        </div>
                        <div style={{ fontSize: "8px", fontWeight: 700, letterSpacing: "0.1em", color: isSelected ? "rgba(255,255,255,0.7)" : "var(--text-muted)", marginTop: "4px" }}>
                          {slot.name.toUpperCase()} • {period}
                        </div>
                      </div>

                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "10px", fontWeight: 800, color: isSelected ? "#fff" : "var(--text-dim)", marginBottom: "6px" }}>
                          {slot.capacity} VAGAS
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* FOOTER FIXO */}
          <div style={{ 
            padding: "20px 24px 40px", backgroundColor: "var(--surface-lowest)", 
            borderTop: "1px solid rgba(255,255,255,0.05)", flexShrink: 0 
          }}>
            <button
              onClick={handleConfirm}
              disabled={!selectedSlotId || loadingSubmit}
              style={{
                width: "100%", padding: "18px", background: selectedSlotId ? "var(--red)" : "rgba(255,255,255,0.03)",
                border: "none", color: selectedSlotId ? "#fff" : "rgba(255,255,255,0.15)", fontSize: "11px", fontWeight: 900,
                letterSpacing: "0.2em", cursor: !selectedSlotId || loadingSubmit ? "not-allowed" : "pointer",
                textTransform: "uppercase", fontFamily: "var(--font-display)",
                boxShadow: selectedSlotId ? "0 0 40px rgba(227,27,35,0.25)" : "none",
                transition: "all 0.3s ease",
                borderRadius: "2px"
              }}
            >
              {loadingSubmit ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                  <Loader2 size={16} className="animate-spin" />
                  <span>PROCESSANDO...</span>
                </div>
              ) : selectedSlotId ? `CONFIRMAR ${selectedTime}` : "ESCOLHA UM HORÁRIO"}
            </button>
          </div>
        </div>

        <style jsx global>{`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(30px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-spin {
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </>
  );
}

"use client";

import { useState, useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import { performCheckIn, getAvailableSlots } from "@/app/(student)/actions";
import { hapticSelect, hapticConfirm } from "@/lib/haptic";
import PointsToast from "./PointsToast";
import { getTodayDate } from "@/lib/date-utils";

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
  is_past?: boolean;
  is_finished?: boolean;
}

/**
 * Modal de Seleção de Turma (Bottom Sheet).
 * Grade Dinâmica: Busca horários reais configurados pelo Gestor.
 */
import { createPortal } from "react-dom";

export default function CheckInModal({ wodId, date, onClose, onSuccess }: CheckInModalProps) {
  const [slots, setSlots] = useState<DynamicSlot[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    async function loadSlots() {
      setLoadingSlots(true);
      const res = await getAvailableSlots(date);
      if (res.data) {
        // Exibir TODOS os slots, incluindo passados/finalizados (renderizados como desabilitados)
        setSlots(res.data.map(s => ({
          id: s.id,
          time_start: s.time_start.slice(0, 5),
          capacity: s.capacity,
          name: s.name,
          occupancy: 0,
          is_past: s.is_past,
          is_finished: s.is_finished
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

  if (!mounted) return null;

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

  const todayStr = getTodayDate();
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

  const modalContent = (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: "rgba(0,0,0,0.8)", zIndex: 9999,
      display: "flex", alignItems: "flex-end", animation: "nbFadeIn 0.2s ease-out",
      backdropFilter: "blur(4px)"
    }}>
      <div 
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: "#FFF", 
          width: "100%", maxWidth: "480px", margin: "0 auto",
          borderTopLeftRadius: "0px", borderTopRightRadius: "0px",
          borderTop: "4px solid #000",
          maxHeight: "85vh",
          display: "flex", flexDirection: "column", position: "relative",
          boxShadow: "0 -20px 0px rgba(0,0,0,0.1)",
          overflow: "hidden",
        }}
      >
        
        {/* HEADER FIXO */}
        <div style={{ padding: "16px 24px 24px", flexShrink: 0, position: "relative", borderBottom: "2px solid #000" }}>
          <div onClick={onClose} style={{
            width: "40px", height: "4px", backgroundColor: "#000",
            borderRadius: "0px", margin: "0 auto 20px", cursor: "pointer"
          }} />
          
          <button 
            onClick={onClose}
            style={{
              position: "absolute", top: "24px", right: "24px",
              background: "#000", border: "2px solid #000",
              color: "#FFF", width: "32px", height: "32px", borderRadius: "0px",
              display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
              boxShadow: "2px 2px 0px rgba(0,0,0,0.2)"
            }}
          >
            <X size={20} />
          </button>

          <p style={{ fontSize: "9px", fontWeight: 900, color: "var(--nb-red)", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "4px" }}>
            SINALIZAR CHECK-IN
          </p>
          <h2 className="font-display" style={{ fontSize: "28px", lineHeight: 1, letterSpacing: "-0.04em", fontWeight: 900, color: "#000" }}>
            {isToday ? "TREINO DE HOJE" : "TREINO DO DIA"}
          </h2>
          <p style={{ 
            fontSize: "11px", fontWeight: 800, color: "rgba(0,0,0,0.5)", 
            marginTop: "6px", textTransform: "capitalize", letterSpacing: "0.02em"
          }}>
            {formattedDate}
          </p>
        </div>

        {/* ÁREA ROLÁVEL */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px", scrollbarWidth: "none" }} className="hide-scrollbar">
          {loadingSlots ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px", gap: "12px" }}>
              <Loader2 size={32} className="nb-spin" style={{ color: "var(--nb-red)" }} />
              <span style={{ fontSize: "10px", fontWeight: 900, color: "#000", letterSpacing: "0.1em" }}>BUSCANDO GRADE...</span>
            </div>
          ) : slots.length === 0 ? (
            <div style={{ padding: "40px 20px", textAlign: "center", background: "#f8f8f8", border: "2px dashed #000" }}>
              <p style={{ fontSize: "12px", color: "#000", fontWeight: 800, textTransform: "uppercase" }}>Nenhuma turma disponível para este dia.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", paddingBottom: "32px" }}>
              {slots.map((slot) => {
                const isSelected = selectedSlotId === slot.id;
                const period = getPeriod(slot.time_start);
                const isDisabled = slot.is_past || slot.is_finished;
                const disabledLabel = slot.is_finished ? "ENCERRADA" : "EXPIRADA";

                return (
                  <div
                    key={slot.id}
                    onClick={() => !isDisabled && handleSlotSelect(slot.id, slot.time_start)}
                    style={{
                      padding: "18px 20px",
                      background: isDisabled ? "#f0f0f0" : isSelected ? "var(--nb-red)" : "#FFF",
                      border: "2px solid #000",
                      boxShadow: isDisabled ? "none" : isSelected ? "none" : "4px 4px 0px #000",
                      cursor: isDisabled ? "not-allowed" : "pointer",
                      opacity: isDisabled ? 0.6 : 1,
                      transition: "all 0.1s ease",
                      transform: isSelected ? "translate(2px, 2px)" : "none",
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      position: "relative",
                      overflow: "hidden",
                    }}
                  >
                    {/* Linha de risco nos disabled */}
                    {isDisabled && (
                      <div style={{
                        position: "absolute",
                        top: "50%",
                        left: 0,
                        right: 0,
                        height: "2px",
                        background: "rgba(0,0,0,0.25)",
                        pointerEvents: "none",
                      }} />
                    )}

                    <div style={{ flex: 1 }}>
                      <div className="font-display" style={{
                        fontSize: "28px", fontWeight: 900, lineHeight: 1,
                        color: isDisabled ? "rgba(0,0,0,0.35)" : isSelected ? "#FFF" : "#000",
                        textDecoration: isDisabled ? "line-through" : "none",
                      }}>
                        {slot.time_start}
                      </div>
                      <div style={{
                        fontSize: "9px", fontWeight: 900, letterSpacing: "0.1em", marginTop: "4px",
                        color: isDisabled ? "rgba(0,0,0,0.3)" : isSelected ? "rgba(255,255,255,0.8)" : "rgba(0,0,0,0.5)",
                      }}>
                        {slot.name.toUpperCase()} • {period}
                      </div>
                    </div>

                    <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
                      {isDisabled ? (
                        <div style={{
                          fontSize: "8px", fontWeight: 900, letterSpacing: "0.15em",
                          color: "rgba(0,0,0,0.4)", background: "rgba(0,0,0,0.08)",
                          padding: "3px 6px", border: "1px solid rgba(0,0,0,0.15)",
                        }}>
                          {disabledLabel}
                        </div>
                      ) : (
                        <div style={{ fontSize: "11px", fontWeight: 900, color: isSelected ? "#FFF" : "#000", letterSpacing: "0.05em" }}>
                          {slot.capacity} VAGAS
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* FOOTER FIXO */}
        <div style={{ 
          padding: "20px 24px 40px", backgroundColor: "#FFF", 
          borderTop: "2px solid #000", flexShrink: 0 
        }}>
          <button
            onClick={handleConfirm}
            disabled={!selectedSlotId || loadingSubmit}
            style={{
              width: "100%", padding: "20px", 
              background: selectedSlotId ? "var(--nb-red)" : "#f0f0f0",
              border: "2px solid #000", 
              color: selectedSlotId ? "#FFF" : "rgba(0,0,0,0.3)", 
              fontSize: "13px", fontWeight: 900,
              letterSpacing: "0.2em", cursor: !selectedSlotId || loadingSubmit ? "not-allowed" : "pointer",
              textTransform: "uppercase", 
              boxShadow: selectedSlotId ? "4px 4px 0px #000" : "none",
              transition: "all 0.2s ease",
              transform: selectedSlotId ? "none" : "none",
            }}
            className={selectedSlotId ? "nb-button-main" : ""}
          >
            {loadingSubmit ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                <Loader2 size={18} className="nb-spin" />
                <span>PROCESSANDO...</span>
              </div>
            ) : selectedSlotId ? `CONFIRMAR ${selectedTime}` : "ESCOLHA UM HORÁRIO"}
          </button>
        </div>

        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes nbFadeIn {
            from { opacity: 0; transform: translateY(40px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .nb-spin {
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          .hide-scrollbar::-webkit-scrollbar { display: none; }
        `}} />
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

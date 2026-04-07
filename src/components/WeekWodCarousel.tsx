"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, ArrowLeft, ArrowRight } from "lucide-react";
import { hapticSelect } from "@/lib/haptic";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { SYSTEM_START_DATE } from "@/lib/constants/calendar";
import { getMinWeekOffset } from "@/lib/date-utils";

interface WodDay {
  date: string;
  dayLabel: string;
  isToday: boolean;
  isRest: boolean;
  title: string;
  tags: string[];
}

interface WeekWodCarouselProps {
  wods: WodDay[];
  selectedDate: string;
  weekOffset: number;
  maxWeeks: number;
}

/**
 * Carrossel horizontal de WODs da semana com Navegação entre semanas.
 * 
 * @param weekOffset Indice da semana atual (0 = hoje)
 * @param maxWeeks Limite de semanas futuras permitidas pelas configurações da Box.
 */
export default function WeekWodCarousel({ wods, selectedDate, weekOffset, maxWeeks }: WeekWodCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLAnchorElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (selectedRef.current && scrollRef.current) {
      selectedRef.current.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }, [selectedDate, wods]);

  const scrollBy = (direction: "left" | "right") => {
    hapticSelect();
    scrollRef.current?.scrollBy({ left: direction === "left" ? -120 : 120, behavior: "smooth" });
  };

  const changeWeek = (newOffset: number) => {
    hapticSelect();
    router.push(`/dashboard?weekOffset=${newOffset}`);
  };

  const minWeekOffset = getMinWeekOffset(SYSTEM_START_DATE);
  const canGoNext = weekOffset < (maxWeeks - 1);
  const canGoPrev = weekOffset > minWeekOffset;

  return (
    <div style={{ position: "relative", margin: "0 0 24px" }}>
      
      {/* ── NAVEGAÇÃO DE SEMANA (WEEKS) ── */}
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center", 
        padding: "0 20px", 
        marginBottom: "12px" 
      }}>
        <button 
          onClick={() => changeWeek(weekOffset - 1)}
          disabled={!canGoPrev}
          style={{ 
            background: "#FFF", color: "#000", border: "2px solid #000", padding: "6px 10px", 
            opacity: canGoPrev ? 1 : 0.2, cursor: canGoPrev ? "pointer" : "default",
            display: "flex", alignItems: "center", gap: "6px", fontSize: "10px", fontWeight: 900,
            boxShadow: canGoPrev ? "3px 3px 0px #000" : "none",
            transform: "none"
          }}
        >
          <ArrowLeft size={14} /> <span style={{ display: "none" }}>PREV</span>
        </button>

        <div style={{ textAlign: "center" }}>
          <span style={{ fontSize: "10px", fontWeight: 900, color: "#000", textTransform: "uppercase", letterSpacing: "0.1em", display: "block" }}>
            {weekOffset === 0 ? "SEMANA ATUAL" : (weekOffset > 0 ? `EM ${weekOffset} SEMANAS` : `${Math.abs(weekOffset)} SEM. ATRÁS`)}
          </span>
          <span style={{ fontSize: "9px", fontWeight: 600, color: "#666", textTransform: "uppercase" }}>
            {new Date(wods[0].date + "T00:00:00Z").toLocaleDateString('pt-BR', { timeZone: 'UTC', day: '2-digit', month: 'short' })} — {new Date(wods[wods.length-1].date + "T00:00:00Z").toLocaleDateString('pt-BR', { timeZone: 'UTC', day: '2-digit', month: 'short' })}
          </span>
        </div>

        <button 
          onClick={() => changeWeek(weekOffset + 1)}
          disabled={!canGoNext}
          style={{ 
            background: "#FFF", color: "#000", border: "2px solid #000", padding: "6px 10px", 
            opacity: canGoNext ? 1 : 0.2, cursor: canGoNext ? "pointer" : "default",
            display: "flex", alignItems: "center", gap: "6px", fontSize: "10px", fontWeight: 900,
            boxShadow: canGoNext ? "3px 3px 0px #000" : "none"
          }}
        >
          <span style={{ display: "none" }}>NEXT</span> <ArrowRight size={14} />
        </button>
      </div>

      <div style={{ position: "relative" }}>
        {/* Seta Esquerda (Scroll) */}
        <button
          onClick={() => scrollBy("left")}
          style={{
            position: "absolute", left: "4px", top: "50%", transform: "translateY(-50%)",
            zIndex: 10, background: "#000", border: "2px solid #000",
            color: "#FFF", width: "24px", height: "36px",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", borderRadius: "0px",
            boxShadow: "2px 2px 0px #000"
          }}
          className="nb-button-tap"
        >
          <ChevronLeft size={16} />
        </button>

        {/* Seta Direita (Scroll) */}
        <button
          onClick={() => scrollBy("right")}
          style={{
            position: "absolute", right: "4px", top: "50%", transform: "translateY(-50%)",
            zIndex: 10, background: "#000", border: "2px solid #000",
            color: "#FFF", width: "24px", height: "36px",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", borderRadius: "0px",
            boxShadow: "2px 2px 0px #000"
          }}
          className="nb-button-tap"
        >
          <ChevronRight size={16} />
        </button>

        {/* Lista Rolável */}
        <div
          ref={scrollRef}
          style={{
            display: "flex", overflowX: "auto", gap: "10px",
            margin: "0 32px", padding: "8px 0", scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
          className="hide-scrollbar"
        >
          {wods.map((wod) => {
            const isSelected = wod.date === selectedDate;
            const dateObj = new Date(wod.date + "T00:00:00Z");
            const dayNum = dateObj.getUTCDate();
            const month = dateObj.toLocaleDateString("pt-BR", { month: "short", timeZone: "UTC" });

            return (
              <Link
                key={wod.date}
                href={`/dashboard?date=${wod.date}&weekOffset=${weekOffset}`}
                ref={isSelected ? (selectedRef as React.Ref<HTMLAnchorElement>) : undefined}
                onClick={hapticSelect}
                style={{
                  textDecoration: "none", flexShrink: 0,
                  display: "flex", flexDirection: "column", alignItems: "center",
                  padding: "12px 0", width: "70px", height: "85px",
                  justifyContent: "center",
                  background: isSelected ? "var(--nb-red)" : "#FFF",
                  border: "2px solid #000",
                  boxShadow: isSelected ? "none" : "4px 4px 0px #000",
                  color: isSelected ? "#fff" : "#000",
                  transition: "all 0.1s ease",
                  transform: isSelected ? "translate(2px, 2px)" : "none",
                  position: "relative"
                }}
              >
                <span className="font-headline" style={{ 
                  fontSize: "8px", 
                  fontWeight: 900, 
                  letterSpacing: "0.1em", 
                  textTransform: "uppercase", 
                  color: isSelected ? "#FFF" : "rgba(0,0,0,0.4)", 
                  marginBottom: "4px" 
                }}>
                  {wod.dayLabel}
                </span>
                <span className="font-display" style={{ 
                  fontSize: "24px", 
                  lineHeight: 1, 
                  fontWeight: 900, 
                  color: isSelected ? "#FFF" : (wod.isToday ? "var(--nb-red)" : "#000") 
                }}>
                  {dayNum}
                </span>
                <span style={{ 
                  fontSize: "9px", 
                  fontWeight: 800,
                  color: isSelected ? "#FFF" : "rgba(0,0,0,0.4)", 
                  marginTop: "2px", 
                  textTransform: "uppercase", 
                  letterSpacing: "0.05em" 
                }}>
                  {month}
                </span>

                {wod.isToday && !isSelected && (
                  <div style={{
                    position: "absolute",
                    top: "4px",
                    right: "4px",
                    width: "6px",
                    height: "6px",
                    background: "var(--nb-red)",
                    border: "1px solid #000",
                  }} />
                )}
              </Link>
            );
          })}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .nb-button-tap:active { transform: translateY(-50%) scale(0.95); }
      `}} />
    </div>
  );
}

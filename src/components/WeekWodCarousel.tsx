"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { hapticSelect } from "@/lib/haptic";
import { useEffect, useRef } from "react";

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
}

/**
 * Carrossel horizontal de WODs da semana.
 * Auto-centraliza o dia selecionado e inclui navegação por setas e haptic feedback.
 */
export default function WeekWodCarousel({ wods, selectedDate }: WeekWodCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (selectedRef.current && scrollRef.current) {
      selectedRef.current.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }, [selectedDate]);

  const scrollBy = (direction: "left" | "right") => {
    hapticSelect();
    scrollRef.current?.scrollBy({ left: direction === "left" ? -120 : 120, behavior: "smooth" });
  };

  return (
    <div style={{ position: "relative", margin: "0 0 24px" }}>
      {/* Seta Esquerda */}
      <button
        onClick={() => scrollBy("left")}
        style={{
          position: "absolute", left: "8px", top: "50%", transform: "translateY(-50%)",
          zIndex: 10, background: "#000", border: "2px solid #000",
          color: "#FFF", width: "32px", height: "32px",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", borderRadius: "0px",
          boxShadow: "4px 4px 0px #000"
        }}
        className="nb-button-tap"
      >
        <ChevronLeft size={20} />
      </button>

      {/* Seta Direita */}
      <button
        onClick={() => scrollBy("right")}
        style={{
          position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)",
          zIndex: 10, background: "#000", border: "2px solid #000",
          color: "#FFF", width: "32px", height: "32px",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", borderRadius: "0px",
          boxShadow: "4px 4px 0px #000"
        }}
        className="nb-button-tap"
      >
        <ChevronRight size={20} />
      </button>

      {/* Lista Rolável */}
      <div
        ref={scrollRef}
        style={{
          display: "flex", overflowX: "auto", gap: "12px",
          margin: "0 48px", padding: "16px 0", scrollbarWidth: "none",
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
              href={`/dashboard?date=${wod.date}`}
              ref={isSelected ? (selectedRef as React.Ref<HTMLAnchorElement>) : undefined}
              onClick={hapticSelect}
              style={{
                textDecoration: "none", flexShrink: 0,
                display: "flex", flexDirection: "column", alignItems: "center",
                padding: "14px 0", width: "80px", height: "100px",
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
                fontSize: "9px", 
                fontWeight: 900, 
                letterSpacing: "0.1em", 
                textTransform: "uppercase", 
                color: isSelected ? "#FFF" : "rgba(0,0,0,0.4)", 
                marginBottom: "4px" 
              }}>
                {wod.dayLabel}
              </span>
              <span className="font-display" style={{ 
                fontSize: "26px", 
                lineHeight: 1, 
                fontWeight: 900, 
                color: isSelected ? "#FFF" : (wod.isToday ? "var(--nb-red)" : "#000") 
              }}>
                {wod.isRest ? "🛡" : dayNum}
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

      <style dangerouslySetInnerHTML={{ __html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .nb-button-tap:active { transform: translateY(-50%) scale(0.95); }
      `}} />
    </div>
  );
}

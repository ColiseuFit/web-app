"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Calendar, RotateCcw } from "lucide-react";
import { getTodayDate } from "@/lib/date-utils";

/**
 * Componente de navegação por data para o Portal do Coach.
 * Permite retroceder e avançar datas via searchParams.
 */
export default function DateNavigator({ activeDateStr }: { activeDateStr: string }) {
  const router = useRouter();
  const today = getTodayDate();
  
  const handleNavigate = (days: number) => {
    const current = new Date(activeDateStr + "T00:00:00Z");
    current.setUTCDate(current.getUTCDate() + days);
    const newDateStr = current.toISOString().split("T")[0];
    router.push(`/coach?date=${newDateStr}`);
  };

  const handleGoToToday = () => {
    router.push("/coach");
  };

  const isToday = activeDateStr === today;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "24px" }}>
      <div style={{ 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "space-between",
        background: "#FFF",
        border: "3px solid #000",
        boxShadow: "4px 4px 0px #000",
        padding: "4px"
      }}>
        {/* Voltar 1 Dia */}
        <button 
          onClick={() => handleNavigate(-1)}
          aria-label="Dia Anterior"
          style={{ 
            background: "#F7F7F7", 
            color: "#000", 
            border: "2px solid #000", 
            padding: "10px", 
            cursor: "pointer", 
            display: "flex", 
            alignItems: "center",
            boxShadow: "2px 2px 0px #000"
          }}
        >
          <ChevronLeft size={20} strokeWidth={3} />
        </button>

        {/* Data Central */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Calendar size={18} />
          <div style={{ textAlign: "center" }}>
            <div className="font-display" style={{ fontSize: "18px", fontWeight: 900, lineHeight: 1, textTransform: "uppercase", color: "#000" }}>
              {new Date(activeDateStr + "T00:00:00Z").toLocaleDateString("pt-BR", { 
                day: "2-digit", 
                month: "short", 
                weekday: "short",
                timeZone: "UTC" 
              }).replace(".", "")}
            </div>
            {isToday && (
              <div style={{ fontSize: "10px", fontWeight: 800, color: "var(--red)", marginTop: "2px" }}>• HOJE</div>
            )}
          </div>
        </div>

        {/* Avançar 1 Dia */}
        <button 
          onClick={() => handleNavigate(1)}
          aria-label="Próximo Dia"
          style={{ 
            background: "#F7F7F7", 
            color: "#000", 
            border: "2px solid #000", 
            padding: "10px", 
            cursor: "pointer", 
            display: "flex", 
            alignItems: "center",
            boxShadow: "2px 2px 0px #000"
          }}
        >
          <ChevronRight size={20} strokeWidth={3} />
        </button>
      </div>

      {/* Botão de rápido retorno para HOJE */}
      {!isToday && (
        <button 
          onClick={handleGoToToday}
          className="font-headline"
          style={{
            background: "#000",
            color: "#FFF",
            border: "2px solid #000",
            padding: "8px",
            fontSize: "11px",
            fontWeight: 800,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            boxShadow: "2px 2px 0px #000"
          }}
        >
          <RotateCcw size={14} />
          VOLTAR PARA HOJE
        </button>
      )}
    </div>
  );
}

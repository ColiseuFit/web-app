"use client";

import { useEffect, useState } from "react";

export default function TvClock() {
  const [time, setTime] = useState<string>("");
  const [dateStr, setDateStr] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      
      // Formatar hora
      setTime(
        now.toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        })
      );

      // Formatar data
      const options: Intl.DateTimeFormatOptions = {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      };
      
      const formattedDate = now.toLocaleDateString("pt-BR", options);
      // Capitalizar a primeira letra do dia da semana e do mês
      setDateStr(formattedDate.toUpperCase());
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div 
      className="flex flex-col items-center justify-center text-center bg-white border-2 border-black shadow-[3px_3px_0px_#000] rounded-none group"
      style={{
        padding: "10px 20px",
        minWidth: "220px"
      }}
    >
      <div className="flex items-center self-start md:self-center" style={{ gap: "6px", marginBottom: "4px" }}>
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
        </span>
        <span className="font-display font-black text-[9px] text-neutral-400 uppercase tracking-widest">
          SISTEMA DE HORA OFICIAL
        </span>
      </div>
      <span className="font-headline font-black text-3xl md:text-4xl tracking-tight text-black font-mono leading-none">
        {time || "00:00:00"}
      </span>
      <span className="font-display font-bold text-[10px] tracking-wide text-neutral-500 mt-1.5 uppercase">
        {dateStr || "CARREGANDO DATA..."}
      </span>
    </div>
  );
}

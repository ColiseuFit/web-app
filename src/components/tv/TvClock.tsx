"use client";

import { useEffect, useState } from "react";

/**
 * Componente de relógio e data brutalista para o Coliseu TV.
 * Exibe a hora atualizada a cada segundo (HH:MM:SS) e a data formatada
 * por extenso em UTC/Local do navegador (Capitalizada em caixa alta).
 * 
 * @returns {React.ReactElement} O widget do relógio no estilo brutalista do box.
 */
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
        padding: "12px 20px",
        minWidth: "220px"
      }}
    >
      <span className="font-headline font-black text-3xl md:text-4xl tracking-tight text-black font-mono leading-none">
        {time || "00:00:00"}
      </span>
      <span className="font-display font-bold text-lg tracking-wide text-neutral-500 mt-1.5 uppercase">
        {dateStr || "CARREGANDO DATA..."}
      </span>
    </div>
  );
}

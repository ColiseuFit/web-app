"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { getTvData, TvDataResponse, TvClassSlot } from "./actions";
import TvClock from "@/components/tv/TvClock";
import TvStudentGrid from "@/components/tv/TvStudentGrid";
import { ChevronLeft, ChevronRight, RefreshCw, Layers, User } from "lucide-react";

export default function TvClient() {
  const [data, setData] = useState<TvDataResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number>(-1);
  const [isAutoMode, setIsAutoMode] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const autoModeTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Busca dados do banco de forma silenciosa ou com loading inicial
  const fetchData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setIsRefreshing(true);
    
    const response = await getTvData();
    
    if (response.error) {
      setError(response.error);
    } else if (response.data) {
      setData(response.data);
      setError(null);
    }
    
    setLoading(false);
    setIsRefreshing(false);
  }, []);

  // Polling periódico (a cada 15 segundos) para manter check-ins atualizados
  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      fetchData(true);
    }, 15000);

    return () => clearInterval(interval);
  }, [fetchData]);

  // Lógica para encontrar o slot mais próximo do horário atual
  const getClosestSlotIndex = useCallback((slots: TvClassSlot[]): number => {
    if (!slots || slots.length === 0) return -1;
    
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    let closestIndex = 0;
    let minDifference = Infinity;

    slots.forEach((slot, index) => {
      const [hours, minutes] = slot.time_start.split(":").map(Number);
      const slotMinutes = hours * 60 + minutes;

      // Diferença absoluta em minutos
      const difference = Math.abs(currentMinutes - slotMinutes);

      // Regra de Box: se estiver dentro de uma janela de 15min antes e 45min depois do início
      // da aula, essa turma ganha prioridade extrema.
      const isWithinClassWindow = currentMinutes >= (slotMinutes - 15) && currentMinutes <= (slotMinutes + 45);

      if (isWithinClassWindow) {
        // Encontrou a turma na janela correta, retorna de imediato
        minDifference = difference;
        closestIndex = index;
      } else if (difference < minDifference && minDifference > 60) {
        // Fallback: se não estiver em nenhuma janela, escolhe o horário cronologicamente mais próximo
        minDifference = difference;
        closestIndex = index;
      }
    });

    return closestIndex;
  }, []);

  // Auto-ajusta o slot em exibição se estiver em Modo Automático
  useEffect(() => {
    if (isAutoMode && data && data.slots.length > 0) {
      const closestIndex = getClosestSlotIndex(data.slots);
      if (closestIndex !== -1) {
        setSelectedSlotIndex(closestIndex);
      }
    }
  }, [isAutoMode, data, getClosestSlotIndex]);

  // Monitoramento periódico do horário (a cada minuto) para trocar a turma automaticamente
  useEffect(() => {
    const handleTimeCheck = () => {
      if (isAutoMode && data && data.slots.length > 0) {
        const closestIndex = getClosestSlotIndex(data.slots);
        if (closestIndex !== -1 && closestIndex !== selectedSlotIndex) {
          setSelectedSlotIndex(closestIndex);
        }
      }
    };

    const interval = setInterval(handleTimeCheck, 60000);
    return () => clearInterval(interval);
  }, [isAutoMode, data, selectedSlotIndex, getClosestSlotIndex]);

  // Desativa o modo automático temporariamente ao interagir de forma manual
  const handleSlotChange = (index: number) => {
    if (!data || data.slots.length === 0) return;
    
    let targetIndex = index;
    if (index < 0) targetIndex = data.slots.length - 1;
    if (index >= data.slots.length) targetIndex = 0;

    setSelectedSlotIndex(targetIndex);
    setIsAutoMode(false);

    // Configura um timer de autocura: se o coach navegar manualmente, após 10 minutos de inatividade,
    // a TV retorna automaticamente ao modo de monitoramento automático.
    if (autoModeTimerRef.current) clearTimeout(autoModeTimerRef.current);
    autoModeTimerRef.current = setTimeout(() => {
      setIsAutoMode(true);
    }, 600000); // 10 minutos
  };

  useEffect(() => {
    return () => {
      if (autoModeTimerRef.current) clearTimeout(autoModeTimerRef.current);
    };
  }, []);

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#F5F5F5] p-6 text-black">
        <div className="flex flex-col items-center gap-4 bg-white border-3 border-black p-12 shadow-[8px_8px_0px_#000] text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-neutral-300 border-t-black"></div>
          <h2 className="font-headline font-black text-2xl uppercase mt-4">Sincronizando Coliseu TV...</h2>
          <p className="font-display font-bold text-neutral-500 text-xs tracking-wider uppercase">Preparando os motores e resgatando a grade do dia</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#F5F5F5] p-6 text-black">
        <div className="bg-red-100 border-3 border-red-500 p-8 shadow-[8px_8px_0px_#E31B23] text-center max-w-md">
          <span className="text-4xl">🚨</span>
          <h2 className="font-headline font-black text-2xl text-red-600 uppercase mt-4">Erro de Sincronização</h2>
          <p className="font-display font-bold text-black text-sm mt-2">{error}</p>
          <button 
            onClick={() => fetchData()} 
            className="mt-6 px-6 py-3 bg-red-600 text-white font-display font-black border-2 border-black uppercase text-sm shadow-[4px_4px_0px_#000] hover:translate-x-[-2px] hover:translate-y-[-2px] active:translate-x-[2px] active:translate-y-[2px] cursor-pointer"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  const currentSlot: TvClassSlot | undefined = data?.slots[selectedSlotIndex];

  // Parser altamente qualificado para transformar o texto bruto do WOD em blocos interativos e estilizados
  const renderWodContent = (content: string) => {
    if (!content) return null;
    return content.split("\n").map((line, idx) => {
      const trimmed = line.trim();
      if (!trimmed) return <div key={idx} style={{ height: "8px" }} />;

      // Detecção de Metas Principais (Ex: "5 RDS FOR TIME", "CAP 16'", "AMRAP", etc.)
      const isTarget = 
        trimmed.includes("RDS") || 
        trimmed.includes("CAP") || 
        trimmed.includes("ROUND") || 
        trimmed.includes("TIME") || 
        trimmed.includes("AMRAP") || 
        trimmed.includes("EMOM") ||
        trimmed.startsWith("FOR ");

      if (isTarget) {
        return (
          <div 
            key={idx} 
            className="relative overflow-hidden group"
            style={{
              margin: "12px 0",
              backgroundColor: "#000000",
              color: "#ffffff",
              border: "2px solid #000000",
              padding: "10px 14px",
              boxShadow: "3px 3px 0px #FACC15"
            }}
          >
            <div className="absolute right-[-10px] top-[-10px] text-yellow-400/10 text-5xl font-black select-none pointer-events-none transform rotate-12">
              ⚡
            </div>
            <span 
              className="font-display font-black text-xs md:text-sm uppercase tracking-widest text-yellow-300 flex items-center"
              style={{ gap: "6px" }}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-yellow-400 animate-pulse" /> {trimmed}
            </span>
          </div>
        );
      }

      // Detecção de Cargas Técnicas (Ex: "RX: 80/60", "INT: 65/45", etc.)
      const hasCategory = 
        trimmed.startsWith("RX:") || 
        trimmed.startsWith("INT:") || 
        trimmed.startsWith("SC:") || 
        trimmed.startsWith("INI:");

      if (hasCategory) {
        const parts = trimmed.split(":");
        const category = parts[0].trim();
        const detail = parts.slice(1).join(":").trim();

        let badgeStyle = { backgroundColor: "#FACC15", color: "#000000" }; // RX - amarela
        if (category === "INT") badgeStyle = { backgroundColor: "#34D399", color: "#000000" }; // INT - verde/esmeralda
        if (category === "SC") badgeStyle = { backgroundColor: "#C084FC", color: "#000000" };  // SC - roxa/púrpura
        if (category === "INI") badgeStyle = { backgroundColor: "#60A5FA", color: "#000000" }; // INI - azul

        return (
          <div 
            key={idx} 
            className="flex items-center"
            style={{
              margin: "8px 0",
              paddingBottom: "8px",
              borderBottom: "1px solid #E5E7EB",
              gap: "12px"
            }}
          >
            <span 
              className="font-display font-black text-xs md:text-sm uppercase text-center"
              style={{
                ...badgeStyle,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "3px 8px",
                border: "2px solid #000000",
                boxShadow: "2px 2px 0px #000000",
                minWidth: "55px"
              }}
            >
              {category}
            </span>
            <span className="font-display font-black text-xs md:text-sm uppercase tracking-wider text-neutral-800">
              {detail}
            </span>
          </div>
        );
      }

      // Linhas normais de exercícios
      return (
        <div 
          key={idx} 
          className="flex items-start font-display font-bold text-xs md:text-sm text-neutral-800 uppercase tracking-wide"
          style={{
            padding: "6px 0",
            gap: "8px"
          }}
        >
          <span className="text-yellow-400 font-black select-none text-[10px] mt-0.5">■</span>
          <span>{trimmed}</span>
        </div>
      );
    });
  };

  return (
    <div 
      className="min-h-screen text-black flex flex-col font-sans relative overflow-hidden"
      style={{
        backgroundColor: "#F3F4F6",
        backgroundImage: "radial-gradient(circle, rgba(0, 0, 0, 0.07) 1.5px, transparent 1.5px)",
        backgroundSize: "24px 24px",
        padding: "24px 32px",
        gap: "20px",
        zoom: 0.75,  // Zoom-out global para caber 100% na tela física da TV sem scroll
      }}
    >
      {/* 1. Header do Painel */}
      <header 
        className="flex items-center justify-between z-10 bg-white border-3 border-black shadow-[6px_6px_0px_#000]"
        style={{
          padding: "20px 28px",
          gap: "20px",
          flexDirection: "row",  // Forçar horizontal — Smart TVs podem ignorar md: breakpoints
          flexWrap: "wrap"
        }}
      >
        <div className="flex items-center">
          <div 
            className="bg-black text-white border-3 border-black flex items-center justify-center shadow-[4px_4px_0px_#FFD700]"
            style={{
              padding: "12px 28px",
            }}
          >
            <span className="font-headline font-black text-2xl md:text-4xl tracking-tighter">
              COLISEU <span className="text-yellow-400">TV</span>
            </span>
          </div>
        </div>

        {/* Controles de Navegação e Polling */}
        <div className="flex flex-wrap items-center" style={{ gap: "12px" }}>
          {/* Botão de Auto-ajuste */}
          <button
            onClick={() => setIsAutoMode(!isAutoMode)}
            className={`border-2 border-black font-display font-black text-xs uppercase tracking-wide cursor-pointer transition-all flex items-center ${
              isAutoMode 
                ? "bg-green-400 text-black shadow-none translate-x-[2px] translate-y-[2px]" 
                : "bg-white text-neutral-700"
            }`}
            style={{
              padding: "10px 16px",
              gap: "10px",
              boxShadow: isAutoMode ? "none" : "3px 3px 0px #000"
            }}
          >
            <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isAutoMode ? "bg-green-600" : "bg-neutral-400"}`}></span>
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isAutoMode ? "bg-green-600" : "bg-neutral-500"}`}></span>
            </span>
            <span className="whitespace-nowrap">
              {isAutoMode ? "AJUSTE AUTOMÁTICO ATIVO" : "AJUSTE MANUAL ATIVO"}
            </span>
          </button>

          {/* Navegação Manual */}
          <div className="flex items-center bg-white border-2 border-black shadow-[3px_3px_0px_#000]">
            <button
              onClick={() => handleSlotChange(selectedSlotIndex - 1)}
              className="hover:bg-neutral-100 border-r-2 border-black cursor-pointer"
              style={{ padding: "8px" }}
              title="Turma Anterior"
            >
              <ChevronLeft size={18} className="text-black" />
            </button>
            <div 
              className="font-headline font-black text-xs md:text-sm text-center uppercase min-w-[100px]"
              style={{ padding: "4px 12px" }}
            >
              {currentSlot ? currentSlot.time_start.slice(0, 5) : "SLOTS"}
            </div>
            <button
              onClick={() => handleSlotChange(selectedSlotIndex + 1)}
              className="hover:bg-neutral-100 border-l-2 border-black cursor-pointer"
              style={{ padding: "8px" }}
              title="Próxima Turma"
            >
              <ChevronRight size={18} className="text-black" />
            </button>
          </div>

          {/* Indicador de Polling */}
          <button
            onClick={() => fetchData(true)}
            className={`bg-white border-2 border-black cursor-pointer active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all ${
              isRefreshing ? "animate-spin" : ""
            }`}
            style={{
              padding: "8px",
              boxShadow: "3px 3px 0px #000"
            }}
            title="Atualizar agora"
          >
            <RefreshCw size={18} className="text-black" />
          </button>

          <TvClock />
        </div>
      </header>

      {/* 2. Conteúdo Principal (Alunos Ocupando 100% da Largura) */}
      <div className="flex-grow z-10" style={{ width: "100%" }}>
        <main className="flex flex-col" style={{ gap: "24px" }}>
          {currentSlot ? (
            <div className="flex flex-col" style={{ gap: "16px" }}>
              <div 
                className="flex items-center font-display font-black text-xs md:text-sm text-neutral-500 bg-white border-2 border-black self-start shadow-[2px_2px_0px_#000] uppercase"
                style={{
                  padding: "8px 16px",
                  gap: "8px"
                }}
              >
                <User size={14} className="text-black" />
                COACH: <span className="text-black">{currentSlot.coach_name}</span>
              </div>
              
              <TvStudentGrid 
                students={currentSlot.students} 
                capacity={currentSlot.capacity} 
                timeStart={currentSlot.time_start}
                className="" 
              />
            </div>
          ) : (
            <div 
              className="flex flex-col items-center justify-center border-3 border-black bg-white text-center shadow-[6px_6px_0px_#000] min-h-[450px]"
              style={{ padding: "40px" }}
            >
              <span className="text-6xl mb-4">💤</span>
              <h2 className="font-headline font-black text-2xl uppercase">Sem Turmas para Exibir</h2>
              <p className="font-display font-bold text-neutral-500 text-sm mt-2 uppercase tracking-wide">
                Nenhum horário ou grade estrutural ativa foi encontrada para o dia de hoje.
              </p>
            </div>
          )}
        </main>
      </div>

      {/* 3. Painel de Baixo: O WOD (100% da largura, horizontalizado) */}
      {data && (
        <footer 
          className="bg-white border-3 border-black shadow-[6px_6px_0px_#000] z-10"
          style={{
            padding: "16px 24px",
            display: "grid",
            gridTemplateColumns: "1fr 1.5fr 1fr",
            gap: "32px",
            alignItems: "center"
          }}
        >
          {/* Coluna 1: Título do Treino */}
          <div className="flex flex-col justify-center border-r-2 border-black pr-6" style={{ minHeight: "80px" }}>
            <span className="font-display font-black text-[10px] text-neutral-400 tracking-widest block uppercase">
              TREINO DO DIA
            </span>
            <h2 className="font-headline font-black text-xl md:text-2xl text-black uppercase leading-tight mt-1">
              {data?.wodTitle}
            </h2>
          </div>

          {/* Coluna 2: Exercícios e Metas (Renderizado em 2 colunas internas) */}
          <div className="flex flex-col justify-center border-r-2 border-black pr-6" style={{ minHeight: "80px" }}>
            <div className="grid grid-cols-2 gap-x-6 gap-y-0.5">
              {(() => {
                const lines = (data?.wodContent || "").split("\n").map(l => l.trim()).filter(Boolean);
                const exercisesAndTargets = lines.filter(line => !line.startsWith("RX:") && !line.startsWith("INT:") && !line.startsWith("SC:") && !line.startsWith("INI:"));
                return renderWodContent(exercisesAndTargets.join("\n"));
              })()}
            </div>
          </div>

          {/* Coluna 3: Cargas (RX, INT, SC, INI) */}
          <div className="flex flex-col justify-center pl-2" style={{ minHeight: "80px" }}>
            <span className="font-display font-black text-[9px] text-neutral-400 tracking-widest block uppercase mb-1.5">
              CARGAS TÉCNICAS
            </span>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              {(() => {
                const lines = (data?.wodContent || "").split("\n").map(l => l.trim()).filter(Boolean);
                const categories = lines.filter(line => line.startsWith("RX:") || line.startsWith("INT:") || line.startsWith("SC:") || line.startsWith("INI:"));
                return renderWodContent(categories.join("\n"));
              })()}
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}

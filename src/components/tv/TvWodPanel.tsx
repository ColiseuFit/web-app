"use client";

import { TvDataResponse } from "@/app/tv/actions";
import { Flame, Zap, Dumbbell, Timer, Target } from "lucide-react";
import { useEffect, useRef } from "react";

interface TvWodPanelProps {
  data: TvDataResponse;
}

/**
 * Painel dedicado à exibição expandida e completa do WOD (Workout of the Day).
 * Utiliza o layout de 2 colunas para organizar o treino:
 * - Coluna Esquerda: Título do Treino, Badges de Meta (Modality, Time Cap), Aquecimento e Cargas Técnicas.
 * - Coluna Direita: Técnica/Skill e Exercícios principais do WOD.
 * Implementa auto-scroll automático em cada seção reativa (warm-up, technique, metcon) se o volume de texto exceder a tela.
 * 
 * @param {TvWodPanelProps} props - Propriedades do componente.
 * @param {TvDataResponse} props.data - Dados estruturados do WOD carregados do banco.
 * @returns {React.ReactElement} Painel estruturado em duas colunas assimétricas.
 */
export default function TvWodPanel({ data }: TvWodPanelProps) {
  const { wodTitle, wodContent, warmUp, technique, typeTag, timeCap } = data;

  // Helper para sanitizar e separar texto em linhas
  const getLines = (text: string | null | undefined) => {
    if (!text) return [];
    return text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
  };

  const warmUpLines = getLines(warmUp);
  const techniqueLines = getLines(technique);
  const allWodLines = getLines(wodContent);

  // Helper para verificar se a linha representa uma carga técnica (Case-Insensitive)
  const isCategoryLine = (line: string) => {
    const clean = line.trim().toUpperCase();
    return (
      clean.startsWith("RX:") ||
      clean.startsWith("INT:") ||
      clean.startsWith("SC:") ||
      clean.startsWith("INI:")
    );
  };

  // Separar cargas técnicas de exercícios do WOD principal
  const categoryLines = allWodLines.filter(isCategoryLine);
  const exerciseLines = allWodLines.filter((line) => !isCategoryLine(line));

  // Referências do DOM para controle do autoscroll independente de cada contêiner
  const warmUpScrollRef = useRef<HTMLDivElement>(null);
  const techniqueScrollRef = useRef<HTMLDivElement>(null);
  const wodScrollRef = useRef<HTMLDivElement>(null);

  /**
   * Configura o ciclo de autoscroll vertical para contêineres de texto longo do WOD.
   * Raciocínio de Constantes:
   * - step (0.8px): Deslocamento suave por tick para legibilidade contínua à distância.
   * - delay (40ms): 25 frames/s. Roda com fluidez mesmo em navegadores Tizen/WebOS com CPU modesta.
   * - waitCounter (75 ticks): Congela nas extremidades por ~3 segundos.
   */
  useEffect(() => {
    const setupAutoScroll = (element: HTMLDivElement | null) => {
      if (!element) return;

      let intervalId: NodeJS.Timeout;
      let scrollDirection = 1; // 1 = descendo, -1 = subindo
      let waitCounter = 0;
      let isInteracting = false; // Flag para suspender auto-scroll sob interação
      
      const step = 0.8;
      const delay = 40;

      // Eventos de interação humana para pausar a rolagem
      const handleMouseEnter = () => { isInteracting = true; };
      const handleMouseLeave = () => { isInteracting = false; };
      const handleFocus = () => { isInteracting = true; };
      const handleBlur = () => { isInteracting = false; };

      element.addEventListener("mouseenter", handleMouseEnter);
      element.addEventListener("mouseleave", handleMouseLeave);
      element.addEventListener("focusin", handleFocus);
      element.addEventListener("focusout", handleBlur);
      element.addEventListener("touchstart", handleMouseEnter);
      element.addEventListener("touchend", handleMouseLeave);

      const performScroll = () => {
        if (isInteracting) return;

        const maxScroll = element.scrollHeight - element.clientHeight;
        if (maxScroll <= 0) {
          element.scrollTop = 0;
          return;
        }

        if (waitCounter > 0) {
          waitCounter--;
          return;
        }

        element.scrollTop += scrollDirection * step;

        // Borda Inferior
        if (scrollDirection === 1 && element.scrollTop >= maxScroll - 1) {
          element.scrollTop = maxScroll;
          scrollDirection = -1; // Inverte para subir
          waitCounter = 75; // Pausa no final por 3s
        }
        // Borda Superior
        else if (scrollDirection === -1 && element.scrollTop <= 0) {
          element.scrollTop = 0;
          scrollDirection = 1; // Inverte para descer
          waitCounter = 75; // Pausa no topo por 3s
        }
      };

      intervalId = setInterval(performScroll, delay);

      return () => {
        clearInterval(intervalId);
        element.removeEventListener("mouseenter", handleMouseEnter);
        element.removeEventListener("mouseleave", handleMouseLeave);
        element.removeEventListener("focusin", handleFocus);
        element.removeEventListener("focusout", handleBlur);
        element.removeEventListener("touchstart", handleMouseEnter);
        element.removeEventListener("touchend", handleMouseLeave);
      };
    };

    const cleanupWarmUp = setupAutoScroll(warmUpScrollRef.current);
    const cleanupTechnique = setupAutoScroll(techniqueScrollRef.current);
    const cleanupWod = setupAutoScroll(wodScrollRef.current);

    return () => {
      if (cleanupWarmUp) cleanupWarmUp();
      if (cleanupTechnique) cleanupTechnique();
      if (cleanupWod) cleanupWod();
    };
  }, [data]);

  return (
    <div
      className="flex-grow grid min-h-0 overflow-hidden"
      style={{
        gridTemplateColumns: "1fr 1.50fr",
        gap: "20px",
        width: "100%",
        alignItems: "stretch",
      }}
    >
      {/* Estilo local para ocultar barras de rolagem nativas */}
      <style dangerouslySetInnerHTML={{__html: `
        .tv-wod-scroll-container {
          scrollbar-width: none !important;
          -ms-overflow-style: none !important;
        }
        .tv-wod-scroll-container::-webkit-scrollbar {
          display: none !important;
        }
      `}} />

      {/* ═══ Coluna Esquerda: Meta + Aquecimento + Cargas ═══ */}
      <div className="flex flex-col h-full min-h-0 overflow-hidden" style={{ gap: "16px" }}>
        
        {/* Card do Título do WOD & Metadata */}
        <div
          className="bg-black text-white border-3 border-black shadow-[6px_6px_0px_#FACC15] relative overflow-hidden shrink-0"
          style={{ padding: "16px 20px" }}
        >
          <div className="absolute right-[-20px] top-[-20px] text-yellow-400/15 text-[90px] font-black select-none pointer-events-none transform rotate-12">
            ⚡
          </div>
          <span className="font-display font-black text-[10px] text-yellow-400 tracking-[0.3em] block uppercase mb-2">
            TREINO DO DIA
          </span>
          <h2 className="font-headline font-black text-3xl md:text-4xl text-white uppercase leading-tight tracking-tight relative z-10">
            {wodTitle}
          </h2>
          
          {/* Badges de Informações Extras */}
          {(typeTag || timeCap) && (
            <div className="flex flex-wrap items-center gap-4 mt-5 relative z-10">
              {typeTag && (
                <div 
                  className="font-display font-black text-sm uppercase whitespace-nowrap flex-shrink-0"
                  style={{
                    backgroundColor: "#FACC15",
                    color: "#000000",
                    border: "2px solid #000000",
                    boxShadow: "3px 3px 0px #000000",
                    padding: "6px 16px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    lineHeight: "1",
                  }}
                >
                  <Target size={14} className="flex-shrink-0" />
                  <span>{typeTag}</span>
                </div>
              )}
              {timeCap && (
                <div 
                  className="font-display font-black text-sm uppercase whitespace-nowrap flex-shrink-0"
                  style={{
                    backgroundColor: "#EF4444",
                    color: "#FFFFFF",
                    border: "2px solid #000000",
                    boxShadow: "3px 3px 0px #FACC15", // Sombra amarela para dar contraste no card preto
                    padding: "6px 16px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    lineHeight: "1",
                  }}
                >
                  <Timer size={14} className="flex-shrink-0" />
                  <span>CAP: {timeCap}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Card de Aquecimento (Warm-up) */}
        {warmUpLines.length > 0 && (
          <div
            className="bg-white border-3 border-black shadow-[6px_6px_0px_#000] flex flex-col flex-1 min-h-0 overflow-hidden"
            style={{ padding: "16px 20px" }}
          >
            <div className="flex items-center gap-2 border-b-2 border-black pb-2 mb-3 shrink-0">
              <Flame size={18} className="text-yellow-500 flex-shrink-0" />
              <span className="font-display font-black text-sm md:text-base text-black tracking-[0.18em] uppercase">
                AQUECIMENTO (WARM-UP)
              </span>
            </div>

            <div 
              ref={warmUpScrollRef}
              className="flex flex-col flex-grow overflow-y-auto pr-1 gap-1 tv-wod-scroll-container"
            >
              {warmUpLines.map((line, idx) => (
                <div
                  key={idx}
                  className="flex items-start font-display font-bold text-base md:text-lg text-neutral-800 uppercase tracking-wide gap-2"
                  style={{ padding: "4px 0" }}
                >
                  <span className="text-yellow-500 font-black select-none text-[10px] mt-1.5 flex-shrink-0">
                    ■
                  </span>
                  <span className="leading-tight">{line}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Card de Cargas Técnicas */}
        {categoryLines.length > 0 && (
          <div
            className="bg-white border-3 border-black shadow-[6px_6px_0px_#000] flex flex-col shrink-0"
            style={{ padding: "16px 20px" }}
          >
            <div className="flex items-center gap-2 border-b-2 border-black pb-2 mb-3 shrink-0">
              <Zap size={18} className="text-purple-500 flex-shrink-0" />
              <span className="font-display font-black text-sm md:text-base text-black tracking-[0.18em] uppercase">
                CARGAS RECOMENDADAS
              </span>
            </div>

            <div className="flex flex-col gap-4">
              {categoryLines.map((line, idx) => {
                const parts = line.split(":");
                const category = parts[0].trim().toUpperCase();
                const detail = parts.slice(1).join(":").trim();

                let badgeBg = "#FACC15"; // RX
                if (category === "INT") badgeBg = "#34D399";
                if (category === "SC") badgeBg = "#C084FC";
                if (category === "INI") badgeBg = "#60A5FA";

                return (
                  <div
                    key={idx}
                    className="flex items-center gap-3"
                    style={{
                      paddingBottom: "6px",
                      borderBottom:
                        idx < categoryLines.length - 1
                          ? "1.5px dashed var(--nb-surface-low)"
                          : "none",
                    }}
                  >
                    <span
                      className="font-display font-black text-sm uppercase text-center whitespace-nowrap flex-shrink-0"
                      style={{
                        backgroundColor: badgeBg,
                        color: "#000000",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        lineHeight: "1",
                        padding: "5px 12px",
                        border: "2px solid #000000",
                        boxShadow: "3px 3px 0px #000000",
                        minWidth: "65px",
                      }}
                    >
                      {category}
                    </span>
                    <span className="font-display font-black text-base md:text-lg uppercase tracking-wide text-neutral-800 leading-tight">
                      {detail}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ═══ Coluna Direita: Técnica + Metcon ═══ */}
      <div className="flex flex-col h-full min-h-0 overflow-hidden" style={{ gap: "16px" }}>
        
        {/* Card de Técnica / Skill */}
        {techniqueLines.length > 0 && (
          <div
            className="bg-white border-3 border-black shadow-[6px_6px_0px_#000] flex flex-col min-h-0 overflow-hidden"
            style={{ padding: "16px 20px" }}
          >
            <div className="flex items-center gap-2 border-b-2 border-black pb-2 mb-3 shrink-0">
              <Zap size={18} className="text-blue-500 flex-shrink-0" />
              <span className="font-display font-black text-sm md:text-base text-black tracking-[0.18em] uppercase">
                TÉCNICA / SKILL
              </span>
            </div>

            <div 
              ref={techniqueScrollRef}
              className="flex flex-col flex-grow overflow-y-auto pr-1 gap-1 tv-wod-scroll-container"
            >
              {techniqueLines.map((line, idx) => (
                <div
                  key={idx}
                  className="flex items-start font-display font-bold text-base md:text-lg text-neutral-900 uppercase tracking-wide gap-2"
                  style={{ padding: "4px 0" }}
                >
                  <span className="text-blue-500 font-black select-none text-[10px] mt-1.5 flex-shrink-0">
                    ■
                  </span>
                  <span className="leading-tight">{line}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Card do Metcon / WOD Principal */}
        <div
          className="bg-white border-3 border-black shadow-[6px_6px_0px_#000] flex flex-col flex-1 min-h-0 overflow-hidden"
          style={{ padding: "16px 20px" }}
        >
          <div className="flex items-center gap-2 border-b-2 border-black pb-2 mb-3 shrink-0">
            <Dumbbell size={18} className="text-black flex-shrink-0" />
            <span className="font-display font-black text-sm md:text-base text-black tracking-[0.18em] uppercase">
              METCON / WOD PRINCIPAL
            </span>
          </div>

          {exerciseLines.length > 0 ? (
            <div 
              ref={wodScrollRef}
              className="flex flex-col flex-grow overflow-y-auto pr-1 gap-1 tv-wod-scroll-container"
            >
              {exerciseLines.map((line, idx) => {
                // Detecção de metas ou estruturação de rounds no WOD
                const isTarget =
                  line.includes("RDS") ||
                  line.includes("CAP") ||
                  line.includes("ROUND") ||
                  line.includes("TIME") ||
                  line.includes("AMRAP") ||
                  line.includes("EMOM") ||
                  line.startsWith("FOR ");

                if (isTarget) {
                  return (
                    <div
                      key={idx}
                      className="relative overflow-hidden shrink-0"
                      style={{
                        margin: "8px 0",
                        backgroundColor: "#000000",
                        color: "#ffffff",
                        border: "2px solid #000000",
                        padding: "8px 16px",
                        boxShadow: "4px 4px 0px #FACC15",
                      }}
                    >
                      <div className="absolute right-[-10px] top-[-10px] text-yellow-400/10 text-4xl font-black select-none pointer-events-none transform rotate-12">
                        ⚡
                      </div>
                      <span
                        className="font-display font-black text-lg md:text-xl uppercase tracking-widest text-yellow-300 flex items-center"
                        style={{ gap: "10px" }}
                      >
                        <span className="h-2.5 w-2.5 rounded-full bg-yellow-400 animate-pulse" />
                        {line}
                      </span>
                    </div>
                  );
                }

                return (
                  <div
                    key={idx}
                    className="flex items-start font-display font-bold text-base md:text-lg text-neutral-800 uppercase tracking-wide gap-2"
                    style={{
                      padding: "6px 0",
                      borderBottom: "1.5px dashed var(--nb-surface-low)",
                    }}
                  >
                    <span className="text-yellow-400 font-black select-none text-xs mt-1.5">
                      ■
                    </span>
                    <span className="leading-tight">{line}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div
              className="flex flex-col items-center justify-center text-center flex-grow"
              style={{ padding: "40px 0" }}
            >
              <Dumbbell size={48} className="text-neutral-300 mb-4" />
              <h3 className="font-headline font-black text-xl uppercase text-neutral-400">
                Sem exercícios descritos
              </h3>
              <p className="font-display font-bold text-sm text-neutral-400 uppercase mt-2">
                Não há detalhes de exercícios inseridos para este WOD.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

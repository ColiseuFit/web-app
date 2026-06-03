"use client";

import { TvDataResponse } from "@/app/tv/actions";
import { Flame, Zap, Dumbbell, Timer, Target } from "lucide-react";

interface TvWodPanelProps {
  data: TvDataResponse;
}

/**
 * Painel dedicado à exibição expandida e completa do WOD (Workout of the Day).
 * Utiliza o layout de 2 colunas para organizar o treino:
 * - Coluna Esquerda: Título do Treino, Badges de Meta (Modality, Time Cap), Aquecimento e Cargas Técnicas.
 * - Coluna Direita: Técnica/Skill e Exercícios principais do WOD.
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

  // Separar cargas técnicas de exercícios do WOD principal
  const categoryLines = allWodLines.filter(
    (line) =>
      line.startsWith("RX:") ||
      line.startsWith("INT:") ||
      line.startsWith("SC:") ||
      line.startsWith("INI:")
  );

  const exerciseLines = allWodLines.filter(
    (line) =>
      !line.startsWith("RX:") &&
      !line.startsWith("INT:") &&
      !line.startsWith("SC:") &&
      !line.startsWith("INI:")
  );

  return (
    <div
      className="flex-grow grid"
      style={{
        gridTemplateColumns: "1fr 1.50fr",
        gap: "32px",
        width: "100%",
        alignItems: "stretch",
      }}
    >
      {/* ═══ Coluna Esquerda: Meta + Aquecimento + Cargas ═══ */}
      <div className="flex flex-col h-full" style={{ gap: "28px" }}>
        
        {/* Card do Título do WOD & Metadata */}
        <div
          className="bg-black text-white border-4 border-black shadow-[8px_8px_0px_#FACC15] relative overflow-hidden"
          style={{ padding: "32px 28px" }}
        >
          <div className="absolute right-[-25px] top-[-25px] text-yellow-400/15 text-[120px] font-black select-none pointer-events-none transform rotate-12">
            ⚡
          </div>
          <span className="font-display font-black text-xs text-yellow-400 tracking-[0.3em] block uppercase mb-3">
            TREINO DO DIA
          </span>
          <h2 className="font-headline font-black text-4xl md:text-5xl text-white uppercase leading-tight tracking-tight relative z-10">
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
            className="bg-white border-4 border-black shadow-[8px_8px_0px_#000] flex flex-col flex-1"
            style={{ padding: "32px" }}
          >
            <div className="flex items-center gap-3 border-b-3 border-black pb-4 mb-5">
              <Flame size={24} className="text-yellow-500" />
              <span className="font-display font-black text-base md:text-lg text-black tracking-[0.18em] uppercase">
                AQUECIMENTO (WARM-UP)
              </span>
            </div>

            <div className="flex flex-col justify-center flex-grow gap-2">
              {warmUpLines.map((line, idx) => (
                <div
                  key={idx}
                  className="flex items-start font-display font-bold text-lg md:text-xl text-neutral-800 uppercase tracking-wide gap-3"
                  style={{ padding: "10px 0" }}
                >
                  <span className="text-yellow-500 font-black select-none text-xs mt-1.5">
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
            className="bg-white border-4 border-black shadow-[8px_8px_0px_#000] flex flex-col"
            style={{ padding: "32px" }}
          >
            <div className="flex items-center gap-3 border-b-3 border-black pb-4 mb-5">
              <Zap size={24} className="text-purple-500" />
              <span className="font-display font-black text-base md:text-lg text-black tracking-[0.18em] uppercase">
                CARGAS RECOMENDADAS
              </span>
            </div>

            <div className="flex flex-col gap-4">
              {categoryLines.map((line, idx) => {
                const parts = line.split(":");
                const category = parts[0].trim();
                const detail = parts.slice(1).join(":").trim();

                let badgeBg = "#FACC15"; // RX
                if (category === "INT") badgeBg = "#34D399";
                if (category === "SC") badgeBg = "#C084FC";
                if (category === "INI") badgeBg = "#60A5FA";

                return (
                  <div
                    key={idx}
                    className="flex items-center gap-4"
                    style={{
                      paddingBottom: "12px",
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
      <div className="flex flex-col h-full" style={{ gap: "28px" }}>
        
        {/* Card de Técnica / Skill */}
        {techniqueLines.length > 0 && (
          <div
            className="bg-white border-4 border-black shadow-[8px_8px_0px_#000] flex flex-col"
            style={{ padding: "32px" }}
          >
            <div className="flex items-center gap-3 border-b-3 border-black pb-4 mb-5">
              <Zap size={24} className="text-blue-500" />
              <span className="font-display font-black text-base md:text-lg text-black tracking-[0.18em] uppercase">
                TÉCNICA / SKILL
              </span>
            </div>

            <div className="flex flex-col gap-3">
              {techniqueLines.map((line, idx) => (
                <div
                  key={idx}
                  className="flex items-start font-display font-bold text-lg md:text-xl text-neutral-900 uppercase tracking-wide gap-3"
                  style={{ padding: "10px 0" }}
                >
                  <span className="text-blue-500 font-black select-none text-xs mt-1.5">
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
          className="bg-white border-4 border-black shadow-[8px_8px_0px_#000] flex flex-col flex-1"
          style={{ padding: "32px" }}
        >
          <div className="flex items-center gap-3 border-b-3 border-black pb-4 mb-5">
            <Dumbbell size={24} className="text-black" />
            <span className="font-display font-black text-base md:text-lg text-black tracking-[0.18em] uppercase">
              METCON / WOD PRINCIPAL
            </span>
          </div>

          {exerciseLines.length > 0 ? (
            <div className="flex flex-col justify-center flex-grow gap-2">
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
                      className="relative overflow-hidden"
                      style={{
                        margin: "16px 0",
                        backgroundColor: "#000000",
                        color: "#ffffff",
                        border: "3px solid #000000",
                        padding: "16px 24px",
                        boxShadow: "6px 6px 0px #FACC15",
                      }}
                    >
                      <div className="absolute right-[-15px] top-[-15px] text-yellow-400/10 text-6xl font-black select-none pointer-events-none transform rotate-12">
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
                    className="flex items-start font-display font-bold text-lg md:text-xl text-neutral-800 uppercase tracking-wide gap-3"
                    style={{
                      padding: "12px 0",
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

"use client";

import React, { forwardRef } from "react";

/**
 * Propriedades para renderização do adesivo de treino (WodSticker).
 * @property title - Título descritivo do WOD (ex: "SÁBADO DA MALDADE!").
 * @property dateStr - Data formatada em português (ex: "19 DE MAI.").
 * @property wodContent - Conteúdo técnico original do treino (sem cortes ou reticências).
 * @property result - Score final do aluno (ex: "12:00" ou "150 | 50kg"). Pode ser nulo se não houver resultado.
 * @property levelInfo - Objeto com informações visuais de nível (label, cores brutas de fundo e texto).
 * @property studentName - Nome opcional do atleta para personalização do sticker.
 */
interface WodStickerProps {
  title: string;
  dateStr: string;
  wodContent: string;
  result: string | null;
  levelInfo: { label: string; color: string; textColor: string };
  studentName?: string;
}

/**
 * Componente visual que renderiza um adesivo de treino de alta fidelidade
 * no formato padrão para stories do Instagram (1080x1920, proporção 9:16).
 * Utiliza o design system Neo-Brutalist da Academia Coliseu, garantindo contraste
 * absoluto em qualquer fundo fotográfico por meio de caixas com bordas pretas e sombras pesadas.
 * 
 * @see c:\Users\lucri\Documents\Cliente Orkstra\Academia Coliseu\Site\docs\PLAYBOOKS\COMPARTILHAMENTO_ATIVIDADE.md
 */
export const WodSticker = forwardRef<HTMLDivElement, WodStickerProps>(({
  title,
  dateStr,
  wodContent,
  result,
  levelInfo,
  studentName
}, ref) => {
  const contentLines = wodContent.split("\n").filter(Boolean);
  const displayContent = contentLines.join("\n");

  return (
    <div
      ref={ref}
      style={{
        // Resolução padrão do sticker: 1080x1920 (9:16)
        width: "1080px",
        height: "1920px",
        padding: "120px 80px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "transparent",
        fontFamily: "'Inter', sans-serif",
        boxSizing: "border-box",
        // Evitar quebra no html-to-image
        overflow: "hidden",
      }}
    >
      {/* HEADER: WOD NAME & DATE */}
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        {studentName && (
           <div style={{
             fontSize: "42px",
             fontWeight: 800,
             color: "#FFF",
             textTransform: "uppercase",
             textShadow: "4px 4px 0px #000, -2px -2px 0px #000, 2px -2px 0px #000, -2px 2px 0px #000",
             letterSpacing: "0.05em"
           }}>
             {studentName}
           </div>
        )}
        <div style={{
          display: "flex",
          border: "6px solid #000",
          boxShadow: "12px 12px 0px #000",
          width: "max-content"
        }}>
          {/* LADO ESQUERDO: WOD */}
          <div style={{
            background: "var(--nb-red, #E31B23)",
            color: "#FFF",
            padding: "12px 24px",
            fontSize: "32px",
            fontWeight: 900,
            fontFamily: "'Outfit', sans-serif",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRight: "6px solid #000"
          }}>
            WOD
          </div>
          {/* LADO DIREITO: LOGO */}
          <div style={{
            background: "#FFF",
            padding: "12px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            <img 
              src="/logo-coliseu-black.svg" 
              alt="Coliseu" 
              style={{ height: "32px" }} 
              crossOrigin="anonymous"
            />
          </div>
        </div>
        
        <div style={{
          fontSize: "36px",
          fontWeight: 800,
          color: "#FFF",
          textTransform: "uppercase",
          textShadow: "4px 4px 0px #000, -2px -2px 0px #000, 2px -2px 0px #000, -2px 2px 0px #000",
        }}>
          {dateStr}
        </div>

        <h1 style={{
          fontSize: "96px",
          fontWeight: 900,
          color: "#FFF",
          fontFamily: "'Outfit', sans-serif",
          textTransform: "uppercase",
          lineHeight: 0.9,
          marginTop: "40px",
          textShadow: "6px 6px 0px #000, -3px -3px 0px #000, 3px -3px 0px #000, -3px 3px 0px #000",
        }}>
          {title}
        </h1>

        <div style={{
          marginTop: "40px",
          fontSize: "48px",
          fontWeight: 600,
          color: "#FFF",
          whiteSpace: "pre-wrap",
          lineHeight: 1.3,
          textShadow: "3px 3px 0px #000, -2px -2px 0px #000, 2px -2px 0px #000, -2px 2px 0px #000",
        }}>
          {displayContent}
        </div>
      </div>

      {/* FOOTER: RESULT & LOGO */}
      <div style={{ display: "flex", flexDirection: "column", gap: "40px", alignItems: "center" }}>
        
        {/* SCORE BLOCK */}
        {result && (
          <div style={{
            background: "#000",
            border: "4px solid #FFF",
            padding: "40px 60px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "16px",
            boxShadow: "12px 12px 0px var(--nb-red, #E31B23)",
            transform: "rotate(-2deg)"
          }}>
            <div style={{
              fontSize: "24px",
              fontWeight: 900,
              color: "var(--nb-red, #E31B23)",
              letterSpacing: "0.2em",
              textTransform: "uppercase"
            }}>
              TREINO CONCLUÍDO
            </div>
            
            <div style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "8px"
            }}>
              {result.split(" | ").map((res, i) => (
                <div key={i} style={{
                  fontSize: result.includes("|") ? "64px" : "80px",
                  fontWeight: 900,
                  color: "#FFF",
                  fontFamily: "'Outfit', sans-serif",
                  lineHeight: 1,
                  letterSpacing: "-0.05em",
                  textAlign: "center"
                }}>
                  {res}
                </div>
              ))}
            </div>

            <div style={{
              background: levelInfo.color,
              color: levelInfo.textColor,
              padding: "12px 24px",
              fontSize: "28px",
              fontWeight: 900,
              textTransform: "uppercase",
              border: "4px solid #FFF",
              boxShadow: "8px 8px 0px rgba(255,255,255,0.2)"
            }}>
              {levelInfo.label}
            </div>
          </div>
        )}

      </div>

    </div>
  );
});

WodSticker.displayName = "WodSticker";

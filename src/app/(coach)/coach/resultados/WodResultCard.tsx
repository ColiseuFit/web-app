"use client";

import React, { useState } from "react";
import {
  ChevronDown,
  Calendar,
  Users,
} from "lucide-react";
import { LevelInfo } from "@/lib/constants/levels";
import type { CoachResultGroup } from "./actions";
import StudentResultRow from "./StudentResultRow";

/**
 * WodResultCard: Card de Treino colapsável com listagem de resultados dos alunos.
 *
 * @architecture
 * - Subcomponente modular para manter o orquestrador sob o limite de 500 linhas.
 * - Gerenciamento de estado local para expansão/colapso para melhor performance.
 * - Delega a renderização da linha de cada aluno ao componente StudentResultRow.
 *
 * @param {Object} props - Parâmetros do componente.
 * @param {CoachResultGroup} props.group - Grupo de treinos e seus resultados.
 * @param {Record<string, LevelInfo>} props.dynamicLevels - Níveis dinâmicos configurados no banco de dados.
 * @param {Set<string>} props.flaggedIds - Conjunto de IDs de check-ins sinalizados como suspeitos.
 * @param {string | null} props.flaggingId - ID do check-in sendo atualizado no momento.
 * @param {Function} props.onFlag - Função callback para disparar a ação de flag.
 * @param {Function} props.onClear - Função callback para limpar o score do aluno.
 * @param {boolean} props.initialExpanded - Se o card deve iniciar expandido.
 */
export default function WodResultCard({
  group,
  dynamicLevels,
  flaggedIds,
  flaggingId,
  onFlag,
  onClear,
  initialExpanded,
}: {
  group: CoachResultGroup;
  dynamicLevels: Record<string, LevelInfo>;
  flaggedIds: Set<string>;
  flaggingId: string | null;
  onFlag: (checkinId: string) => Promise<void>;
  onClear: (checkinId: string) => Promise<void>;
  initialExpanded: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(initialExpanded);

  /**
   * Formata a data do WOD com segurança de Timezone (UTC).
   */
  const formatWodDate = (dateStr: string): string => {
    const d = new Date(dateStr + "T00:00:00Z");
    return d.toLocaleDateString("pt-BR", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      timeZone: "UTC",
    });
  };

  return (
    <div
      style={{
        background: "#FFF",
        border: "2px solid #000",
        boxShadow: isExpanded ? "4px 4px 0px #000" : "2px 2px 0px #000",
        borderRadius: "6px",
        overflow: "hidden",
        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      {/* HEADER DO CARD - CLICÁVEL */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          width: "100%",
          boxSizing: "border-box",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 20px",
          background: isExpanded ? "#111" : "#FFF",
          color: isExpanded ? "#FFF" : "#000",
          border: "none",
          cursor: "pointer",
          transition: "all 0.2s ease",
          textAlign: "left",
          outline: "none",
        }}
      >
        <div style={{ flex: 1, minWidth: 0, marginRight: "12px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "6px",
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontSize: "9px",
                fontWeight: 900,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                padding: "3px 8px",
                background: isExpanded ? "#FFF" : "#000",
                color: isExpanded ? "#000" : "#FFF",
                borderRadius: "3px",
                whiteSpace: "nowrap",
                flexShrink: 0,
                border: isExpanded ? "none" : "1px solid #000",
              }}
            >
              <span>{group.wod_type_tag}</span>
            </span>

            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "11px",
                fontWeight: 700,
                opacity: 0.8,
                color: isExpanded ? "#CCC" : "#666",
              }}
            >
              <Calendar size={12} />
              <span>{formatWodDate(group.wod_date)}</span>
            </span>
          </div>

          <div
            style={{
              fontSize: "18px",
              fontWeight: 900,
              letterSpacing: "-0.02em",
              textTransform: "uppercase",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              fontFamily: "'Outfit', sans-serif",
            }}
          >
            {group.wod_title}
          </div>
        </div>

        {/* ESTATÍSTICAS E CHEVRON */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            flexShrink: 0,
          }}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "13px",
              fontWeight: 800,
              padding: "4px 8px",
              background: isExpanded ? "rgba(255,255,255,0.15)" : "#F5F5F5",
              border: "1.5px solid #000",
              borderRadius: "4px",
            }}
          >
            <Users size={14} />
            <span>{group.results.length}</span>
          </span>

          <div
            style={{
              transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ChevronDown size={20} />
          </div>
        </div>
      </button>

      {/* ÁREA DE RESULTADOS EXPANDIDA */}
      {isExpanded && (
        <div
          style={{
            borderTop: "2px solid #000",
            background: "#FFF",
            animation: "fadeIn 0.25s ease-out",
          }}
        >
          {/* HEADERS DAS COLUNAS (DESKTOP E TABLET) */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "12px 20px",
              background: "#F9FAFB",
              borderBottom: "2px solid #000",
              fontSize: "10px",
              fontWeight: 900,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "#666",
              gap: "16px",
            }}
          >
            <div style={{ flex: 2 }}>Aluno</div>
            <div style={{ flex: 1, textAlign: "center" }}>Nível WOD</div>
            <div style={{ flex: 1, textAlign: "center" }}>Score</div>
            <div style={{ width: "80px", textAlign: "center" }}>Auditar</div>
          </div>

          {/* LISTA DE ALUNOS */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            {group.results.map((result, idx) => {
              const isFlagged = flaggedIds.has(result.checkin_id);
              const isFlagging = flaggingId === result.checkin_id;

              return (
                <StudentResultRow
                  key={result.checkin_id}
                  result={result}
                  resultType={group.result_type}
                  dynamicLevels={dynamicLevels}
                  isFlagged={isFlagged}
                  isFlagging={isFlagging}
                  onFlag={onFlag}
                  onClear={onClear}
                  isLast={idx === group.results.length - 1}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

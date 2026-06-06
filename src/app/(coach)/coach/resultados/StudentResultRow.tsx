"use client";

import React from "react";
import {
  Clock,
  Star,
  AlertTriangle,
  Flag,
  Trash2,
  Timer,
  Dumbbell,
  Trophy,
} from "lucide-react";
import { getLevelInfo, LevelInfo } from "@/lib/constants/levels";
import type { CoachResultItem } from "./actions";

interface StudentResultRowProps {
  result: CoachResultItem;
  resultType: string;
  dynamicLevels: Record<string, LevelInfo>;
  isFlagged: boolean;
  isFlagging: boolean;
  onFlag: (checkinId: string) => Promise<void>;
  onClear: (checkinId: string) => Promise<void>;
  isLast: boolean;
}

/**
 * StudentResultRow: Renders a single student result line in the WOD details card.
 * Enforces strict styling guidelines: Lucide icons only, inline flex alignment, and
 * visual formatting warnings. Stacked layout optimized for mobile and desktop viewports.
 */
export default function StudentResultRow({
  result,
  resultType,
  dynamicLevels,
  isFlagged,
  isFlagging,
  onFlag,
  onClear,
  isLast,
}: StudentResultRowProps) {
  
  const parseResultDisplay = (rawResult: string | null, typeStr: string) => {
    if (!rawResult) return { display: "-", isInvalid: false };

    // Checa se usa o novo padrão de prefixos (ex: time:15:30)
    const hasPrefixMatch = rawResult.match(/^[a-z]+:/i);
    
    if (!hasPrefixMatch) {
      // Formato legado sem prefixo de tipo
      const typeLower = typeStr.toLowerCase();
      let invalid = true;

      // Regras de leniência para dados legados:
      // Se for um WOD de tempo e o usuário colocou MM:SS (contém ':'), consideramos válido visualmente.
      if ((typeLower.includes("time") || typeLower.includes("tempo")) && rawResult.includes(":")) {
        invalid = false;
      }
      
      // Se NÃO for WOD de tempo e o cara digitou apenas números, espaços ou pipes (ex: 150 ou 12 | 28), 
      // consideramos válido visualmente para não sujar a tela com alertas.
      if (!typeLower.includes("time") && !typeLower.includes("tempo") && /^[\d\s|]+$/.test(rawResult.trim())) {
         invalid = false;
      }

      return { display: rawResult, isInvalid: invalid };
    }

    const parts = rawResult.split("|").map(p => p.trim());
    const displayParts: string[] = [];
    let invalid = false;

    const unitMap: Record<string, string> = {
      load: "KG", rounds: "RDS", reps: "REP",
      distance: "M", calories: "CAL", points: "PTS", time: "MIN"
    };

    for (const p of parts) {
      const match = p.match(/^([a-z]+):(.+)$/i);
      if (match) {
        const prefix = match[1].toLowerCase();
        const val = match[2];
        if (prefix === "text") {
           displayParts.push(val);
        } else {
           const u = unitMap[prefix];
           displayParts.push(u ? `${val} ${u}` : val);
        }
      } else {
        invalid = true;
        displayParts.push(p);
      }
    }

    return { display: displayParts.join(" | "), isInvalid: invalid };
  };

  const { display: resultDisplay, isInvalid } = parseResultDisplay(result.result, resultType);

  const renderAvatar = () => {
    const profileLvl = getLevelInfo(result.student_level, dynamicLevels);

    if (result.avatar_url) {
      return (
        <img
          src={result.avatar_url}
          alt={result.student_name}
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "50%",
            border: `2px solid ${profileLvl.color || "#000"}`,
            objectFit: "cover",
            flexShrink: 0,
          }}
        />
      );
    }

    const names = result.student_name.trim().split(" ");
    const initials =
      names.length > 1
        ? `${names[0][0]}${names[names.length - 1][0]}`
        : names[0].slice(0, 2);

    return (
      <div
        style={{
          width: "36px",
          height: "36px",
          borderRadius: "50%",
          background: profileLvl.color || "#E0E0E0",
          color: profileLvl.textColor || "#000",
          border: "2px solid #000",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "12px",
          fontWeight: 800,
          textTransform: "uppercase",
          flexShrink: 0,
        }}
      >
        {initials}
      </div>
    );
  };

  const renderLevelBadge = (level: string | null) => {
    if (!level) return null;
    const info = getLevelInfo(level, dynamicLevels);
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2px 8px",
          fontSize: "8px",
          fontWeight: 900,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          background: info.color,
          color: info.textColor,
          border: "1px solid #000",
          borderRadius: "0px",
          whiteSpace: "nowrap",
          flexShrink: 0,
          lineHeight: 1,
        }}
      >
        <span>{info.label}</span>
      </span>
    );
  };

  const renderResultIcon = (type: string) => {
    const typeLower = type.toLowerCase();
    if (typeLower.includes("time") || typeLower.includes("tempo")) {
      return <Timer size={10} color="currentColor" style={{ flexShrink: 0 }} />;
    }
    if (typeLower.includes("load") || typeLower.includes("carga")) {
      return <Dumbbell size={10} color="currentColor" style={{ flexShrink: 0 }} />;
    }
    return <Trophy size={10} color="currentColor" style={{ flexShrink: 0 }} />;
  };

  const renderScoreBadge = () => {
    if (!result.result) {
      return (
        <span style={{ 
          fontSize: "8px", 
          fontWeight: 900, 
          color: "#9CA3AF", 
          textTransform: "uppercase",
          whiteSpace: "nowrap",
          lineHeight: 1
        }}>
          Sem Resultado
        </span>
      );
    }

    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          padding: "2px 8px",
          fontSize: "8px",
          fontWeight: 900,
          background: "#000",
          color: "#FFF",
          border: "1px solid #000",
          borderRadius: "0px",
          whiteSpace: "nowrap",
          flexShrink: 0,
          fontFamily: "var(--font-mono, monospace)",
          lineHeight: 1,
        }}
      >
        {renderResultIcon(resultType)}
        <span style={{ marginLeft: "4px", lineHeight: "1" }}>{resultDisplay}</span>
      </span>
    );
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        padding: "14px 20px",
        borderBottom: isLast ? "none" : "1px solid #E5E7EB",
        gap: "16px",
        background: isFlagged ? "#FFFBEB" : "transparent",
        borderLeft: isFlagged ? "4px solid #F59E0B" : "4px solid transparent",
        transition: "all 0.15s ease",
      }}
    >
      {/* AVATAR DO ALUNO */}
      {renderAvatar()}

      {/* NOME & BADGES DETALHADOS (Layout Vertical Otimizado) */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          minWidth: 0,
        }}
      >
        {/* Linha 1: Nome do Aluno + Horário */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%" }}>
          <span
            style={{
              fontSize: "14px",
              fontWeight: 800,
              color: "#111",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              flex: 1,
              minWidth: 0,
            }}
          >
            {result.student_name}
          </span>

          {result.is_excellence && (
            <span
              title="Desempenho de Excelência"
              style={{
                display: "inline-flex",
                alignItems: "center",
                animation: "pulseCustom 2s infinite",
                flexShrink: 0,
              }}
            >
              <Star size={13} color="#C5A059" fill="#C5A059" />
            </span>
          )}

          {result.class_time && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "9px",
                color: "#666",
                fontWeight: 700,
                background: "#F3F4F6",
                padding: "2px 6px",
                border: "1px solid #E5E7EB",
                whiteSpace: "nowrap",
                flexShrink: 0,
                lineHeight: 1
              }}
            >
              <Clock size={10} style={{ flexShrink: 0 }} />
              <span>{result.class_time}</span>
            </span>
          )}
        </div>

        {/* Linha 2: Badges Técnicos e de Desempenho */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "6px", flexWrap: "wrap" }}>
          {/* Badge de Nível */}
          {renderLevelBadge(result.performance_level)}

          {/* Badge do Score */}
          {renderScoreBadge()}

          {/* Alerta de Erro de Formato */}
          {result.result && isInvalid && (
            <span
              title="Formato de tempo inválido (deve conter ':')"
              style={{
                display: "inline-flex",
                alignItems: "center",
                fontSize: "8px",
                fontWeight: 900,
                color: "#FFF",
                background: "#DC2626",
                border: "1px solid #000",
                padding: "2px 6px",
                whiteSpace: "nowrap",
                lineHeight: 1,
                flexShrink: 0,
              }}
            >
              <span>⚠️ FORMATO</span>
            </span>
          )}
        </div>
      </div>

      {/* BOTÕES DE AUDITORIA (FLAG E CLEAR) */}
      <div
        style={{
          width: "80px",
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          gap: "8px",
          flexShrink: 0,
        }}
      >
        <button
          onClick={() => onFlag(result.checkin_id)}
          disabled={isFlagging}
          title={isFlagged ? "Remover marcação suspeita" : "Marcar resultado como suspeito"}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: "32px",
            height: "32px",
            border: "2px solid #000",
            borderRadius: "4px",
            background: isFlagged ? "#F59E0B" : "#FFF",
            color: isFlagged ? "#FFF" : "#000",
            cursor: isFlagging ? "not-allowed" : "pointer",
            boxShadow: isFlagged ? "none" : "2px 2px 0px #000",
            transition: "all 0.15s cubic-bezier(0.4, 0, 0.2, 1)",
            padding: 0,
            opacity: isFlagging ? 0.5 : 1,
            transform: isFlagged ? "translate(1px, 1px)" : "none",
            flexShrink: 0
          }}
          onMouseEnter={(e) => {
            if (!isFlagged && !isFlagging) {
              e.currentTarget.style.transform = "translate(-1px, -1px)";
              e.currentTarget.style.boxShadow = "3px 3px 0px #000";
            }
          }}
          onMouseLeave={(e) => {
            if (!isFlagged && !isFlagging) {
              e.currentTarget.style.transform = "none";
              e.currentTarget.style.boxShadow = "2px 2px 0px #000";
            }
          }}
        >
          {isFlagged ? (
            <AlertTriangle size={15} fill="#FFF" color="#F59E0B" strokeWidth={2.5} />
          ) : (
            <Flag size={14} strokeWidth={2.5} />
          )}
        </button>

        {result.result && (
          <button
            onClick={() => onClear(result.checkin_id)}
            disabled={isFlagging}
            title="Excluir/limpar score do aluno"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "32px",
              height: "32px",
              border: "2px solid #000",
              borderRadius: "4px",
              background: "#FFF",
              color: "#EF4444",
              cursor: isFlagging ? "not-allowed" : "pointer",
              boxShadow: "2px 2px 0px #000",
              transition: "all 0.15s cubic-bezier(0.4, 0, 0.2, 1)",
              padding: 0,
              opacity: isFlagging ? 0.5 : 1,
              flexShrink: 0
            }}
            onMouseEnter={(e) => {
              if (!isFlagging) {
                e.currentTarget.style.transform = "translate(-1px, -1px)";
                e.currentTarget.style.boxShadow = "3px 3px 0px #000";
                e.currentTarget.style.background = "#FEF2F2";
              }
            }}
            onMouseLeave={(e) => {
              if (!isFlagging) {
                e.currentTarget.style.transform = "none";
                e.currentTarget.style.boxShadow = "2px 2px 0px #000";
                e.currentTarget.style.background = "#FFF";
              }
            }}
          >
            <Trash2 size={14} strokeWidth={2.5} />
          </button>
        )}
      </div>
    </div>
  );
}

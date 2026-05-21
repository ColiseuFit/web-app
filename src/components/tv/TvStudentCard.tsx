"use client";

import { getLevelInfo } from "@/lib/constants/levels";
import { TvStudent } from "@/app/tv/actions";
import { useState } from "react";

interface TvStudentCardProps {
  student: TvStudent;
  isCompact?: boolean;
}

export default function TvStudentCard({ student, isCompact = false }: TvStudentCardProps) {
  const [imgError, setImgError] = useState(false);

  // Obter as configurações canônicas do nível Coliseu
  const levelInfo = getLevelInfo(student.performance_level);

  // Obter as iniciais do aluno para o avatar reserva
  const nameParts = student.full_name.trim().split(" ");
  const initials = nameParts.length > 1 
    ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase()
    : nameParts[0].slice(0, 2).toUpperCase();

  // Nome formatado de forma amigável: Primeiro Nome + Sobrenome
  const displayName = nameParts.length > 1
    ? `${nameParts[0]} ${nameParts[nameParts.length - 1]}`
    : student.full_name;

  const cardMinHeight = isCompact ? "66px" : "86px";
  const cardPadding = isCompact ? "8px 10px 8px 18px" : "14px 14px 14px 26px";
  const cardGap = isCompact ? "8px" : "12px";
  const avatarSize = isCompact ? "38px" : "48px";
  const avatarFontSize = isCompact ? "12px" : "14px";
  const nameFontSize = isCompact ? "13px" : "16px";
  const badgesMarginTop = isCompact ? "4px" : "8px";
  const badgePadding = isCompact ? "1.5px 4px" : "2.5px 6px";
  const badgeFontSize = isCompact ? "7.5px" : "8.5px";
  const badgeGap = isCompact ? "4px" : "6px";

  return (
    <div 
      className="flex items-center bg-white border-3 border-black shadow-[5px_5px_0px_#000] transition-all relative overflow-hidden group animate-in"
      style={{
        borderColor: "#000000",
        padding: cardPadding, // Espaçamento maior à esquerda para acomodar a faixa absoluta e evitar corte do avatar
        gap: cardGap,
        minHeight: cardMinHeight
      }}
    >
      {/* Faixa lateral indicando o nível técnico */}
      <div 
        className="absolute left-0 top-0 bottom-0 w-2 border-r-2 border-black"
        style={{ 
          backgroundColor: levelInfo.color,
          width: isCompact ? "6px" : "8px"
        }}
      />

      {/* Avatar do Aluno */}
      <div className="flex-shrink-0">
        {student.avatar_url && !imgError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img 
            src={student.avatar_url} 
            alt={student.full_name}
            onError={() => setImgError(true)}
            style={{
              width: avatarSize,
              height: avatarSize,
              borderRadius: "50%",
              border: "2px solid #000000",
              objectFit: "cover",
              boxShadow: isCompact ? "1.5px 1.5px 0px #000000" : "2px 2px 0px #000000",
              display: "block"
            }}
          />
        ) : (
          <div 
            style={{ 
              width: avatarSize,
              height: avatarSize,
              borderRadius: "50%",
              border: "2px solid #000000",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--font-display, inherit)",
              fontWeight: 900,
              fontSize: avatarFontSize,
              boxShadow: isCompact ? "1.5px 1.5px 0px #000000" : "2px 2px 0px #000000",
              backgroundColor: levelInfo.color,
              color: levelInfo.textColor || "#000000",
              textTransform: "uppercase"
            }}
          >
            {initials}
          </div>
        )}
      </div>

      {/* Detalhes do Aluno */}
      <div className="flex-grow min-w-0 pr-1">
        <h3 className="font-display font-black text-black uppercase tracking-tight truncate leading-tight" style={{ fontSize: nameFontSize }}>
          {displayName}
        </h3>
        
        <div className="flex items-center flex-wrap" style={{ gap: badgeGap, marginTop: badgesMarginTop }}>
          {/* Badge do Nível */}
          <span 
            className="font-display font-black uppercase tracking-wider"
            style={{ 
              backgroundColor: levelInfo.color,
              color: levelInfo.textColor || "#000000",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: badgePadding,
              fontSize: badgeFontSize,
              lineHeight: "1.1",
              border: "1.5px solid #000000",
              boxShadow: "1px 1px 0px #000000"
            }}
          >
            {levelInfo.label}
          </span>

          {/* Badge de Check-in Ativo */}
          <span 
            className="font-display font-black uppercase tracking-wider"
            style={{ 
              backgroundColor: "#4ade80", // bg-green-400
              color: "#000000",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: badgePadding,
              fontSize: badgeFontSize,
              lineHeight: "1.1",
              border: "1.5px solid #000000",
              boxShadow: "1px 1px 0px #000000"
            }}
          >
            CHECK-IN OK
          </span>

          {/* Tag Premium (Club vs Pass) */}
          <span 
            className="font-display font-black uppercase tracking-wider"
            style={{ 
              backgroundColor: student.membership_type === "club" ? "#000000" : "#e5e5e5",
              color: student.membership_type === "club" ? "#ffffff" : "#404040",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: badgePadding,
              fontSize: badgeFontSize,
              lineHeight: "1.1",
              border: "1.5px solid #000000",
              boxShadow: "1px 1px 0px #000000"
            }}
          >
            {student.membership_type === "club" ? "★ PREMIUM" : "PASS"}
          </span>
        </div>
      </div>
    </div>
  );
}

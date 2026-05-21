"use client";

import { getLevelInfo } from "@/lib/constants/levels";
import { TvStudent } from "@/app/tv/actions";
import { useState } from "react";

interface TvStudentCardProps {
  student: TvStudent;
}

export default function TvStudentCard({ student }: TvStudentCardProps) {
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

  return (
    <div 
      className="flex items-center bg-white border-3 border-black shadow-[5px_5px_0px_#000] transition-all relative overflow-hidden group animate-in min-h-[86px]"
      style={{
        borderColor: "#000000",
        padding: "14px 14px 14px 26px", // Espaçamento maior à esquerda para acomodar a faixa absoluta e evitar corte do avatar
        gap: "12px"
      }}
    >
      {/* Faixa lateral indicando o nível técnico */}
      <div 
        className="absolute left-0 top-0 bottom-0 w-2 border-r-2 border-black"
        style={{ backgroundColor: levelInfo.color }}
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
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              border: "2px solid #000000",
              objectFit: "cover",
              boxShadow: "2px 2px 0px #000000",
              display: "block"
            }}
          />
        ) : (
          <div 
            style={{ 
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              border: "2px solid #000000",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--font-display, inherit)",
              fontWeight: 900,
              fontSize: "14px",
              boxShadow: "2px 2px 0px #000000",
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
        <h3 className="font-display font-black text-base text-black uppercase tracking-tight truncate leading-tight">
          {displayName}
        </h3>
        
        <div className="flex items-center flex-wrap" style={{ gap: "6px", marginTop: "8px" }}>
          {/* Badge do Nível */}
          <span 
            className="font-display font-black uppercase tracking-wider"
            style={{ 
              backgroundColor: levelInfo.color,
              color: levelInfo.textColor || "#000000",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "2.5px 6px",
              fontSize: "8.5px",
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
              padding: "2.5px 6px",
              fontSize: "8.5px",
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
              padding: "2.5px 6px",
              fontSize: "8.5px",
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

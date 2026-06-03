"use client";

import { getLevelInfo } from "@/lib/constants/levels";
import { TvStudent } from "@/app/tv/actions";
import { useState } from "react";
import { Sparkles } from "lucide-react";

/**
 * Tamanhos de renderização do card do aluno na TV.
 * - large: Poucos alunos (1-16) — cards verticais/quadrados generosos com avatares grandes
 * - normal: Quantidade média (17-28) — cards verticais intermediários equilibrados
 * - compact: Muitos alunos (29+) — cards horizontais compactos para otimizar espaço
 */
export type CardSize = "large" | "normal" | "compact";

interface TvStudentCardProps {
  student: TvStudent;
  cardSize?: CardSize;
}

/** Mapa dimensional: centraliza todos os tokens de tamanho e comportamento por tier */
const SIZE_MAP: Record<
  CardSize,
  {
    cardMinHeight: string;
    cardPadding: string;
    cardGap: string;
    avatarSize: string;
    avatarFontSize: string;
    avatarShadow: string;
    nameFontSize: string;
    badgesMarginTop: string;
    badgePadding: string;
    badgeFontSize: string;
    badgeGap: string;
    stripeWidth: string;
    layout: "vertical" | "horizontal";
    stripePosition: "top" | "left";
  }
> = {
  large: {
    cardMinHeight: "210px",
    cardPadding: "32px 18px 20px 18px", // Espaço extra no topo para a faixa de nível
    cardGap: "14px",
    avatarSize: "80px",
    avatarFontSize: "22px",
    avatarShadow: "4px 4px 0px #000000",
    nameFontSize: "22px",
    badgesMarginTop: "12px",
    badgePadding: "5px 12px",
    badgeFontSize: "12.5px",
    badgeGap: "8px",
    stripeWidth: "12px",
    layout: "vertical",
    stripePosition: "top",
  },
  normal: {
    cardMinHeight: "170px",
    cardPadding: "24px 14px 16px 14px",
    cardGap: "10px",
    avatarSize: "64px",
    avatarFontSize: "18px",
    avatarShadow: "3px 3px 0px #000000",
    nameFontSize: "18px",
    badgesMarginTop: "10px",
    badgePadding: "4px 10px",
    badgeFontSize: "11.5px",
    badgeGap: "6px",
    stripeWidth: "9px",
    layout: "vertical",
    stripePosition: "top",
  },
  compact: {
    cardMinHeight: "78px",
    cardPadding: "10px 12px 10px 20px",
    cardGap: "10px",
    avatarSize: "44px",
    avatarFontSize: "13px",
    avatarShadow: "2px 2px 0px #000000",
    nameFontSize: "16px", // Aumentado de 14px para legibilidade à distância na TV do tatame
    badgesMarginTop: "6px",
    badgePadding: "3px 7px",
    badgeFontSize: "9.5px",
    badgeGap: "5px",
    stripeWidth: "7px",
    layout: "horizontal",
    stripePosition: "left",
  },
};

/**
 * Cartão brutalista para exibição do check-in de alunos na TV.
 * Adapta seu layout (vertical/retrato ou horizontal/paisagem) dinamicamente baseando-se no `cardSize`.
 * 
 * @param {TvStudentCardProps} props - Propriedades do componente.
 * @param {TvStudent} props.student - Registro do aluno checked-in.
 * @param {CardSize} [props.cardSize="normal"] - Escalonamento de tamanho (large, normal ou compact).
 * @returns {React.ReactElement} Card brutalista responsivo e estilizado.
 */
export default function TvStudentCard({
  student,
  cardSize = "normal",
}: TvStudentCardProps) {
  const [imgError, setImgError] = useState(false);

  // Obter as configurações canônicas do nível Coliseu
  const levelInfo = getLevelInfo(student.performance_level);

  // Obter as iniciais do aluno para o avatar reserva
  const nameParts = student.full_name.trim().split(" ");
  const initials =
    nameParts.length > 1
      ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase()
      : nameParts[0].slice(0, 2).toUpperCase();

  // Verifica se o aluno faz aniversário hoje (usando UTC para evitar shift)
  let isBirthdayToday = false;
  if (student.birth_date) {
    const today = new Date();
    const bDate = new Date(student.birth_date + "T12:00:00Z");
    if (today.getUTCMonth() === bDate.getUTCMonth() && today.getUTCDate() === bDate.getUTCDate()) {
      isBirthdayToday = true;
    }
  }

  // Configuração do chapéu de aniversário conforme o tamanho do card
  const hatConfig = {
    large: { size: 48, top: -24, left: -16 },
    normal: { size: 38, top: -18, left: -12 },
    compact: { size: 28, top: -14, left: -8 }
  }[cardSize];

  // Nome formatado de forma amigável: Primeiro Nome + Sobrenome
  const displayName =
    nameParts.length > 1
      ? `${nameParts[0]} ${nameParts[nameParts.length - 1]}`
      : student.full_name;

  const s = SIZE_MAP[cardSize];
  const isVertical = s.layout === "vertical";

  // Classes condicionais para Neobrutalismo e Adaptação de Grid
  // Classes de layout com estilização neobrutalista especial para aniversariantes.
  // Removemos 'overflow-hidden' nos aniversários para o chapéu de festa poder "vazar" a borda em 3D.
  let containerClasses = isVertical
    ? `flex flex-col items-center justify-between transition-all relative group animate-in text-center w-full ${
        isBirthdayToday 
          ? "bg-yellow-50/95 border-4 border-black birthday-card-highlight" 
          : "bg-white border-2 border-black shadow-[5px_5px_0px_#000] overflow-hidden"
      }`
    : `flex items-center transition-all relative group animate-in w-full ${
        isBirthdayToday 
          ? "bg-yellow-50/95 border-4 border-black birthday-card-highlight" 
          : "bg-white border-2 border-black shadow-[5px_5px_0px_#000] overflow-hidden"
      }`;

  const stripeStyle =
    s.stripePosition === "top"
      ? {
          backgroundColor: levelInfo.color,
          height: s.stripeWidth,
          left: 0,
          right: 0,
          top: 0,
        }
      : {
          backgroundColor: levelInfo.color,
          width: s.stripeWidth,
          left: 0,
          top: 0,
          bottom: 0,
        };

  const stripeClasses =
    s.stripePosition === "top"
      ? "absolute border-b-2 border-black"
      : "absolute border-r-2 border-black";

  const detailsClasses = isVertical
    ? "flex flex-col items-center w-full min-w-0"
    : "flex-grow min-w-0 pr-1";

  const badgesClasses = isVertical
    ? "flex items-center justify-center flex-wrap"
    : "flex items-center flex-wrap";

  return (
    <div
      className={containerClasses}
      style={{
        ...(isBirthdayToday
          ? {
              boxShadow: "4px 4px 0px #FACC15, 8px 8px 0px #000000",
            }
          : {}),
        padding: s.cardPadding,
        gap: s.cardGap,
        minHeight: s.cardMinHeight,
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes birthdayWiggle {
          0%, 100% { transform: rotate(-10deg) translateY(0); }
          50% { transform: rotate(-22deg) translateY(-4px); }
        }
        @keyframes sparkleFloat1 {
          0%, 100% { transform: translate(0, 0) scale(1) rotate(0deg); opacity: 0.8; }
          50% { transform: translate(6px, -8px) scale(1.2) rotate(45deg); opacity: 1; }
        }
        @keyframes sparkleFloat2 {
          0%, 100% { transform: translate(0, 0) scale(1) rotate(0deg); opacity: 0.8; }
          50% { transform: translate(-6px, -6px) scale(0.9) rotate(-45deg); opacity: 1; }
        }
        @keyframes cardPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.02); }
        }
        .birthday-card-highlight {
          animation: cardPulse 3s ease-in-out infinite;
        }
      `}} />

      {/* Elementos festivos de fundo (Confetti/Sparkles) */}
      {isBirthdayToday && (
        <>
          <div className="absolute top-2 left-[20%] w-2 h-2 rounded-full bg-red-500 opacity-60 animate-bounce pointer-events-none" style={{ animationDelay: '0.2s', animationDuration: '2s' }} />
          <div className="absolute bottom-2 right-[30%] w-2.5 h-2.5 bg-blue-500 opacity-60 rotate-45 animate-bounce pointer-events-none" style={{ animationDelay: '0.6s', animationDuration: '2.5s' }} />
          <div className="absolute top-[35%] right-3 w-2 h-2 rounded-full bg-green-500 opacity-60 animate-pulse pointer-events-none" />
          <Sparkles 
            size={cardSize === "large" ? 22 : 16} 
            className="absolute text-yellow-500 pointer-events-none animate-pulse"
            style={{
              top: cardSize === "large" ? "20px" : "12px",
              right: "12px",
              animation: "sparkleFloat1 3s ease-in-out infinite",
            }}
          />
          <Sparkles 
            size={cardSize === "large" ? 18 : 12} 
            className="absolute text-red-500 pointer-events-none animate-pulse"
            style={{
              bottom: "12px",
              left: isVertical ? "12px" : "80px",
              animation: "sparkleFloat2 2.5s ease-in-out infinite",
            }}
          />
        </>
      )}

      {/* Faixa indicadora de nível técnico */}
      <div className={stripeClasses} style={stripeStyle} />

      {/* Avatar do Aluno */}
      <div className="flex-shrink-0 relative z-10">
        {isBirthdayToday && (
          <svg
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="absolute z-20 pointer-events-none"
            style={{
              width: `${hatConfig.size}px`,
              height: `${hatConfig.size}px`,
              top: `${hatConfig.top}px`,
              left: `${hatConfig.left}px`,
              animation: "birthdayWiggle 2s ease-in-out infinite",
              filter: "drop-shadow(2px 2px 0px #000)",
            }}
          >
            {/* Cone do chapéu */}
            <path d="M50 15L20 85H80L50 15Z" fill="#FACC15" stroke="#000" strokeWidth="6" strokeLinejoin="round"/>
            {/* Listras coloridas */}
            <path d="M35 50C45 45 55 45 65 50" stroke="#EF4444" strokeWidth="6" strokeLinecap="round"/>
            <path d="M27 68C42 62 58 62 73 68" stroke="#3B82F6" strokeWidth="6" strokeLinecap="round"/>
            {/* Pom-pom no topo */}
            <circle cx="50" cy="15" r="10" fill="#EF4444" stroke="#000" strokeWidth="5"/>
            {/* Franjas na base */}
            <circle cx="20" cy="85" r="6" fill="#3B82F6" stroke="#000" strokeWidth="4"/>
            <circle cx="50" cy="85" r="6" fill="#EF4444" stroke="#000" strokeWidth="4"/>
            <circle cx="80" cy="85" r="6" fill="#10B981" stroke="#000" strokeWidth="4"/>
          </svg>
        )}
        {student.avatar_url && !imgError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={student.avatar_url}
            alt={student.full_name}
            onError={() => setImgError(true)}
            style={{
              width: s.avatarSize,
              height: s.avatarSize,
              borderRadius: "50%",
              border: "2px solid #000000",
              objectFit: "cover",
              boxShadow: s.avatarShadow,
              display: "block",
            }}
          />
        ) : (
          <div
            style={{
              width: s.avatarSize,
              height: s.avatarSize,
              borderRadius: "50%",
              border: "2px solid #000000",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--font-display, inherit)",
              fontWeight: 900,
              fontSize: s.avatarFontSize,
              boxShadow: s.avatarShadow,
              backgroundColor: levelInfo.color,
              color: levelInfo.textColor || "#000000",
              textTransform: "uppercase",
            }}
          >
            {initials}
          </div>
        )}
      </div>

      {/* Detalhes do Aluno */}
      <div className={detailsClasses}>
        <h3
          className="font-display font-black text-black uppercase tracking-tight truncate leading-tight w-full mb-1"
          style={{ fontSize: s.nameFontSize }}
        >
          {displayName}
        </h3>

        <div className={badgesClasses} style={{ gap: s.badgeGap, marginTop: s.badgesMarginTop }}>
          {/* Badge do Nível */}
          <span
            className="font-display font-black uppercase tracking-wider whitespace-nowrap"
            style={{
              backgroundColor: levelInfo.color,
              color: levelInfo.textColor || "#000000",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: s.badgePadding,
              fontSize: s.badgeFontSize,
              lineHeight: "1.1",
              border: "2px solid #000000",
              boxShadow: "2px 2px 0px #000000",
            }}
          >
            {levelInfo.label}
          </span>


          {/* Tag Premium (Club vs Pass) */}
          <span
            className="font-display font-black uppercase tracking-wider whitespace-nowrap"
            style={{
              backgroundColor:
                student.membership_type === "club" ? "#000000" : "#e5e5e5",
              color: student.membership_type === "club" ? "#ffffff" : "#404040",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: s.badgePadding,
              fontSize: s.badgeFontSize,
              lineHeight: "1.1",
              border: "2px solid #000000",
              boxShadow: "2px 2px 0px #000000",
            }}
          >
            {student.membership_type === "club" ? "★ PREMIUM" : "PASS"}
          </span>

          {/* Badge Aniversariante do Dia */}
          {isBirthdayToday && (
            <span
              className="font-display font-black uppercase tracking-wider whitespace-nowrap"
              style={{
                backgroundColor: "#facc15",
                color: "#000000",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                padding: s.badgePadding,
                fontSize: s.badgeFontSize,
                lineHeight: "1.1",
                border: "2px solid #000000",
                boxShadow: "2px 2px 0px #000000",
                gap: "4px"
              }}
            >
              🎂 B-DAY
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

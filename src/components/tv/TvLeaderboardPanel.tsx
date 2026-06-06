"use client";

import React, { useEffect, useRef } from "react";
import { 
  TvDailyLeaderboardData, 
  TvWeeklyLeaderboardData 
} from "@/app/tv/actions-leaderboard";
import { getLevelInfo } from "@/lib/constants/levels";
import { Trophy, Medal, Flame, Calendar, Award, Sparkles, Zap } from "lucide-react";
import AthleteAvatar from "@/components/Identity/AthleteAvatar";

// Helper to format date
function formatDateBR(dateStr: string) {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

// Helper to format displayed name
function formatDisplayName(name: string) {
  if (!name) return "";
  const parts = name.trim().split(/\s+/);
  if (parts.length <= 2) return name;
  const last = parts[parts.length - 1];
  const first = parts[0];
  const lowercaseLast = last.toLowerCase();
  if (["filho", "neto", "junior", "jr", "sobrinho"].includes(lowercaseLast) && parts.length > 2) {
    return `${first} ${parts[parts.length - 2]} ${last}`;
  }
  return `${first} ${last}`;
}

interface TvLeaderboardPanelProps {
  dailyData: TvDailyLeaderboardData | null;
  weeklyData: TvWeeklyLeaderboardData | null;
}

export default function TvLeaderboardPanel({ dailyData, weeklyData }: TvLeaderboardPanelProps) {
  const dailyScrollRef = useRef<HTMLDivElement>(null);
  const weeklyScrollRef = useRef<HTMLDivElement>(null);

  // Setup auto-scroll on both columns independently
  useEffect(() => {
    const setupAutoScroll = (element: HTMLDivElement | null) => {
      if (!element) return;

      let intervalId: NodeJS.Timeout;
      let scrollDirection = 1; // 1 = down, -1 = up
      let waitCounter = 0;
      let isInteracting = false;
      
      const step = 0.8;
      const delay = 40;

      const handleMouseEnter = () => { isInteracting = true; };
      const handleMouseLeave = () => { isInteracting = false; };

      element.addEventListener("mouseenter", handleMouseEnter);
      element.addEventListener("mouseleave", handleMouseLeave);
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

        if (scrollDirection === 1 && element.scrollTop >= maxScroll - 1) {
          element.scrollTop = maxScroll;
          scrollDirection = -1;
          waitCounter = 75; // 3 seconds pause
        } else if (scrollDirection === -1 && element.scrollTop <= 0) {
          element.scrollTop = 0;
          scrollDirection = 1;
          waitCounter = 75; // 3 seconds pause
        }
      };

      intervalId = setInterval(performScroll, delay);

      return () => {
        clearInterval(intervalId);
        element.removeEventListener("mouseenter", handleMouseEnter);
        element.removeEventListener("mouseleave", handleMouseLeave);
        element.removeEventListener("touchstart", handleMouseEnter);
        element.removeEventListener("touchend", handleMouseLeave);
      };
    };

    const cleanupDaily = setupAutoScroll(dailyScrollRef.current);
    const cleanupWeekly = setupAutoScroll(weeklyScrollRef.current);

    return () => {
      if (cleanupDaily) cleanupDaily();
      if (cleanupWeekly) cleanupWeekly();
    };
  }, [dailyData, weeklyData]);

  const dailyResults = dailyData?.results || [];
  const weeklyResults = weeklyData?.results || [];

  return (
    <div 
      className="flex flex-col flex-1 bg-neutral-100 border-4 border-black shadow-[8px_8px_0px_#000] overflow-hidden w-full h-full"
      style={{ height: '100%' }}
    >
      <style dangerouslySetInnerHTML={{__html: `
        .tv-leaderboard-scroll-container {
          scrollbar-width: none !important;
          -ms-overflow-style: none !important;
        }
        .tv-leaderboard-scroll-container::-webkit-scrollbar {
          display: none !important;
        }
      `}} />

      {/* ── HEADER HORIZONTAL DO RANKING ── */}
      <div 
        className="bg-yellow-400 border-b-3 border-black flex items-center justify-between shrink-0 relative overflow-hidden z-20 shadow-[3px_3px_0px_#000]"
        style={{ padding: '12px 24px' }}
      >
        <div 
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{ backgroundImage: "repeating-linear-gradient(45deg, #000 0, #000 2px, transparent 2px, transparent 16px)" }}
        />
        <div className="relative z-10 flex items-center gap-4">
          <div className="bg-white border-3 border-black shadow-[4px_4px_0px_#000] rotate-[-5deg] shrink-0" style={{ padding: '8px' }}>
            <Trophy size={32} className="text-black flex-shrink-0" />
          </div>
          <h1 className="font-headline font-black text-3xl md:text-4xl uppercase tracking-tighter text-black" style={{ lineHeight: '1' }}>
            Whiteboard & Rankings
          </h1>
        </div>
        
        {/* Status indicator */}
        <div className="relative z-10 flex items-center gap-3">
          <div 
            className="bg-white text-black font-display font-black text-xs border-2 border-black shadow-[2px_2px_0px_#000] uppercase tracking-wider flex items-center gap-2"
            style={{ padding: '6px 16px' }}
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
            <span>Placar ao Vivo</span>
          </div>
        </div>
      </div>

      {/* ── CONTEÚDO EM COLUNAS DUPLAS ── */}
      <div 
        className="flex-grow flex flex-row min-h-0 overflow-hidden w-full"
        style={{ padding: '20px 24px', gap: '24px', height: '100%' }}
      >
        
        {/* ── COLUNA ESQUERDA: RANKING DIÁRIO (DO DIA) ── */}
        <div 
          className="flex flex-col min-h-0 overflow-hidden" 
          style={{ gap: '12px', width: '50%', height: '100%' }}
        >
          {/* Subheader da Coluna */}
          <div className="flex items-center justify-between shrink-0" style={{ gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div 
                className="bg-black text-yellow-400 border-2 border-black shadow-[2px_2px_0px_#FFD700] shrink-0 flex items-center justify-center"
                style={{ padding: '8px', display: 'inline-flex', alignItems: 'center' }}
              >
                <Zap size={22} className="flex-shrink-0" />
              </div>
              <div className="flex flex-col">
                <span className="font-display font-black text-[10px] text-neutral-500 uppercase tracking-widest leading-none" style={{ marginBottom: '2px' }}>
                  Treino do Dia
                </span>
                <h2 className="font-headline font-black text-xl md:text-2xl uppercase tracking-tight text-black leading-none">
                  {dailyData ? dailyData.wod_title : "WOD do Dia"}
                </h2>
              </div>
            </div>

            {dailyData && (
              <div 
                className="bg-white text-black font-display font-black text-[10px] border-2 border-black shadow-[2px_2px_0px_#000] uppercase tracking-wider"
                style={{ padding: '4px 12px' }}
              >
                {formatDateBR(dailyData.date)}
              </div>
            )}
          </div>

          {/* Listagem do Diário */}
          <div 
            ref={dailyScrollRef}
            className="flex-1 min-h-0 overflow-y-auto pr-1 tv-leaderboard-scroll-container"
          >
            {dailyResults.length > 0 ? (
              <div className="flex flex-col gap-3 w-full content-start pb-4">
                {dailyResults.map((aluno, index) => {
                  const isTop3 = index < 3;
                  const rankColors = ["#FBBF24", "#9CA3AF", "#B45309"];
                  const rankColor = index < 3 ? rankColors[index] : "#E5E7EB";
                  const levelInfo = getLevelInfo(aluno.performance_level);

                  const cardBg = index === 0 
                    ? "linear-gradient(135deg, #FFFDF2 0%, #FFFBEA 100%)"
                    : index === 1
                    ? "linear-gradient(135deg, #FAFAFA 0%, #F4F4F5 100%)"
                    : index === 2
                    ? "linear-gradient(135deg, #FFFBF9 0%, #FFF7F2 100%)"
                    : "#FFF";

                  return (
                    <div 
                      key={aluno.student_id}
                      className="bg-white border-3 border-black relative"
                      style={{ 
                        padding: '10px 14px', 
                        minHeight: '68px',
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        boxShadow: isTop3 ? `4px 4px 0px ${rankColor}` : "3px 3px 0px #000",
                        marginLeft: '4px',
                        marginRight: '4px'
                      }}
                    >
                      {index === 0 && (
                        <div style={{ position: "absolute", top: 0, left: 0, width: "4px", height: "100%", background: rankColor }} />
                      )}

                      {/* Rank & Avatar Container */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0, flex: 1 }}>
                        <div style={{ position: "relative", width: "40px", height: "40px", flexShrink: 0 }}>
                          <AthleteAvatar
                            url={aluno.avatar_url}
                            name={aluno.student_name}
                            size={40}
                            borderWidth={2}
                            rounded={true}
                          />
                          <div style={{
                            position: "absolute",
                            top: "-4px",
                            left: "-4px",
                            width: "18px",
                            height: "18px",
                            borderRadius: "50%",
                            border: "1.5px solid #000",
                            background: index < 3 ? rankColor : "#FFF",
                            color: "#000",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "9px",
                            fontWeight: 950,
                            boxShadow: "1px 1px 0px #000",
                            zIndex: 2
                          }}>
                            {index + 1}
                          </div>
                        </div>

                        {/* Name and Level */}
                        <div className="flex flex-col min-w-0 flex-1 justify-center">
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            {isTop3 && (
                              <div style={{ flexShrink: 0, display: "flex", alignItems: "center" }}>
                                {index === 0 && <Trophy size={14} fill="#FBBF24" color="#000" />}
                                {index === 1 && <Trophy size={14} fill="#9CA3AF" color="#000" />}
                                {index === 2 && <Trophy size={14} fill="#B45309" color="#000" />}
                              </div>
                            )}
                            <span 
                              className="font-headline font-black text-base uppercase text-black truncate pt-0.5"
                              style={{ lineHeight: '1.1' }}
                            >
                              {formatDisplayName(aluno.student_name)}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                            <span 
                              className="font-display font-black text-[8px] uppercase tracking-wide"
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                lineHeight: "1",
                                padding: "3px 8px",
                                backgroundColor: levelInfo.color,
                                color: levelInfo.textColor || "#FFF",
                                border: "1px solid #000"
                              }}
                            >
                              {levelInfo.label}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Result tags */}
                      <div className="flex items-center gap-2 shrink-0">
                        <span 
                          className="font-display font-black text-[10px] uppercase tracking-wider"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            lineHeight: "1",
                            padding: "6px 12px",
                            backgroundColor: "#000",
                            color: "#FFF",
                            border: "1.5px solid #000",
                            fontFamily: "var(--font-mono, monospace)"
                          }}
                        >
                          {aluno.result_display}
                        </span>

                        {aluno.is_cap && (
                          <span 
                            className="font-display font-black text-[9px] uppercase tracking-wider text-red-500"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              lineHeight: "1",
                              padding: "5px 10px",
                              backgroundColor: "#FEF2F2",
                              border: "1.5px solid #EF4444",
                              gap: "2px"
                            }}
                          >
                            <Flame size={10} className="flex-shrink-0" />
                            <span>CAP</span>
                          </span>
                        )}
                      </div>

                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white border-3 border-black border-dashed shadow-[3px_3px_0px_#000] p-8 text-center flex flex-col items-center gap-3">
                <Medal size={36} className="text-black opacity-20 flex-shrink-0" />
                <p className="font-display font-black text-neutral-500 text-xs uppercase tracking-wide">
                  Nenhum score registrado hoje.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── COLUNA DIREITA: RANKING SEMANAL (ACUMULADO) ── */}
        <div 
          className="flex flex-col min-h-0 overflow-hidden" 
          style={{ gap: '12px', width: '50%', height: '100%' }}
        >
          {/* Subheader da Coluna */}
          <div className="flex items-center justify-between shrink-0" style={{ gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div 
                className="bg-black text-yellow-400 border-2 border-black shadow-[2px_2px_0px_#FFD700] shrink-0 flex items-center justify-center"
                style={{ padding: '8px', display: 'inline-flex', alignItems: 'center' }}
              >
                <Award size={22} className="flex-shrink-0" />
              </div>
              <div className="flex flex-col">
                <span className="font-display font-black text-[10px] text-neutral-500 uppercase tracking-widest leading-none" style={{ marginBottom: '2px' }}>
                  Liga Coliseu
                </span>
                <h2 className="font-headline font-black text-xl md:text-2xl uppercase tracking-tight text-black leading-none">
                  Acumulado Semanal
                </h2>
              </div>
            </div>

            {weeklyData && (
              <div 
                className="bg-white text-black font-display font-black text-[10px] border-2 border-black shadow-[2px_2px_0px_#000] uppercase tracking-wider"
                style={{ padding: '4px 12px' }}
              >
                Semana: {weeklyData.start_date} a {weeklyData.end_date}
              </div>
            )}
          </div>

          {/* Listagem do Semanal */}
          <div 
            ref={weeklyScrollRef}
            className="flex-1 min-h-0 overflow-y-auto pr-1 tv-leaderboard-scroll-container"
          >
            {weeklyResults.length > 0 ? (
              <div className="flex flex-col gap-3 w-full content-start pb-4">
                {weeklyResults.map((aluno, index) => {
                  const isTop3 = index < 3;
                  const rankColors = ["#FBBF24", "#9CA3AF", "#B45309"];
                  const rankColor = index < 3 ? rankColors[index] : "#E5E7EB";
                  const levelInfo = getLevelInfo(aluno.performance_level);

                  const cardBg = index === 0 
                    ? "linear-gradient(135deg, #FFFDF2 0%, #FFFBEA 100%)"
                    : index === 1
                    ? "linear-gradient(135deg, #FAFAFA 0%, #F4F4F5 100%)"
                    : index === 2
                    ? "linear-gradient(135deg, #FFFBF9 0%, #FFF7F2 100%)"
                    : "#FFF";

                  return (
                    <div 
                      key={aluno.student_id}
                      className="bg-white border-3 border-black relative"
                      style={{ 
                        padding: '10px 14px', 
                        minHeight: '68px',
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        boxShadow: isTop3 ? `4px 4px 0px ${rankColor}` : "3px 3px 0px #000",
                        marginLeft: '4px',
                        marginRight: '4px'
                      }}
                    >
                      {index === 0 && (
                        <div style={{ position: "absolute", top: 0, left: 0, width: "4px", height: "100%", background: rankColor }} />
                      )}

                      {/* Rank & Avatar Container */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0, flex: 1 }}>
                        <div style={{ position: "relative", width: "40px", height: "40px", flexShrink: 0 }}>
                          <AthleteAvatar
                            url={aluno.avatar_url}
                            name={aluno.student_name}
                            size={40}
                            borderWidth={2}
                            rounded={true}
                          />
                          <div style={{
                            position: "absolute",
                            top: "-4px",
                            left: "-4px",
                            width: "18px",
                            height: "18px",
                            borderRadius: "50%",
                            border: "1.5px solid #000",
                            background: index < 3 ? rankColor : "#FFF",
                            color: "#000",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "9px",
                            fontWeight: 950,
                            boxShadow: "1px 1px 0px #000",
                            zIndex: 2
                          }}>
                            {index + 1}
                          </div>
                        </div>

                        {/* Name and Level */}
                        <div className="flex flex-col min-w-0 flex-1 justify-center">
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            {isTop3 && (
                              <div style={{ flexShrink: 0, display: "flex", alignItems: "center" }}>
                                {index === 0 && <Trophy size={14} fill="#FBBF24" color="#000" />}
                                {index === 1 && <Trophy size={14} fill="#9CA3AF" color="#000" />}
                                {index === 2 && <Trophy size={14} fill="#B45309" color="#000" />}
                              </div>
                            )}
                            <span 
                              className="font-headline font-black text-base uppercase text-black truncate pt-0.5"
                              style={{ lineHeight: '1.1' }}
                            >
                              {formatDisplayName(aluno.student_name)}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                            <span 
                              className="font-display font-black text-[8px] uppercase tracking-wide"
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                lineHeight: "1",
                                padding: "3px 8px",
                                backgroundColor: levelInfo.color,
                                color: levelInfo.textColor || "#FFF",
                                border: "1px solid #000"
                              }}
                            >
                              {levelInfo.label}
                            </span>
                            <span 
                              className="font-display font-black text-[8px] uppercase tracking-wide text-neutral-500"
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                lineHeight: "1",
                                padding: "3px 8px",
                                backgroundColor: "#F3F4F6",
                                border: "1px solid #D1D5DB"
                              }}
                            >
                              {aluno.wods_completed} Wods
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Points badge */}
                      <div className="flex items-center gap-2 shrink-0">
                        <span 
                          className="font-display font-black text-xs uppercase tracking-wider"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            lineHeight: "1",
                            padding: "6px 14px",
                            backgroundColor: "#FACC15",
                            color: "#000",
                            border: "1.5px solid #000",
                            boxShadow: "2px 2px 0px #000"
                          }}
                        >
                          {aluno.total_points} Pts
                        </span>
                      </div>

                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white border-3 border-black border-dashed shadow-[3px_3px_0px_#000] p-8 text-center flex flex-col items-center gap-3">
                <Award size={36} className="text-black opacity-20 flex-shrink-0" />
                <p className="font-display font-black text-neutral-500 text-xs uppercase tracking-wide">
                  Nenhuma pontuação registrada esta semana.
                </p>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}

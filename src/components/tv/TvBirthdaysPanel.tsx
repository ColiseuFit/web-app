"use client";

import { TvBirthday } from "@/app/tv/actions";
import { Cake, Calendar, Sparkles, ChevronRight } from "lucide-react";
import AthleteAvatar from "@/components/Identity/AthleteAvatar";

/**
 * Propriedades para o componente TvBirthdaysPanel.
 */
interface TvBirthdaysPanelProps {
  /** Lista de todos os aniversariantes do mês carregados do banco de dados */
  birthdays: TvBirthday[];
  /** Data alvo de exibição do painel da TV (YYYY-MM-DD), usada como base para a data atual da TV */
  targetDate: string;
}

/**
 * Painel de exibição dos aniversariantes na Coliseu TV.
 * Adaptado para exibição estática em tela única com alta legibilidade e estética Neo-Brutalista ("Iron Monolith").
 * Resolve definitivamente o problema de visual espremido e desalinhado aplicando CSS inline 1:1
 * para margens, paddings, gaps e flexbox, garantindo imunidade a bugs de renderização em navegadores de Smart TVs.
 */
export default function TvBirthdaysPanel({ birthdays, targetDate }: TvBirthdaysPanelProps) {
  const [year, month, day] = targetDate.split("-").map(Number);
  const tvDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

  const tvDay = tvDate.getUTCDate();
  const tvMonth = tvDate.getUTCMonth();
  
  // Nome do mês formatado em português
  const monthName = tvDate.toLocaleString('pt-BR', { month: 'long', timeZone: 'UTC' });

  // Calcula a faixa de dias da semana corrente (domingo a sábado)
  const getWeekRange = (date: Date) => {
    const d = new Date(date);
    const dayOfWeek = d.getUTCDay();
    const firstDay = new Date(d);
    firstDay.setUTCDate(d.getUTCDate() - dayOfWeek);
    const lastDay = new Date(firstDay);
    lastDay.setUTCDate(firstDay.getUTCDate() + 6);
    return { firstDay, lastDay };
  };

  const { firstDay: weekStart, lastDay: weekEnd } = getWeekRange(tvDate);

  const todayBirthdays: TvBirthday[] = [];
  const weekBirthdays: TvBirthday[] = [];
  const monthBirthdays: TvBirthday[] = [];

  // Categoriza os aniversariantes
  birthdays.forEach((b) => {
    const bDate = new Date(b.birth_date + "T12:00:00Z");
    const bDay = bDate.getUTCDate();
    const bMonth = bDate.getUTCMonth();
    const currentYearBday = new Date(Date.UTC(year, bMonth, bDay, 12, 0, 0));

    if (bDay === tvDay && bMonth === tvMonth) {
      todayBirthdays.push(b);
    } else if (currentYearBday >= weekStart && currentYearBday <= weekEnd) {
      weekBirthdays.push(b);
    } else {
      monthBirthdays.push(b);
    }
  });

  return (
    <div 
      className="flex flex-col flex-1 bg-neutral-100 border-4 border-black shadow-[8px_8px_0px_#000] overflow-hidden w-full h-full"
      style={{ height: '100%' }}
    >
      
      {/* ── HEADER HORIZONTAL ENXUTO ── */}
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
            <Cake size={32} className="text-black flex-shrink-0" />
          </div>
          <h1 className="font-headline font-black text-3xl md:text-4xl uppercase tracking-tighter text-black" style={{ lineHeight: '1' }}>
            Aniversariantes
          </h1>
        </div>
        <div className="relative z-10 flex items-center gap-3">
          <div 
            className="bg-white text-black font-display font-black text-lg border-3 border-black shadow-[4px_4px_0px_#000] uppercase tracking-widest"
            style={{ padding: '6px 20px' }}
          >
            Mês de {monthName}
          </div>
        </div>
      </div>

      {/* ── CONTEÚDO PRINCIPAL EM DUAS COLUNAS (Espaço de Margem p-10 e gap-10 via CSS Inline) ── */}
      <div 
        className="flex-1 grid grid-cols-12 min-h-0 overflow-hidden w-full"
        style={{ padding: '20px 24px', gap: '24px' }}
      >
        
        {/* COLUNA ESQUERDA (5/12): HOJE! + NESTA SEMANA */}
        <div className="col-span-5 flex flex-col min-h-0" style={{ gap: '16px' }}>
          
          {/* SEÇÃO: HOJE! */}
          {todayBirthdays.length > 0 && (
            <div className="flex flex-col shrink-0" style={{ gap: '16px' }}>
              {/* Título de Seção */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div 
                  className="bg-yellow-300 text-black border-2 border-black shadow-[2px_2px_0px_#000] shrink-0 flex items-center justify-center"
                  style={{ padding: '8px', display: 'inline-flex', alignItems: 'center' }}
                >
                  <Sparkles size={24} className="animate-pulse flex-shrink-0" />
                </div>
                <h2 className="font-headline font-black text-2xl uppercase tracking-wider text-black pt-0.5 leading-none">
                  Hoje!
                </h2>
              </div>

              {/* Cards de Hoje */}
              <div className={`grid gap-4 ${todayBirthdays.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                {todayBirthdays.map((student) => (
                  <div 
                    key={student.id}
                    className="bg-white border-3 border-black shadow-[3px_3px_0px_#000] relative w-full"
                    style={{ 
                      padding: '12px 16px', 
                      minHeight: '80px',
                      display: 'flex',
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: '16px'
                    }}
                  >
                    <div 
                      className="absolute bg-red-500 text-white font-display font-black border-2 border-black shadow-[2px_2px_0px_#000] uppercase rotate-2 z-10 text-[9px] whitespace-nowrap"
                      style={{ 
                        padding: '4px 10px', 
                        top: '-10px', 
                        right: '-4px',
                        lineHeight: '1'
                      }}
                    >
                      Festa no Box
                    </div>

                    <div className="shrink-0">
                      <AthleteAvatar
                        url={student.avatar_url}
                        name={student.full_name}
                        size={48}
                        borderWidth={2}
                        shadowSize={2}
                        rounded={true}
                      />
                    </div>
                    <div className="flex flex-col min-w-0 flex-1 justify-center">
                      <span className="font-display font-black text-[9px] text-yellow-600 uppercase tracking-widest block leading-none" style={{ marginBottom: '4px' }}>
                        Feliz Aniversário
                      </span>
                      <h3 className="font-headline font-black text-base uppercase text-black truncate leading-tight">
                        {student.full_name}
                      </h3>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SEÇÃO: NESTA SEMANA */}
          <div className="flex flex-col min-h-0" style={{ gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div 
                className="bg-black text-yellow-400 border-2 border-black shadow-[2px_2px_0px_#FFD700] shrink-0 flex items-center justify-center"
                style={{ padding: '8px', display: 'inline-flex', alignItems: 'center' }}
              >
                <Calendar size={24} className="flex-shrink-0" />
              </div>
              <h2 className="font-headline font-black text-2xl uppercase tracking-tight text-black pt-0.5 leading-none">
                Nesta Semana
              </h2>
            </div>
            
            <div className="overflow-y-auto pr-1">
              {weekBirthdays.length > 0 ? (
                <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
                  {weekBirthdays.map((student) => (
                    <div 
                      key={student.id} 
                      className="bg-white border-3 border-black shadow-[3px_3px_0px_#000] shrink-0"
                      style={{ 
                        padding: '12px 16px', 
                        minHeight: '130px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textAlign: 'center'
                      }}
                    >
                      <AthleteAvatar url={student.avatar_url} name={student.full_name} size={44} borderWidth={2} rounded={true} />
                      <span 
                        className="font-headline font-black text-sm uppercase leading-tight line-clamp-1 truncate w-full"
                        style={{ marginTop: '8px', marginBottom: '8px' }}
                      >
                        {student.full_name}
                      </span>
                      <div 
                        className="bg-yellow-400 text-black border-2 border-black font-display font-black text-[9px] uppercase shrink-0"
                        style={{ 
                          padding: '4px 10px', 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          lineHeight: '1',
                          boxShadow: '2px 2px 0px #000'
                        }}
                      >
                        Dia {new Date(student.birth_date + "T12:00:00Z").getUTCDate()}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white border-3 border-black border-dashed shadow-[4px_4px_0px_#000] p-6 text-center">
                  <p className="font-display font-bold text-neutral-500 text-sm uppercase">Nenhum aniversário nesta semana.</p>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* COLUNA DIREITA (7/12): DEMAIS DO MÊS */}
        <div className="col-span-7 flex flex-col min-h-0" style={{ gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div 
              className="bg-neutral-300 text-black border-2 border-black shadow-[2px_2px_0px_#000] shrink-0 flex items-center justify-center"
              style={{ padding: '8px', display: 'inline-flex', alignItems: 'center' }}
            >
              <ChevronRight size={24} className="flex-shrink-0" />
            </div>
            <h2 className="font-headline font-black text-2xl uppercase tracking-tight text-black pt-0.5 leading-none">
              Demais do Mês
            </h2>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto pr-1">
            {monthBirthdays.length > 0 ? (
              <div className="grid grid-cols-2 xl:grid-cols-3 gap-4 w-full content-start">
                {monthBirthdays.map((student) => (
                  <div 
                    key={student.id} 
                    className="bg-white border-3 border-black shadow-[3px_3px_0px_#000] min-w-0"
                    style={{ 
                      padding: '10px 14px', 
                      minHeight: '64px',
                      display: 'flex',
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px'
                    }}
                  >
                    <div 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '10px', 
                        minWidth: 0, 
                        flex: 1 
                      }}
                    >
                      <div className="shrink-0">
                        <AthleteAvatar url={student.avatar_url} name={student.full_name} size={36} borderWidth={2} rounded={true} />
                      </div>
                      <span 
                        className="font-headline font-black text-sm uppercase truncate" 
                        style={{ lineHeight: '1.2' }}
                      >
                        {student.full_name}
                      </span>
                    </div>
                    <div 
                      className="bg-neutral-800 text-white border-2 border-black font-display font-black text-[9px] uppercase shrink-0"
                      style={{ 
                        padding: '4px 10px', 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        lineHeight: '1',
                        boxShadow: '2px 2px 0px #000',
                        marginLeft: '8px'
                      }}
                    >
                      Dia {new Date(student.birth_date + "T12:00:00Z").getUTCDate()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white border-3 border-black border-dashed shadow-[4px_4px_0px_#000] p-6 text-center">
                <p className="font-display font-bold text-neutral-400 text-sm uppercase">Nenhum outro aniversariante cadastrado.</p>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}

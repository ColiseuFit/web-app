"use client";

import { TvBirthday } from "@/app/tv/actions";
import { Cake, Calendar, Sparkles, ChevronRight } from "lucide-react";
import AthleteAvatar from "@/components/Identity/AthleteAvatar";

interface TvBirthdaysPanelProps {
  birthdays: TvBirthday[];
  targetDate: string;
}

export default function TvBirthdaysPanel({ birthdays, targetDate }: TvBirthdaysPanelProps) {
  const [year, month, day] = targetDate.split("-").map(Number);
  const tvDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

  const tvDay = tvDate.getUTCDate();
  const tvMonth = tvDate.getUTCMonth();
  
  // Format month name for the header
  const monthName = tvDate.toLocaleString('pt-BR', { month: 'long', timeZone: 'UTC' });

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

  // MOCK PARA TESTE: Caso queira visualizar múltiplos aniversariantes hoje na TV,
  // descomente as linhas abaixo e comente o loop original.
  /*
  const mockAvatars = [null, null, null];
  todayBirthdays.push(
    { id: "mock-1", full_name: "Geralt de Rívia", avatar_url: null, birth_date: targetDate },
    { id: "mock-2", full_name: "Yennefer de Vengerberg", avatar_url: null, birth_date: targetDate }
  );
  */

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
    <div className="flex flex-col flex-1 bg-neutral-100 border-4 border-black shadow-[8px_8px_0px_#000] overflow-hidden">
      
      {/* ── HEADER HORIZONTAL ENXUTO ── */}
      <div 
        className="bg-yellow-400 border-b-4 border-black flex items-center justify-between shrink-0 relative overflow-hidden z-20"
        style={{ padding: '16px 32px' }}
      >
        <div 
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{ backgroundImage: "repeating-linear-gradient(45deg, #000 0, #000 2px, transparent 2px, transparent 16px)" }}
        />
        <div className="relative z-10 flex items-center gap-4">
          <div className="bg-white border-3 border-black shadow-[4px_4px_0px_#000] rotate-[-5deg] shrink-0" style={{ padding: '8px' }}>
            <Cake size={32} className="text-black" />
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

      {/* ── CONTEÚDO SCROLLÁVEL GRID ── */}
      <div className="flex-1 overflow-y-auto w-full relative flex flex-col">
        
        {/* ── BANDA DE DESTAQUE: HOJE ── */}
        {(todayBirthdays.length > 0 || (weekBirthdays.length === 0 && monthBirthdays.length === 0)) && (
          <div className="w-full shrink-0 border-b-4 border-black relative bg-yellow-300">
            <div 
              className="absolute inset-0 opacity-5 pointer-events-none"
              style={{ backgroundImage: "repeating-linear-gradient(-45deg, #000 0, #000 2px, transparent 2px, transparent 16px)" }}
            />
            
            <div className="w-full max-w-[1920px] mx-auto relative z-10" style={{ padding: '32px 40px' }}>
              <div className="flex flex-col shrink-0">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-white text-yellow-500 p-2 border-3 border-black shadow-[4px_4px_0px_#000] shrink-0">
                    <Sparkles size={32} className="animate-pulse" />
                  </div>
                  <h2 className="font-headline font-black text-4xl uppercase tracking-widest text-black pt-1" style={{ textShadow: '2px 2px 0px #fff' }}>
                    Hoje!
                  </h2>
                </div>

                {todayBirthdays.length > 0 ? (
                  <div className={todayBirthdays.length === 1 ? 'w-full block' : 'grid gap-8 grid-cols-1 xl:grid-cols-2'}>
                    {todayBirthdays.map((student) => (
                      <div 
                        key={student.id}
                        className="bg-white border-4 border-black shadow-[12px_12px_0px_#000] flex flex-row items-center gap-8 relative w-full h-full"
                        style={{ 
                          padding: '32px', 
                          maxWidth: todayBirthdays.length === 1 ? '900px' : '100%',
                          margin: todayBirthdays.length === 1 ? '0 auto' : '0'
                        }}
                      >
                        {/* Selo Festa */}
                        <div 
                          className="absolute -top-4 -right-4 bg-red-500 text-white font-display font-black border-3 border-black shadow-[4px_4px_0px_#000] uppercase rotate-3 z-10"
                          style={{ padding: '6px 24px', fontSize: '18px' }}
                        >
                          Festa no Box
                        </div>

                        <div style={{ flexShrink: 0 }}>
                          <AthleteAvatar
                            url={student.avatar_url}
                            name={student.full_name}
                            size={160}
                            borderWidth={4}
                            shadowSize={4}
                            rounded={true}
                          />
                        </div>
                        <div className="flex flex-col min-w-0 flex-1 justify-center">
                          <span className="font-display font-black text-2xl text-yellow-600 uppercase tracking-widest mb-2 block">
                            Feliz Aniversário
                          </span>
                          <h3 className="font-headline font-black text-5xl uppercase text-black break-words min-w-0" style={{ lineHeight: '1.1' }}>
                            {student.full_name}
                          </h3>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div 
                    className="bg-white border-4 border-black border-dashed flex flex-col items-center justify-center shrink-0 w-full max-w-2xl mx-auto h-full"
                    style={{ padding: '48px' }}
                  >
                    <span className="text-6xl block mb-4 grayscale opacity-80">🎂</span>
                    <p className="font-display font-black text-2xl text-neutral-500 uppercase">Sem festa hoje.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── BANDA SECUNDÁRIA: SEMANA E MÊS ── */}
        <div className="flex flex-col w-full max-w-[1920px] mx-auto flex-1 shrink-0" style={{ padding: '40px', gap: '48px' }}>
          
          {/* SEÇÃO: NESTA SEMANA */}
          {weekBirthdays.length > 0 && (
            <div className="flex flex-col shrink-0">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-black text-yellow-400 p-2 border-3 border-black shadow-[4px_4px_0px_#FFD700] shrink-0">
                  <Calendar size={28} />
                </div>
                <h2 className="font-headline font-black text-3xl uppercase tracking-tight text-black pt-1">
                  Nesta Semana
                </h2>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6 items-stretch">
                {weekBirthdays.map(student => (
                  <div 
                    key={student.id} 
                    className="bg-white border-3 border-black shadow-[4px_4px_0px_#000] flex flex-col items-center text-center relative w-full h-full transition-transform hover:-translate-y-1"
                    style={{ paddingTop: '32px' }}
                  >
                    <div style={{ flexShrink: 0, marginBottom: '16px', paddingLeft: '24px', paddingRight: '24px' }}>
                      <AthleteAvatar url={student.avatar_url} name={student.full_name} size={96} borderWidth={3} shadowSize={3} rounded={true} />
                    </div>
                    
                    <div className="flex-1 flex flex-col items-center justify-center w-full min-w-0" style={{ paddingLeft: '16px', paddingRight: '16px', marginBottom: '24px' }}>
                      <span className="font-headline font-black text-2xl uppercase line-clamp-3 min-w-0 break-words" style={{ lineHeight: '1.2' }}>
                        {student.full_name}
                      </span>
                    </div>

                    <div 
                      className="bg-yellow-400 text-black border-t-3 border-black font-display font-black text-xl uppercase whitespace-nowrap w-full mt-auto flex items-center justify-center"
                      style={{ padding: '12px 0', flexShrink: 0 }}
                    >
                      Dia {new Date(student.birth_date + "T12:00:00Z").getUTCDate()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SEÇÃO: DO MÊS */}
          {monthBirthdays.length > 0 && (
            <div className="flex flex-col shrink-0">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-neutral-300 text-black p-2 border-3 border-black shadow-[4px_4px_0px_#000] shrink-0">
                  <ChevronRight size={28} />
                </div>
                <h2 className="font-headline font-black text-2xl uppercase tracking-tight text-black pt-1">
                  Demais do Mês
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 items-stretch">
                {monthBirthdays.map(student => (
                  <div 
                    key={student.id} 
                    className="flex flex-row items-stretch justify-between bg-white border-3 border-neutral-400 shadow-[3px_3px_0px_#000] gap-0 transition-transform hover:-translate-x-1 h-full w-full"
                  >
                    <div className="flex items-center gap-4 min-w-0 flex-1" style={{ padding: '16px' }}>
                      <div style={{ flexShrink: 0 }}>
                        <AthleteAvatar url={student.avatar_url} name={student.full_name} size={64} borderWidth={2} shadowSize={0} rounded={true} />
                      </div>
                      <div className="flex flex-col flex-1 min-w-0 justify-center">
                        <span className="font-headline font-black text-xl uppercase line-clamp-2 min-w-0 break-words" style={{ lineHeight: '1.1' }}>
                          {student.full_name}
                        </span>
                      </div>
                    </div>
                    <div 
                      className="bg-neutral-800 text-white border-l-3 border-neutral-400 font-display font-black text-lg uppercase flex items-center justify-center whitespace-nowrap"
                      style={{ padding: '0 20px', flexShrink: 0 }}
                    >
                      Dia {new Date(student.birth_date + "T12:00:00Z").getUTCDate()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

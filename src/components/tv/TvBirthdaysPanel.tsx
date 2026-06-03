"use client";

import { TvBirthday } from "@/app/tv/actions";
import { Cake, Calendar, Sparkles, ChevronRight } from "lucide-react";
import AthleteAvatar from "@/components/Identity/AthleteAvatar";
import { useEffect, useRef } from "react";

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
 * Implementa auto-scroll autônomo e suave para listas que excedem a altura visível da tela da TV.
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

  // Referências do DOM para gerenciar a rolagem vertical automatizada em Smart TVs (mãos livres)
  const weekScrollRef = useRef<HTMLDivElement>(null);
  const monthScrollRef = useRef<HTMLDivElement>(null);

  /**
   * Configura e gerencia o ciclo de vida do auto-scroll de uma lista vertical.
   * Rola o contêiner suavemente se o conteúdo exceder a altura visível, pausando no topo
   * e no final para leitura. Pausa imediatamente caso o usuário interaja.
   * 
   * Raciocínio Técnico de Constantes:
   * - step (0.8px): Deslocamento ultra suave por tick, reduzindo jitter (tremor) e permitindo leitura fluida à distância.
   * - delay (40ms): Equivale a ~25 ticks por segundo. Otimiza o consumo de CPU em navegadores limitados de Smart TVs.
   * - waitCounter (75 ticks): Equivale a ~3 segundos de congelamento (75 * 40ms) nas extremidades para leitura confortável.
   * 
   * @param {HTMLDivElement | null} element - O elemento DOM da lista com overflow.
   * @returns {Function} Função de limpeza (cleanup) para desmontar os listeners e o timer.
   */
  useEffect(() => {
    const setupAutoScroll = (element: HTMLDivElement | null) => {
      if (!element) return;

      let intervalId: NodeJS.Timeout;
      let scrollDirection = 1; // 1 representa rolagem para baixo (descendo), -1 representa para cima (subindo)
      let waitCounter = 0;
      let isInteracting = false; // Flag para suspender autoscroll sob interação
      
      const step = 0.8;
      const delay = 40;

      // Eventos de interação humana para pausar temporariamente a rolagem automática
      const handleMouseEnter = () => { isInteracting = true; };
      const handleMouseLeave = () => { isInteracting = false; };
      const handleFocus = () => { isInteracting = true; };
      const handleBlur = () => { isInteracting = false; };

      element.addEventListener("mouseenter", handleMouseEnter);
      element.addEventListener("mouseleave", handleMouseLeave);
      element.addEventListener("focusin", handleFocus);
      element.addEventListener("focusout", handleBlur);
      element.addEventListener("touchstart", handleMouseEnter);
      element.addEventListener("touchend", handleMouseLeave);

      /**
       * Loop de execução do scroll. Realiza o deslocamento de pixels
       * e inverte o sentido de rolagem de forma automática nas extremidades.
       */
      const performScroll = () => {
        if (isInteracting) return;

        // Calcula o limite máximo de rolagem vertical disponível
        const maxScroll = element.scrollHeight - element.clientHeight;
        if (maxScroll <= 0) {
          // Se todo o conteúdo couber, força o scroll no topo e aborta a animação
          element.scrollTop = 0;
          return;
        }

        // Se estiver no período de congelamento/pausa de extremidade, decrementa o contador
        if (waitCounter > 0) {
          waitCounter--;
          return;
        }

        element.scrollTop += scrollDirection * step;

        // Tratamento de Borda: Atingiu o limite inferior (com tolerância de 1px contra arredondamentos de zoom)
        if (scrollDirection === 1 && element.scrollTop >= maxScroll - 1) {
          element.scrollTop = maxScroll;
          scrollDirection = -1; // Altera o sentido para subida
          waitCounter = 75; // Pausa no final por 3 segundos para leitura
        }
        // Tratamento de Borda: Retornou ao topo absoluto da lista
        else if (scrollDirection === -1 && element.scrollTop <= 0) {
          element.scrollTop = 0;
          scrollDirection = 1; // Altera o sentido para descida
          waitCounter = 75; // Pausa no início por 3 segundos para leitura
        }
      };

      intervalId = setInterval(performScroll, delay);

      // Retorna a função de cleanup do ciclo de vida para remover listeners e limpar timers
      return () => {
        clearInterval(intervalId);
        element.removeEventListener("mouseenter", handleMouseEnter);
        element.removeEventListener("mouseleave", handleMouseLeave);
        element.removeEventListener("focusin", handleFocus);
        element.removeEventListener("focusout", handleBlur);
        element.removeEventListener("touchstart", handleMouseEnter);
        element.removeEventListener("touchend", handleMouseLeave);
      };
    };

    const cleanupWeek = setupAutoScroll(weekScrollRef.current);
    const cleanupMonth = setupAutoScroll(monthScrollRef.current);

    return () => {
      if (cleanupWeek) cleanupWeek();
      if (cleanupMonth) cleanupMonth();
    };
  }, [birthdays]);

  return (
    <div 
      className="flex flex-col flex-1 bg-neutral-100 border-4 border-black shadow-[8px_8px_0px_#000] overflow-hidden w-full h-full"
      style={{ height: '100%' }}
    >
      
      {/* Estilo local para ocultar barras de rolagem nativas de Smart TVs */}
      <style dangerouslySetInnerHTML={{__html: `
        .tv-birthday-scroll-container {
          scrollbar-width: none !important;
          -ms-overflow-style: none !important;
        }
        .tv-birthday-scroll-container::-webkit-scrollbar {
          display: none !important;
        }
      `}} />
      
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

      {/* ── CONTEÚDO PRINCIPAL (Flex-col com margens e gap via CSS Inline) ── */}
      <div 
        className="flex-grow flex flex-col min-h-0 overflow-hidden w-full"
        style={{ padding: '20px 24px', gap: '20px' }}
      >
        
        {/* SEÇÃO: HOJE! (Destaque de Topo Horizontal) */}
        {todayBirthdays.length > 0 && (
          <div className="flex flex-col shrink-0" style={{ gap: '10px' }}>
            {/* Título de Seção */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div 
                className="bg-yellow-300 text-black border-2 border-black shadow-[2px_2px_0px_#000] shrink-0 flex items-center justify-center"
                style={{ padding: '6px', display: 'inline-flex', alignItems: 'center' }}
              >
                <Sparkles size={18} className="animate-pulse flex-shrink-0" />
              </div>
              <h2 className="font-headline font-black text-xl uppercase tracking-wider text-black pt-0.5 leading-none">
                Hoje!
              </h2>
            </div>

            {/* Cards de Hoje */}
            <div className="flex flex-wrap gap-4 w-full">
              {todayBirthdays.map((student) => (
                <div 
                  key={student.id}
                  className="bg-white border-3 border-black shadow-[3px_3px_0px_#000] relative"
                  style={{ 
                    padding: '10px 16px', 
                    minHeight: '74px',
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: '14px',
                    minWidth: '260px',
                    flex: '1 1 0px'
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
                      size={40}
                      borderWidth={2}
                      shadowSize={2}
                      rounded={true}
                    />
                  </div>
                  <div className="flex flex-col min-w-0 flex-1 justify-center">
                    <span className="font-display font-black text-[9px] text-yellow-600 uppercase tracking-widest block leading-none" style={{ marginBottom: '4px' }}>
                      Feliz Aniversário
                    </span>
                    <h3 className="font-headline font-black text-sm uppercase text-black truncate leading-tight">
                      {student.full_name}
                    </h3>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SEÇÃO COLUNAS (Resto do Mês e Semana) */}
        <div 
          className="flex-1 flex flex-row min-h-0 overflow-hidden w-full"
          style={{ gap: '24px', height: '100%' }}
        >
          
          {/* COLUNA ESQUERDA: NESTA SEMANA */}
          <div 
            className="flex flex-col min-h-0 overflow-hidden" 
            style={{ gap: '12px', width: '50%', height: '100%' }}
          >
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
            
            <div 
              ref={weekScrollRef}
              className="flex-1 min-h-0 overflow-y-auto pr-1 tv-birthday-scroll-container"
            >
              {weekBirthdays.length > 0 ? (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 w-full content-start">
                  {weekBirthdays.map((student) => (
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
                        className="bg-yellow-400 text-black border-2 border-black font-display font-black text-[9px] uppercase shrink-0"
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
                <div className="bg-white border-3 border-black border-dashed shadow-[3px_3px_0px_#000] p-4 text-center">
                  <p className="font-display font-bold text-neutral-500 text-xs uppercase">Nenhum aniversário nesta semana.</p>
                </div>
              )}
            </div>
          </div>

          {/* COLUNA DIREITA: DEMAIS DO MÊS */}
          <div 
            className="flex flex-col min-h-0 overflow-hidden" 
            style={{ gap: '12px', width: '50%', height: '100%' }}
          >
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

            <div 
              ref={monthScrollRef}
              className="flex-1 min-h-0 overflow-y-auto pr-1 tv-birthday-scroll-container"
            >
              {monthBirthdays.length > 0 ? (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 w-full content-start">
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
                <div className="bg-white border-3 border-black border-dashed shadow-[3px_3px_0px_#000] p-4 text-center">
                  <p className="font-display font-bold text-neutral-400 text-xs uppercase">Nenhum outro aniversariante cadastrado.</p>
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}

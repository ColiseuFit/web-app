"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { getTvData, TvDataResponse, TvClassSlot } from "./actions";
import TvClock from "@/components/tv/TvClock";
import TvTabBar, { TvTabId } from "@/components/tv/TvTabBar";
import TvCheckInPanel from "@/components/tv/TvCheckInPanel";
import TvWodPanel from "@/components/tv/TvWodPanel";
import TvComingSoonPanel from "@/components/tv/TvComingSoonPanel";
import TvSkeleton from "@/components/tv/TvSkeleton";
import TvBirthdaysPanel from "@/components/tv/TvBirthdaysPanel";
import { ChevronLeft, ChevronRight, RefreshCw, User, Trophy, Cake } from "lucide-react";

/**
 * Orquestrador principal da Coliseu TV.
 * Gerencia:
 * - Polling de dados do servidor (15s)
 * - Estado de abas (Check-in | WOD | Em Breve)
 * - Navegação de slots (automática e manual)
 * - Delegação de renderização para subcomponentes especializados
 */
export default function TvClient() {
  const [data, setData] = useState<TvDataResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number>(-1);
  const [isAutoMode, setIsAutoMode] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<TvTabId>("checkin");
  const autoModeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pollingTimerRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Busca e sincroniza os dados da TV a partir do servidor.
   * Executa um polling recorrente e seguro de 15 segundos.
   * 
   * @param {boolean} [isSilent=false] - Se true, realiza a atualização em segundo plano sem exibir o spinner de loading em tela cheia.
   * @returns {Promise<void>}
   */
  const fetchData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setIsRefreshing(true);

    try {
      const response = await getTvData();

      if (response.error) {
        setError(response.error);
      } else if (response.data) {
        setData(response.data);
        setError(null);
      }
    } catch (err: any) {
      console.error("[TvClient] Erro crítico ao buscar dados da TV:", err);
      setError(err.message || "Erro de conexão de rede no tatame.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);

      // Agenda a próxima busca apenas após a conclusão da requisição atual
      // Evita o empilhamento de requisições pendentes se o banco de dados estiver lento
      if (pollingTimerRef.current) clearTimeout(pollingTimerRef.current);
      pollingTimerRef.current = setTimeout(() => {
        fetchData(true);
      }, 15000);
    }
  }, []);

  // Inicializa o polling na montagem e limpa timers no desmonte
  useEffect(() => {
    fetchData();
    return () => {
      if (pollingTimerRef.current) clearTimeout(pollingTimerRef.current);
    };
  }, [fetchData]);

  /**
   * Identifica o índice da turma/slot que está mais próximo cronologicamente do horário local.
   * Dá prioridade para a turma ativa caso o horário esteja entre 15 minutos antes e 45 minutos depois do início da aula.
   * 
   * @param {TvClassSlot[]} slots - Grade estrutural de turmas ativas do dia correspondente.
   * @returns {number} O índice correspondente ao slot prioritário ou -1 caso esteja vazia.
   */
  const getClosestSlotIndex = useCallback((slots: TvClassSlot[]): number => {
    if (!slots || slots.length === 0) return -1;

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    let closestIndex = 0;
    let minDifference = Infinity;

    slots.forEach((slot, index) => {
      const [hours, minutes] = slot.time_start.split(":").map(Number);
      const slotMinutes = hours * 60 + minutes;

      // Diferença absoluta em minutos
      const difference = Math.abs(currentMinutes - slotMinutes);

      // Regra de Box: se estiver dentro de uma janela de 15min antes e 45min depois do início
      // da aula, essa turma ganha prioridade extrema.
      const isWithinClassWindow =
        currentMinutes >= slotMinutes - 15 &&
        currentMinutes <= slotMinutes + 45;

      if (isWithinClassWindow) {
        minDifference = difference;
        closestIndex = index;
      } else if (difference < minDifference && minDifference > 60) {
        // Fallback: se não estiver em nenhuma janela, escolhe o horário cronologicamente mais próximo
        minDifference = difference;
        closestIndex = index;
      }
    });

    return closestIndex;
  }, []);

  // Auto-ajusta o slot em exibição se estiver em Modo Automático
  useEffect(() => {
    if (isAutoMode && data && data.slots.length > 0) {
      const closestIndex = getClosestSlotIndex(data.slots);
      if (closestIndex !== -1) {
        setSelectedSlotIndex(closestIndex);
      }
    }
  }, [isAutoMode, data, getClosestSlotIndex]);

  // Monitoramento periódico do horário (a cada minuto) para trocar a turma automaticamente
  useEffect(() => {
    const handleTimeCheck = () => {
      if (isAutoMode && data && data.slots.length > 0) {
        const closestIndex = getClosestSlotIndex(data.slots);
        if (closestIndex !== -1 && closestIndex !== selectedSlotIndex) {
          setSelectedSlotIndex(closestIndex);
        }
      }
    };

    const interval = setInterval(handleTimeCheck, 60000);
    return () => clearInterval(interval);
  }, [isAutoMode, data, selectedSlotIndex, getClosestSlotIndex]);

  /**
   * Modifica a turma em exibição a partir da interação do usuário e suspende temporariamente
   * o modo automático (`AUTO` para `MANUAL`) por 10 minutos para autocura.
   * 
   * @param {number} index - O novo índice do slot de turma desejado.
   */
  const handleSlotChange = (index: number) => {
    if (!data || data.slots.length === 0) return;

    let targetIndex = index;
    if (index < 0) targetIndex = data.slots.length - 1;
    if (index >= data.slots.length) targetIndex = 0;

    setSelectedSlotIndex(targetIndex);
    setIsAutoMode(false);

    // Configura um timer de autocura: se o coach navegar manualmente, após 10 minutos de inatividade,
    // a TV retorna automaticamente ao modo de monitoramento automático.
    if (autoModeTimerRef.current) clearTimeout(autoModeTimerRef.current);
    autoModeTimerRef.current = setTimeout(() => {
      setIsAutoMode(true);
    }, 600000); // 10 minutos
  };

  useEffect(() => {
    return () => {
      if (autoModeTimerRef.current) clearTimeout(autoModeTimerRef.current);
    };
  }, []);

  // ─── Telas de Estado: Loading e Erro ───

  if (loading && !data) {
    return <TvSkeleton />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-black" style={{ backgroundColor: "var(--nb-surface-low)" }}>
        <div className="bg-red-100 border-3 border-red-500 p-8 shadow-[8px_8px_0px_#E31B23] text-center max-w-md">
          <span className="text-4xl">🚨</span>
          <h2 className="font-headline font-black text-2xl text-red-600 uppercase mt-4">
            Erro de Sincronização
          </h2>
          <p className="font-display font-bold text-black text-sm mt-2">
            {error}
          </p>
          <button
            onClick={() => fetchData()}
            className="mt-6 px-6 py-3 bg-red-600 text-white font-display font-black border-2 border-black uppercase text-sm shadow-[4px_4px_0px_#000] hover:translate-x-[-2px] hover:translate-y-[-2px] active:translate-x-[2px] active:translate-y-[2px] cursor-pointer"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  const currentSlot: TvClassSlot | undefined = data?.slots[selectedSlotIndex];
  const showClassControls = activeTab !== "birthdays" && activeTab !== "ranking";

  return (
    <div
      className="text-black flex flex-col font-sans overflow-hidden fixed inset-0"
      style={{
        backgroundColor: "var(--nb-surface-low)",
        backgroundImage:
          "radial-gradient(circle, rgba(0, 0, 0, 0.07) 1.5px, transparent 1.5px)",
        backgroundSize: "24px 24px",
        padding: "48px 64px",
        gap: "20px",
        width: "133.33vw",
        height: "133.33vh",
        transform: "scale(0.75)",
        transformOrigin: "top left",
      }}
    >
      {/* ═══ 1. Header do Painel — Layout 2 Linhas ═══ */}
      <header
        className="z-10 bg-white border-3 border-black shadow-[6px_6px_0px_#000] flex flex-col shrink-0"
      >
        {/* ── Linha 1: Branding (Logo + Abas + Clock) ── */}
        <div
          className={`flex items-center justify-between ${showClassControls ? "border-b-2 border-black" : ""}`}
          style={{ padding: "16px 24px" }}
        >
          {/* Logo + Abas */}
          <div className="flex items-center" style={{ gap: "16px" }}>
            <div
              className="bg-black text-white flex items-center justify-center shadow-[4px_4px_0px_#FFD700]"
              style={{ padding: "10px 24px", height: "48px" }}
            >
              <span className="font-headline font-black text-2xl md:text-3xl tracking-tighter">
                COLISEU <span className="text-yellow-400">TV</span>
              </span>
            </div>

            <TvTabBar activeTab={activeTab} onTabChange={setActiveTab} />
          </div>

          {/* Clock alinhado à direita */}
          <TvClock />
        </div>

        {/* ── Linha 2: Controles da Turma ── */}
        {showClassControls && (
          <div
            className="flex items-center justify-between"
            style={{ padding: "12px 24px" }}
          >
            {/* Grupo Esquerdo: Info da Turma */}
            <div className="flex items-center" style={{ gap: "10px" }}>
              {/* Coach da Turma Atual */}
              {currentSlot ? (
                <div
                  className="flex items-center font-display font-black text-sm text-neutral-500 bg-white border-2 border-black shadow-[2px_2px_0px_#000] uppercase"
                  style={{ padding: "0 16px", gap: "8px", height: "44px" }}
                >
                  <User size={14} className="text-black" />
                  COACH: <span className="text-black">{currentSlot.coach_name}</span>
                </div>
              ) : (
                <div
                  className="flex items-center font-display font-black text-sm text-neutral-400 bg-neutral-50 border-2 border-neutral-300 uppercase"
                  style={{ padding: "0 16px", gap: "8px", height: "44px" }}
                >
                  <User size={14} className="text-neutral-400" />
                  SEM TURMA SELECIONADA
                </div>
              )}

              {/* Contador de Check-ins */}
              <div
                className="flex items-center bg-yellow-300 border-2 border-black shadow-[2px_2px_0px_#000]"
                style={{ padding: "0 20px", gap: "10px", height: "44px" }}
              >
                <span className="font-display font-black text-sm text-black/60 uppercase tracking-wider">
                  CHECK-INS
                </span>
                <span className="font-headline font-black text-lg text-black leading-none">
                  {currentSlot ? `${currentSlot.students.length} / ${currentSlot.capacity}` : "— / —"}
                </span>
              </div>
            </div>

            {/* Grupo Direito: Controles de Navegação */}
            <div className="flex items-center" style={{ gap: "10px" }}>
              {/* Botão de Auto-ajuste */}
              <button
                onClick={() => setIsAutoMode(!isAutoMode)}
                className={`border-2 border-black font-display font-black text-sm uppercase tracking-wide cursor-pointer transition-all flex items-center ${
                  isAutoMode
                    ? "bg-green-400 text-black shadow-none translate-x-[2px] translate-y-[2px]"
                    : "bg-white text-neutral-700"
                }`}
                style={{
                  padding: "0 16px",
                  gap: "10px",
                  height: "44px",
                  boxShadow: isAutoMode ? "none" : "3px 3px 0px #000",
                }}
              >
                <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
                  <span
                    className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                      isAutoMode ? "bg-green-600" : "bg-neutral-400"
                    }`}
                  ></span>
                  <span
                    className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                      isAutoMode ? "bg-green-600" : "bg-neutral-500"
                    }`}
                  ></span>
                </span>
                <span className="whitespace-nowrap">
                  {isAutoMode ? "AUTO" : "MANUAL"}
                </span>
              </button>

              {/* Navegação de Slots */}
              <div
                className="flex items-center bg-white border-2 border-black shadow-[3px_3px_0px_#000]"
                style={{ height: "44px" }}
              >
                <button
                  onClick={() => handleSlotChange(selectedSlotIndex - 1)}
                  className="hover:bg-neutral-100 border-r-2 border-black cursor-pointer flex items-center justify-center"
                  style={{ width: "40px", height: "100%" }}
                  title="Turma Anterior"
                >
                  <ChevronLeft size={18} className="text-black" />
                </button>
                <div
                  className="font-headline font-black text-sm text-center uppercase flex items-center justify-center"
                  style={{ minWidth: "80px", height: "100%", padding: "0 8px" }}
                >
                  {currentSlot ? currentSlot.time_start.slice(0, 5) : "—:—"}
                </div>
                <button
                  onClick={() => handleSlotChange(selectedSlotIndex + 1)}
                  className="hover:bg-neutral-100 border-l-2 border-black cursor-pointer flex items-center justify-center"
                  style={{ width: "40px", height: "100%" }}
                  title="Próxima Turma"
                >
                  <ChevronRight size={18} className="text-black" />
                </button>
              </div>

              {/* Refresh */}
              <button
                onClick={() => fetchData(true)}
                className={`bg-white border-2 border-black cursor-pointer active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center justify-center ${
                  isRefreshing ? "animate-spin" : ""
                }`}
                style={{
                  width: "44px",
                  height: "44px",
                  boxShadow: "3px 3px 0px #000",
                }}
                title="Atualizar agora"
              >
                <RefreshCw size={18} className="text-black" />
              </button>
            </div>
          </div>
        )}
      </header>

      {/* ═══ 2. Conteúdo por Aba ═══ */}
      <div className="flex-grow z-10 flex flex-col" style={{ width: "100%" }}>
        {activeTab === "checkin" && (
          <TvCheckInPanel currentSlot={currentSlot} />
        )}

        {activeTab === "wod" && data && <TvWodPanel data={data} />}

        {activeTab === "ranking" && (
          <TvComingSoonPanel
            title="RANKING EM BREVE"
            description="O painel com os recordes pessoais (PRs) e as melhores pontuações dos alunos está sendo forjado para o Coliseu TV. Em breve, este espaço ganha vida."
            icon={<Trophy size={48} className="text-black" />}
          />
        )}

        {activeTab === "birthdays" && data && (
          <TvBirthdaysPanel birthdays={data.birthdays} targetDate={data.date} />
        )}
      </div>
    </div>
  );
}

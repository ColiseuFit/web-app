"use client";

import { TvClassSlot } from "@/app/tv/actions";
import TvStudentGrid from "./TvStudentGrid";

interface TvCheckInPanelProps {
  currentSlot: TvClassSlot | undefined;
  activeDate?: string;
}

/**
 * Painel dedicado à exibição do Check-in dos alunos.
 * Ocupa 100% da área vertical disponível abaixo do header da TV.
 *
 * @param currentSlot - Slot de aula selecionado contendo a lista de alunos e metadados do coach.
 * @param activeDate - Data ativa em exibição na TV.
 */
export default function TvCheckInPanel({ currentSlot, activeDate }: TvCheckInPanelProps) {
  if (!currentSlot) {
    return (
      <div
        className="flex flex-col items-center justify-center border-3 border-black bg-white text-center shadow-[6px_6px_0px_#000]"
        style={{ padding: "40px", minHeight: "60vh" }}
      >
        <span className="text-6xl mb-4">💤</span>
        <h2 className="font-headline font-black text-2xl uppercase">
          Sem Turmas para Exibir
        </h2>
        <p className="font-display font-bold text-neutral-500 text-sm mt-2 uppercase tracking-wide">
          Nenhum horário ou grade estrutural ativa foi encontrada para o dia de
          hoje.
        </p>
      </div>
    );
  }

  return (
    <TvStudentGrid
      students={currentSlot.students}
      timeStart={currentSlot.time_start}
      activeDate={activeDate}
      className=""
    />
  );
}

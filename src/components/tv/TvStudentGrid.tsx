"use client";

import { TvStudent } from "@/app/tv/actions";
import TvStudentCard from "./TvStudentCard";

interface TvStudentGridProps {
  students: TvStudent[];
  capacity: number;
  timeStart: string;
  className?: string;
}

export default function TvStudentGrid({ students, capacity, timeStart, className }: TvStudentGridProps) {
  const checkinsCount = students.length;

  return (
    <div className={`flex flex-col w-full ${className || ""}`} style={{ gap: "24px" }}>
      {/* Indicadores de Turma */}
      <div 
        className="flex flex-wrap items-center justify-between bg-yellow-300 border-3 border-black shadow-[4px_4px_0px_#000]"
        style={{ padding: "20px 24px", gap: "20px" }}
      >
        <div>
          <span className="font-display font-black text-xs md:text-sm text-black tracking-widest block uppercase">
            STATUS DA TURMA
          </span>
          <span className="font-headline font-black text-2xl md:text-3xl text-black uppercase">
            HORÁRIO: {timeStart.slice(0, 5)}
          </span>
        </div>

        <div className="flex" style={{ gap: "16px" }}>
          <div 
            className="bg-white border-2 border-black text-center shadow-[2px_2px_0px_#000]"
            style={{ padding: "8px 24px" }}
          >
            <span className="font-display font-black text-[10px] text-neutral-500 block uppercase">
              CHECK-INS ATIVOS
            </span>
            <span className="font-headline font-black text-xl md:text-2xl text-black">
              {checkinsCount} / {capacity}
            </span>
          </div>
        </div>
      </div>

      {/* Grade de Alunos */}
      {checkinsCount > 0 ? (() => {
        let gridCols = 3;
        let gridGap = "20px";
        let isCompact = false;

        if (checkinsCount > 8) {
          gridCols = 4;
          gridGap = "14px";
          isCompact = true;
        }
        if (checkinsCount > 16) {
          gridCols = 5;
          gridGap = "10px";
          isCompact = true;
        }

        return (
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${gridCols}, 1fr)`, gap: gridGap }}>
            {students.map((student) => (
              <TvStudentCard key={student.id} student={student} isCompact={isCompact} />
            ))}
          </div>
        );
      })() : (
        <div 
          className="flex flex-col items-center justify-center border-3 border-black bg-white p-12 text-center shadow-[8px_8px_0px_#000] min-h-[420px] relative overflow-hidden"
          style={{
            backgroundImage: "radial-gradient(#e5e7eb 2px, transparent 2px)",
            backgroundSize: "16px 16px"
          }}
        >
          {/* Listras Brutalistas Decorativas nas Pontas */}
          <div 
            className="absolute top-0 left-0 right-0 h-3 border-b-2 border-black"
            style={{
              backgroundImage: "repeating-linear-gradient(45deg, #facc15, #facc15 15px, #000000 15px, #000000 30px)"
            }}
          />

          <div className="relative">
            <span className="text-6xl md:text-7xl mb-4 select-none block animate-bounce">
              🏋️‍♂️
            </span>
            <div className="absolute -top-2 -right-4 bg-red-500 text-white font-display font-black text-[10px] px-2 py-0.5 border border-black uppercase tracking-widest shadow-[1px_1px_0px_#000] animate-pulse">
              SEM ALUNOS
            </div>
          </div>

          <h2 className="font-headline font-black text-3xl md:text-4xl text-black uppercase tracking-tight mt-4">
            MURAL DE CHECK-INS VAZIO
          </h2>
          <p className="font-display font-bold text-sm md:text-base text-neutral-500 max-w-lg mt-3 uppercase tracking-wide leading-relaxed">
            Abra o aplicativo <span className="text-black underline decoration-yellow-400 decoration-3">Coliseu Fit</span> agora mesmo, confirme sua presença e seja o primeiro a subir na TV para a aula das <span className="text-black bg-yellow-300 border border-black px-1.5 py-0.5 font-mono shadow-[1px_1px_0px_#000]">{timeStart.slice(0, 5)}</span>!
          </p>

          {/* Instruções de QR Code Brutalistas */}
          <div 
            className="flex flex-col md:flex-row items-center bg-yellow-50 border-2 border-black shadow-[4px_4px_0px_#000] max-w-md"
            style={{ marginTop: "32px", padding: "20px", gap: "24px" }}
          >
            <div className="bg-black text-white p-3 border border-black flex-shrink-0 flex items-center justify-center font-mono font-black text-xs h-16 w-16 select-none relative">
              {/* Moldura de QrCode Simulado */}
              <div className="absolute inset-1 border-2 border-yellow-300 border-dashed animate-pulse" />
              QR CODE
            </div>
            <div className="text-left">
              <span className="font-display font-black text-xs text-black uppercase block tracking-wider">
                💡 COMO CONFIRMAR SUA PRESENÇA:
              </span>
              <span className="font-display font-bold text-[11px] text-neutral-600 uppercase mt-1 block leading-tight">
                Escaneie o QR Code oficial do totem do box no seu app para realizar a validação e aparecer no painel.
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

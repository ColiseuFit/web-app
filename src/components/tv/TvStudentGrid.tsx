"use client";

import { TvStudent } from "@/app/tv/actions";
import TvStudentCard from "./TvStudentCard";

interface TvStudentGridProps {
  students: TvStudent[];
  timeStart: string;
  className?: string;
}

/**
 * Grade de exibição de alunos checked-in para o Coliseu TV.
 * Determina dinamicamente a quantidade de colunas, espaçamentos e o tamanho de card
 * com base na quantidade de alunos presentes para maximizar o preenchimento da tela.
 *
 * @param {TvStudentGridProps} props - Propriedades do componente.
 * @param {TvStudent[]} props.students - Lista de estudantes com check-in confirmado.
 * @param {string} props.timeStart - Horário de início do slot atual (ex: "19:00:00").
 * @param {string} [props.className] - Classe CSS opcional para estilização externa.
 * @returns {React.ReactElement} Grade adaptativa brutalista ou tela de empty state.
 */
export default function TvStudentGrid({ students, timeStart, className }: TvStudentGridProps) {
  const checkinsCount = students.length;

  return (
    <div className={`flex flex-col w-full ${className || ""}`} style={{ gap: "24px" }}>

      {/* Grade de Alunos */}
      {checkinsCount > 0 ? (() => {
        let gridCols = 4;
        let gridGap = "24px";
        let cardSize: "large" | "normal" | "compact" = "large";
        let maxWidth = "100%";

        if (checkinsCount <= 4) {
          // Até 4 alunos: 1 linha, 4 colunas (Cards Grandes)
          gridCols = 4;
          gridGap = "24px";
          cardSize = "large";
          maxWidth = "1600px";
        } else if (checkinsCount <= 8) {
          // 5-8 alunos: 2 linhas, 4 colunas (Cards Normais para garantir que cabem na altura)
          gridCols = 4;
          gridGap = "24px";
          cardSize = "normal";
          maxWidth = "1600px";
        } else if (checkinsCount <= 12) {
          // 9-12 alunos: 2 linhas, 6 colunas (Prioridade horizontal para evitar corte da 3ª linha)
          gridCols = 6;
          gridGap = "16px";
          cardSize = "normal";
          maxWidth = "100%";
        } else if (checkinsCount <= 18) {
          // 13-18 alunos: 3 linhas, 6 colunas (Cards compactos horizontais)
          gridCols = 6;
          gridGap = "12px";
          cardSize = "compact";
          maxWidth = "100%";
        } else if (checkinsCount <= 24) {
          // 19-24 alunos: 3 linhas, 8 colunas (Cards compactos horizontais)
          gridCols = 8;
          gridGap = "10px";
          cardSize = "compact";
          maxWidth = "100%";
        } else {
          // 25+ alunos: 4+ linhas, 8 colunas
          gridCols = 8;
          gridGap = "8px";
          cardSize = "compact";
          maxWidth = "100%";
        }

        return (
          <div 
            style={{ 
              display: "grid", 
              gridTemplateColumns: `repeat(${gridCols}, 1fr)`, 
              gap: gridGap,
              width: "100%",
              maxWidth: maxWidth,
              margin: "0 auto"
            }}
          >
            {students.map((student) => (
              <TvStudentCard key={student.id} student={student} cardSize={cardSize} />
            ))}
          </div>
        );
      })() : (
        <div 
          className="flex flex-col items-center justify-center border-3 border-black bg-white text-center shadow-[8px_8px_0px_#000] relative overflow-hidden"
          style={{
            flexGrow: 1,
            minHeight: "calc(100vh / 0.75 - 220px)",
            padding: "60px 40px",
          }}
        >
          {/* Fundo com padrão de pontos sutil */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: "radial-gradient(#e5e7eb 1.5px, transparent 1.5px)",
              backgroundSize: "20px 20px",
              opacity: 0.6,
            }}
          />

          {/* Listras Brutalistas Decorativas — Topo */}
          <div 
            className="absolute top-0 left-0 right-0 border-b-2 border-black"
            style={{
              height: "8px",
              backgroundImage: "repeating-linear-gradient(45deg, #facc15, #facc15 15px, #000000 15px, #000000 30px)",
            }}
          />

          {/* Listras Brutalistas Decorativas — Base */}
          <div 
            className="absolute bottom-0 left-0 right-0 border-t-2 border-black"
            style={{
              height: "8px",
              backgroundImage: "repeating-linear-gradient(45deg, #facc15, #facc15 15px, #000000 15px, #000000 30px)",
            }}
          />

          {/* Conteúdo Central */}
          <div className="relative z-10 flex flex-col items-center" style={{ gap: "16px" }}>
            {/* Ícone grande com badge flutuante */}
            <div className="relative">
              <div
                className="bg-yellow-300 border-3 border-black shadow-[6px_6px_0px_#000] flex items-center justify-center"
                style={{ width: "120px", height: "120px" }}
              >
                <span className="text-7xl select-none block" style={{ lineHeight: 1 }}>
                  🏋️‍♂️
                </span>
              </div>
              <div 
                className="absolute bg-red-500 text-white font-display font-black uppercase tracking-widest shadow-[2px_2px_0px_#000] border-2 border-black animate-pulse"
                style={{
                  top: "-10px",
                  right: "-16px",
                  fontSize: "11px",
                  padding: "3px 10px",
                }}
              >
                VAZIO
              </div>
            </div>

            {/* Título Principal */}
            <h2
              className="font-headline font-black text-black uppercase tracking-tight"
              style={{ fontSize: "clamp(32px, 4vw, 56px)", lineHeight: 1.1, marginTop: "12px" }}
            >
              MURAL DE CHECK-INS VAZIO
            </h2>

            {/* Subtítulo */}
            <p
              className="font-display font-bold text-neutral-500 uppercase tracking-wide leading-relaxed"
              style={{ fontSize: "clamp(14px, 1.5vw, 22px)", maxWidth: "800px" }}
            >
              Abra o aplicativo{" "}
              <span className="text-black underline decoration-yellow-400 decoration-4">
                Coliseu Fit
              </span>{" "}
              agora mesmo, confirme sua presença e seja o primeiro a aparecer na TV para a aula das{" "}
              <span
                className="text-black bg-yellow-300 border-2 border-black font-mono shadow-[2px_2px_0px_#000] inline-block"
                style={{ padding: "2px 10px", fontSize: "clamp(16px, 1.8vw, 26px)" }}
              >
                {timeStart.slice(0, 5)}
              </span>
              !
            </p>


          </div>
        </div>
      )}
    </div>
  );
}

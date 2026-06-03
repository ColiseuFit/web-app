"use client";

import { Construction } from "lucide-react";

interface TvComingSoonPanelProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
}

/**
 * Placeholder brutalista configurável para abas em desenvolvimento da Coliseu TV.
 *
 * @param title - O título principal do painel.
 * @param description - O texto de apoio.
 * @param icon - Ícone Lucide personalizado.
 */
export default function TvComingSoonPanel({
  title = "EM CONSTRUÇÃO",
  description = "Uma nova funcionalidade está sendo desenvolvida. Em breve, este espaço ganha vida.",
  icon,
}: TvComingSoonPanelProps) {
  return (
    <div
      className="flex flex-col items-center justify-center border-3 border-black bg-white text-center shadow-[6px_6px_0px_#000] relative overflow-hidden"
      style={{ padding: "60px 40px", minHeight: "60vh" }}
    >
      {/* Listras Decorativas no Topo */}
      <div
        className="absolute top-0 left-0 right-0 h-3 border-b-2 border-black"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, #facc15, #facc15 15px, #000000 15px, #000000 30px)",
        }}
      />

      {/* Listras Decorativas na Base */}
      <div
        className="absolute bottom-0 left-0 right-0 h-3 border-t-2 border-black"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, #facc15, #facc15 15px, #000000 15px, #000000 30px)",
        }}
      />

      {/* Ícone Principal */}
      <div className="relative">
        <div
          className="bg-yellow-300 border-3 border-black shadow-[6px_6px_0px_#000] flex items-center justify-center"
          style={{ width: "100px", height: "100px" }}
        >
          {icon || <Construction size={48} className="text-black" />}
        </div>
        <div className="absolute -top-3 -right-4 bg-red-500 text-white font-display font-black text-[9px] px-2 py-0.5 border border-black uppercase tracking-widest shadow-[1px_1px_0px_#000] animate-pulse">
          BREVE
        </div>
      </div>

      {/* Título */}
      <h2 className="font-headline font-black text-3xl md:text-4xl text-black uppercase tracking-tight mt-8 animate-bounce">
        {title}
      </h2>

      {/* Descrição */}
      <p className="font-display font-bold text-sm md:text-base text-neutral-500 max-w-lg mt-4 uppercase tracking-wide leading-relaxed">
        {description}
      </p>

      {/* Barra de Progresso Decorativa */}
      <div
        className="mt-8 bg-neutral-100 border-2 border-black shadow-[3px_3px_0px_#000] overflow-hidden"
        style={{ width: "260px", height: "20px" }}
      >
        <div
          className="h-full bg-yellow-400 animate-pulse"
          style={{ width: "45%" }}
        />
      </div>
      <span className="font-display font-black text-[10px] text-neutral-400 tracking-widest uppercase mt-3">
        PROGRESSO: EM DESENVOLVIMENTO
      </span>
    </div>
  );
}

"use client";

import { useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";

export default function VerifyButton({ link }: { link: string }) {
  const [clicked, setClicked] = useState(false);

  const handleClick = () => {
    setClicked(true);
    
    // Fallback/Safety check: If searchParams was not awaited correctly on server, 
    // it results in [object Promise].
    if (link === "[object Promise]") {
      console.error("Link state error: received Promise instead of URL string.");
      alert("Erro na ativação: Link inválido. Por favor, tente novamente.");
      setClicked(false);
      return;
    }

    console.log("Navigating to verification link:", link);
    window.location.href = link;
  };

  return (
    <button
      onClick={handleClick}
      disabled={clicked}
      className="w-full h-16 flex items-center justify-center gap-3 bg-[var(--nb-red)] text-white border-[3px] border-black shadow-[var(--nb-shadow)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all disabled:opacity-70 disabled:cursor-not-allowed group uppercase font-[900] text-sm tracking-widest"
    >
      {clicked ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin" />
          ATIVANDO...
        </>
      ) : (
        <>
          ATIVAR MINHA CONTA
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </>
      )}
    </button>
  );
}

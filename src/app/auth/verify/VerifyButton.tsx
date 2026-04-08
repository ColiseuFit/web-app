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
      className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 px-4 rounded-xl transition-all disabled:opacity-70 disabled:cursor-not-allowed group"
    >
      {clicked ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin" />
          Ativando...
        </>
      ) : (
        <>
          Ativar Minha Conta
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </>
      )}
    </button>
  );
}

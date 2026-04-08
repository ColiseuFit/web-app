"use client";

import { useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";

export default function VerifyButton({ link }: { link: string }) {
  const [clicked, setClicked] = useState(false);

  const handleClick = () => {
    setClicked(true);
    // Navegação direta com window.location substitui prefetching do Next.js
    // e garante que a sessão original via hash/querystring repasse pro backend do supabase
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

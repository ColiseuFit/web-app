"use client";

import { useEffect, useState, useCallback } from "react";
import { APP_VERSION } from "@/lib/constants/version";
import { RefreshCw, Download } from "lucide-react";

/**
 * VersionGuard: Monitora novas versões do app e notifica o aluno.
 * 
 * Lógica:
 * 1. Compara a versão local (hardcoded no build) com a versão retornada pela API.
 * 2. Se houver discrepância, exibe um banner Neo-Brutalista.
 */
export function VersionGuard() {
  const [hasUpdate, setHasUpdate] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  const checkVersion = useCallback(async () => {
    if (isChecking || hasUpdate) return;
    
    try {
      setIsChecking(true);
      
      // Usamos XMLHttpRequest para compatibilidade total (iOS 9 / iPad 2)
      // onde o 'fetch' não é nativo.
      const xhr = new XMLHttpRequest();
      xhr.open("GET", "/api/version?t=" + new Date().getTime(), true);
      xhr.onreadystatechange = function() {
        if (xhr.readyState === 4 && xhr.status === 200) {
          try {
            const data = JSON.parse(xhr.responseText);
            if (data.version && data.version !== APP_VERSION) {
              console.log("[VersionGuard] Nova versao detectada:", data.version);
              setHasUpdate(true);
            }
          } catch (e) {
            console.error("[VersionGuard] Erro no parse:", e);
          }
        }
      };
      xhr.send();
    } catch (err) {
      console.error("[VersionGuard] Erro ao verificar versao:", err);
    } finally {
      setIsChecking(false);
    }
  }, [hasUpdate, isChecking]);

  useEffect(() => {
    // 1. Verificar ao montar
    checkVersion();

    // 2. Verificar quando o usuário volta para a aba (Visibility Change)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkVersion();
      }
    };

    // 3. Polling a cada 5 minutos
    const interval = setInterval(checkVersion, 1000 * 60 * 5);

    document.addEventListener("visibilitychange", handleVisibilityChange);
    
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearInterval(interval);
    };
  }, [checkVersion]);

  const handleUpdate = () => {
    // Força o recarregamento ignorando o cache do browser
    window.location.reload();
  };

  if (!hasUpdate) return null;

  return (
    <div className="fixed bottom-28 left-0 right-0 z-[9999] px-4 flex justify-center pointer-events-none animate-in slide-in-from-bottom duration-500">
      <div className="pointer-events-auto bg-[#E31B23] border-[4px] border-black shadow-[10px_10px_0px_#000] p-4 md:p-6 flex flex-col sm:flex-row items-center gap-4 sm:gap-8 max-w-lg w-full sm:w-auto">
        <div className="flex gap-4 items-center">
          <div className="bg-white p-3 border-2 border-black rotate-[-2deg]">
            <RefreshCw size={24} className="text-[#E31B23] animate-spin-slow" />
          </div>
          <div className="flex flex-col">
            <h3 className="text-white font-black text-lg md:text-xl uppercase leading-none tracking-tighter">
              Arena Atualizada
            </h3>
            <p className="text-black/80 text-[10px] md:text-[11px] font-bold uppercase tracking-widest mt-1">
              Versão {APP_VERSION} disponível
            </p>
          </div>
        </div>

        <button
          onClick={handleUpdate}
          className="w-full sm:w-auto bg-black text-white px-8 py-3 text-sm font-black uppercase border-2 border-white hover:bg-white hover:text-black hover:border-black transition-all transform active:translate-y-1 active:shadow-none shadow-[4px_4px_0px_rgba(255,255,255,0.2)]"
        >
          Entrar na Nova Versão
        </button>
      </div>
    </div>
  );
}

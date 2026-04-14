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
    <div className="fixed top-0 left-0 right-0 z-[9999] p-2 animate-in slide-in-from-top duration-500">
      <div className="max-w-md mx-auto bg-[#E31B23] border-[3px] border-black shadow-[4px_4px_0px_#000000] p-4 flex items-center justify-between gap-4">
        <div className="flex gap-3 items-center">
          <div className="bg-white p-2 border-2 border-black">
            <Download size={20} className="text-[#E31B23]" />
          </div>
          <div>
            <p className="text-white font-black text-xs uppercase leading-tight">
              Atualização Disponível
            </p>
            <p className="text-white/80 text-[10px] uppercase font-bold">
              v{APP_VERSION} ➔ Nova Versão
            </p>
          </div>
        </div>

        <button
          onClick={handleUpdate}
          className="bg-black text-white px-4 py-2 text-xs font-black uppercase border-2 border-white hover:bg-white hover:text-black transition-colors flex items-center gap-2 active:translate-y-1 active:translate-x-1 active:shadow-none"
        >
          <RefreshCw size={14} />
          Atualizar
        </button>
      </div>
    </div>
  );
}

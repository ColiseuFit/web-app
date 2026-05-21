"use client";

import React, { useRef, useState, useEffect } from "react";
import { X, Share2, Download, Copy, CheckCircle2 } from "lucide-react";
import { toBlob } from "html-to-image";
import { WodSticker } from "./WodSticker";
import { createPortal } from "react-dom";

/**
 * Propriedades para o Modal de Compartilhamento de Atividade.
 * @property onClose - Callback executado ao fechar o modal.
 * @property title - Título descritivo do WOD.
 * @property dateStr - Data formatada da atividade.
 * @property wodContent - Conteúdo técnico original do treino.
 * @property result - Placar obtido pelo atleta.
 * @property levelInfo - Metadados de cor e rótulo do nível do aluno.
 * @property studentName - Nome do aluno para estampagem opcional no adesivo.
 */
interface ShareActivityModalProps {
  onClose: () => void;
  title: string;
  dateStr: string;
  wodContent: string;
  result: string | null;
  levelInfo: { label: string; color: string; textColor: string };
  studentName?: string;
}

/**
 * Modal que gerencia a captura e o compartilhamento do Sticker de treino do aluno.
 * Converte a árvore de DOM do `WodSticker` em uma imagem PNG transparente
 * utilizando a biblioteca `html-to-image`.
 * 
 * Oferece três canais de exportação:
 * 1. API nativa de compartilhamento do dispositivo (Navigator Share) para envio direto aos Stories do Instagram.
 * 2. Cópia binária direta para a Área de Transferência (Clipboard API) com feedback visual de sucesso de 3s (Zero Browser Alert).
 * 3. Download do arquivo local como fallback final.
 * 
 * @throws {Error} Caso a biblioteca `html-to-image` falhe na rasterização do canvas ou o clipboard seja bloqueado pelo navegador.
 */
export function ShareActivityModal({
  onClose,
  title,
  dateStr,
  wodContent,
  result,
  levelInfo,
  studentName
}: ShareActivityModalProps) {
  const stickerRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 320, height: 568, scale: 0.296 });

  useEffect(() => {
    setMounted(true);
    // Bloqueia a rolagem de fundo no dispositivo
    document.body.style.overflow = "hidden";

    const handleResize = () => {
      // Ajusta dinamicamente com base nas dimensões reais da tela, evitando cortes no mobile
      const headerHeight = 65;
      const footerHeight = 220; // Espaço reservado para botões e margem segura (Safe Areas do iOS)
      const verticalPadding = 40;
      
      const availableHeight = Math.max(200, window.innerHeight - headerHeight - footerHeight - verticalPadding);
      const availableWidth = Math.max(150, window.innerWidth - 40);
      const maxWidth = Math.min(320, availableWidth);
      
      // Proporção de aspecto 9:16 nativa do WOD Sticker
      const fitWidth = Math.min(maxWidth, availableHeight * (9 / 16));
      const fitHeight = fitWidth * (16 / 9);
      const scale = fitWidth / 1080;
      
      setDimensions({
        width: fitWidth,
        height: fitHeight,
        scale: scale
      });
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const generateImageBlob = async (): Promise<Blob | null> => {
    if (!stickerRef.current) return null;
    setIsGenerating(true);
    try {
      // Usamos toBlob para ter o arquivo pronto para o navigator.share ou FileSaver
      const blob = await toBlob(stickerRef.current, {
        cacheBust: true,
        pixelRatio: 1, // o sticker já é gigante (1080x1920)
      });
      return blob;
    } catch (err) {
      console.error("Erro ao gerar imagem:", err);
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShare = async () => {
    const blob = await generateImageBlob();
    if (!blob) return;

    const file = new File([blob], `coliseu-wod-${Date.now()}.png`, { type: "image/png" });

    // Tenta usar a Web Share API nativa (Abre o Share Sheet do celular com Instagram)
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          title: "Meu resultado no Coliseu",
          text: "Treino concluído no Coliseu!",
          files: [file],
        });
      } catch (err) {
        console.log("Compartilhamento cancelado ou falhou", err);
      }
    } else {
      // Fallback 1: Copiar para área de transferência se suportado
      handleCopy(blob);
    }
  };

  const handleDownload = async () => {
    const blob = await generateImageBlob();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `coliseu-wod-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopy = async (preGeneratedBlob?: Blob) => {
    const blob = preGeneratedBlob || await generateImageBlob();
    if (!blob) return;
    
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob })
      ]);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 3000);
    } catch (err) {
      console.error("Erro ao copiar", err);
      // Fallback final: Download
      handleDownload();
    }
  };

  if (!mounted) return null;

  const modalContent = (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "#131313",
      zIndex: 9999,
      display: "flex",
      flexDirection: "column",
      animation: "fadeIn 0.2s ease-out"
    }}>
      {/* HEADER MODAL */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "20px",
        borderBottom: "1px solid #222"
      }}>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "#FFF" }}>
          <X size={24} />
        </button>
        <div style={{ color: "#FFF", fontSize: "16px", fontWeight: 700 }}>
          Compartilhar atividade
        </div>
        <div style={{ width: 24 }} /> {/* Espaçador */}
      </div>

      {/* BODY - PREVIEW */}
      <div style={{
        flex: 1,
        padding: "32px 20px",
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center"
      }}>
        
        {/* PREVIEW CONTAINER */}
        <div style={{
          backgroundSize: "20px 20px",
          backgroundPosition: "0 0, 10px 10px",
          backgroundImage: `
            linear-gradient(45deg, #1A1A1A 25%, transparent 25%, transparent 75%, #1A1A1A 75%, #1A1A1A),
            linear-gradient(45deg, #1A1A1A 25%, transparent 25%, transparent 75%, #1A1A1A 75%, #1A1A1A)
          `,
          backgroundColor: "#2A2A2A",
          borderRadius: "12px",
          overflow: "hidden",
          position: "relative",
          width: `${dimensions.width}px`,
          height: `${dimensions.height}px`,
          margin: "0 auto",
          boxShadow: "0 10px 30px rgba(0, 0, 0, 0.5)",
          border: "2px solid #333"
        }}>
           {/* Crachá indicando transparente */}
           <div style={{
             position: "absolute",
             top: 12,
             left: 12,
             background: "rgba(0,0,0,0.6)",
             border: "1px solid #555",
             color: "#FFF",
             fontSize: "9px",
             padding: "4px 8px",
             borderRadius: "4px",
             fontWeight: 700,
             letterSpacing: "0.05em",
             zIndex: 10
           }}>
             TRANSPARENTE
           </div>

           {/* Versão em Escala (Preview visual apenas) do Sticker */}
           <div style={{
             width: "1080px",
             height: "1920px",
             transformOrigin: "top left",
             transform: `scale(${dimensions.scale})`,
             pointerEvents: "none"
           }}>
             <WodSticker
               title={title}
               dateStr={dateStr}
               wodContent={wodContent}
               result={result}
               levelInfo={levelInfo}
               studentName={studentName}
             />
           </div>
        </div>

      </div>

      {/* FOOTER - AÇÕES */}
      <div style={{
        padding: "24px 20px",
        background: "#0A0A0A",
        borderTop: "1px solid #222",
        paddingBottom: "env(safe-area-inset-bottom, 24px)"
      }}>
        <button 
          onClick={handleShare}
          disabled={isGenerating}
          style={{
            width: "100%",
            background: "var(--nb-red, #E31B23)",
            color: "#FFF",
            padding: "16px",
            fontSize: "16px",
            fontWeight: 800,
            fontFamily: "'Outfit', sans-serif",
            border: "none",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "12px",
            marginBottom: "16px"
          }}
        >
          <Share2 size={20} />
          {isGenerating ? "GERANDO ADESIVO..." : "COMPARTILHAR"}
        </button>

        <div style={{ display: "flex", gap: "12px" }}>
          <button 
            onClick={() => handleCopy()}
            disabled={isGenerating || copySuccess}
            style={{
              flex: 1,
              background: copySuccess ? "var(--nb-green, #2ECC71)" : "#222",
              color: copySuccess ? "#000" : "#FFF",
              padding: "12px",
              fontSize: "12px",
              fontWeight: 800,
              border: "none",
              borderRadius: "8px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "8px",
              transition: "all 0.2s"
            }}
          >
            {copySuccess ? <CheckCircle2 size={20} /> : <Copy size={20} />}
            {copySuccess ? "COPIADO!" : "COPIAR IMAGEM"}
          </button>
          
          <button 
            onClick={() => handleDownload()}
            disabled={isGenerating}
            style={{
              flex: 1,
              background: "#222",
              color: "#FFF",
              padding: "12px",
              fontSize: "12px",
              fontWeight: 700,
              border: "none",
              borderRadius: "8px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "8px"
            }}
          >
            <Download size={20} />
            SALVAR NA GALERIA
          </button>
        </div>
      </div>

      {/* HIDDEN RENDER (A versão real full-res para o html-to-image) */}
      <div style={{ position: "absolute", left: "-9999px", top: "-9999px" }}>
        <WodSticker
          ref={stickerRef}
          title={title}
          dateStr={dateStr}
          wodContent={wodContent}
          result={result}
          levelInfo={levelInfo}
          studentName={studentName}
        />
      </div>

    </div>
  );

  return createPortal(modalContent, document.body);
}

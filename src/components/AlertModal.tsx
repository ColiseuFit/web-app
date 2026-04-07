"use client";

import { useEffect } from "react";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";

/**
 * AlertModal: Interceptor de mensagens e feedbacks (Sucesso/Erro/Info).
 * Substitui o alert() nativo por uma interface Neo-Brutalista persistente.
 * 
 * @architecture
 * - **Iron Monolith Standard**: Bordas 4px sólidas, sombras brutas e fundo blur.
 * - **Single Source of Feedback**: Concentra todos os diálogos de erro/sucesso do app.
 * 
 * @param {AlertModalProps} props - Configuração do alerta.
 * @returns {JSX.Element} Modal renderizado com animação Slide-Up.
 */
interface AlertModalProps {
  title: string;
  message: string;
  type?: "error" | "success" | "info";
  onClose: () => void;
  buttonLabel?: string;
}

export default function AlertModal({
  title,
  message,
  type = "info",
  onClose,
  buttonLabel = "ENTENDI",
}: AlertModalProps) {
  
  // Bloquear scroll ao abrir
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  const getTheme = () => {
    switch (type) {
      case "error":
        return { 
          color: "#E31B23", 
          icon: <AlertCircle size={20} strokeWidth={3} />, 
          label: "ALERTA" 
        };
      case "success":
        return { 
          color: "#00C853", 
          icon: <CheckCircle2 size={20} strokeWidth={3} />, 
          label: "SUCESSO" 
        };
      default:
        return { 
          color: "#000000", 
          icon: <Info size={20} strokeWidth={3} />, 
          label: "INFORMAÇÃO" 
        };
    }
  };

  const theme = getTheme();

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(255,255,255,0.4)",
      backdropFilter: "blur(8px)",
      zIndex: 10000,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px",
      animation: "nbFadeIn 0.2s ease-out"
    }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes nbFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes nbSlideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}} />
      
      <div style={{
        backgroundColor: "#FFFFFF",
        border: "4px solid #000000",
        width: "100%",
        maxWidth: "400px",
        position: "relative",
        boxShadow: "12px 12px 0px 0px rgba(0,0,0,1)",
        padding: "40px 24px 32px",
        animation: "nbSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)"
      }}>
        {/* Badge do Tipo */}
        <div style={{
          position: "absolute",
          top: "-20px",
          left: "24px",
          background: theme.color,
          color: "#FFF",
          padding: "6px 14px",
          border: "3px solid #000000",
          fontWeight: 900,
          fontSize: "11px",
          letterSpacing: "0.15em",
          boxShadow: "4px 4px 0px #000000",
          display: "flex",
          alignItems: "center",
          gap: "8px"
        }}>
          {theme.icon}
          {theme.label}
        </div>

        <h3 className="font-display" style={{ 
          fontSize: "26px", 
          fontWeight: 950,
          lineHeight: 1.1, 
          marginBottom: "16px",
          color: "#000000",
          textTransform: "uppercase"
        }}>
          {title}
        </h3>
        
        <p style={{ 
          fontSize: "15px", 
          color: "#000000", 
          lineHeight: 1.5,
          fontWeight: 700,
          marginBottom: "32px",
          opacity: 0.8
        }}>
          {message}
        </p>

        <button
          onClick={onClose}
          style={{
            width: "100%",
            padding: "16px",
            background: "#000000",
            color: "#FFFFFF",
            border: "3px solid #000000",
            fontWeight: 900,
            fontSize: "13px",
            letterSpacing: "0.1em",
            cursor: "pointer",
            textTransform: "uppercase",
            fontFamily: "var(--font-display)",
            transition: "transform 0.1s ease, box-shadow 0.1s ease",
            boxShadow: "4px 4px 0px #000000"
          }}
          onMouseDown={e => {
            e.currentTarget.style.transform = "translate(2px, 2px)";
            e.currentTarget.style.boxShadow = "none";
          }}
          onMouseUp={e => {
            e.currentTarget.style.transform = "none";
            e.currentTarget.style.boxShadow = "4px 4px 0px #000000";
          }}
        >
          {buttonLabel}
        </button>
      </div>
    </div>
  );
}

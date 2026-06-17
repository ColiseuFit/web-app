"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

/**
 * MaintenanceNotice: Modal informativo sobre melhorias e manutenção.
 * Exibe uma mensagem otimista e guarda no localStorage para não perturbar o aluno novamente.
 * Segue os padrões estéticos Neo-Brutalistas do Coliseu.
 */
export default function MaintenanceNotice() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Verifica se o aluno já visualizou e fechou o aviso nesta semana
    const hasSeenNotice = localStorage.getItem("coliseu-maintenance-seen-v1");
    if (!hasSeenNotice) {
      setIsOpen(true);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem("coliseu-maintenance-seen-v1", "true");
    setIsOpen(false);
  };

  // Bloquear scroll do body ao abrir
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(255, 255, 255, 0.4)",
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
        maxWidth: "420px",
        position: "relative",
        boxShadow: "12px 12px 0px 0px rgba(0,0,0,1)",
        padding: "44px 24px 32px",
        animation: "nbSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)"
      }}>
        {/* Badge do Tipo */}
        <div style={{
          position: "absolute",
          top: "-20px",
          left: "24px",
          background: "#FFD700", // Gold/Yellow
          color: "#000000",
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
          <span style={{ display: "inline-flex", alignItems: "center", flexShrink: 0 }}><Sparkles size={14} className="text-black" /></span>
          <span style={{ whiteSpace: "nowrap" }}>MELHORIAS</span>
        </div>

        <h3 className="font-headline" style={{ 
          fontSize: "26px", 
          fontWeight: 950,
          lineHeight: 1.1, 
          marginBottom: "16px",
          color: "#000000",
          textTransform: "uppercase",
          letterSpacing: "-0.01em"
        }}>
          Arena em Evolução!
        </h3>
        
        <p style={{ 
          fontSize: "14px", 
          color: "#000000", 
          lineHeight: 1.5,
          fontWeight: 700,
          marginBottom: "28px",
          opacity: 0.85
        }}>
          Estamos trabalhando em melhorias em nossa infraestrutura esta semana para deixar o seu aplicativo ainda mais rápido e estável. 
          <br /><br />
          Durante esse processo, você pode notar oscilações temporárias em algumas funções. Agradecemos a paciência e a parceria de sempre!
        </p>

        <button
          onClick={handleClose}
          style={{
            width: "100%",
            padding: "16px",
            background: "#E31B23", // Red Coliseu
            color: "#FFFFFF",
            border: "3px solid #000000",
            fontWeight: 900,
            fontSize: "14px",
            letterSpacing: "0.1em",
            cursor: "pointer",
            textTransform: "uppercase",
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
          Bora Treinar!
        </button>
      </div>
    </div>
  );
}

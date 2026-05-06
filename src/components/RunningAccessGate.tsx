"use client";

import React from "react";
import { Lock, ArrowRight, Activity, Zap, Timer } from "lucide-react";
import Link from "next/link";

interface RunningAccessGateProps {
  studentName: string;
  isInactive?: boolean;
}

export default function RunningAccessGate({ studentName, isInactive = false }: RunningAccessGateProps) {
  return (
    <div style={{
      minHeight: "80vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px",
      animation: "nbFadeIn 0.3s ease-out"
    }}>
      <div style={{
        backgroundColor: "#FFFFFF",
        border: "4px solid #000000",
        width: "100%",
        maxWidth: "400px",
        position: "relative",
        boxShadow: "12px 12px 0px 0px rgba(0,0,0,1)",
        padding: "48px 24px 32px",
      }}>
        {/* Badge do Status (Padrão AlertModal) */}
        <div style={{
          position: "absolute",
          top: "-20px",
          left: "24px",
          background: isInactive ? "var(--nb-red)" : "var(--nb-blue)",
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
          <Lock size={16} strokeWidth={3} />
          {isInactive ? "ACESSO PAUSADO" : "CONVITE EXCLUSIVO"}
        </div>

        <h3 className="font-display" style={{ 
          fontSize: "28px", 
          fontWeight: 950,
          lineHeight: 1, 
          marginBottom: "20px",
          color: "#000000",
          textTransform: "uppercase"
        }}>
          OLÁ, <span style={{ color: isInactive ? "var(--nb-red)" : "var(--nb-blue)" }}>{studentName.split(" ")[0]}!</span>
        </h3>
        
        <div style={{ 
          fontSize: "14px", 
          color: "#000000", 
          lineHeight: 1.6,
          fontWeight: 700,
          marginBottom: "32px",
          opacity: 0.9
        }}>
          {isInactive ? (
            <>
              O seu acesso ao programa <span style={{ color: "var(--nb-red)" }}>Coliseu Running</span> encontra-se <strong>Inativo ou Suspenso</strong>.
              <br /><br />
              Para reativar sua conta e voltar aos treinos, por favor <strong>dirija-se à recepção</strong> ou entre em contato pelo botão abaixo.
            </>
          ) : (
            "Você ainda não possui um plano de corrida ativo. Que tal transformar seus KM em performance real?"
          )}
        </div>

        {/* Lista de Benefícios (apenas para não inativos) */}
        {!isInactive && (
          <div style={{ display: "grid", gap: "12px", marginBottom: "32px" }}>
            {[
              { icon: Activity, text: "Planilha Semanal Individualizada" },
              { icon: Zap, text: "Gamificação e Pontos (XP) no App" },
              { icon: Timer, text: "Análise Técnica de Pace e Evolução" },
            ].map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ 
                  background: "var(--nb-blue)", 
                  color: "#FFF", 
                  padding: "6px", 
                  border: "2px solid #000",
                  display: "flex"
                }}>
                  <item.icon size={14} strokeWidth={3} />
                </div>
                <span style={{ fontSize: "12px", fontWeight: 800, textTransform: "uppercase" }}>{item.text}</span>
              </div>
            ))}
          </div>
        )}

        {/* CTA Button */}
        <a
          href={isInactive 
            ? `https://wa.me/5573999911525?text=${encodeURIComponent(`Olá! Notei que meu acesso ao programa Coliseu Running está pausado. Gostaria de verificar como posso reativá-lo.`)}`
            : `https://wa.me/5573999911525?text=${encodeURIComponent(`Olá! Gostaria de saber mais sobre como me inscrever no programa Coliseu Running.`)}`
          }
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            width: "100%",
            padding: "18px",
            background: isInactive ? "var(--nb-red)" : "var(--nb-blue)",
            color: "#FFFFFF",
            border: "4px solid #000000",
            fontWeight: 950,
            fontSize: "14px",
            letterSpacing: "0.05em",
            cursor: "pointer",
            textTransform: "uppercase",
            textDecoration: "none",
            boxShadow: "6px 6px 0px #000000",
            transition: "transform 0.1s ease"
          }}
          className="nb-button-active"
        >
          {isInactive ? "CONTATAR RECEPÇÃO" : "QUERO ME INSCREVER"} <ArrowRight size={18} strokeWidth={3} />
        </a>

        <Link 
          href="/dashboard"
          style={{ 
            display: "block", 
            textAlign: "center", 
            marginTop: "20px", 
            fontSize: "11px", 
            fontWeight: 900, 
            color: "#000",
            textDecoration: "underline",
            opacity: 0.6,
            textTransform: "uppercase"
          }}
        >
          Voltar ao Dashboard
        </Link>
      </div>
    </div>
  );
}

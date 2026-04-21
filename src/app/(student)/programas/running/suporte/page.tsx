"use client";

import React from "react";
import { ChevronLeft, MessageCircle, HelpCircle, Shield, RefreshCw } from "lucide-react";
import Link from "next/link";

/**
 * Brand Guidelines Strava §1.2: Attribution
 */
const StravaPoweredByLogo = () => (
  <img
    src="/strava/pwrdBy_strava_black.svg"
    alt="Powered by Strava"
    style={{ height: 20, width: "auto" }}
  />
);

export default function StravaSupportPage() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--nb-surface)", padding: "24px" }}>
      <div style={{ maxWidth: "600px", margin: "0 auto" }}>
        
        {/* Header */}
        <Link 
          href="/programas/running"
          style={{ 
            display: "inline-flex", 
            alignItems: "center", 
            gap: 8, 
            textDecoration: "none", 
            color: "#000",
            fontWeight: 900,
            fontSize: 14,
            marginBottom: 24,
            textTransform: "uppercase"
          }}
        >
          <ChevronLeft size={20} strokeWidth={3} />
          Voltar ao Hub de Corrida
        </Link>

        <header style={{ 
          background: "#FFF", 
          border: "4px solid #000", 
          boxShadow: "8px 8px 0px #000", 
          padding: "32px",
          marginBottom: "32px"
        }}>
          <h1 style={{ fontSize: "32px", fontWeight: 950, marginBottom: "8px", textTransform: "uppercase", lineHeight: 1 }}>
            Suporte e Integração
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: "14px", fontWeight: 800, color: "#666" }}>COLISEU RUNNING +</span>
            <StravaPoweredByLogo />
          </div>
        </header>

        {/* Content Sections */}
        <div style={{ display: "grid", gap: "24px" }}>
          
          {/* Como funciona */}
          <section style={{ 
            background: "#FFF", 
            border: "4px solid #000", 
            boxShadow: "6px 6px 0px #000", 
            padding: "24px" 
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{ background: "var(--nb-yellow)", padding: 8, border: "2px solid #000" }}>
                <RefreshCw size={20} strokeWidth={3} />
              </div>
              <h2 style={{ fontSize: "18px", fontWeight: 900, textTransform: "uppercase" }}>Como funciona a sincronização?</h2>
            </div>
            <p style={{ fontSize: "14px", fontWeight: 600, lineHeight: 1.6, color: "#333" }}>
              Após conectar sua conta, todas as suas atividades de <strong>Corrida</strong> registradas no Strava serão automaticamente sincronizadas com o seu plano de treino no Coliseu.
            </p>
            <ul style={{ paddingLeft: "20px", fontSize: "13px", fontWeight: 700, lineHeight: 1.8 }}>
              <li>Sincronização em tempo real via Webhooks.</li>
              <li>Conversão automática de esforço em XP.</li>
              <li>Atualização de metas de volume mensal.</li>
            </ul>
          </section>

          {/* Privacidade */}
          <section style={{ 
            background: "#FFF", 
            border: "4px solid #000", 
            boxShadow: "6px 6px 0px #000", 
            padding: "24px" 
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{ background: "var(--nb-blue)", padding: 8, border: "2px solid #000", color: "#FFF" }}>
                <Shield size={20} strokeWidth={3} />
              </div>
              <h2 style={{ fontSize: "18px", fontWeight: 900, textTransform: "uppercase" }}>Privacidade de Dados</h2>
            </div>
            <p style={{ fontSize: "13px", fontWeight: 600, lineHeight: 1.6, color: "#333" }}>
              Nós acessamos apenas os dados necessários para validar seus treinos (distância, tempo, pace e data). Não compartilhamos suas rotas de GPS ou dados de saúde com terceiros.
            </p>
          </section>

          {/* FAQ/Problemas Comuns */}
          <section style={{ 
            background: "#FFF", 
            border: "4px solid #000", 
            boxShadow: "6px 6px 0px #000", 
            padding: "24px" 
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{ background: "var(--nb-red)", padding: 8, border: "2px solid #000", color: "#FFF" }}>
                <HelpCircle size={20} strokeWidth={3} />
              </div>
              <h2 style={{ fontSize: "18px", fontWeight: 900, textTransform: "uppercase" }}>Problemas com a conexão?</h2>
            </div>
            <p style={{ fontSize: "13px", fontWeight: 600, lineHeight: 1.6, color: "#333" }}>
              Se seus treinos não estiverem aparecendo, tente desconectar e conectar novamente no Hub de Corrida. Se o problema persistir, entre em contato com nossa equipe técnica.
            </p>
          </section>

          {/* CTA Suporte */}
          <div style={{ 
            background: "#000", 
            padding: "32px", 
            textAlign: "center",
            boxShadow: "6px 6px 0px var(--nb-yellow)"
          }}>
            <h3 style={{ color: "#FFF", fontWeight: 950, fontSize: "20px", marginBottom: "16px", textTransform: "uppercase" }}>
              Ainda precisa de ajuda?
            </h3>
            <a 
              href="https://wa.me/5500000000000" 
              target="_blank"
              rel="noopener noreferrer"
              style={{ 
                display: "inline-flex", 
                alignItems: "center", 
                gap: 12, 
                background: "var(--nb-yellow)", 
                color: "#000", 
                padding: "16px 32px", 
                fontWeight: 950, 
                fontSize: "16px", 
                textDecoration: "none",
                border: "3px solid #000"
              }}
            >
              <MessageCircle size={20} strokeWidth={3} />
              FALAR COM O SUPORTE
            </a>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "11px", marginTop: "16px", fontWeight: 700 }}>
              Atendimento de Segunda a Sexta, das 08h às 18h.
            </p>
          </div>

          <footer style={{ textAlign: "center", padding: "20px 0", opacity: 0.5 }}>
             <StravaPoweredByLogo />
          </footer>

        </div>
      </div>
    </div>
  );
}

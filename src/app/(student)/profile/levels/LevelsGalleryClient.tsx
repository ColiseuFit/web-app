"use client";

import Link from "next/link";
import StudentHeader from "@/components/StudentHeader";
import BottomNav from "@/components/BottomNav";
import { ArrowLeft } from "lucide-react";
import { ALL_LEVELS } from "@/lib/constants/levels";
import DashboardStyles from "@/components/DashboardStyles";

/**
 * Galeria Interativa de Níveis Técnicos
 */
export default function LevelsGalleryClient() {
  return (
    <div style={{ backgroundColor: "#FFF", color: "#000", minHeight: "100vh", paddingBottom: "100px" }}>
      <DashboardStyles />
      <StudentHeader />

      <main style={{ maxWidth: "480px", margin: "0 auto", padding: "0 20px" }}>

        {/* HERO: LOGO COMO IDENTIDADE PRINCIPAL */}
        <section style={{ paddingTop: "24px", paddingBottom: "40px" }}>
          <Link href="/profile" style={{
            fontSize: "10px", fontWeight: 900, color: "#000", textDecoration: "none",
            display: "inline-flex", alignItems: "center", gap: "6px", marginBottom: "32px", letterSpacing: "0.1em",
            border: "2px solid #000", padding: "8px 12px", boxShadow: "2px 2px 0px #000"
          }}>
            <ArrowLeft size={14} strokeWidth={3} />
            VOLTAR
          </Link>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "16px" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/levels/logo-coliseu-levels-svg.svg"
              alt="Coliseu Levels"
              style={{
                width: "220px",
                height: "auto",
                display: "block",
                filter: "invert(1)", // Convert black logo to white, wait: no, background is white, so keep it black! 
                animation: "heroEntrance 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards"
              }}
            />
            <p style={{
              fontSize: "12px", color: "#000", fontWeight: 800, lineHeight: 1.6, maxWidth: "280px",
              animation: "heroEntrance 0.8s 0.1s cubic-bezier(0.16, 1, 0.3, 1) both",
              opacity: 0
            }}>
              A jornada técnica oficial da Coliseu. Domine cada nível para evoluir sua performance.
            </p>
          </div>

          {/* DIVIDER */}
          <div style={{ marginTop: "32px", height: "2px", background: "#000" }} />
        </section>

        {/* CARDS DE NÍVEL */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {ALL_LEVELS.map((lvl, i) => (
            <div
              key={lvl.id}
              style={{
                background: "#FFF",
                border: "2px solid #000",
                boxShadow: "4px 4px 0px #000",
                padding: "20px 20px 20px 16px",
                display: "flex",
                alignItems: "center",
                gap: "20px",
                position: "relative",
                overflow: "hidden",
                borderLeft: `8px solid ${lvl.color}`,
                animation: `cardEntrance 0.5s ${0.05 * i}s cubic-bezier(0.16, 1, 0.3, 1) both${lvl.id === "L5" ? ", eliteShine 3s infinite linear" : ""}`,
                opacity: 0
              }}
            >
              {lvl.id === "L5" && (
                <div style={{
                  position: "absolute",
                  top: 0,
                  left: "-100%",
                  width: "50%",
                  height: "100%",
                  background: "linear-gradient(90deg, transparent, rgba(197, 160, 89, 0.25), transparent)",
                  transform: "skewX(-25deg)",
                  animation: "shineSweep 4s infinite",
                  pointerEvents: "none"
                }} />
              )}
              {/* ÍCONE */}
              <div style={{
                width: "56px", height: "56px", flexShrink: 0
              }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={lvl.icon} alt={lvl.label} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
              </div>

              {/* CONTEÚDO */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                  <span style={{ fontSize: "10px", fontWeight: 950, color: lvl.color, letterSpacing: "0.15em", textShadow: "1px 1px 0px #000" }}>{lvl.id}</span>
                  <h3 style={{ fontFamily: "var(--font-display, 'Outfit', sans-serif)", fontSize: "20px", fontWeight: 950, letterSpacing: "0.02em", lineHeight: 1 }}>{lvl.label}</h3>
                </div>
                <p style={{ fontSize: "11px", color: "#000", fontWeight: 700, lineHeight: 1.5, marginBottom: "8px" }}>{lvl.description}</p>
                <div style={{ fontSize: "9px", fontWeight: 900, color: "#000", textTransform: "uppercase", letterSpacing: "0.05em", padding: "4px 8px", background: "#F0F0F0", display: "inline-block", border: "1px solid #000" }}>
                  EXIGE: <span style={{ color: lvl.color, textShadow: "1px 1px 0px #000" }}>{lvl.requirements || "TÉCNICA E CONSISTÊNCIA"}</span>
                </div>
              </div>

              {/* ID WATERMARK */}
              <div style={{
                position: "absolute", right: "12px", bottom: "-8px",
                fontSize: "64px", fontWeight: 950, opacity: 0.05,
                fontFamily: "var(--font-display, 'Outfit', sans-serif)", pointerEvents: "none", lineHeight: 1,
                color: "#000"
              }}>
                {lvl.id}
              </div>
            </div>
          ))}
        </div>

        {/* RODAPÉ */}
        <div style={{ marginTop: "48px", textAlign: "center", padding: "32px 20px", borderTop: "2px solid #000" }}>
          <p style={{ fontSize: "11px", fontWeight: 900, letterSpacing: "0.15em", color: "#000", textTransform: "uppercase" }}>
            O PRÓXIMO NÍVEL É CONQUISTADO NO TREINO.
          </p>
        </div>

      </main>

      <BottomNav />

      <style jsx>{`
        @keyframes heroEntrance {
          from { opacity: 0; transform: translateY(-12px); filter: blur(8px); }
          to { opacity: 1; transform: translateY(0); filter: blur(0); }
        }
        @keyframes cardEntrance {
          from { opacity: 0; transform: translateX(-16px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes shineSweep {
          0% { left: -100%; }
          20% { left: 200%; }
          100% { left: 200%; }
        }
      `}</style>
    </div>
  );
}

"use client";

import Link from "next/link";
import StudentHeader from "@/components/StudentHeader";
import BottomNav from "@/components/BottomNav";
import { ArrowLeft } from "lucide-react";
import { ALL_LEVELS } from "@/lib/constants/levels";


/**
 * Galeria Interativa de Níveis Técnicos
 */
export default function LevelsGalleryClient() {
  return (
    <div style={{ backgroundColor: "var(--bg)", color: "var(--text)", minHeight: "100vh", paddingBottom: "100px" }}>
      <StudentHeader />

      <main style={{ maxWidth: "480px", margin: "0 auto", padding: "0 20px" }}>

        {/* HERO: LOGO COMO IDENTIDADE PRINCIPAL */}
        <section style={{ paddingTop: "24px", paddingBottom: "40px" }}>
          <Link href="/profile" style={{
            fontSize: "10px", fontWeight: 800, color: "var(--text-muted)", textDecoration: "none",
            display: "inline-flex", alignItems: "center", gap: "6px", marginBottom: "32px", letterSpacing: "0.1em"
          }}>
            <ArrowLeft size={14} />
            VOLTAR AO PERFIL
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
                animation: "heroEntrance 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards"
              }}
            />
            <p style={{
              fontSize: "12px", color: "var(--text-muted)", lineHeight: 1.6, maxWidth: "280px",
              animation: "heroEntrance 0.8s 0.1s cubic-bezier(0.16, 1, 0.3, 1) both",
              opacity: 0
            }}>
              A jornada técnica oficial da Coliseu. Domine cada nível para evoluir sua performance.
            </p>
          </div>

          {/* DIVIDER */}
          <div style={{ marginTop: "32px", height: "1px", background: "linear-gradient(90deg, var(--red), transparent)" }} />
        </section>

        {/* CARDS DE NÍVEL */}
        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          {ALL_LEVELS.map((lvl, i) => (
            <div
              key={lvl.id}
              style={{
                background: lvl.glow ? `rgba(197, 160, 89, 0.05)` : "rgba(255,255,255,0.02)",
                border: "1px solid var(--border-glow)",
                padding: "20px 20px 20px 16px",
                display: "flex",
                alignItems: "center",
                gap: "20px",
                position: "relative",
                overflow: "hidden",
                borderLeft: `3px solid ${lvl.color}`,
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
                  background: "linear-gradient(90deg, transparent, rgba(197, 160, 89, 0.15), transparent)",
                  transform: "skewX(-25deg)",
                  animation: "shineSweep 4s infinite",
                  pointerEvents: "none"
                }} />
              )}
              {/* ÍCONE */}
              <div style={{
                width: "56px", height: "56px", flexShrink: 0,
                filter: lvl.id === "L5" ? `drop-shadow(0 0 8px ${lvl.color})` : "none"
              }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={lvl.icon} alt={lvl.label} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
              </div>

              {/* CONTEÚDO */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                  <span style={{ fontSize: "9px", fontWeight: 900, color: lvl.color, letterSpacing: "0.15em", opacity: 0.8 }}>{lvl.id}</span>
                  <h3 className="font-display" style={{ fontSize: "18px", letterSpacing: "0.02em", lineHeight: 1 }}>{lvl.label}</h3>
                </div>
                <p style={{ fontSize: "11px", color: "var(--text-dim)", lineHeight: 1.5, marginBottom: "8px" }}>{lvl.description}</p>
                <div style={{ fontSize: "8px", fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  EXIGE: <span style={{ color: lvl.color }}>{lvl.requirements || "TÉCNICA E CONSISTÊNCIA"}</span>
                </div>
              </div>

              {/* ID WATERMARK */}
              <div style={{
                position: "absolute", right: "12px", bottom: "-8px",
                fontSize: "64px", fontWeight: 900, opacity: 0.04,
                fontFamily: "var(--font-display)", pointerEvents: "none", lineHeight: 1
              }}>
                {lvl.id}
              </div>
            </div>
          ))}
        </div>

        {/* RODAPÉ */}
        <div style={{ marginTop: "48px", textAlign: "center", padding: "32px 20px", borderTop: "1px solid var(--border-glow)" }}>
          <p style={{ fontSize: "10px", fontWeight: 800, letterSpacing: "0.15em", color: "var(--text-muted)", textTransform: "uppercase" }}>
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

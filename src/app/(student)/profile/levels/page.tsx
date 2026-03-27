"use client";

import Link from "next/link";
import StudentHeader from "@/components/StudentHeader";
import BottomNav from "@/components/BottomNav";

const LEVELS = [
  {
    id: "L1",
    label: "INICIANTE",
    color: "#ffffff",
    bgGlow: "rgba(255,255,255,0.03)",
    borderColor: "rgba(255,255,255,0.12)",
    icon: "/levels/icone-coliseu-levels-iniciante.svg",
    desc: "Domínio dos padrões básicos de movimento e construção de base aeróbica sólida.",
    requirements: "Consistência e Técnica básica.",
  },
  {
    id: "L2",
    label: "SCALE",
    color: "#2dab61",
    bgGlow: "rgba(45,171,97,0.05)",
    borderColor: "rgba(45,171,97,0.2)",
    icon: "/levels/icone-coliseu-levels-scale.svg",
    desc: "Capacidade de adaptar movimentos complexos e aumento da carga de trabalho.",
    requirements: "Adaptações técnicas eficientes.",
  },
  {
    id: "L3",
    label: "INTERMEDIÁRIO",
    color: "#2980ba",
    bgGlow: "rgba(41,128,186,0.05)",
    borderColor: "rgba(41,128,186,0.2)",
    icon: "/levels/icone-coliseu-levels-intermediario.svg",
    desc: "Transição para movimentos ininterruptos e domínio parcial de habilidades ginásticas.",
    requirements: "Aumento de intensidade e volume.",
  },
  {
    id: "L4",
    label: "RX",
    color: "#e52521",
    bgGlow: "rgba(229,37,33,0.05)",
    borderColor: "rgba(229,37,33,0.2)",
    icon: "/levels/icone-coliseu-levels-rx.svg",
    desc: "O Padrão Ouro. Execução fiel de todos os WODs oficiais do Open/Games.",
    requirements: "Performance técnica total e alta força.",
  },
  {
    id: "L5",
    label: "ELITE",
    color: "#C5A059", /* Subtle Silk Gold */
    bgGlow: "rgba(197, 160, 89, 0.05)",
    borderColor: "rgba(197, 160, 89, 0.25)",
    icon: "/levels/icone-coliseu-levels-elite.svg",
    desc: "O topo da pirâmide. Atletas de alto rendimento, força bruta e ginásticos inabaláveis.",
    requirements: "Capacidade física de elite nacional.",
  },
];

export default function LevelsGalleryPage() {
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
            <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>arrow_back</span>
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
              A hierarquia técnica da Coliseu. Domine cada patamar para evoluir na arena.
            </p>
          </div>

          {/* DIVIDER */}
          <div style={{ marginTop: "32px", height: "1px", background: "linear-gradient(90deg, var(--red), transparent)" }} />
        </section>

        {/* CARDS DE NÍVEL */}
        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          {LEVELS.map((lvl, i) => (
            <div
              key={lvl.id}
              style={{
                background: lvl.bgGlow,
                border: `1px solid ${lvl.borderColor}`,
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
                <p style={{ fontSize: "11px", color: "var(--text-dim)", lineHeight: 1.5, marginBottom: "8px" }}>{lvl.desc}</p>
                <div style={{ fontSize: "8px", fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  EXIGE: <span style={{ color: lvl.color }}>{lvl.requirements}</span>
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
            A PRÓXIMA PATENTE É CONQUISTADA NA ARENA.
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

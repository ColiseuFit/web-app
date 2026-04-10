"use client";

import { useState, useEffect } from "react";
import StudentHeader from "@/components/StudentHeader";
import BottomNav from "@/components/BottomNav";
import { Trophy, Hammer } from "lucide-react";
import DashboardStyles from "@/components/DashboardStyles";
import AccessGate from "@/components/AccessGate";

/**
 * ClubeClient Component
 *
 * Módulo de Fidelidade e Recompensas (Clube Coliseu).
 *
 * @security
 * - `isClubPass` é checado pelo Server Component pai (`page.tsx`) via Supabase SSR.
 * - Membros `club_pass` veem o gate de acesso restrito em vez do conteúdo premium.
 *
 * @status MOCK (Em Breve) — conteúdo real em desenvolvimento.
 */
export default function ClubeClient({ isClubPass, upgradeLink }: { isClubPass: boolean, upgradeLink: string | null }) {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  return (
    <>
      <DashboardStyles />
      {/* BACKGROUND */}
      <div
        style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          zIndex: -1, background: "#FFF"
        }}
      />

      <StudentHeader />

      <main style={{
        maxWidth: "500px", margin: "0 auto", padding: "0 20px 120px",
        opacity: isLoaded ? 1 : 0, transition: "all 0.6s cubic-bezier(0.16, 1, 0.3, 1)"
      }}>

        {/* ── HEADER DE IMPACTO ── */}
        <section style={{ paddingTop: "32px", paddingBottom: "32px", textAlign: "center" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "var(--red)", color: "white", padding: "4px 12px", border: "2px solid #000", boxShadow: "4px 4px 0px #000", marginBottom: "16px" }}>
            <Trophy size={14} strokeWidth={3} />
            <span style={{ fontSize: "10px", fontWeight: 900, letterSpacing: "0.2em" }}>HALL DA FAMA</span>
          </div>
          <h1 className="font-display" style={{ fontSize: "52px", fontWeight: 950, lineHeight: 0.8, textTransform: "uppercase", letterSpacing: "-0.04em", margin: 0 }}>
             O CLUBE
          </h1>
          <p className="font-headline" style={{ fontSize: "12px", fontWeight: 800, color: "#000", marginTop: "12px", letterSpacing: "0.15em", textTransform: "uppercase", opacity: 0.6 }}>
            RANKING DE PERFORMANCE COLISEU
          </p>
        </section>

        {isClubPass ? (
          /* ── GATE: ACESSO RESTRITO (club_pass) ── */
          <AccessGate 
            message="O RANKING, O HALL DA FAMA E AS LIGAS SEMANAIS SÃO FUNCIONALIDADES EXCLUSIVAS PARA ATLETAS COM VÍNCULO CLUBE PREMIUM."
            upgradeLink={upgradeLink}
          />
        ) : (
          /* ── CONTEÚDO: EM BREVE (club_premium) ── */
          <section
            style={{
              background: "#FFF",
              border: "3px solid #000",
              boxShadow: "10px 10px 0px #000",
              position: "relative",
              overflow: "hidden",
              padding: "40px 20px",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "24px",
              animation: "entrancePop 0.4s cubic-bezier(0.16, 1, 0.3, 1)"
            }}
          >
            {/* Fita de Construção */}
            <div style={{
              position: "absolute",
              top: "20px",
              right: "-40px",
              background: "#FFD700",
              color: "#000",
              borderTop: "2px solid #000",
              borderBottom: "2px solid #000",
              padding: "4px 40px",
              transform: "rotate(45deg)",
              fontSize: "10px",
              fontWeight: 900,
              letterSpacing: "0.2em",
              zIndex: 10
            }}>
              WORK IN PROGRESS
            </div>

            <div style={{
              width: "80px",
              height: "80px",
              background: "#F0F0F0",
              border: "3px solid #000",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "4px 4px 0px var(--red)",
              borderRadius: "50%"
            }}>
              <Hammer size={40} color="#000" strokeWidth={2.5} />
            </div>

            <div>
              <h2 className="font-display" style={{ fontSize: "28px", fontWeight: 950, color: "#000", lineHeight: 1, marginBottom: "12px" }}>
                O CLUBE ESTÁ<br/>EM CONSTRUÇÃO
              </h2>
              <p className="font-headline" style={{ fontSize: "12px", fontWeight: 800, color: "#000", letterSpacing: "0.05em", opacity: 0.7 }}>
                ESTAMOS PREPARANDO UM ESPAÇO ÉPICO PARA VOCÊS ACOMPANHAREM SEUS RECORDES, PONTUAÇÕES E LIGAS SEMANAIS CONTRA OUTROS ALUNOS DO COLISEU.
              </p>
            </div>

            <div style={{ display: "inline-block", background: "#000", color: "#FFF", padding: "12px 24px", fontSize: "14px", fontWeight: 900, letterSpacing: "0.1em", border: "2px solid #000" }}>
              EM BREVE
            </div>

          </section>
        )}

      </main>

      <BottomNav />

      <style jsx>{`
          @keyframes entrancePop {
              from { opacity: 0; transform: scale(0.95) translateY(10px); }
              to { opacity: 1; transform: scale(1) translateY(0); }
          }
      `}</style>
    </>
  );
}

"use client";

import { useState, useEffect } from "react";
import StudentHeader from "@/components/StudentHeader";
import BottomNav from "@/components/BottomNav";
import { Trophy, Hammer } from "lucide-react";
import DashboardStyles from "@/components/DashboardStyles";
import AccessGate from "@/components/AccessGate";
import DailyLeaderboard from "./DailyLeaderboard";

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
export default function ClubeClient({ hasAccess, upgradeLink }: { hasAccess: boolean, upgradeLink: string | null }) {
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

        {!hasAccess ? (
          /* ── GATE: ACESSO RESTRITO ── */
          <AccessGate 
            message="O RANKING, O HALL DA FAMA E AS LIGAS SEMANAIS SÃO FUNCIONALIDADES EXCLUSIVAS PARA ATLETAS COM ACESSO CLUBE PREMIUM."
            upgradeLink={upgradeLink}
          />
        ) : (
          /* ── CONTEÚDO: LEADERBOARD DO DIA ── */
          <DailyLeaderboard />
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

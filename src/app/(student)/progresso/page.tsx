import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import StudentHeader from "@/components/StudentHeader";
import BottomNav from "@/components/BottomNav";
import DashboardStyles from "@/components/DashboardStyles";
import { Hammer, TrendingUp } from "lucide-react";
import { getBoxSettings } from "@/lib/constants/settings_actions";
import AccessGate from "@/components/AccessGate";

export const metadata: Metadata = {
  title: "Meu Progresso",
};

/**
 * Progresso Page
 * 
 * @status EM CONSTRUÇÃO
 * - Acesso bloqueado (Paywall/Gate) para membros `club_pass`.
 * - Conteúdo em breve para membros `club_premium`.
 */
export default async function ProgressPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // SSoT: Checagem do Tipo de Plano e Configurações
  const [
    { data: profile },
    boxSettings
  ] = await Promise.all([
    supabase.from("profiles").select("membership_type").eq("id", user.id).single(),
    getBoxSettings()
  ]);

  const isClubPass = profile?.membership_type === "club_pass";

  // Link de Upgrade (WhatsApp)
  const rawWhatsApp = boxSettings?.box_whatsapp || "";
  const whatsappNumber = rawWhatsApp.replace(/\D/g, "");
  const upgradeLink = whatsappNumber
    ? `https://wa.me/55${whatsappNumber}?text=${encodeURIComponent("Olá! Gostaria de saber mais sobre como fazer o upgrade para o Plano Clube Premium.")}`
    : null;

  return (
    <>
      <DashboardStyles />
      {/* BACKGROUND LIGHT */}
      <div 
        style={{ 
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0, 
          zIndex: -1, background: "#FFF" 
        }} 
      />

      <StudentHeader />

      <main className="animate-in" style={{ 
        maxWidth: "500px", margin: "0 auto", padding: "0 20px 120px", 
      }}>
        
        {/* ── HEADER DE IMPACTO ── */}
        <section style={{ paddingTop: "32px", paddingBottom: "32px", textAlign: "center" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "#E31B23", color: "white", padding: "4px 12px", border: "2px solid #000", boxShadow: "4px 4px 0px #000", marginBottom: "16px" }}>
            <TrendingUp size={14} strokeWidth={3} />
            <span style={{ fontSize: "10px", fontWeight: 900, letterSpacing: "0.2em" }}>EVOLUÇÃO TÉCNICA</span>
          </div>
          <h1 className="font-display" style={{ fontSize: "52px", fontWeight: 950, lineHeight: 0.8, textTransform: "uppercase", letterSpacing: "-0.04em", margin: 0 }}>
             MEU<br/>PROGRESSO
          </h1>
          <p className="font-headline" style={{ fontSize: "12px", fontWeight: 800, color: "#000", marginTop: "12px", letterSpacing: "0.15em", textTransform: "uppercase", opacity: 0.6 }}>
            ACOMPANHE SUA JORNADA
          </p>
        </section>

        {isClubPass ? (
          /* ── GATE: ACESSO RESTRITO (club_pass) ── */
          <AccessGate 
            message="O REGISTRO DE RECORDES (PR) E ACOMPANHAMENTO EVOLUTIVO SÃO FUNCIONALIDADES EXCLUSIVAS PARA ATLETAS COM VÍNCULO CLUBE PREMIUM."
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
              boxShadow: "4px 4px 0px #E31B23",
              borderRadius: "50%"
            }}>
              <Hammer size={40} color="#000" strokeWidth={2.5} />
            </div>

            <div>
              <h2 className="font-display" style={{ fontSize: "28px", fontWeight: 950, color: "#000", lineHeight: 1, marginBottom: "12px" }}>
                O PROGRESSO ESTÁ<br/>EM CONSTRUÇÃO
              </h2>
              <p className="font-headline" style={{ fontSize: "12px", fontWeight: 800, color: "#000", letterSpacing: "0.05em", opacity: 0.7 }}>
                ESTAMOS FINALIZANDO OS ÚLTIMOS DETALHES PARA VOCÊ ACOMPANHAR SEUS RECORDES PESSOAIS, METAS SEMANAIS E EVOLUÇÃO TÉCNICA EM TEMPO REAL.
              </p>
            </div>

            <div style={{ display: "inline-block", background: "#000", color: "#FFF", padding: "12px 24px", fontSize: "14px", fontWeight: 900, letterSpacing: "0.1em", border: "2px solid #000" }}>
              EM BREVE
            </div>

          </section>
        )}

      </main>

      <BottomNav />
    </>
  );
}

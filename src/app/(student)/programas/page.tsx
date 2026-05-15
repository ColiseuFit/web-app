import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import StudentHeader from "@/components/StudentHeader";
import BottomNav from "@/components/BottomNav";
import DashboardStyles from "@/components/DashboardStyles";
import Link from "next/link";
import { Zap, ChevronRight, Activity } from "lucide-react";
import { getAccessPermissions } from "@/lib/constants/access_actions";
import { getBoxSettings } from "@/lib/constants/settings_actions";
import { EvalGateLink } from "@/components/EvalRequestButton";

export const metadata: Metadata = {
  title: "Programas e Planos",
};

export default async function ProgramasPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [
    { data: profile },
    boxSettings
  ] = await Promise.all([
    supabase.from("profiles").select("running_level, running_status, membership_type").eq("id", user.id).single(),
    getBoxSettings()
  ]);

  const permissions = await getAccessPermissions(profile?.membership_type || "club_pass");
  const hasRunningAccess = permissions.can_access_running;

  // Link de Upgrade (WhatsApp)
  const rawWhatsApp = boxSettings?.box_whatsapp || "";
  const whatsappNumber = rawWhatsApp.replace(/\D/g, "");
  const upgradeLink = whatsappNumber
    ? `https://wa.me/55${whatsappNumber}?text=${encodeURIComponent("Olá! Gostaria de saber mais sobre como fazer o upgrade para o Plano Clube Premium.")}`
    : null;

  const isRunningInactive = profile?.running_status && profile.running_status !== "active";
  const hasRunningLevel = !!profile?.running_level;
  
  let runningTag = "NÃO INSCRITO";
  let runningTagBg = "#666";
  
  if (hasRunningLevel) {
    if (isRunningInactive) {
      runningTag = "PAUSADO";
      runningTagBg = "var(--nb-red)";
    } else {
      runningTag = "ATIVO";
      runningTagBg = "#000";
    }
  }

  // Programas disponíveis (por enquanto apenas Corrida)
  const programs = [
    {
      id: "running",
      title: "COLISEU RUNNING",
      description: "Planos de corrida personalizados para todos os níveis, do iniciante ao avançado.",
      icon: Activity,
      href: "/programas/running",
      tag: runningTag,
      tagBg: runningTagBg,
      color: "var(--nb-red)",
      gradient: "linear-gradient(45deg, var(--nb-red), #ff5f5f)"
    },
    // Novos programas podem ser adicionados aqui no futuro
  ];

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--nb-bg)", color: "var(--nb-text)", paddingBottom: "100px" }}>
      <DashboardStyles />
      <StudentHeader />

      <main style={{ maxWidth: "480px", margin: "0 auto", padding: "24px 20px" }}>
        
        <header style={{ marginBottom: "32px", animation: "slideInUp 0.5s ease-out" }}>
          <h2 className="font-display" style={{ 
            fontSize: "32px", 
            fontWeight: 900, 
            letterSpacing: "-0.02em",
            textTransform: "uppercase",
            lineHeight: 1,
            marginBottom: "8px"
          }}>
            NOSSOS <br />
            <span style={{ color: "var(--nb-red)" }}>PROGRAMAS</span>
          </h2>
          <p style={{ opacity: 0.7, fontSize: "14px", fontWeight: 500 }}>
            Treinamentos especializados e focados em objetivos específicos.
          </p>
        </header>

        <div style={{ display: "grid", gap: "20px" }}>
          {programs.map((program, idx) => (
            <EvalGateLink 
              key={program.id} 
              href={program.href}
              hasAccess={hasRunningAccess}
              upgradeLink={upgradeLink}
              message="O PROGRAMA DE CORRIDA PERSONALIZADO É CONTROLADO PELO SEU PLANO. FALE COM A RECEPÇÃO PARA MAIS DETALHES."
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <div
                className="nb-card"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                  padding: "24px",
                  background: "#fff",
                  position: "relative",
                  overflow: "hidden",
                  animation: `slideInUp ${0.6 + idx * 0.1}s ease-out forwards`,
                  cursor: "pointer",
                  transition: "transform 0.2s ease"
                }}
              >
                {/* Decorative Accent */}
                <div style={{ 
                  position: "absolute", 
                  top: 0, 
                  right: 0, 
                  width: "120px", 
                  height: "120px", 
                  background: program.gradient,
                  opacity: 0.05,
                  borderRadius: "0 0 0 100%",
                  zIndex: 0
                }} />

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", zIndex: 1 }}>
                  <div style={{ 
                    width: "48px", 
                    height: "48px", 
                    background: program.color, 
                    border: "2px solid #000",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "3px 3px 0px #000"
                  }}>
                    <program.icon color="#fff" size={28} strokeWidth={2.5} />
                  </div>
                  <span style={{
                    fontSize: "10px",
                    fontWeight: 900,
                    background: program.tagBg,
                    color: "#fff",
                    padding: "2px 8px",
                    letterSpacing: "0.1em",
                    border: "1px solid #000"
                  }}>
                    {program.tag}
                  </span>
                </div>

                <div style={{ zIndex: 1 }}>
                  <h3 className="font-headline" style={{ fontSize: "20px", fontWeight: 900, marginBottom: "4px" }}>
                    {program.title}
                  </h3>
                  <p style={{ fontSize: "13px", opacity: 0.8, lineHeight: 1.4 }}>
                    {program.description}
                  </p>
                </div>

                <div style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  gap: "4px",
                  fontSize: "11px",
                  fontWeight: 900,
                  textTransform: "uppercase",
                  color: program.color,
                  marginTop: "8px",
                  zIndex: 1
                }}>
                  {hasRunningAccess ? "ACESSAR PROGRAMA" : "RESTRITO AO PLANO"} <ChevronRight size={16} strokeWidth={3} />
                </div>
              </div>
            </EvalGateLink>
          ))}

          {/* Placeholder para próximos programas */}
          <div
            className="nb-card"
            style={{
              padding: "24px",
              background: "#f0f0f0",
              border: "2px dashed #ccc",
              opacity: 0.6,
              filter: "grayscale(100%)",
              display: "flex",
              flexDirection: "column",
              gap: "8px"
            }}
          >
            <div style={{ 
              width: "48px", 
              height: "48px", 
              background: "#eee", 
              border: "2px solid #ccc",
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center" 
            }}>
              <Zap color="#aaa" />
            </div>
            <h3 className="font-headline" style={{ fontSize: "16px", color: "#666" }}>EM BREVE...</h3>
          </div>
        </div>

      </main>

      <BottomNav />
    </div>
  );
}

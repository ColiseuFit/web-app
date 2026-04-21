import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import StudentHeader from "@/components/StudentHeader";
import BottomNav from "@/components/BottomNav";
import DashboardStyles from "@/components/DashboardStyles";
import Link from "next/link";
import { Zap, ChevronRight, Activity } from "lucide-react";

export const metadata: Metadata = {
  title: "Programas e Planos",
};

export default async function ProgramasPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Programas disponíveis (por enquanto apenas Corrida)
  const programs = [
    {
      id: "running",
      title: "COLISEU RUNNING",
      description: "Planos de corrida personalizados para todos os níveis, do iniciante ao avançado.",
      icon: Activity,
      href: "/programas/running",
      tag: "ATIVO",
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
            <Link 
              key={program.id} 
              href={program.href}
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
                    background: "#000",
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
                  ACESSAR PROGRAMA <ChevronRight size={16} strokeWidth={3} />
                </div>
              </div>
            </Link>
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

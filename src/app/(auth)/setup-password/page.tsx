import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import SetupPasswordForm from "./SetupPasswordForm";
import { ShieldCheck, Key } from "lucide-react";

export const metadata = {
  title: "Definir Senha | Coliseu",
  description: "Crie sua senha de acesso para começar seus treinos no Coliseu.",
};

export default async function SetupPasswordPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?error=session-expired");
  }

  return (
    <main style={{
      minHeight: "100dvh",
      backgroundColor: "#f5f5f5",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
      fontFamily: "'Outfit', 'Inter', sans-serif",
    }}>
      <div style={{ width: "100%", maxWidth: "460px" }}>
        <div style={{
          backgroundColor: "#ffffff",
          border: "4px solid #000000",
          boxShadow: "12px 12px 0px #000000",
          overflow: "hidden",
        }}>
          {/* Section: Header (Black) */}
          <div style={{
            backgroundColor: "#000000",
            padding: "40px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "20px",
            borderBottom: "4px solid #000",
          }}>
            <div style={{
              width: "72px", height: "72px",
              backgroundColor: "#E31B23",
              border: "3px solid #fff",
              boxShadow: "6px 6px 0px rgba(255,255,255,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
              transform: "rotate(-3deg)",
            }}>
              <ShieldCheck size={36} color="#fff" />
            </div>
            
            <div style={{ textAlign: "center" }}>
              <div style={{
                fontSize: "14px", fontWeight: 800, color: "#fff",
                letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "8px"
              }}>
                Bem-vindo ao
              </div>
              <div style={{
                fontSize: "48px", fontWeight: 900, color: "#E31B23",
                letterSpacing: "-2px", lineHeight: 0.8, textTransform: "uppercase"
              }}>
                COLISEU
              </div>
            </div>
          </div>

          {/* Section: Form Body (White) */}
          <div style={{ padding: "40px" }}>
            <p style={{
              fontSize: "15px", fontWeight: 700, color: "#333",
              lineHeight: 1.5, textAlign: "center", marginBottom: "32px",
              textTransform: "uppercase", letterSpacing: "tight"
            }}>
              Para sua segurança, defina uma <span style={{ color: "#E31B23" }}>senha forte</span> para acessar seu painel de treinos.
            </p>

            <SetupPasswordForm />

            <div style={{
              marginTop: "40px",
              display: "flex", alignItems: "center", justifyContent: "center",
              gap: "8px", color: "#888",
            }}>
              <Key size={14} />
              <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase" }}>
                Acesso Seguro • 256-bit AES
              </span>
            </div>
          </div>
        </div>

        <p style={{
          textAlign: "center", marginTop: "32px",
          fontSize: "11px", fontWeight: 800, letterSpacing: "0.2em",
          textTransform: "uppercase", color: "#999"
        }}>
          Coliseu Fitness & Performance © {new Date().getFullYear()}
        </p>
      </div>
    </main>
  );
}


import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import ProfileForm from "../ProfileForm";
import BottomNav from "@/components/BottomNav";

/**
 * Página de Edição de Perfil do Aluno.
 * 
 * @security
 * - Sessão verificada via Server Component.
 * - Dados buscados com RLS ativo no Supabase.
 */
export default async function ProfileEditPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return (
    <div style={{ backgroundColor: "#050505", color: "#FFFFFF", fontFamily: "'Inter', sans-serif", minHeight: "100vh", paddingBottom: "100px" }}>
      {/* ── HEADER ── */}
      <header style={{
        background: "rgba(5,5,5,0.95)",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        backdropFilter: "blur(20px)",
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}>
        <div style={{
          maxWidth: "480px",
          margin: "0 auto",
          padding: "16px",
          display: "flex",
          alignItems: "center",
          gap: "16px",
        }}>
          <Link href="/profile" style={{ 
            textDecoration: "none",
            color: "rgba(255,255,255,0.4)",
            display: "flex",
            alignItems: "center",
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </Link>
          
          <div style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: "16px",
            fontWeight: 900,
            textTransform: "uppercase",
            letterSpacing: "-0.02em",
          }}>
            EDITAR <span style={{ color: "#E31B23" }}>IDENTIDADE</span>
          </div>
        </div>
      </header>

      {/* Main Form Area */}
      <main style={{
        maxWidth: "480px",
        margin: "0 auto",
        padding: "24px 16px",
      }}>
        <ProfileForm user={user} profile={profile} />
      </main>

      {/* ── BOTTOM NAV ── */}
      <BottomNav />
    </div>
  );
}

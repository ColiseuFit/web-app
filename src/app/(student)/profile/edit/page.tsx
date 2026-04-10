import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import ProfileForm from "../ProfileForm";
import BottomNav from "@/components/BottomNav";
import { ChevronLeft } from "lucide-react";

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
    <div style={{ backgroundColor: "var(--bg)", color: "var(--text)", fontFamily: "'Inter', sans-serif", minHeight: "100vh", paddingBottom: "100px" }}>
      {/* ── HEADER ── */}
      <header style={{
        background: "var(--surface)",
        borderBottom: "1px solid var(--border)",
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
            color: "var(--text-dim)",
            display: "flex",
            alignItems: "center",
          }}>
            <ChevronLeft size={24} />
          </Link>
          
          <div style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: "16px",
            fontWeight: 900,
            textTransform: "uppercase",
            letterSpacing: "-0.02em",
          }}>
            EDITAR <span style={{ color: "var(--red)" }}>IDENTIDADE</span>
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

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import ProfileForm from "../ProfileForm";

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
      <nav
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          width: "100%",
          background: "rgba(5,5,5,0.92)",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          backdropFilter: "blur(24px)",
          zIndex: 150,
        }}
      >
        <div
          style={{
            maxWidth: "480px",
            margin: "0 auto",
            display: "flex",
            justifyContent: "space-around",
          }}
        >
          {[
            { href: "/dashboard", label: "Início", path: "M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z", type: "fill" },
            { href: "/treinos", label: "Treinos", path: "M13 2L3 14h9l-1 8 10-12h-9l1-8z", type: "stroke" },
            { href: "/profile", label: "Perfil", path: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z", type: "stroke" },
          ].map((item) => {
            const isActive = item.href === "/profile";
            return (
              <Link key={item.href} href={item.href} style={{ textDecoration: "none", flex: 1 }}>
                <div style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "4px",
                  padding: "14px 0",
                  color: isActive ? "#E31B23" : "rgba(255,255,255,0.2)",
                  position: "relative",
                }}>
                  {isActive && (
                    <div style={{
                      position: "absolute",
                      top: "-1px",
                      left: "50%",
                      transform: "translateX(-50%)",
                      width: "40px",
                      height: "2px",
                      background: "#E31B23",
                    }} />
                  )}
                  <svg width="20" height="20" viewBox="0 0 24 24" fill={item.type === "fill" ? "currentColor" : "none"} stroke={item.type === "stroke" ? "currentColor" : "none"} strokeWidth="2">
                    <path d={item.path} />
                  </svg>
                  <span style={{ fontSize: "8px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase" }}>{item.label}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

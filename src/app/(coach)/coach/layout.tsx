import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { USER_ROLES } from "@/lib/constants/roles";
import Image from "next/image";
import Link from "next/link";
import CoachLogoutButton from "@/components/coach/CoachLogoutButton";

/**
 * Nested Coach Layout: Handles RBAC protection and navbar for all AUTHENTICATED coach routes.
 *
 * @architecture
 * - Server Component: busca sessão e role server-side (zero latência no cliente).
 * - Embute `CoachLogoutButton` (Client Component) para interatividade de logout.
 * - Header sticky com identidade visual e área de logout com mínimo de 44px (iOS).
 */
export default async function AuthenticatedCoachLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/coach-portal");
  }

  let roleData = null;
  let coachName: string | null = null;

  const isAdminEmail = user.email === "admin@coliseufit.com";

  if (isAdminEmail) {
    roleData = { role: USER_ROLES.ADMIN };
    coachName = "Admin";
  } else {
    const { data: fetchRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();
    roleData = fetchRole;

    // Busca nome do perfil para exibição no header
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle();

    // Exibe apenas o primeiro nome para economia de espaço no mobile
    coachName = profile?.full_name?.split(" ")[0] ?? null;
  }

  // RBAC Check: Coach, Admin, or Reception only
  if (!roleData || (roleData.role !== USER_ROLES.ADMIN && roleData.role !== USER_ROLES.COACH && roleData.role !== USER_ROLES.RECEPTION)) {
    redirect("/coach-portal?error=unauthorized");
  }

  return (
    <>
      {/* Navbar do Coach — sticky, mobile-first */}
      <header style={{
        height: "60px",
        borderBottom: "3px solid #000",
        background: "#FFF",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",  // logo à esq, logout à dir
        paddingInline: "16px",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}>
        {/* LOGO + BADGE */}
        <Link href="/coach" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none", color: "inherit" }}>
          <Image
            src="/logo-coliseu-black.svg"
            alt="Coliseu"
            width={100}
            height={20}
            style={{ width: "auto", height: "auto" }}
            priority
          />
          <span className="font-display" style={{
            fontSize: "12px",
            fontWeight: 900,
            background: "var(--red)",
            color: "#FFF",
            padding: "2px 8px",
            letterSpacing: "0.1em",
            marginTop: "2px",
          }}>
            COACH
          </span>
        </Link>

        {/* ÁREA DIREITA: nome + logout */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {coachName && (
            <span style={{
              fontSize: "12px",
              fontWeight: 800,
              color: "#666",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              // Oculta em telas muito pequenas
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              maxWidth: "80px",
            }}>
              {coachName}
            </span>
          )}
          <CoachLogoutButton />
        </div>
      </header>

      <main style={{ padding: "16px", paddingBottom: "100px" }}>
        {children}
      </main>
    </>
  );
}

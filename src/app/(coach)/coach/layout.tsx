import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { USER_ROLES } from "@/lib/constants/roles";
import Image from "next/image";
import Link from "next/link";

/**
 * Nested Coach Layout: Handles RBAC protection and navbar for all AUTHENTICATED coach routes.
 */
export default async function AuthenticatedCoachLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/coach-portal");
  }

  let roleData = null;
  
  const isAdminEmail = user.email === "admin@coliseufit.com";

  if (isAdminEmail) {
    roleData = { role: USER_ROLES.ADMIN };
  } else {
    const { data: fetchRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();
    roleData = fetchRole;
  }

  // RBAC Check: Coach, Admin, or Reception only
  if (!roleData || (roleData.role !== USER_ROLES.ADMIN && roleData.role !== USER_ROLES.COACH && roleData.role !== USER_ROLES.RECEPTION)) {
    redirect("/coach-portal?error=unauthorized");
  }

  return (
    <>
      {/* Navbar simplificada padrão do Coach */}
      <header style={{ 
        height: "60px", 
        borderBottom: "3px solid #000", 
        background: "#FFF",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "sticky",
        top: 0,
        zIndex: 50
      }}>
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
            marginTop: "2px"
          }}>
            COACH
          </span>
        </Link>
      </header>

      <main style={{ padding: "16px", paddingBottom: "100px" }}>
        {children}
      </main>
    </>
  );
}

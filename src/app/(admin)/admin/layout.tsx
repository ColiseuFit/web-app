import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import AdminSidebar from "@/components/admin/AdminSidebar";

/**
 * Nested Admin Layout: Handles RBAC protection and layout for all AUTHENTICATED admin routes.
 *
 * @logic
 * - Skips auth and sidebar for /admin/login.
 * - Protects everything else under /admin/*.
 */
export default async function AuthenticatedAdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin-portal");
  }

  let roleData = null;

  // MASTER KEY BYPASS: Acesso garantido para o administrador raiz
  if (user.email === "admin@coliseufit.com") {
    roleData = { role: "admin" };
  } else {
    const { data: fetchRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();
    roleData = fetchRole;
  }

  if (!roleData || (roleData.role !== "admin" && roleData.role !== "reception")) {
    redirect("/admin-portal?error=unauthorized");
  }

  return (
    <div className="admin-shell" style={{ display: "flex", minHeight: "100vh", width: "100%", zoom: "85%" }}>
      <AdminSidebar />
      <main
        style={{
          marginLeft: 240,
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh",
          background: "var(--admin-surface)",
          width: "calc(100% - 240px)",
        }}
      >
        {children}
      </main>
    </div>
  );
}

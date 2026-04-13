import AdminStyles from "@/components/admin/AdminStyles";
import type { Metadata } from "next";

/**
 * Root Admin Layout: Provides the Clean Operational theme tokens to all admin routes.
 */
export const metadata: Metadata = {
  title: {
    template: "%s | Coliseu Admin",
    default: "Gestão | Coliseu Admin",
  },
  description: "Painel de Gestão Operacional da Coliseu.",
  robots: { index: false, follow: false },
  appleWebApp: {
    title: "Coliseu Admin",
  },
};

export default function RootAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AdminStyles />
      {children}
    </>
  );
}

import type { Metadata } from "next";

/**
 * Layout exclusivo para o grupo (student).
 * Define políticas de privacidade estritas (noindex) e metadados base.
 */
export const metadata: Metadata = {
  title: {
    template: "%s | Coliseu Aluno",
    default: "Área do Aluno | Coliseu",
  },
  description: "Plataforma de performance e progresso técnico para alunos Coliseu.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

import { createClient } from "@/lib/supabase/server";
import MaintenanceNotice from "@/components/MaintenanceNotice";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let firstName = "Atleta";
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, display_name")
      .eq("id", user.id)
      .maybeSingle();

    const rawName = profile?.display_name || profile?.full_name;
    if (rawName) {
      firstName = rawName.trim().split(" ")[0];
    }
  }

  return (
    <div className="student-layout-wrapper">
      <MaintenanceNotice studentName={firstName} />
      {children}
    </div>
  );
}

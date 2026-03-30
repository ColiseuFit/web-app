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

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="student-layout-wrapper">
      {children}
    </div>
  );
}

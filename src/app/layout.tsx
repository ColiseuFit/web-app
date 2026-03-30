import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Coliseu Clube",
  description: "Plataforma exclusiva dos membros do Coliseu",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <head />
      <body>
        {children}
      </body>
    </html>
  );
}

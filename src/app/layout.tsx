import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Coliseu Clube",
    template: "%s | Coliseu Clube"
  },
  description: "Plataforma exclusiva para membros do Coliseu. Acompanhe seus treinos, PRs e evolua na Arena.",
  keywords: ["CrossFit", "Treino", "Performance", "Coliseu", "Fitness"],
  authors: [{ name: "Coliseu Engineering" }],
  creator: "Coliseu Clube",
  publisher: "Coliseu Clube",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL("https://clube.coliseufit.com"),
  appleWebApp: {
    title: "Coliseu Clube",
    statusBarStyle: "black-translucent",
    capable: true,
  },
  openGraph: {
    title: "Coliseu Clube",
    description: "Acompanhe seus treinos, PRs e evolua na sua jornada fitness no Coliseu.",
    url: "https://clube.coliseufit.com",
    siteName: "Coliseu Clube",
    locale: "pt_BR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Coliseu Clube",
    description: "Acompanhe seus treinos, PRs e evolua na sua jornada fitness no Coliseu.",
  },
};

import { VersionGuard } from "@/components/pwa/VersionGuard";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <head>
        <meta name="theme-color" content="#131313" />
        <meta name="mobile-web-app-capable" content="yes" />
        {/* 
          Viewport-fit=cover: Permite que o conteúdo se estenda até as bordas da tela
          em dispositivos com notch (iPhone X+), criando uma experiência imersiva.
        */}
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        {/*
          Splash Screen: Data URI SVG inline com fundo #131313 e logo centralizado.
          Elimina o flash branco ao abrir o PWA pela Home Screen no iOS.
          Usamos data URI para evitar dependência de rede no momento do boot.
        */}
        <link
          rel="apple-touch-startup-image"
          href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1125' height='2436'%3E%3Crect width='1125' height='2436' fill='%23131313'/%3E%3Ctext x='50%25' y='48%25' text-anchor='middle' font-family='sans-serif' font-size='72' font-weight='bold' fill='%23E31B23'%3ECOLISEU%3C/text%3E%3Ctext x='50%25' y='53%25' text-anchor='middle' font-family='sans-serif' font-size='36' fill='%23666'%3ECLUB%3C/text%3E%3C/svg%3E"
        />
      </head>
      <body className="antialiased">
        <VersionGuard />
        {children}
      </body>
    </html>
  );
}

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
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}

"use client";

import React from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, TrendingUp } from "lucide-react";

/**
 * CoachNavigation: Barra de abas secundárias para o Portal do Coach.
 *
 * @architecture
 * - Client Component: Necessário para detectar a rota ativa via usePathname().
 * - Iron Monolith UI: Design brutalista B&W com indicador de aba ativa via borda inferior.
 * - Mobile-First: Abas fixas na parte inferior do header para fácil alcance com o polegar.
 * - Extensível: Novas abas podem ser adicionadas ao array `tabs` sem alterações estruturais.
 *
 * @design
 * - Cada aba possui ícone SVG nativo (Lucide) + label.
 * - Aba ativa recebe fundo preto com texto branco.
 * - Transições suaves de 200ms para hover e estado ativo.
 */

interface NavTab {
  href: string;
  label: string;
  icon: React.ReactNode;
}

export default function CoachNavigation() {
  const pathname = usePathname();

  /** SSoT: Lista de abas do painel Coach */
  const tabs: NavTab[] = [
    {
      href: "/coach",
      label: "Dashboard",
      icon: <LayoutDashboard size={16} />,
    },
    {
      href: "/coach/resultados",
      label: "Resultados",
      icon: <TrendingUp size={16} />,
    },
  ];

  /**
   * Verifica se a aba é a rota ativa.
   * A rota "/coach" é ativa apenas quando é exatamente "/coach" ou começa com "/coach?".
   * As demais rotas são ativas quando o pathname começa com o href da aba.
   */
  const isActive = (href: string): boolean => {
    if (href === "/coach") {
      return pathname === "/coach" || pathname === "/coach/";
    }
    return pathname.startsWith(href);
  };

  return (
    <nav
      style={{
        display: "flex",
        alignItems: "stretch",
        borderBottom: "3px solid #000",
        background: "#FFF",
        overflow: "hidden",
      }}
    >
      {tabs.map((tab) => {
        const active = isActive(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              padding: "12px 8px",
              fontSize: "12px",
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              textDecoration: "none",
              color: active ? "#FFF" : "#666",
              background: active ? "#000" : "transparent",
              transition: "all 0.2s ease",
              whiteSpace: "nowrap",
              minHeight: "44px",
              cursor: "pointer",
            }}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

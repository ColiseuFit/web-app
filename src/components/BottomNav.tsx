"use client";

import { Home, History, TrendingUp, Users, LayoutGrid, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Navegação Inferior (Mobile-First) para o Aluno.
 * Centraliza os principais pontos de entrada da plataforma.
 */
export default function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    {
      href: "/dashboard",
      icon: Home,
      label: "INÍCIO",
      active: pathname === "/dashboard",
    },
    {
      href: "/treinos",
      icon: History, 
      label: "ATIVIDADE",
      active: pathname.includes("/treinos"),
    },
    {
      href: "/programas",
      icon: LayoutGrid,
      label: "PROGRAMAS",
      active: pathname.includes("/programas"),
    },
    {
      href: "/progresso",
      icon: TrendingUp,
      label: "PROGRESSO",
      active: pathname.includes("/progresso"),
    },
    {
      href: "/clube",
      icon: Users,
      label: "CLUBE",
      active: pathname.includes("/clube"),
    },
  ];

  return (
    <nav
      className="nav-floating-dock"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        width: "100%",
        background: "var(--nb-bg)",
        borderTop: "2px solid #000",
        zIndex: 150,
      }}
    >
      <div
        style={{
          maxWidth: "480px",
          margin: "0 auto",
          display: "flex",
          justifyContent: "space-around",
          paddingBottom: "env(safe-area-inset-bottom, 12px)",
        }}
      >
        {navItems.map((item) => {
          const isActive = item.active;
          const Icon = item.icon;
          
          return (
            <Link key={item.href} href={item.href} style={{ textDecoration: "none", flex: 1 }}>
              <div style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "4px",
                padding: "12px 0 8px 0",
                color: isActive ? "var(--nb-red)" : "#000",
                position: "relative",
                transition: "all 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                transform: isActive ? "translateY(-4px)" : "none",
              }}>
                {isActive && (
                  <div style={{
                    position: "absolute",
                    top: "-2px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: "32px",
                    height: "4px",
                    background: "var(--nb-red)",
                    border: "2px solid #000",
                    boxShadow: "2px 2px 0px rgba(0,0,0,0.1)"
                  }} />
                )}
                
                <Icon 
                  size={24} 
                  strokeWidth={isActive ? 3 : 2}
                  style={{ 
                    transition: "all 0.2s ease",
                    filter: isActive ? "drop-shadow(2px 2px 0px rgba(0,0,0,0.1))" : "none"
                  }}
                />
                
                <span className="font-headline" style={{ 
                  fontSize: "9px", 
                  fontWeight: 900, 
                  letterSpacing: "0.05em", 
                  textTransform: "uppercase",
                  opacity: isActive ? 1 : 0.6
                }}>
                  {item.label}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </nav>

  );
}

"use client";

import { Home, History, TrendingUp, Users, User } from "lucide-react";
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
    {
      href: "/profile",
      icon: User,
      label: "ATLETA",
      active: pathname.includes("/profile"),
    },
  ];

  return (
    <nav
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        width: "100%",
        background: "rgba(14,14,14,0.92)",
        borderTop: "1px solid var(--border-glow)",
        backdropFilter: "blur(24px)",
        zIndex: 150,
      }}
    >
      <div
        style={{
          maxWidth: "480px",
          margin: "0 auto",
          display: "flex",
          justifyContent: "space-around",
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
                gap: "6px",
                padding: "12px 0",
                color: isActive ? "var(--red)" : "var(--text-muted)",
                position: "relative",
                transition: "var(--transition)",
              }}>
                {isActive && (
                  <div style={{
                    position: "absolute",
                    top: "-1px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: "40px",
                    height: "2px",
                    background: "var(--red)",
                    boxShadow: "0 0 10px var(--red-glow)",
                  }} />
                )}
                
                <Icon 
                  size={20} 
                  strokeWidth={isActive ? 2.5 : 2}
                  style={{ opacity: isActive ? 1 : 0.7 }}
                />
                
                <span style={{ 
                  fontSize: "8px", 
                  fontWeight: 800, 
                  letterSpacing: "0.15em", 
                  textTransform: "uppercase",
                  fontFamily: "var(--font-display, 'Outfit', sans-serif)"
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

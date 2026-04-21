"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  Dumbbell,
  CalendarClock,
  LogOut,
  ChevronLeft,
  Settings,
  Contact,
  Trophy,
  Zap,
} from "lucide-react";
import { logout } from "@/app/(auth)/actions";

/**
 * AdminSidebar: Clean vertical navigation for the Admin ecosystem.
 *
 * @design Minimalist B&W sidebar with icon+label links.
 * Collapses to icon-only on narrow viewports via CSS.
 * Active route indicated by solid background + bold text.
 */

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/alunos", label: "Alunos", icon: Users },
  { href: "/admin/professores", label: "Professores", icon: Contact },
  { href: "/admin/wods", label: "WODs", icon: Dumbbell },
  { href: "/admin/turmas", label: "Turmas", icon: CalendarClock },
  { href: "/admin/running", label: "Corrida", icon: Zap },
  { href: "/admin/gamificacao", label: "Gamificação", icon: Trophy },
  { href: "/admin/settings", label: "Config", icon: Settings },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  }

  return (
    <aside
      style={{
        width: 240,
        minHeight: "100%", // Preenche toda a altura do shell pai
        borderRight: "3px solid #000",
        background: "#FFF",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: 40,
      }}
    >
      {/* ── LOGO / BRAND ── */}
      <div>
        <div
          style={{
            padding: "32px 24px",
            borderBottom: "2px solid #000",
            display: "flex",
            alignItems: "center",
            gap: 12,
            background: "#000",
            color: "#FFF"
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              background: "#FFF",
              color: "#000",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 0,
              fontWeight: 900,
              fontSize: 18,
            }}
          >
            C
          </div>
          <div>
            <div
              style={{
                fontSize: "18px",
                fontWeight: 900,
                letterSpacing: "-0.04em",
                textTransform: "uppercase",
                lineHeight: 1,
              }}
            >
              Coliseu
            </div>
            <div
              style={{
                fontSize: "11px",
                color: "#AAA",
                fontWeight: 700,
                textTransform: "uppercase",
                marginTop: "2px"
              }}
            >
              Gestão do Box
            </div>
          </div>
        </div>

        {/* ── NAV LINKS ── */}
        <nav style={{ padding: "20px 12px", display: "flex", flexDirection: "column", gap: "8px" }}>
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "14px 16px",
                  fontSize: "14px",
                  fontWeight: active ? 800 : 600,
                  color: active ? "#FFF" : "#000",
                  background: active ? "#000" : "transparent",
                  border: active ? "2px solid #000" : "2px solid transparent",
                  textDecoration: "none",
                  textTransform: "uppercase",
                  letterSpacing: "-0.02em",
                  transition: "none",
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.borderColor = "#000";
                    e.currentTarget.style.background = "#F5F5F5";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.borderColor = "transparent";
                    e.currentTarget.style.background = "transparent";
                  }
                }}
              >
                <Icon size={20} strokeWidth={active ? 3 : 2} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* ── BOTTOM: Back to Student App ── */}
      <div style={{ padding: "16px 12px 24px", borderTop: "2px solid #000", background: "#F9F9F9" }}>
        <a
          href="/dashboard?viewAsStudent=true"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 16px",
            fontSize: "13px",
            fontWeight: 700,
            color: "#666",
            textDecoration: "none",
            textTransform: "uppercase",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "#000";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "#666";
          }}
        >
          <ChevronLeft size={18} strokeWidth={2.5} />
          <span>App do Aluno</span>
        </a>
        <form action={logout}>
          <button
            type="submit"
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "12px 16px",
              fontSize: "13px",
              fontWeight: 700,
              color: "#666",
              textDecoration: "none",
              textTransform: "uppercase",
              background: "none",
              border: "none",
              cursor: "pointer",
              transition: "all 0.1s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#000";
              e.currentTarget.style.color = "#FFF";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "#666";
            }}
          >
            <LogOut size={18} strokeWidth={2.5} />
            <span>Sair</span>
          </button>
        </form>
      </div>
    </aside>
  );
}

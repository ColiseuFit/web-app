"use client";

import { useState } from "react";
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
  ClipboardList,
  BarChart3,
  CalendarDays,
  Store,
  ChevronDown,
  Box,
} from "lucide-react";
import { logout } from "@/app/(auth)/actions";

/**
 * AdminSidebar: Clean vertical navigation for the Admin ecosystem.
 *
 * @design Minimalist B&W sidebar with icon+label links and accordion groups.
 */

type NavItem = { href: string; label: string; icon?: React.ElementType };
type NavGroup = { label: string; icon: React.ElementType; items: NavItem[] };
type NavEntry = NavItem | NavGroup;

function isNavGroup(entry: NavEntry): entry is NavGroup {
  return (entry as NavGroup).items !== undefined;
}

const HUBS: Record<string, NavEntry[]> = {
  operacional: [
    { href: "/admin?hub=operacional", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/turmas/check-ins", label: "Check-ins ao Vivo", icon: Zap },
    { href: "/admin/alunos/pre-cadastro", label: "Pré-cadastro", icon: Contact },
    { href: "/admin/alunos/presenca", label: "Frequência", icon: CalendarClock },
    { href: "/admin/loja/checkout", label: "PDV / Caixa", icon: Store },
  ],
  tatico: [
    { href: "/admin?hub=tatico", label: "Dashboard", icon: LayoutDashboard },
    {
      label: "Treinos & Turmas",
      icon: Dumbbell,
      items: [
        { href: "/admin/turmas", label: "Grade de Horários" },
        { href: "/admin/wods", label: "WODs" },
        { href: "/admin/alunos/matriculas", label: "Matrículas" },
      ]
    },
    {
      label: "Programas",
      icon: Trophy,
      items: [
        { href: "/admin/programas/corrida", label: "Corrida" },
      ]
    },
    {
      label: "Estoque & Loja",
      icon: Box,
      items: [
        { href: "/admin/loja/estoque", label: "Estoque" },
        { href: "/admin/loja/produtos", label: "Produtos" },
        { href: "/admin/loja/servicos", label: "Serviços" },
      ]
    },
    {
      label: "Gestão",
      icon: Users,
      items: [
        { href: "/admin/alunos/lista", label: "CRM de Alunos" },
        { href: "/admin/gestao/planos", label: "Planos" },
        { href: "/admin/gestao/financeiro", label: "Financeiro" },
        { href: "/admin/gestao/documentos", label: "Documentos & Regras" },
        { href: "/admin/gestao/professores", label: "Professores e Staff" },
        { href: "/admin/agenda/agendamentos", label: "Agendamentos" },
      ]
    }
  ],
  estrategico: [
    { href: "/admin?hub=estrategico", label: "Dashboard Macro", icon: LayoutDashboard },
    {
      label: "Gestão do Negócio",
      icon: ClipboardList,
      items: [
        { href: "/admin/gestao/financeiro", label: "Fluxo de Caixa" },
      ]
    },
    {
      label: "Relatórios & Dados",
      icon: BarChart3,
      items: [
        { href: "/admin/relatorios/alunos", label: "Evasão e Retenção" },
        { href: "/admin/relatorios/financeiro", label: "MRR e Lucratividade" },
        { href: "/admin/relatorios/vendas", label: "Conversão de Vendas" },
      ]
    },
    { href: "/admin/gamificacao", label: "Gamificação", icon: Trophy },
    { href: "/admin/settings", label: "Configuração Geral", icon: Settings },
  ]
};

/**
 * AdminSidebar Component
 * 
 * @description
 * Menu Lateral Principal do Admin Hub.
 * Implementa a arquitetura de Navegação Contextual O.T.E. (Operacional, Tático, Estratégico).
 * 
 * @architecture Role-Based UI
 * Em vez de exibir todos os domínios do sistema ao mesmo tempo, este componente usa 
 * o estado `activeHub` para trocar as rotas disponíveis no menu dinamicamente.
 * O clique no "Dashboard" passa um searchParam (`?hub=...`) para que a `page.tsx`
 * possa renderizar o painel de bordo correspondente (Dispatcher Pattern).
 *
 * @logic isActive
 * Determina se um link do sidebar está selecionado.
 * - Para o dashboard `/admin` e para `/admin/turmas`, realiza correspondência exata
 *   para evitar que sub-páginas (como `/admin/turmas/check-ins`) iluminem incorretamente a aba pai.
 * - Para os outros caminhos, utiliza correspondência por prefixo (`startsWith`).
 */
export default function AdminSidebar() {
  const pathname = usePathname();
  // State for accordion groups and active hub
  const [activeHub, setActiveHub] = useState<"operacional" | "tatico" | "estrategico">("operacional");
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const currentNavEntries = HUBS[activeHub] || HUBS["operacional"];

  function isActive(href: string) {
    if (href === "/admin") return pathname === "/admin";
    if (href === "/admin/turmas") return pathname === "/admin/turmas";
    return pathname.startsWith(href);
  }

  function isGroupActive(group: NavGroup) {
    return group.items.some(item => isActive(item.href));
  }

  function toggleGroup(label: string) {
    setOpenGroups(prev => ({
      ...prev,
      [label]: prev[label] === undefined ? false : !prev[label] // If undefined, it was open by default if active. We handle initialization below.
    }));
  }

  return (
    <aside
      style={{
        width: 260, // Ligeiramente mais largo para comportar a indentação confortavelmente
        height: "117.65vh", // Compensa o zoom de 0.85 (100 / 0.85) definido no layout
        borderRight: "3px solid #000",
        background: "#FFF",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: 40,
        overflowY: "auto" // Permite rolagem se o menu ficar muito grande
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

        {/* ── HUB SWITCHER ── */}
        <div style={{ padding: "20px 20px 0 20px" }}>
          <label style={{ display: "block", fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: "#666", marginBottom: 6 }}>
            Módulo Atual
          </label>
          <div style={{ position: "relative" }}>
            <select 
              value={activeHub}
              onChange={(e) => setActiveHub(e.target.value as any)}
              style={{
                width: "100%",
                appearance: "none",
                background: "#F3F4F6",
                border: "2px solid #E5E7EB",
                padding: "10px 14px",
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 800,
                color: "#000",
                cursor: "pointer",
                outline: "none",
                transition: "border-color 0.2s ease"
              }}
              onFocus={(e) => e.target.style.borderColor = "#000"}
              onBlur={(e) => e.target.style.borderColor = "#E5E7EB"}
            >
              <option value="operacional">🟢 Recepção</option>
              <option value="tatico">🟡 Gerencial</option>
              <option value="estrategico">🔴 Administração</option>
            </select>
            <ChevronDown size={14} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "#666" }} />
          </div>
        </div>

        {/* ── NAV LINKS ── */}
        <nav style={{ padding: "24px 16px", display: "flex", flexDirection: "column", gap: "10px" }}>
          {currentNavEntries.map((entry, index) => {
            if (isNavGroup(entry)) {
              // É um grupo (Accordion)
              const GroupIcon = entry.icon;
              const hasActiveChild = isGroupActive(entry);
              // Se nunca foi tocado no estado, abre se tiver filho ativo
              const isOpen = openGroups[entry.label] !== undefined ? openGroups[entry.label] : hasActiveChild;

              return (
                <div key={`group-${index}`} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <button
                    onClick={() => toggleGroup(entry.label)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "12px 14px",
                      fontSize: "14px",
                      fontWeight: 800,
                      color: hasActiveChild ? "#000" : "#444",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      textTransform: "uppercase",
                      letterSpacing: "-0.02em",
                      width: "100%",
                      transition: "color 0.2s ease"
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = "#000"; }}
                    onMouseLeave={(e) => { if (!hasActiveChild) e.currentTarget.style.color = "#444"; }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <GroupIcon size={20} strokeWidth={hasActiveChild ? 2.5 : 2} />
                      <span>{entry.label}</span>
                    </div>
                    <ChevronDown
                      size={16}
                      strokeWidth={2.5}
                      style={{
                        transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                        transition: "transform 0.2s ease"
                      }}
                    />
                  </button>
                  
                  {/* Subitems Container */}
                  <div
                    style={{
                      display: isOpen ? "flex" : "none",
                      flexDirection: "column",
                      gap: "4px",
                      paddingLeft: "32px", // Indentação sob o ícone
                      marginTop: "2px"
                    }}
                  >
                    {entry.items.map(sub => {
                      const active = isActive(sub.href);
                      return (
                        <Link
                          key={sub.href}
                          href={sub.href}
                          style={{
                            display: "block",
                            padding: "10px 14px",
                            fontSize: "13px",
                            fontWeight: active ? 800 : 600,
                            color: active ? "#FFF" : "#666",
                            background: active ? "#000" : "transparent",
                            border: active ? "2px solid #000" : "2px solid transparent",
                            textDecoration: "none",
                            textTransform: "uppercase",
                            letterSpacing: "-0.02em",
                          }}
                          onMouseEnter={(e) => {
                            if (!active) {
                              e.currentTarget.style.borderColor = "#000";
                              e.currentTarget.style.background = "#F5F5F5";
                              e.currentTarget.style.color = "#000";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!active) {
                              e.currentTarget.style.borderColor = "transparent";
                              e.currentTarget.style.background = "transparent";
                              e.currentTarget.style.color = "#666";
                            }
                          }}
                        >
                          {sub.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            }

            // É um item solto (Flat)
            const active = isActive(entry.href);
            const Icon = entry.icon!;
            return (
              <Link
                key={entry.href}
                href={entry.href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 14px",
                  fontSize: "14px",
                  fontWeight: active ? 800 : 700,
                  color: active ? "#FFF" : "#444",
                  background: active ? "#000" : "transparent",
                  border: active ? "2px solid #000" : "2px solid transparent",
                  textDecoration: "none",
                  textTransform: "uppercase",
                  letterSpacing: "-0.02em",
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.borderColor = "#000";
                    e.currentTarget.style.background = "#F5F5F5";
                    e.currentTarget.style.color = "#000";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.borderColor = "transparent";
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "#444";
                  }
                }}
              >
                <Icon size={20} strokeWidth={active ? 2.5 : 2} />
                <span>{entry.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* ── BOTTOM: Back to Student App ── */}
      <div style={{ padding: "16px 12px 24px", borderTop: "2px solid #000", background: "#F9F9F9", marginTop: "auto" }}>
        <a
          href="/coach"
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
          <span>App do Coach</span>
        </a>
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

"use client";

import { Users, UserCheck, TrendingUp, Phone, Plus } from "lucide-react";
import Link from "next/link";

/**
 * AdminDashboardClient: Central Hub & Analytics Interface.
 *
 * @architecture
 * - Renders the primary entry point for Box Owners / Managers.
 * - This is a pure Client Component. Data fetching and RLS validations are handled upstream
 *   in the Server Component (`/admin/page.tsx`), passing sanitized props downwards.
 * 
 * @design 
 * - Iron Monolith (Clean B&W operational view). Prioritizes high legibility and data density
 *   over complex animations. Uses strictly defined CSS Variables.
 *
 * @param {StatCard[]} stats - Aggregated KPI cards (e.g., Total Students, Active Check-ins).
 * @param {RecentStudent[]} recentStudents - Array detailing the latest 8 sign-ups + their today's check-in status.
 * @param {number} totalStudents - Aggregate sum of active platform members.
 */

interface StatCard {
  label: string;
  value: number;
  icon: string;
  color: string;
}

interface RecentStudent {
  id: string;
  name: string;
  full_name: string;
  level: string;
  created_at: string;
  phone: string | null;
  checked_in_today: boolean;
}

interface Props {
  stats: StatCard[];
  recentStudents: RecentStudent[];
  totalStudents: number;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  users: <Users size={20} />,
  check: <UserCheck size={20} />,
  trending: <TrendingUp size={20} />,
};

/**
 * Formats a level string for display.
 * @param level - Raw level from DB (e.g., 'branco', 'preto').
 * @returns Capitalized level string.
 */
function formatLevel(level: string): string {
  if (!level) return "—";
  const levels: Record<string, string> = {
    iniciante: "Iniciante",
    scale: "Scale",
    intermediario: "Intermediário",
    rx: "RX",
    elite: "Elite",
  };
  return levels[level.toLowerCase()] || level.charAt(0).toUpperCase() + level.slice(1);
}

/**
 * Formats a date string to a short Brazilian format.
 * @param dateStr - ISO 8601 date string.
 */
function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
}

export default function AdminDashboardClient({ stats, recentStudents, totalStudents }: Props) {
  return (
    <div className="admin-container-fluid">
      {/* ── PAGE HEADER ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "40px" }}>
        <div>
          <h1 style={{ fontSize: "32px", fontWeight: 800, letterSpacing: "-0.03em", margin: "0 0 4px" }}>
            Gestão do Box
          </h1>
          <p style={{ fontSize: "14px", color: "#666", fontWeight: 500, margin: 0 }}>
            Painel Geral de Gestão • {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
        <Link
          href="/admin/alunos"
          className="admin-btn admin-btn-primary"
          style={{ textDecoration: "none", height: "52px" }}
        >
          <Plus size={20} />
          Matricular Aluno
        </Link>
      </div>

      {/* ── STAT CARDS ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "24px", marginBottom: "48px" }}>
        {stats.map((stat) => (
          <div key={stat.label} className="admin-card" style={{ display: "flex", flexDirection: "column", gap: "12px", borderLeft: `6px solid ${stat.color}` }}>
            <span style={{ fontSize: "12px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: "#666" }}>
              {stat.label}
            </span>
            <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
              <span style={{ fontSize: "48px", fontWeight: 900, color: "#000", lineHeight: 1 }}>
                {stat.value}
              </span>
              <div style={{ color: stat.color }}>
                {ICON_MAP[stat.icon]}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "24px", alignItems: "start" }}>
        {/* ── RECENT ACTIVITY ── */}
        <div className="admin-card" style={{ padding: 0, overflow: "hidden" }}>
          <div
            style={{
              padding: "20px 24px",
              borderBottom: "2px solid #000",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "#FAFAFA"
            }}
          >
            <h2 style={{ fontSize: "14px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>
              Matrículas Recentes
            </h2>
            <Link
              href="/admin/alunos"
              style={{
                fontSize: "12px",
                color: "#111",
                textDecoration: "underline",
                fontWeight: 700,
              }}
            >
              Ver Gestão Completa
            </Link>
          </div>

          {recentStudents.length === 0 ? (
            <div style={{ padding: "64px", textAlign: "center", color: "#999" }}>
              Aguardando novas matrículas...
            </div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th style={{ paddingLeft: "24px" }}>Atleta</th>
                  <th>Nível</th>
                  <th>Status Hoje</th>
                  <th style={{ width: "60px" }}></th>
                </tr>
              </thead>
              <tbody>
                {recentStudents.map((student) => (
                  <tr key={student.id}>
                    <td style={{ paddingLeft: "24px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <div
                          style={{
                            width: "32px",
                            height: "32px",
                            background: "#000",
                            color: "#FFF",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "12px",
                            fontWeight: 800,
                          }}
                        >
                          {student.name?.charAt(0)?.toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: "14px" }}>{student.name}</div>
                          <div style={{ fontSize: "11px", color: "#666" }}>{formatDate(student.created_at)}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`admin-badge badge-${student.level || "branco"}`}>
                        {formatLevel(student.level)}
                      </span>
                    </td>
                    <td>
                      {student.checked_in_today ? (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "var(--admin-success)", fontWeight: 700, fontSize: "12px" }}>
                          <UserCheck size={14} /> PRESENTE
                        </span>
                      ) : (
                        <span style={{ color: "#CCC", fontWeight: 500, fontSize: "12px" }}>AUSENTE</span>
                      )}
                    </td>
                    <td>
                      {student.phone && (
                        <a
                          href={`https://wa.me/55${student.phone.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="admin-btn admin-btn-ghost"
                          style={{ width: "36px", height: "36px", padding: 0 }}
                          title="WhatsApp"
                        >
                          <Phone size={16} />
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ── QUICK ACTIONS / HELP ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div className="admin-card" style={{ background: "#000 !important", color: "#FFF" }}>
             <h3 style={{ fontSize: "14px", fontWeight: 800, margin: "0 0 12px" }}>SUPORTE OPERACIONAL</h3>
             <p style={{ fontSize: "13px", color: "#AAA", margin: "0 0 20px", lineHeight: 1.5 }}>
               Em caso de dúvidas sobre check-ins ou faturamento, acione o suporte técnico.
             </p>
             <button className="admin-btn" style={{ background: "#FFF", color: "#000", width: "100%", border: "none" }}>
               Falar com TI
             </button>
          </div>
          
          <div className="admin-card" style={{ borderStyle: "dashed" }}>
             <h3 style={{ fontSize: "14px", fontWeight: 800, margin: "0 0 4px" }}>LOG DE ACESSO</h3>
             <p style={{ fontSize: "12px", color: "#666", margin: 0 }}>
               Último acesso: {new Date().toLocaleTimeString("pt-BR")}
             </p>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { Users, UserCheck, TrendingUp, Phone, Plus } from "lucide-react";
import Link from "next/link";
import AthleteIdentity from "@/components/Identity/AthleteIdentity";
import { getLevelInfo, type LevelInfo } from "@/lib/constants/levels";
import { getTodayDate } from "@/lib/date-utils";
/**
 * AdminDashboardClient: Centro de Comando e Analytics Executivo.
 *
 * @architecture
 * - Ponto de Entrada Principal: Centraliza a visão operacional dos gestores e donos do box.
 * - SSoT de Métricas: Consome KPIs pré-calculados no servidor (`getCachedKPIs`) para 
 *   garantir carregamento instantâneo e consistência de dados.
 * - Desacoplamento: Componente puramente visual (Client-Presentational). Toda a 
 *   lógica de segurança (RLS) e busca pesada é abstraída no Server Component pai.
 * 
 * @design 
 * - Padrão Iron Monolith: Estética de alto contraste (P&B) para máxima legibilidade 
 *   em ambientes de box (alta luminosidade). Prioriza densidade de informação útil.
 *
 * @param {StatCard[]} stats - Cards de KPI (Total de Alunos, Presenças Hoje, Retenção).
 * @param {RecentStudent[]} recentStudents - Lista das últimas 8 matrículas com status de check-in.
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
  avatar_url?: string | null;
  phone: string | null;
  created_at: string;
  checked_in_today: boolean;
}

interface Props {
  stats: StatCard[];
  recentStudents: RecentStudent[];
  totalStudents: number;
  dynamicLevels?: Record<string, LevelInfo>;
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
function formatLevel(level: string, dynamicLevels?: Record<string, LevelInfo>): string {
  return getLevelInfo(level, dynamicLevels).label;
}

/**
 * Formats a date string to a short Brazilian format.
 * @param dateStr - ISO 8601 date string.
 */
function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    timeZone: "America/Sao_Paulo"
  });
}

export default function AdminDashboardClient({ stats, recentStudents, totalStudents, dynamicLevels }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="admin-container-fluid">
      {/* ── PAGE HEADER ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "40px" }}>
        <div>
          <h1 style={{ fontSize: "32px", fontWeight: 800, letterSpacing: "-0.03em", margin: "0 0 4px" }}>
            Gestão do Box
          </h1>
          <p style={{ fontSize: "14px", color: "#666", fontWeight: 500, margin: 0 }}>
            Painel Geral de Gestão • {mounted ? new Date(getTodayDate() + "T12:00:00Z").toLocaleDateString("pt-BR", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" }) : "--:--"}
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
                    <td style={{ paddingLeft: "16px" }}>
                      <AthleteIdentity
                        full_name={student.full_name}
                        display_name={student.name}
                        avatar_url={student.avatar_url}
                        size={36}
                        subordinateText={formatDate(student.created_at)}
                      />
                    </td>
                    <td>
                      <span className={`admin-badge badge-${getLevelInfo(student.level, dynamicLevels).key}`}>
                        {getLevelInfo(student.level, dynamicLevels).label}
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
               Último acesso: {mounted ? new Date().toLocaleTimeString("pt-BR") : "--:--"}
             </p>
          </div>
        </div>
      </div>
    </div>
  );
}

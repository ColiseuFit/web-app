"use client";

/**
 * @component DashboardEstrategicoClient
 * @description
 * Visão focada no nível executivo (Hub Estratégico / Administração).
 * Exibe métricas de SaaS de longo prazo: MRR, Churn, LTV e Caixa.
 * 
 * @legacy_proof
 * ATENÇÃO: Os dados renderizados aqui são MOCKS estáticos, servindo para aprovação
 * de UX/UI. A integração com o módulo financeiro (Stripe/Asaas) deve injetar dados 
 * via Server Component Pai (`page.tsx`) no futuro.
 */

import { TrendingUp, TrendingDown, DollarSign, Activity, FileText } from "lucide-react";
import Link from "next/link";
import { getTodayDate } from "@/lib/date-utils";
import { useState, useEffect } from "react";

export default function DashboardEstrategicoClient() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="admin-container-fluid">
      {/* ── HEADER ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "40px" }}>
        <div>
          <h1 style={{ fontSize: "32px", fontWeight: 900, letterSpacing: "-0.03em", margin: "0 0 4px" }}>
            Administração Macro
          </h1>
          <p style={{ fontSize: "14px", color: "#666", fontWeight: 500, margin: 0 }}>
            Visão Executiva do Negócio • {mounted ? new Date(getTodayDate() + "T12:00:00Z").toLocaleDateString("pt-BR", { timeZone: "UTC", month: "long", year: "numeric" }).toUpperCase() : "--"}
          </p>
        </div>
        <Link
          href="/admin/relatorios"
          className="admin-btn admin-btn-primary"
          style={{ textDecoration: "none", height: "52px", background: "var(--nb-blue)", color: "#FFF" }}
        >
          <FileText size={20} />
          Relatório Financeiro
        </Link>
      </div>

      {/* ── STAT CARDS ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "24px", marginBottom: "48px" }}>
        {/* MRR */}
        <div className="admin-card" style={{ display: "flex", flexDirection: "column", gap: "12px", borderLeft: `6px solid var(--nb-green)` }}>
          <span style={{ fontSize: "12px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em", color: "#666" }}>
            MRR
          </span>
          <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
            <span style={{ fontSize: "36px", fontWeight: 900, color: "#000", lineHeight: 1 }}>
              R$ 48.5k
            </span>
            <div style={{ color: "var(--nb-green)" }}><TrendingUp size={20} /></div>
          </div>
          <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--nb-green)" }}>+12% vs. mês anterior</span>
        </div>

        {/* Churn Rate */}
        <div className="admin-card" style={{ display: "flex", flexDirection: "column", gap: "12px", borderLeft: `6px solid var(--nb-red)` }}>
          <span style={{ fontSize: "12px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em", color: "#666" }}>
            Churn Rate (Evasão)
          </span>
          <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
            <span style={{ fontSize: "36px", fontWeight: 900, color: "#000", lineHeight: 1 }}>
              4.2%
            </span>
            <div style={{ color: "var(--nb-red)" }}><TrendingDown size={20} /></div>
          </div>
          <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--nb-red)" }}>Acima da meta (3%)</span>
        </div>

        {/* LTV */}
        <div className="admin-card" style={{ display: "flex", flexDirection: "column", gap: "12px", borderLeft: `6px solid var(--nb-blue)` }}>
          <span style={{ fontSize: "12px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em", color: "#666" }}>
            LTV (Lifetime Value)
          </span>
          <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
            <span style={{ fontSize: "36px", fontWeight: 900, color: "#000", lineHeight: 1 }}>
              R$ 2.4k
            </span>
            <div style={{ color: "var(--nb-blue)" }}><DollarSign size={20} /></div>
          </div>
          <span style={{ fontSize: "11px", fontWeight: 700, color: "#666" }}>Média de 8 meses</span>
        </div>

        {/* Caixa */}
        <div className="admin-card" style={{ display: "flex", flexDirection: "column", gap: "12px", borderLeft: `6px solid #000` }}>
          <span style={{ fontSize: "12px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em", color: "#666" }}>
            Fluxo de Caixa
          </span>
          <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
            <span style={{ fontSize: "36px", fontWeight: 900, color: "#000", lineHeight: 1 }}>
              R$ 12.0k
            </span>
            <div style={{ color: "#000" }}><Activity size={20} /></div>
          </div>
          <span style={{ fontSize: "11px", fontWeight: 700, color: "#666" }}>Caixa Livre Hoje</span>
        </div>
      </div>

      {/* ── GRAFICO MOCK ── */}
      <div className="admin-card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "20px 24px", borderBottom: "2px solid #000", background: "#FAFAFA" }}>
          <h2 style={{ fontSize: "14px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>
            Evolução de MRR vs Churn (Últimos 12 Meses)
          </h2>
        </div>
        <div style={{ padding: "80px", textAlign: "center", background: "#FFF", borderBottom: "1px solid #EEE" }}>
          <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: "12px", opacity: 0.3 }}>
            <TrendingUp size={48} />
            <span style={{ fontWeight: 800, textTransform: "uppercase", fontSize: "14px" }}>[Gráfico de Linha Placeholder]</span>
            <span style={{ fontSize: "12px", fontWeight: 600 }}>Integração com Recharts no futuro</span>
          </div>
        </div>
      </div>
    </div>
  );
}

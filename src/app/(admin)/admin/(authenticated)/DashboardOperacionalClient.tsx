"use client";

/**
 * @component DashboardOperacionalClient
 * @description
 * Visão focada na "Frente de Loja" e Recepção (Hub Operacional).
 * Exibe dados em tempo real (O "Agora") como presenças do dia e controle de acesso.
 * 
 * @legacy_proof
 * ATENÇÃO: Atualmente utilizando MOCKS visuais para a integração de Catraca.
 * Quando o back-end da catraca for finalizado, as props devem ser passadas 
 * pelo Server Component Pai (`page.tsx`) em vez de dados chumbados neste arquivo.
 */

import { UserCheck, Clock, Zap, Ticket } from "lucide-react";
import Link from "next/link";
import { getTodayDate } from "@/lib/date-utils";
import { useState, useEffect } from "react";

export default function DashboardOperacionalClient() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="admin-container-fluid">
      {/* ── HEADER ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "40px" }}>
        <div>
          <h1 style={{ fontSize: "32px", fontWeight: 900, letterSpacing: "-0.03em", margin: "0 0 4px" }}>
            Recepção & Operação
          </h1>
          <p style={{ fontSize: "14px", color: "#666", fontWeight: 500, margin: 0 }}>
            Visão de Frente de Loja • {mounted ? new Date(getTodayDate() + "T12:00:00Z").toLocaleDateString("pt-BR", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" }) : "--:--"}
          </p>
        </div>
        <Link
          href="/admin/turmas/check-ins"
          className="admin-btn admin-btn-primary"
          style={{ textDecoration: "none", height: "52px" }}
        >
          <Zap size={20} />
          Check-in Manual
        </Link>
      </div>

      {/* ── STAT CARDS ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "24px", marginBottom: "48px" }}>
        <div className="admin-card" style={{ display: "flex", flexDirection: "column", gap: "12px", borderLeft: `6px solid var(--nb-green)` }}>
          <span style={{ fontSize: "12px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em", color: "#666" }}>
            Presenças Hoje
          </span>
          <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
            <span style={{ fontSize: "48px", fontWeight: 900, color: "#000", lineHeight: 1 }}>
              142
            </span>
            <div style={{ color: "var(--nb-green)" }}><UserCheck size={20} /></div>
          </div>
        </div>

        <div className="admin-card" style={{ display: "flex", flexDirection: "column", gap: "12px", borderLeft: `6px solid var(--nb-blue)` }}>
          <span style={{ fontSize: "12px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em", color: "#666" }}>
            Próxima Aula
          </span>
          <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
            <span style={{ fontSize: "48px", fontWeight: 900, color: "#000", lineHeight: 1 }}>
              18:00
            </span>
            <div style={{ color: "var(--nb-blue)" }}><Clock size={20} /></div>
          </div>
          <span style={{ fontSize: "11px", fontWeight: 700, color: "#666" }}>15/20 VAGAS PREENCHIDAS</span>
        </div>

        <div className="admin-card" style={{ display: "flex", flexDirection: "column", gap: "12px", borderLeft: `6px solid var(--nb-orange)` }}>
          <span style={{ fontSize: "12px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em", color: "#666" }}>
            Visitantes (Gympass/Drop-in)
          </span>
          <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
            <span style={{ fontSize: "48px", fontWeight: 900, color: "#000", lineHeight: 1 }}>
              8
            </span>
            <div style={{ color: "var(--nb-orange)" }}><Ticket size={20} /></div>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
        {/* Próximos Check-ins */}
        <div className="admin-card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "20px 24px", borderBottom: "2px solid #000", background: "#FAFAFA" }}>
            <h2 style={{ fontSize: "14px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>
              Fila de Entrada (Próxima Hora)
            </h2>
          </div>
          <div style={{ padding: "32px", textAlign: "center", color: "#999", fontSize: "14px" }}>
            [Mock] Integração com catraca / sistema de agendamento virá aqui.
          </div>
        </div>

        {/* Alertas da Recepção */}
        <div className="admin-card" style={{ padding: 0, overflow: "hidden", borderStyle: "dashed" }}>
          <div style={{ padding: "20px 24px", borderBottom: "2px dashed #000", background: "#FFF" }}>
            <h2 style={{ fontSize: "14px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>
              Alertas & Pendências
            </h2>
          </div>
          <div style={{ padding: "32px", textAlign: "center", color: "#999", fontSize: "14px" }}>
            [Mock] Alunos com pagamento pendente tentando acessar o box aparecerão aqui.
          </div>
        </div>
      </div>
    </div>
  );
}

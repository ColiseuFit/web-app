import { BarChart3 } from "lucide-react";

/**
 * 📊 Relatórios Page (Server Component)
 *
 * Página de relatórios estratégicos e analíticos do box.
 * Centraliza visualizações de dados, gráficos e exports para tomada de decisão.
 *
 * @architecture
 * - Server Component puro (sem interatividade inicial).
 * - Preparado para receber Client Components futuros via composição.
 */
export default function RelatoriosPage() {
  return (
    <div className="admin-container-fluid">
      {/* ── PAGE HEADER ── */}
      <div style={{ marginBottom: "40px" }}>
        <h1
          className="font-display"
          style={{
            fontSize: "32px",
            fontWeight: 900,
            letterSpacing: "-0.04em",
            textTransform: "uppercase",
            lineHeight: 1,
            margin: 0,
          }}
        >
          Relatórios
        </h1>
        <p
          style={{
            fontSize: "14px",
            fontWeight: 600,
            color: "#666",
            marginTop: "8px",
          }}
        >
          Análises e indicadores estratégicos do box.
        </p>
      </div>

      {/* ── PLACEHOLDER CARD ── */}
      <div
        className="admin-card"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "80px 40px",
          textAlign: "center",
          borderStyle: "dashed",
        }}
      >
        <BarChart3 size={48} strokeWidth={1.5} style={{ color: "#999", marginBottom: "24px" }} />
        <h2
          style={{
            fontSize: "18px",
            fontWeight: 900,
            textTransform: "uppercase",
            letterSpacing: "-0.02em",
            margin: "0 0 12px 0",
          }}
        >
          Em Construção
        </h2>
        <p style={{ fontSize: "13px", color: "#666", fontWeight: 600, maxWidth: "400px", lineHeight: 1.6 }}>
          Este módulo está sendo preparado. Em breve você terá acesso a relatórios
          detalhados, gráficos e exportações para análise estratégica do box.
        </p>
      </div>
    </div>
  );
}

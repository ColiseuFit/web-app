import { Box } from "lucide-react";

/**
 * 📦 Estoque Page (Server Component)
 *
 * Página para controle e inventário de produtos físicos.
 */
export default function EstoquePage() {
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
          Estoque
        </h1>
        <p
          style={{
            fontSize: "14px",
            fontWeight: 600,
            color: "#666",
            marginTop: "8px",
          }}
        >
          Controle de inventário, alertas de reposição e movimentações de produtos.
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
        <Box size={48} strokeWidth={1.5} style={{ color: "#999", marginBottom: "24px" }} />
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
          Este módulo está sendo preparado. Em breve você poderá monitorar os níveis de estoque
          e registrar a entrada/saída de produtos do box.
        </p>
      </div>
    </div>
  );
}

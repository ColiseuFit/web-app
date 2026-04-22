import React from "react";

/**
 * 🏆 Admin Gamificação Skeleton
 * Padrão Neo-Brutalista para a gestão da loja de pontos.
 */
export default function AdminGamificacaoLoading() {
  return (
    <div className="admin-page-fill" style={{ padding: "40px", minHeight: "100vh", background: "#FFF" }}>
      {/* HEADER SKELETON */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "40px" }}>
        <div>
          <div className="skeleton" style={{ width: "240px", height: "40px", background: "#000", marginBottom: "8px" }}></div>
          <div className="skeleton" style={{ width: "320px", height: "16px", background: "#EEE" }}></div>
        </div>
        <div className="skeleton" style={{ width: "160px", height: "48px", background: "#FFF", border: "3px solid #000", boxShadow: "4px 4px 0px #000" }}></div>
      </div>

      {/* TABS SKELETON */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "32px", borderBottom: "3px solid #000", paddingBottom: "12px" }}>
        <div className="skeleton" style={{ width: "120px", height: "36px", background: "#EEE" }}></div>
        <div className="skeleton" style={{ width: "120px", height: "36px", background: "#EEE" }}></div>
      </div>

      {/* STORE GRID SKELETON */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "24px" }}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} style={{
            background: "#FFF",
            border: "3px solid #000",
            padding: "20px",
            boxShadow: "4px 4px 0px #000"
          }}>
            <div className="skeleton" style={{ width: "100%", height: "180px", background: "#F5F5F5", marginBottom: "16px", border: "2px solid #EEE" }}></div>
            <div className="skeleton" style={{ width: "80%", height: "20px", background: "#F5F5F5", marginBottom: "8px" }}></div>
            <div className="skeleton" style={{ width: "40%", height: "12px", background: "#FAFAFA", marginBottom: "20px" }}></div>
            <div className="skeleton" style={{ width: "100%", height: "40px", background: "#000" }}></div>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes shimmer {
          0% { opacity: 0.5; }
          50% { opacity: 1; }
          100% { opacity: 0.5; }
        }
        .skeleton {
          animation: shimmer 1.5s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
}

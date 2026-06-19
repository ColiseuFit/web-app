import React from "react";

/**
 * 📋 Admin Gestão Skeleton
 * Skeleton screen Neo-Brutalista para a página de Gestão.
 */
export default function AdminGestaoLoading() {
  return (
    <div className="admin-page-fill" style={{ padding: "40px", minHeight: "100vh", background: "#FFF" }}>
      {/* HEADER SKELETON */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "40px" }}>
        <div>
          <div className="skeleton" style={{ width: "200px", height: "40px", background: "#000", marginBottom: "8px" }} />
          <div className="skeleton" style={{ width: "320px", height: "16px", background: "#EEE" }} />
        </div>
      </div>

      {/* CONTENT SKELETON */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "24px" }}>
        {[1, 2, 3].map((i) => (
          <div key={i} style={{
            height: "180px",
            background: "#FFF",
            border: "3px solid #000",
            padding: "24px",
            boxShadow: "4px 4px 0px #000",
          }}>
            <div className="skeleton" style={{ width: "120px", height: "16px", background: "#F5F5F5", marginBottom: "20px" }} />
            <div className="skeleton" style={{ width: "60px", height: "36px", background: "#EEE", marginBottom: "16px" }} />
            <div className="skeleton" style={{ width: "100%", height: "12px", background: "#FAFAFA" }} />
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

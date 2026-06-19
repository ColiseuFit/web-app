import React from "react";

/**
 * 🛒 Admin Loja Skeleton
 * Skeleton screen Neo-Brutalista para a página da Loja/PDV.
 */
export default function AdminLojaLoading() {
  return (
    <div className="admin-page-fill" style={{ padding: "40px", minHeight: "100vh", background: "#FFF" }}>
      {/* HEADER SKELETON */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "40px" }}>
        <div>
          <div className="skeleton" style={{ width: "160px", height: "40px", background: "#000", marginBottom: "8px" }} />
          <div className="skeleton" style={{ width: "240px", height: "16px", background: "#EEE" }} />
        </div>
      </div>

      {/* PRODUCTS PLACEHOLDER */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "24px" }}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} style={{
            height: "220px",
            background: "#FFF",
            border: "3px solid #000",
            padding: "16px",
            boxShadow: "4px 4px 0px #000",
            display: "flex",
            flexDirection: "column",
          }}>
            <div className="skeleton" style={{ width: "100%", height: "100px", background: "#F5F5F5", marginBottom: "auto" }} />
            <div className="skeleton" style={{ width: "80%", height: "16px", background: "#EEE", marginBottom: "8px" }} />
            <div className="skeleton" style={{ width: "40%", height: "20px", background: "#E0E0E0" }} />
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

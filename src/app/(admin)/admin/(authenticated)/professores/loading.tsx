import React from "react";

/**
 * 🎓 Admin Professores Skeleton
 * Padrão Neo-Brutalista para a gestão da equipe técnica.
 */
export default function AdminProfessoresLoading() {
  return (
    <div className="admin-page-fill" style={{ padding: "40px", minHeight: "100vh", background: "#FFF" }}>
      {/* HEADER SKELETON */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "40px" }}>
        <div>
          <div className="skeleton" style={{ width: "200px", height: "40px", background: "#000", marginBottom: "8px" }}></div>
          <div className="skeleton" style={{ width: "300px", height: "16px", background: "#EEE" }}></div>
        </div>
        <div className="skeleton" style={{ width: "180px", height: "48px", background: "#FFF", border: "3px solid #000", boxShadow: "4px 4px 0px #000" }}></div>
      </div>

      {/* COACH CARDS GRID SKELETON */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "24px" }}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} style={{
            background: "#FFF",
            border: "3px solid #000",
            padding: "24px",
            boxShadow: "4px 4px 0px #000",
            display: "flex",
            alignItems: "center",
            gap: "20px"
          }}>
            <div className="skeleton" style={{ width: "80px", height: "80px", background: "#EEE", border: "2px solid #000" }}></div>
            <div style={{ flex: 1 }}>
              <div className="skeleton" style={{ width: "70%", height: "20px", background: "#F5F5F5", marginBottom: "10px" }}></div>
              <div className="skeleton" style={{ width: "40%", height: "12px", background: "#FAFAFA", marginBottom: "16px" }}></div>
              <div style={{ display: "flex", gap: "8px" }}>
                <div className="skeleton" style={{ width: "24px", height: "24px", background: "#EEE" }}></div>
                <div className="skeleton" style={{ width: "24px", height: "24px", background: "#EEE" }}></div>
              </div>
            </div>
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

import React from "react";

/**
 * 👥 Admin Alunos (CRM) Skeleton
 * Padrão Neo-Brutalista para a lista de atletas e pré-cadastros.
 */
export default function AdminAlunosLoading() {
  return (
    <div className="admin-page-fill" style={{ padding: "40px", minHeight: "100vh", background: "#FFF" }}>
      {/* HEADER SKELETON */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "40px" }}>
        <div>
          <div className="skeleton" style={{ width: "220px", height: "40px", background: "#000", marginBottom: "8px" }}></div>
          <div className="skeleton" style={{ width: "350px", height: "16px", background: "#EEE" }}></div>
        </div>
      </div>

      {/* STATS/PRE-REG CARDS SKELETON */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "24px", marginBottom: "40px" }}>
        {[1, 2].map((i) => (
          <div key={i} style={{
            height: "140px",
            background: "#FFF",
            border: "3px solid #000",
            padding: "24px",
            boxShadow: "4px 4px 0px #000",
          }}>
            <div className="skeleton" style={{ width: "150px", height: "20px", background: "#F5F5F5", marginBottom: "16px" }}></div>
            <div style={{ display: "flex", gap: "12px" }}>
               <div className="skeleton" style={{ width: "40px", height: "40px", borderRadius: "50%", background: "#EEE" }}></div>
               <div className="skeleton" style={{ flex: 1, height: "40px", background: "#FAFAFA" }}></div>
            </div>
          </div>
        ))}
      </div>

      {/* SEARCH/FILTERS SKELETON */}
      <div style={{ display: "flex", gap: "16px", marginBottom: "24px" }}>
        <div className="skeleton" style={{ flex: 3, height: "48px", background: "#FFF", border: "3px solid #000" }}></div>
        <div className="skeleton" style={{ flex: 1, height: "48px", background: "#FFF", border: "3px solid #000" }}></div>
      </div>

      {/* TABLE SKELETON */}
      <div style={{ background: "#FFF", border: "3px solid #000", boxShadow: "4px 4px 0px #000" }}>
        <div style={{ height: "50px", background: "#F8F8F8", borderBottom: "2px solid #000" }}></div>
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} style={{ height: "70px", borderBottom: "1px solid #EEE", padding: "12px 24px", display: "flex", alignItems: "center", gap: "20px" }}>
            <div className="skeleton" style={{ width: "44px", height: "44px", borderRadius: "50%", background: "#EEE" }}></div>
            <div style={{ flex: 2 }}>
              <div className="skeleton" style={{ width: "180px", height: "16px", background: "#F5F5F5", marginBottom: "6px" }}></div>
              <div className="skeleton" style={{ width: "120px", height: "10px", background: "#FAFAFA" }}></div>
            </div>
            <div style={{ flex: 1, width: "80px", height: "24px", border: "2px solid #EEE" }} className="skeleton"></div>
            <div style={{ width: "150px", height: "14px", background: "#FAFAFA" }} className="skeleton"></div>
            <div style={{ marginLeft: "auto", width: "32px", height: "32px", background: "#EEE" }} className="skeleton"></div>
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

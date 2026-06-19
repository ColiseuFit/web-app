import React from "react";

/**
 * 🏃 Admin Running Hub Skeleton
 * Padrão Neo-Brutalista para a lista de atletas de corrida.
 */
export default function AdminRunningLoading() {
  return (
    <div className="admin-page-fill" style={{ padding: "40px", minHeight: "100vh", background: "#FFF" }}>
      {/* HEADER SKELETON */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "40px" }}>
        <div>
          <div className="skeleton" style={{ width: "280px", height: "40px", background: "#000", marginBottom: "8px" }}></div>
          <div className="skeleton" style={{ width: "400px", height: "16px", background: "#EEE" }}></div>
        </div>
      </div>

      {/* STATS CARDS SKELETON (Corredores Ativos, Sem Plano, etc) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "24px", marginBottom: "40px" }}>
        {[1, 2, 3].map((i) => (
          <div key={i} style={{
            height: "140px",
            background: "#FFF",
            border: "3px solid #000",
            padding: "24px",
            boxShadow: "4px 4px 0px #000",
          }}>
            <div className="skeleton" style={{ width: "120px", height: "16px", background: "#F5F5F5", marginBottom: "16px" }}></div>
            <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
               <div className="skeleton" style={{ width: "60px", height: "48px", background: "#000" }}></div>
               <div className="skeleton" style={{ width: "40px", height: "14px", background: "#EEE" }}></div>
            </div>
          </div>
        ))}
      </div>

      {/* SEARCH SKELETON */}
      <div style={{ display: "flex", gap: "16px", marginBottom: "24px" }}>
         <div className="skeleton" style={{ flex: 1, height: "48px", background: "#FFF", border: "3px solid #000" }}></div>
      </div>

      {/* RUNNERS LIST SKELETON */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "24px" }}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} style={{ 
            height: "200px", 
            background: "#FFF", 
            border: "3px solid #000", 
            padding: "24px",
            boxShadow: "4px 4px 0px #000",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between"
          }}>
            <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
              <div className="skeleton" style={{ width: "56px", height: "56px", borderRadius: "50%", background: "#EEE" }}></div>
              <div style={{ flex: 1 }}>
                <div className="skeleton" style={{ width: "140px", height: "18px", background: "#F5F5F5", marginBottom: "8px" }}></div>
                <div className="skeleton" style={{ width: "80px", height: "24px", border: "2px solid #EEE" }}></div>
              </div>
            </div>
            
            <div style={{ borderTop: "1px solid #EEE", paddingTop: "16px", marginTop: "16px" }}>
               <div className="skeleton" style={{ width: "100%", height: "12px", background: "#FAFAFA", marginBottom: "8px" }}></div>
               <div className="skeleton" style={{ width: "60%", height: "12px", background: "#FAFAFA" }}></div>
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

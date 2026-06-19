import React from "react";

/**
 * 📅 Admin Agenda Skeleton
 * Skeleton screen Neo-Brutalista para a página de Agenda.
 */
export default function AdminAgendaLoading() {
  return (
    <div className="admin-page-fill" style={{ padding: "40px", minHeight: "100vh", background: "#FFF" }}>
      {/* HEADER SKELETON */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "40px" }}>
        <div>
          <div className="skeleton" style={{ width: "180px", height: "40px", background: "#000", marginBottom: "8px" }} />
          <div className="skeleton" style={{ width: "280px", height: "16px", background: "#EEE" }} />
        </div>
      </div>

      {/* CALENDAR PLACEHOLDER */}
      <div style={{
        background: "#FFF",
        border: "3px solid #000",
        padding: "24px",
        boxShadow: "4px 4px 0px #000",
      }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "8px" }}>
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={`h-${i}`} className="skeleton" style={{ height: "20px", background: "#F5F5F5" }} />
          ))}
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: "64px", background: "#FAFAFA" }} />
          ))}
        </div>
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

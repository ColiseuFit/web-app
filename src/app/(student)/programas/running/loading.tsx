import React from "react";
import StudentHeader from "@/components/StudentHeader";
import DashboardStyles from "@/components/DashboardStyles";

/**
 * 🏃 Running Loading Skeleton
 * Estilo Neo-Brutalista com animação de "shimmer".
 */
export default function RunningLoading() {
  return (
    <div style={{ minHeight: "100vh", background: "#F2F2F0" }}>
      <DashboardStyles />
      <StudentHeader />

      <main style={{ paddingBottom: "100px" }}>
        {/* HERO BANNER SKELETON */}
        <div style={{
          background: "#000",
          color: "#FFF",
          padding: "28px 20px 24px",
          borderBottom: "4px solid #000",
          position: "relative",
          overflow: "hidden",
        }}>
          <div className="skeleton" style={{ width: "150px", height: "32px", background: "#333", marginBottom: "8px" }}></div>
          <div className="skeleton" style={{ width: "200px", height: "20px", background: "#333", marginBottom: "20px" }}></div>
          
          <div style={{ display: "flex", gap: "12px" }}>
            <div className="skeleton" style={{ width: "100px", height: "36px", background: "#333", border: "1px solid #555" }}></div>
            <div className="skeleton" style={{ width: "100px", height: "36px", background: "#333", border: "1px solid #555" }}></div>
          </div>
        </div>

        {/* METRICS GRID SKELETON */}
        <div style={{ padding: "16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "-12px" }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} style={{
              background: "#FFF",
              border: "3px solid #000",
              padding: "16px",
              boxShadow: "4px 4px 0px #000",
            }}>
              <div className="skeleton" style={{ width: "30px", height: "30px", background: "#EEE", marginBottom: "8px" }}></div>
              <div className="skeleton" style={{ width: "60px", height: "24px", background: "#F5F5F5", marginBottom: "4px" }}></div>
              <div className="skeleton" style={{ width: "40px", height: "14px", background: "#FAFAFA" }}></div>
            </div>
          ))}
        </div>

        {/* WORKOUT LIST SKELETON */}
        <div style={{ padding: "16px" }}>
          <div className="skeleton" style={{ width: "120px", height: "24px", background: "#DDD", marginBottom: "16px" }}></div>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{
              background: "#FFF",
              border: "3px solid #000",
              padding: "20px",
              marginBottom: "12px",
              boxShadow: "4px 4px 0px #000",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div className="skeleton" style={{ width: "80px", height: "14px", background: "#EEE", marginBottom: "8px" }}></div>
                  <div className="skeleton" style={{ width: "140px", height: "20px", background: "#F5F5F5" }}></div>
                </div>
                <div className="skeleton" style={{ width: "40px", height: "40px", borderRadius: "50%", background: "#EEE" }}></div>
              </div>
            </div>
          ))}
        </div>
      </main>

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

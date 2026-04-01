"use client";

/**
 * Simula Ranking de Pontos e Feed de Atividades.
 */
export default function ClubeSkeleton() {
  return (
    <div style={{ backgroundColor: "var(--bg)", minHeight: "100vh", paddingBottom: "100px" }}>
      <div style={{ maxWidth: "480px", margin: "0 auto", padding: "0 16px" }}>
        
        {/* Title Skeleton */}
        <div style={{ paddingTop: "28px", paddingBottom: "24px" }}>
          <div style={{ height: "10px", width: "80px", background: "var(--surface-low)", marginBottom: "8px", animation: "pulse 1.5s infinite ease-in-out" }} />
          <div style={{ height: "32px", width: "160px", background: "var(--surface-low)", animation: "pulse 1.5s infinite ease-in-out" }} />
        </div>

        {/* Points Leaderboard Skeleton */}
        <div style={{ 
          height: "380px", 
          background: "var(--surface-lowest)", 
          border: "1px solid var(--border-glow)", 
          borderRadius: "4px",
          marginBottom: "32px",
          animation: "pulse 1.5s infinite ease-in-out" 
        }} />

        {/* Section Title */}
        <div style={{ height: "14px", width: "180px", background: "var(--surface-low)", marginBottom: "16px", animation: "pulse 1.5s infinite ease-in-out" }} />

        {/* Activity Feed Skeleton */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ 
              height: "80px", 
              background: "var(--surface-lowest)", 
              border: "1px solid var(--border-glow)", 
              borderRadius: "4px",
              animation: "pulse 1.5s infinite ease-in-out" 
            }} />
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes pulse {
          0% { opacity: 0.6; }
          50% { opacity: 0.3; }
          100% { opacity: 0.6; }
        }
      `}</style>
    </div>
  );
}

"use client";

/**
 * Skeleton Loader para a Página de Histórico de Treinos.
 * Simula a lista de WODs enquanto os dados reais são carregados.
 */
export default function TreinosSkeleton() {
  return (
    <div style={{ backgroundColor: "var(--bg)", minHeight: "100vh", paddingBottom: "100px" }}>
      <div style={{ maxWidth: "480px", margin: "0 auto", padding: "0 16px" }}>
        
        {/* Title Skeleton */}
        <div style={{ paddingTop: "28px", paddingBottom: "24px" }}>
          <div style={{ height: "10px", width: "100px", background: "var(--surface-low)", marginBottom: "6px", animation: "pulse 1.5s infinite ease-in-out" }} />
          <div style={{ height: "32px", width: "250px", background: "var(--surface-low)", marginBottom: "8px", animation: "pulse 1.5s infinite ease-in-out" }} />
          <div style={{ height: "11px", width: "150px", background: "var(--surface-low)", animation: "pulse 1.5s infinite ease-in-out" }} />
        </div>

        {/* WOD List Skeleton */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} style={{ 
              background: "var(--surface-lowest)", 
              height: "140px",
              border: "1px solid var(--border-glow)",
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

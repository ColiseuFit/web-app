/**
 * ProgressoSkeleton:
 * Recreates the student progress view with "Neo-Brutalist Light" tokens (Iron Monolith).
 * 
 * @architecture
 * - Server Component Skeleton: Pure Server Component to avoid module factory 
 *   initialization errors in Turbopack/Next.js HMR. 
 * - Ensures instant hydration and zero-CLS (Cumulative Layout Shift) in production.
 */
export default function ProgressoSkeleton() {
  return (
    <div style={{ backgroundColor: "#FFF", minHeight: "100vh", paddingBottom: "100px" }}>
      <style>
        {`
          @keyframes skeletonPulse {
            0% { opacity: 1; background-color: #F0F0F0; }
            50% { opacity: 1; background-color: #E0E0E0; }
            100% { opacity: 1; background-color: #F0F0F0; }
          }
        `}
      </style>
      <div style={{ maxWidth: "480px", margin: "0 auto", padding: "0 20px" }}>

        {/* Title Skeleton */}
        <div style={{ paddingTop: "24px", paddingBottom: "32px" }}>
          <div style={{
            height: "14px", width: "80px",
            background: "#F0F0F0", border: "2px solid #000", marginBottom: "8px",
            animation: "skeletonPulse 1.5s infinite ease-in-out"
          }} />
          <div style={{
            height: "40px", width: "200px",
            background: "#F0F0F0", border: "2px solid #000", marginBottom: "8px",
            animation: "skeletonPulse 1.5s infinite ease-in-out"
          }} />
          <div style={{
            height: "12px", width: "220px",
            background: "#F0F0F0", border: "2px solid #000",
            animation: "skeletonPulse 1.5s infinite ease-in-out"
          }} />
        </div>

        {/* 1. COMPROMISSO SEMANAL (Gauge Skeleton) */}
        <div style={{
          background: "#FFF",
          border: "2px solid #000",
          boxShadow: "4px 4px 0px #F0F0F0",
          position: "relative", overflow: "hidden",
          marginBottom: "24px"
        }}>
          <div style={{
            position: "absolute", left: 0, top: 0, bottom: 0,
            width: "6px", background: "#E31B23"
          }} />

          <div style={{
            padding: "16px 20px 16px 26px",
            borderBottom: "2px solid #000",
            background: "#F9F9F9"
          }}>
            <div style={{
              height: "12px", width: "160px",
              background: "#F0F0F0", border: "2px solid #000",
              animation: "skeletonPulse 1.5s infinite ease-in-out"
            }} />
          </div>

          {/* Circular Gauge Placeholder */}
          <div style={{
            display: "flex", flexDirection: "column",
            alignItems: "center", padding: "40px 0"
          }}>
            <div style={{
              width: "150px", height: "150px", borderRadius: "50%",
              border: "12px solid #F0F0F0",
              boxShadow: "0 0 0 2px #000 inset, 0 0 0 2px #000",
              animation: "skeletonPulse 1.5s infinite ease-in-out"
            }} />
            <div style={{
              height: "14px", width: "140px",
              background: "#F0F0F0", border: "2px solid #000", marginTop: "32px",
              animation: "skeletonPulse 1.5s infinite ease-in-out"
            }} />
          </div>

          {/* Target Buttons Skeleton (7 dias) */}
          <div style={{
            display: "flex", justifyContent: "center",
            gap: "8px", padding: "0 24px 32px"
          }}>
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} style={{
                width: "40px", height: "40px",
                background: "#F0F0F0",
                border: "2px solid #000",
                boxShadow: "2px 2px 0px #000",
                animation: "skeletonPulse 1.5s infinite ease-in-out",
                animationDelay: `${i * 0.06}s`
              }} />
            ))}
          </div>
        </div>

        {/* 2. RECORDES PESSOAIS (PR Matrix Skeleton) */}
        <div style={{
          background: "#FFF",
          border: "2px solid #000",
          boxShadow: "4px 4px 0px #F0F0F0",
          marginBottom: "24px"
        }}>
          <div style={{
            padding: "16px 20px",
            borderBottom: "2px solid #000",
            background: "#F9F9F9"
          }}>
            <div style={{
              height: "12px", width: "200px",
              background: "#F0F0F0", border: "2px solid #000",
              animation: "skeletonPulse 1.5s infinite ease-in-out"
            }} />
          </div>

          <div style={{ padding: "20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} style={{
                height: "80px", width: "100%",
                background: "#F0F0F0",
                border: "2px solid #000",
                boxShadow: "2px 2px 0px #000",
                animation: "skeletonPulse 1.5s infinite ease-in-out",
                animationDelay: `${i * 0.15}s`
              }} />
            ))}
          </div>
        </div>

        {/* 3. METAS E OBJETIVOS (Goals Skeleton) */}
        <div style={{
          background: "#FFF",
          border: "2px solid #000",
          boxShadow: "4px 4px 0px #F0F0F0",
            marginBottom: "24px"
        }}>
          <div style={{
            padding: "16px 20px",
            borderBottom: "2px solid #000",
            background: "#F9F9F9"
          }}>
            <div style={{
              height: "12px", width: "150px",
              background: "#F0F0F0", border: "2px solid #000",
              animation: "skeletonPulse 1.5s infinite ease-in-out"
            }} />
          </div>

          <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
            {[1, 2].map((i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: "16px"
              }}>
                <div style={{
                  width: "24px", height: "24px", flexShrink: 0,
                  background: "#F0F0F0", border: "2px solid #000",
                  animation: "skeletonPulse 1.5s infinite ease-in-out",
                  animationDelay: `${i * 0.1}s`
                }} />
                <div style={{
                  height: "16px", width: `${70 + i * 10}%`,
                  background: "#F0F0F0", border: "2px solid #000",
                  animation: "skeletonPulse 1.5s infinite ease-in-out",
                  animationDelay: `${i * 0.1}s`
                }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * DashboardSkeleton:
 * Recreates the student dashboard layout with "Neo-Brutalist Light" tokens.
 * 
 * @architecture
 * - Server Component Skeleton: Pure Server Component to avoid module factory 
 *   initialization errors in Turbopack/Next.js HMR. 
 * - Ensures instant hydration and zero-CLS (Cumulative Layout Shift) in production.
 */
export default function DashboardSkeleton() {
  return (
    <div style={{ backgroundColor: "var(--bg)", minHeight: "100vh", paddingBottom: "100px" }}>
      <style>
        {`
          @keyframes skeletonPulse {
            0% { opacity: 0.6; }
            50% { opacity: 0.25; }
            100% { opacity: 0.6; }
          }
        `}
      </style>
      <div style={{ maxWidth: "480px", margin: "0 auto", padding: "0 16px" }}>

        {/* Header Skeleton (Avatar + Nome + Level) */}
        <div style={{ paddingTop: "32px", paddingBottom: "24px", display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{
            width: "64px", height: "64px", borderRadius: "50%",
            background: "var(--surface-low)",
            animation: "skeletonPulse 1.5s infinite ease-in-out"
          }} />
          <div>
            <div style={{
              height: "28px", width: "180px",
              background: "var(--surface-low)", marginBottom: "8px",
              animation: "skeletonPulse 1.5s infinite ease-in-out"
            }} />
            <div style={{
              height: "10px", width: "100px",
              background: "var(--surface-low)",
              animation: "skeletonPulse 1.5s infinite ease-in-out"
            }} />
          </div>
        </div>

        {/* Week Carousel Skeleton (6 dias) */}
        <div style={{ display: "flex", gap: "6px", marginBottom: "16px", padding: "0 4px" }}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} style={{
              flex: 1, height: "72px",
              background: "var(--surface-lowest)",
              border: "1px solid var(--border-glow)",
              animation: "skeletonPulse 1.5s infinite ease-in-out",
              animationDelay: `${i * 0.1}s`
            }} />
          ))}
        </div>

        {/* WOD Card Skeleton */}
        <div style={{
          background: "var(--surface-lowest)",
          border: "1px solid var(--border-glow)",
          position: "relative", overflow: "hidden",
          marginBottom: "16px"
        }}>
          {/* Red accent bar */}
          <div style={{
            position: "absolute", left: 0, top: 0, bottom: 0,
            width: "3px", background: "var(--red)",
            boxShadow: "0 0 20px rgba(227,27,35,0.5)"
          }} />

          {/* Section Header */}
          <div style={{
            padding: "14px 24px",
            borderBottom: "1px solid var(--border-glow)",
            display: "flex", justifyContent: "space-between",
            alignItems: "center"
          }}>
            <div style={{
              height: "10px", width: "60px",
              background: "var(--surface-low)",
              animation: "skeletonPulse 1.5s infinite ease-in-out"
            }} />
          </div>

          {/* WOD Title Skeleton */}
          <div style={{ padding: "32px 24px 0" }}>
            <div style={{
              height: "48px", width: "70%",
              background: "var(--surface-low)", marginBottom: "16px",
              animation: "skeletonPulse 1.5s infinite ease-in-out"
            }} />
            <div style={{ display: "flex", gap: "12px", marginBottom: "32px" }}>
              <div style={{
                height: "38px", width: "80px",
                background: "var(--surface-low)",
                border: "1px solid var(--border-glow)",
                animation: "skeletonPulse 1.5s infinite ease-in-out"
              }} />
              <div style={{
                height: "38px", width: "80px",
                background: "var(--surface-low)",
                border: "1px solid var(--border-glow)",
                animation: "skeletonPulse 1.5s infinite ease-in-out"
              }} />
            </div>
          </div>

          {/* Level Selector Skeleton (5 botões) */}
          <div style={{ padding: "0 24px 24px" }}>
            <div style={{
              display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "4px"
            }}>
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} style={{
                  height: "40px",
                  background: "var(--surface-low)",
                  animation: "skeletonPulse 1.5s infinite ease-in-out",
                  animationDelay: `${i * 0.08}s`
                }} />
              ))}
            </div>
          </div>

          {/* WOD Content Lines Skeleton */}
          <div style={{ padding: "0 24px 32px" }}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} style={{
                height: "14px",
                width: `${90 - i * 10}%`,
                background: "var(--surface-low)",
                marginBottom: "10px",
                animation: "skeletonPulse 1.5s infinite ease-in-out",
                animationDelay: `${i * 0.12}s`
              }} />
            ))}
          </div>

          {/* Check-in Button Skeleton */}
          <div style={{
            borderTop: "1px solid var(--border-glow)",
            padding: "16px 24px"
          }}>
            <div style={{
              height: "52px", width: "100%",
              background: "var(--surface-low)",
              animation: "skeletonPulse 1.5s infinite ease-in-out"
            }} />
          </div>
        </div>
      </div>
    </div>
  );
}

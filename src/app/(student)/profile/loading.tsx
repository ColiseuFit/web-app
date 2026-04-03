/**
 * ProfileSkeleton:
 * Recreates the student profile view with "Neo-Brutalist Light" tokens.
 * 
 * @architecture
 * - Server Component Skeleton: Pure Server Component to avoid module factory 
 *   initialization errors in Turbopack/Next.js HMR. 
 * - Ensures instant hydration and zero-CLS (Cumulative Layout Shift) in production.
 */
export default function ProfileSkeleton() {
  return (
    <div style={{ backgroundColor: "var(--bg)", minHeight: "100vh", paddingBottom: "100px" }}>
      <style>
        {`
          @keyframes pulseCustom {
            0% { opacity: 0.6; }
            50% { opacity: 0.3; }
            100% { opacity: 0.6; }
          }
        `}
      </style>
      <div style={{ maxWidth: "480px", margin: "0 auto", padding: "0 20px" }}>
        
        {/* Hero Skeleton */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: "20px", paddingBottom: "40px" }}>
          <div style={{
            width: "140px",
            height: "140px",
            borderRadius: "50%",
            background: "var(--surface-low)",
            marginBottom: "24px",
            animation: "pulseCustom 1.5s infinite ease-in-out",
          }} />
          <div style={{ height: "38px", width: "200px", background: "var(--surface-low)", marginBottom: "8px", animation: "pulseCustom 1.5s infinite ease-in-out" }} />
          <div style={{ height: "14px", width: "60px", background: "var(--surface-low)", animation: "pulseCustom 1.5s infinite ease-in-out" }} />
        </div>

        {/* Stats Skeleton */}
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "1fr 1fr 1fr", 
          gap: "1px", 
          background: "var(--border-glow)",
          marginBottom: "48px",
        }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ background: "var(--surface-lowest)", padding: "20px 10px", textAlign: "center" }}>
              <div style={{ height: "24px", width: "100%", background: "var(--surface-low)", marginBottom: "4px", animation: "pulseCustom 1.5s infinite ease-in-out" }} />
              <div style={{ height: "8px", width: "100%", background: "var(--surface-low)", animation: "pulseCustom 1.5s infinite ease-in-out" }} />
            </div>
          ))}
        </div>

        {/* Evaluation Skeleton */}
        <div style={{ marginBottom: "48px" }}>
          <div style={{ height: "16px", width: "150px", background: "var(--surface-low)", marginBottom: "24px", animation: "pulseCustom 1.5s infinite ease-in-out" }} />
          <div style={{ 
            background: "var(--surface-lowest)", 
            height: "100px",
            border: "1px solid var(--border-glow)",
            animation: "pulseCustom 1.5s infinite ease-in-out"
          }} />
        </div>
      </div>
    </div>
  );
}


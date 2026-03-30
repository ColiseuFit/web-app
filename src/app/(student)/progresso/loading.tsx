"use client";

/**
 * Skeleton Loader para a Página de Progresso do Aluno.
 * Simula os 3 módulos: Gauge de Compromisso, Matriz de PRs, e Metas.
 *
 * @technical
 * - O gauge circular é renderizado como placeholder circular de mesmas dimensões.
 * - A animação escalonada (staggered) cria sensação de "carregamento vivo".
 * - Espelha a estrutura real para zero layout shift (CLS).
 */
export default function ProgressoSkeleton() {
  return (
    <div style={{ backgroundColor: "var(--bg)", minHeight: "100vh", paddingBottom: "100px" }}>
      <div style={{ maxWidth: "480px", margin: "0 auto", padding: "0 16px" }}>

        {/* Title Skeleton */}
        <div style={{ paddingTop: "24px", paddingBottom: "32px" }}>
          <div style={{
            height: "10px", width: "80px",
            background: "var(--surface-low)", marginBottom: "6px",
            animation: "skeletonPulse 1.5s infinite ease-in-out"
          }} />
          <div style={{
            height: "32px", width: "200px",
            background: "var(--surface-low)", marginBottom: "6px",
            animation: "skeletonPulse 1.5s infinite ease-in-out"
          }} />
          <div style={{
            height: "12px", width: "220px",
            background: "var(--surface-low)",
            animation: "skeletonPulse 1.5s infinite ease-in-out"
          }} />
        </div>

        {/* 1. COMPROMISSO SEMANAL (Gauge Skeleton) */}
        <div style={{
          background: "var(--surface-lowest)",
          border: "1px solid var(--border-glow)",
          position: "relative", overflow: "hidden",
          borderRadius: "4px", marginBottom: "24px"
        }}>
          <div style={{
            position: "absolute", left: 0, top: 0, bottom: 0,
            width: "4px", background: "var(--red)"
          }} />

          <div style={{
            padding: "14px 20px",
            borderBottom: "1px solid var(--border-glow)",
            background: "rgba(255,255,255,0.02)"
          }}>
            <div style={{
              height: "9px", width: "160px",
              background: "var(--surface-low)",
              animation: "skeletonPulse 1.5s infinite ease-in-out"
            }} />
          </div>

          {/* Circular Gauge Placeholder */}
          <div style={{
            display: "flex", flexDirection: "column",
            alignItems: "center", padding: "32px 0"
          }}>
            <div style={{
              width: "150px", height: "150px", borderRadius: "50%",
              border: "10px solid var(--surface-low)",
              animation: "skeletonPulse 1.5s infinite ease-in-out"
            }} />
            <div style={{
              height: "10px", width: "140px",
              background: "var(--surface-low)", marginTop: "24px",
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
                width: "36px", height: "36px",
                background: "var(--surface-low)",
                border: "1px solid var(--border-glow)",
                animation: "skeletonPulse 1.5s infinite ease-in-out",
                animationDelay: `${i * 0.06}s`
              }} />
            ))}
          </div>
        </div>

        {/* 2. RECORDES PESSOAIS (PR Matrix Skeleton) */}
        <div style={{
          background: "var(--surface-lowest)",
          border: "1px solid var(--border-glow)",
          borderRadius: "4px", marginBottom: "24px"
        }}>
          <div style={{
            padding: "14px 20px",
            borderBottom: "1px solid var(--border-glow)",
            background: "rgba(255,255,255,0.02)"
          }}>
            <div style={{
              height: "9px", width: "200px",
              background: "var(--surface-low)",
              animation: "skeletonPulse 1.5s infinite ease-in-out"
            }} />
          </div>

          <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "8px" }}>
            {[1, 2, 3].map((i) => (
              <div key={i} style={{
                height: "64px", width: "100%",
                background: "var(--surface-low)",
                border: "1px solid var(--border-glow)",
                animation: "skeletonPulse 1.5s infinite ease-in-out",
                animationDelay: `${i * 0.15}s`
              }} />
            ))}
          </div>
        </div>

        {/* 3. METAS E OBJETIVOS (Goals Skeleton) */}
        <div style={{
          background: "var(--surface-lowest)",
          border: "1px solid var(--border-glow)",
          borderRadius: "4px", marginBottom: "24px"
        }}>
          <div style={{
            padding: "14px 20px",
            borderBottom: "1px solid var(--border-glow)",
            background: "rgba(255,255,255,0.02)"
          }}>
            <div style={{
              height: "9px", width: "150px",
              background: "var(--surface-low)",
              animation: "skeletonPulse 1.5s infinite ease-in-out"
            }} />
          </div>

          <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: "10px" }}>
            {[1, 2].map((i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: "12px"
              }}>
                <div style={{
                  width: "20px", height: "20px", flexShrink: 0,
                  background: "var(--surface-low)",
                  animation: "skeletonPulse 1.5s infinite ease-in-out",
                  animationDelay: `${i * 0.1}s`
                }} />
                <div style={{
                  height: "14px", width: `${70 + i * 10}%`,
                  background: "var(--surface-low)",
                  animation: "skeletonPulse 1.5s infinite ease-in-out",
                  animationDelay: `${i * 0.1}s`
                }} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes skeletonPulse {
          0% { opacity: 0.6; }
          50% { opacity: 0.25; }
          100% { opacity: 0.6; }
        }
      `}</style>
    </div>
  );
}

import { TrendingUp, Activity } from "lucide-react";

/**
 * Coach Results Skeleton Loader.
 *
 * @architecture
 * - Pure Server Component skeleton.
 * - Espelha o layout exato de CoachResultadosClient para eliminar CLS (Cumulative Layout Shift).
 * - Utiliza cantos arredondados, sombras e proporções idênticas ao novo design de KPIs e WodResultCard.
 */
export default function CoachResultadosLoading() {
  const skeletonRows = [1, 2, 3];

  return (
    <div style={{ paddingBottom: "40px", maxWidth: "800px", margin: "0 auto" }}>
      <style>
        {`
          @keyframes pulseCustom {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.45; }
          }
          .skeleton-pulse {
            animation: pulseCustom 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          }
        `}
      </style>

      {/* HEADER Skeleton */}
      <div className="skeleton-pulse" style={{ marginBottom: "28px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: "6px",
          }}
        >
          <div
            style={{
              width: "42px",
              height: "42px",
              background: "#E5E7EB",
              borderRadius: "6px",
            }}
          />
          <div style={{ height: "26px", width: "220px", background: "#E5E7EB", borderRadius: "4px" }} />
        </div>
        <div
          style={{
            height: "13px",
            width: "380px",
            background: "#F3F4F6",
            borderLeft: "3.5px solid #E5E7EB",
            paddingLeft: "12px",
            marginTop: "8px",
          }}
        />
      </div>

      {/* KPI Skeleton */}
      <div
        className="skeleton-pulse"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: "14px",
          marginBottom: "28px",
        }}
      >
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{
              background: "#FFF",
              border: "2px solid #E5E7EB",
              boxShadow: "4px 4px 0px #E5E7EB",
              borderRadius: "6px",
              padding: "16px",
              height: "76px",
            }}
          />
        ))}
      </div>

      {/* Date Range Selector Skeleton */}
      <div
        className="skeleton-pulse"
        style={{
          background: "#FFF",
          border: "2px solid #E5E7EB",
          borderRadius: "6px",
          boxShadow: "2px 2px 0px #E5E7EB",
          padding: "16px",
          marginBottom: "14px",
          height: "82px",
        }}
      />

      {/* Search Input Skeleton */}
      <div
        className="skeleton-pulse"
        style={{
          height: "48px",
          border: "2px solid #E5E7EB",
          borderRadius: "6px",
          background: "#FFF",
          boxShadow: "2px 2px 0px #E5E7EB",
          marginBottom: "14px",
        }}
      />

      {/* Filter Pills Skeleton */}
      <div
        className="skeleton-pulse"
        style={{
          display: "flex",
          gap: "8px",
          marginBottom: "28px",
        }}
      >
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            style={{
              height: "30px",
              width: i === 1 ? "60px" : i === 4 ? "110px" : "80px",
              background: "#E5E7EB",
              borderRadius: "20px",
              border: "2px solid #E5E7EB",
            }}
          />
        ))}
      </div>

      {/* Results WodResultCard Skeleton */}
      <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
        {skeletonRows.map((i) => (
          <div
            key={i}
            className="skeleton-pulse"
            style={{
              background: "#FFF",
              border: "2px solid #E5E7EB",
              boxShadow: "2px 2px 0px #E5E7EB",
              borderRadius: "6px",
              height: "68px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 20px",
            }}
          >
            <div style={{ flex: 1, marginRight: "12px" }}>
              <div
                style={{
                  height: "10px",
                  width: "60px",
                  background: "#E5E7EB",
                  borderRadius: "2px",
                  marginBottom: "8px",
                }}
              />
              <div style={{ height: "18px", width: "180px", background: "#E5E7EB", borderRadius: "3px" }} />
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "16px",
              }}
            >
              <div
                style={{
                  width: "42px",
                  height: "28px",
                  background: "#E5E7EB",
                  borderRadius: "4px",
                }}
              />
              <div
                style={{
                  width: "20px",
                  height: "20px",
                  background: "#E5E7EB",
                  borderRadius: "50%",
                }}
              />
            </div>
          </div>
        ))}

        {/* Decorative bottom icon */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginTop: "32px",
            opacity: 0.15,
          }}
        >
          <Activity size={32} color="#9CA3AF" />
        </div>
      </div>
    </div>
  );
}

import React from "react";
import { GRID_DISPLAY_ORDER, DAY_SHORT } from "@/lib/constants/calendar";

/**
 * Admin Turmas Skeleton Loader:
 * Replicates the weekly grid structure using the "Iron Monolith" aesthetic.
 * Pre-empts white-screen flashes as mandated by development rules.
 * 
 * @architecture
 * - Server Component Skeleton: Pure Server Component to avoid module factory 
 *   initialization errors in Turbopack/Next.js HMR. 
 * - Ensures instant hydration and zero-CLS (Cumulative Layout Shift) in production.
 */
export default function TurmasLoading() {
  const days = GRID_DISPLAY_ORDER;
  const rows = [1, 2, 3, 4, 5, 6, 7, 8];

  return (
    <div className="admin-container-fluid" style={{ paddingBottom: "100px" }}>
      <style>
        {`
          @keyframes pulseCustom {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.4; }
          }
          .skeleton-shimmer {
            animation: pulseCustom 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          }
        `}
      </style>

      {/* Header Skeleton */}
      <div className="skeleton-shimmer" style={{ marginBottom: "32px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <div style={{ height: "40px", width: "280px", background: "#000", marginBottom: "8px" }} />
          <div style={{ height: "18px", width: "350px", background: "#E5E7EB", borderLeft: "4px solid #000" }} />
        </div>
        <div style={{ height: "50px", width: "180px", background: "#000", boxShadow: "4px 4px 0px #DDD" }} />
      </div>

      {/* Grid Container */}
      <div 
        className="skeleton-shimmer"
        style={{
          background: "#FFF",
          border: "4px solid #000",
          boxShadow: "10px 10px 0px #000",
          overflow: "hidden"
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ width: "80px", padding: "16px", borderRight: "2px solid #000", borderBottom: "4px solid #000", background: "#F3F4F6" }}>
                <div style={{ height: "14px", width: "100%", background: "#000", opacity: 0.2 }} />
              </th>
              {days.map((d) => (
                <th key={d} style={{ padding: "16px", borderRight: "2px solid #000", borderBottom: "4px solid #000", background: "#F3F4F6" }}>
                  <div style={{ height: "14px", width: "40px", background: "#000", margin: "0 auto", fontSize: "10px", fontWeight: "900", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {DAY_SHORT[d]}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r}>
                <td style={{ padding: "16px", borderRight: "2px solid #000", borderBottom: "2px solid #EEE", background: "#FAFAFA" }}>
                  <div style={{ height: "16px", width: "100%", background: "#DDD" }} />
                </td>
                {days.map((d, i) => (
                  <td key={i} style={{ padding: "8px", borderRight: "2px solid #EEE", borderBottom: "2px solid #EEE" }}>
                    {/* Only show some "cards" to look natural */}
                    {(r + i) % 3 === 0 && (
                      <div style={{ 
                        height: "40px", 
                        background: "#F9FAFB", 
                        border: "2px solid #DDD",
                        padding: "4px"
                      }}>
                         <div style={{ height: "8px", width: "60%", background: "#EEE", marginBottom: "4px" }} />
                         <div style={{ height: "6px", width: "40%", background: "#F3F4F6" }} />
                      </div>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

"use client";

import { Maximize, Activity } from "lucide-react";

/**
 * Coach Portal Skeleton Loader: 
 * Ensures the "Iron Monolith" aesthetic is visible even during data fetching.
 * Zero-tolerance for blank screens.
 */
export default function CoachLoading() {
  // Simulate 3 slots
  const skeletons = [1, 2, 3];

  return (
    <div style={{ paddingBottom: "100px" }}>
      <style>
        {`
          @keyframes pulseCustom {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
          .skeleton-pulse {
            animation: pulseCustom 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          }
        `}
      </style>

      {/* Title Skeleton */}
      <div className="skeleton-pulse" style={{ marginBottom: "24px" }}>
        <div style={{ 
          height: "32px", 
          width: "200px", 
          background: "#000", 
          marginBottom: "8px" 
        }} />
        <div style={{ 
          height: "14px", 
          width: "280px", 
          background: "#E0E0E0", 
          borderLeft: "3px solid #000" 
        }} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {skeletons.map((i) => (
          <div key={i} className="skeleton-pulse" style={{ 
            background: "#FFF",
            border: "3px solid #000",
            boxShadow: "4px 4px 0px #000",
            height: "82px",
            display: "flex",
            alignItems: "center",
            padding: "16px"
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ height: "24px", width: "80px", background: "#000", marginBottom: "4px" }} />
              <div style={{ height: "14px", width: "120px", background: "#F0F0F0" }} />
            </div>
            
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ 
                width: "32px", 
                height: "32px", 
                borderRadius: "50%", 
                background: "#F0F0F0", 
                border: "2px solid #000", 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center" 
              }}>
                <Maximize size={16} color="#000" style={{ opacity: 0.2 }} />
              </div>
            </div>
          </div>
        ))}
        
        {/* Decorative Activity Icon at bottom */}
        <div style={{ display: "flex", justifyContent: "center", marginTop: "32px", opacity: 0.1 }}>
            <Activity size={32} color="#000" />
        </div>
      </div>
    </div>
  );
}

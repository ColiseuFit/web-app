import { Dumbbell } from "lucide-react";

/**
 * Skeleton Loader para a interface de Programação de WODs (Admin).
 * Evita o 'White Flash' durante a transição da rota ou busca de dados semanais no Supabase.
 */
export default function WodsLoading() {
  return (
    <div className="admin-container-fluid animate-pulse">
      {/* Skeleton Header Data */}
      <div style={{ height: "64px", background: "#F3F4F6", borderRadius: "4px", marginBottom: "32px" }}></div>

      {/* Skeleton Título da Página */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "32px" }}>
        <div>
          <div style={{ height: "32px", width: "240px", background: "#E5E7EB", borderRadius: "2px", marginBottom: "8px" }} />
          <div style={{ height: "16px", width: "300px", background: "#F3F4F6", borderRadius: "2px" }} />
        </div>
        <div style={{ display: "flex", gap: "12px" }}>
          <div style={{ height: "48px", width: "120px", background: "#F3F4F6", borderRadius: "2px" }} />
          <div style={{ height: "48px", width: "160px", background: "#E5E7EB", borderRadius: "2px" }} />
        </div>
      </div>

      {/* Skeleton Calendário Semanal */}
      <div className="admin-card" style={{ display: "flex", padding: 0, overflow: "hidden", marginBottom: "32px", height: "100px" }}>
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            style={{
              flex: 1, padding: "24px 12px", borderRight: i < 6 ? "2px solid #E5E7EB" : "none",
              background: "#FFF", display: "flex", flexDirection: "column",
              alignItems: "center", gap: "8px",
            }}
          >
            <div style={{ width: "30px", height: "12px", background: "#F3F4F6", borderRadius: "2px" }} />
            <div style={{ width: "40px", height: "30px", background: "#E5E7EB", borderRadius: "2px" }} />
          </div>
        ))}
      </div>

      {/* Skeleton Visão Principal (Editor / Viewer) */}
      <div className="admin-card" style={{ padding: "80px 0", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "20px" }}>
        <Dumbbell size={48} style={{ color: "#E5E7EB" }} />
        <div style={{ height: "20px", width: "250px", background: "#F3F4F6", borderRadius: "2px" }} />
      </div>
    </div>
  );
}

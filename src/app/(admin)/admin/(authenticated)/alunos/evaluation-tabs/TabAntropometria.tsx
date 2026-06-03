import { EvaluationTabProps } from "./types";

export default function TabAntropometria({ formData, handleNestedChange, formatOnBlur }: EvaluationTabProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      <div style={{ background: "#F3F4F6", padding: 16, border: "2px solid #EEE" }}>
        <h3 style={{ fontSize: 11, fontWeight: 900, color: "#000", textTransform: "uppercase", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 8, height: 8, background: "#000" }} />
          TRONCO & SUPERIOR (CM)
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px 24px" }}>
          {[
            { key: "neck", label: "PESCOÇO" },
            { key: "shoulder", label: "OMBRO" },
            { key: "chest", label: "TÓRAX" },
            { key: "waist", label: "CINTURA" },
            { key: "abdomen", label: "ABDÔMEN" },
            { key: "hip", label: "QUADRIL" },
            { key: "arm_right", label: "BRAÇO RELAX. DIR." },
            { key: "arm_left", label: "BRAÇO RELAX. ESQ." },
            { key: "arm_flexed_right", label: "BÍCEPS CONTR. DIR." },
            { key: "arm_flexed_left", label: "BÍCEPS CONTR. ESQ." },
            { key: "forearm_right", label: "ANTEBRAÇO DIR." },
            { key: "forearm_left", label: "ANTEBRAÇO ESQ." }
          ].map(field => (
            <div key={field.key} style={{ 
              display: "flex", 
              flexDirection: "column", 
              borderBottom: "1px solid #EEE", 
              padding: field.key.includes("arm_flexed") ? "4px 8px 8px 8px" : "0 0 4px 0",
              background: field.key.includes("arm_flexed") ? "rgba(227,27,35,0.03)" : "transparent",
              border: field.key.includes("arm_flexed") ? "1px solid rgba(227,27,35,0.1)" : "none",
              borderRadius: "4px"
            }}>
              <label style={{ 
                fontSize: 10, 
                fontWeight: 800, 
                color: field.key.includes("arm_flexed") ? "var(--red)" : "#666", 
                marginBottom: 4 
              }}>
                {field.label}
              </label>
              <input 
                type="number" step="0.1" 
                value={(formData.measurements as any)[field.key] as string} 
                onChange={e => handleNestedChange("measurements", field.key, e.target.value)} 
                onBlur={() => formatOnBlur(field.key, (formData.measurements as any)[field.key], "measurements")}
                style={{ 
                  width: "100%", 
                  textAlign: "left", 
                  padding: "6px 8px", 
                  border: "2px solid #EEE", 
                  fontWeight: 800, 
                  outline: "none",
                  color: field.key.includes("arm_flexed") ? "#000" : "inherit"
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#000")}
              />
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: "#F3F4F6", padding: 16, border: "2px solid #EEE" }}>
        <h3 style={{ fontSize: 11, fontWeight: 900, color: "#000", textTransform: "uppercase", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 8, height: 8, background: "#000" }} />
          MEMBROS INFERIORES (CM)
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px 24px" }}>
          {[
            { key: "thigh_right", label: "COXA DIREITA" },
            { key: "thigh_left", label: "COXA ESQUERDA" },
            { key: "calf_right", label: "PANTURRILHA DIR." },
            { key: "calf_left", label: "PANTURRILHA ESQ." }
          ].map(field => (
            <div key={field.key} style={{ display: "flex", flexDirection: "column", borderBottom: "1px solid #EEE", paddingBottom: 4 }}>
              <label style={{ fontSize: 10, fontWeight: 800, color: "#666", marginBottom: 4 }}>{field.label}</label>
              <input 
                type="number" step="0.1" 
                value={(formData.measurements as any)[field.key] as string} 
                onChange={e => handleNestedChange("measurements", field.key, e.target.value)} 
                onBlur={() => formatOnBlur(field.key, (formData.measurements as any)[field.key], "measurements")}
                style={{ width: "100%", textAlign: "left", padding: "6px 8px", border: "2px solid #EEE", fontWeight: 800, outline: "none" }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#000")}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

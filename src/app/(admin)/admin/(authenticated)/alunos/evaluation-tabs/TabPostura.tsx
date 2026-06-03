import { EvaluationTabProps } from "./types";

export default function TabPostura({ formData, handleNestedChange }: Pick<EvaluationTabProps, "formData" | "handleNestedChange">) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
      {[
        { key: "anterior", label: "VISTA ANTERIOR" },
        { key: "posterior", label: "VISTA POSTERIOR" },
        { key: "lateral_right", label: "LATERAL DIREITA" },
        { key: "lateral_left", label: "LATERAL ESQUERDA" }
      ].map(view => (
        <div key={view.key} style={{ background: "#F3F4F6", padding: 16, border: "2px solid #EEE" }}>
          <label style={{ fontSize: 11, fontWeight: 900, textTransform: "uppercase", color: "#000", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 6, height: 6, background: "#000" }} />
            {view.label}
          </label>
          <textarea 
            value={((formData.postural_analysis as any)[view.key] ?? "") as string} 
            onChange={e => handleNestedChange("postural_analysis", view.key, e.target.value)} 
            rows={4} 
            maxLength={500}
            style={{ width: "100%", padding: 12, border: "2px solid #000", fontSize: 13, fontWeight: 500, outline: "none", resize: "none" }} 
            onFocus={(e) => (e.currentTarget.style.borderColor = "#E31B23")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "#000")}
          />
        </div>
      ))}
    </div>
  );
}

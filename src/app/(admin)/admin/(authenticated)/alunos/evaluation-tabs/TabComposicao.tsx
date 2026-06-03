import { TabComposicaoProps } from "./types";

export default function TabComposicao({ formData, handleNestedChange, formatOnBlur, calculatedResults }: TabComposicaoProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      <div style={{ background: "#F3F4F6", padding: 16, border: "2px solid #EEE" }}>
        <h3 style={{ fontSize: 11, fontWeight: 900, color: "#000", textTransform: "uppercase", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 8, height: 8, background: "#000" }} />
          DOBRAS CUTÂNEAS (MM)
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px 24px" }}>
            {[
            { key: "triceps", label: "TRÍCEPS" },
            { key: "subscapular", label: "SUBESCAPULAR" },
            { key: "chest", label: "PEITORAL" },
            { key: "midaxillary", label: "AXILAR MÉDIA" },
            { key: "suprailiac", label: "SUPRA-ILÍACA" },
            { key: "abdominal", label: "ABDOMINAL" },
            { key: "thigh", label: "COXA" }
          ].map(field => (
            <div key={field.key} style={{ display: "flex", flexDirection: "column", borderBottom: "1px solid #EEE", paddingBottom: 4 }}>
              <label style={{ fontSize: 10, fontWeight: 800, color: "#666", marginBottom: 4 }}>{field.label}</label>
              <input 
                type="number" step="0.1" 
                value={((formData.skinfolds as any)[field.key] ?? "") as string} 
                onChange={e => handleNestedChange("skinfolds", field.key, e.target.value)} 
                onBlur={() => formatOnBlur(field.key, (formData.skinfolds as any)[field.key], "skinfolds")}
                style={{ width: "100%", textAlign: "left", padding: "6px 8px", border: "2px solid #EEE", fontWeight: 800, outline: "none" }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#000")}
              />
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: "#F3F4F6", padding: 16, border: "2px solid #EEE" }}>
        <h3 style={{ fontSize: 11, fontWeight: 900, color: "#000", textTransform: "uppercase", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 8, height: 8, background: "#000" }} />
          DIÂMETROS ÓSSEOS (CM)
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px 24px" }}>
          {[
            { key: "humerus", label: "ÚMERO (BRAÇO)" },
            { key: "femur", label: "FÊMUR (PERNA)" },
            { key: "wrist", label: "PULSO" },
            { key: "ankle", label: "TORNOZELO" }
          ].map(field => (
            <div key={field.key} style={{ display: "flex", flexDirection: "column", borderBottom: "1px solid #EEE", paddingBottom: 4 }}>
              <label style={{ fontSize: 10, fontWeight: 800, color: "#666", marginBottom: 4 }}>{field.label}</label>
              <input 
                type="number" step="0.1" 
                value={((formData.bone_diameters as any)[field.key] ?? "") as string} 
                onChange={e => handleNestedChange("bone_diameters", field.key, e.target.value)} 
                onBlur={() => formatOnBlur(field.key, (formData.bone_diameters as any)[field.key], "bone_diameters")}
                style={{ width: "100%", textAlign: "left", padding: "6px 8px", border: "2px solid #EEE", fontWeight: 800, outline: "none" }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#000")}
              />
            </div>
          ))}
        </div>
      </div>

      {/* DASHBOARD DE RESULTADOS PREMIUM */}
      <div style={{ 
        background: "#000", 
        padding: "40px", 
        border: "4px solid #E31B23",
        display: "grid",
        gridTemplateColumns: "repeat(2, 1fr)",
        gap: "32px",
        position: "relative",
        overflow: "hidden"
      }}>
        {/* Background Glow */}
        <div style={{ position: "absolute", right: "-10%", top: "-10%", width: "40%", height: "40%", background: "rgba(227,27,35,0.1)", filter: "blur(40px)", borderRadius: "50%" }} />

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div>
            <span style={{ fontSize: 10, fontWeight: 900, color: "#999", textTransform: "uppercase", letterSpacing: "0.2em", display: "block", marginBottom: 8 }}>
              ESTIMATIVA POLLOCK 7 DOBRAS
            </span>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <div style={{ fontSize: 64, fontFamily: "var(--font-display)", fontWeight: 900, color: "#E31B23", lineHeight: 1 }}>
                {calculatedResults.bodyFat > 0 ? calculatedResults.bodyFat.toFixed(1) : "--.-"}
              </div>
              <span style={{ fontSize: 24, fontWeight: 900, color: "#E31B23" }}>%BF</span>
            </div>
          </div>

          <div style={{ padding: "12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#999", marginBottom: 4 }}>DADOS DO PROTOCOLO:</div>
            <div style={{ fontSize: 13, fontWeight: 900, color: "#FFF" }}>
              {calculatedResults.bodyFat > 0 ? "✓ DADOS COMPLETOS" : "⚠ INSIRA AS DOBRAS PARA CALCULAR"}
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16 }}>
          <div style={{ padding: "16px", borderLeft: "4px solid #FFF", background: "rgba(255,255,255,0.02)" }}>
            <span style={{ fontSize: 9, fontWeight: 900, color: "#999", textTransform: "uppercase", letterSpacing: "0.1em" }}>MASSA MAGRA</span>
            <div style={{ fontSize: 28, fontWeight: 900, color: "#FFF" }}>
              {calculatedResults.leanMass > 0 ? `${calculatedResults.leanMass.toFixed(1)}kg` : "--.-"}
            </div>
          </div>
          <div style={{ padding: "16px", borderLeft: "4px solid #E31B23", background: "rgba(255,10,10,0.02)" }}>
            <span style={{ fontSize: 9, fontWeight: 900, color: "#999", textTransform: "uppercase", letterSpacing: "0.1em" }}>MASSA GORDA</span>
            <div style={{ fontSize: 28, fontWeight: 900, color: "#E31B23" }}>
              {calculatedResults.fatMass > 0 ? `${calculatedResults.fatMass.toFixed(1)}kg` : "--.-"}
            </div>
          </div>
        </div>

        {/* Watermark */}
        <div style={{ position: "absolute", right: 20, bottom: -10, fontSize: 80, fontWeight: 900, opacity: 0.05, color: "#FFF", pointerEvents: "none" }}>
          RESULT
        </div>
      </div>
    </div>
  );
}

import { TabGeralProps } from "./types";

export default function TabGeral({ formData, handleInputChange, formatOnBlur, calculatedResults }: TabGeralProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#666", marginBottom: 8, display: "block" }}>Data da Avaliação</label>
          <input type="date" value={formData.evaluation_date ?? ""} onChange={e => handleInputChange("evaluation_date", e.target.value)} required />
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#666", marginBottom: 8, display: "block" }}>Protocolo Ativo</label>
          <div style={{ padding: "10px 12px", background: "#f0f0f0", border: "2px solid #EEE", fontWeight: 900, color: "#E31B23", fontSize: 14 }}>
            POLLOCK 7 DOBRAS
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 24 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", color: "#666" }}>Peso (kg)</label>
          <input 
            type="number" step="0.1" 
            value={formData.weight ?? ""} 
            onChange={e => handleInputChange("weight", e.target.value)} 
            onBlur={() => formatOnBlur("weight", formData.weight)}
            placeholder="70.0"
            style={{ width: "100%", padding: "10px 12px", border: "2px solid #EEE", fontWeight: 800, fontSize: 16, outline: "none" }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "#000")}
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", color: "#666" }}>Altura (m)</label>
          <input 
            type="number" step="0.01" 
            value={formData.height ?? ""} 
            onChange={e => handleInputChange("height", e.target.value)} 
            onBlur={() => formatOnBlur("height", formData.height)}
            placeholder="1.70"
            style={{ width: "100%", padding: "10px 12px", border: "2px solid #EEE", fontWeight: 800, fontSize: 16, outline: "none" }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "#000")}
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", color: "#666" }}>% Gordura (Opc.)</label>
          <input 
            type="number" step="0.1" 
            value={formData.body_fat_percentage ?? ""} 
            onChange={e => handleInputChange("body_fat_percentage", e.target.value)} 
            onBlur={() => formatOnBlur("body_fat_percentage", formData.body_fat_percentage, undefined, 1)}
            placeholder="0%"
            style={{ width: "100%", padding: "10px 12px", border: "2px solid #EEE", fontWeight: 800, fontSize: 16, outline: "none" }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "#000")}
          />
        </div>
      </div>

      <div>
        <label style={{ fontSize: 11, fontWeight: 900, textTransform: "uppercase", color: "#000", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 6, height: 6, background: "#000" }} />
          Observações Clínicas / Gerais
        </label>
        <textarea 
          value={formData.notes ?? ""} 
          onChange={e => handleInputChange("notes", e.target.value)} 
          rows={4} 
          maxLength={500}
          placeholder="Ex: Aluno em fase de cutting, focado em hipertrofia de membros inferiores..." 
          style={{ width: "100%", padding: 16, border: "2px solid #000", fontSize: 14, fontWeight: 500, outline: "none", resize: "none" }}
          onFocus={(e) => (e.currentTarget.style.borderColor = "#E31B23")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "#000")}
        />
      </div>

      {/* DASHBOARD DE RESULTADOS AUTOMÁTICOS */}
      <div style={{ 
        marginTop: 32, 
        background: "#000", 
        padding: "32px", 
        border: "4px solid #E31B23",
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: 16
      }}>
        <div style={{ borderRight: "1px solid #333" }}>
          <span style={{ fontSize: 9, fontWeight: 900, color: "#999", textTransform: "uppercase" }}>IMC Atual</span>
          <div style={{ fontSize: 24, fontWeight: 900, color: "#FFF" }}>{calculatedResults.bmi.toFixed(1)}</div>
        </div>
        <div style={{ borderRight: "1px solid #333" }}>
          <span style={{ fontSize: 9, fontWeight: 900, color: "#999", textTransform: "uppercase" }}>Gordura Corporal</span>
          <div style={{ fontSize: 24, fontWeight: 900, color: "#E31B23" }}>
            {calculatedResults.bodyFat > 0
              ? `${calculatedResults.bodyFat.toFixed(1)}%`
              : formData.body_fat_percentage
              ? `${parseFloat(String(formData.body_fat_percentage)).toFixed(1)}%`
              : "—"}
          </div>
          <div style={{
            marginTop: 6,
            display: "inline-block",
            fontSize: 8,
            fontWeight: 900,
            letterSpacing: "0.08em",
            padding: "2px 6px",
            background: calculatedResults.bodyFat > 0 ? "#10B981" : formData.body_fat_percentage ? "#EAB308" : "#333",
            color: "#FFF"
          }}>
            {calculatedResults.bodyFat > 0 ? "VIA POLLOCK 7" : formData.body_fat_percentage ? "VALOR MANUAL" : "N/A"}
          </div>
        </div>
        <div style={{ borderRight: "1px solid #333" }}>
          <span style={{ fontSize: 9, fontWeight: 900, color: "#999", textTransform: "uppercase" }}>Massa Magra</span>
          <div style={{ fontSize: 24, fontWeight: 900, color: "#FFF" }}>{calculatedResults.leanMass.toFixed(1)}kg</div>
        </div>
        <div>
          <span style={{ fontSize: 9, fontWeight: 900, color: "#999", textTransform: "uppercase" }}>Massa Gorda</span>
          <div style={{ fontSize: 24, fontWeight: 900, color: "#FFF" }}>{calculatedResults.fatMass.toFixed(1)}kg</div>
        </div>
      </div>
    </div>
  );
}

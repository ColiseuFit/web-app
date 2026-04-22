"use client";

import { useState } from "react";
import { Plus, Trash2, Activity } from "lucide-react";
import { RUNNING_LEVELS } from "@/lib/constants/running";

interface RunningIdentityEditorProps {
  student: {
    id: string;
    running_level?: string;
    running_pace?: string;
  };
  onUpdate: () => void;
  updateStudentAction: (id: string, formData: FormData) => Promise<{ error?: string } | any>;
}

export default function RunningIdentityEditor({ student, onUpdate, updateStudentAction }: RunningIdentityEditorProps) {
  const [loading, setLoading] = useState(false);
  const [level, setLevel] = useState(student.running_level || "iniciante");
  
  const initialPaces = () => {
    try {
      const parsed = JSON.parse(student.running_pace || "[]");
      if (Array.isArray(parsed)) return parsed;
      return [];
    } catch {
      if (student.running_pace) return [{ distance: 1, pace: student.running_pace }];
      return [];
    }
  };
  const [paces, setPaces] = useState<{distance: number | string, pace: string}[]>(initialPaces);

  const handleAddPace = () => setPaces([...paces, { distance: 5, pace: "" }]);
  
  const handlePaceChange = (index: number, field: "distance" | "pace", value: any) => {
    const newPaces = [...paces];
    if (field === "pace") {
       let val = value.replace(/\D/g, "");
       if (val.length > 2) {
         let minutes = val.substring(0, 2);
         let seconds = val.substring(2, 4);
         
         if (parseInt(seconds, 10) > 59) seconds = "59";
         
         val = minutes + ":" + seconds;
       }
       newPaces[index].pace = val;
    } else {
       let strVal = String(value).replace(',', '.').replace(/[^0-9.]/g, '');
       
       const parts = strVal.split('.');
       if (parts.length > 2) {
         strVal = parts[0] + '.' + parts.slice(1).join('');
       }
       
       if (strVal.includes('.') && strVal.split('.')[1]) {
         strVal = strVal.split('.')[0] + '.' + strVal.split('.')[1].substring(0, 2);
       }
       
       if (Number(strVal) > 999) strVal = "999";
       
       newPaces[index].distance = strVal;
    }
    setPaces(newPaces);
  };

  const handleRemovePace = (index: number) => {
    setPaces(paces.filter((_, i) => i !== index));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData();
    formData.append("running_level", level);
    
    const pacesToSave = paces.map(p => ({
      ...p,
      distance: Number(p.distance)
    }));
    formData.append("running_pace", JSON.stringify(pacesToSave));
    
    const res = await updateStudentAction(student.id, formData);
    if (res?.error) {
       alert(res.error);
    } else {
       onUpdate();
    }
    setLoading(false);
  };

  return (
    <div className="admin-card" style={{ padding: 24, border: "3px solid #000" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <Activity size={20} />
        <h3 style={{ fontSize: 16, fontWeight: 900, textTransform: "uppercase", margin: 0 }}>Perfil de Performance</h3>
      </div>
      <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <label style={{ fontSize: 11, fontWeight: 900, textTransform: "uppercase", color: "#666" }}>Nível Corrida</label>
          <select value={level} onChange={e => setLevel(e.target.value)} style={{ width: "100%", padding: 14, border: "3px solid #000", fontWeight: 800, outline: "none" }}>
            {Object.values(RUNNING_LEVELS).map(l => (
              <option key={l.key} value={l.key}>{l.label}</option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <label style={{ fontSize: 11, fontWeight: 900, textTransform: "uppercase", color: "#666" }}>Marcos de Pace</label>
            <button type="button" onClick={handleAddPace} className="admin-btn" style={{ padding: "4px 12px", fontSize: 10, border: "2px solid #000", display: "flex", gap: 4, alignItems: "center", background: "transparent", cursor: "pointer" }}>
              <Plus size={12} /> ADICIONAR
            </button>
          </div>
          
          {paces.map((p, index) => (
            <div key={index} style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 12, alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", border: "2px solid #000" }}>
                <input 
                  type="text" 
                  inputMode="decimal"
                  value={p.distance === 0 ? "" : p.distance}
                  onChange={e => handlePaceChange(index, "distance", e.target.value)}
                  style={{ width: "100%", padding: 10, border: "none", fontWeight: 800, outline: "none" }} 
                />
                <span style={{ paddingRight: 10, fontSize: 12, fontWeight: 900, color: "#666" }}>KM</span>
              </div>
              <input 
                type="text" 
                value={p.pace}
                placeholder="00:00"
                maxLength={5}
                onChange={e => handlePaceChange(index, "pace", e.target.value)}
                style={{ width: "100%", padding: 10, border: "2px solid #000", fontWeight: 800, outline: "none" }} 
              />
              <button type="button" onClick={() => handleRemovePace(index)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#E74C3C" }}>
                <Trash2 size={18} />
              </button>
            </div>
          ))}
          {paces.length === 0 && (
            <p style={{ fontSize: 12, color: "#999", margin: 0, fontStyle: "italic" }}>Nenhum pace registrado.</p>
          )}
        </div>

        <button 
          type="submit" 
          disabled={loading} 
          className="admin-btn admin-btn-primary" 
          style={{ height: 48, fontSize: 12, width: "100%", marginTop: 8 }}
        >
          {loading ? "SALVANDO..." : "ATUALIZAR PERFIL DE PERFORMANCE"}
        </button>
      </form>
    </div>
  );
}

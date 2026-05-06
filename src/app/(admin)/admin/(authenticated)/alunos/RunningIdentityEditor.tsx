"use client";

import { useState } from "react";
import { Plus, Trash2, Activity, XCircle } from "lucide-react";
import { RUNNING_LEVELS, RUNNING_STATUSES } from "@/lib/constants/running";
import AlertModal from "@/components/AlertModal";
import ConfirmModal from "@/components/ConfirmModal";

interface RunningIdentityEditorProps {
  student: {
    id: string;
    running_level?: string | null;
    running_pace?: string | null;
    running_target_pace?: string | null;
    running_status?: string | null;
  };
  onUpdate: () => void;
  updateStudentAction: (id: string, formData: FormData) => Promise<{ error?: string } | any>;
}

export default function RunningIdentityEditor({ student, onUpdate, updateStudentAction }: RunningIdentityEditorProps) {
  const [loading, setLoading] = useState(false);
  const [level, setLevel] = useState(student.running_level || "");
  const [status, setStatus] = useState(student.running_status || "active");
  const [targetPace, setTargetPace] = useState(student.running_target_pace || "");
  const [alertModal, setAlertModal] = useState<{title: string; message: string; type: "error" | "success" | "info"} | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  
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
  const [paces, setPaces] = useState<{distance: number | string, pace: string, date?: string}[]>(initialPaces);

  const handleAddPace = () => {
    const today = new Date().toISOString().split('T')[0];
    setPaces([...paces, { distance: 5, pace: "", date: today }]);
  };
  
  const handlePaceChange = (index: number, field: "distance" | "pace" | "date", value: any) => {
    const newPaces = [...paces];
    if (field === "date") {
      newPaces[index].date = value;
    } else if (field === "pace") {
       let val = value.replace(/\D/g, "");
       if (val.length > 4) val = val.substring(0, 4);
       
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
    formData.append("running_level", level || "");
    formData.append("running_status", status);
    formData.append("running_target_pace", targetPace);
    
    // Se o nível foi limpo, também limpa o pace
    if (!level) {
      formData.append("running_pace", "");
    } else {
      // Validação: impedir marcos de pace sem tempo preenchido ou inválidos (MM:SS)
      const invalidPace = paces.find(p => !p.pace || p.pace === "00:00" || !/^\d{2}:\d{2}$/.test(p.pace));
      if (invalidPace) {
        setAlertModal({ 
          title: "Pace Inválido", 
          message: "Preencha o pace de todos os marcos no formato MM:SS (ex: 05:30). O formato " + (invalidPace.pace || "vazio") + " é inválido.", 
          type: "error" 
        });
        setLoading(false);
        return;
      }

      const pacesToSave = paces.map(p => ({
        ...p,
        distance: Number(p.distance)
      }));
      formData.append("running_pace", JSON.stringify(pacesToSave));
    }
    
    const res = await updateStudentAction(student.id, formData);
    if (res?.error) {
       setAlertModal({ title: "Erro", message: res.error, type: "error" });
    } else {
       onUpdate();
    }
    setLoading(false);
  };

  const handleRemoveFromProgram = async () => {
    setShowConfirm(false);
    setLoading(true);
    const fd = new FormData();
    fd.append("running_level", "");
    fd.append("running_pace", "");
    const res = await updateStudentAction(student.id, fd);
    if (res?.error) setAlertModal({ title: "Erro", message: res.error, type: "error" });
    else {
      setLevel("");
      setPaces([]);
      onUpdate();
    }
    setLoading(false);
  };

  return (
    <>
    {alertModal && (
      <AlertModal
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
        onClose={() => setAlertModal(null)}
      />
    )}
    <div className="admin-card" style={{ padding: 24, border: "3px solid #000" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <Activity size={20} />
        <h3 style={{ fontSize: 16, fontWeight: 900, textTransform: "uppercase", margin: 0 }}>Perfil de Performance</h3>
      </div>
      <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <label style={{ fontSize: 11, fontWeight: 900, textTransform: "uppercase", color: "#666" }}>Nível Corrida</label>
          <select value={level} onChange={e => setLevel(e.target.value)} style={{ width: "100%", padding: 14, border: "3px solid #000", fontWeight: 800, outline: "none" }}>
            <option value="">— SEM NÍVEL (Fora do Programa) —</option>
            {Object.values(RUNNING_LEVELS).map(l => (
              <option key={l.key} value={l.key}>{l.label}</option>
            ))}
          </select>
        </div>

        {level && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label style={{ fontSize: 11, fontWeight: 900, textTransform: "uppercase", color: "#666" }}>Status no Programa</label>
            <select value={status} onChange={e => setStatus(e.target.value)} style={{ width: "100%", padding: 14, border: "3px solid #000", fontWeight: 800, outline: "none", color: RUNNING_STATUSES[status as keyof typeof RUNNING_STATUSES]?.color || "#000" }}>
              {Object.values(RUNNING_STATUSES).map(s => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </select>
            {status !== "active" && (
              <p style={{ fontSize: 11, color: "#DC2626", margin: 0, fontWeight: 800 }}>
                O aluno não poderá acessar a área do Coliseu Running pelo celular, mas seu histórico será mantido.
              </p>
            )}
          </div>
        )}

        {level && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label style={{ fontSize: 11, fontWeight: 900, textTransform: "uppercase", color: "#666" }}>Pace Alvo (Definido pelo Aluno)</label>
            <input 
              type="text"
              value={targetPace}
              onChange={e => {
                let val = e.target.value.replace(/\D/g, "");
                if (val.length > 4) val = val.substring(0, 4);
                if (val.length > 2) {
                  val = val.substring(0, 2) + ":" + val.substring(2, 4);
                }
                setTargetPace(val);
              }}
              placeholder="05:30"
              maxLength={5}
              style={{ width: "100%", padding: 14, border: "3px solid #000", fontWeight: 800, outline: "none" }}
            />
          </div>
        )}

        {level && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <label style={{ fontSize: 11, fontWeight: 900, textTransform: "uppercase", color: "#666" }}>Marcos de Pace</label>
            <button type="button" onClick={handleAddPace} className="admin-btn" style={{ padding: "4px 12px", fontSize: 10, border: "2px solid #000", display: "flex", gap: 4, alignItems: "center", background: "transparent", cursor: "pointer" }}>
              <Plus size={12} /> ADICIONAR
            </button>
          </div>
          
          {paces.map((p, index) => (
            <div key={index} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 12, alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", border: "2px solid #000", height: 42, boxSizing: "border-box" }}>
                <input 
                  type="text" 
                  inputMode="decimal"
                  value={p.distance === 0 ? "" : p.distance}
                  onChange={e => handlePaceChange(index, "distance", e.target.value)}
                  style={{ width: "100%", padding: 10, border: "none", fontWeight: 800, outline: "none", height: "100%", boxSizing: "border-box" }} 
                />
                <span style={{ paddingRight: 10, fontSize: 12, fontWeight: 900, color: "#666" }}>KM</span>
              </div>
              <input 
                type="text" 
                value={p.pace}
                placeholder="00:00"
                maxLength={5}
                onChange={e => handlePaceChange(index, "pace", e.target.value)}
                style={{ width: "100%", padding: 10, border: "2px solid #000", fontWeight: 800, outline: "none", height: 42, boxSizing: "border-box" }} 
              />
              <input 
                type="date"
                value={p.date || ""}
                onChange={e => handlePaceChange(index, "date", e.target.value)}
                style={{ width: "100%", padding: 10, border: "2px solid #000", fontWeight: 800, outline: "none", fontFamily: "inherit", boxSizing: "border-box", height: 42 }}
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
        )}

        <button 
          type="submit" 
          disabled={loading} 
          className="admin-btn admin-btn-primary" 
          style={{ height: 48, fontSize: 12, width: "100%", marginTop: 8 }}
        >
          {loading ? "SALVANDO..." : "ATUALIZAR PERFIL DE PERFORMANCE"}
        </button>

        {/* Botão de Remoção do Programa */}
        {student.running_level && (
          <button
            type="button"
            disabled={loading}
            onClick={() => setShowConfirm(true)}
            style={{
              height: 44,
              fontSize: 11,
              width: "100%",
              marginTop: 8,
              background: "transparent",
              border: "2px solid #E74C3C",
              color: "#E74C3C",
              fontWeight: 900,
              textTransform: "uppercase",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8
            }}
          >
            <XCircle size={14} /> REMOVER DO PROGRAMA RUNNING
          </button>
        )}
      </form>
    </div>
    
    {showConfirm && (
      <ConfirmModal
        title="REMOVER ALUNO"
        message="Remover este aluno do programa Coliseu Running? Ele perderá acesso ao Hub de Corrida."
        confirmLabel="REMOVER"
        cancelLabel="CANCELAR"
        isDanger={true}
        onCancel={() => setShowConfirm(false)}
        onConfirm={handleRemoveFromProgram}
      />
    )}
    </>
  );
}

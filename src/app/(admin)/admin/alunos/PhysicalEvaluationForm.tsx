"use client";

import { useState, useEffect } from "react";
import { X, Save, Activity, Ruler, Target, Camera, FileText, Upload, Trash2, CheckCircle2, User, ImageIcon, Info, HeartPulse } from "lucide-react";
import { upsertPhysicalEvaluation, uploadEvaluationPhoto, getStudentBiometricsInfo } from "../../actions";
import { calculateBMI, calculateBodyComposition, calculateAge } from "../../../../lib/physique-utils";

interface PhysicalEvaluationFormProps {
  studentId: string;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: any;
}

export default function PhysicalEvaluationForm({ 
  studentId, 
  onClose, 
  onSuccess,
  initialData 
}: PhysicalEvaluationFormProps) {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"geral" | "antropo" | "composicao" | "postura" | "fotos">("geral");
  const [formData, setFormData] = useState({
    id: initialData?.id || undefined,
    student_id: studentId,
    evaluation_date: initialData?.evaluation_date || new Date().toISOString().split("T")[0],
    weight: initialData?.weight || "",
    height: initialData?.height || "",
    body_fat_percentage: initialData?.body_fat_percentage || "",
    protocol: initialData?.protocol || "Pollock 7 Dobras",
    measurements: initialData?.measurements || {
      neck: "", shoulder: "", chest: "", waist: "", abdomen: "", hip: "",
      thigh_right: "", thigh_left: "", calf_right: "", calf_left: "",
      arm_right: "", arm_left: "", arm_flexed_right: "", arm_flexed_left: "", 
      forearm_right: "", forearm_left: ""
    },
    skinfolds: initialData?.skinfolds || {
      subscapular: "", triceps: "", biceps: "", chest: "", midaxillary: "",
      suprailiac: "", abdominal: "", thigh: ""
    },
    bone_diameters: initialData?.bone_diameters || {
      humerus: "", femur: "", wrist: "", ankle: ""
    },
    postural_analysis: initialData?.postural_analysis || {
      anterior: "Normal",
      posterior: "Normal",
      lateral_right: "Normal",
      lateral_left: "Normal"
    },
    notes: initialData?.notes || "",
    photos: initialData?.photos || [],
    waist_hip_ratio: initialData?.waist_hip_ratio || null
  });

  const [studentMeta, setStudentMeta] = useState<{ gender: string | null; birth_date: string | null } | null>(null);
  const [calculatedResults, setCalculatedResults] = useState({
    bmi: 0,
    bodyFat: 0,
    fatMass: 0,
    leanMass: 0,
    age: 0
  });

  // Carregar dados meta do aluno (Gênero e Nascimento) para os cálculos
  useEffect(() => {
    async function fetchMeta() {
      if (!studentId) return;
      const info = await getStudentBiometricsInfo(studentId);
      setStudentMeta(info);
    }
    fetchMeta();
  }, [studentId]);

  // Cálculo Automático de Biometria (IMC, %G, Massa Magra/Gorda)
  useEffect(() => {
    const weightVal = parseFloat(formData.weight.toString()) || 0;
    const heightVal = parseFloat(formData.height.toString()) || 0;
    
    let bmi = 0;
    if (weightVal > 0 && heightVal > 0) {
      bmi = calculateBMI(weightVal, heightVal) || 0;
    }

    let bodyFat = 0;
    let fatMass = 0;
    let leanMass = 0;
    let age = 0;

    if (studentMeta?.birth_date) {
      age = calculateAge(studentMeta.birth_date);
    }

    // 1. Tentar calcular via Protocolo de Dobras
    if (weightVal > 0 && studentMeta?.gender) {
      const result = calculateBodyComposition(
        weightVal,
        heightVal,
        formData.skinfolds,
        age,
        studentMeta.gender as "male" | "female",
        formData.protocol
      );

      if (result.bf !== null && result.bf > 0) {
        bodyFat = result.bf;
        fatMass = result.fatMass || 0;
        leanMass = result.leanMass || 0;
      }
    }

    // 2. Se o protocolo não deu resultado (dobras vazias), mas o Coach digitou o % manual
    // Ou se o protocolo selecionado for Bioimpedância
    if (bodyFat === 0 && formData.body_fat_percentage) {
      bodyFat = parseFloat(formData.body_fat_percentage.toString()) || 0;
      if (bodyFat > 0 && weightVal > 0) {
        fatMass = parseFloat(((weightVal * bodyFat) / 100).toFixed(2));
        leanMass = parseFloat((weightVal - fatMass).toFixed(2));
      }
    }

    setCalculatedResults({ bmi, bodyFat, fatMass, leanMass, age });
  }, [formData.weight, formData.height, formData.skinfolds, formData.protocol, formData.body_fat_percentage, studentMeta]);

  // Cálculo Automático de Relação Cintura-Quadril (WHR)
  useEffect(() => {
    const waist = parseFloat(formData.measurements.waist);
    const hip = parseFloat(formData.measurements.hip);
    if (!isNaN(waist) && !isNaN(hip) && hip > 0) {
      const whr = parseFloat((waist / hip).toFixed(2));
      if (whr !== formData.waist_hip_ratio) {
        setFormData(prev => ({ ...prev, waist_hip_ratio: whr }));
      }
    }
  }, [formData.measurements.waist, formData.measurements.hip, formData.waist_hip_ratio]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  
  const [uploadingPos, setUploadingPos] = useState<string | null>(null);
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, label: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPos(label);
    const formDataUpload = new FormData();
    formDataUpload.append("file", file);
    formDataUpload.append("studentId", studentId);

    const result = await uploadEvaluationPhoto(formDataUpload);
    if (result.success && result.url) {
      setFormData(prev => {
        // Se já existe uma foto para este label, substitui. Senão adiciona.
        const existingIndex = prev.photos.findIndex((p: any) => p.label === label);
        const newPhoto = { url: result.url, label, path: result.path };
        const newPhotos = [...prev.photos];
        
        if (existingIndex >= 0) {
          newPhotos[existingIndex] = newPhoto;
        } else {
          newPhotos.push(newPhoto);
        }
        
        return { ...prev, photos: newPhotos };
      });
    } else {
      alert(result.error || "Erro no upload");
    }
    setUploadingPos(null);
  };

  const removePhoto = (index: number) => {
    setFormData(prev => ({
      ...prev,
      photos: prev.photos.filter((_: any, i: number) => i !== index)
    }));
  };

  const handleNestedChange = (category: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [category]: { ...((prev as any)[category]), [field]: value }
    }));
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    
    // Parse numeric values
    const payload = {
      ...formData,
      weight: formData.weight ? parseFloat(formData.weight.toString()) : undefined,
      height: formData.height ? parseFloat(formData.height.toString()) : undefined,
      body_fat_percentage: calculatedResults.bodyFat > 0 && formData.protocol !== "Bioimpedância" 
        ? calculatedResults.bodyFat 
        : (formData.body_fat_percentage ? parseFloat(formData.body_fat_percentage.toString()) : undefined),
      measurements: Object.fromEntries(Object.entries(formData.measurements).map(([k, v]) => [k, v ? parseFloat(v as string) : 0])),
      skinfolds: Object.fromEntries(Object.entries(formData.skinfolds).map(([k, v]) => [k, v ? parseFloat(v as string) : 0])),
      bone_diameters: Object.fromEntries(Object.entries(formData.bone_diameters).map(([k, v]) => [k, v ? parseFloat(v as string) : 0])),
      waist_hip_ratio: formData.waist_hip_ratio,
      lean_mass_components: {
        fat_mass: calculatedResults.fatMass,
        lean_mass: calculatedResults.leanMass,
        bmi: calculatedResults.bmi,
        age_at_evaluation: calculatedResults.age
      }
    };

    const result = await upsertPhysicalEvaluation(payload);
    if (result.success) {
      onSuccess();
    } else {
      alert(result.error);
    }
    setLoading(false);
  }

  const tabs = [
    { id: "geral", label: "GERAL", icon: Activity },
    { id: "antropo", label: "ANTROPOMETRIA", icon: Ruler },
    { id: "composicao", label: "COMPOSIÇÃO", icon: Target },
    { id: "postura", label: "POSTURA", icon: FileText },
    { id: "fotos", label: "FOTOS", icon: Camera },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#F9FAFB", overflow: "hidden" }}>


      {/* Form Title & Context */}
      <div style={{ padding: "16px 32px 0 32px", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 8, height: 8, background: "#E31B23" }} />
        <span style={{ fontSize: 13, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em" }}>
          {formData.id ? "Edição de Avaliação" : "Novo Registro Biométrico"}
        </span>
      </div>

      {/* Tabs */}
      <nav style={{ display: "flex", background: "#FFF", borderBottom: "1px solid #EEE", padding: "0 24px", marginTop: 8 }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              padding: "16px 20px",
              background: "none",
              border: "none",
              borderBottom: activeTab === tab.id ? "2px solid #000" : "2px solid transparent",
              color: activeTab === tab.id ? "#000" : "#999",
              fontSize: "12px",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: 8,
              cursor: "pointer"
            }}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </nav>

      <form onSubmit={handleSubmit} style={{ flex: 1, padding: "32px", overflowY: "auto" }}>
        
        {/* TAB: GERAL */}
        {activeTab === "geral" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
             <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
               <div>
                 <label style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#666", marginBottom: 8, display: "block" }}>Data da Avaliação</label>
                 <input type="date" value={formData.evaluation_date} onChange={e => handleInputChange("evaluation_date", e.target.value)} required />
               </div>
               <div>
                 <label style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#666", marginBottom: 8, display: "block" }}>Protocolo</label>
                 <select value={formData.protocol} onChange={e => handleInputChange("protocol", e.target.value)}>
                   <option value="Pollock 7 Dobras">Pollock 7 Dobras</option>
                   <option value="Pollock 3 Dobras">Pollock 3 Dobras</option>
                   <option value="Guedes">Guedes</option>
                   <option value="Bioimpedância">Bioimpedância</option>
                 </select>
               </div>
             </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 24 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", color: "#666" }}>Peso (kg)</label>
                  <input 
                    type="number" step="0.1" 
                    value={formData.weight} 
                    onChange={e => handleInputChange("weight", e.target.value)} 
                    placeholder="00.0"
                    style={{ width: "100%", padding: "10px 12px", border: "2px solid #EEE", fontWeight: 800, fontSize: 16, outline: "none" }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "#000")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "#EEE")}
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", color: "#666" }}>Altura (m)</label>
                  <input 
                    type="number" step="0.01" 
                    value={formData.height} 
                    onChange={e => handleInputChange("height", e.target.value)} 
                    placeholder="1.70"
                    style={{ width: "100%", padding: "10px 12px", border: "2px solid #EEE", fontWeight: 800, fontSize: 16, outline: "none" }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "#000")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "#EEE")}
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", color: "#666" }}>% Gordura (Opc.)</label>
                  <input 
                    type="number" step="0.1" 
                    value={formData.body_fat_percentage} 
                    onChange={e => handleInputChange("body_fat_percentage", e.target.value)} 
                    placeholder="0%"
                    style={{ width: "100%", padding: "10px 12px", border: "2px solid #EEE", fontWeight: 800, fontSize: 16, outline: "none" }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "#000")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "#EEE")}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 900, textTransform: "uppercase", color: "#000", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 6, height: 6, background: "#000" }} />
                  Observações Clínicas / Gerais
                </label>
                <textarea 
                 value={formData.notes} 
                 onChange={e => handleInputChange("notes", e.target.value)} 
                 rows={4} 
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
                  <div style={{ fontSize: 24, fontWeight: 900, color: "#E31B23" }}>{calculatedResults.bodyFat.toFixed(1)}%</div>
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
        )}

        {/* TAB: ANTROPOMETRIA */}
        {activeTab === "antropo" && (
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
                  { key: "arm_flexed_right", label: "BRAÇO CONTR. DIR." },
                  { key: "arm_flexed_left", label: "BRAÇO CONTR. ESQ." },
                  { key: "forearm_right", label: "ANTEBRAÇO DIR." },
                  { key: "forearm_left", label: "ANTEBRAÇO ESQ." }
                ].map(field => (
                  <div key={field.key} style={{ display: "flex", flexDirection: "column", borderBottom: "1px solid #EEE", paddingBottom: 4 }}>
                    <label style={{ fontSize: 10, fontWeight: 800, color: "#666", marginBottom: 4 }}>{field.label}</label>
                    <input 
                      type="number" step="0.1" 
                      value={(formData.measurements as any)[field.key]} 
                      onChange={e => handleNestedChange("measurements", field.key, e.target.value)} 
                      style={{ width: "100%", textAlign: "left", padding: "6px 8px", border: "2px solid #EEE", fontWeight: 800, outline: "none" }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = "#000")}
                      onBlur={(e) => (e.currentTarget.style.borderColor = "#EEE")}
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
                      value={(formData.measurements as any)[field.key]} 
                      onChange={e => handleNestedChange("measurements", field.key, e.target.value)} 
                      style={{ width: "100%", textAlign: "left", padding: "6px 8px", border: "2px solid #EEE", fontWeight: 800, outline: "none" }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = "#000")}
                      onBlur={(e) => (e.currentTarget.style.borderColor = "#EEE")}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB: COMPOSIÇÃO */}
        {activeTab === "composicao" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
            <div style={{ background: "#F3F4F6", padding: 16, border: "2px solid #EEE" }}>
               <h3 style={{ fontSize: 11, fontWeight: 900, color: "#000", textTransform: "uppercase", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                 <div style={{ width: 8, height: 8, background: "#000" }} />
                 DOBRAS CUTÂNEAS (MM)
               </h3>
               <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px 24px" }}>
                {[
                  { key: "triceps", label: "TRÍCEPS" },
                  { key: "biceps", label: "BÍCEPS" },
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
                      value={(formData.skinfolds as any)[field.key]} 
                      onChange={e => handleNestedChange("skinfolds", field.key, e.target.value)} 
                      style={{ width: "100%", textAlign: "left", padding: "6px 8px", border: "2px solid #EEE", fontWeight: 800, outline: "none" }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = "#000")}
                      onBlur={(e) => (e.currentTarget.style.borderColor = "#EEE")}
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
                      value={(formData.bone_diameters as any)[field.key]} 
                      onChange={e => handleNestedChange("bone_diameters", field.key, e.target.value)} 
                      style={{ width: "100%", textAlign: "left", padding: "6px 8px", border: "2px solid #EEE", fontWeight: 800, outline: "none" }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = "#000")}
                      onBlur={(e) => (e.currentTarget.style.borderColor = "#EEE")}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* DASHBOARD DE RESULTADOS (DUPLICADO PARA UX) */}
            <div style={{ 
              background: "#000", 
              padding: "32px", 
              border: "4px solid #E31B23",
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 16
            }}>
              <div style={{ borderRight: "1px solid #333" }}>
                <span style={{ fontSize: 9, fontWeight: 900, color: "#999", textTransform: "uppercase" }}>Prot. {formData.protocol.split(' ')[0]}</span>
                <div style={{ fontSize: 24, fontWeight: 900, color: "#FFF" }}>{calculatedResults.bodyFat.toFixed(1)}%</div>
              </div>
              <div style={{ borderRight: "1px solid #333" }}>
                <span style={{ fontSize: 9, fontWeight: 900, color: "#999", textTransform: "uppercase" }}>Gordura (kg)</span>
                <div style={{ fontSize: 24, fontWeight: 900, color: "#E31B23" }}>{calculatedResults.fatMass.toFixed(1)}kg</div>
              </div>
              <div style={{ borderRight: "1px solid #333" }}>
                <span style={{ fontSize: 9, fontWeight: 900, color: "#999", textTransform: "uppercase" }}>Massa Magra</span>
                <div style={{ fontSize: 24, fontWeight: 900, color: "#FFF" }}>{calculatedResults.leanMass.toFixed(1)}kg</div>
              </div>
              <div>
                <span style={{ fontSize: 9, fontWeight: 900, color: "#999", textTransform: "uppercase" }}>Peso Total</span>
                <div style={{ fontSize: 24, fontWeight: 900, color: "#FFF" }}>{parseFloat(formData.weight.toString() || "0").toFixed(1)}kg</div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: POSTURA */}
        {activeTab === "postura" && (
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
                  value={(formData.postural_analysis as any)[view.key]} 
                  onChange={e => handleNestedChange("postural_analysis", view.key, e.target.value)} 
                  rows={4} 
                  style={{ width: "100%", padding: 12, border: "2px solid #000", fontSize: 13, fontWeight: 500, outline: "none", resize: "none" }} 
                  onFocus={(e) => (e.currentTarget.style.borderColor = "#E31B23")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "#000")}
                />
              </div>
            ))}
          </div>
        )}

        {/* TAB: FOTOS */}
        {activeTab === "fotos" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "24px" }}>
              {["Frente", "Costas", "Lateral Direita", "Lateral Esquerda", "Postural"].map(pos => {
                const photo = formData.photos.find((p: any) => p.label === pos);
                const isUploading = uploadingPos === pos;

                return (
                  <div key={pos} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div style={{ fontSize: "11px", fontWeight: 900, textTransform: "uppercase", color: "#666", letterSpacing: "0.05em" }}>
                      {pos}
                    </div>
                    
                    <label style={{ 
                      position: "relative",
                      aspectRatio: "3/4",
                      background: "#F3F4F6",
                      border: photo ? "3px solid #000" : "3px dashed #CCC",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      overflow: "hidden",
                      transition: "all 0.2s ease"
                    }}>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={(e) => handlePhotoUpload(e, pos)} 
                        style={{ display: "none" }}
                        disabled={!!uploadingPos}
                      />

                      {photo ? (
                        <>
                          <img src={photo.url} alt={pos} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          <div style={{ 
                            position: "absolute", inset: 0, 
                            background: "rgba(0,0,0,0.4)", 
                            display: "flex", alignItems: "center", justifyContent: "center",
                            opacity: 0, transition: "opacity 0.2s",
                            // Usaremos hover via style inline se necessário, ou apenas deixar os botões visíveis
                          }} onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")} onMouseLeave={(e) => (e.currentTarget.style.opacity = "0")}>
                            <div style={{ display: "flex", gap: 8 }}>
                              <button 
                                type="button"
                                onClick={(e) => { e.preventDefault(); removePhoto(formData.photos.indexOf(photo)); }}
                                style={{ background: "#EF4444", color: "#FFF", border: "none", padding: "8px 12px", fontSize: "10px", fontWeight: 900, cursor: "pointer", textTransform: "uppercase" }}
                              >
                                REMOVER
                              </button>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, color: "#999" }}>
                          {isUploading ? (
                            <>
                              <Activity size={32} className="animate-spin" style={{ color: "#000" }} />
                              <span style={{ fontSize: "10px", fontWeight: 900, color: "#000" }}>PROCESSANDO...</span>
                            </>
                          ) : (
                            <>
                              <div style={{ background: "#FFF", borderRadius: "50%", padding: "20px", border: "2px solid #EEE" }}>
                                <Camera size={32} />
                              </div>
                              <span style={{ fontSize: "10px", fontWeight: 900, textTransform: "uppercase" }}>Clique para enviar</span>
                            </>
                          )}
                        </div>
                      )}
                    </label>
                  </div>
                );
              })}
            </div>

            <div style={{ background: "#000", padding: "20px", color: "#FFF", display: "flex", gap: 16, alignItems: "center" }}>
              <Info size={24} />
              <div style={{ fontSize: "12px", fontWeight: 500, lineHeight: 1.4 }}>
                <strong style={{ display: "block", marginBottom: 4, color: "#FFF" }}>DICA DO COACH:</strong>
                As fotos devem ser tiradas em local bem iluminado, contra um fundo neutro e mantendo a mesma distância da câmera para todas as avaliações.
              </div>
            </div>
          </div>
        )}

      </form>

      <footer style={{ 
        padding: "24px 32px", 
        background: "#FFF", 
        borderTop: "4px solid #000", 
        display: "flex", 
        gap: 16,
        boxShadow: "0 -8px 24px rgba(0,0,0,0.05)",
        zIndex: 10
      }}>
        <button 
          onClick={(e) => { e.preventDefault(); handleSubmit(e as any); }} 
          disabled={loading} 
          className="admin-btn admin-btn-primary" 
          style={{ 
            flex: 2, 
            padding: "20px", 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center", 
            gap: 12,
            fontSize: "14px",
            fontWeight: 900,
            letterSpacing: "0.05em"
          }}
        >
          <Save size={20} />
          {loading ? "PROCESSANDO..." : (formData.id ? "ATUALIZAR AVALIAÇÃO" : "FINALIZAR REGISTRO")}
        </button>
        <button 
          onClick={onClose} 
          className="admin-btn admin-btn-ghost" 
          style={{ 
            flex: 1, 
            padding: "20px",
            fontSize: "12px",
            fontWeight: 800,
            color: "#666"
          }}
        >
          CANCELAR
        </button>
      </footer>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { X, Save, Activity, Ruler, Target, Camera, FileText, Upload, Trash2, CheckCircle2, User, ImageIcon, Info, HeartPulse } from "lucide-react";
import { upsertPhysicalEvaluation, uploadEvaluationPhoto } from "../../../actions-evaluation";
import { getStudentBiometricsInfo } from "../../../actions-student";
import { compressAndConvertImage } from "@/lib/utils/image-compress";
import { 
  calculateBMI, 
  calculateBodyComposition, 
  calculateAge,
  type Skinfolds,
  type Measurements,
  type BoneDiameters,
  type PosturalAnalysis
} from "@/lib/physique-utils";
import AlertModal from "@/components/AlertModal";

import TabGeral from "./evaluation-tabs/TabGeral";
import TabAntropometria from "./evaluation-tabs/TabAntropometria";
import TabComposicao from "./evaluation-tabs/TabComposicao";
import TabPostura from "./evaluation-tabs/TabPostura";
import TabFotos from "./evaluation-tabs/TabFotos";
interface PhysicalEvaluationFormProps {
  studentId: string;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: any; // Mantendo any aqui temporarily pois os dados do Supabase podem variar, mas tiparemos o uso interno
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
    protocol: "Pollock 7 Dobras",
    measurements: initialData?.measurements || {
      neck: "", shoulder: "", chest: "", waist: "", abdomen: "", hip: "",
      thigh_right: "", thigh_left: "", calf_right: "", calf_left: "",
      arm_right: "", arm_left: "", arm_flexed_right: "", arm_flexed_left: "", 
      forearm_right: "", forearm_left: ""
    },
    skinfolds: initialData?.skinfolds || {
      subscapular: "", triceps: "", chest: "", midaxillary: "",
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

    // 1. Tentar calcular via Protocolo de Dobras (Sempre Pollock 7)
    if (weightVal > 0 && studentMeta?.gender) {
      const result = calculateBodyComposition(
        weightVal,
        heightVal,
        formData.skinfolds,
        age,
        studentMeta.gender as "male" | "female",
        "Pollock 7 Dobras"
      );

      if (result.bf !== null && result.bf > 0) {
        bodyFat = result.bf;
        fatMass = result.fatMass || 0;
        leanMass = result.leanMass || 0;
      }
    }

    // 2. Se o protocolo não deu resultado (dobras vazias), mas o Coach digitou o % manual
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

  const handleInputChange = (field: string, value: string | number | null) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  
  const [uploadingPos, setUploadingPos] = useState<string | null>(null);
  const [alertConfig, setAlertConfig] = useState<{ title: string; message: string; type: "success" | "error" | "info" } | null>(null);
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, label: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPos(label);

    try {
      // Comprime e converte para JPEG 1600px/85% antes do upload
      const optimizedFile = await compressAndConvertImage(file);

      const formDataUpload = new FormData();
      formDataUpload.append("file", optimizedFile);
      formDataUpload.append("studentId", studentId);
      const result = await uploadEvaluationPhoto(formDataUpload);
      if (result.success && result.url) {
        setFormData(prev => {
          // Se já existe uma foto para este label, substitui. Senão adiciona.
          const existingIndex = prev.photos.findIndex((p: { label: string }) => p.label === label);
          const newPhoto = { url: result.url as string, label, path: result.path };
          const newPhotos = [...prev.photos];
          
          if (existingIndex >= 0) {
            newPhotos[existingIndex] = newPhoto;
          } else {
            newPhotos.push(newPhoto);
          }
          
          return { ...prev, photos: newPhotos };
        });
      } else {
        setAlertConfig({
          title: "ERRO DE UPLOAD",
          message: result.error || "OCORREU UM ERRO AO ENVIAR A FOTO.",
          type: "error"
        });
      }
    } catch (err: any) {
      console.error("Upload handler critical error:", err);
      setAlertConfig({
        title: "ERRO CRÍTICO",
        message: `NÃO FOI POSSÍVEL PROCESSAR O UPLOAD: ${err?.message || "Erro desconhecido. Tente novamente."}`,
        type: "error"
      });
    } finally {
      setUploadingPos(null);
    }
  };

  const removePhoto = (index: number) => {
    setFormData(prev => ({
      ...prev,
      photos: prev.photos.filter((_: { label: string }, i: number) => i !== index)
    }));
  };

  const handleNestedChange = (category: "measurements" | "skinfolds" | "bone_diameters" | "postural_analysis", field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [category]: { ...((prev as any)[category]), [field]: value }
    }));
  };

  const formatOnBlur = (field: string, value: string | number | null, category?: "measurements" | "skinfolds" | "bone_diameters", decimals = 2) => {
    const parsed = parseFloat(value?.toString() || "");
    if (isNaN(parsed)) return;
    
    const formatted = parseFloat(parsed.toFixed(decimals));
    if (category) {
      handleNestedChange(category, field, formatted);
    } else {
      handleInputChange(field, formatted);
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    
    // Helper to safely parse and round numbers
    const safeRound = (val: string | number | null | undefined, decimals = 2) => {
      const parsed = parseFloat(val?.toString() || "0");
      if (isNaN(parsed)) return 0;
      return parseFloat(parsed.toFixed(decimals));
    };

    // Parse numeric values — nunca envia 0 ou null para campos que o Zod exige como positivo/opcional
    const safeNum = (val: string | number | null | undefined, decimals = 2): number | undefined => {
      const parsed = parseFloat(val?.toString() || "");
      if (isNaN(parsed) || parsed === 0) return undefined; // 0 falha no .positive() do schema
      return parseFloat(parsed.toFixed(decimals));
    };

    const payload = {
      ...formData,
      weight: safeNum(formData.weight),
      height: safeNum(formData.height),
      // Prioridade: cálculo via Pollock 7 Dobras → fallback: valor manual → undefined (omite o campo)
      body_fat_percentage: calculatedResults.bodyFat > 0
        ? safeRound(calculatedResults.bodyFat, 1)
        : (formData.body_fat_percentage ? safeRound(formData.body_fat_percentage, 1) : undefined),
      measurements: Object.fromEntries(Object.entries(formData.measurements).map(([k, v]) => [k, v !== "" ? safeRound(v as string) : null])),
      skinfolds: Object.fromEntries(Object.entries(formData.skinfolds).map(([k, v]) => [k, v !== "" ? safeRound(v as string) : null])),
      bone_diameters: Object.fromEntries(Object.entries(formData.bone_diameters).map(([k, v]) => [k, v !== "" ? safeRound(v as string) : null])),
      waist_hip_ratio: formData.waist_hip_ratio ? safeRound(formData.waist_hip_ratio) : null,
      lean_mass_components: {
        fat_mass: safeRound(calculatedResults.fatMass),
        lean_mass: safeRound(calculatedResults.leanMass),
        bmi: safeRound(calculatedResults.bmi, 1),
        age_at_evaluation: calculatedResults.age
      }
    };

    const result = await upsertPhysicalEvaluation(payload);
    if (result.success) {
      onSuccess();
    } else {
      setAlertConfig({
        title: "ERRO AO SALVAR",
        message: result.error || "HOUVE UM ERRO AO SALVAR A AVALIAÇÃO FÍSICA.",
        type: "error"
      });
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
            onClick={() => setActiveTab(tab.id as "geral" | "antropo" | "composicao" | "postura" | "fotos")}
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
          <TabGeral 
            formData={formData as any} 
            handleInputChange={handleInputChange} 
            formatOnBlur={formatOnBlur}
            handleNestedChange={handleNestedChange}
            calculatedResults={calculatedResults} 
          />
        )}

        {/* TAB: ANTROPOMETRIA */}
        {activeTab === "antropo" && (
          <TabAntropometria 
            formData={formData as any} 
            handleInputChange={handleInputChange} 
            formatOnBlur={formatOnBlur}
            handleNestedChange={handleNestedChange}
          />
        )}

        {/* TAB: COMPOSIÇÃO */}
        {activeTab === "composicao" && (
          <TabComposicao 
            formData={formData as any} 
            handleInputChange={handleInputChange} 
            formatOnBlur={formatOnBlur}
            handleNestedChange={handleNestedChange}
            calculatedResults={calculatedResults}
          />
        )}

        {/* TAB: POSTURA */}
        {activeTab === "postura" && (
          <TabPostura 
            formData={formData as any} 
            handleNestedChange={handleNestedChange}
          />
        )}

        {/* TAB: FOTOS */}
        {activeTab === "fotos" && (
          <TabFotos 
            photos={formData.photos} 
            uploadingPos={uploadingPos}
            handlePhotoUpload={handlePhotoUpload}
            removePhoto={removePhoto}
          />
        )}

        {/* Footer — DENTRO do form: type="submit" garante que o browser gerencie
            o ciclo de vida do envio, prevenindo double-submit em conexões lentas */}
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
            type="submit"
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
            type="button"
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

      </form>

      {alertConfig && (
        <AlertModal
          title={alertConfig.title}
          message={alertConfig.message}
          type={alertConfig.type}
          onClose={() => setAlertConfig(null)}
        />
      )}
    </div>
  );
}

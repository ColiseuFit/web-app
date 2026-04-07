"use client";

import { useState, useTransition } from "react";
import { Eye, Save, Loader2, CheckCircle2, AlertCircle, Dumbbell } from "lucide-react";
import { updateBoxSettingsAction } from "@/lib/constants/settings_actions";

interface WodSettingsManagerProps {
  initialSettings: Record<string, string>;
}

/**
 * WodSettingsManager: Controls WOD-specific business rules.
 * Currently manages student visibility window.
 */
export default function WodSettingsManager({ initialSettings }: WodSettingsManagerProps) {
  const [isPending, startTransition] = useTransition();
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "success" | "error">("idle");

  const [settings, setSettings] = useState({
    wod_visibility_weeks: initialSettings.wod_visibility_weeks || "1",
  });

  const handleChange = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    if (saveStatus !== "idle") setSaveStatus("idle");
  };

  const handleSave = async () => {
    setSaveStatus("saving");
    startTransition(async () => {
      const result = await updateBoxSettingsAction(settings);
      if (result.success) {
        setSaveStatus("success");
        setTimeout(() => setSaveStatus("idle"), 3000);
      } else {
        setSaveStatus("error");
      }
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div className="admin-card">
        <div style={{ 
          display: "flex", 
          alignItems: "center", 
          gap: "12px", 
          marginBottom: "24px", 
          borderBottom: "2px solid #000", 
          paddingBottom: "16px" 
        }}>
          <Eye size={24} />
          <h2 style={{ fontSize: "16px", fontWeight: 800, textTransform: "uppercase", margin: 0 }}>
            Visibilidade para Alunos
          </h2>
        </div>
        
        <div style={{ maxWidth: "500px" }}>
          <label style={{ 
            display: "block", 
            fontSize: "11px", 
            fontWeight: 900, 
            marginBottom: "8px", 
            color: "#666" 
          }}>
            LIMITE DE PROGRAMAÇÃO VISÍVEL (EM SEMANAS)
          </label>
          <select 
            value={settings.wod_visibility_weeks}
            onChange={(e) => handleChange("wod_visibility_weeks", e.target.value)}
            style={{ 
              border: "2px solid #000", 
              fontWeight: 700, 
              width: "100%", 
              padding: "12px", 
              outline: "none", 
              cursor: "pointer",
              background: "#FFF"
            }}
          >
            <option value="1">Apenas a semana atual (Padrão)</option>
            <option value="2">Semana atual + 1 semana adiante</option>
            <option value="3">Semana atual + 2 semanas adiante</option>
            <option value="4">Mês inteiro (4 semanas)</option>
            <option value="52">Visibilidade Total (Planejamento Livre)</option>
          </select>
          
          <div style={{ 
            marginTop: "20px", 
            padding: "16px", 
            background: "#F9FAFB", 
            borderLeft: "4px solid #000",
            fontSize: "13px",
            color: "#444",
            lineHeight: 1.6
          }}>
            <p style={{ margin: 0 }}>
              <strong>Como funciona:</strong> Esta regra define até onde o aluno pode navegar no calendário do Dashboard. 
              Mesmo que você programe o mês inteiro, o aluno só verá o que for permitido aqui.
            </p>
            <p style={{ margin: "10px 0 0", fontSize: "11px", color: "#888", fontWeight: 600 }}>
              Nota: O Admin e os Coaches sempre possuem acesso a todas as datas para planejamento.
            </p>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: "16px" }}>
        <button 
          onClick={handleSave}
          disabled={isPending || saveStatus === "saving"}
          className="admin-btn admin-btn-primary" 
          style={{ 
            height: "60px", 
            padding: "0 40px", 
            fontSize: "14px", 
            fontWeight: 900, 
            display: "flex",
            alignItems: "center",
            gap: "12px",
            minWidth: "280px",
            justifyContent: "center",
          }}
        >
          {saveStatus === "saving" ? (
            <><Loader2 className="animate-spin" size={20} /> SALVANDO...</>
          ) : saveStatus === "success" ? (
            <><CheckCircle2 size={20} /> CONFIGURAÇÃO APLICADA!</>
          ) : (
            <><Save size={20} /> SALVAR REGRAS DO WOD</>
          )}
        </button>
      </div>
    </div>
  );
}

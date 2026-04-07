"use client";

import { useState, useTransition } from "react";
import { Users, Loader2, Save, CheckCircle2, AlertCircle } from "lucide-react";
import { updateBoxSettingsAction } from "@/lib/constants/settings_actions";

interface CheckinSettingsManagerProps {
  initialSettings: Record<string, string>;
}

/**
 * CheckinSettingsManager: Orquestra a aba de "Check-in" nas configurações do Box.
 * Centraliza as regras de negócio de capacidade, política de cancelamento e fila de espera.
 * 
 * @security
 * - Os dados são persistidos via `updateBoxSettingsAction` que valida permissões de Admin.
 * - SSoT: Todas as configurações são armazenadas como strings na tabela `box_settings` para flexibilidade de esquema.
 * 
 * @param {CheckinSettingsManagerProps} props - Propriedades iniciais vindas do Server Component.
 * @param {Record<string, string>} props.initialSettings - Mapa de configurações atuais do banco.
 */
export default function CheckinSettingsManager({ initialSettings }: CheckinSettingsManagerProps) {
  const [isPending, startTransition] = useTransition();
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "success" | "error">("idle");

  // Local State
  const [settings, setSettings] = useState({
    box_capacity_limit: initialSettings.box_capacity_limit || "20",
    box_cancellation_hours: initialSettings.box_cancellation_hours || "2",
    auto_promote_waitlist: initialSettings.auto_promote_waitlist !== "false" // default true
  });

  /**
   * Gerencia mudanças nos inputs locais antes da persistência.
   * @param {string} key - Chave da configuração.
   * @param {string | boolean} value - Novo valor (convertido antes do save).
   */
  const handleChange = (key: string, value: string | boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    if (saveStatus !== "idle") setSaveStatus("idle");
  };

  /**
   * handleSave: Persiste as alterações no Supabase.
   * Raciocínio Técnico: Booleans são convertidos para string ("true"/"false") para manter 
   * a paridade com a estrutura de metadados legística do banco.
   */
  const handleSave = async () => {
    setSaveStatus("saving");
    
    startTransition(async () => {
      // Convert booleans to strings for DB
      const payload = {
        ...settings,
        auto_promote_waitlist: String(settings.auto_promote_waitlist)
      };

      const result = await updateBoxSettingsAction(payload);
      
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
      {/* ── LOGÍSTICA & CAPACIDADE ── */}
      <div className="admin-card">
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px", borderBottom: "2px solid #000", paddingBottom: "16px" }}>
          <Users size={24} />
          <h2 style={{ fontSize: "16px", fontWeight: 800, textTransform: "uppercase", margin: 0 }}>Logística & Fila de Espera</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 900, marginBottom: "8px", color: "#666" }}>LIMITE DE ALUNOS POR TURMA</label>
            <input 
              type="number" 
              value={settings.box_capacity_limit} 
              onChange={(e) => handleChange("box_capacity_limit", e.target.value)}
              min={1} max={100} 
              style={{ border: "2px solid #000", fontWeight: 700, width: "100%", padding: "12px", outline: "none" }} 
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 900, marginBottom: "8px", color: "#666" }}>TEMPO LIMITE P/ CANCELAMENTO (HORAS)</label>
            <input 
              type="number" 
              value={settings.box_cancellation_hours} 
              onChange={(e) => handleChange("box_cancellation_hours", e.target.value)}
              min={1} max={72} 
              style={{ border: "2px solid #000", fontWeight: 700, width: "100%", padding: "12px", outline: "none" }} 
            />
          </div>
        </div>
        
        <div style={{ marginTop: "24px" }}>
          <label style={{ 
            display: "flex", alignItems: "center", gap: "16px", fontSize: "14px", fontWeight: 700, cursor: "pointer", 
            background: settings.auto_promote_waitlist ? "#F0FFF4" : "#F9F9F9", 
            padding: "16px", border: settings.auto_promote_waitlist ? "2px solid #000" : "1px solid #EEE",
            transition: "all 0.2s"
          }}>
            <input 
              type="checkbox" 
              checked={settings.auto_promote_waitlist} 
              onChange={(e) => handleChange("auto_promote_waitlist", e.target.checked)}
              style={{ width: "20px", height: "20px", accentColor: "#000" }} 
            />
            PROMOVER AUTOMATICAMENTE O PRIMEIRO DA FILA QUANDO HOUVER VAGA
          </label>
        </div>
      </div>

      {/* ── SAVE ACTION ── */}
      <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: "16px", position: "sticky", bottom: "32px" }}>
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
            boxShadow: (isPending || saveStatus === "saving") ? "6px 6px 0 #000" : "10px 10px 0 #000",
            transform: (isPending || saveStatus === "saving") ? "translate(4px, 4px)" : "none",
          }}
        >
          {saveStatus === "saving" ? (
            <>
              <Loader2 className="animate-spin" size={20} />
              SALVANDO ALTERAÇÕES...
            </>
          ) : saveStatus === "success" ? (
            <>
              <CheckCircle2 size={20} />
              REGRAS SALVAS!
            </>
          ) : saveStatus === "error" ? (
            <>
              <AlertCircle size={20} />
              ERRO AO SALVAR
            </>
          ) : (
            <>
              <Save size={20} />
              SALVAR REGRAS DE CHECK-IN
            </>
          )}
        </button>
      </div>
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { Building2, Users, Bell, Loader2, Save, CheckCircle2, AlertCircle } from "lucide-react";
import { updateBoxSettingsAction } from "@/lib/constants/settings_actions";

interface GeneralSettingsManagerProps {
  initialSettings: Record<string, string>;
}

/**
 * GeneralSettingsManager: Handles the "Geral" tab operations.
 * Centralizes Box identity and logistics.
 */
export default function GeneralSettingsManager({ initialSettings }: GeneralSettingsManagerProps) {
  const [isPending, startTransition] = useTransition();
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "success" | "error">("idle");

  // Local State
  const [settings, setSettings] = useState({
    box_name: initialSettings.box_name || "Coliseu CrossFit",
    box_whatsapp: initialSettings.box_whatsapp || "",
    box_capacity_limit: initialSettings.box_capacity_limit || "20",
    box_cancellation_hours: initialSettings.box_cancellation_hours || "2",
    notif_birthday: initialSettings.notif_birthday === "true",
    notif_wod_tv: initialSettings.notif_wod_tv === "true",
    notif_weekly_report: initialSettings.notif_weekly_report === "true"
  });

  const handleChange = (key: string, value: string | boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    if (saveStatus !== "idle") setSaveStatus("idle");
  };

  const handleSave = async () => {
    setSaveStatus("saving");
    
    startTransition(async () => {
      // Convert booleans to strings for DB
      const payload = {
        ...settings,
        notif_birthday: String(settings.notif_birthday),
        notif_wod_tv: String(settings.notif_wod_tv),
        notif_weekly_report: String(settings.notif_weekly_report),
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
      {/* ── IDENTIDADE ── */}
      <div className="admin-card">
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px", borderBottom: "2px solid #000", paddingBottom: "16px" }}>
          <Building2 size={24} />
          <h2 style={{ fontSize: "16px", fontWeight: 800, textTransform: "uppercase", margin: 0 }}>Identidade do Box</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 900, marginBottom: "8px", color: "#666" }}>NOME DA UNIDADE</label>
            <input 
              type="text" 
              value={settings.box_name} 
              onChange={(e) => handleChange("box_name", e.target.value)}
              placeholder="Ex: Coliseu CrossFit"
              style={{ border: "2px solid #000", fontWeight: 700, width: "100%", padding: "12px", outline: "none" }} 
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 900, marginBottom: "8px", color: "#666" }}>WHATSAPP SUPORTE / RECEPÇÃO</label>
            <input 
              type="tel" 
              value={settings.box_whatsapp} 
              onChange={(e) => handleChange("box_whatsapp", e.target.value)}
              placeholder="(11) 99999-9999" 
              style={{ border: "2px solid #000", fontWeight: 700, width: "100%", padding: "12px", outline: "none" }} 
            />
          </div>
        </div>
      </div>

      {/* ── LOGÍSTICA ── */}
      <div className="admin-card">
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px", borderBottom: "2px solid #000", paddingBottom: "16px" }}>
          <Users size={24} />
          <h2 style={{ fontSize: "16px", fontWeight: 800, textTransform: "uppercase", margin: 0 }}>Logística & Capacidade</h2>
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
      </div>

      {/* ── NOTIFICAÇÕES ── */}
      <div className="admin-card">
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px", borderBottom: "2px solid #000", paddingBottom: "16px" }}>
          <Bell size={24} />
          <h2 style={{ fontSize: "16px", fontWeight: 800, textTransform: "uppercase", margin: 0 }}>Notificações & Eventos</h2>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <label style={{ 
            display: "flex", alignItems: "center", gap: "16px", fontSize: "14px", fontWeight: 700, cursor: "pointer", 
            background: settings.notif_birthday ? "#F0FFF4" : "#F9F9F9", 
            padding: "16px", border: settings.notif_birthday ? "2px solid #000" : "1px solid #EEE",
            transition: "all 0.2s"
          }}>
            <input 
              type="checkbox" 
              checked={settings.notif_birthday} 
              onChange={(e) => handleChange("notif_birthday", e.target.checked)}
              style={{ width: "20px", height: "20px", accentColor: "#000" }} 
            />
            ALERTA DE ANIVERSARIANTES NA RECEPÇÃO
          </label>
          <label style={{ 
            display: "flex", alignItems: "center", gap: "16px", fontSize: "14px", fontWeight: 700, cursor: "pointer", 
            background: settings.notif_wod_tv ? "#F0FFF4" : "#F9F9F9", 
            padding: "16px", border: settings.notif_wod_tv ? "2px solid #000" : "1px solid #EEE",
            transition: "all 0.2s"
          }}>
            <input 
              type="checkbox" 
              checked={settings.notif_wod_tv} 
              onChange={(e) => handleChange("notif_wod_tv", e.target.checked)}
              style={{ width: "20px", height: "20px", accentColor: "#000" }} 
            />
            NOTIFICAR CHECK-IN NA TV DO BOX (WOD TV)
          </label>
          <label style={{ 
            display: "flex", alignItems: "center", gap: "16px", fontSize: "14px", fontWeight: 700, cursor: "pointer", 
            background: settings.notif_weekly_report ? "#F0FFF4" : "#F9F9F9", 
            padding: "16px", border: settings.notif_weekly_report ? "2px solid #000" : "1px solid #EEE",
            transition: "all 0.2s"
          }}>
            <input 
              type="checkbox" 
              checked={settings.notif_weekly_report} 
              onChange={(e) => handleChange("notif_weekly_report", e.target.checked)}
              style={{ width: "20px", height: "20px", accentColor: "#000" }} 
            />
            RELATÓRIO SEMANAL OPERACIONAL (E-MAIL)
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
              CONFIGURAÇÕES SALVAS!
            </>
          ) : saveStatus === "error" ? (
            <>
              <AlertCircle size={20} />
              ERRO AO SALVAR
            </>
          ) : (
            <>
              <Save size={20} />
              SALVAR CONFIGURAÇÕES GERAIS
            </>
          )}
        </button>
      </div>
    </div>
  );
}

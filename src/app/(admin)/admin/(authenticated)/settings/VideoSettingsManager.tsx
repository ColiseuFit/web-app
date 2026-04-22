"use client";

import { useState, useTransition, useEffect } from "react";
import { Video, Eye, ToggleLeft, ToggleRight, Loader2, Save, CheckCircle2, AlertCircle, Link2, Users, BarChart3 } from "lucide-react";
import { updateBoxSettingsAction } from "@/lib/constants/settings_actions";

interface VideoSettingsManagerProps {
  initialSettings: Record<string, string>;
  viewCount: number;
  totalStudents: number;
}

/**
 * VideoSettingsManager: Painel administrativo para gerenciar o Video Popup do app do aluno.
 * 
 * @architecture
 * - Iron Monolith Admin: Segue o design system das configurações existentes.
 * - SSoT: Lê/grava na tabela `box_settings` via `updateBoxSettingsAction`.
 * - Analytics: Exibe contagem de visualizações da tabela `video_views`.
 * 
 * @business-logic
 * - O admin pode ativar/desativar o popup sem alterar a URL.
 * - Mudar o `video_id` faz o vídeo reaparecer para TODOS os alunos (reset de localStorage).
 * - O campo de URL aceita YouTube, Vimeo e MP4 direto do Supabase Storage.
 */
export default function VideoSettingsManager({ initialSettings, viewCount, totalStudents }: VideoSettingsManagerProps) {
  const [isPending, startTransition] = useTransition();
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "success" | "error">("idle");

  const [settings, setSettings] = useState({
    featured_video_active: initialSettings.featured_video_active === "true",
    featured_video_url: initialSettings.featured_video_url || "",
    featured_video_title: initialSettings.featured_video_title || "",
    featured_video_id: initialSettings.featured_video_id || "video-001",
  });

  const handleChange = (key: string, value: string | boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    if (saveStatus !== "idle") setSaveStatus("idle");
  };

  const handleSave = async () => {
    setSaveStatus("saving");
    
    startTransition(async () => {
      const payload = {
        featured_video_active: String(settings.featured_video_active),
        featured_video_url: settings.featured_video_url,
        featured_video_title: settings.featured_video_title,
        featured_video_id: settings.featured_video_id,
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

  const viewPercentage = totalStudents > 0 ? Math.round((viewCount / totalStudents) * 100) : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      
      {/* ── ANALYTICS CARD ── */}
      <div className="admin-card" style={{ background: "#FAFAFA" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px", borderBottom: "2px solid #000", paddingBottom: "16px" }}>
          <BarChart3 size={24} />
          <h2 style={{ fontSize: "16px", fontWeight: 800, textTransform: "uppercase", margin: 0 }}>Analytics de Visualização</h2>
        </div>
        
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
          {/* Views */}
          <div style={{ 
            padding: "24px", 
            background: "#FFF", 
            border: "3px solid #000", 
            boxShadow: "4px 4px 0 #000",
            textAlign: "center"
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginBottom: "8px" }}>
              <Eye size={18} color="#E31B23" />
              <span style={{ fontSize: "10px", fontWeight: 900, letterSpacing: "0.1em", color: "#666" }}>VISUALIZAÇÕES</span>
            </div>
            <span style={{ fontSize: "36px", fontWeight: 900, color: "#000", lineHeight: 1 }}>{viewCount}</span>
          </div>
          
          {/* Total Students */}
          <div style={{ 
            padding: "24px", 
            background: "#FFF", 
            border: "3px solid #000", 
            boxShadow: "4px 4px 0 #000",
            textAlign: "center"
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginBottom: "8px" }}>
              <Users size={18} color="#2980BA" />
              <span style={{ fontSize: "10px", fontWeight: 900, letterSpacing: "0.1em", color: "#666" }}>TOTAL ALUNOS</span>
            </div>
            <span style={{ fontSize: "36px", fontWeight: 900, color: "#000", lineHeight: 1 }}>{totalStudents}</span>
          </div>
          
          {/* Reach % */}
          <div style={{ 
            padding: "24px", 
            background: viewPercentage >= 70 ? "#F0FFF4" : viewPercentage >= 30 ? "#FFFBEB" : "#FFF", 
            border: "3px solid #000", 
            boxShadow: `4px 4px 0 ${viewPercentage >= 70 ? "#2DAB61" : "#000"}`,
            textAlign: "center"
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginBottom: "8px" }}>
              <BarChart3 size={18} color={viewPercentage >= 70 ? "#2DAB61" : "#666"} />
              <span style={{ fontSize: "10px", fontWeight: 900, letterSpacing: "0.1em", color: "#666" }}>ALCANCE</span>
            </div>
            <span style={{ fontSize: "36px", fontWeight: 900, color: viewPercentage >= 70 ? "#2DAB61" : "#000", lineHeight: 1 }}>{viewPercentage}%</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div style={{ marginTop: "16px" }}>
          <div style={{ 
            width: "100%", 
            height: "12px", 
            background: "#E5E7EB", 
            border: "2px solid #000",
            overflow: "hidden"
          }}>
            <div style={{ 
              width: `${viewPercentage}%`, 
              height: "100%", 
              background: viewPercentage >= 70 ? "#2DAB61" : viewPercentage >= 30 ? "#F59E0B" : "#E31B23",
              transition: "width 0.5s ease"
            }} />
          </div>
          <p style={{ fontSize: "11px", fontWeight: 700, color: "#666", marginTop: "8px", textAlign: "center" }}>
            {viewCount} de {totalStudents} alunos assistiram ao vídeo &quot;{settings.featured_video_id}&quot;
          </p>
        </div>
      </div>

      {/* ── STATUS TOGGLE ── */}
      <div className="admin-card">
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px", borderBottom: "2px solid #000", paddingBottom: "16px" }}>
          <Video size={24} />
          <h2 style={{ fontSize: "16px", fontWeight: 800, textTransform: "uppercase", margin: 0 }}>Popup de Vídeo</h2>
        </div>
        
        {/* Active Toggle */}
        <button
          onClick={() => handleChange("featured_video_active", !settings.featured_video_active)}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            padding: "20px",
            background: settings.featured_video_active ? "#F0FFF4" : "#F9F9F9",
            border: settings.featured_video_active ? "3px solid #2DAB61" : "2px solid #E5E7EB",
            cursor: "pointer",
            marginBottom: "24px",
            transition: "all 0.2s"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{
              width: "12px",
              height: "12px",
              borderRadius: "50%",
              background: settings.featured_video_active ? "#2DAB61" : "#D1D5DB",
              border: "2px solid #000",
              boxShadow: settings.featured_video_active ? "0 0 8px rgba(45,171,97,0.4)" : "none"
            }} />
            <span style={{ fontSize: "14px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {settings.featured_video_active ? "POPUP ATIVO" : "POPUP DESATIVADO"}
            </span>
          </div>
          {settings.featured_video_active ? (
            <ToggleRight size={32} color="#2DAB61" />
          ) : (
            <ToggleLeft size={32} color="#999" />
          )}
        </button>

        {/* Form Fields */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Video ID */}
          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 900, marginBottom: "8px", color: "#666", letterSpacing: "0.05em" }}>
              IDENTIFICADOR DO VÍDEO
            </label>
            <input 
              type="text" 
              value={settings.featured_video_id} 
              onChange={(e) => handleChange("featured_video_id", e.target.value)}
              placeholder="Ex: running-hub-intro"
              style={{ 
                border: "2px solid #000", 
                fontWeight: 700, 
                width: "100%", 
                padding: "12px", 
                outline: "none",
                fontSize: "14px",
                fontFamily: "'Space Mono', monospace",
                background: "#FAFAFA"
              }} 
            />
            <p style={{ fontSize: "10px", color: "#999", marginTop: "4px", fontWeight: 600 }}>
              ⚠️ Alterar o ID faz o vídeo reaparecer para todos os alunos que já assistiram.
            </p>
          </div>
          
          {/* Video URL */}
          <div>
            <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", fontWeight: 900, marginBottom: "8px", color: "#666", letterSpacing: "0.05em" }}>
              <Link2 size={14} />
              URL DO VÍDEO
            </label>
            <input 
              type="url" 
              value={settings.featured_video_url} 
              onChange={(e) => handleChange("featured_video_url", e.target.value)}
              placeholder="https://supabase.co/.../video.mp4 ou YouTube/Vimeo link"
              style={{ 
                border: "2px solid #000", 
                fontWeight: 700, 
                width: "100%", 
                padding: "12px", 
                outline: "none",
                fontSize: "13px",
                background: "#FAFAFA"
              }} 
            />
            <p style={{ fontSize: "10px", color: "#999", marginTop: "4px", fontWeight: 600 }}>
              Aceita: YouTube, Vimeo ou MP4 direto (Supabase Storage).
            </p>
          </div>

          {/* Video Title (Accessibility/Meta) */}
          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 900, marginBottom: "8px", color: "#666", letterSpacing: "0.05em" }}>
              TÍTULO DO VÍDEO (INTERNO)
            </label>
            <input 
              type="text" 
              value={settings.featured_video_title} 
              onChange={(e) => handleChange("featured_video_title", e.target.value)}
              placeholder="Ex: Boas-vindas ao Running Hub"
              style={{ 
                border: "2px solid #000", 
                fontWeight: 700, 
                width: "100%", 
                padding: "12px", 
                outline: "none",
                fontSize: "14px",
                background: "#FAFAFA"
              }} 
            />
            <p style={{ fontSize: "10px", color: "#999", marginTop: "4px", fontWeight: 600 }}>
              Usado para identificação interna e acessibilidade. Não é exibido no popup.
            </p>
          </div>
        </div>

        {/* Preview */}
        {settings.featured_video_url && (
          <div style={{ marginTop: "24px", padding: "16px", background: "#F5F5F5", border: "2px dashed #CCC" }}>
            <p style={{ fontSize: "10px", fontWeight: 900, color: "#666", marginBottom: "8px", letterSpacing: "0.1em" }}>PRÉ-VISUALIZAÇÃO</p>
            <div style={{ 
              width: "120px", 
              aspectRatio: "9 / 16", 
              background: "#000", 
              border: "2px solid #000", 
              overflow: "hidden",
              margin: "0 auto"
            }}>
              {settings.featured_video_url.includes(".mp4") ? (
                <video 
                  src={settings.featured_video_url} 
                  muted 
                  playsInline
                  style={{ width: "100%", height: "100%", objectFit: "cover" }} 
                />
              ) : (
                <div style={{ 
                  width: "100%", 
                  height: "100%", 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "center" 
                }}>
                  <Video size={24} color="#666" />
                </div>
              )}
            </div>
          </div>
        )}
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
              SALVANDO CONFIGURAÇÕES...
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
              SALVAR CONFIGURAÇÕES DE VÍDEO
            </>
          )}
        </button>
      </div>
    </div>
  );
}

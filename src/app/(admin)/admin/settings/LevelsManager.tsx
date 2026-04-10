"use client";

import { useState, useEffect } from "react";
import { Edit2, Save, X, RotateCcw, AlertTriangle } from "lucide-react";
import { LevelInfo, LEVEL_CONFIG } from "@/lib/constants/levels";
import { getCachedLevels, updateLevelAction } from "@/lib/constants/levels_actions";
import Toast, { ToastStatus } from "@/components/Toast";
import AlertModal from "@/components/AlertModal";

/**
 * LevelsManager: The Administrative Methodology Interface.
 * 
 * @component
 * @description Provides a dense, operational view of technical levels.
 * Facilitates editing of names, colors, descriptions, and requirements.
 * 
 * @architecture
 */
interface LevelsManagerProps {
  initialLevels?: Record<string, LevelInfo>;
}

/**
 * LevelsManager: Gerencia a estrutura de Níveis Técnicos (Metodologia) do Box.
 * Permite CRUD de níveis com cores e nomes personalizados, servindo como SSoT para
 * a progressão técnica do aluno no aplicativo.
 * 
 * @security
 * - Ações via `updateLevelAction` (Sever Action).
 * - SSoT: Centraliza definições de competência visual e nominal.
 * 
 * @param {LevelsManagerProps} props - Mapeamento inicial de níveis vindo do servidor.
 */
export default function LevelsManager({ initialLevels }: LevelsManagerProps) {
  const [levels, setLevels] = useState<Record<string, LevelInfo>>(initialLevels || {});
  const [loading, setLoading] = useState(!initialLevels);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<LevelInfo>>({});
  const [isSaving, setIsSaving] = useState(false);
  
  const [toast, setToast] = useState<{ message: string; type: ToastStatus } | null>(null);
  const [alertConfig, setAlertConfig] = useState<{ title: string; message: string; type: "success" | "error" | "info" } | null>(null);

  useEffect(() => {
    if (initialLevels) return;
    async function load() {
      try {
        const data = await getCachedLevels();
        setLevels(data);
      } catch (e) {
        console.error("Erro ao carregar níveis dinâmicos:", e);
        setLevels(LEVEL_CONFIG);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleStartEdit = (level: LevelInfo) => {
    setEditingKey(level.key);
    setEditValues(level);
  };

  const handleCancelEdit = () => {
    setEditingKey(null);
    setEditValues({});
  };

  const handleSave = async () => {
    if (!editingKey) return;
    setIsSaving(true);
    try {
      await updateLevelAction(editingKey, editValues);
      
      // Update local state
      setLevels(prev => ({
        ...prev,
        [editingKey]: { ...prev[editingKey], ...editValues } as LevelInfo
      }));
      
      setEditingKey(null);
      setToast({ message: "Nível atualizado com sucesso!", type: "success" });
      setTimeout(() => setToast(null), 3000);
    } catch (e) {
      console.error(e);
      setAlertConfig({
        title: "ERRO AO SALVAR",
        message: "HOUVE UM ERRO AO ATUALIZAR AS DEFINIÇÕES DO NÍVEL TÉCNICO.",
        type: "error"
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return <div className="admin-card">Carregando níveis...</div>;
  }

  return (
    <div className="admin-card">
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px", borderBottom: "2px solid #000", paddingBottom: "16px" }}>
        <RotateCcw size={24} />
        <h2 style={{ fontSize: "16px", fontWeight: 800, textTransform: "uppercase", margin: 0 }}>Níveis Técnicos (Coliseu Levels)</h2>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {Object.values(levels).sort((a, b) => (a.order || 0) - (b.order || 0)).map((level) => {
          const isEditing = editingKey === level.key;

          return (
            <div 
              key={level.key}
              style={{ 
                border: "2px solid #000", 
                padding: "20px", 
                background: isEditing ? "#F9F9F9" : "#FFF",
                transition: "all 0.2s ease"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: isEditing ? "20px" : "0" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{ 
                    width: "14px", 
                    height: "14px", 
                    borderRadius: "50%", 
                    background: isEditing 
                      ? (editValues.color?.startsWith('var') ? "#000" : editValues.color) 
                      : (level.color?.startsWith('var') ? "#000" : level.color),
                    border: "2px solid #000",
                    boxShadow: "2px 2px 0 #000"
                  }} />
                  <span style={{ fontSize: "16px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "-0.02em" }}>NÍVEL {level.order}: {level.label}</span>
                </div>
                
                {!isEditing ? (
                  <button 
                    onClick={() => handleStartEdit(level)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#666" }}
                  >
                    <Edit2 size={18} />
                  </button>
                ) : (
                  <div style={{ display: "flex", gap: "12px" }}>
                    <button 
                      onClick={handleCancelEdit}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "#666" }}
                      disabled={isSaving}
                    >
                      <X size={18} />
                    </button>
                    <button 
                      onClick={handleSave}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "#16A34A" }}
                      disabled={isSaving}
                    >
                      <Save size={18} />
                    </button>
                  </div>
                )}
              </div>

              {isEditing ? (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                  <div>
                    <label style={{ fontSize: "11px", fontWeight: 700, color: "#666", marginBottom: "8px", display: "block" }}>NOME EXIBIDO</label>
                    <input 
                      type="text" 
                      value={editValues.label} 
                      onChange={e => setEditValues({...editValues, label: e.target.value})}
                      style={{ width: "100%", padding: "10px", border: "2px solid #000", fontWeight: 700 }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "11px", fontWeight: 700, color: "#666", marginBottom: "8px", display: "block" }}>COR (HEX)</label>
                    <input 
                      type="text" 
                      value={editValues.color} 
                      onChange={e => setEditValues({...editValues, color: e.target.value})}
                      style={{ width: "100%", padding: "10px", border: "2px solid #000", fontWeight: 700 }}
                    />
                  </div>
                  <div style={{ gridColumn: "span 2" }}>
                    <label style={{ fontSize: "11px", fontWeight: 700, color: "#666", marginBottom: "8px", display: "block" }}>DESCRIÇÃO TÉCNICA</label>
                    <textarea 
                      value={editValues.description} 
                      onChange={e => setEditValues({...editValues, description: e.target.value})}
                      rows={3}
                      style={{ width: "100%", padding: "10px", border: "2px solid #000", fontWeight: 500, fontFamily: "inherit" }}
                    />
                  </div>
                  <div style={{ gridColumn: "span 2" }}>
                    <label style={{ fontSize: "11px", fontWeight: 700, color: "#666", marginBottom: "8px", display: "block" }}>REQUISITOS P/ GRADUAÇÃO</label>
                    <input 
                      type="text" 
                      value={editValues.requirements} 
                      onChange={e => setEditValues({...editValues, requirements: e.target.value})}
                      style={{ width: "100%", padding: "10px", border: "2px solid #000", fontWeight: 500 }}
                    />
                  </div>
                </div>
              ) : (
                <div style={{ marginTop: "12px", fontSize: "13px", color: "#666", lineHeight: 1.5 }}>
                  <p style={{ margin: 0 }}>{level.description}</p>
                  <p style={{ margin: "4px 0 0", fontStyle: "italic", fontWeight: 600 }}>{level.requirements}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: "24px", padding: "16px", background: "#FFFBEB", border: "1px solid #FEF3C7", borderRadius: "4px", display: "flex", gap: "12px" }}>
        <AlertTriangle size={20} color="#D97706" />
        <p style={{ fontSize: "12px", color: "#92400E", margin: 0, fontWeight: 500 }}>
          <strong>Atenção:</strong> Alterar a chave (key) dos níveis pode quebrar o vínculo com os perfis dos alunos. 
          Recomendamos editar apenas os nomes de exibição, cores e requisitos técnicos.
        </p>
      </div>

      {/* ── CENTRALIZED FEEDBACK ── */}
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}

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

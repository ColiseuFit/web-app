"use client";

import React, { useState } from "react";
import { Plus, Zap, Timer, X, Folder, Trash2 } from "lucide-react";
import { createRunningTemplate, deleteRunningTemplate } from "@/lib/actions/running_actions";
import TemplateWorkoutsManager from "./TemplateWorkoutsManager";

export default function TemplatesClient({ initialTemplates }: { initialTemplates: any[] }) {
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<any | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const formData = new FormData(e.currentTarget);
    try {
      await createRunningTemplate(formData);
      setIsCreating(false);
    } catch (err: any) {
      setError(err.message || "Erro ao criar template");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTemplate = async (id: string, title: string) => {
    if (!confirm(`Tem certeza que deseja excluir a planilha "${title}"? Isso removerá todos os treinos vinculados a este modelo.`)) return;
    try {
      await deleteRunningTemplate(id);
    } catch (err: any) {
      alert(err.message || "Erro ao deletar planilha");
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 24 }}>
        <button 
          onClick={() => setIsCreating(!isCreating)}
          className="nb-button"
          style={{ 
            background: isCreating ? "#666" : "var(--nb-yellow)", 
            color: isCreating ? "#FFF" : "#000",
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 16px",
            fontWeight: 900
          }}
        >
          {isCreating ? "CANCELAR" : <><Plus size={16} /> NOVA PLANILHA PADRÃO</>}
        </button>
      </div>

      {isCreating && (
        <form onSubmit={handleSubmit} className="nb-card" style={{ padding: 24, background: "#FFF", marginBottom: 32 }}>
          <h2 style={{ fontSize: 18, fontWeight: 950, marginBottom: 16 }}>Criar Nova Planilha Padrão</h2>
          {error && <div style={{ color: "var(--nb-red)", marginBottom: 16, fontWeight: "bold" }}>{error}</div>}
          
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16, marginBottom: 24 }}>
            <div>
              <label style={{ display: "block", fontSize: 10, fontWeight: 900, marginBottom: 4 }}>TÍTULO (Ex: Iniciante 3x)</label>
              <input name="title" required className="nb-input" style={{ width: "100%", padding: 12 }} />
            </div>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 10, fontWeight: 900, marginBottom: 4 }}>NÍVEL</label>
                <select name="levelTag" className="nb-input" style={{ width: "100%", padding: 12 }}>
                  <option value="iniciante">Iniciante</option>
                  <option value="intermediario">Intermediário</option>
                  <option value="avancado">Avançado</option>
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 10, fontWeight: 900, marginBottom: 4 }}>SESSÕES P/ SEMANA</label>
                <input name="frequencyPerWeek" type="number" min="1" max="7" defaultValue="3" required className="nb-input" style={{ width: "100%", padding: 12 }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 10, fontWeight: 900, marginBottom: 4 }}>DURAÇÃO (Semanas)</label>
                <input name="durationWeeks" type="number" min="1" max="24" defaultValue="8" required className="nb-input" style={{ width: "100%", padding: 12 }} />
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 10, fontWeight: 900, marginBottom: 4 }}>DESCRIÇÃO (Opcional)</label>
              <textarea name="description" className="nb-input" style={{ width: "100%", padding: 12 }} rows={3} />
            </div>
          </div>

          <button type="submit" disabled={loading} className="nb-button" style={{ width: "100%", padding: 16, background: "#000", color: "#FFF" }}>
            {loading ? "SALVANDO..." : "SALVAR PLANILHA"}
          </button>
        </form>
      )}

      {/* LISTA DE TEMPLATES */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        {initialTemplates.map(t => (
          <div key={t.id} className="nb-card" style={{ padding: 24, background: "#FFF", position: "relative" }}>
             <div style={{ 
               position: "absolute", top: -12, right: 16, 
               background: "var(--nb-yellow)", padding: "4px 12px", border: "2px solid #000",
               fontSize: 10, fontWeight: 950, textTransform: "uppercase"
             }}>
               {t.level_tag}
             </div>
             <h3 style={{ fontSize: 20, fontWeight: 950, marginTop: 0, marginBottom: 8 }}>{t.title}</h3>
             <p style={{ fontSize: 12, color: "#666", marginBottom: 16 }}>{t.description || "Sem descrição"}</p>
             
             <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Zap size={14} /> <span style={{ fontSize: 12, fontWeight: 900 }}>{t.frequency_per_week}x/semana</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Timer size={14} /> <span style={{ fontSize: 12, fontWeight: 900 }}>{t.duration_weeks} semanas</span>
                </div>
                <button 
                   onClick={() => handleDeleteTemplate(t.id, t.title)}
                   style={{ 
                     marginLeft: "auto",
                     background: "none",
                     border: "none",
                     color: "#CCC",
                     cursor: "pointer",
                     display: "flex",
                     alignItems: "center",
                     transition: "color 0.2s"
                   }}
                   onMouseOver={(e) => e.currentTarget.style.color = "#EF4444"}
                   onMouseOut={(e) => e.currentTarget.style.color = "#CCC"}
                   title="Excluir Planilha"
                 >
                    <Trash2 size={16} />
                 </button>
             </div>

             <div style={{ marginTop: 24, paddingTop: 16, borderTop: "2px dashed #EEE", textAlign: "center" }}>
                <button 
                  onClick={() => setSelectedTemplate(t)}
                  className="nb-button"
                  style={{ 
                    width: "100%", 
                    padding: "10px", 
                    background: "var(--nb-blue)", 
                    color: "#FFF",
                    fontSize: 11,
                    fontWeight: 900,
                    cursor: "pointer"
                  }}
                >
                  GERENCIAR {t.running_template_workouts?.length || 0} TREINOS
                </button>
             </div>
          </div>
        ))}

        {initialTemplates.length === 0 && !isCreating && (
          <div style={{ gridColumn: "span 2", textAlign: "center", padding: 40, background: "#F9F9F9", border: "3px dashed #CCC" }}>
             <p style={{ fontWeight: 900, color: "#999" }}>NENHUMA PLANILHA CADASTRADA</p>
          </div>
        )}
      </div>

      {/* MODAL DE GERENCIAMENTO DE TREINOS */}
      {selectedTemplate && (
        <div style={{
          position: "fixed",
          inset: 0,
          zIndex: 300,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          padding: 20,
        }}>
          <div
            style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)" }}
            onClick={() => setSelectedTemplate(null)}
          />

          <div style={{
            position: "relative",
            width: "100%",
            maxWidth: 800,
            background: "#F8F8F8",
            border: "4px solid #000",
            display: "flex",
            flexDirection: "column",
            maxHeight: "92vh",
            boxShadow: "32px 32px 0px rgba(0,0,0,0.1)",
          }}>
            <div style={{
              padding: "20px 28px",
              borderBottom: "3px solid #000",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "#000",
              color: "#FFF",
              flexShrink: 0,
            }}>
              <h2 style={{ fontSize: 16, fontWeight: 950, textTransform: "uppercase", margin: 0 }}>
                Estrutura: {selectedTemplate.title}
              </h2>
              <button
                onClick={() => setSelectedTemplate(null)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#FFF" }}
              >
                <X size={24} />
              </button>
            </div>

            <div style={{ overflowY: "auto", flex: 1, padding: 24 }}>
              <TemplateWorkoutsManager 
                template={selectedTemplate} 
                onUpdate={() => {
                  window.location.reload(); 
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

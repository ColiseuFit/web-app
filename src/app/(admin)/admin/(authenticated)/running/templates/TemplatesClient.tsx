"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Plus, Zap, Timer, X, Folder, Trash2, ArrowRightCircle, ArrowLeft, Copy } from "lucide-react";
import { useRouter } from "next/navigation";
import { createRunningTemplate, deleteRunningTemplate, duplicateRunningTemplate } from "@/lib/actions/running_actions";
import TemplateWorkoutsManager from "./TemplateWorkoutsManager";

export default function TemplatesClient({ initialTemplates }: { initialTemplates: any[] }) {
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<any | null>(null);
  const router = useRouter();

  // Sincronizar o template selecionado com os dados atualizados que vêm do servidor
  const currentTemplate = selectedTemplate 
    ? initialTemplates.find(t => t.id === selectedTemplate.id) 
    : null;

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

  const handleDuplicateTemplate = async (id: string) => {
    setLoading(true);
    try {
      await duplicateRunningTemplate(id);
    } catch (err: any) {
      alert(err.message || "Erro ao duplicar planilha");
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
    <div style={{ position: "relative" }}>
      {/* HEADER PREMIUM */}
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "flex-end", 
        marginBottom: 48,
        borderBottom: "4px solid #000",
        paddingBottom: 24
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <Link href="/admin/running" style={{ 
            width: "56px",
            height: "56px",
            background: "#000", 
            color: "#FFF", 
            borderRadius: 4,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "6px 6px 0px var(--nb-yellow)",
            border: "3px solid #000",
            transition: "all 0.2s"
          }} onMouseOver={e => e.currentTarget.style.transform = "translate(-2px, -2px)"} onMouseOut={e => e.currentTarget.style.transform = "none"}>
            <ArrowLeft size={28} />
          </Link>
          <div>
            <h1 style={{ fontSize: 42, fontWeight: 950, margin: 0, textTransform: "uppercase", letterSpacing: "-0.04em", lineHeight: 1 }}>Planilhas <span style={{ color: "var(--nb-yellow)" }}>Padrão</span></h1>
            <p style={{ margin: "8px 0 0 0", fontSize: 14, color: "#666", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em" }}>Hub de Inteligência e Periodização de Corrida</p>
          </div>
        </div>

        {/* BOTÃO DE NOVA PLANILHA INTEGRADO NO HEADER */}
        <button 
          onClick={() => setIsCreating(!isCreating)} 
          className="nb-button" 
          style={{ 
            padding: "16px 32px", 
            background: "var(--nb-yellow)", 
            color: "#000", 
            fontWeight: 950,
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            gap: 12,
            boxShadow: "6px 6px 0px #000",
            border: "3px solid #000",
            letterSpacing: "0.05em",
            transition: "all 0.1s"
          }}
          onMouseDown={e => e.currentTarget.style.transform = "translate(2px, 2px)"}
          onMouseUp={e => e.currentTarget.style.transform = "none"}
        >
          {isCreating ? <X size={20} /> : <Plus size={20} />}
          {isCreating ? "CANCELAR" : "NOVA PLANILHA PADRÃO"}
        </button>
      </div>

      {isCreating && (
        <div className="nb-card animate-in" style={{ padding: 32, background: "#FFF", marginBottom: 48, border: "4px solid #000", boxShadow: "12px 12px 0px #000" }}>
          <h2 style={{ fontSize: 20, fontWeight: 950, marginBottom: 24, textTransform: "uppercase", letterSpacing: "-0.02em" }}>Configurar Nova Planilha</h2>
          <form onSubmit={handleSubmit} style={{ display: "grid", gap: 24 }}>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 20 }}>
              <div>
                <label style={{ display: "block", fontSize: 10, fontWeight: 900, marginBottom: 6, textTransform: "uppercase" }}>TÍTULO DA PLANILHA</label>
                <input name="title" placeholder="Ex: Maratona Sub-4h" required className="nb-input" style={{ width: "100%", padding: 14 }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 10, fontWeight: 900, marginBottom: 6, textTransform: "uppercase" }}>NÍVEL</label>
                <select name="levelTag" className="nb-input" style={{ width: "100%", padding: 14 }}>
                  <option value="iniciante">Iniciante</option>
                  <option value="intermediario">Intermediário</option>
                  <option value="avancado">Avançado</option>
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 10, fontWeight: 900, marginBottom: 6, textTransform: "uppercase" }}>DURAÇÃO (SEMANAS)</label>
                <input name="durationWeeks" type="number" min="1" max="24" defaultValue="8" required className="nb-input" style={{ width: "100%", padding: 14 }} />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 20 }}>
              <div>
                <label style={{ display: "block", fontSize: 10, fontWeight: 900, marginBottom: 6, textTransform: "uppercase" }}>FREQ. SEMANAL</label>
                <input name="frequencyPerWeek" type="number" min="1" max="7" defaultValue="3" required className="nb-input" style={{ width: "100%", padding: 14 }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 10, fontWeight: 900, marginBottom: 6, textTransform: "uppercase" }}>DESCRIÇÃO BREVE (OBJETIVO)</label>
                <input name="description" placeholder="Ex: Foco em resistência aeróbica e base." className="nb-input" style={{ width: "100%", padding: 14 }} />
              </div>
            </div>

            <button type="submit" disabled={loading} className="nb-button" style={{ width: "100%", padding: 20, background: "#000", color: "#FFF", fontWeight: 950, fontSize: 14, boxShadow: "4px 4px 0px var(--nb-yellow)" }}>
              {loading ? "PROCESSANDO..." : "CRIAR PLANILHA PADRÃO"}
            </button>
            {error && <p style={{ color: "#EF4444", fontWeight: 700, textAlign: "center", margin: 0 }}>{error}</p>}
          </form>
        </div>
      )}

      {/* LISTA DE TEMPLATES */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(420px, 1fr))", gap: 40 }}>
        {initialTemplates.map(t => {
          const levelLabels: Record<string, { label: string, color: string }> = {
            'beginner': { label: 'Iniciante', color: 'var(--nb-yellow)' },
            'iniciante': { label: 'Iniciante', color: 'var(--nb-yellow)' },
            'intermediate': { label: 'Intermediário', color: 'var(--nb-blue)' },
            'intermediario': { label: 'Intermediário', color: 'var(--nb-blue)' },
            'advanced': { label: 'Avançado', color: '#000' },
            'avancado': { label: 'Avançado', color: '#000' }
          };
          
          const levelInfo = levelLabels[t.level_tag] || { label: t.level_tag, color: '#EEE' };
          const totalKm = (t.running_template_workouts || []).reduce((acc: number, w: any) => acc + (w.target_distance_km || 0), 0);

          return (
            <div key={t.id} className="nb-card" style={{ 
              padding: 0, 
              background: "#FFF", 
              position: "relative",
              border: "4px solid #000",
              boxShadow: "10px 10px 0px #000",
              display: "flex",
              flexDirection: "column",
              transition: "transform 0.2s"
            }}>
               {/* Badge de Nível Flutuante */}
               <div style={{ 
                 position: "absolute", top: -20, right: 24, 
                 background: levelInfo.color, 
                 color: levelInfo.color === '#000' ? '#FFF' : '#000',
                 padding: "8px 20px", 
                 border: "4px solid #000",
                 fontSize: 12, 
                 fontWeight: 950, 
                 textTransform: "uppercase",
                 boxShadow: "4px 4px 0px rgba(0,0,0,0.1)",
                 zIndex: 10
               }}>
                 {levelInfo.label}
               </div>

               <div style={{ padding: 32, flex: 1 }}>
                 <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                   <div style={{ flex: 1 }}>
                     <h3 style={{ fontSize: 28, fontWeight: 950, margin: 0, letterSpacing: "-0.04em", textTransform: "uppercase", lineHeight: 1.1 }}>{t.title}</h3>
                     <p style={{ fontSize: 14, color: "#666", marginTop: 8, lineHeight: 1.5, fontWeight: 500, maxWidth: "90%" }}>{t.description || "Template estruturado para periodização personalizada."}</p>
                   </div>
                   
                   <div style={{ display: "flex", gap: 10 }}>
                     <button 
                        onClick={() => handleDuplicateTemplate(t.id)}
                        disabled={loading}
                        style={{ 
                          width: 42, height: 42, background: "#FFF", border: "3px solid #000", 
                          display: "flex", alignItems: "center", justifyContent: "center", 
                          cursor: "pointer", boxShadow: "4px 4px 0px #000" 
                        }}
                        title="Duplicar"
                      >
                         <Copy size={18} />
                      </button>
                      <button 
                         onClick={() => handleDeleteTemplate(t.id, t.title)}
                         disabled={loading}
                         style={{ 
                           width: 42, height: 42, background: "#FFF", border: "3px solid #000", 
                           display: "flex", alignItems: "center", justifyContent: "center", 
                           cursor: "pointer", color: "#EF4444", boxShadow: "4px 4px 0px #000" 
                         }}
                         title="Excluir"
                      >
                         <Trash2 size={18} />
                      </button>
                   </div>
                 </div>

                 {/* Grid de Métricas Industrial */}
                 <div style={{ 
                   display: "grid", 
                   gridTemplateColumns: "1fr 1fr 1fr", 
                   gap: 3, 
                   background: "#000", 
                   border: "3px solid #000",
                   marginTop: 32,
                   marginBottom: 8
                 }}>
                    <div style={{ background: "#F8FAFC", padding: "20px 12px", textAlign: "center" }}>
                      <span style={{ fontSize: 8, fontWeight: 900, color: "#94A3B8", textTransform: "uppercase", display: "block", marginBottom: 6 }}>Treinos/Sem</span>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                        <Zap size={16} color="var(--nb-yellow)" fill="var(--nb-yellow)" /> 
                        <span style={{ fontSize: 18, fontWeight: 950 }}>{t.frequency_per_week}x</span>
                      </div>
                    </div>
                    <div style={{ background: "#F8FAFC", padding: "20px 12px", textAlign: "center" }}>
                      <span style={{ fontSize: 8, fontWeight: 900, color: "#94A3B8", textTransform: "uppercase", display: "block", marginBottom: 6 }}>Duração</span>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                        <Timer size={16} color="var(--nb-blue)" /> 
                        <span style={{ fontSize: 18, fontWeight: 950 }}>{t.duration_weeks}w</span>
                      </div>
                    </div>
                    <div style={{ background: "#F8FAFC", padding: "20px 12px", textAlign: "center" }}>
                      <span style={{ fontSize: 8, fontWeight: 900, color: "#94A3B8", textTransform: "uppercase", display: "block", marginBottom: 6 }}>Volume KM</span>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                        <ArrowRightCircle size={16} color="#000" /> 
                        <span style={{ fontSize: 18, fontWeight: 950 }}>{totalKm.toFixed(0)}</span>
                      </div>
                    </div>
                 </div>
               </div>

               <button 
                 onClick={() => setSelectedTemplate(t)}
                 className="nb-button"
                 style={{ 
                   width: "100%", 
                   padding: 24, 
                   background: "#000", 
                   color: "#FFF", 
                   fontSize: 13, 
                   fontWeight: 950, 
                   letterSpacing: "0.15em",
                   border: "none",
                   borderTop: "4px solid #000",
                   borderRadius: 0,
                   cursor: "pointer",
                   display: "flex",
                   alignItems: "center",
                   justifyContent: "center",
                   gap: 16
                 }}
               >
                 GERENCIAR {t.running_template_workouts?.length || 0} BLOCOS ESTRUTURADOS
               </button>
            </div>
          );
        })}

        {initialTemplates.length === 0 && !isCreating && (
          <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: 80, background: "#FFF", border: "4px dashed #000", boxShadow: "10px 10px 0px rgba(0,0,0,0.05)" }}>
             <Folder size={48} color="#CCC" style={{ marginBottom: 16, margin: "0 auto" }} />
             <p style={{ fontWeight: 950, color: "#999", fontSize: 14, letterSpacing: "0.1em" }}>NENHUMA PLANILHA CADASTRADA NO MOMENTO</p>
          </div>
        )}
      </div>

      {/* MODAL DE GERENCIAMENTO DE TREINOS (EXPANDIDO) */}
      {selectedTemplate && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 1000,
          background: "rgba(0,0,0,0.85)", backdropFilter: "blur(10px)",
          display: "flex", justifyContent: "center", alignItems: "center",
          padding: 40
        }}>
          <div className="nb-card animate-in" style={{ 
            width: "100%", maxWidth: 1280, maxHeight: "90vh", 
            background: "#FFF", display: "flex", flexDirection: "column",
            border: "8px solid #000", boxShadow: "30px 30px 0px #000"
          }}>
            <div style={{ 
              padding: "24px 40px", borderBottom: "8px solid #000", 
              display: "flex", justifyContent: "space-between", alignItems: "center",
              background: "var(--nb-yellow)"
            }}>
              <div>
                <h2 style={{ fontSize: 28, fontWeight: 950, margin: 0, textTransform: "uppercase", letterSpacing: "-0.03em", lineHeight: 1 }}>{selectedTemplate.title}</h2>
                <p style={{ margin: "4px 0 0 0", fontSize: 13, fontWeight: 800, opacity: 0.9, textTransform: "uppercase", letterSpacing: "0.05em" }}>Painel de Engenharia de Treino</p>
              </div>
              <button 
                onClick={() => setSelectedTemplate(null)}
                style={{ 
                  background: "#000", color: "#FFF", border: "4px solid #000", padding: 12, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "4px 4px 0px rgba(255,255,255,0.3)"
                }}
              >
                <X size={28} />
              </button>
            </div>

            <div style={{ overflowY: "auto", flex: 1, padding: 40, background: "#F5F5F5" }}>
              <TemplateWorkoutsManager 
                template={currentTemplate || selectedTemplate} 
                onUpdate={() => {
                  router.refresh();
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

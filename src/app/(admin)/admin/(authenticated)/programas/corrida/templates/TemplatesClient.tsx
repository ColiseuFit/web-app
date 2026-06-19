"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Plus, Zap, Timer, X, Folder, Trash2, ArrowRightCircle, ArrowLeft, Copy, Pencil, Check, Settings2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { createRunningTemplate, deleteRunningTemplate, duplicateRunningTemplate, updateRunningTemplate } from "@/lib/actions/running_actions";
import TemplateWorkoutsManager from "./TemplateWorkoutsManager";

export default function TemplatesClient({ initialTemplates }: { initialTemplates: any[] }) {
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<any | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<any | null>(null);
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

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const formData = new FormData(e.currentTarget);
    try {
      await updateRunningTemplate(formData);
      setEditingTemplate(null);
    } catch (err: any) {
      setError(err.message || "Erro ao atualizar planilha");
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

  const levelConfig: Record<string, { label: string; color: string; textColor: string }> = {
    beginner:      { label: "Iniciante",    color: "var(--nb-yellow)", textColor: "#000" },
    iniciante:     { label: "Iniciante",    color: "var(--nb-yellow)", textColor: "#000" },
    intermediate:  { label: "Intermediário", color: "var(--nb-blue)",   textColor: "#FFF" },
    intermediario: { label: "Intermediário", color: "var(--nb-blue)",   textColor: "#FFF" },
    advanced:      { label: "Avançado",     color: "#111",             textColor: "#FFF" },
    avancado:      { label: "Avançado",     color: "#111",             textColor: "#FFF" },
  };

  return (
    <div style={{ position: "relative" }}>

      {/* ── HEADER DA PÁGINA ─────────────────────────────────────────── */}
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
            width: 56, height: 56,
            background: "#000", color: "#FFF",
            borderRadius: 4,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "6px 6px 0px var(--nb-yellow)",
            border: "3px solid #000",
            transition: "all 0.2s"
          }}
            onMouseOver={e => e.currentTarget.style.transform = "translate(-2px, -2px)"}
            onMouseOut={e => e.currentTarget.style.transform = "none"}
          >
            <ArrowLeft size={28} />
          </Link>
          <div>
            <h1 style={{ fontSize: 42, fontWeight: 950, margin: 0, textTransform: "uppercase", letterSpacing: "-0.04em", lineHeight: 1 }}>
              Planilhas <span style={{ color: "var(--nb-yellow)" }}>Padrão</span>
            </h1>
            <p style={{ margin: "8px 0 0 0", fontSize: 14, color: "#666", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em" }}>
              Hub de Inteligência e Periodização de Corrida
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsCreating(!isCreating)}
          className="nb-button"
          style={{
            padding: "16px 32px",
            background: isCreating ? "#EEE" : "var(--nb-yellow)",
            color: "#000",
            fontWeight: 950, fontSize: 13,
            display: "flex", alignItems: "center", gap: 12,
            boxShadow: isCreating ? "none" : "6px 6px 0px #000",
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

      {/* ── FORMULÁRIO DE CRIAÇÃO ─────────────────────────────────────── */}
      {isCreating && (
        <div className="nb-card animate-in" style={{
          padding: 32, background: "#FFF", marginBottom: 48,
          border: "4px solid #000", boxShadow: "12px 12px 0px #000"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
            <div style={{ width: 6, height: 32, background: "var(--nb-yellow)" }} />
            <h2 style={{ fontSize: 18, fontWeight: 950, margin: 0, textTransform: "uppercase", letterSpacing: "-0.02em" }}>
              Configurar Nova Planilha
            </h2>
          </div>
          <form onSubmit={handleSubmit} style={{ display: "grid", gap: 20 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr 1fr 1fr", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 10, fontWeight: 900, marginBottom: 6, textTransform: "uppercase", color: "#666" }}>ID</label>
                <input name="numericId" placeholder="Ex: 02" className="nb-input" style={{ width: "100%", padding: 14 }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 10, fontWeight: 900, marginBottom: 6, textTransform: "uppercase", color: "#666" }}>Título da Planilha</label>
                <input name="title" placeholder="Ex: Maratona Sub-4h" required className="nb-input" style={{ width: "100%", padding: 14 }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 10, fontWeight: 900, marginBottom: 6, textTransform: "uppercase", color: "#666" }}>Nível</label>
                <select name="levelTag" className="nb-input" style={{ width: "100%", padding: 14 }}>
                  <option value="iniciante">Iniciante</option>
                  <option value="intermediario">Intermediário</option>
                  <option value="avancado">Avançado</option>
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 10, fontWeight: 900, marginBottom: 6, textTransform: "uppercase", color: "#666" }}>Duração (Semanas)</label>
                <input name="durationWeeks" type="number" min="1" max="24" defaultValue="8" required className="nb-input" style={{ width: "100%", padding: 14 }} />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 10, fontWeight: 900, marginBottom: 6, textTransform: "uppercase", color: "#666" }}>Freq. Semanal</label>
                <input name="frequencyPerWeek" type="number" min="1" max="7" defaultValue="3" required className="nb-input" style={{ width: "100%", padding: 14 }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 10, fontWeight: 900, marginBottom: 6, textTransform: "uppercase", color: "#666" }}>Descrição Breve (Objetivo)</label>
                <input name="description" placeholder="Ex: Foco em resistência aeróbica e base." className="nb-input" style={{ width: "100%", padding: 14 }} />
              </div>
            </div>
            <button type="submit" disabled={loading} className="nb-button" style={{
              width: "100%", padding: 18,
              background: "#000", color: "#FFF",
              fontWeight: 950, fontSize: 13,
              boxShadow: "4px 4px 0px var(--nb-yellow)"
            }}>
              {loading ? "PROCESSANDO..." : "⚡ CRIAR PLANILHA PADRÃO"}
            </button>
            {error && <p style={{ color: "#EF4444", fontWeight: 700, textAlign: "center", margin: 0 }}>{error}</p>}
          </form>
        </div>
      )}

      {/* ── GRADE DE CARDS ───────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(440px, 1fr))", gap: 32 }}>
        {initialTemplates.map(t => {
          const level = levelConfig[t.level_tag] || { label: t.level_tag, color: "#EEE", textColor: "#000" };
          const totalKm = (t.running_template_workouts || []).reduce((acc: number, w: any) => {
            const dist = parseFloat(String(w.target_distance_km)) || 0;
            const reps = w.reps || 1;
            const unit = w.target_unit?.toLowerCase() || "km";
            if (unit === "min") return acc;
            if (unit === "m") return acc + (dist * reps) / 1000;
            return acc + dist * reps;
          }, 0);

          const isEditing = editingTemplate?.id === t.id;

          return (
            <div key={t.id} style={{
              background: "#FFF",
              border: "4px solid #000",
              boxShadow: isEditing ? "12px 12px 0px var(--nb-yellow)" : "10px 10px 0px #000",
              display: "flex",
              flexDirection: "column",
              transition: "box-shadow 0.2s",
              overflow: "hidden"
            }}>

              {/* ── HEADER DO CARD (faixa colorida) ── */}
              <div style={{
                background: level.color,
                borderBottom: "4px solid #000",
                padding: "16px 20px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}>
                <span style={{
                  fontSize: 11, fontWeight: 950,
                  textTransform: "uppercase", letterSpacing: "0.12em",
                  color: level.textColor
                }}>
                  {level.label}
                </span>

                {/* Toolbar de ações */}
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    onClick={() => { setEditingTemplate(isEditing ? null : t); setError(""); }}
                    disabled={loading}
                    title="Editar informações"
                    style={{
                      width: 34, height: 34,
                      background: isEditing ? "#000" : "rgba(0,0,0,0.15)",
                      color: isEditing ? level.color : level.textColor,
                      border: "2px solid rgba(0,0,0,0.3)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      cursor: "pointer", borderRadius: 2,
                      transition: "all 0.15s"
                    }}
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => handleDuplicateTemplate(t.id)}
                    disabled={loading}
                    title="Duplicar planilha"
                    style={{
                      width: 34, height: 34,
                      background: "rgba(0,0,0,0.15)",
                      color: level.textColor,
                      border: "2px solid rgba(0,0,0,0.3)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      cursor: "pointer", borderRadius: 2,
                      transition: "all 0.15s"
                    }}
                  >
                    <Copy size={15} />
                  </button>
                  <button
                    onClick={() => handleDeleteTemplate(t.id, t.title)}
                    disabled={loading}
                    title="Excluir planilha"
                    style={{
                      width: 34, height: 34,
                      background: "rgba(200,0,0,0.15)",
                      color: "#C00",
                      border: "2px solid rgba(200,0,0,0.3)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      cursor: "pointer", borderRadius: 2,
                      transition: "all 0.15s"
                    }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              {/* ── FORMULÁRIO DE EDIÇÃO (substitui o corpo quando ativo) ── */}
              {isEditing ? (
                <div style={{ padding: "24px 24px 20px", flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                    <Settings2 size={16} />
                    <span style={{ fontSize: 11, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                      Editando informações
                    </span>
                  </div>
                  <form onSubmit={handleEditSubmit} style={{ display: "grid", gap: 14 }}>
                    <input type="hidden" name="templateId" value={t.id} />
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 3fr", gap: 10 }}>
                      <div>
                        <label style={{ display: "block", fontSize: 9, fontWeight: 900, marginBottom: 4, textTransform: "uppercase", color: "#666" }}>ID</label>
                        <input name="numericId" defaultValue={t.numeric_id || ""} placeholder="Ex: 02" className="nb-input" style={{ width: "100%", padding: 10 }} />
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: 9, fontWeight: 900, marginBottom: 4, textTransform: "uppercase", color: "#666" }}>Título</label>
                        <input name="title" defaultValue={t.title} required className="nb-input" style={{ width: "100%", padding: 10 }} />
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                      <div>
                        <label style={{ display: "block", fontSize: 9, fontWeight: 900, marginBottom: 4, textTransform: "uppercase", color: "#666" }}>Nível</label>
                        <select name="levelTag" defaultValue={t.level_tag} className="nb-input" style={{ width: "100%", padding: 10 }}>
                          <option value="iniciante">Iniciante</option>
                          <option value="intermediario">Intermediário</option>
                          <option value="avancado">Avançado</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: 9, fontWeight: 900, marginBottom: 4, textTransform: "uppercase", color: "#666" }}>Semanas</label>
                        <input name="durationWeeks" type="number" min="1" max="24" defaultValue={t.duration_weeks} required className="nb-input" style={{ width: "100%", padding: 10 }} />
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: 9, fontWeight: 900, marginBottom: 4, textTransform: "uppercase", color: "#666" }}>Freq./Sem</label>
                        <input name="frequencyPerWeek" type="number" min="1" max="7" defaultValue={t.frequency_per_week} required className="nb-input" style={{ width: "100%", padding: 10 }} />
                      </div>
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 9, fontWeight: 900, marginBottom: 4, textTransform: "uppercase", color: "#666" }}>Descrição</label>
                      <input name="description" defaultValue={t.description || ""} className="nb-input" style={{ width: "100%", padding: 10 }} />
                    </div>
                    <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                      <button type="submit" disabled={loading} className="nb-button" style={{
                        flex: 1, padding: 10,
                        background: "#000", color: "#FFF",
                        fontWeight: 950, fontSize: 11,
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 6
                      }}>
                        <Check size={14} /> {loading ? "SALVANDO..." : "SALVAR ALTERAÇÕES"}
                      </button>
                      <button type="button" onClick={() => { setEditingTemplate(null); setError(""); }} className="nb-button" style={{
                        padding: "10px 16px", background: "#EEE", color: "#000", fontWeight: 900, fontSize: 11
                      }}>
                        CANCELAR
                      </button>
                    </div>
                    {error && <p style={{ color: "#EF4444", fontWeight: 700, fontSize: 11, margin: 0 }}>{error}</p>}
                  </form>
                </div>
              ) : (
                /* ── CORPO DO CARD (visualização normal) ── */
                <div style={{ padding: "24px 24px 20px", flex: 1, display: "flex", flexDirection: "column" }}>
                  {/* Título + Descrição */}
                  <h3 style={{
                    fontSize: 22, fontWeight: 950, margin: "0 0 8px",
                    letterSpacing: "-0.03em", textTransform: "uppercase", lineHeight: 1.15
                  }}>
                    {t.numeric_id ? `${t.numeric_id} - ` : ""}{t.title}
                  </h3>
                  <p style={{
                    fontSize: 13, color: "#666", margin: "0 0 auto",
                    lineHeight: 1.6, fontWeight: 400
                  }}>
                    {t.description || "Template estruturado para periodização personalizada."}
                  </p>

                  {/* Grid de Métricas */}
                  <div style={{
                    display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
                    gap: 2, background: "#000",
                    border: "3px solid #000", marginTop: 20
                  }}>
                    <div style={{ background: "#F8FAFC", padding: "14px 8px", textAlign: "center" }}>
                      <span style={{ fontSize: 8, fontWeight: 900, color: "#94A3B8", textTransform: "uppercase", display: "block", marginBottom: 4 }}>Treinos/Sem</span>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                        <Zap size={14} color="var(--nb-yellow)" fill="var(--nb-yellow)" />
                        <span style={{ fontSize: 16, fontWeight: 950 }}>{t.frequency_per_week}x</span>
                      </div>
                    </div>
                    <div style={{ background: "#F8FAFC", padding: "14px 8px", textAlign: "center" }}>
                      <span style={{ fontSize: 8, fontWeight: 900, color: "#94A3B8", textTransform: "uppercase", display: "block", marginBottom: 4 }}>Duração</span>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                        <Timer size={14} color="var(--nb-blue)" />
                        <span style={{ fontSize: 16, fontWeight: 950 }}>{t.duration_weeks} Sem</span>
                      </div>
                    </div>
                    <div style={{ background: "#F8FAFC", padding: "14px 8px", textAlign: "center" }}>
                      <span style={{ fontSize: 8, fontWeight: 900, color: "#94A3B8", textTransform: "uppercase", display: "block", marginBottom: 4 }}>Volume KM</span>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                        <ArrowRightCircle size={14} color="#000" />
                        <span style={{ fontSize: 16, fontWeight: 950 }}>{totalKm.toFixed(0)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── RODAPÉ DO CARD (botão de gerenciar) ── */}
              {!isEditing && (
                <button
                  onClick={() => setSelectedTemplate(t)}
                  className="nb-button"
                  style={{
                    width: "100%", padding: "18px 24px",
                    background: "#000", color: "#FFF",
                    fontSize: 12, fontWeight: 950,
                    letterSpacing: "0.12em",
                    border: "none", borderTop: "3px solid #000",
                    borderRadius: 0, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
                    transition: "opacity 0.15s"
                  }}
                  onMouseOver={e => e.currentTarget.style.opacity = "0.85"}
                  onMouseOut={e => e.currentTarget.style.opacity = "1"}
                >
                  <Settings2 size={15} />
                  GERENCIAR {t.running_template_workouts?.length || 0} BLOCOS ESTRUTURADOS
                </button>
              )}
            </div>
          );
        })}

        {initialTemplates.length === 0 && !isCreating && (
          <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: 80, background: "#FFF", border: "4px dashed #000" }}>
            <Folder size={48} color="#CCC" style={{ marginBottom: 16, margin: "0 auto" }} />
            <p style={{ fontWeight: 950, color: "#999", fontSize: 14, letterSpacing: "0.1em" }}>NENHUMA PLANILHA CADASTRADA NO MOMENTO</p>
          </div>
        )}
      </div>

      {/* ── MODAL DE GERENCIAMENTO DE TREINOS ────────────────────────── */}
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
                <h2 style={{ fontSize: 28, fontWeight: 950, margin: 0, textTransform: "uppercase", letterSpacing: "-0.03em", lineHeight: 1 }}>
                  {selectedTemplate.numeric_id ? `${selectedTemplate.numeric_id} - ` : ""}{selectedTemplate.title}
                </h2>
                <p style={{ margin: "4px 0 0 0", fontSize: 13, fontWeight: 800, opacity: 0.9, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Painel de Engenharia de Treino
                </p>
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
                onUpdate={() => { router.refresh(); }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

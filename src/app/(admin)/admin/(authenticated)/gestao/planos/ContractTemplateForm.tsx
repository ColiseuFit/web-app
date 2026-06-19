"use client";

import { useState, useEffect } from "react";
import { Save, FileText, AlignLeft, ArrowLeft } from "lucide-react";
import { createContractTemplate, updateContractTemplate } from "./actions";

interface ContractTemplateFormProps {
  editingTemplate?: any | null;
  onCancel: () => void;
  onSave: (savedTemplate: any) => void;
  onError: (msg: string) => void;
}

export default function ContractTemplateForm({
  editingTemplate,
  onCancel,
  onSave,
  onError
}: ContractTemplateFormProps) {
  const [title, setTitle] = useState(editingTemplate?.title || "");
  const [content, setContent] = useState(editingTemplate?.content || "");
  const [isActive, setIsActive] = useState(editingTemplate ? editingTemplate.is_active : true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editingTemplate) {
      setTitle(editingTemplate.title);
      setContent(editingTemplate.content);
      setIsActive(editingTemplate.is_active);
    }
  }, [editingTemplate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!title.trim() || !content.trim()) {
      onError("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        content: content.trim(),
        is_active: isActive
      };

      let res;
      if (editingTemplate?.id) {
        res = await updateContractTemplate(editingTemplate.id, payload);
      } else {
        res = await createContractTemplate(payload);
      }

      if (res.success) {
        onSave(res.data);
      } else {
        onError(res.error || "Ocorreu um erro ao salvar o modelo de contrato.");
      }
    } catch (err: any) {
      console.error("[ContractTemplateForm] Error:", err);
      onError(err.message || "Erro de conexão com o servidor.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="admin-card" style={{ padding: "32px", maxWidth: "800px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid #000", paddingBottom: "16px", marginBottom: "24px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 900, textTransform: "uppercase", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
          <FileText size={24} /> {editingTemplate ? "Editar Modelo de Contrato" : "Novo Modelo de Contrato"}
        </h2>
        <button 
          type="button" 
          onClick={onCancel}
          className="admin-btn"
          style={{ height: "36px", padding: "0 12px", fontSize: "12px", display: "flex", alignItems: "center", gap: "4px" }}
        >
          <ArrowLeft size={14} />
          <span style={{ whiteSpace: "nowrap" }}>Voltar à Lista</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="admin-form" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        
        <div className="admin-form-group">
          <label className="admin-label">Título do Documento *</label>
          <input 
            type="text" 
            className="admin-input" 
            placeholder="Ex: Termo de Responsabilidade Anual" 
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={isSubmitting}
            maxLength={100}
            required 
          />
        </div>

        <div className="admin-form-group">
          <label className="admin-label" style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
            <span>Texto Base do Modelo (Cláusulas Jurídicas) *</span>
            <span style={{ fontSize: "12px", color: "#666", fontWeight: 600 }}>
              Variáveis: <code style={{ background: "#F3F4F6", padding: "2px 4px", border: "1px solid #E5E7EB" }}>{"{{nome_aluno}}"}</code>, <code style={{ background: "#F3F4F6", padding: "2px 4px", border: "1px solid #E5E7EB" }}>{"{{cpf_aluno}}"}</code>, <code style={{ background: "#F3F4F6", padding: "2px 4px", border: "1px solid #E5E7EB" }}>{"{{nome_plano}}"}</code>, <code style={{ background: "#F3F4F6", padding: "2px 4px", border: "1px solid #E5E7EB" }}>{"{{valor_mensalidade}}"}</code>
            </span>
          </label>
          
          <div style={{ border: "2px solid #000", overflow: "hidden" }}>
            <div style={{ backgroundColor: "#F9FAFB", padding: "8px 12px", borderBottom: "2px solid #000", display: "flex", gap: "12px" }}>
              <button 
                type="button" 
                style={{ background: "none", border: "none", cursor: "default", padding: "4px", display: "flex", alignItems: "center" }}
              >
                <AlignLeft size={16} />
              </button>
            </div>
            <textarea 
              className="admin-input" 
              style={{ minHeight: "400px", border: "none", borderRadius: "0", resize: "vertical", padding: "16px" }}
              placeholder="Cole as cláusulas do seu modelo de contrato aqui. Exemplo: Eu, {{nome_aluno}}, aceito os termos do plano {{nome_plano}} com mensalidade de {{valor_mensalidade}}..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={isSubmitting}
              required
            ></textarea>
          </div>
        </div>

        <div className="admin-form-group">
          <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "14px", fontWeight: 600 }}>
            <input 
              type="checkbox" 
              checked={isActive} 
              onChange={(e) => setIsActive(e.target.checked)}
              disabled={isSubmitting}
              style={{ width: "16px", height: "16px", accentColor: "#000" }} 
            />
            Modelo Ativo para Seleção
          </label>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "16px" }}>
          <button 
            type="button" 
            onClick={onCancel} 
            className="admin-btn" 
            style={{ backgroundColor: "#F3F4F6", color: "#374151", borderColor: "#E5E7EB" }}
            disabled={isSubmitting}
          >
            Cancelar
          </button>
          <button 
            type="submit" 
            className="admin-btn admin-btn-primary" 
            style={{ display: "flex", alignItems: "center", gap: "8px" }}
            disabled={isSubmitting}
          >
            <Save size={18} />
            <span style={{ whiteSpace: "nowrap" }}>{isSubmitting ? "Salvando..." : "Salvar Modelo"}</span>
          </button>
        </div>

      </form>
    </div>
  );
}

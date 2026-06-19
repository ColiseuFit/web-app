/**
 * @file DocumentosClient.tsx
 * @description Componente administrativo interativo para gerenciamento do Questionário PAR-Q, Regimento Interno e Termo LGPD.
 * @module Compliance
 * 
 * @design Estética Premium (Gestão do Box)
 * Adota tabelas limpas (.admin-table), cards neobrutalistas com sombras leves (.admin-card),
 * abas dinâmicas com transição, ícones SVG estáveis (Lucide-React) e feedback via Toasts.
 */

"use client";

import { useState } from "react";
import { Plus, Check, Trash2, AlertTriangle, HeartPulse, BookOpen, ShieldCheck } from "lucide-react";
import Toast from "@/components/Toast";
import { updateLegalDocument, addParqQuestion, updateParqQuestion, deleteParqQuestion } from "./actions";

/**
 * Propriedades esperadas pelo componente DocumentosClient.
 * 
 * @interface DocumentosClientProps
 * @property {any[]} initialDocuments - Lista inicial de documentos legais (Regimento, LGPD) buscados via SSR.
 * @property {any[]} initialParq - Lista inicial de perguntas do PAR-Q buscadas via SSR.
 */
interface DocumentosClientProps {
  initialDocuments: any[];
  initialParq: any[];
}

/**
 * Componente principal da tela de Gestão de Documentos e Compliance.
 * 
 * @component DocumentosClient
 */
export default function DocumentosClient({ initialDocuments, initialParq }: DocumentosClientProps) {
  const [activeTab, setActiveTab] = useState<"parq" | "regimento" | "lgpd">("parq");
  
  const [parqList, setParqList] = useState(initialParq || []);
  const [newQuestion, setNewQuestion] = useState("");
  const [isSavingParq, setIsSavingParq] = useState(false);

  const regimento = initialDocuments.find(d => d.type === "REGIMENTO_INTERNO") || { title: "Regimento Interno", content: "" };
  const lgpd = initialDocuments.find(d => d.type === "TERMO_LGPD") || { title: "Termo LGPD", content: "" };

  const [regimentoData, setRegimentoData] = useState(regimento);
  const [lgpdData, setLgpdData] = useState(lgpd);
  const [isSavingDoc, setIsSavingDoc] = useState(false);

  // Toast State
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
  };

  const handleAddQuestion = async () => {
    if (newQuestion.trim().length < 5) {
      showToast("A pergunta deve ter pelo menos 5 caracteres.", "error");
      return;
    }
    setIsSavingParq(true);
    const res = await addParqQuestion({ question_text: newQuestion, is_active: true });
    if (res.success && res.data) {
      setParqList([...parqList, res.data]);
      setNewQuestion("");
      showToast("Pergunta adicionada com sucesso!");
    } else {
      showToast(res.error || "Erro ao adicionar pergunta.", "error");
    }
    setIsSavingParq(false);
  };

  const handleToggleQuestion = async (id: string, currentStatus: boolean, text: string) => {
    setParqList(parqList.map(q => q.id === id ? { ...q, is_active: !currentStatus } : q));
    const res = await updateParqQuestion(id, { question_text: text, is_active: !currentStatus });
    if (res.success) {
      showToast(!currentStatus ? "Pergunta ativada com sucesso!" : "Pergunta inativada com sucesso!");
    } else {
      showToast("Erro ao atualizar status: " + res.error, "error");
      setParqList(parqList.map(q => q.id === id ? { ...q, is_active: currentStatus } : q));
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    if (!confirm("Tem certeza que deseja apagar esta pergunta do PAR-Q?")) return;
    const backup = [...parqList];
    setParqList(parqList.filter(q => q.id !== id));
    const res = await deleteParqQuestion(id);
    if (res.success) {
      showToast("Pergunta excluída com sucesso!");
    } else {
      showToast("Erro ao deletar: " + res.error, "error");
      setParqList(backup);
    }
  };

  const handleSaveDoc = async (type: "REGIMENTO_INTERNO" | "TERMO_LGPD") => {
    setIsSavingDoc(true);
    const data = type === "REGIMENTO_INTERNO" ? regimentoData : lgpdData;
    const res = await updateLegalDocument(type, { title: data.title, content: data.content });
    if (res.success) {
      showToast("Documento atualizado com sucesso!");
    } else {
      showToast("Erro ao atualizar documento: " + res.error, "error");
    }
    setIsSavingDoc(false);
  };

  return (
    <div className="admin-container-fluid">
      
      {/* CABEÇALHO DA PÁGINA */}
      <div style={{ marginBottom: "32px", display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 className="font-display" style={{ fontSize: "32px", fontWeight: 900, textTransform: "uppercase", lineHeight: 1, margin: 0 }}>
            Compliance & Documentos
          </h1>
          <p style={{ fontSize: "14px", fontWeight: 600, color: "#666", marginTop: "8px" }}>
            Gerencie o Questionário de Saúde (PAR-Q) e os documentos legais padrão da academia.
          </p>
        </div>
      </div>

      {/* TABS NAVIGATION */}
      <div style={{ display: "flex", gap: "2px", borderBottom: "2px solid #E5E7EB", marginBottom: "32px" }}>
        <button
          onClick={() => setActiveTab("parq")}
          style={{
            padding: "12px 24px",
            backgroundColor: "transparent",
            border: "none",
            borderBottom: activeTab === "parq" ? "4px solid #000" : "4px solid transparent",
            color: activeTab === "parq" ? "#000" : "#6B7280",
            fontWeight: 800,
            fontSize: "14px",
            textTransform: "uppercase",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            transition: "all 0.2s"
          }}
        >
          <HeartPulse size={18} style={{ flexShrink: 0 }} />
          <span style={{ whiteSpace: "nowrap" }}>Questionário PAR-Q</span>
        </button>
        <button
          onClick={() => setActiveTab("regimento")}
          style={{
            padding: "12px 24px",
            backgroundColor: "transparent",
            border: "none",
            borderBottom: activeTab === "regimento" ? "4px solid #000" : "4px solid transparent",
            color: activeTab === "regimento" ? "#000" : "#6B7280",
            fontWeight: 800,
            fontSize: "14px",
            textTransform: "uppercase",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            transition: "all 0.2s"
          }}
        >
          <BookOpen size={18} style={{ flexShrink: 0 }} />
          <span style={{ whiteSpace: "nowrap" }}>Regimento Interno</span>
        </button>
        <button
          onClick={() => setActiveTab("lgpd")}
          style={{
            padding: "12px 24px",
            backgroundColor: "transparent",
            border: "none",
            borderBottom: activeTab === "lgpd" ? "4px solid #000" : "4px solid transparent",
            color: activeTab === "lgpd" ? "#000" : "#6B7280",
            fontWeight: 800,
            fontSize: "14px",
            textTransform: "uppercase",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            transition: "all 0.2s"
          }}
        >
          <ShieldCheck size={18} style={{ flexShrink: 0 }} />
          <span style={{ whiteSpace: "nowrap" }}>Termo de Imagem e LGPD</span>
        </button>
      </div>

      {/* RENDER CONTENT */}
      <div>
        
        {/* PAR-Q */}
        {activeTab === "parq" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            
            {/* Formulário de Adicionar Pergunta */}
            <div className="admin-card" style={{ padding: "24px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <label className="admin-label" style={{ fontSize: "11px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: "#000" }}>
                  Nova Pergunta do Questionário
                </label>
                <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
                  <input 
                    type="text" 
                    placeholder="Ex: Você sente dores no peito quando pratica atividade física?"
                    className="admin-input"
                    style={{ flex: 1, minWidth: "250px" }}
                    value={newQuestion}
                    onChange={(e) => setNewQuestion(e.target.value)}
                    disabled={isSavingParq}
                  />
                  <button 
                    onClick={handleAddQuestion}
                    disabled={isSavingParq || newQuestion.length < 5}
                    className="admin-btn admin-btn-primary"
                    style={{ height: "48px", display: "inline-flex", alignItems: "center", gap: "8px" }}
                  >
                    <Plus size={18} style={{ flexShrink: 0 }} />
                    <span style={{ whiteSpace: "nowrap" }}>Adicionar Pergunta</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Listagem de Perguntas */}
            <div className="admin-card" style={{ padding: 0, overflow: "hidden" }}>
              <table className="admin-table" style={{ margin: 0 }}>
                <thead>
                  <tr>
                    <th style={{ paddingLeft: "24px", width: "80px" }}>ID</th>
                    <th>Pergunta</th>
                    <th style={{ width: "120px" }}>Status</th>
                    <th style={{ textAlign: "right", paddingRight: "24px", width: "120px" }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {parqList.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ textAlign: "center", padding: "40px", fontWeight: 600, color: "#666" }}>
                        Nenhuma pergunta cadastrada no momento.
                      </td>
                    </tr>
                  ) : (
                    parqList.map((q: any, index: number) => (
                      <tr key={q.id} style={{ opacity: q.is_active ? 1 : 0.6 }}>
                        <td style={{ paddingLeft: "24px", verticalAlign: "middle" }}>
                          <span 
                            onClick={() => {
                              navigator.clipboard.writeText(q.id);
                              showToast("ID da pergunta copiado!", "success");
                            }}
                            title="Clique para copiar o ID completo"
                            style={{ 
                              fontSize: "10px", 
                              fontWeight: 700, 
                              backgroundColor: "#F3F4F6", 
                              padding: "2px 6px", 
                              border: "1px solid #000", 
                              fontFamily: "monospace",
                              cursor: "pointer",
                              userSelect: "none"
                            }}
                          >
                            #{String(index + 1).padStart(2, "0")}
                          </span>
                        </td>
                        <td style={{ fontWeight: 700, whiteSpace: "normal" }}>
                          {q.question_text}
                        </td>
                        <td>
                          <span 
                            className="admin-badge cursor-pointer"
                            onClick={() => handleToggleQuestion(q.id, q.is_active, q.question_text)}
                            style={{ 
                              backgroundColor: q.is_active ? "#DCFCE7" : "#F3F4F6", 
                              color: q.is_active ? "#166534" : "#4B5563",
                              borderColor: q.is_active ? "#16A34A" : "#9CA3AF"
                            }}
                          >
                            {q.is_active ? "Ativo" : "Inativo"}
                          </span>
                        </td>
                        <td style={{ textAlign: "right", paddingRight: "24px" }}>
                          <button 
                            onClick={() => handleDeleteQuestion(q.id)}
                            className="admin-btn"
                            style={{ 
                              height: "32px", 
                              padding: "0 12px", 
                              fontSize: "11px", 
                              borderColor: "#DC2626",
                              color: "#DC2626",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px"
                            }}
                            title="Excluir pergunta"
                          >
                            <Trash2 size={12} style={{ flexShrink: 0 }} />
                            <span style={{ whiteSpace: "nowrap" }}>Excluir</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Aviso de Atenção Legal */}
            <div style={{ 
              display: "flex", 
              alignItems: "start", 
              gap: "12px", 
              backgroundColor: "#FFFBEB", 
              border: "2px solid #CA8A04", 
              padding: "16px", 
              marginTop: "24px",
              boxShadow: "4px 4px 0px rgba(202,138,4,0.1)"
            }}>
              <AlertTriangle className="text-yellow-600 shrink-0" size={20} style={{ marginTop: "2px" }} />
              <div style={{ fontSize: "13px", color: "#92400E", fontWeight: 600, lineHeight: 1.5 }}>
                <strong>Atenção legal:</strong> As perguntas acima serão apresentadas obrigatoriamente a todos os alunos no primeiro acesso ao aplicativo. Respostas positivas ("Sim") exigirão validação médica para liberação do treino.
              </div>
            </div>

          </div>
        )}

        {/* DOCUMENTOS */}
        {(activeTab === "regimento" || activeTab === "lgpd") && (
          <div className="admin-card" style={{ padding: "32px", maxWidth: "900px", margin: "0 auto" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              
              <div className="admin-form-group">
                <label className="admin-label">Título do Documento *</label>
                <input 
                  type="text" 
                  className="admin-input"
                  value={activeTab === "regimento" ? regimentoData.title : lgpdData.title}
                  onChange={(e) => activeTab === "regimento" 
                    ? setRegimentoData({...regimentoData, title: e.target.value}) 
                    : setLgpdData({...lgpdData, title: e.target.value})
                  }
                  placeholder="Título do Documento"
                  required
                />
              </div>

              <div className="admin-form-group">
                <label className="admin-label">Conteúdo do Documento (Markdown permitido) *</label>
                <div style={{ border: "2px solid #000", overflow: "hidden" }}>
                  <div style={{ backgroundColor: "#F9FAFB", padding: "8px 12px", borderBottom: "2px solid #000", display: "flex", gap: "12px" }}>
                    <span style={{ fontSize: "11px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: "#666" }}>
                      Editor de Termo Jurídico
                    </span>
                  </div>
                  <textarea 
                    className="admin-input" 
                    style={{ minHeight: "400px", border: "none", borderRadius: "0", resize: "vertical", padding: "16px" }}
                    value={activeTab === "regimento" ? regimentoData.content : lgpdData.content}
                    onChange={(e) => activeTab === "regimento" 
                      ? setRegimentoData({...regimentoData, content: e.target.value}) 
                      : setLgpdData({...lgpdData, content: e.target.value})
                    }
                    placeholder="Escreva as cláusulas e regras gerais do documento aqui..."
                    required
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "16px" }}>
                <button 
                  onClick={() => handleSaveDoc(activeTab === "regimento" ? "REGIMENTO_INTERNO" : "TERMO_LGPD")}
                  disabled={isSavingDoc}
                  className="admin-btn admin-btn-primary"
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <Check size={18} style={{ flexShrink: 0 }} />
                  <span style={{ whiteSpace: "nowrap" }}>{isSavingDoc ? "Salvando..." : "Salvar Texto"}</span>
                </button>
              </div>

            </div>
          </div>
        )}

      </div>

      {/* FEEDBACK TOAST */}
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}

    </div>
  );
}

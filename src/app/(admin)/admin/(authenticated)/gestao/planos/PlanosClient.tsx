"use client";

import { useState } from "react";
import { FileText, LayoutList, Plus, Edit2, Eye, EyeOff, Archive, Check, ChevronDown, TrendingUp } from "lucide-react";
import PlanForm from "./PlanForm";
import ContractTemplateForm from "./ContractTemplateForm";
import MassPriceAdjustmentModal from "./MassPriceAdjustmentModal";
import Toast from "@/components/Toast";
import { togglePlanStatus, toggleTemplateStatus } from "./actions";

interface PlanosClientProps {
  accessTypes: Array<{ id: string; label: string }>;
  initialPlans: any[];
  initialContractTemplates: any[];
}

export default function PlanosClient({ 
  accessTypes, 
  initialPlans, 
  initialContractTemplates 
}: PlanosClientProps) {
  const [plans, setPlans] = useState<any[]>(initialPlans);
  const [templates, setTemplates] = useState<any[]>(initialContractTemplates);
  const [activeTab, setActiveTab] = useState<"planos" | "modelos">("planos");
  
  // Controles de Planos
  const [isCreatingPlan, setIsCreatingPlan] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any | null>(null);

  // Controles de Modelos
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any | null>(null);

  // Controle de Reajuste em Lote
  const [isMassAdjusting, setIsMassAdjusting] = useState(false);

  // Notificações Toast
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
  };

  const handlePlanSave = (savedPlan: any) => {
    if (editingPlan) {
      setPlans(prev => prev.map(p => p.id === savedPlan.id ? { ...savedPlan, contract_templates: savedPlan.contract_templates || p.contract_templates } : p));
    } else {
      const template = templates.find(t => t.id === savedPlan.contract_template_id);
      const hydratedPlan = {
        ...savedPlan,
        contract_templates: template ? { title: template.title } : null
      };
      setPlans(prev => [hydratedPlan, ...prev]);
    }
    setEditingPlan(null);
    setIsCreatingPlan(false);
    showToast(editingPlan ? "Plano atualizado com sucesso!" : "Plano cadastrado com sucesso!", "success");
  };

  const handleTemplateSave = (savedTemplate: any) => {
    if (editingTemplate) {
      setTemplates(prev => prev.map(t => t.id === savedTemplate.id ? savedTemplate : t));
    } else {
      setTemplates(prev => [savedTemplate, ...prev]);
    }
    setEditingTemplate(null);
    setIsCreatingTemplate(false);
    showToast(editingTemplate ? "Modelo de contrato atualizado!" : "Modelo de contrato salvo!", "success");
  };

  const handleTogglePlan = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "archived" : "active";
    const res = await togglePlanStatus(id, newStatus);
    if (res.success) {
      setPlans(prev => prev.map(p => p.id === id ? { ...p, status: newStatus } : p));
      showToast(newStatus === "active" ? "Plano comercial ativado!" : "Plano comercial arquivado!", "success");
    } else {
      showToast(res.error || "Erro ao atualizar status do plano.", "error");
    }
  };

  const handleToggleTemplate = async (id: string, currentStatus: boolean) => {
    const res = await toggleTemplateStatus(id, !currentStatus);
    if (res.success) {
      setTemplates(prev => prev.map(t => t.id === id ? { ...t, is_active: !currentStatus } : t));
      showToast(!currentStatus ? "Modelo de contrato ativado!" : "Modelo de contrato desativado!", "success");
    } else {
      showToast(res.error || "Erro ao atualizar modelo.", "error");
    }
  };

  // Mapeamento útil de labels de ciclo de faturamento
  const billingCycleLabels: Record<string, string> = {
    monthly: "Mensal",
    quarterly: "Trimestral",
    semiannual: "Semestral",
    annual: "Anual",
    one_time: "Avulso"
  };

  // Controles de agrupamento de planos colapsáveis por ID do modelo de contrato
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  // Agrupar planos dinamicamente com base no Modelo de Contrato (Semântica Dinâmica)
  const groupedPlans = plans.reduce((acc, plan) => {
    const templateId = plan.contract_template_id;
    if (!templateId) {
      const key = "sem_modelo";
      if (!acc[key]) {
        acc[key] = {
          key,
          title: "Sem Modelo de Contrato Vinculado",
          subtitle: "Planos comerciais e avulsos que não exigem assinatura de termo jurídico obrigatório",
          plansList: []
        };
      }
      acc[key].plansList.push(plan);
    } else {
      const template = templates.find(t => t.id === templateId);
      const title = template ? template.title : "Modelo de Contrato Desativado";
      const key = templateId;
      if (!acc[key]) {
        acc[key] = {
          key,
          title,
          subtitle: `Planos comerciais vinculados ao modelo jurídico: "${title}"`,
          plansList: []
        };
      }
      acc[key].plansList.push(plan);
    }
    return acc;
  }, {} as Record<string, { key: string; title: string; subtitle: string; plansList: any[] }>);

  // Ordenar chaves: modelos em ordem alfabética e "Sem Modelo" sempre no final
  const sortedGroupKeys = Object.keys(groupedPlans).sort((a, b) => {
    if (a === "sem_modelo") return 1;
    if (b === "sem_modelo") return -1;
    return groupedPlans[a].title.localeCompare(groupedPlans[b].title);
  });

  // Ordene os planos de forma crescente por data de criação para ids sequenciais estáveis (#01, #02, #03...)
  const sortedPlansForIndexing = [...plans].sort((a, b) => {
    return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
  });

  // Ordene os modelos de contrato de forma crescente por data de criação para ids sequenciais estáveis (#01, #02...)
  const sortedTemplatesForIndexing = [...templates].sort((a, b) => {
    return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
  });


  return (
    <div className="admin-container-fluid">
      <div style={{ marginBottom: "32px", display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 className="font-display" style={{ fontSize: "32px", fontWeight: 900, textTransform: "uppercase", lineHeight: 1, margin: 0 }}>
            Gestão de Planos
          </h1>
          <p style={{ fontSize: "14px", fontWeight: 600, color: "#666", marginTop: "8px" }}>
            Configure os planos de pagamento, termos de adesão e regras de check-in.
          </p>
        </div>

        {/* BOTÃO DE AÇÃO CONTEXTUAL */}
        {!isCreatingPlan && !editingPlan && !isCreatingTemplate && !editingTemplate && (
          <div>
            {activeTab === "planos" ? (
              <div style={{ display: "flex", gap: "12px" }}>
                <button onClick={() => setIsMassAdjusting(true)} className="admin-btn admin-btn-ghost" style={{ display: "inline-flex", alignItems: "center", gap: "8px", border: "2px solid #000" }}>
                  <TrendingUp size={18} style={{ flexShrink: 0 }} />
                  <span style={{ whiteSpace: "nowrap" }}>Reajuste em Lote</span>
                </button>
                <button onClick={() => setIsCreatingPlan(true)} className="admin-btn admin-btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                  <Plus size={18} style={{ flexShrink: 0 }} />
                  <span style={{ whiteSpace: "nowrap" }}>Adicionar Novo Plano</span>
                </button>
              </div>
            ) : (
              <button onClick={() => setIsCreatingTemplate(true)} className="admin-btn admin-btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                <Plus size={18} style={{ flexShrink: 0 }} />
                <span style={{ whiteSpace: "nowrap" }}>Novo Modelo de Contrato</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* TABS NAVIGATION */}
      <div style={{ display: "flex", gap: "2px", borderBottom: "2px solid #E5E7EB", marginBottom: "32px" }}>
        <button
          onClick={() => {
            setActiveTab("planos");
            setIsCreatingPlan(false);
            setEditingPlan(null);
          }}
          disabled={isCreatingPlan || editingPlan || isCreatingTemplate || editingTemplate}
          style={{
            padding: "12px 24px",
            backgroundColor: "transparent",
            border: "none",
            borderBottom: activeTab === "planos" ? "4px solid #000" : "4px solid transparent",
            color: activeTab === "planos" ? "#000" : "#6B7280",
            fontWeight: 800,
            fontSize: "14px",
            textTransform: "uppercase",
            cursor: (isCreatingPlan || editingPlan || isCreatingTemplate || editingTemplate) ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            opacity: (isCreatingPlan || editingPlan || isCreatingTemplate || editingTemplate) ? 0.5 : 1,
            transition: "all 0.2s"
          }}
        >
          <LayoutList size={18} /> Planos e Preços
        </button>
        <button
          onClick={() => {
            setActiveTab("modelos");
            setIsCreatingTemplate(false);
            setEditingTemplate(null);
          }}
          disabled={isCreatingPlan || editingPlan || isCreatingTemplate || editingTemplate}
          style={{
            padding: "12px 24px",
            backgroundColor: "transparent",
            border: "none",
            borderBottom: activeTab === "modelos" ? "4px solid #000" : "4px solid transparent",
            color: activeTab === "modelos" ? "#000" : "#6B7280",
            fontWeight: 800,
            fontSize: "14px",
            textTransform: "uppercase",
            cursor: (isCreatingPlan || editingPlan || isCreatingTemplate || editingTemplate) ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            opacity: (isCreatingPlan || editingPlan || isCreatingTemplate || editingTemplate) ? 0.5 : 1,
            transition: "all 0.2s"
          }}
        >
          <FileText size={18} /> Modelos de Contrato
        </button>
      </div>

      {/* RENDER CONTENT */}
      <div>
        {/* ABA PLANOS */}
        {activeTab === "planos" && (
          <>
            {isCreatingPlan || editingPlan ? (
              <PlanForm 
                accessTypes={accessTypes} 
                contractTemplates={templates.filter(t => t.is_active)} 
                editingPlan={editingPlan}
                onCancel={() => {
                  setIsCreatingPlan(false);
                  setEditingPlan(null);
                }}
                onSave={handlePlanSave}
                onError={(msg) => showToast(msg, "error")}
              />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                {plans.length === 0 ? (
                  <div className="admin-card" style={{ padding: "40px", textAlign: "center", fontWeight: 600, color: "#666" }}>
                    Nenhum plano comercial cadastrado. Clique em "Adicionar Novo Plano" para começar.
                  </div>
                ) : (
                  sortedGroupKeys.map((groupKey) => {
                    const group = groupedPlans[groupKey];
                    const isCollapsed = collapsedGroups[groupKey] ?? false;

                    return (
                      <div key={groupKey} style={{ border: "2px solid #000", overflow: "hidden" }}>
                        {/* CABEÇALHO DO GRUPO (MODELO DE CONTRATO) */}
                        <div 
                          onClick={() => setCollapsedGroups(prev => ({ ...prev, [groupKey]: !prev[groupKey] }))}
                          style={{ 
                            padding: "16px 24px", 
                            backgroundColor: "#F9FAFB", 
                            cursor: "pointer", 
                            display: "flex", 
                            justifyContent: "space-between", 
                            alignItems: "center", 
                            borderBottom: isCollapsed ? "none" : "2px solid #000",
                            userSelect: "none"
                          }}
                        >
                          <div>
                            <h3 style={{ fontSize: "14px", fontWeight: 900, margin: 0, textTransform: "uppercase", display: "flex", alignItems: "center", gap: "12px" }}>
                              {group.title}
                              <span className="admin-badge" style={{ backgroundColor: "#000", color: "#FFF", borderColor: "#000", fontSize: "10px", padding: "2px 6px" }}>
                                {group.plansList.length} {group.plansList.length === 1 ? "plano" : "planos"}
                              </span>
                            </h3>
                            <p style={{ fontSize: "12px", color: "#666", margin: "4px 0 0 0", fontWeight: 500 }}>
                              {group.subtitle}
                            </p>
                          </div>
                          <ChevronDown size={20} style={{ transform: isCollapsed ? "none" : "rotate(180deg)", transition: "transform 0.2s" }} />
                        </div>

                        {/* LISTAGEM DE PLANOS DO GRUPO */}
                        {!isCollapsed && (
                          <div style={{ overflowX: "auto" }}>
                            <table className="admin-table" style={{ margin: 0, width: "100%", border: "none" }}>
                              <thead>
                                <tr>
                                  <th style={{ paddingLeft: "24px", width: "80px" }}>ID</th>
                                  <th>Nome do Plano</th>
                                  <th>Tipo de Acesso</th>
                                  <th>Valor (Mensalidade)</th>
                                  <th>Ciclo</th>
                                  <th>Modelo de Contrato</th>
                                  <th>Status</th>
                                  <th style={{ textAlign: "right", paddingRight: "24px" }}>Ações</th>
                                </tr>
                              </thead>
                              <tbody>
                                {group.plansList.map((plan: any) => (
                                  <tr key={plan.id}>
                                    <td style={{ paddingLeft: "24px", verticalAlign: "middle" }}>
                                      <span 
                                        onClick={() => {
                                          navigator.clipboard.writeText(plan.id);
                                          showToast("ID do plano copiado!", "success");
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
                                        #{String(sortedPlansForIndexing.findIndex(p => p.id === plan.id) + 1).padStart(2, "0")}
                                      </span>
                                    </td>
                                    <td style={{ fontWeight: 800 }}>
                                      <span>{plan.name}</span>
                                    </td>
                                    <td>
                                      {accessTypes.find(a => a.id === plan.access_type_id)?.label || "Livre / Sem Restrição"}
                                    </td>
                                    <td style={{ fontWeight: 700 }}>
                                      {plan.price > 0 
                                        ? `R$ ${parseFloat(plan.price).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` 
                                        : "Isento / Grátis"}
                                    </td>
                                    <td>
                                      {billingCycleLabels[plan.billing_cycle] || plan.billing_cycle}
                                    </td>
                                    <td style={{ fontSize: "13px", fontWeight: 500, color: plan.contract_templates?.title ? "#000" : "#666" }}>
                                      {plan.contract_templates?.title || "Sem Modelo"}
                                    </td>
                                    <td>
                                      <span 
                                        className="admin-badge" 
                                        style={{ 
                                          backgroundColor: plan.status === "active" ? "#DCFCE7" : "#F3F4F6", 
                                          color: plan.status === "active" ? "#166534" : "#4B5563",
                                          borderColor: plan.status === "active" ? "#16A34A" : "#9CA3AF"
                                        }}
                                      >
                                        {plan.status === "active" ? "Ativo" : "Arquivado"}
                                      </span>
                                    </td>
                                    <td style={{ textAlign: "right", paddingRight: "24px" }}>
                                      <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                                        <button 
                                          onClick={() => setEditingPlan(plan)}
                                          className="admin-btn"
                                          style={{ height: "32px", padding: "0 12px", fontSize: "11px", borderColor: "#E5E7EB", display: "inline-flex", alignItems: "center", gap: "4px" }}
                                          title="Editar configurações do plano"
                                        >
                                          <Edit2 size={12} style={{ flexShrink: 0 }} />
                                          <span style={{ whiteSpace: "nowrap" }}>Editar</span>
                                        </button>
                                        <button 
                                          onClick={() => handleTogglePlan(plan.id, plan.status)}
                                          className="admin-btn"
                                          style={{ 
                                            height: "32px", 
                                            padding: "0 12px", 
                                            fontSize: "11px", 
                                            borderColor: plan.status === "active" ? "#DC2626" : "#000",
                                            color: plan.status === "active" ? "#DC2626" : "#000",
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: "4px"
                                          }}
                                          title={plan.status === "active" ? "Arquivar plano" : "Reativar plano"}
                                        >
                                          <Archive size={12} style={{ flexShrink: 0 }} />
                                          <span style={{ whiteSpace: "nowrap" }}>{plan.status === "active" ? "Arquivar" : "Ativar"}</span>
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </>
        )}

        {/* ABA MODELOS DE CONTRATO */}
        {activeTab === "modelos" && (
          <>
            {isCreatingTemplate || editingTemplate ? (
              <ContractTemplateForm 
                editingTemplate={editingTemplate}
                onCancel={() => {
                  setIsCreatingTemplate(false);
                  setEditingTemplate(null);
                }}
                onSave={handleTemplateSave}
                onError={(msg) => showToast(msg, "error")}
              />
            ) : (
              <div className="admin-card" style={{ padding: 0, overflow: "hidden" }}>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th style={{ paddingLeft: "16px", width: "80px" }}>ID</th>
                      <th>Título do Documento</th>
                      <th>Data de Criação</th>
                      <th>Status</th>
                      <th style={{ textAlign: "right", paddingRight: "16px" }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {templates.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: "center", padding: "40px", fontWeight: 600, color: "#666" }}>
                          Nenhum modelo de contrato cadastrado. Clique em "Novo Modelo" para começar.
                        </td>
                      </tr>
                    ) : (
                      templates.map((template) => (
                        <tr key={template.id}>
                          <td style={{ paddingLeft: "16px", verticalAlign: "middle" }}>
                            <span 
                              onClick={() => {
                                navigator.clipboard.writeText(template.id);
                                showToast("ID do modelo copiado!", "success");
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
                              #{String(sortedTemplatesForIndexing.findIndex(t => t.id === template.id) + 1).padStart(2, "0")}
                            </span>
                          </td>
                          <td style={{ fontWeight: 800 }}>
                            <span>{template.title}</span>
                          </td>
                          <td>
                            {new Date(template.created_at).toLocaleDateString("pt-BR", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              timeZone: "UTC"
                            })}
                          </td>
                          <td>
                            <span 
                              className="admin-badge" 
                              style={{ 
                                backgroundColor: template.is_active ? "#DCFCE7" : "#F3F4F6", 
                                color: template.is_active ? "#166534" : "#4B5563",
                                borderColor: template.is_active ? "#16A34A" : "#9CA3AF"
                              }}
                            >
                              {template.is_active ? "Ativo" : "Inativo"}
                            </span>
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                              <button 
                                onClick={() => setEditingTemplate(template)}
                                className="admin-btn"
                                style={{ height: "32px", padding: "0 12px", fontSize: "11px", borderColor: "#E5E7EB", display: "inline-flex", alignItems: "center", gap: "4px" }}
                                title="Editar texto e configurações"
                              >
                                <Edit2 size={12} style={{ flexShrink: 0 }} />
                                <span style={{ whiteSpace: "nowrap" }}>Editar</span>
                              </button>
                              <button 
                                onClick={() => handleToggleTemplate(template.id, template.is_active)}
                                className="admin-btn"
                                style={{ 
                                  height: "32px", 
                                  padding: "0 12px", 
                                  fontSize: "11px", 
                                  borderColor: template.is_active ? "#DC2626" : "#000",
                                  color: template.is_active ? "#DC2626" : "#000",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px"
                                }}
                                title={template.is_active ? "Desativar modelo" : "Ativar modelo"}
                              >
                                {template.is_active ? <EyeOff size={12} style={{ flexShrink: 0 }} /> : <Eye size={12} style={{ flexShrink: 0 }} />}
                                <span style={{ whiteSpace: "nowrap" }}>{template.is_active ? "Desativar" : "Ativar"}</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {/* NOTIFICAÇÕES */}
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}

      {/* MODAL DE REAJUSTE EM LOTE */}
      {isMassAdjusting && (
        <MassPriceAdjustmentModal
          plans={plans.filter(p => p.status === "active")}
          onClose={() => setIsMassAdjusting(false)}
          onSuccess={() => {
            setIsMassAdjusting(false);
            // Ideal seria fazer um mutate/revalidate ou refresh do Next.js
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}

/**
 * @file FinanceiroClient.tsx
 * @description Painel administrativo interativo para controle financeiro, recebimento de mensalidades e lançamento de cobranças avulsas.
 * @module Financeiro
 * 
 * @design Estética Premium (Gestão do Box)
 * Cards brutais com bordas fortes e sombras sólidas, KPI cards coloridos, abas dinâmicas,
 * tabelas limpas, modais interativos, feedbacks via Toasts e conformidade com RLS.
 */

"use client";

import { useState, useMemo } from "react";
import { CircleDollarSign, Plus, Check, X, Calendar, User, Search, AlertCircle, DollarSign } from "lucide-react";
import Toast from "@/components/Toast";
import { payInvoice, cancelInvoice, createInvoice } from "./actions";

interface FinanceiroClientProps {
  initialInvoices: any[];
  students: any[];
}

export default function FinanceiroClient({ initialInvoices, students }: FinanceiroClientProps) {
  const [invoices, setInvoices] = useState<any[]>(initialInvoices);
  const [activeTab, setActiveTab] = useState<"all" | "pending" | "paid" | "overdue" | "canceled">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modais
  const [payingInvoice, setPayingInvoice] = useState<any | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("pix");
  const [isPaying, setIsPaying] = useState(false);

  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);
  const [newInvoiceData, setNewInvoiceData] = useState({
    student_id: "",
    title: "",
    amount: "",
    due_date: new Date().toISOString().split("T")[0]
  });
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);

  // Toast notifications
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
  };

  const todayStr = useMemo(() => {
    // Retorna a data de hoje no formato YYYY-MM-DD em UTC
    return new Date().toISOString().split("T")[0];
  }, []);

  // Hydrate e processamento dinâmico de status de faturas
  const hydratedInvoices = useMemo(() => {
    return invoices.map((inv: any) => {
      let currentStatus = inv.status;
      if (currentStatus === "pending" && inv.due_date < todayStr) {
        currentStatus = "overdue";
      }
      return { ...inv, calculatedStatus: currentStatus };
    });
  }, [invoices, todayStr]);

  // Cálculos de KPIs baseados nos dados em tela
  const kpis = useMemo(() => {
    let totalPaid = 0;
    let totalPending = 0;
    let totalOverdue = 0;

    const currentMonth = new Date().getUTCMonth();
    const currentYear = new Date().getUTCFullYear();

    hydratedInvoices.forEach((inv) => {
      const amt = parseFloat(inv.amount) || 0;
      if (inv.calculatedStatus === "paid") {
        const payDate = inv.paid_at ? new Date(inv.paid_at) : null;
        if (payDate && payDate.getUTCMonth() === currentMonth && payDate.getUTCFullYear() === currentYear) {
          totalPaid += amt;
        }
      } else if (inv.calculatedStatus === "pending") {
        totalPending += amt;
      } else if (inv.calculatedStatus === "overdue") {
        totalOverdue += amt;
      }
    });

    return { totalPaid, totalPending, totalOverdue };
  }, [hydratedInvoices]);

  // Filtragem de faturas
  const filteredInvoices = useMemo(() => {
    return hydratedInvoices.filter((inv) => {
      // Filtro de aba
      if (activeTab !== "all" && inv.calculatedStatus !== activeTab) {
        return false;
      }
      // Filtro de busca (Nome do aluno ou Título da cobrança)
      if (searchQuery.trim() !== "") {
        const studentName = inv.profiles?.full_name?.toLowerCase() || "";
        const title = inv.title.toLowerCase();
        const search = searchQuery.toLowerCase();
        return studentName.includes(search) || title.includes(search);
      }
      return true;
    });
  }, [hydratedInvoices, activeTab, searchQuery]);

  // Ação: Liquidar Fatura (Confirmar Pagamento)
  const handlePayConfirm = async () => {
    if (!payingInvoice) return;
    setIsPaying(true);

    const res = await payInvoice(payingInvoice.id, selectedPaymentMethod as any);
    if (res.success) {
      setInvoices(prev =>
        prev.map(inv =>
          inv.id === payingInvoice.id
            ? { ...inv, status: "paid", payment_method: selectedPaymentMethod, paid_at: new Date().toISOString() }
            : inv
        )
      );
      showToast("Pagamento registrado com sucesso!");
      setPayingInvoice(null);
    } else {
      showToast(res.error || "Erro ao registrar pagamento.", "error");
    }

    setIsPaying(false);
  };

  // Ação: Cancelar Fatura
  const handleCancelInvoice = async (id: string) => {
    if (!confirm("Tem certeza que deseja cancelar esta fatura permanentemente?")) return;

    const res = await cancelInvoice(id);
    if (res.success) {
      setInvoices(prev =>
        prev.map(inv => (inv.id === id ? { ...inv, status: "canceled" } : inv))
      );
      showToast("Fatura cancelada com sucesso!");
    } else {
      showToast(res.error || "Erro ao cancelar fatura.", "error");
    }
  };

  // Ação: Criar Fatura Manual
  const handleCreateManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInvoiceData.student_id || !newInvoiceData.title || !newInvoiceData.amount) {
      showToast("Por favor, preencha todos os campos obrigatórios.", "error");
      return;
    }

    setIsSubmittingManual(true);
    const payload = {
      student_id: newInvoiceData.student_id,
      title: newInvoiceData.title.trim(),
      amount: parseFloat(newInvoiceData.amount) || 0,
      due_date: newInvoiceData.due_date
    };

    const res = await createInvoice(payload);
    if (res.success && res.data) {
      const student = students.find(s => s.id === payload.student_id);
      const hydratedNew = {
        ...res.data,
        profiles: student ? { full_name: student.full_name } : null
      };

      setInvoices(prev => [hydratedNew, ...prev]);
      showToast("Cobrança lançada com sucesso!");
      setIsCreatingInvoice(false);
      setNewInvoiceData({
        student_id: "",
        title: "",
        amount: "",
        due_date: new Date().toISOString().split("T")[0]
      });
    } else {
      showToast(res.error || "Erro ao lançar cobrança.", "error");
    }
    setIsSubmittingManual(false);
  };

  // Utilitários de mapeamento visual de status
  const statusLabels: Record<string, string> = {
    pending: "Pendente",
    paid: "Pago",
    canceled: "Cancelado",
    overdue: "Atrasado"
  };

  const statusColors: Record<string, { bg: string; text: string; border: string }> = {
    pending: { bg: "#FFFBEB", text: "#B45309", border: "#FBBF24" },
    paid: { bg: "#DCFCE7", text: "#166534", border: "#16A34A" },
    canceled: { bg: "#F3F4F6", text: "#4B5563", border: "#9CA3AF" },
    overdue: { bg: "#FEE2E2", text: "#991B1B", border: "#EF4444" }
  };

  const paymentMethodLabels: Record<string, string> = {
    credit_card_recurrent: "Recorrência",
    credit_card_installments: "Cartão Parcelado",
    pix: "PIX",
    boleto: "Boleto",
    cash: "Dinheiro / Débito"
  };

  return (
    <div className="admin-container-fluid">
      
      {/* CABEÇALHO */}
      <div style={{ marginBottom: "32px", display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 className="font-display" style={{ fontSize: "32px", fontWeight: 900, textTransform: "uppercase", lineHeight: 1, margin: 0 }}>
            Financeiro e Caixa
          </h1>
          <p style={{ fontSize: "14px", fontWeight: 600, color: "#666", marginTop: "8px" }}>
            Monitore o fluxo de faturamento, realize cobranças manuais e dê baixa em mensalidades de alunos.
          </p>
        </div>

        <button 
          onClick={() => setIsCreatingInvoice(true)} 
          className="admin-btn admin-btn-primary"
          style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
        >
          <Plus size={18} style={{ flexShrink: 0 }} />
          <span style={{ whiteSpace: "nowrap" }}>Lançar Cobrança Avulsa</span>
        </button>
      </div>

      {/* CARDS DE KPI (ESTÉTICA NEOBRUTALISTA) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "24px", marginBottom: "32px" }}>
        
        {/* KPI: RECEBIDO */}
        <div style={{ 
          backgroundColor: "#DCFCE7", 
          border: "2px solid #000", 
          padding: "24px", 
          boxShadow: "4px 4px 0px #000",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <div>
            <span style={{ fontSize: "11px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: "#166534" }}>
              Recebido (Este Mês)
            </span>
            <h2 style={{ fontSize: "28px", fontWeight: 900, margin: "8px 0 0 0", color: "#166534" }}>
              {kpis.totalPaid.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </h2>
          </div>
          <Check size={32} style={{ color: "#16A34A", opacity: 0.8 }} />
        </div>

        {/* KPI: PENDENTE */}
        <div style={{ 
          backgroundColor: "#FFFBEB", 
          border: "2px solid #000", 
          padding: "24px", 
          boxShadow: "4px 4px 0px #000",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <div>
            <span style={{ fontSize: "11px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: "#B45309" }}>
              Pendente (A Receber)
            </span>
            <h2 style={{ fontSize: "28px", fontWeight: 900, margin: "8px 0 0 0", color: "#B45309" }}>
              {kpis.totalPending.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </h2>
          </div>
          <Calendar size={32} style={{ color: "#FBBF24", opacity: 0.8 }} />
        </div>

        {/* KPI: EM ATRASO */}
        <div style={{ 
          backgroundColor: "#FEE2E2", 
          border: "2px solid #000", 
          padding: "24px", 
          boxShadow: "4px 4px 0px #000",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <div>
            <span style={{ fontSize: "11px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: "#991B1B" }}>
              Faturas em Atraso
            </span>
            <h2 style={{ fontSize: "28px", fontWeight: 900, margin: "8px 0 0 0", color: "#991B1B" }}>
              {kpis.totalOverdue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </h2>
          </div>
          <AlertCircle size={32} style={{ color: "#EF4444", opacity: 0.8 }} />
        </div>

      </div>

      {/* NAVEGAÇÃO DE FILTROS E BUSCA */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", flexWrap: "wrap", marginBottom: "24px" }}>
        
        {/* ABAS */}
        <div style={{ display: "flex", borderBottom: "2px solid #E5E7EB", gap: "2px" }}>
          {[
            { id: "all", label: "Todas" },
            { id: "pending", label: "Pendentes" },
            { id: "paid", label: "Pagas" },
            { id: "overdue", label: "Atrasadas" },
            { id: "canceled", label: "Canceladas" }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                padding: "8px 16px",
                backgroundColor: "transparent",
                border: "none",
                borderBottom: activeTab === tab.id ? "4px solid #000" : "4px solid transparent",
                color: activeTab === tab.id ? "#000" : "#6B7280",
                fontWeight: 800,
                fontSize: "13px",
                textTransform: "uppercase",
                cursor: "pointer",
                transition: "all 0.15s"
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* INPUT DE BUSCA */}
        <div style={{ position: "relative", minWidth: "260px" }}>
          <Search size={16} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "#9CA3AF" }} />
          <input 
            type="text" 
            placeholder="Buscar aluno ou cobrança..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="admin-input"
            style={{ paddingLeft: "40px", height: "40px", fontSize: "13px" }}
          />
        </div>

      </div>

      {/* LISTAGEM DE FATURAS */}
      <div className="admin-card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table className="admin-table" style={{ margin: 0 }}>
            <thead>
              <tr>
                <th style={{ paddingLeft: "24px", width: "80px" }}>ID</th>
                <th>Aluno</th>
                <th>Descrição / Cobrança</th>
                <th>Valor</th>
                <th>Vencimento</th>
                <th>Status</th>
                <th>Forma / Pagamento</th>
                <th style={{ textAlign: "right", paddingRight: "24px", width: "180px" }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: "60px", color: "#666", fontWeight: 600 }}>
                    Nenhuma fatura encontrada com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv, index) => {
                  const colors = statusColors[inv.calculatedStatus] || { bg: "#F3F4F6", text: "#000", border: "#000" };
                  return (
                    <tr key={inv.id} style={{ opacity: inv.calculatedStatus === "canceled" ? 0.55 : 1 }}>
                      {/* ID CÓPIA */}
                      <td style={{ paddingLeft: "24px", verticalAlign: "middle" }}>
                        <span 
                          onClick={() => {
                            navigator.clipboard.writeText(inv.id);
                            showToast("ID da fatura copiado!", "success");
                          }}
                          title="Clique para copiar o UUID"
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

                      {/* ALUNO */}
                      <td style={{ fontWeight: 800 }}>
                        {inv.profiles?.full_name || "Desconhecido"}
                      </td>

                      {/* TÍTULO */}
                      <td style={{ fontWeight: 600, fontSize: "13px" }}>
                        {inv.title}
                      </td>

                      {/* VALOR */}
                      <td style={{ fontWeight: 700 }}>
                        {parseFloat(inv.amount).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </td>

                      {/* VENCIMENTO */}
                      <td style={{ fontWeight: 600, fontSize: "13px" }}>
                        {new Date(inv.due_date + "T12:00:00Z").toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric"
                        })}
                      </td>

                      {/* BADGE DE STATUS */}
                      <td>
                        <span 
                          className="admin-badge"
                          style={{ 
                            backgroundColor: colors.bg, 
                            color: colors.text,
                            borderColor: colors.border
                          }}
                        >
                          {statusLabels[inv.calculatedStatus] || inv.calculatedStatus}
                        </span>
                      </td>

                      {/* PAGAMENTO */}
                      <td style={{ fontSize: "12px", fontWeight: 600 }}>
                        {inv.calculatedStatus === "paid" ? (
                          <div style={{ display: "flex", flexDirection: "column" }}>
                            <span>{paymentMethodLabels[inv.payment_method] || inv.payment_method}</span>
                            <span style={{ fontSize: "10px", color: "#666", fontWeight: 500 }}>
                              {new Date(inv.paid_at).toLocaleDateString("pt-BR", {
                                day: "2-digit",
                                month: "2-digit",
                                hour: "2-digit",
                                minute: "2-digit"
                              })}
                            </span>
                          </div>
                        ) : (
                          <span style={{ color: "#9CA3AF" }}>-</span>
                        )}
                      </td>

                      {/* AÇÕES */}
                      <td style={{ textAlign: "right", paddingRight: "24px" }}>
                        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                          {(inv.calculatedStatus === "pending" || inv.calculatedStatus === "overdue") && (
                            <>
                              <button 
                                onClick={() => setPayingInvoice(inv)}
                                className="admin-btn admin-btn-primary"
                                style={{ 
                                  height: "30px", 
                                  padding: "0 10px", 
                                  fontSize: "11px",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px"
                                }}
                              >
                                <Check size={11} style={{ flexShrink: 0 }} />
                                <span style={{ whiteSpace: "nowrap" }}>Baixar</span>
                              </button>
                              <button 
                                onClick={() => handleCancelInvoice(inv.id)}
                                className="admin-btn"
                                style={{ 
                                  height: "30px", 
                                  padding: "0 10px", 
                                  fontSize: "11px", 
                                  borderColor: "#DC2626",
                                  color: "#DC2626",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px"
                                }}
                              >
                                <X size={11} style={{ flexShrink: 0 }} />
                                <span style={{ whiteSpace: "nowrap" }}>Cancelar</span>
                              </button>
                            </>
                          )}
                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: REGISTRAR RECEBIMENTO */}
      {payingInvoice && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000
        }}>
          <div className="admin-card" style={{ width: "100%", maxWidth: "450px", padding: "28px", backgroundColor: "#FFF" }}>
            <h3 style={{ fontSize: "18px", fontWeight: 900, textTransform: "uppercase", borderBottom: "2px solid #000", paddingBottom: "12px", margin: "0 0 20px 0" }}>
              Registrar Recebimento
            </h3>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "24px" }}>
              <div>
                <span style={{ fontSize: "11px", fontWeight: 800, textTransform: "uppercase", color: "#666" }}>Aluno</span>
                <p style={{ fontWeight: 800, margin: "4px 0 0 0", fontSize: "15px" }}>{payingInvoice.profiles?.full_name}</p>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <span style={{ fontSize: "11px", fontWeight: 800, textTransform: "uppercase", color: "#666" }}>Valor</span>
                  <p style={{ fontWeight: 900, margin: "4px 0 0 0", fontSize: "18px", color: "#166534" }}>
                    {parseFloat(payingInvoice.amount).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </p>
                </div>
                <div>
                  <span style={{ fontSize: "11px", fontWeight: 800, textTransform: "uppercase", color: "#666" }}>Vencimento</span>
                  <p style={{ fontWeight: 700, margin: "4px 0 0 0", fontSize: "14px" }}>
                    {new Date(payingInvoice.due_date + "T12:00:00Z").toLocaleDateString("pt-BR")}
                  </p>
                </div>
              </div>

              <div className="admin-form-group">
                <label className="admin-label">Forma de Pagamento *</label>
                <select 
                  className="admin-input" 
                  value={selectedPaymentMethod}
                  onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                  disabled={isPaying}
                >
                  <option value="pix">PIX</option>
                  <option value="cash">Dinheiro / Débito em Balcão</option>
                  <option value="credit_card_recurrent">Cartão Recorrente</option>
                  <option value="credit_card_installments">Cartão Parcelado</option>
                  <option value="boleto">Boleto Bancário</option>
                </select>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
              <button 
                onClick={() => setPayingInvoice(null)} 
                className="admin-btn"
                style={{ backgroundColor: "#F3F4F6", color: "#374151", borderColor: "#E5E7EB" }}
                disabled={isPaying}
              >
                Cancelar
              </button>
              <button 
                onClick={handlePayConfirm} 
                className="admin-btn admin-btn-primary"
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
                disabled={isPaying}
              >
                <Check size={18} style={{ flexShrink: 0 }} />
                <span style={{ whiteSpace: "nowrap" }}>{isPaying ? "Processando..." : "Confirmar Baixa"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: LANÇAR COBRANÇA AVULSA */}
      {isCreatingInvoice && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000
        }}>
          <form onSubmit={handleCreateManual} className="admin-card" style={{ width: "100%", maxWidth: "500px", padding: "28px", backgroundColor: "#FFF" }}>
            <h3 style={{ fontSize: "18px", fontWeight: 900, textTransform: "uppercase", borderBottom: "2px solid #000", paddingBottom: "12px", margin: "0 0 20px 0" }}>
              Nova Cobrança Avulsa
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "24px" }}>
              
              {/* ALUNO */}
              <div className="admin-form-group">
                <label className="admin-label">Selecionar Aluno *</label>
                <select 
                  className="admin-input"
                  value={newInvoiceData.student_id}
                  onChange={(e) => setNewInvoiceData(prev => ({ ...prev, student_id: e.target.value }))}
                  required
                  disabled={isSubmittingManual}
                >
                  <option value="">Selecione o atleta...</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>{s.full_name}</option>
                  ))}
                </select>
              </div>

              {/* DESCRIÇÃO */}
              <div className="admin-form-group">
                <label className="admin-label">Descrição da Cobrança *</label>
                <input 
                  type="text" 
                  className="admin-input" 
                  placeholder="Ex: Mensalidade avulsa, venda de Camiseta, etc."
                  value={newInvoiceData.title}
                  onChange={(e) => setNewInvoiceData(prev => ({ ...prev, title: e.target.value }))}
                  required
                  disabled={isSubmittingManual}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                {/* VALOR */}
                <div className="admin-form-group">
                  <label className="admin-label">Valor (R$) *</label>
                  <input 
                    type="number" 
                    className="admin-input" 
                    placeholder="0.00" 
                    step="0.01"
                    min="0.01"
                    value={newInvoiceData.amount}
                    onChange={(e) => setNewInvoiceData(prev => ({ ...prev, amount: e.target.value }))}
                    required
                    disabled={isSubmittingManual}
                  />
                </div>

                {/* VENCIMENTO */}
                <div className="admin-form-group">
                  <label className="admin-label">Vencimento *</label>
                  <input 
                    type="date" 
                    className="admin-input"
                    value={newInvoiceData.due_date}
                    onChange={(e) => setNewInvoiceData(prev => ({ ...prev, due_date: e.target.value }))}
                    required
                    disabled={isSubmittingManual}
                  />
                </div>
              </div>

            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
              <button 
                type="button"
                onClick={() => setIsCreatingInvoice(false)} 
                className="admin-btn"
                style={{ backgroundColor: "#F3F4F6", color: "#374151", borderColor: "#E5E7EB" }}
                disabled={isSubmittingManual}
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                className="admin-btn admin-btn-primary"
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
                disabled={isSubmittingManual}
              >
                <DollarSign size={18} style={{ flexShrink: 0 }} />
                <span style={{ whiteSpace: "nowrap" }}>{isSubmittingManual ? "Lançando..." : "Lançar Cobrança"}</span>
              </button>
            </div>
          </form>
        </div>
      )}

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

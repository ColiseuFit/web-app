"use client";

/**
 * @component PlanForm
 * @description
 * Componente orquestrador (Client Component) para criação e edição de Planos Comerciais.
 * 
 * Responsabilidades:
 * - Gerencia todos os estados do formulário (dados básicos, financeiro, acesso, trancamento, cancelamento).
 * - Delega seções complexas a subcomponentes (Anti-Monolith):
 *   - `PlanBasicSection`: Dados Cadastrais básicos.
 *   - `PlanFinancialSection`: Faturamento e formas de pagamento.
 *   - `PlanFreezeSection`: Regras de Trancamento.
 *   - `PlanCancellationSection`: Regras de Cancelamento e Multa Rescisória.
 * - Monta o FormData e chama `createPlan` ou `updatePlan` (Server Actions).
 * 
 * Layout:
 * - Seções colapsáveis (acordeão) para organizar os grupos de campos.
 * - Estilos B&W Neo-Brutalist (bordas de 2px, cantos retos, sem adensamento visual).
 * - Todas as seções possuem inputs organizados em coluna única ("linha única") com espaçamento limpo.
 * 
 * @nomenclature
 * - "Trancamento" = Pausa voluntária do aluno (código: freeze_*).
 * - "Suspensão" = Bloqueio por inadimplência (gerido nas Configurações Globais).
 * 
 * @see PlanBasicSection.tsx - Subcomponente de dados cadastrais.
 * @see PlanFinancialSection.tsx - Subcomponente de regras financeiras.
 * @see PlanFreezeSection.tsx - Subcomponente de trancamento.
 * @see PlanCancellationSection.tsx - Subcomponente de cancelamento.
 * @see plans-actions.ts - Server Actions (createPlan, updatePlan).
 */

import { useState, useEffect } from "react";
import { Save, Plus, ChevronDown, ArrowLeft, Edit2 } from "lucide-react";
import { createPlan, updatePlan } from "./actions";
import { PlanBasicSection } from "./PlanBasicSection";
import { PlanFinancialSection } from "./PlanFinancialSection";
import { PlanFreezeSection } from "./PlanFreezeSection";
import { PlanCancellationSection } from "./PlanCancellationSection";

interface PlanFormProps {
  accessTypes: Array<{ id: string; label: string }>;
  contractTemplates: Array<{ id: string; title: string }>;
  editingPlan?: any | null;
  onCancel: () => void;
  onSave: (savedPlan: any) => void;
  onError: (msg: string) => void;
}

export default function PlanForm({ 
  accessTypes, 
  contractTemplates, 
  editingPlan, 
  onCancel, 
  onSave, 
  onError 
}: PlanFormProps) {
  // Controle de Seções Colapsáveis
  const [openSections, setOpenSections] = useState({
    basico: true,
    financeiro: true,
    regras: true,
    cancelamento: false,
    trancamento: false,
    legal: false
  });

  // Estados dos Campos do Formulário
  const [name, setName] = useState("");
  const [status, setStatus] = useState("active");
  const [accessTypeId, setAccessTypeId] = useState("");
  const [onlineSale, setOnlineSale] = useState(true);
  const [isPreSale, setIsPreSale] = useState(false);
  
  const [price, setPrice] = useState("");
  const [setupFee, setSetupFee] = useState("0");
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [autoRenew, setAutoRenew] = useState(false);
  const [billingDueRule, setBillingDueRule] = useState("purchase_day");
  const [billingFixedDay, setBillingFixedDay] = useState("");
  
  const [paymentMethods, setPaymentMethods] = useState<string[]>([
    "credit_card_recurrent", "pix", "cash"
  ]);
  const [installments, setInstallments] = useState(1);

  const [checkinsPerWeek, setCheckinsPerWeek] = useState("");
  const [limitCheckinsPerDay, setLimitCheckinsPerDay] = useState(1);
  const [contractTemplateId, setContractTemplateId] = useState("");

  const [cancellationFeeEnabled, setCancellationFeeEnabled] = useState(false);
  const [cancellationFeeType, setCancellationFeeType] = useState("percentual_restante");
  const [cancellationFeeValue, setCancellationFeeValue] = useState("20");
  const [loyaltyPeriodMonths, setLoyaltyPeriodMonths] = useState("0");
  const [cancellationNoticeDays, setCancellationNoticeDays] = useState("0");
  const [allowStudentCancel, setAllowStudentCancel] = useState(false);

  const [freezeEnabled, setFreezeEnabled] = useState(false);
  const [freezeMaxDaysPerYear, setFreezeMaxDaysPerYear] = useState("0");
  const [freezeMinDaysPerRequest, setFreezeMinDaysPerRequest] = useState("0");
  const [freezeBillingBehavior, setFreezeBillingBehavior] = useState("pause_billing");
  const [freezeMaxRequestsPerYear, setFreezeMaxRequestsPerYear] = useState("0");
  const [freezeCooldownDays, setFreezeCooldownDays] = useState("0");

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Efeito para carregar dados de edição
  useEffect(() => {
    if (editingPlan) {
      setName(editingPlan.name || "");
      setStatus(editingPlan.status || "active");
      setAccessTypeId(editingPlan.access_type_id || "");
      setOnlineSale(editingPlan.online_sale);
      setIsPreSale(editingPlan.is_pre_sale || false);
      setPrice(String(editingPlan.price || ""));
      setSetupFee(String(editingPlan.setup_fee || "0"));
      setBillingCycle(editingPlan.billing_cycle || "monthly");
      setAutoRenew(editingPlan.auto_renew);
      setBillingDueRule(editingPlan.billing_due_rule || "purchase_day");
      setBillingFixedDay(editingPlan.billing_fixed_day ? String(editingPlan.billing_fixed_day) : "");
      setPaymentMethods(editingPlan.accepted_payment_methods || []);
      setInstallments(editingPlan.installments || 1);
      setCheckinsPerWeek(editingPlan.checkins_per_week !== null && editingPlan.checkins_per_week !== undefined ? String(editingPlan.checkins_per_week) : "");
      setLimitCheckinsPerDay(editingPlan.limit_checkins_per_day || 1);
      setContractTemplateId(editingPlan.contract_template_id || "");
      
      setCancellationFeeEnabled(editingPlan.cancellation_fee_enabled || false);
      setCancellationFeeType(editingPlan.cancellation_fee_type || "percentual_restante");
      setCancellationFeeValue(editingPlan.cancellation_fee_value ? String(editingPlan.cancellation_fee_value) : "0");
      setLoyaltyPeriodMonths(editingPlan.loyalty_period_months ? String(editingPlan.loyalty_period_months) : "0");
      setCancellationNoticeDays(editingPlan.cancellation_notice_days ? String(editingPlan.cancellation_notice_days) : "0");
      setAllowStudentCancel(editingPlan.allow_student_cancel || false);

      setFreezeEnabled(editingPlan.freeze_enabled || false);
      setFreezeMaxDaysPerYear(editingPlan.freeze_max_days_per_year ? String(editingPlan.freeze_max_days_per_year) : "0");
      setFreezeMinDaysPerRequest(editingPlan.freeze_min_days_per_request ? String(editingPlan.freeze_min_days_per_request) : "0");
      setFreezeBillingBehavior(editingPlan.freeze_billing_behavior || "pause_billing");
      setFreezeMaxRequestsPerYear(editingPlan.freeze_max_requests_per_year ? String(editingPlan.freeze_max_requests_per_year) : "0");
      setFreezeCooldownDays(editingPlan.freeze_cooldown_days ? String(editingPlan.freeze_cooldown_days) : "0");
    }
  }, [editingPlan]);

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handlePaymentMethodChange = (method: string, checked: boolean) => {
    if (checked) {
      setPaymentMethods(prev => [...prev, method]);
    } else {
      setPaymentMethods(prev => prev.filter(m => m !== method));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!name.trim()) {
      onError("Nome do plano é obrigatório.");
      return;
    }
    if (paymentMethods.length === 0) {
      onError("Por favor, selecione pelo menos uma forma de pagamento permitida.");
      return;
    }

    setIsSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("name", name.trim());
      fd.append("status", status);
      fd.append("access_type_id", accessTypeId);
      fd.append("online_sale", String(onlineSale));
      fd.append("is_pre_sale", String(isPreSale));
      fd.append("price", price);
      fd.append("setup_fee", setupFee || "0");
      fd.append("billing_cycle", billingCycle);
      fd.append("billing_due_rule", billingDueRule);
      fd.append("billing_fixed_day", billingDueRule === "fixed_day" ? billingFixedDay : "");
      fd.append("installments", String(installments));
      fd.append("auto_renew", String(autoRenew));
      fd.append("limit_checkins_per_day", String(limitCheckinsPerDay));
      fd.append("contract_template_id", contractTemplateId);

      fd.append("cancellation_fee_enabled", String(cancellationFeeEnabled));
      fd.append("cancellation_fee_type", cancellationFeeType);
      fd.append("cancellation_fee_value", cancellationFeeValue || "0");
      fd.append("loyalty_period_months", loyaltyPeriodMonths || "0");
      fd.append("cancellation_notice_days", cancellationNoticeDays || "0");
      fd.append("allow_student_cancel", String(allowStudentCancel));

      fd.append("freeze_enabled", String(freezeEnabled));
      fd.append("freeze_max_days_per_year", freezeMaxDaysPerYear || "0");
      fd.append("freeze_min_days_per_request", freezeMinDaysPerRequest || "0");
      fd.append("freeze_billing_behavior", freezeBillingBehavior);
      fd.append("freeze_max_requests_per_year", freezeMaxRequestsPerYear || "0");
      fd.append("freeze_cooldown_days", freezeCooldownDays || "0");
      
      if (checkinsPerWeek.trim() !== "") {
        fd.append("checkins_per_week", checkinsPerWeek);
      }

      paymentMethods.forEach(method => {
        fd.append("payment_methods", method);
      });

      let res;
      if (editingPlan?.id) {
        res = await updatePlan(editingPlan.id, fd);
      } else {
        res = await createPlan(fd);
      }

      if (res.success) {
        onSave(res.data);
      } else {
        onError(res.error || "Ocorreu um erro ao salvar o plano comercial.");
      }
    } catch (err: any) {
      console.error("[PlanForm] Error:", err);
      onError(err.message || "Erro de conexão com o servidor.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="admin-card" style={{ padding: "40px", maxWidth: "800px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid #000", paddingBottom: "20px", marginBottom: "32px" }}>
        <h2 style={{ fontSize: "22px", fontWeight: 900, color: "#000", margin: 0, display: "flex", alignItems: "center", gap: "12px", textTransform: "uppercase", letterSpacing: "-0.02em" }}>
          {editingPlan ? <Edit2 size={24} style={{ color: "#000" }} /> : <Plus size={24} style={{ color: "#000" }} />} 
          {editingPlan ? `Editar Plano: ${editingPlan.name}` : "Adicionar Novo Plano"}
        </h2>
        <button 
          type="button" 
          onClick={onCancel}
          className="admin-btn"
          style={{ height: "36px", padding: "0 12px", fontSize: "12px", display: "flex", alignItems: "center", gap: "4px" }}
        >
          <ArrowLeft size={14} /> Voltar à Lista
        </button>
      </div>

      <form onSubmit={handleSubmit} className="admin-form" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        
        <PlanBasicSection
          isOpen={openSections.basico}
          onToggle={() => toggleSection("basico")}
          name={name}
          setName={setName}
          status={status}
          setStatus={setStatus}
          accessTypeId={accessTypeId}
          setAccessTypeId={setAccessTypeId}
          onlineSale={onlineSale}
          setOnlineSale={setOnlineSale}
          isPreSale={isPreSale}
          setIsPreSale={setIsPreSale}
          accessTypes={accessTypes}
          isSubmitting={isSubmitting}
        />

        <PlanFinancialSection
          isOpen={openSections.financeiro}
          onToggle={() => toggleSection("financeiro")}
          billingCycle={billingCycle}
          setBillingCycle={setBillingCycle}
          autoRenew={autoRenew}
          setAutoRenew={setAutoRenew}
          price={price}
          setPrice={setPrice}
          setupFee={setupFee}
          setSetupFee={setSetupFee}
          billingDueRule={billingDueRule}
          setBillingDueRule={setBillingDueRule}
          billingFixedDay={billingFixedDay}
          setBillingFixedDay={setBillingFixedDay}
          paymentMethods={paymentMethods}
          onPaymentMethodChange={handlePaymentMethodChange}
          isSubmitting={isSubmitting}
        />

        {/* SEÇÃO: REGRAS DE ACESSO */}
        <div style={{ border: "2px solid #000", borderRadius: "0px", overflow: "hidden", backgroundColor: "#fff", boxShadow: "4px 4px 0px rgba(0,0,0,0.05)" }}>
          <div 
            onClick={() => toggleSection("regras")}
            style={{ 
              padding: "20px 24px", 
              backgroundColor: openSections.regras ? "#F9FAFB" : "#FFF", 
              cursor: "pointer", 
              display: "flex", 
              justifyContent: "space-between", 
              alignItems: "center", 
              borderBottom: openSections.regras ? "2px solid #000" : "none" 
            }}
          >
            <h3 style={{ fontSize: "16px", fontWeight: 900, color: "#000", margin: 0, textTransform: "uppercase", letterSpacing: "-0.01em" }}>
              Regras de Acesso e Check-in
            </h3>
            <ChevronDown size={20} style={{ color: "#000", transform: openSections.regras ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
          </div>
          
          {openSections.regras && (
            <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "20px", backgroundColor: "#FFF" }}>
              <div className="admin-form-group">
                <label>Check-ins por Semana</label>
                <input 
                  type="number" 
                  className="admin-input" 
                  placeholder="Deixe em branco para livre"
                  value={checkinsPerWeek}
                  onChange={(e) => setCheckinsPerWeek(e.target.value)}
                  disabled={isSubmitting}
                />
                <span style={{ fontSize: "12px", color: "var(--admin-text-secondary)", marginTop: "6px", display: "block" }}>
                  Número máximo de treinos que o aluno pode agendar por semana. Vazio = livre.
                </span>
              </div>
              
              <div className="admin-form-group">
                <label>Limite de Check-ins por Dia</label>
                <input 
                  type="number" 
                  className="admin-input"
                  value={limitCheckinsPerDay}
                  onChange={(e) => setLimitCheckinsPerDay(parseInt(e.target.value) || 1)}
                  disabled={isSubmitting}
                  min={1}
                />
                <span style={{ fontSize: "12px", color: "var(--admin-text-secondary)", marginTop: "6px", display: "block" }}>
                  Quantidade máxima de treinos diários permitida para o aluno.
                </span>
              </div>
            </div>
          )}
        </div>

        <PlanFreezeSection
          isOpen={openSections.trancamento}
          onToggle={() => toggleSection("trancamento")}
          freezeEnabled={freezeEnabled}
          setFreezeEnabled={setFreezeEnabled}
          freezeMaxDaysPerYear={freezeMaxDaysPerYear}
          setFreezeMaxDaysPerYear={setFreezeMaxDaysPerYear}
          freezeMinDaysPerRequest={freezeMinDaysPerRequest}
          setFreezeMinDaysPerRequest={setFreezeMinDaysPerRequest}
          freezeBillingBehavior={freezeBillingBehavior}
          setFreezeBillingBehavior={setFreezeBillingBehavior}
          freezeMaxRequestsPerYear={freezeMaxRequestsPerYear}
          setFreezeMaxRequestsPerYear={setFreezeMaxRequestsPerYear}
          freezeCooldownDays={freezeCooldownDays}
          setFreezeCooldownDays={setFreezeCooldownDays}
          isSubmitting={isSubmitting}
        />

        <PlanCancellationSection
          isOpen={openSections.cancelamento}
          onToggle={() => toggleSection("cancelamento")}
          cancellationFeeEnabled={cancellationFeeEnabled}
          setCancellationFeeEnabled={setCancellationFeeEnabled}
          cancellationFeeType={cancellationFeeType}
          setCancellationFeeType={setCancellationFeeType}
          cancellationFeeValue={cancellationFeeValue}
          setCancellationFeeValue={setCancellationFeeValue}
          loyaltyPeriodMonths={loyaltyPeriodMonths}
          setLoyaltyPeriodMonths={setLoyaltyPeriodMonths}
          cancellationNoticeDays={cancellationNoticeDays}
          setCancellationNoticeDays={setCancellationNoticeDays}
          allowStudentCancel={allowStudentCancel}
          setAllowStudentCancel={setAllowStudentCancel}
          isSubmitting={isSubmitting}
        />

        {/* SEÇÃO: TERMO DE ADESÃO */}
        <div style={{ border: "2px solid #000", borderRadius: "0px", overflow: "hidden", backgroundColor: "#fff", boxShadow: "4px 4px 0px rgba(0,0,0,0.05)" }}>
          <div 
            onClick={() => toggleSection("legal")}
            style={{ 
              padding: "20px 24px", 
              backgroundColor: openSections.legal ? "#F9FAFB" : "#FFF", 
              cursor: "pointer", 
              display: "flex", 
              justifyContent: "space-between", 
              alignItems: "center", 
              borderBottom: openSections.legal ? "2px solid #000" : "none"
            }}
          >
            <h3 style={{ fontSize: "16px", fontWeight: 900, color: "#000", margin: 0, textTransform: "uppercase", letterSpacing: "-0.01em" }}>
              Termo de Adesão (Contrato Legal)
            </h3>
            <ChevronDown size={20} style={{ color: "#000", transform: openSections.legal ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
          </div>
          
          {openSections.legal && (
            <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "20px", backgroundColor: "#FFF" }}>
              <div className="admin-form-group">
                <label>Modelo de Contrato Vinculado</label>
                <select 
                  className="admin-input"
                  value={contractTemplateId}
                  onChange={(e) => setContractTemplateId(e.target.value)}
                  disabled={isSubmitting}
                >
                  <option value="">Nenhum (Sem modelo de contrato vinculado)</option>
                  {contractTemplates.map(t => (
                    <option key={t.id} value={t.id}>{t.title}</option>
                  ))}
                </select>
                <span style={{ fontSize: "12px", color: "var(--admin-text-secondary)", marginTop: "8px", display: "block" }}>
                  Termo jurídico que o aluno aceita e assina digitalmente ao adquirir este plano.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* BOTÕES */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "16px" }}>
          <button 
            type="button" 
            onClick={onCancel}
            className="admin-btn" 
            disabled={isSubmitting}
          >
            Cancelar
          </button>
          <button 
            type="submit" 
            className="admin-btn admin-btn-primary" 
            disabled={isSubmitting}
          >
            <Save size={18} /> {isSubmitting ? "Salvando..." : "Salvar Plano"}
          </button>
        </div>

      </form>
    </div>
  );
}


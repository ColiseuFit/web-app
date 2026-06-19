"use client";

import { ChevronDown } from "lucide-react";

/**
 * @component PlanFinancialSection
 * @description
 * Subcomponente extraído do PlanForm.tsx (Anti-Monolith) que gerencia
 * as regras financeiras e formas de pagamento permitidas do Plano Comercial.
 * 
 * Responsabilidades:
 * - Ciclo de faturamento, preço, taxa de adesão, vencimento de faturas,
 *   formas de pagamento permitidas e recorrência.
 * - Design Neo-Brutalist (B&W) com campos em coluna única (linha única)
 *   e amplo espaçamento para reduzir a densidade cognitiva.
 * 
 * @param props Props de estado e setters passados pelo orquestrador PlanForm.tsx
 */
interface PlanFinancialSectionProps {
  isOpen: boolean;
  onToggle: () => void;
  billingCycle: string;
  setBillingCycle: (val: string) => void;
  autoRenew: boolean;
  setAutoRenew: (val: boolean) => void;
  price: string;
  setPrice: (val: string) => void;
  setupFee: string;
  setSetupFee: (val: string) => void;
  billingDueRule: string;
  setBillingDueRule: (val: string) => void;
  billingFixedDay: string;
  setBillingFixedDay: (val: string) => void;
  paymentMethods: string[];
  onPaymentMethodChange: (method: string, checked: boolean) => void;
  isSubmitting: boolean;
}

export function PlanFinancialSection({
  isOpen,
  onToggle,
  billingCycle,
  setBillingCycle,
  autoRenew,
  setAutoRenew,
  price,
  setPrice,
  setupFee,
  setSetupFee,
  billingDueRule,
  setBillingDueRule,
  billingFixedDay,
  setBillingFixedDay,
  paymentMethods,
  onPaymentMethodChange,
  isSubmitting
}: PlanFinancialSectionProps) {
  return (
    <div style={{ border: "2px solid #000", borderRadius: "0px", overflow: "hidden", backgroundColor: "#fff", boxShadow: "4px 4px 0px rgba(0,0,0,0.05)" }}>
      <div 
        onClick={onToggle}
        style={{ 
          padding: "20px 24px", 
          backgroundColor: isOpen ? "#F9FAFB" : "#FFF", 
          cursor: "pointer", 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center", 
          borderBottom: isOpen ? "2px solid #000" : "none" 
        }}
      >
        <h3 style={{ fontSize: "16px", fontWeight: 900, color: "#000", margin: 0, textTransform: "uppercase", letterSpacing: "-0.01em" }}>
          Financeiro e Pagamentos
        </h3>
        <ChevronDown size={20} style={{ color: "#000", transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
      </div>
      
      {isOpen && (
        <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "20px", backgroundColor: "#FFF" }}>
          <div className="admin-form-group">
            <label>Tipo de Vencimento (Ciclo de Cobrança) *</label>
            <select 
              className="admin-input" 
              value={billingCycle}
              onChange={(e) => setBillingCycle(e.target.value)}
              disabled={isSubmitting}
              required
            >
              <option value="monthly">Mensal (Faturamento Recorrente)</option>
              <option value="quarterly">Trimestral (Renova a cada 3 meses)</option>
              <option value="semiannual">Semestral (Renova a cada 6 meses)</option>
              <option value="annual">Anual (Renova a cada 12 meses)</option>
              <option value="one_time">Avulso / Drop-in (Pagamento Único)</option>
            </select>
            <span style={{ fontSize: "12px", color: "var(--admin-text-secondary)", marginTop: "6px", display: "block" }}>
              Define a recorrência automática das cobranças.
            </span>
          </div>

          <div className="admin-form-group">
            <label>Renovação Contratual</label>
            <select 
              className="admin-input"
              value={String(autoRenew)}
              onChange={(e) => setAutoRenew(e.target.value === "true")}
              disabled={isSubmitting}
            >
              <option value="false">Manual (O contrato expira ao fim do período atual)</option>
              <option value="true">Automática (Gera faturas continuamente ao fim de cada ciclo)</option>
            </select>
          </div>

          <div className="admin-form-group">
            <label>Valor do Contrato (Por Ciclo) *</label>
            <input 
              type="number" 
              className="admin-input" 
              placeholder="0.00" 
              step="0.01" 
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              disabled={isSubmitting}
              required 
            />
            <span style={{ fontSize: "12px", color: "var(--admin-text-secondary)", marginTop: "6px", display: "block" }}>
              Valor financeiro cobrado a cada renovação de ciclo de faturamento.
            </span>
          </div>

          <div className="admin-form-group">
            <label>Valor de Adesão / Matrícula (R$)</label>
            <input 
              type="number" 
              className="admin-input" 
              placeholder="0.00" 
              step="0.01"
              value={setupFee}
              onChange={(e) => setSetupFee(e.target.value)}
              disabled={isSubmitting}
            />
            <span style={{ fontSize: "12px", color: "var(--admin-text-secondary)", marginTop: "6px", display: "block" }}>
              Taxa de adesão cobrada exclusivamente na primeira fatura da assinatura. 0 = Isento.
            </span>
          </div>

          <div className="admin-form-group">
            <label>Regra de Vencimento da Fatura</label>
            <select 
              className="admin-input"
              value={billingDueRule}
              onChange={(e) => setBillingDueRule(e.target.value)}
              disabled={isSubmitting}
            >
              <option value="purchase_day">No mesmo dia da compra (Ex: Comprou dia 12, vence dia 12)</option>
              <option value="fixed_day">Dia Fixo Todo Mês (Escolher dia abaixo)</option>
              <option value="custom_on_sale">Definir no momento da venda (Mais Flexível para o balcão)</option>
            </select>
          </div>

          {billingDueRule === "fixed_day" && (
            <div className="admin-form-group">
              <label>Dia Fixo de Vencimento</label>
              <select 
                className="admin-input"
                value={billingFixedDay}
                onChange={(e) => setBillingFixedDay(e.target.value)}
                disabled={isSubmitting}
              >
                <option value="">Selecione o dia...</option>
                {Array.from({ length: 31 }, (_, i) => String(i + 1)).map(day => (
                  <option key={day} value={day}>Todo dia {day}</option>
                ))}
              </select>
            </div>
          )}

          <div className="admin-form-group">
            <label>Formas de Pagamento Permitidas *</label>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "8px" }}>
              {[
                { key: "credit_card_recurrent", label: "Cartão Recorrente (Não consome limite total)" },
                { key: "credit_card_installments", label: "Cartão Parcelado" },
                { key: "pix", label: "PIX (Envio instantâneo)" },
                { key: "boleto", label: "Boleto Bancário" },
                { key: "cash", label: "Dinheiro / Débito (Venda balcão)" }
              ].map(method => (
                <label 
                  key={method.key} 
                  style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "14px", fontWeight: 800, cursor: "pointer", textTransform: "uppercase" }}
                >
                  <input 
                    type="checkbox" 
                    value={method.key}
                    checked={paymentMethods.includes(method.key)}
                    onChange={(e) => onPaymentMethodChange(method.key, e.target.checked)}
                    disabled={isSubmitting}
                    style={{ width: "18px", height: "18px", accentColor: "#000", cursor: "pointer" }} 
                  />
                  {method.label}
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

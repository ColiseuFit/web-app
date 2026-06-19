/**
 * @component PlanCancellationSection
 * @description
 * Subcomponente extraído do PlanForm.tsx (Anti-Monolith) que gerencia
 * as configurações de Cancelamento e Multa Rescisória de um Plano Comercial.
 * 
 * Controla as cláusulas de fidelidade (loyalty_period_months),
 * aviso prévio (cancellation_notice_days), tipo e valor da multa rescisória,
 * e se o aluno pode solicitar cancelamento pelo app.
 * 
 * Campos gerenciados:
 * - `loyalty_period_months`: Período de fidelidade em meses (0 = sem fidelidade).
 * - `cancellation_notice_days`: Dias de antecedência para aviso prévio.
 * - `cancellation_fee_enabled`: Habilita cobrança de multa rescisória.
 * - `cancellation_fee_type`: Método de cálculo da multa:
 *   - `percentual_restante`: % sobre parcelas restantes do contrato.
 *   - `mensalidades_fixas`: Quantidade fixa de mensalidades.
 *   - `valor_fixo`: Valor fixo em R$.
 * - `cancellation_fee_value`: Valor/quantidade da multa.
 * - `allow_student_cancel`: Se o aluno pode solicitar cancelamento pelo app.
 * 
 * @business_rule
 * O Plano ELITE aplica 20% sobre o restante (percentual_restante).
 * O Plano FLEX não aplica multa (cancellation_fee_enabled = false).
 * 
 * @see PlanForm.tsx - Componente pai que injeta os estados via props.
 * @see plans-actions.ts - Server Action que persiste esses campos.
 */
import { ChevronDown } from "lucide-react";

interface PlanCancellationSectionProps {
  isOpen: boolean;
  onToggle: () => void;
  cancellationFeeEnabled: boolean;
  setCancellationFeeEnabled: (val: boolean) => void;
  cancellationFeeType: string;
  setCancellationFeeType: (val: string) => void;
  cancellationFeeValue: string;
  setCancellationFeeValue: (val: string) => void;
  loyaltyPeriodMonths: string;
  setLoyaltyPeriodMonths: (val: string) => void;
  cancellationNoticeDays: string;
  setCancellationNoticeDays: (val: string) => void;
  allowStudentCancel: boolean;
  setAllowStudentCancel: (val: boolean) => void;
  isSubmitting: boolean;
}

export function PlanCancellationSection({
  isOpen, onToggle,
  cancellationFeeEnabled, setCancellationFeeEnabled,
  cancellationFeeType, setCancellationFeeType,
  cancellationFeeValue, setCancellationFeeValue,
  loyaltyPeriodMonths, setLoyaltyPeriodMonths,
  cancellationNoticeDays, setCancellationNoticeDays,
  allowStudentCancel, setAllowStudentCancel,
  isSubmitting
}: PlanCancellationSectionProps) {
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
          Cancelamento e Multa Rescisória
        </h3>
        <ChevronDown size={20} style={{ color: "#000", transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
      </div>
      {isOpen && (
        <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "20px", backgroundColor: "#FFF" }}>
          <div className="admin-form-group">
            <label>Período de Fidelidade (Meses)</label>
            <input 
              type="number" 
              className="admin-input" 
              value={loyaltyPeriodMonths}
              onChange={(e) => setLoyaltyPeriodMonths(e.target.value)}
              disabled={isSubmitting}
              min={0}
            />
            <span style={{ fontSize: "12px", color: "var(--admin-text-secondary)", marginTop: "6px", display: "block" }}>
              Período de permanência mínima obrigatória no plano. O cancelamento antecipado ativará a cobrança de multa. 0 = sem fidelidade.
            </span>
          </div>

          <div className="admin-form-group">
            <label>Aviso Prévio Obrigatório (Dias)</label>
            <input 
              type="number" 
              className="admin-input" 
              value={cancellationNoticeDays}
              onChange={(e) => setCancellationNoticeDays(e.target.value)}
              disabled={isSubmitting}
              min={0}
            />
            <span style={{ fontSize: "12px", color: "var(--admin-text-secondary)", marginTop: "6px", display: "block" }}>
              Período mínimo de antecedência exigido para a solicitação de cancelamento.
            </span>
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "14px", fontWeight: 800, cursor: "pointer", textTransform: "uppercase", marginTop: "8px" }}>
            <input 
              type="checkbox" 
              checked={cancellationFeeEnabled}
              onChange={(e) => setCancellationFeeEnabled(e.target.checked)}
              disabled={isSubmitting}
              style={{ width: "18px", height: "18px", accentColor: "#000", cursor: "pointer" }} 
            />
            Cobrar Multa Rescisória se cancelar durante fidelidade
          </label>

          {cancellationFeeEnabled && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px", padding: "20px", background: "#F9FAFB", border: "2px solid #000", marginTop: "8px" }}>
              <div className="admin-form-group">
                <label>Como calcular a multa?</label>
                <select 
                  className="admin-input" 
                  value={cancellationFeeType}
                  onChange={(e) => setCancellationFeeType(e.target.value)}
                  disabled={isSubmitting}
                >
                  <option value="percentual_restante">% sobre o Restante do Contrato</option>
                  <option value="mensalidades_fixas">Cobrar X Mensalidades Fixas</option>
                  <option value="valor_fixo">Valor Único Fixo (R$)</option>
                </select>
              </div>
              <div className="admin-form-group">
                <label>Valor / Quantidade da Multa</label>
                <input 
                  type="number" 
                  className="admin-input" 
                  value={cancellationFeeValue}
                  onChange={(e) => setCancellationFeeValue(e.target.value)}
                  disabled={isSubmitting}
                  step={cancellationFeeType === "valor_fixo" ? "0.01" : "1"}
                  min={0}
                />
                <span style={{ fontSize: "12px", color: "var(--admin-text-secondary)", marginTop: "6px", display: "block" }}>
                  Porcentagem (%) ou valor fixo (R$) a ser aplicado como multa rescisória.
                </span>
              </div>
            </div>
          )}

          <label style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "14px", fontWeight: 800, cursor: "pointer", textTransform: "uppercase", marginTop: "8px" }}>
            <input 
              type="checkbox" 
              checked={allowStudentCancel}
              onChange={(e) => setAllowStudentCancel(e.target.checked)}
              disabled={isSubmitting}
              style={{ width: "18px", height: "18px", accentColor: "#000", cursor: "pointer" }} 
            />
            Permitir que o aluno solicite cancelamento pelo App (sujeito à aprovação)
          </label>
        </div>
      )}
    </div>
  );
}

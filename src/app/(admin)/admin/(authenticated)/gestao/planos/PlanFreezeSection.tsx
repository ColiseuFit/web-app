/**
 * @component PlanFreezeSection
 * @description
 * Subcomponente extraído do PlanForm.tsx (Anti-Monolith) que gerencia
 * as configurações de Trancamento de um Plano Comercial.
 * 
 * O Trancamento é uma pausa voluntária do aluno (viagem, saúde) onde
 * ele mantém o vínculo com a academia. As regras aqui definidas são
 * copiadas para o contrato individual (snapshot) no momento da venda.
 * 
 * Campos gerenciados:
 * - `freeze_enabled`: Habilita/desabilita o trancamento para este plano.
 * - `freeze_max_days_per_year`: Limite anual de dias trancados.
 * - `freeze_min_days_per_request`: Mínimo de dias por solicitação (evita abusos de viagens curtas).
 * - `freeze_max_requests_per_year`: Qtd máxima de trancamentos por ano (0 = ilimitado).
 * - `freeze_cooldown_days`: Carência entre solicitações (dias).
 * - `freeze_billing_behavior`: O que fazer com faturas durante o período trancado
 *   - `pause_billing`: Pausa a geração de faturas e prorroga o contrato.
 *   - `keep_billing`: Mantém cobranças e compõe dias extras no final do contrato.
 * 
 * @nomenclature
 * - Interface Admin: "Trancamento" (nunca "Congelamento").
 * - Código/DB: prefixo `freeze_` por padronização técnica.
 * 
 * @see PlanForm.tsx - Componente pai que injeta os estados via props.
 * @see plans-actions.ts - Server Action que persiste esses campos.
 */
import { ChevronDown } from "lucide-react";

interface PlanFreezeSectionProps {
  isOpen: boolean;
  onToggle: () => void;
  freezeEnabled: boolean;
  setFreezeEnabled: (val: boolean) => void;
  freezeMaxDaysPerYear: string;
  setFreezeMaxDaysPerYear: (val: string) => void;
  freezeMinDaysPerRequest: string;
  setFreezeMinDaysPerRequest: (val: string) => void;
  freezeBillingBehavior: string;
  setFreezeBillingBehavior: (val: string) => void;
  freezeMaxRequestsPerYear: string;
  setFreezeMaxRequestsPerYear: (val: string) => void;
  freezeCooldownDays: string;
  setFreezeCooldownDays: (val: string) => void;
  isSubmitting: boolean;
}

export function PlanFreezeSection({
  isOpen, onToggle, freezeEnabled, setFreezeEnabled,
  freezeMaxDaysPerYear, setFreezeMaxDaysPerYear,
  freezeMinDaysPerRequest, setFreezeMinDaysPerRequest,
  freezeBillingBehavior, setFreezeBillingBehavior,
  freezeMaxRequestsPerYear, setFreezeMaxRequestsPerYear,
  freezeCooldownDays, setFreezeCooldownDays,
  isSubmitting
}: PlanFreezeSectionProps) {
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
          Regras de Trancamento
        </h3>
        <ChevronDown size={20} style={{ color: "#000", transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
      </div>
      {isOpen && (
        <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "20px", backgroundColor: "#FFF" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "14px", fontWeight: 800, cursor: "pointer", textTransform: "uppercase" }}>
            <input 
              type="checkbox" 
              checked={freezeEnabled}
              onChange={(e) => setFreezeEnabled(e.target.checked)}
              disabled={isSubmitting}
              style={{ width: "18px", height: "18px", accentColor: "#000", cursor: "pointer" }} 
            />
            Permitir Trancamento neste Plano
          </label>

          {freezeEnabled && (
            <>
              <div className="admin-form-group">
                <label>Máx. de Dias por Ano</label>
                <input 
                  type="number" 
                  className="admin-input" 
                  value={freezeMaxDaysPerYear}
                  onChange={(e) => setFreezeMaxDaysPerYear(e.target.value)}
                  disabled={isSubmitting}
                  min={0}
                />
                <span style={{ fontSize: "12px", color: "var(--admin-text-secondary)", marginTop: "6px", display: "block" }}>
                  Limite anual acumulado de dias que o aluno pode permanecer trancado.
                </span>
              </div>

              <div className="admin-form-group">
                <label>Mín. de Dias por Solicitação</label>
                <input 
                  type="number" 
                  className="admin-input" 
                  value={freezeMinDaysPerRequest}
                  onChange={(e) => setFreezeMinDaysPerRequest(e.target.value)}
                  disabled={isSubmitting}
                  min={0}
                />
                <span style={{ fontSize: "12px", color: "var(--admin-text-secondary)", marginTop: "6px", display: "block" }}>
                  Período mínimo exigido por solicitação de trancamento (evita abusos de prazos curtos).
                </span>
              </div>
            
              <div className="admin-form-group">
                <label>Qtd. Máxima de Solicitações (por Ano)</label>
                <input 
                  type="number" 
                  className="admin-input" 
                  value={freezeMaxRequestsPerYear}
                  onChange={(e) => setFreezeMaxRequestsPerYear(e.target.value)}
                  disabled={isSubmitting}
                  min={0}
                />
                <span style={{ fontSize: "12px", color: "var(--admin-text-secondary)", marginTop: "6px", display: "block" }}>
                  Quantidade limite de pedidos de trancamento por ano (0 = ilimitado).
                </span>
              </div>

              <div className="admin-form-group">
                <label>Carência entre Pedidos (Dias)</label>
                <input 
                  type="number" 
                  className="admin-input" 
                  value={freezeCooldownDays}
                  onChange={(e) => setFreezeCooldownDays(e.target.value)}
                  disabled={isSubmitting}
                  min={0}
                />
                <span style={{ fontSize: "12px", color: "var(--admin-text-secondary)", marginTop: "6px", display: "block" }}>
                  Intervalo mínimo (em dias) exigido entre o final de um trancamento e o início do próximo.
                </span>
              </div>

              <div className="admin-form-group">
                <label>Comportamento da Cobrança Durante o Trancamento</label>
                <select 
                  className="admin-input" 
                  value={freezeBillingBehavior}
                  onChange={(e) => setFreezeBillingBehavior(e.target.value)}
                  disabled={isSubmitting}
                >
                  <option value="pause_billing">Pausar a Geração de Faturas (Volta a cobrar automaticamente após o trancamento)</option>
                  <option value="keep_billing">Manter Faturas nas Datas Originais (Compensa os dias trancados no fim do contrato)</option>
                </select>
                <span style={{ fontSize: "12px", color: "var(--admin-text-secondary)", marginTop: "6px", display: "block" }}>
                  Determina se a cobrança do aluno será pausada imediatamente ou se continuará ativa gerando créditos de dias adicionados no final.
                </span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * BillingRulesSection: Seções de Cobrança — Juros, Multa, Carência e Pró-Rata.
 *
 * Subcomponente extraído (Anti-Monolith) da sub-aba "Cobrança" do Financeiro.
 * Agrupa as regras de encargos automáticos e cobrança proporcional.
 *
 * @architecture
 * - Orquestrado pelo `FinancialSettingsManager` (recebe `settings` e `handleChange`).
 * - Estilos centralizados em `utils-financial-styles.ts` (Iron Monolith).
 *
 * @param {BillingRulesSectionProps} props - Estado centralizado do orquestrador.
 */

import {
  Percent, CalendarClock, Info, Scale,
} from "lucide-react";
import {
  sectionHeaderStyle, iconBadgeStyle, sectionTitleStyle, sectionDescStyle,
  inputLabelStyle, inputStyle, hintStyle, toggleLabelStyle, checkboxStyle,
  toggleSubDescStyle, innerCardStyle, subConfigPanelStyle, alertBannerStyle,
} from "./utils-financial-styles";

/** Tipo dos campos de cobrança gerenciados por este subcomponente */
interface BillingSettings {
  fin_interest_rate: string;
  fin_late_fee: string;
  fin_grace_period_days: string;
  fin_prorata_enabled: boolean;
  fin_prorata_method: string;
}

interface BillingRulesSectionProps {
  settings: BillingSettings;
  handleChange: (key: string, value: string | boolean) => void;
}

export default function BillingRulesSection({
  settings,
  handleChange,
}: BillingRulesSectionProps) {
  const warningAlert = alertBannerStyle("warning");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>

      {/* ═══ JUROS, MULTA & CARÊNCIA ═══ */}
      <div className="admin-card">
        <div style={sectionHeaderStyle}>
          <div style={iconBadgeStyle()}><Percent size={20} color="#FFF" /></div>
          <h2 style={sectionTitleStyle}>Juros, Multa &amp; Carência</h2>
        </div>
        <p style={sectionDescStyle}>
          Defina os encargos aplicados automaticamente em faturas atrasadas.
          O sistema respeita o <strong>período de carência</strong> antes de aplicar
          qualquer cobrança adicional — ideal para dar uma margem ao aluno
          sem perder o controle financeiro.
        </p>

        <div style={warningAlert.container}>
          <Scale size={18} style={{ flexShrink: 0, color: "#D97706", marginTop: "2px" }} />
          <p style={warningAlert.text}>
            <strong>Referência Legal (CDC Art. 52):</strong> O Código de Defesa do
            Consumidor limita juros a <strong>1% a.m.</strong> e multa a <strong>2%</strong> do
            valor da fatura. Valores acima podem ser contestados judicialmente.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px" }}>
          <div style={innerCardStyle}>
            <label style={inputLabelStyle}>JUROS AO MÊS (%)</label>
            <input type="number" value={settings.fin_interest_rate}
              onChange={(e) => handleChange("fin_interest_rate", e.target.value)}
              min={0} max={10} step={0.5} style={inputStyle} />
            <span style={hintStyle}>Incide proporcionalmente por dia de atraso (juros simples)</span>
          </div>
          <div style={innerCardStyle}>
            <label style={inputLabelStyle}>MULTA POR ATRASO (%)</label>
            <input type="number" value={settings.fin_late_fee}
              onChange={(e) => handleChange("fin_late_fee", e.target.value)}
              min={0} max={10} step={0.5} style={inputStyle} />
            <span style={hintStyle}>Aplicada uma única vez no primeiro dia após a carência</span>
          </div>
          <div style={innerCardStyle}>
            <label style={inputLabelStyle}>CARÊNCIA (DIAS SEM JUROS)</label>
            <input type="number" value={settings.fin_grace_period_days}
              onChange={(e) => handleChange("fin_grace_period_days", e.target.value)}
              min={0} max={30} style={inputStyle} />
            <span style={hintStyle}>Período de tolerância após o vencimento. 0 = cobrar imediatamente</span>
          </div>
        </div>

        {/* Exemplo visual do fluxo */}
        <div style={{
          display: "flex", alignItems: "center", marginTop: "20px",
          padding: "12px 16px", background: "#F9FAFB",
          border: "1px dashed #D1D5DB", fontSize: "11px", fontWeight: 600, color: "#666",
        }}>
          <Info size={14} style={{ flexShrink: 0, marginRight: "10px", color: "#9CA3AF" }} />
          <span style={{ whiteSpace: "nowrap" }}>
            Vencimento → <strong style={{ color: "#000" }}>{settings.fin_grace_period_days} dias de carência</strong> → Multa de <strong style={{ color: "#000" }}>{settings.fin_late_fee}%</strong> → Juros de <strong style={{ color: "#000" }}>{settings.fin_interest_rate}% a.m.</strong> (diário)
          </span>
        </div>
      </div>

      {/* ═══ PRÓ-RATA ═══ */}
      <div className="admin-card">
        <div style={sectionHeaderStyle}>
          <div style={iconBadgeStyle()}><CalendarClock size={20} color="#FFF" /></div>
          <h2 style={sectionTitleStyle}>Cobrança Proporcional (Pró-Rata)</h2>
        </div>
        <p style={sectionDescStyle}>
          Quando um aluno troca a data de vencimento ou inicia o contrato no meio do mês,
          o sistema pode cobrar <strong>proporcionalmente</strong> pelos dias de diferença.
          Isso garante que nenhum período fique &quot;descoberto&quot; financeiramente.
        </p>

        <label style={toggleLabelStyle(settings.fin_prorata_enabled)}>
          <input type="checkbox" checked={settings.fin_prorata_enabled}
            onChange={(e) => handleChange("fin_prorata_enabled", e.target.checked)}
            style={checkboxStyle()} />
          <div>
            <span style={{ display: "block" }}>ATIVAR COBRANÇA PROPORCIONAL</span>
            <span style={toggleSubDescStyle}>
              Gera automaticamente uma fatura pró-rata quando há dias descobertos em trocas de vencimento
            </span>
          </div>
        </label>

        {settings.fin_prorata_enabled && (
          <div style={subConfigPanelStyle}>
            <label style={{ ...inputLabelStyle, marginBottom: "12px" }}>MÉTODO DE CÁLCULO</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              {[
                { value: "proporcional", label: "PROPORCIONAL (DIAS REAIS)", desc: "Divide o valor da mensalidade pelos dias reais do mês em questão. Mais preciso.", example: "Ex: R$ 200 ÷ 30 dias = R$ 6,67/dia" },
                { value: "fixo_30", label: "MÊS COMERCIAL (30 DIAS)", desc: "Sempre calcula com base em 30 dias, independente do mês. Mais previsível.", example: "Ex: R$ 200 ÷ 30 = R$ 6,67/dia (fixo)" },
              ].map((opt) => {
                const sel = settings.fin_prorata_method === opt.value;
                return (
                  <label key={opt.value} style={{
                    display: "flex", flexDirection: "column", gap: "8px",
                    padding: "20px", cursor: "pointer",
                    border: sel ? "2px solid #000" : "1px solid #DDD",
                    background: sel ? "#FFF" : "#FAFAFA", transition: "all 0.2s",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <input type="radio" name="prorata_method" value={opt.value}
                        checked={sel} onChange={(e) => handleChange("fin_prorata_method", e.target.value)}
                        style={{ accentColor: "#000", width: "16px", height: "16px" }} />
                      <span style={{ fontSize: "12px", fontWeight: 800, letterSpacing: "0.02em" }}>{opt.label}</span>
                    </div>
                    <span style={{ fontSize: "11px", color: "#666", fontWeight: 500, paddingLeft: "26px", lineHeight: 1.5 }}>{opt.desc}</span>
                    <span style={{ fontSize: "10px", fontWeight: 700, color: "#999", paddingLeft: "26px", fontStyle: "italic" }}>{opt.example}</span>
                  </label>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

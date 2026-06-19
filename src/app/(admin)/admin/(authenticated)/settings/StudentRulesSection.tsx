/**
 * StudentRulesSection: Seções de Regras do Aluno — Autonomia e Inadimplência.
 *
 * Subcomponente extraído (Anti-Monolith) da sub-aba "Regras do Aluno" do Financeiro.
 * Agrupa as configurações de autonomia do aluno (self-service) e os bloqueios
 * automáticos por inadimplência.
 *
 * @architecture
 * - Orquestrado pelo `FinancialSettingsManager` (recebe `settings` e `handleChange`).
 * - Estilos centralizados em `utils-financial-styles.ts` (Iron Monolith).
 *
 * @param {StudentRulesSectionProps} props - Estado centralizado do orquestrador.
 */

import {
  UserCog, ShieldAlert, Lock,
} from "lucide-react";
import {
  sectionHeaderStyle, iconBadgeStyle, sectionTitleStyle, sectionDescStyle,
  inputLabelStyle, inputStyle, hintStyle, toggleLabelStyle, checkboxStyle,
  toggleSubDescStyle, innerCardStyle, subConfigPanelStyle, alertBannerStyle,
} from "./utils-financial-styles";

/** Tipo dos campos de regras do aluno gerenciados por este subcomponente */
interface StudentRulesSettings {
  fin_student_change_due_date: boolean;
  fin_max_due_date_changes: string;
  fin_due_date_change_cooldown_months: string;
  fin_block_change_if_overdue: boolean;
  fin_block_checkin_overdue_days: string;
  fin_auto_suspend_contract: boolean;
}

interface StudentRulesSectionProps {
  settings: StudentRulesSettings;
  handleChange: (key: string, value: string | boolean) => void;
}

export default function StudentRulesSection({
  settings,
  handleChange,
}: StudentRulesSectionProps) {
  const dangerAlert = alertBannerStyle("danger");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>

      {/* ═══ AUTONOMIA DO ALUNO ═══ */}
      <div className="admin-card">
        <div style={sectionHeaderStyle}>
          <div style={iconBadgeStyle()}><UserCog size={20} color="#FFF" /></div>
          <h2 style={sectionTitleStyle}>Autonomia do Aluno (Self-Service)</h2>
        </div>
        <p style={sectionDescStyle}>
          Controle a liberdade do aluno para gerenciar seus dados contratuais pelo app/portal.
          <strong> Mais autonomia = menos carga operacional na recepção</strong> — mas defina travas
          de segurança para evitar manipulações.
        </p>

        <label style={toggleLabelStyle(settings.fin_student_change_due_date)}>
          <input type="checkbox" checked={settings.fin_student_change_due_date}
            onChange={(e) => handleChange("fin_student_change_due_date", e.target.checked)}
            style={checkboxStyle()} />
          <div>
            <span style={{ display: "block" }}>PERMITIR QUE O ALUNO ALTERE A DATA DE VENCIMENTO</span>
            <span style={toggleSubDescStyle}>O aluno poderá solicitar a troca diretamente pelo app, sem contatar a recepção</span>
          </div>
        </label>

        {settings.fin_student_change_due_date && (
          <div style={subConfigPanelStyle}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
              <Lock size={14} color="#666" />
              <span style={{ fontSize: "11px", fontWeight: 800, color: "#666", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Travas de Segurança
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div style={{ padding: "16px", background: "#FFF", border: "1px solid #EEE" }}>
                <label style={inputLabelStyle}>MÁXIMO DE ALTERAÇÕES POR ANO</label>
                <input type="number" value={settings.fin_max_due_date_changes}
                  onChange={(e) => handleChange("fin_max_due_date_changes", e.target.value)}
                  min={1} max={12} style={inputStyle} />
                <span style={hintStyle}>Limita quantas vezes o aluno pode trocar o vencimento no ano</span>
              </div>
              <div style={{ padding: "16px", background: "#FFF", border: "1px solid #EEE" }}>
                <label style={inputLabelStyle}>COOLDOWN ENTRE ALTERAÇÕES (MESES)</label>
                <input type="number" value={settings.fin_due_date_change_cooldown_months}
                  onChange={(e) => handleChange("fin_due_date_change_cooldown_months", e.target.value)}
                  min={1} max={12} style={inputStyle} />
                <span style={hintStyle}>Intervalo mínimo obrigatório entre duas trocas consecutivas</span>
              </div>
            </div>
          </div>
        )}

        <label style={{ ...toggleLabelStyle(settings.fin_block_change_if_overdue, "danger"), marginTop: "16px" }}>
          <input type="checkbox" checked={settings.fin_block_change_if_overdue}
            onChange={(e) => handleChange("fin_block_change_if_overdue", e.target.checked)}
            style={checkboxStyle("danger")} />
          <div>
            <span style={{ display: "block" }}>BLOQUEAR ALTERAÇÃO SE O ALUNO ESTIVER INADIMPLENTE</span>
            <span style={toggleSubDescStyle}>Impede que alunos com faturas em atraso manipulem a data para evitar cobrança</span>
          </div>
        </label>
      </div>

      {/* ═══ INADIMPLÊNCIA & BLOQUEIOS ═══ */}
      <div className="admin-card">
        <div style={sectionHeaderStyle}>
          <div style={iconBadgeStyle("#DC2626")}><ShieldAlert size={20} color="#FFF" /></div>
          <h2 style={sectionTitleStyle}>Inadimplência &amp; Bloqueios Automáticos</h2>
        </div>
        <p style={sectionDescStyle}>
          Configure ações automáticas quando o sistema detectar inadimplência.
          Esses bloqueios funcionam como <strong>travas de segurança financeira</strong> para
          proteger o box sem depender de intervenção manual da gestão.
        </p>

        <div style={dangerAlert.container}>
          <ShieldAlert size={18} style={{ flexShrink: 0, color: "#DC2626", marginTop: "2px" }} />
          <p style={dangerAlert.text}>
            <strong>Atenção:</strong> O bloqueio de check-in impede fisicamente o aluno de treinar.
            Recomendamos usar em conjunto com o período de carência para dar margem
            antes do bloqueio.
          </p>
        </div>

        <div style={{ ...innerCardStyle, marginBottom: "16px" }}>
          <label style={inputLabelStyle}>BLOQUEAR CHECK-IN APÓS QUANTOS DIAS DE ATRASO</label>
          <input type="number" value={settings.fin_block_checkin_overdue_days}
            onChange={(e) => handleChange("fin_block_checkin_overdue_days", e.target.value)}
            min={0} max={90} style={{ ...inputStyle, maxWidth: "200px" }} />
          <span style={hintStyle}>
            Defina <strong>0</strong> para nunca bloquear automaticamente.
            O aluno será impedido de fazer check-in até regularizar.
          </span>
        </div>

        <label style={toggleLabelStyle(settings.fin_auto_suspend_contract, "danger")}>
          <input type="checkbox" checked={settings.fin_auto_suspend_contract}
            onChange={(e) => handleChange("fin_auto_suspend_contract", e.target.checked)}
            style={checkboxStyle("danger")} />
          <div>
            <span style={{ display: "block" }}>SUSPENDER CONTRATO AUTOMATICAMENTE POR INADIMPLÊNCIA</span>
            <span style={toggleSubDescStyle}>Congela o contrato e para de gerar novas faturas até o aluno regularizar a dívida</span>
          </div>
        </label>
      </div>
    </div>
  );
}

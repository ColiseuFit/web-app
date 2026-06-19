"use client";

import { useState, useTransition } from "react";
import {
  Percent, UserCog, FileText, CreditCard,
  Loader2, Save, CheckCircle2, AlertCircle,
} from "lucide-react";
import { updateBoxSettingsAction } from "@/lib/constants/settings_actions";
import BillingRulesSection from "./BillingRulesSection";
import StudentRulesSection from "./StudentRulesSection";
import FiscalSettingsSection from "./FiscalSettingsSection";
import PaymentGatewaySettingsSection from "./PaymentGatewaySettingsSection";

interface FinancialSettingsManagerProps {
  initialSettings: Record<string, string>;
}

/**
 * Sub-abas internas da aba Financeiro.
 * Cada sub-aba renderiza apenas o grupo relevante de seções,
 * evitando scroll longo e mistura de contextos.
 *
 * @architecture
 * - "cobranca" → Juros/Multa/Carência + Pró-Rata
 * - "regras"   → Autonomia do Aluno + Inadimplência/Bloqueios
 * - "fiscal"   → Configurações NFS-e (gateway, CNAE, carência CDC)
 */
const FINANCIAL_SUB_TABS = [
  { id: "cobranca", label: "Cobrança", icon: Percent },
  { id: "regras", label: "Regras do Aluno", icon: UserCog },
  { id: "fiscal", label: "Fiscal (NFS-e)", icon: FileText },
  { id: "gateway", label: "Gateway (Pagar.me)", icon: CreditCard },
] as const;

type FinancialSubTab = typeof FINANCIAL_SUB_TABS[number]["id"];

/**
 * FinancialSettingsManager: Orquestra a aba "Financeiro" das configurações.
 * Define as regras de negócio financeiras que governam contratos, faturas,
 * a autonomia do aluno e as políticas de cancelamento.
 *
 * @architecture
 * - Persistência via `updateBoxSettingsAction` (upsert em `box_settings`).
 * - SSoT: Cada regra é armazenada como par chave-valor no banco.
 * - Sub-abas internas isolam grupos de configurações (Anti-Monolith).
 * - Subcomponentes: BillingRulesSection, StudentRulesSection, FiscalSettingsSection.
 *
 * @security
 * - Apenas administradores têm acesso a esta aba (RLS + role check).
 * - Valores de porcentagem são validados localmente antes do envio.
 *
 * @param {FinancialSettingsManagerProps} props - Settings iniciais do servidor.
 */
export default function FinancialSettingsManager({
  initialSettings,
}: FinancialSettingsManagerProps) {
  const [isPending, startTransition] = useTransition();
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "success" | "error"
  >("idle");
  const [activeSubTab, setActiveSubTab] = useState<FinancialSubTab>("cobranca");

  const [settings, setSettings] = useState({
    // Juros & Multa
    fin_interest_rate: initialSettings.fin_interest_rate || "2",
    fin_late_fee: initialSettings.fin_late_fee || "2",
    fin_grace_period_days: initialSettings.fin_grace_period_days || "3",
    // Pró-rata
    fin_prorata_enabled: initialSettings.fin_prorata_enabled !== "false",
    fin_prorata_method: initialSettings.fin_prorata_method || "proporcional",
    // Autonomia do Aluno
    fin_student_change_due_date: initialSettings.fin_student_change_due_date === "true",
    fin_max_due_date_changes: initialSettings.fin_max_due_date_changes || "1",
    fin_due_date_change_cooldown_months: initialSettings.fin_due_date_change_cooldown_months || "6",
    fin_block_change_if_overdue: initialSettings.fin_block_change_if_overdue !== "false",
    // Inadimplência
    fin_block_checkin_overdue_days: initialSettings.fin_block_checkin_overdue_days || "15",
    fin_auto_suspend_contract: initialSettings.fin_auto_suspend_contract === "true",
    // Fiscal (NFS-e)
    fiscal_enabled: initialSettings.fiscal_enabled === "true",
    fiscal_cnae: initialSettings.fiscal_cnae || "",
    fiscal_iss_rate: initialSettings.fiscal_iss_rate || "2.00",
    fiscal_service_description: initialSettings.fiscal_service_description || "Serviços de condicionamento físico e atividades esportivas",
    fiscal_gateway_provider: initialSettings.fiscal_gateway_provider || "focusnfe",
    fiscal_gateway_token: initialSettings.fiscal_gateway_token || "",
    fiscal_environment: initialSettings.fiscal_environment || "sandbox",
    fiscal_grace_period_enabled: initialSettings.fiscal_grace_period_enabled !== "false",
    fiscal_grace_period_days: initialSettings.fiscal_grace_period_days || "7",
    // Gateway de Pagamento (Pagar.me)
    pagarme_public_key: initialSettings.pagarme_public_key || "",
    pagarme_secret_key: initialSettings.pagarme_secret_key || "",
    pagarme_environment: initialSettings.pagarme_environment || "test",
  });

  const handleChange = (key: string, value: string | boolean) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    if (saveStatus !== "idle") setSaveStatus("idle");
  };

  /**
   * handleSave: Serializa TODOS os campos do estado e faz upsert em `box_settings`.
   * O fluxo é agnóstico à sub-aba ativa — salva tudo de uma vez.
   *
   * @throws Captura erros de rede/permissão e exibe feedback visual.
   */
  const handleSave = async () => {
    setSaveStatus("saving");
    startTransition(async () => {
      try {
        const payload: Record<string, string> = {};
        for (const [key, val] of Object.entries(settings)) {
          payload[key] = String(val);
        }
        const result = await updateBoxSettingsAction(payload);
        if (result.success) {
          setSaveStatus("success");
          setTimeout(() => setSaveStatus("idle"), 3000);
        } else {
          setSaveStatus("error");
        }
      } catch (err) {
        console.error("[FinancialSettingsManager] Erro ao salvar:", err);
        setSaveStatus("error");
      }
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>

      {/* ═══ SUB-ABAS INTERNAS ═══ */}
      <div style={{
        display: "flex",
        gap: "0",
        marginBottom: "28px",
        borderBottom: "3px solid #000",
      }}>
        {FINANCIAL_SUB_TABS.map((tab) => {
          const isActive = activeSubTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "14px 28px",
                fontSize: "12px",
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                cursor: "pointer",
                border: "none",
                borderBottom: isActive ? "3px solid #000" : "3px solid transparent",
                marginBottom: "-3px",
                background: isActive ? "#FFF" : "transparent",
                color: isActive ? "#000" : "#999",
                transition: "all 0.15s cubic-bezier(0.4, 0, 0.2, 1)",
              }}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ═══ CONTEÚDO DA SUB-ABA ATIVA ═══ */}
      <div style={{ animation: "subTabFadeIn 0.25s ease" }}>
        <style>{`
          @keyframes subTabFadeIn {
            from { opacity: 0; transform: translateY(6px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>

        {activeSubTab === "cobranca" && (
          <BillingRulesSection
            settings={settings}
            handleChange={handleChange}
          />
        )}

        {activeSubTab === "regras" && (
          <StudentRulesSection
            settings={settings}
            handleChange={handleChange}
          />
        )}

        {activeSubTab === "fiscal" && (
          <FiscalSettingsSection
            settings={settings}
            handleChange={handleChange}
          />
        )}

        {activeSubTab === "gateway" && (
          <PaymentGatewaySettingsSection
            settings={settings}
            handleChange={handleChange}
          />
        )}
      </div>

      {/* ═══ BOTÃO SALVAR (STICKY) ═══ */}
      <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: "24px", position: "sticky", bottom: "32px" }}>
        <button onClick={handleSave} disabled={isPending || saveStatus === "saving"}
          className="admin-btn admin-btn-primary"
          style={{
            height: "60px", padding: "0 40px", fontSize: "14px", fontWeight: 900,
            display: "flex", alignItems: "center", gap: "12px",
            minWidth: "300px", justifyContent: "center",
            boxShadow: (isPending || saveStatus === "saving") ? "6px 6px 0 #000" : "10px 10px 0 #000",
            transform: (isPending || saveStatus === "saving") ? "translate(4px, 4px)" : "none",
          }}>
          {saveStatus === "saving" ? (<><Loader2 className="animate-spin" size={20} /><span>SALVANDO ALTERAÇÕES...</span></>)
            : saveStatus === "success" ? (<><CheckCircle2 size={20} /><span>REGRAS FINANCEIRAS SALVAS!</span></>)
            : saveStatus === "error" ? (<><AlertCircle size={20} /><span>ERRO AO SALVAR</span></>)
            : (<><Save size={20} /><span>SALVAR REGRAS FINANCEIRAS</span></>)}
        </button>
      </div>
    </div>
  );
}

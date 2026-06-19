import { CreditCard, Key, ShieldCheck, AlertTriangle } from "lucide-react";
import { innerCardStyle, inputStyle, inputLabelStyle } from "./utils-financial-styles";

interface PaymentGatewaySettingsSectionProps {
  settings: any;
  handleChange: (key: string, value: string | boolean) => void;
}

/**
 * Componente que isola as configurações do Pagar.me V5 (Gateway de Pagamento).
 * Seguindo a regra Iron Monolith e Anti-Monolith, os cards mantêm a estética neo-brutalista
 * e o state é gerenciado pelo orquestrador pai (FinancialSettingsManager).
 */
export default function PaymentGatewaySettingsSection({
  settings,
  handleChange,
}: PaymentGatewaySettingsSectionProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      
      {/* CARD: Ambiente e Ativação */}
      <div style={innerCardStyle}>
        <div style={{ marginBottom: "24px" }}>
          <h2 style={{ fontSize: "16px", fontWeight: 900, textTransform: "uppercase", display: "flex", alignItems: "center", gap: "10px", margin: 0 }}>
            <CreditCard size={20} />
            MOTOR DE PAGAMENTOS (PAGAR.ME V5)
          </h2>
          <p style={{ margin: "8px 0 0 0", fontSize: "13px", color: "#666", lineHeight: 1.5 }}>
            Configure suas chaves da Stone/Pagar.me para habilitar a Tokenização de Cartões (PCI Compliance) e a Cobrança Recorrente 1-Clique.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "24px" }}>
          <div>
            <label style={inputLabelStyle}>Ambiente de Transação</label>
            <div style={{ display: "flex", gap: "16px", marginTop: "8px" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "14px", fontWeight: 700 }}>
                <input
                  type="radio"
                  name="pagarme_environment"
                  checked={settings.pagarme_environment === "test"}
                  onChange={() => handleChange("pagarme_environment", "test")}
                  style={{ width: "18px", height: "18px", accentColor: "#000" }}
                />
                TESTE (Homologação)
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "14px", fontWeight: 700 }}>
                <input
                  type="radio"
                  name="pagarme_environment"
                  checked={settings.pagarme_environment === "live"}
                  onChange={() => handleChange("pagarme_environment", "live")}
                  style={{ width: "18px", height: "18px", accentColor: "#000" }}
                />
                PRODUÇÃO (Real)
              </label>
            </div>
            {settings.pagarme_environment === "test" && (
              <div style={{ display: "flex", gap: "8px", background: "#FFF3CD", border: "2px solid #FFEEBA", padding: "12px", marginTop: "12px", borderRadius: "8px" }}>
                <AlertTriangle size={18} color="#856404" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: "13px", color: "#856404", fontWeight: 600 }}>O sistema não cobrará dinheiro real. Use apenas as chaves pk_test_ e sk_test_ fornecidas pelo Pagar.me.</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CARD: Chaves de API */}
      <div style={{ ...innerCardStyle, background: "#FAFAFA" }}>
        <div style={{ marginBottom: "24px" }}>
          <h3 style={{ fontSize: "15px", fontWeight: 800, textTransform: "uppercase", display: "flex", alignItems: "center", gap: "10px", margin: 0 }}>
            <Key size={18} />
            CHAVES DA API (API KEYS)
          </h3>
          <p style={{ margin: "8px 0 0 0", fontSize: "13px", color: "#666", lineHeight: 1.5 }}>
            Estas chaves são obtidas no seu painel Pagar.me em <strong>Configurações &gt; Chaves</strong>.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "20px" }}>
          <div>
            <label style={inputLabelStyle}>Chave Pública (Public Key - pk_)</label>
            <input
              type="text"
              value={settings.pagarme_public_key || ""}
              onChange={(e) => handleChange("pagarme_public_key", e.target.value)}
              placeholder={settings.pagarme_environment === "test" ? "pk_test_XXXXXXXXXXXXXXXXX" : "pk_live_XXXXXXXXXXXXXXXXX"}
              style={{ ...inputStyle, fontFamily: "monospace" }}
            />
            <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#666" }}>Usada no frontend para criptografar o cartão do aluno com segurança (PCI).</p>
          </div>

          <div>
            <label style={inputLabelStyle}>Chave Secreta (Secret Key - sk_)</label>
            <input
              type="password"
              value={settings.pagarme_secret_key || ""}
              onChange={(e) => handleChange("pagarme_secret_key", e.target.value)}
              placeholder={settings.pagarme_environment === "test" ? "sk_test_XXXXXXXXXXXXXXXXX" : "sk_live_XXXXXXXXXXXXXXXXX"}
              style={{ ...inputStyle, fontFamily: "monospace" }}
            />
            <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#666" }}>Mantida apenas no servidor. Dá o poder de debitar saldo e gerenciar assinaturas.</p>
          </div>
        </div>
      </div>

      {/* CARD: PCI Compliance Banner */}
      <div style={{ padding: "20px", border: "2px dashed #00875A", background: "#E3FCEF", display: "flex", alignItems: "flex-start", gap: "16px" }}>
        <ShieldCheck size={28} color="#00875A" style={{ flexShrink: 0 }} />
        <div>
          <h4 style={{ margin: "0 0 4px 0", fontSize: "14px", fontWeight: 800, color: "#006644" }}>SISTEMA 100% PCI COMPLIANT</h4>
          <p style={{ margin: 0, fontSize: "13px", color: "#006644", lineHeight: 1.5 }}>
            O Coliseu adota a Tokenização de Cartão (Card Vaulting). Nenhum número de cartão de crédito tocará o nosso banco de dados, protegendo sua academia de riscos legais.
          </p>
        </div>
      </div>

    </div>
  );
}

/**
 * FiscalSettingsSection: Seção 5 da aba Financeiro — Configurações Fiscais (NFS-e).
 *
 * Subcomponente extraído (Anti-Monolith) que renderiza a interface de configuração
 * para emissão automática de Notas Fiscais de Serviço Eletrônica.
 *
 * @architecture
 * - Orquestrado pelo `FinancialSettingsManager` (recebe `settings` e `handleChange`).
 * - Persistência via `box_settings` (mesmo fluxo de upsert já existente).
 * - Estilos centralizados em `utils-financial-styles.ts` (Iron Monolith).
 *
 * @security
 * - O campo de token usa `type="password"` com toggle de visibilidade.
 * - Dados fiscais sensíveis são protegidos por RLS (somente admins).
 *
 * @param {FiscalSettingsSectionProps} props - Estado centralizado do orquestrador.
 */

import { useState } from "react";
import {
  FileText, Building2, Key, Globe, Clock,
  Eye, EyeOff, AlertTriangle, Info, ShieldCheck,
} from "lucide-react";
import {
  sectionHeaderStyle, iconBadgeStyle, sectionTitleStyle, sectionDescStyle,
  inputLabelStyle, inputStyle, hintStyle, toggleLabelStyle, checkboxStyle,
  toggleSubDescStyle, innerCardStyle, subConfigPanelStyle, alertBannerStyle,
} from "./utils-financial-styles";

/** Tipo dos campos fiscais gerenciados por este subcomponente */
interface FiscalSettings {
  fiscal_enabled: boolean;
  fiscal_cnae: string;
  fiscal_iss_rate: string;
  fiscal_service_description: string;
  fiscal_gateway_provider: string;
  fiscal_gateway_token: string;
  fiscal_environment: string;
  fiscal_grace_period_enabled: boolean;
  fiscal_grace_period_days: string;
}

interface FiscalSettingsSectionProps {
  settings: FiscalSettings;
  handleChange: (key: string, value: string | boolean) => void;
}

export default function FiscalSettingsSection({
  settings,
  handleChange,
}: FiscalSettingsSectionProps) {
  /**
   * Estado local para controle de visibilidade do token da API.
   * Não afeta persistência — é apenas UX para o campo de senha.
   */
  const [showToken, setShowToken] = useState(false);

  const infoAlert = alertBannerStyle("info");
  const warningAlert = alertBannerStyle("warning");

  return (
    <div className="admin-card">
      {/* ── HEADER DA SEÇÃO ── */}
      <div style={sectionHeaderStyle}>
        <div style={iconBadgeStyle("#1D4ED8")}>
          <FileText size={20} color="#FFF" />
        </div>
        <h2 style={sectionTitleStyle}>Emissão de Notas Fiscais (NFS-e)</h2>
      </div>
      <p style={sectionDescStyle}>
        Configure a emissão automática de Notas Fiscais de Serviço Eletrônica
        para cada fatura paga. O sistema integra com gateways fiscais para
        transmitir as notas diretamente à prefeitura — sem trabalho manual
        para a contabilidade.
      </p>

      {/* ── BANNER INFORMATIVO ── */}
      <div style={infoAlert.container}>
        <Info size={18} style={{ flexShrink: 0, color: "#1D4ED8", marginTop: "2px" }} />
        <p style={infoAlert.text}>
          <strong>Fase de Preparação:</strong> Este módulo configura os parâmetros
          fiscais do seu box. A integração real com o gateway será ativada em uma
          etapa posterior. Configure agora para estar pronto quando a conexão
          for estabelecida.
        </p>
      </div>

      {/* ── TOGGLE MASTER: ATIVAR EMISSÃO ── */}
      <label style={toggleLabelStyle(settings.fiscal_enabled)}>
        <input
          type="checkbox"
          checked={settings.fiscal_enabled}
          onChange={(e) => handleChange("fiscal_enabled", e.target.checked)}
          style={checkboxStyle()}
        />
        <div>
          <span style={{ display: "block" }}>
            ATIVAR EMISSÃO AUTOMÁTICA DE NFS-e
          </span>
          <span style={toggleSubDescStyle}>
            Quando ativado, o sistema emitirá notas fiscais automaticamente
            para cada fatura marcada como paga
          </span>
        </div>
      </label>

      {/* ── SUB-PAINÉIS (só exibidos se fiscal_enabled = true) ── */}
      {settings.fiscal_enabled && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px", marginTop: "20px" }}>

          {/* ═══ PAINEL 1: DADOS FISCAIS DO ESTABELECIMENTO ═══ */}
          <div style={subConfigPanelStyle}>
            <div style={{
              display: "flex", alignItems: "center", gap: "8px",
              marginBottom: "20px",
            }}>
              <Building2 size={16} color="#666" />
              <span style={{
                fontSize: "12px", fontWeight: 800, color: "#555",
                textTransform: "uppercase", letterSpacing: "0.05em",
              }}>
                Dados Fiscais do Estabelecimento
              </span>
            </div>

            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "16px",
              marginBottom: "16px",
            }}>
              {/* CNAE / Código de Serviço */}
              <div style={innerCardStyle}>
                <label style={inputLabelStyle}>
                  CNAE / CÓDIGO DE SERVIÇO MUNICIPAL
                </label>
                <input
                  type="text"
                  value={settings.fiscal_cnae}
                  onChange={(e) => handleChange("fiscal_cnae", e.target.value)}
                  placeholder="Ex: 01.07 ou 9313-1/00"
                  style={inputStyle}
                />
                <span style={hintStyle}>
                  Código da atividade econômica usado pela prefeitura na NFS-e.
                  Consulte seu contador para o código correto do seu município.
                </span>
              </div>

              {/* Alíquota ISS */}
              <div style={innerCardStyle}>
                <label style={inputLabelStyle}>
                  ALÍQUOTA ISS (%)
                </label>
                <input
                  type="number"
                  value={settings.fiscal_iss_rate}
                  onChange={(e) => handleChange("fiscal_iss_rate", e.target.value)}
                  min={0}
                  max={5}
                  step={0.01}
                  style={inputStyle}
                />
                <span style={hintStyle}>
                  Imposto Sobre Serviços retido na fonte. Varia de 2% a 5%
                  conforme o município e regime tributário (Simples, Presumido, Real).
                </span>
              </div>
            </div>

            {/* Descrição padrão do serviço */}
            <div style={innerCardStyle}>
              <label style={inputLabelStyle}>
                DESCRIÇÃO PADRÃO DO SERVIÇO (DISCRIMINAÇÃO)
              </label>
              <input
                type="text"
                value={settings.fiscal_service_description}
                onChange={(e) => handleChange("fiscal_service_description", e.target.value)}
                placeholder="Serviços de condicionamento físico e atividades esportivas"
                style={inputStyle}
              />
              <span style={hintStyle}>
                Texto que aparecerá no campo &quot;discriminação&quot; da NFS-e.
                Deve descrever a natureza do serviço prestado conforme orientação contábil.
              </span>
            </div>
          </div>

          {/* ═══ PAINEL 2: INTEGRAÇÃO COM GATEWAY ═══ */}
          <div style={subConfigPanelStyle}>
            <div style={{
              display: "flex", alignItems: "center", gap: "8px",
              marginBottom: "20px",
            }}>
              <Key size={16} color="#666" />
              <span style={{
                fontSize: "12px", fontWeight: 800, color: "#555",
                textTransform: "uppercase", letterSpacing: "0.05em",
              }}>
                Integração com Gateway Fiscal
              </span>
            </div>

            {/* Token da API */}
            <div style={{ ...innerCardStyle, marginBottom: "16px" }}>
              <label style={inputLabelStyle}>
                TOKEN DA API (CHAVE DE ACESSO)
              </label>
              <div style={{
                display: "flex", alignItems: "center", gap: "0",
                border: "2px solid #000",
              }}>
                <input
                  type={showToken ? "text" : "password"}
                  value={settings.fiscal_gateway_token}
                  onChange={(e) => handleChange("fiscal_gateway_token", e.target.value)}
                  placeholder="Cole aqui o token fornecido pelo gateway"
                  style={{
                    ...inputStyle,
                    border: "none",
                    flex: 1,
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowToken((prev) => !prev)}
                  aria-label={showToken ? "Ocultar token" : "Mostrar token"}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "48px",
                    height: "48px",
                    background: "#F5F5F5",
                    border: "none",
                    borderLeft: "2px solid #000",
                    cursor: "pointer",
                    flexShrink: 0,
                    transition: "background 0.2s",
                  }}
                >
                  {showToken
                    ? <EyeOff size={18} color="#666" />
                    : <Eye size={18} color="#666" />}
                </button>
              </div>
              <span style={hintStyle}>
                Credencial do gateway fiscal (FocusNFe, e-Notas, PlugNotas).
                Nunca compartilhe este token — ele dá acesso à emissão de notas
                em nome do seu CNPJ.
              </span>
            </div>

            {/* Ambiente: Sandbox vs Produção */}
            <div style={innerCardStyle}>
              <label style={{ ...inputLabelStyle, marginBottom: "12px" }}>
                AMBIENTE DE OPERAÇÃO
              </label>
              <div style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "12px",
              }}>
                {([
                  {
                    value: "sandbox",
                    label: "SANDBOX (TESTES)",
                    desc: "Notas emitidas em ambiente de homologação. Não têm valor fiscal real. Ideal para validar a integração.",
                    icon: Globe,
                    color: "#D97706",
                  },
                  {
                    value: "production",
                    label: "PRODUÇÃO (HOMOLOGADO)",
                    desc: "Notas emitidas com valor fiscal real e transmitidas à prefeitura. Use apenas após validar no sandbox.",
                    icon: ShieldCheck,
                    color: "#059669",
                  },
                ] as const).map((opt) => {
                  const isSelected = settings.fiscal_environment === opt.value;
                  const Icon = opt.icon;
                  return (
                    <label
                      key={opt.value}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "10px",
                        padding: "20px",
                        cursor: "pointer",
                        border: isSelected
                          ? `2px solid ${opt.color}`
                          : "1px solid #DDD",
                        background: isSelected ? "#FFF" : "#FAFAFA",
                        transition: "all 0.2s",
                      }}
                    >
                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                      }}>
                        <input
                          type="radio"
                          name="fiscal_environment"
                          value={opt.value}
                          checked={isSelected}
                          onChange={(e) => handleChange("fiscal_environment", e.target.value)}
                          style={{
                            accentColor: opt.color,
                            width: "16px",
                            height: "16px",
                          }}
                        />
                        <Icon size={16} color={opt.color} />
                        <span style={{
                          fontSize: "12px",
                          fontWeight: 800,
                          letterSpacing: "0.02em",
                        }}>
                          {opt.label}
                        </span>
                      </div>
                      <span style={{
                        fontSize: "11px",
                        color: "#666",
                        fontWeight: 500,
                        paddingLeft: "26px",
                        lineHeight: 1.5,
                      }}>
                        {opt.desc}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Alerta de produção */}
            {settings.fiscal_environment === "production" && (
              <div style={{ ...warningAlert.container, marginTop: "12px", marginBottom: 0 }}>
                <AlertTriangle size={18} style={{
                  flexShrink: 0, color: "#D97706", marginTop: "2px",
                }} />
                <p style={warningAlert.text}>
                  <strong>Atenção:</strong> No modo Produção, todas as notas emitidas
                  terão valor fiscal real e serão registradas na prefeitura.
                  Certifique-se de que os dados fiscais (CNAE, ISS, descrição)
                  estejam corretos antes de ativar.
                </p>
              </div>
            )}
          </div>

          {/* ═══ PAINEL 3: CARÊNCIA FISCAL (CDC ART. 49) ═══ */}
          <div style={subConfigPanelStyle}>
            <div style={{
              display: "flex", alignItems: "center", gap: "8px",
              marginBottom: "20px",
            }}>
              <Clock size={16} color="#666" />
              <span style={{
                fontSize: "12px", fontWeight: 800, color: "#555",
                textTransform: "uppercase", letterSpacing: "0.05em",
              }}>
                Carência Fiscal — Anti-Prejuízo (CDC Art. 49)
              </span>
            </div>

            <div style={{ ...warningAlert.container, marginBottom: "16px" }}>
              <AlertTriangle size={18} style={{
                flexShrink: 0, color: "#D97706", marginTop: "2px",
              }} />
              <p style={warningAlert.text}>
                <strong>Referência Legal (CDC Art. 49):</strong> O Código de Defesa do
                Consumidor garante <strong>7 dias de arrependimento</strong> para compras
                online. Se a NFS-e for emitida imediatamente e o aluno cancelar dentro
                do prazo, o box terá custo de cancelamento fiscal. A carência protege
                contra esse cenário.
              </p>
            </div>

            <label style={toggleLabelStyle(settings.fiscal_grace_period_enabled)}>
              <input
                type="checkbox"
                checked={settings.fiscal_grace_period_enabled}
                onChange={(e) => handleChange("fiscal_grace_period_enabled", e.target.checked)}
                style={checkboxStyle()}
              />
              <div>
                <span style={{ display: "block" }}>
                  APLICAR CARÊNCIA PARA VENDAS ONLINE
                </span>
                <span style={toggleSubDescStyle}>
                  Aguarda o período de arrependimento antes de emitir a NFS-e
                  para vendas realizadas online (cartão/PIX pelo app)
                </span>
              </div>
            </label>

            {settings.fiscal_grace_period_enabled && (
              <div style={{
                ...innerCardStyle,
                marginTop: "16px",
                maxWidth: "300px",
              }}>
                <label style={inputLabelStyle}>
                  DIAS DE CARÊNCIA ANTES DA EMISSÃO
                </label>
                <input
                  type="number"
                  value={settings.fiscal_grace_period_days}
                  onChange={(e) => handleChange("fiscal_grace_period_days", e.target.value)}
                  min={1}
                  max={30}
                  style={inputStyle}
                />
                <span style={hintStyle}>
                  Padrão: <strong>7 dias</strong> (mínimo legal CDC).
                  Vendas presenciais (balcão/dinheiro) não são afetadas pela carência.
                </span>
              </div>
            )}

            {/* Fluxo visual explicativo */}
            <div style={{
              display: "flex",
              alignItems: "center",
              marginTop: "16px",
              padding: "12px 16px",
              background: "#F9FAFB",
              border: "1px dashed #D1D5DB",
              fontSize: "11px",
              fontWeight: 600,
              color: "#666",
            }}>
              <Info size={14} style={{
                flexShrink: 0, marginRight: "10px", color: "#9CA3AF",
              }} />
              <span style={{ whiteSpace: "nowrap" }}>
                Pagamento confirmado →{" "}
                {settings.fiscal_grace_period_enabled ? (
                  <>
                    <strong style={{ color: "#000" }}>
                      {settings.fiscal_grace_period_days} dias de carência
                    </strong>
                    {" → "}
                  </>
                ) : null}
                <strong style={{ color: "#000" }}>
                  Emissão NFS-e
                </strong>
                {" → Nota disponível para o aluno"}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

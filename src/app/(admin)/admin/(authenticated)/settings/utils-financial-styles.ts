/**
 * Estilos compartilhados para os subcomponentes de Configurações Financeiras.
 * Mantém a paridade visual (Iron Monolith) entre todas as seções da aba Financeiro.
 *
 * @architecture
 * - Exporta objetos de estilo CSS-in-JS reutilizáveis.
 * - Centraliza tokens visuais para evitar duplicação e inconsistências.
 */

/** Header de cada card/seção com borda inferior preta */
export const sectionHeaderStyle = {
  display: "flex" as const,
  alignItems: "center" as const,
  gap: "12px",
  paddingBottom: "12px",
  borderBottom: "2px solid #000",
};

/** Badge quadrado do ícone no header */
export const iconBadgeStyle = (bgColor = "#000") => ({
  display: "flex" as const,
  alignItems: "center" as const,
  justifyContent: "center" as const,
  width: "40px",
  height: "40px",
  background: bgColor,
  flexShrink: 0 as const,
});

/** Título h2 da seção */
export const sectionTitleStyle = {
  fontSize: "16px",
  fontWeight: 800,
  textTransform: "uppercase" as const,
  margin: 0,
  letterSpacing: "-0.02em",
};

/** Parágrafo descritivo abaixo do header */
export const sectionDescStyle = {
  fontSize: "13px",
  fontWeight: 500,
  color: "#555",
  lineHeight: 1.7,
  margin: "16px 0 24px",
};

/** Label de input (uppercase, pequeno) */
export const inputLabelStyle = {
  display: "block" as const,
  fontSize: "11px",
  fontWeight: 900,
  marginBottom: "8px",
  color: "#555",
  letterSpacing: "0.03em",
};

/** Input numérico/texto padrão */
export const inputStyle = {
  border: "2px solid #000",
  fontWeight: 700,
  width: "100%",
  padding: "12px 14px",
  outline: "none",
  fontSize: "14px",
  transition: "border-color 0.2s",
};

/** Dica/hint abaixo do input */
export const hintStyle = {
  display: "block" as const,
  fontSize: "10px",
  color: "#999",
  marginTop: "6px",
  fontWeight: 600,
  lineHeight: 1.5,
};

/**
 * Gera estilos para checkboxes/toggles com feedback visual de estado.
 * @param {boolean} isActive - Se o toggle está ativo.
 * @param {"default" | "danger"} variant - Variante visual.
 */
export const toggleLabelStyle = (isActive: boolean, variant: "default" | "danger" = "default") => {
  const activeColor = variant === "danger" ? "#DC2626" : "#000";
  const activeBg = variant === "danger" ? "#FEF2F2" : "#F0FFF4";

  return {
    display: "flex" as const,
    alignItems: "center" as const,
    gap: "16px",
    fontSize: "14px",
    fontWeight: 700,
    cursor: "pointer",
    background: isActive ? activeBg : "#F9F9F9",
    padding: "16px 20px",
    border: isActive ? `2px solid ${activeColor}` : "1px solid #EEE",
    transition: "all 0.2s",
  };
};

/** Estilo do checkbox interno */
export const checkboxStyle = (variant: "default" | "danger" = "default") => ({
  width: "20px",
  height: "20px",
  accentColor: variant === "danger" ? "#DC2626" : "#000",
});

/** Sub-descrição dentro de um toggle */
export const toggleSubDescStyle = {
  display: "block" as const,
  fontSize: "11px",
  fontWeight: 500,
  color: "#888",
  marginTop: "4px",
};

/** Card interno para inputs agrupados */
export const innerCardStyle = {
  padding: "16px",
  background: "#FAFAFA",
  border: "1px solid #EEE",
};

/** Painel de sub-configurações (fundo cinza) */
export const subConfigPanelStyle = {
  marginTop: "16px",
  padding: "20px",
  background: "#F9FAFB",
  border: "1px solid #E5E7EB",
};

/** Banner de alerta/informação */
export const alertBannerStyle = (variant: "warning" | "danger" | "info" = "info") => {
  const config = {
    warning: { bg: "#FFFBEB", border: "#FDE68A", textColor: "#92400E" },
    danger: { bg: "#FEF2F2", border: "#FECACA", textColor: "#991B1B" },
    info: { bg: "#EFF6FF", border: "#BFDBFE", textColor: "#1E40AF" },
  };
  const c = config[variant];
  return {
    container: {
      display: "flex" as const,
      alignItems: "flex-start" as const,
      gap: "12px",
      padding: "14px 16px",
      background: c.bg,
      border: `1px solid ${c.border}`,
      marginBottom: "24px",
    },
    text: {
      fontSize: "11px",
      fontWeight: 600,
      color: c.textColor,
      margin: 0,
      lineHeight: 1.6,
    },
  };
};

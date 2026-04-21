/**
 * 🎭 Máscaras de Input Coliseu (SSoT)
 * Centralização de lógica de formatação visual para garantir paridade 
 * entre o portal administrativo e o portal do aluno.
 */

/**
 * Formata CPF: 000.000.000-00
 */
export const maskCPF = (value: string): string => {
  return value
    .replace(/\D/g, "")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})/, "$1-$2")
    .replace(/(-\d{2})\d+?$/, "$1")
    .slice(0, 14);
};

/**
 * Formata telefone fixo (XX) XXXX-XXXX ou celular (XX) XXXXX-XXXX.
 */
export const maskPhone = (value: string): string => {
  const numbers = value.replace(/\D/g, "").slice(0, 11);
  
  if (numbers.length <= 10) {
    // Fixo 8 dígitos ou incompleto: (XX) XXXX-XXXX
    return numbers
      .replace(/^(\d{0,2})/, "($1")
      .replace(/^\((\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d{1,4})$/, "$1-$2");
  }
  
  // Celular 9 dígitos: (XX) XXXXX-XXXX
  return numbers
    .replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");
};

/**
 * Formata CEP: 00000-000
 */
export const maskCEP = (value: string): string => {
  return value
    .replace(/\D/g, "")
    .replace(/(\d{5})(\d)/, "$1-$2")
    .replace(/(-\d{3})\d+?$/, "$1")
    .slice(0, 9);
};

/**
 * Remove todos os caracteres não numéricos.
 * Útil para enviar dados limpos ao banco de dados.
 */
export const cleanNumbers = (value: string): string => {
  return value.replace(/\D/g, "");
};

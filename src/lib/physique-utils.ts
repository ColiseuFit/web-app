/**
 * Biblioteca Central de Cálculos Biométricos e Metabólicos.
 * 
 * @architecture
 * - SSoT (Single Source of Truth) para toda a lógica antropométrica do Box.
 * - Suporta normalização automática de unidades (m/cm) e gêneros (multi-idioma).
 * - Implementa o protocolo Pollock 7 Dobras e a equação de Mifflin-St Jeor.
 */

export interface Skinfolds {
  subscapular?: number;
  triceps?: number;
  chest?: number;
  midaxillary?: number;
  suprailiac?: number;
  abdominal?: number;
  thigh?: number;
  [key: string]: number | undefined;
}

export interface Measurements {
  neck?: number;
  shoulder?: number;
  chest?: number;
  waist?: number;
  abdomen?: number;
  hip?: number;
  thigh_right?: number;
  thigh_left?: number;
  calf_right?: number;
  calf_left?: number;
  arm_right?: number;
  arm_left?: number;
  arm_flexed_right?: number;
  arm_flexed_left?: number;
  forearm_right?: number;
  forearm_left?: number;
  [key: string]: number | undefined;
}

export interface BoneDiameters {
  humerus?: number;
  femur?: number;
  wrist?: number;
  ankle?: number;
  [key: string]: number | undefined;
}

export interface PosturalAnalysis {
  anterior?: string;
  posterior?: string;
  lateral_right?: string;
  lateral_left?: string;
}

function hasAllFolds(skinfolds: Skinfolds, required: (keyof Skinfolds)[]): boolean {
  return required.every(fold => skinfolds[fold] !== undefined && skinfolds[fold] !== null);
}

/**
 * Calcula o IMC (Índice de Massa Corporal).
 * 
 * @param {number} weight - Peso em Kg.
 * @param {number} height - Altura (aceita metros ou centímetros).
 * @returns {number | null} IMC formatado com 2 casas decimais ou null se dados inválidos.
 * 
 * @note Realiza auto-normalização de altura baseada no valor (threshold: 3).
 */
export function calculateBMI(weight: number, height: number): number | null {
  if (!weight || !height || height <= 0) return null;
  
  // Auto-normalização: Se > 3, assume que está em cm e converte para metros
  const heightM = height > 3 ? height / 100 : height;
  
  const bmi = weight / (heightM * heightM);
  return isFinite(bmi) ? parseFloat(bmi.toFixed(2)) : null;
}

/**
 * Calcula a Densidade Corporal via Protocolo Pollock 7 Dobras.
 * 
 * @param {Skinfolds} skinfolds - Objeto contendo as 7 dobras obrigatórias.
 * @param {number} age - Idade do avaliado.
 * @param {string} gender - Gênero (suporta 'male', 'female', 'masculino', 'feminino').
 */
export function calculateDensityPollock7(skinfolds: Skinfolds, age: number, gender: string): number | null {
  const required: (keyof Skinfolds)[] = ['subscapular', 'triceps', 'chest', 'midaxillary', 'suprailiac', 'abdominal', 'thigh'];
  
  if (!hasAllFolds(skinfolds, required) || !age) {
    return null;
  }

  const sum7 = (skinfolds.subscapular || 0) + (skinfolds.triceps || 0) + (skinfolds.chest || 0) + 
               (skinfolds.midaxillary || 0) + (skinfolds.suprailiac || 0) + (skinfolds.abdominal || 0) + (skinfolds.thigh || 0);
  const isFemale = gender.toLowerCase() === 'female' || gender.toLowerCase() === 'feminino';

  if (!isFemale) {
    // Equação para Homens (Pollock 7)
    const res = 1.112 - (0.00043499 * sum7) + (0.00000055 * Math.pow(sum7, 2)) - (0.00028826 * age);
    return isFinite(res) ? res : null;
  } else {
    // Equação para Mulheres (Pollock 7)
    const res = 1.097 - (0.00046971 * sum7) + (0.00000056 * Math.pow(sum7, 2)) - (0.00012828 * age);
    return isFinite(res) ? res : null;
  }
}

/**
 * Converts Body Density to Body Fat Percentage using Siri equation
 */
export function calculateBF(density: number): number {
  if (!density || density <= 0) return 0;
  const bf = ((4.95 / density - 4.5) * 100);
  return isFinite(bf) ? parseFloat(Math.max(0, bf).toFixed(2)) : 0;
}

/**
 * Full Body Composition calculation
 * Strictly enforced to "Pollock 7 Dobras" protocol.
 */
export function calculateBodyComposition(
  weight: number, 
  height: number, 
  skinfolds: Skinfolds, 
  age: number, 
  gender: string, 
  _protocol?: string // Ignored to enforce Pollock 7 standard
) {
  const bmi = calculateBMI(weight, height);
  
  // Enforce Pollock 7
  const density = calculateDensityPollock7(skinfolds, age, gender);

  if (density === null) return { bmi, bf: null, leanMass: null, fatMass: null };

  const bf = calculateBF(density);
  const fatMass = parseFloat(((weight * bf) / 100).toFixed(2));
  const leanMass = parseFloat((weight - fatMass).toFixed(2));

  return { bmi, bf, leanMass, fatMass };
}

/**
 * Calcula a Taxa Metabólica Basal (TMB / BMR).
 * Protocolo: Mifflin-St Jeor.
 * 
 * @param {number} weight - Peso em Kg.
 * @param {number} height - Altura (metros ou cm).
 * @param {number} age - Idade em anos.
 * @param {string} gender - Gênero ('male'/'female').
 * @returns {number | null} Valor arredondado em Kcal/dia.
 */
export function calculateBMR(
  weight: number, 
  height: number, 
  age: number, 
  gender: 'male' | 'female' | string
): number | null {
  if (!weight || !height || !age) return null;
  
  // Normalização: TMB exige altura em centímetros
  const heightCm = height <= 3 ? height * 100 : height;
  
  const isFemale = gender.toLowerCase() === 'female' || gender.toLowerCase() === 'feminino';
  
  // Equação de Mifflin-St Jeor
  let bmr = (10 * weight) + (6.25 * heightCm) - (5 * age);
  bmr = isFemale ? bmr - 161 : bmr + 5;
  
  return Math.round(bmr);
}

/**
 * Calculates Total Daily Energy Expenditure (TDEE / GET) estimation
 * Based on sedentary activity level (baseline)
 */
export function calculateTDEE(bmr: number, activityLevel: number = 1.2): number {
  return Math.round(bmr * activityLevel);
}

/**
 * Calcula a idade a partir da data de nascimento.
 * SSoT: Segue o protocolo de Tempo do Iron Monolith usando âncoras UTC.
 */
export function calculateAge(birthDate: string | Date, referenceDate: string | Date = new Date()): number {
  if (!birthDate) return 0;
  
  // Normalizamos para o meio-dia UTC para evitar deslocamentos de fuso no cálculo de anos
  const birthStr = typeof birthDate === 'string' ? birthDate.split('T')[0] : birthDate.toISOString().split('T')[0];
  const birth = new Date(birthStr + "T12:00:00Z");
  
  const refStr = typeof referenceDate === 'string' ? referenceDate.split('T')[0] : referenceDate.toISOString().split('T')[0];
  const ref = new Date(refStr + "T12:00:00Z");

  let age = ref.getUTCFullYear() - birth.getUTCFullYear();
  const m = ref.getUTCMonth() - birth.getUTCMonth();

  if (m < 0 || (m === 0 && ref.getUTCDate() < birth.getUTCDate())) {
    age--;
  }

  return age;
}

/**
 * Motor de "Self-Healing" Biométrico.
 * Centraliza a lógica de recuperação de dados ausentes para garantir consistência em toda a UI.
 * 
 * @param {any} evaluation - O registro bruto da avaliação física vindo do banco.
 * @param {any} profile - Dados do perfil do aluno (gender, birth_date).
 * @returns {any} Uma versão enriquecida da avaliação com campos calculados se necessário.
 */
export function enrichEvaluation(evaluation: any, profile: { gender?: string; birth_date?: string }) {
  if (!evaluation) return null;

  const enriched = { ...evaluation };
  
  // Garantir que campos numéricos básicos sejam números
  enriched.weight = Number(enriched.weight) || 0;
  enriched.height = Number(enriched.height) || 0;
  
  // 1. Recuperação de % de Gordura via Pollock 7 (Se nulo na DB)
  if ((enriched.body_fat_percentage === null || enriched.body_fat_percentage === undefined || enriched.body_fat_percentage === 0) && profile.birth_date && profile.gender) {
    const age = calculateAge(profile.birth_date, enriched.evaluation_date);
    const skinfolds = enriched.skinfolds as Skinfolds;
    
    if (skinfolds) {
      const results = calculateBodyComposition(
        enriched.weight,
        enriched.height,
        skinfolds,
        age,
        profile.gender
      );
      
      if (results.bf !== null) {
        enriched.body_fat_percentage = results.bf;
        enriched._isHealed = true; // Flag interna para debug/audit
      }
    }
  }

  // 2. Cálculo derivado de Massa Magra
  if (enriched.weight > 0 && enriched.body_fat_percentage > 0) {
    const fatMass = (enriched.weight * enriched.body_fat_percentage) / 100;
    enriched.lean_mass = parseFloat((enriched.weight - fatMass).toFixed(1));
  } else {
    enriched.lean_mass = null;
  }

  // 3. Garantir IMC (BMI)
  if (!enriched.bmi && enriched.weight > 0 && enriched.height > 0) {
    enriched.bmi = calculateBMI(enriched.weight, enriched.height);
  }

  return enriched;
}


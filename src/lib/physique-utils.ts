/**
 * Biblioteca Central de Cálculos Biométricos e Metabólicos.
 * 
 * @architecture
 * - SSoT (Single Source of Truth) para toda a lógica antropométrica do Box.
 * - Suporta normalização automática de unidades (m/cm) e gêneros (multi-idioma).
 * - Implementa protocolos validados (Pollock, Guedes, Mifflin-St Jeor).
 */

export interface Skinfolds {
  subscapular?: number;
  triceps?: number;
  biceps?: number;
  chest?: number;
  midaxillary?: number;
  suprailiac?: number;
  abdominal?: number;
  thigh?: number;
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
  const { subscapular, triceps, chest, midaxillary, suprailiac, abdominal, thigh } = skinfolds;
  
  if (!subscapular || !triceps || !chest || !midaxillary || !suprailiac || !abdominal || !thigh || !age) {
    return null;
  }

  const sum7 = subscapular + triceps + chest + midaxillary + suprailiac + abdominal + thigh;
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
 * Calculates Body Density using Pollock 3 Folds protocol
 */
export function calculateDensityPollock3(skinfolds: Skinfolds, age: number, gender: string): number | null {
  const isFemale = gender.toLowerCase() === 'female' || gender.toLowerCase() === 'feminino';

  if (!isFemale) {
    const { chest, abdominal, thigh } = skinfolds;
    if (!chest || !abdominal || !thigh || !age) return null;
    const sum3 = chest + abdominal + thigh;
    const res = 1.10938 - (0.0008267 * sum3) + (0.0000016 * Math.pow(sum3, 2)) - (0.0002574 * age);
    return isFinite(res) ? res : null;
  } else {
    const { triceps, suprailiac, thigh } = skinfolds;
    if (!triceps || !suprailiac || !thigh || !age) return null;
    const sum3 = triceps + suprailiac + thigh;
    const res = 1.0994921 - (0.0009929 * sum3) + (0.0000023 * Math.pow(sum3, 2)) - (0.0001392 * age);
    return isFinite(res) ? res : null;
  }
}

/**
 * Calculates Body Density using Guedes 3 Folds protocol
 */
export function calculateDensityGuedes(skinfolds: Skinfolds, gender: string): number | null {
  const isFemale = gender.toLowerCase() === 'female' || gender.toLowerCase() === 'feminino';

  if (!isFemale) {
    const { triceps, suprailiac, abdominal } = skinfolds;
    if (!triceps || !suprailiac || !abdominal) return null;
    const sum3 = triceps + suprailiac + abdominal;
    const res = 1.17136 - (0.06706 * Math.log10(sum3));
    return isFinite(res) ? res : null;
  } else {
    const { subscapular, suprailiac, thigh } = skinfolds;
    if (!subscapular || !suprailiac || !thigh) return null;
    const sum3 = subscapular + suprailiac + thigh;
    const res = 1.16650 - (0.07063 * Math.log10(sum3));
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
 */
export function calculateBodyComposition(
  weight: number, 
  height: number, 
  skinfolds: Skinfolds, 
  age: number, 
  gender: string, 
  protocol: string
) {
  const bmi = calculateBMI(weight, height);
  let density: number | null = null;

  switch (protocol) {
    case 'Pollock 7 Dobras':
      density = calculateDensityPollock7(skinfolds, age, gender);
      break;
    case 'Pollock 3 Dobras':
      density = calculateDensityPollock3(skinfolds, age, gender);
      break;
    case 'Guedes':
      density = calculateDensityGuedes(skinfolds, gender);
      break;
    default:
      return { bmi, bf: null, leanMass: null, fatMass: null };
  }

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
 * Calculations summary for physical evaluation
 */
export function calculateAge(birthDate: string | Date, referenceDate: string | Date = new Date()): number {
  const birth = new Date(birthDate);
  const ref = new Date(referenceDate);
  let age = ref.getFullYear() - birth.getFullYear();
  const m = ref.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && ref.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

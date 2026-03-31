/**
 * Utility functions for biometric and physical evaluation calculations.
 */

export interface Skinfolds {
  subscapular?: number;
  triceps?: number;
  chest?: number;
  midaxillary?: number;
  suprailiac?: number;
  abdominal?: number;
  thigh?: number;
}

/**
 * Calculates Body Mass Index (BMI / IMC)
 */
export function calculateBMI(weight: number, height: number): number | null {
  if (!weight || !height || height <= 0) return null;
  return parseFloat((weight / (height * height)).toFixed(2));
}

/**
 * Calculates Body Density using Pollock 7 Folds protocol
 */
export function calculateDensityPollock7(skinfolds: Skinfolds, age: number, gender: 'male' | 'female'): number | null {
  const { subscapular, triceps, chest, midaxillary, suprailiac, abdominal, thigh } = skinfolds;
  
  if (!subscapular || !triceps || !chest || !midaxillary || !suprailiac || !abdominal || !thigh || !age) {
    return null;
  }

  const sum7 = subscapular + triceps + chest + midaxillary + suprailiac + abdominal + thigh;

  if (gender === 'male') {
    return 1.112 - (0.00043499 * sum7) + (0.00000055 * Math.pow(sum7, 2)) - (0.00028826 * age);
  } else {
    return 1.097 - (0.00046971 * sum7) + (0.00000056 * Math.pow(sum7, 2)) - (0.00012828 * age);
  }
}

/**
 * Calculates Body Density using Pollock 3 Folds protocol
 */
export function calculateDensityPollock3(skinfolds: Skinfolds, age: number, gender: 'male' | 'female'): number | null {
  if (gender === 'male') {
    const { chest, abdominal, thigh } = skinfolds;
    if (!chest || !abdominal || !thigh || !age) return null;
    const sum3 = chest + abdominal + thigh;
    return 1.10938 - (0.0008267 * sum3) + (0.0000016 * Math.pow(sum3, 2)) - (0.0002574 * age);
  } else {
    const { triceps, suprailiac, thigh } = skinfolds;
    if (!triceps || !suprailiac || !thigh || !age) return null;
    const sum3 = triceps + suprailiac + thigh;
    return 1.0994921 - (0.0009929 * sum3) + (0.0000023 * Math.pow(sum3, 2)) - (0.0001392 * age);
  }
}

/**
 * Calculates Body Density using Guedes 3 Folds protocol
 */
export function calculateDensityGuedes(skinfolds: Skinfolds, gender: 'male' | 'female'): number | null {
  if (gender === 'male') {
    const { triceps, suprailiac, abdominal } = skinfolds;
    if (!triceps || !suprailiac || !abdominal) return null;
    const sum3 = triceps + suprailiac + abdominal;
    return 1.17136 - (0.06706 * Math.log10(sum3));
  } else {
    const { subscapular, suprailiac, thigh } = skinfolds;
    if (!subscapular || !suprailiac || !thigh) return null;
    const sum3 = subscapular + suprailiac + thigh;
    return 1.16650 - (0.07063 * Math.log10(sum3));
  }
}

/**
 * Converts Body Density to Body Fat Percentage using Siri equation
 */
export function calculateBF(density: number): number {
  return parseFloat(((4.95 / density - 4.5) * 100).toFixed(2));
}

/**
 * Full Body Composition calculation
 */
export function calculateBodyComposition(
  weight: number, 
  height: number, 
  skinfolds: Skinfolds, 
  age: number, 
  gender: 'male' | 'female', 
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
 * Calculates age based on birth date and target date
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

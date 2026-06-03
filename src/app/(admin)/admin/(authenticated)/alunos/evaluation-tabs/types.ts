export interface EvaluationFormData {
  id?: string;
  student_id: string;
  evaluation_date: string;
  weight: number | string;
  height: number | string;
  body_fat_percentage: number | string;
  protocol: string;
  measurements: {
    neck: string; shoulder: string; chest: string; waist: string; abdomen: string; hip: string;
    thigh_right: string; thigh_left: string; calf_right: string; calf_left: string;
    arm_right: string; arm_left: string; arm_flexed_right: string; arm_flexed_left: string; 
    forearm_right: string; forearm_left: string;
  };
  skinfolds: {
    subscapular: string; triceps: string; chest: string; midaxillary: string;
    suprailiac: string; abdominal: string; thigh: string;
  };
  bone_diameters: {
    humerus: string; femur: string; wrist: string; ankle: string;
  };
  postural_analysis: {
    anterior: string; posterior: string; lateral_right: string; lateral_left: string;
  };
  notes: string;
  photos: any[];
  waist_hip_ratio: number | null;
}

export interface CalculatedResults {
  bmi: number;
  bodyFat: number;
  fatMass: number;
  leanMass: number;
  age: number;
}

export interface EvaluationTabProps {
  formData: EvaluationFormData;
  handleInputChange: (field: string, value: string | number | null) => void;
  handleNestedChange: (category: "measurements" | "skinfolds" | "bone_diameters" | "postural_analysis", field: string, value: string | number) => void;
  formatOnBlur: (field: string, value: string | number | null, category?: "measurements" | "skinfolds" | "bone_diameters", decimals?: number) => void;
}

export interface TabGeralProps extends EvaluationTabProps {
  calculatedResults: CalculatedResults;
}

export interface TabComposicaoProps extends EvaluationTabProps {
  calculatedResults: CalculatedResults;
}

export interface TabFotosProps {
  photos: any[];
  uploadingPos: string | null;
  handlePhotoUpload: (e: React.ChangeEvent<HTMLInputElement>, label: string) => Promise<void>;
  removePhoto: (index: number) => void;
}

/**
 * Tipos compartilhados para os componentes de Drawer do painel de Alunos.
 *
 * @architecture
 * - SSoT de Tipagem: Centraliza a interface `Student` e as props dos sub-componentes
 *   extraídos do `AlunosClient.tsx` para garantir paridade estrita entre o Orquestrador
 *   e as Drawer Views.
 */

import { LevelInfo } from "@/lib/constants/levels";

export interface Student {
  id: string;
  full_name: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  level: string;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
  points: number;
  bio: string | null;
  cpf: string | null;
  birth_date: string | null;
  gender: string | null;
  membership_type: string;
  email: string | null;
  member_number: number | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  address_zip_code: string | null;
  address_street: string | null;
  address_number: string | null;
  address_complement: string | null;
  address_neighborhood: string | null;
  address_city: string | null;
  address_state: string | null;
  running_level: string | null;
  running_pace: string | null;
  running_status: string | null;
  running_target_pace: string | null;
}

/** Props base para todas as Drawer Views que exibem dados de um aluno */
export interface DrawerProfileProps {
  selectedStudent: Student;
  isEditing: boolean;
  setIsEditing: (v: boolean) => void;
  loading: boolean;
  handleUpdate: (formData: FormData) => void;
  handleDelete: (id: string) => void;
  /** Ref do form de edição — necessário para o reset controlado pelo Orquestrador */
  editFormRef: React.RefObject<HTMLFormElement | null>;
  /** Lista dinâmica de níveis carregada do banco */
  levelsList: LevelInfo[];
  /** Lookup de níveis dinâmicos (key → LevelInfo) */
  dynamicLevels?: Record<string, LevelInfo>;
  /** Callback de busca de CEP para auto-preencher campos de endereço */
  handleCEPBlur: (e: React.FocusEvent<HTMLInputElement>) => void;
  isFetchingCEP: boolean;
}

export interface DrawerSecurityProps {
  selectedStudent: Student;
  loading: boolean;
  handleUpdateAuth: (formData: FormData) => void;
  handleResendInvite: (id: string) => void;
}

export interface DrawerEvaluationsProps {
  selectedStudent: Student;
  evaluations: any[];
  loadingEvals: boolean;
  setSelectedEval: (e: any) => void;
  setDrawerView: (view: "profile" | "evaluations" | "eval-form" | "security" | "running") => void;
  handleDeleteEval: (id: string) => void;
}

export interface DrawerRunningProps {
  selectedStudent: Student;
  setMessage: (msg: { type: "error" | "success"; text: string } | null) => void;
  updateStudentAction: (studentId: string, formData: FormData) => Promise<{ success?: boolean; error?: string }>;
}

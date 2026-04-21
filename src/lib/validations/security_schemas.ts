import { z } from "zod";
import { ALL_LEVELS } from "../constants/levels";

/**
 * Validação Matemática de CPF (Módulo 11 da Receita Federal)
 */
export function isValidCPF(cpf: string): boolean {
  if (!cpf) return false;
  // Retira tudo que não é dígito
  const cleanCPF = cpf.replace(/[^\d]/g, '');
  
  if (cleanCPF.length !== 11) return false;
  
  // Rejeita CPFs com todos os dígitos iguais (ex: 111.111.111-11)
  if (/^(\d)\1+$/.test(cleanCPF)) return false;

  let sum = 0;
  let remainder;

  // Primeiro DV
  for (let i = 1; i <= 9; i++) {
    sum = sum + parseInt(cleanCPF.substring(i - 1, i)) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.substring(9, 10))) return false;

  // Segundo DV
  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum = sum + parseInt(cleanCPF.substring(i - 1, i)) * (12 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.substring(10, 11))) return false;

  return true;
}

/**
 * Validação comportamental de nomes de pessoas físicas
 */
export function isValidName(name: string): boolean {
  if (!name || name.trim().length < 2) return false;
  // Apenas letras, acentos e espaços
  if (!/^[a-zA-ZÀ-ÿ\s]+$/.test(name)) return false;
  // Impede que a pessoa digite algo como "AAA" ou "Jooão" propositalmente
  if (/(.)\1{2,}/i.test(name)) return false;
  return true;
}

/**
 * 🔐 SECURITY SCHEMAS: Gatekeeper Central da Plataforma Coliseu.
 * 
 * @architecture
 * - Camada de Integridade: Define a estrutura rígida para todas as Server Actions e APIs.
 * - SSoT de Validação: Única fonte de verdade para formatos de UUID, Datas e Enums operacionais.
 * - Prevenção de Injeção: Bloqueia payloads malformados antes de atingirem a camada de persistência.
 * 
 * @technical
 * - Zod Engine: Utiliza inferência estrita de tipos para garantir paridade TS entre Client/Server.
 * - UUID Enforcement: Garante que identificadores estrangeiros sejam strings válidas do Supabase.
 */
export const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
});

/**
 * 2. Student Creation Schema: Admin/Recepção flow.
 * Ensures strict profile metadata and default level assignment.
 */
export const createStudentSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(8, "A senha deve ter pelo menos 8 caracteres para maior segurança"),
  full_name: z.string()
    .min(3, "O nome completo deve ter pelo menos 3 caracteres")
    .refine((val) => isValidName(val), { message: "Nome inválido ou contém caracteres irreais" }),
  level: z.enum(ALL_LEVELS.map(l => l.key) as [string, ...string[]]).default("branco"),
  running_level: z.string().optional().nullable(),
  running_pace: z.string().optional().nullable(),
  membership_type: z.enum(["club", "club_pass"]).default("club"),
});

/**
 * 3. WOD Check-in Schema: Atomic attendance intent.
 */
export const checkInSchema = z.object({
  wodId: z.string().uuid("ID do WOD inválido"),
  timeSlot: z.string().min(4, "Horário inválido").optional(),
  classSlotId: z.string().uuid("ID da turma inválido").optional(),
});

/**
 * 4. Cancellation Schema: Reverts attendance intent.
 */
export const cancelCheckInSchema = z.object({
  wodId: z.string().uuid("ID do WOD inválido"),
});

/**
 * 5. Personal Record (PR) Schema: Track performance metrics.
 */
export const personalRecordSchema = z.object({
  movement_key: z.string().min(2, "Selecione um movimento"),
  value: z.number().positive("O valor deve ser positivo"),
  unit: z.enum(["kg", "time", "reps"]),
  category: z.enum(["lpo", "strength", "gymnastics", "benchmark"]),
  level: z.enum(["L1", "L2", "L3", "L4", "L5"]).default("L1"),
  date: z.string().optional(),
});

// 6. Schema para Meta de Frequência
export const updateTargetSchema = z.object({
  weekly_target: z.number().int().min(1).max(7, "A meta máxima é de 7 dias"),
});

// 7. Schema para Objetivos Pessoais
export const goalSchema = z.object({
  title: z.string().min(3, "O objetivo deve ter pelo menos 3 caracteres"),
  goalId: z.string().uuid().optional(),
});

/**
 * 8. WOD Programation Schema: Admin/Coach planning tool.
 */
export const wodSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
  title: z.string().min(2, "Tipo de WOD (AMRAP, For Time, etc.)"),
  warm_up: z.string().optional(),
  technique: z.string().optional(),
  wod_content: z.string().min(5, "O detalhamento do WOD deve ser mais completo"),
  coach_id: z.string().uuid().optional(),
  tags: z.array(z.string()).optional(),
  video_url: z.string().url().optional().or(z.literal("")),
  type_tag: z.string().min(2, "Selecione uma modalidade").optional(),
  time_cap: z.string().optional(),
  result_type: z.enum(["time", "reps", "load", "rounds"]).optional(),
});

/**
 * 9. Grid Slot Schema: Operational class definition.
 */
export const classSlotSchema = z.object({
  name: z.string().min(2, "Nome da modalidade obrigatório"),
  day_of_week: z.number().int().min(0, "Dia inválido").max(6, "Dia inválido"),
  time_start: z.string().regex(/^\d{2}:\d{2}$/, "Horário inválido (HH:MM)"),
  duration_minutes: z.number().int().default(60),
  capacity: z.number().int().min(1, "Mínimo 1 vaga").max(50, "Máximo 50 vagas").default(20),
  coach_name: z.string().optional(),
  default_coach_id: z.string().uuid().optional().nullable(),
});

/**
 * 10. Physical Evaluation Schema: Biometrics & Anthropometry.
 */
export const physicalEvaluationSchema = z.object({
  id: z.string().uuid().optional(),
  student_id: z.string().uuid("ID do aluno obrigatório"),
  evaluation_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
  weight: z.number().positive("Peso deve ser positivo").optional(),
  height: z.number().positive("Altura deve ser positiva").optional(),
  body_fat_percentage: z.number().min(0).max(100).optional(),
  protocol: z.string().default("Pollock 7 Dobras"),
  measurements: z.record(z.any()).default({}),
  skinfolds: z.record(z.any()).default({}),
  bone_diameters: z.record(z.any()).default({}),
  postural_analysis: z.record(z.any()).default({}),
  waist_hip_ratio: z.number().optional().nullable(),
  lean_mass_components: z.record(z.any()).default({}),
  photos: z.array(z.any()).default([]),
  notes: z.string().optional().nullable(),
});

// 11. Schema para Atualização de Credenciais (Admin)
export const updateAuthSchema = z.object({
  email: z.string().email("E-mail inválido").optional(),
  password: z.string().min(8, "A senha deve ter pelo menos 8 caracteres").optional(),
}).refine(data => data.email || data.password, {
  message: "Pelo menos um campo deve ser preenchido",
});

// 12. Schema para Troca de Senha (Aluno)
export const updatePasswordSchema = z.object({
  password: z.string().min(8, "A senha deve ter pelo menos 8 caracteres"),
  confirm_password: z.string().min(8, "Confirmação de senha obrigatória"),
}).refine(data => data.password === data.confirm_password, {
  message: "As senhas não coincidem",
  path: ["confirm_password"],
});

/**
 * 13. Schema para Resultado de WOD (Aluno)
 * 
 * @architecture
 * - Single Source of Truth (SSoT) para submissão de performance em Atividades.
 * - Suporta variações brutas em String permitindo compatibilidade universal com "time", "reps", "load" e notações "rounds" (AMRAP como "5+12").
 * 
 * @security
 * - Obriga `checkInId` válido (RLS validará a propriedade deste check-in em runtime).
 * - Impede submissões com scores vazias (`min(1)`).
 */
export const wodResultSchema = z.object({
  checkInId: z.string().uuid("ID do check-in inválido"),
  result: z.string().min(1, "O resultado não pode estar vazio"),
  performanceLevel: z.string().min(1, "O nível de performance é obrigatório"),
});

// 14. Schema para Pré-cadastro (Leads)
export const preRegistrationSchema = z.object({
  full_name: z.string()
    .max(100, "Nome deve ter no máximo 100 caracteres")
    .refine((val) => isValidName(val), { message: "Nome inválido ou contém caracteres irreais" }),
  email: z.string().email("E-mail inválido").max(150, "E-mail deve ter no máximo 150 caracteres"),
  phone: z.string().min(10, "Telefone inválido").max(15, "Telefone muito longo"),
  cpf: z.string()
    .refine((val) => {
      if (!val || val.trim() === "") return true;
      return isValidCPF(val);
    }, {
      message: "CPF Inválido ou inconsistente com a Receita Federal"
    })
    .optional(),
  birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida").optional().or(z.literal("")),
  bio: z.string().max(500, "Objetivo não pode passar de 500 caracteres").optional(),
});

// 15. Schema para Solicitação de Recuperação de Senha
/**
 * @security
 * - Valida estritamente a string como formato de e-mail para prevenir SQL/NoSQL Injection
 *   no payload enviado à Server Action `requestPasswordReset`.
 * - Requisito mínimo antes de acionar a GoTrue Admin API.
 */
export const forgotPasswordSchema = z.object({
  email: z.string().email("E-mail inválido"),
});

/**
 * 16. Profile Update Schema: Common for Student and Admin portals.
 */
export const profileSchema = z.object({
  display_name: z.string()
    .min(3, "O Apelido deve ter pelo menos 3 caracteres")
    .max(50, "O Apelido deve ter no máximo 50 caracteres")
    .regex(/^[a-zA-Z0-9À-ÿ\s]+$/, "O Apelido não deve conter caracteres especiais")
    .optional()
    .nullable(),
  full_name: z.string()
    .min(3, "O nome completo deve ter pelo menos 3 caracteres")
    .refine((val) => isValidName(val), { message: "Nome inválido ou contém caracteres irreais" })
    .optional()
    .nullable(),
  first_name: z.string()
    .max(100)
    .refine((val) => !val || isValidName(val), { message: "Primeiro nome inválido ou contém caracteres irreais" })
    .optional()
    .nullable(),
  last_name: z.string()
    .max(100)
    .refine((val) => !val || isValidName(val), { message: "Sobrenome inválido ou contém caracteres irreais" })
    .optional()
    .nullable(),
  bio: z.string().max(150, "A biografia deve ter no máximo 150 caracteres").optional().nullable(),
  gender: z.string().optional().nullable(),
  cpf: z.string()
    .refine((val) => {
      if (!val || val.trim() === "") return true; // Campo opcional
      return isValidCPF(val);
    }, {
      message: "CPF Inválido ou inconsistente com a Receita Federal"
    })
    .optional()
    .nullable(),
  birth_date: z.string()
    .optional()
    .nullable()
    .refine((val) => {
      if (!val || val.trim() === "") return true; // opcional
      const date = new Date(val);
      if (isNaN(date.getTime())) return false;
      const age = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
      return age >= 10 && age <= 100;
    }, { message: "Data de nascimento inválida ou fora do intervalo permitido (10–100 anos)" }),
  avatar_url: z.string().url().optional().nullable().or(z.literal("")),
  phone: z.string().max(20, "O telefone deve ter no máximo 20 caracteres").optional().nullable(),
  emergency_contact_name: z.string().max(100).optional().nullable(),
  emergency_contact_phone: z.string().max(20).optional().nullable(),
  address_zip_code: z.string().max(15).optional().nullable(),
  address_street: z.string().max(150).optional().nullable(),
  address_number: z.string().max(20).optional().nullable(),
  address_complement: z.string().max(100).optional().nullable(),
  address_neighborhood: z.string().max(100).optional().nullable(),
  address_city: z.string().max(100).optional().nullable(),
  address_state: z.string().length(2, "A UF deve ter 2 caracteres").optional().nullable().or(z.literal("")),
  level: z.string().optional().nullable(),
  running_level: z.string().optional().nullable(),
  running_pace: z.string().optional().nullable(),
  membership_type: z.string().optional().nullable(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type CreateStudentInput = z.infer<typeof createStudentSchema>;
export type CheckInInput = z.infer<typeof checkInSchema>;
export type PersonalRecordInput = z.infer<typeof personalRecordSchema>;
export type UpdateTargetInput = z.infer<typeof updateTargetSchema>;
export type GoalInput = z.infer<typeof goalSchema>;
export type WodInput = z.infer<typeof wodSchema>;
export type ClassSlotInput = z.infer<typeof classSlotSchema>;
export type PhysicalEvaluationInput = z.infer<typeof physicalEvaluationSchema>;
export type UpdateAuthInput = z.infer<typeof updateAuthSchema>;
export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>;
export type WodResultInput = z.infer<typeof wodResultSchema>;
export type PreRegistrationInput = z.infer<typeof preRegistrationSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;

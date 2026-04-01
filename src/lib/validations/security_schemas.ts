import { z } from "zod";
import { ALL_LEVELS } from "../constants/levels";

/**
 * 🔐 SECURITY SCHEMAS: Centralized validation for the Coliseu platform.
 * Follows the senior engineering profile for strict typing and friction reduction.
 */

// 1. Schema para Login de Usuário
export const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
});

// 2. Schema para Criação de Aluno (Admin/Recepção)
export const createStudentSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(8, "A senha deve ter pelo menos 8 caracteres para maior segurança"),
  full_name: z.string().min(3, "O nome completo deve ter pelo menos 3 caracteres"),
  level: z.enum(ALL_LEVELS.map(l => l.key) as [string, ...string[]]).default("iniciante"),
});

// 3. Schema para Check-in no WOD
export const checkInSchema = z.object({
  wodId: z.string().uuid("ID do WOD inválido"),
  timeSlot: z.string().min(4, "Horário inválido").optional(),
  classSlotId: z.string().uuid("ID da turma inválido").optional(),
});

// 4. Schema para Cancelamento de Check-in
export const cancelCheckInSchema = z.object({
  wodId: z.string().uuid("ID do WOD inválido"),
});

// 5. Schema para Recorde Pessoal (PR)
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

// 8. Schema para Programação de WOD (Admin/Coach)
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

// 9. Schema para Grade de Horários (Admin - Gestão de Turmas)
export const classSlotSchema = z.object({
  name: z.string().min(2, "Nome da modalidade obrigatório"),
  day_of_week: z.number().int().min(0, "Dia inválido").max(6, "Dia inválido"),
  time_start: z.string().regex(/^\d{2}:\d{2}$/, "Horário inválido (HH:MM)"),
  duration_minutes: z.number().int().default(60),
  capacity: z.number().int().min(1, "Mínimo 1 vaga").max(50, "Máximo 50 vagas").default(20),
  coach_name: z.string().optional(),
});

// 10. Schema para Avaliações Físicas (Biometria e Composição)
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

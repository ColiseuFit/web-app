import { z } from "zod";

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
  level: z.enum(["iniciante", "scale", "intermediario", "rx", "elite", "branco", "verde", "azul", "vermelho", "preto"]).default("iniciante"),
});

// 3. Schema para Check-in no WOD
export const checkInSchema = z.object({
  wodId: z.string().uuid("ID do WOD inválido"),
  timeSlot: z.string().min(4, "Horário inválido").optional(),
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

export type LoginInput = z.infer<typeof loginSchema>;
export type CreateStudentInput = z.infer<typeof createStudentSchema>;
export type CheckInInput = z.infer<typeof checkInSchema>;
export type PersonalRecordInput = z.infer<typeof personalRecordSchema>;
export type UpdateTargetInput = z.infer<typeof updateTargetSchema>;
export type GoalInput = z.infer<typeof goalSchema>;
export type WodInput = z.infer<typeof wodSchema>;

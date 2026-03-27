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
  level: z.enum(["branco", "verde", "azul", "vermelho", "rx", "preto", "elite"]).default("branco"),
});

// 3. Schema para Check-in no WOD
export const checkInSchema = z.object({
  wodId: z.string().uuid("ID do WOD inválido"),
});

// 4. Schema para Cancelamento de Check-in
export const cancelCheckInSchema = z.object({
  wodId: z.string().uuid("ID do WOD inválido"),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type CreateStudentInput = z.infer<typeof createStudentSchema>;
export type CheckInInput = z.infer<typeof checkInSchema>;

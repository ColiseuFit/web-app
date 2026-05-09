import { z } from "zod";

/**
 * 🏃 RUNNING SCHEMAS: Gatekeeper do Módulo de Corrida.
 */

// 1. Schema para Atualizar Plano de Corrida
export const updateRunningPlanSchema = z.object({
  planId: z.string().uuid("ID do plano inválido"),
  title: z.string().min(3, "O título deve ter pelo menos 3 caracteres"),
  levelTag: z.string().optional(),
  status: z.enum(["active", "completed", "archived"]).optional(),
});

// 2. Schema para Registrar Treino Realizado (Legado único)
export const logRunningWorkoutSchema = z.object({
  workoutId: z.string().uuid("ID do treino inválido"),
  actualDistance: z.number().positive("A distância deve ser um valor positivo"),
  durationSeconds: z.number().int().positive("A duração deve ser um valor positivo"),
  paceSeconds: z.number().int().positive("O pace deve ser um valor positivo"),
  rpe: z.number().int().min(1).max(10, "A percepção de esforço deve ser entre 1 e 10"),
  notes: z.string().optional().nullable(),
});

// 2.1 Schema para Registrar Sessão Completa (Multi-Blocos)
export const logRunningSessionSchema = z.object({
  rpe: z.number().int().min(1).max(10, "A percepção de esforço deve ser entre 1 e 10"),
  notes: z.string().optional().nullable(),
  blocks: z.array(z.object({
    workoutId: z.string().uuid("ID do bloco inválido"),
    completed: z.boolean(),
    actualDistance: z.number().nullable().optional(), // opcional dependendo do tipo
    durationSeconds: z.number().int().nullable().optional(), // opcional dependendo do tipo
    reps: z.number().int().min(1).optional()
  })).min(1, "É necessário pelo menos um bloco")
});

// 3. Schema para Geração em Lote (Bulk)
export const bulkCreateRunningWorkoutsSchema = z.object({
  planId: z.string().uuid("ID do plano inválido"),
  studentId: z.string().uuid("ID do aluno inválido"),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data de início inválida"),
  workouts: z.array(z.object({
    session_order: z.number().int().positive("A ordem da sessão deve ser um número positivo").optional(),
    scheduled_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data agendada inválida"),
    target_description: z.string().min(2, "A descrição do treino é obrigatória"),
    title: z.string().nullable().optional(),
    target_distance_km: z.number().nullable().optional(),
    target_pace_description: z.string().nullable().optional(),
    target_rest_time_description: z.string().nullable().optional(),
    reps: z.number().int().min(1).default(1).optional(),
    category: z.string().nullable().optional(),
    target_zone: z.string().nullable().optional(),
    target_unit: z.string().default("km").optional(),
  })).min(1, "É necessário pelo menos um treino para geração"),
});

// 4. Schema para Deleção (UUID básico)
export const deleteRunningEntitySchema = z.object({
  id: z.string().uuid("ID inválido"),
});

// 5. Schema para criar um Template (Molde)
export const createRunningTemplateSchema = z.object({
  numericId: z.string().optional().nullable(),
  title: z.string().min(3, "O título deve ter pelo menos 3 caracteres"),
  description: z.string().optional().nullable(),
  levelTag: z.string(),
  frequencyPerWeek: z.number().int().min(1).max(7),
  durationWeeks: z.number().int().min(1).max(24),
});

// 5.1 Schema para atualizar um Template (Molde)
export const updateRunningTemplateSchema = z.object({
  templateId: z.string().uuid("ID do template inválido"),
  numericId: z.string().optional().nullable(),
  title: z.string().min(3, "O título deve ter pelo menos 3 caracteres"),
  description: z.string().optional().nullable(),
  levelTag: z.string(),
  frequencyPerWeek: z.number().int().min(1).max(7),
  durationWeeks: z.number().int().min(1).max(24),
});

// 6. Schema para adicionar treino a um Template
export const createTemplateWorkoutSchema = z.object({
  templateId: z.string().uuid("ID do template inválido"),
  weekNumber: z.number().int().min(1),
  sessionOrder: z.number().int().min(1).max(7),
  title: z.string().nullable().optional(),
  targetDescription: z.string().min(2, "A descrição do treino é obrigatória"),
  targetDistanceKm: z.number().nullable().optional(),
  targetPaceDescription: z.string().nullable().optional(),
  targetRestTimeDescription: z.string().nullable().optional(),
  reps: z.number().int().min(1).optional(),
  category: z.string().nullable().optional(),
  targetZone: z.string().nullable().optional(),
  targetUnit: z.string().optional(),
});

// 7. Schema para atualizar treino de um Template
export const updateTemplateWorkoutSchema = z.object({
  workoutId: z.string().uuid("ID do treino inválido"),
  weekNumber: z.number().int().min(1).optional(),
  sessionOrder: z.number().int().min(1).max(7).optional(),
  title: z.string().nullable().optional(),
  targetDescription: z.string().min(2, "A descrição do treino é obrigatória").optional(),
  targetDistanceKm: z.number().nullable().optional(),
  targetPaceDescription: z.string().nullable().optional(),
  targetRestTimeDescription: z.string().nullable().optional(),
  reps: z.number().int().min(1).optional(),
  category: z.string().nullable().optional(),
  targetZone: z.string().nullable().optional(),
  targetUnit: z.string().optional(),
});

export type UpdateRunningPlanInput = z.infer<typeof updateRunningPlanSchema>;
export type LogRunningWorkoutInput = z.infer<typeof logRunningWorkoutSchema>;
export type BulkCreateRunningWorkoutsInput = z.infer<typeof bulkCreateRunningWorkoutsSchema>;
export type CreateRunningTemplateInput = z.infer<typeof createRunningTemplateSchema>;
export type UpdateRunningTemplateInput = z.infer<typeof updateRunningTemplateSchema>;
export type CreateTemplateWorkoutInput = z.infer<typeof createTemplateWorkoutSchema>;
export type UpdateTemplateWorkoutInput = z.infer<typeof updateTemplateWorkoutSchema>;

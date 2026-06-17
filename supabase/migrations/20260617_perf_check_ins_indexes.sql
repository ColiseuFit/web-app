-- ==========================================================
-- Migration: Índices de Performance na tabela check_ins
-- Data: 2026-06-17
-- Motivação: Query do painel de TV (/rest/v1/check_ins?wod_id=...)
--   estava levando ~1.082ms por ausência de índices nas colunas
--   de filtro. Identificado via auditoria dos logs do Supabase Edge.
-- ==========================================================

-- Índice na coluna wod_id (filtro principal das queries de TV e Admin)
-- Usado em: tv/actions.ts, (admin)/turmas/actions-checkin.ts
CREATE INDEX IF NOT EXISTS idx_check_ins_wod_id
  ON public.check_ins (wod_id);

-- Índice na coluna student_id (FK + filtro de RLS por auth.uid())
-- Usado em: (student)/actions-checkin.ts, (student)/profile/page.tsx,
--            (student)/dashboard/page.tsx, (student)/actions-score.ts
CREATE INDEX IF NOT EXISTS idx_check_ins_student_id
  ON public.check_ins (student_id);

-- Índice na coluna status (filtro recorrente: status=neq.missed, status=eq.confirmed)
-- Usado em: tv/actions.ts, (student)/treinos/page.tsx
CREATE INDEX IF NOT EXISTS idx_check_ins_status
  ON public.check_ins (status);

-- Índice composto (wod_id + status) para a query mais frequente do painel de TV:
--   .from("check_ins").eq("wod_id", ...).neq("status", "missed")
-- Um índice composto é mais eficiente que dois índices separados para esta query.
CREATE INDEX IF NOT EXISTS idx_check_ins_wod_id_status
  ON public.check_ins (wod_id, status);

-- Índice composto (student_id + created_at) para cálculo de streak no perfil do aluno
-- Usado em: (student)/profile/page.tsx — .order("created_at", { ascending: false })
CREATE INDEX IF NOT EXISTS idx_check_ins_student_id_created_at
  ON public.check_ins (student_id, created_at DESC);

-- Ativa RLS (Row Level Security) na tabela strava_webhook_events
-- para corrigir o alerta crítico de segurança no Supabase.
-- Como nosso backend utiliza a chave 'service_role' (que ignora políticas de RLS),
-- a tabela funcionará perfeitamente e bloqueará qualquer inserção/leitura anônima externa.

ALTER TABLE public.strava_webhook_events ENABLE ROW LEVEL SECURITY;

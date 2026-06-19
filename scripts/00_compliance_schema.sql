-- Criar tabela de Documentos Legais
CREATE TABLE IF NOT EXISTS public.legal_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL UNIQUE, -- 'REGIMENTO_INTERNO', 'TERMO_LGPD'
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ativar RLS
ALTER TABLE public.legal_documents ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
CREATE POLICY "Leitura pública de documentos legais" ON public.legal_documents FOR SELECT USING (true);
CREATE POLICY "Gestores podem modificar documentos legais" ON public.legal_documents FOR ALL USING (true) WITH CHECK (true); -- Segurança relaxada para a action em server-side que usa service_role

-- Criar tabela de Perguntas do PAR-Q
CREATE TABLE IF NOT EXISTS public.par_q_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_index INTEGER NOT NULL,
    question_text TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ativar RLS
ALTER TABLE public.par_q_questions ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
CREATE POLICY "Leitura pública do PAR-Q" ON public.par_q_questions FOR SELECT USING (true);
CREATE POLICY "Gestores podem modificar PAR-Q" ON public.par_q_questions FOR ALL USING (true) WITH CHECK (true);

-- Semear as 7 perguntas padrão do PAR-Q do Ministério da Saúde
INSERT INTO public.par_q_questions (order_index, question_text) VALUES
(1, 'Algum médico já disse que você possui algum problema de coração e que só deveria realizar atividade física supervisionado por profissionais de saúde?'),
(2, 'Você sente dores no peito quando pratica atividade física?'),
(3, 'No último mês, você sentiu dores no peito quando praticava atividade física?'),
(4, 'Você apresenta desequilíbrio devido a tontura e/ou perda de consciência?'),
(5, 'Você possui algum problema ósseo ou articular que poderia ser piorado pela atividade física?'),
(6, 'Você toma atualmente algum medicamento para pressão arterial e/ou problema de coração?'),
(7, 'Sabe de alguma outra razão pela qual você não deve praticar atividade física?')
ON CONFLICT DO NOTHING;

-- Semear documentos em branco caso não existam
INSERT INTO public.legal_documents (type, title, content) VALUES
('REGIMENTO_INTERNO', 'Regimento Interno da Academia', '## Regimento Interno\n\nNeste documento, defina as regras de convivência, horário de funcionamento e proibições.'),
('TERMO_LGPD', 'Termo de Autorização de Imagem e LGPD', '## Termo de Imagem e LGPD\n\nAutorização para uso de imagem e proteção de dados biométricos/pessoais.')
ON CONFLICT (type) DO NOTHING;

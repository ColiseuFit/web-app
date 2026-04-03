# 🏛️ COLISEU CLUBE V2

Bem-vindo à "Monolito de Ferro", a infraestrutura digital de elite do Coliseu. Este repositório centraliza o dashboard do aluno, o Portal do Coach e as fundações de dados da plataforma.

---

## 📚 ÍNDICE DE DOCUMENTAÇÃO E PLAYBOOKS

A documentação segue o protocolo "Legacy Proof", garantindo manutenibilidade e excelência operacional:

### 🏛️ Mapeamento Operacional
- [PLAYBOOK: Admin Hub (Painel Geral)](docs/PLAYBOOKS/ADMIN_HUB.md) - Controle de KPIs, matrículas e visão macro do box.
- [PLAYBOOK: Portal do Coach (Live Operations)](docs/PLAYBOOKS/COACH_PORTAL.md) - **[ESTADO DA ARTE]** Gestão em tempo real, validação de presenças e busca rápida de alunos.
- [PLAYBOOK: Gestão de Turmas](docs/PLAYBOOKS/CLASSES_MANAGEMENT.md) - **[IRON TABS]** Arquitetura dedicada em 4 pilares (Grade, Check-ins, CRM e Bloqueios).
- [PLAYBOOK: App do Aluno (Experience)](docs/PLAYBOOKS/STUDENT_APP.md) - **[ATHLETIC NEO-BRUTALISM]** Rebranding total, Streaks e Engine de adaptação de WOD.
- [PLAYBOOK: Fechamento de Aula](docs/PLAYBOOKS/FECHAMENTO_AULA.md) - Procedimento SSoT para validação de resultados e entrega de pontos.

### ⚙️ Engenharia e Regras
- [PLAYBOOK: WOD Engine](docs/PLAYBOOKS/ADMIN_WOD_ENGINE.md) - **[NOVO]** Detalhamento técnico do builder e lógica de escalonamento (L1-L5).
- [PLAYBOOK: Gestão de Alunos](docs/PLAYBOOKS/ADMIN_STUDENT_MANAGEMENT.md) - CRUD avançado e Drawer de edição com validação Zod.
- [PLAYBOOK: Gestão de Professores](docs/PLAYBOOKS/ADMIN_COACH_MANAGEMENT.md) - **[NOVO]** Concessão de acessos à equipe, promoção e senha padrão `coliseu123`.
- [PLAYBOOK: Sistema de Pontuação](docs/PLAYBOOKS/PONTUACAO.md) - Economia de pontos (Points), ranking e Score Engine.
- [PLAYBOOK: Coliseu Levels](docs/PLAYBOOKS/coliseu-levels.md) - Regras de progressão e SSoT dos níveis atléticos.

### 📐 Arquitetura & Design
- [GUIA: Iron Monolith Architecture](docs/PLAYBOOKS/IRON_MONOLITH_GUIDE.md) - **[FILOSOFIA 2.0]** Estética Brutalista Light & Dark, tokens CSS e paridade visual.
- [ARCHITECTURE: Iron Engine](docs/ARCHITECTURE/ACTIVITY_ENGINE.md) - Engenharia de dados e arquitetura de componentes Server/Client.
- [SQL SCHEMA: Contratos de Dados](docs/schema.sql) - Definição de Tabelas, RLS e Policies de segurança.

## 🛠️ ARQUITETURA DO SISTEMA

O projeto utiliza um stack moderno focado em performance extrema e isolamento de dados:

```mermaid
    A[Next.js App Router] -->|src/proxy.ts| B[Mult-Portal Routing]
    B -->|/login| C[Student App]
    B -->|/admin-portal| D[Admin Hub]
    B -->|/coach-portal| E[Coach Portal]
    A -->|Server Actions + Zod| F[Supabase Auth]
    A -->|Parallel Data Loading| G[Supabase Postgres]
    G -->|RLS Row Isolation| H[Profiles & Score]
    G -->|RLS Row Isolation| I[WODs & Check-ins]
    H -->|Validated_at Marker| J[Student App: Results Unlocked]
```

### Princípios de Engenharia:
1. **Isolamento de Dados (RLS):** Segurança inegociável. Dados de alunos nunca se cruzam sem autorização explícita.
2. **Estética Funcional (Neo-Brutalism):** Design de alto contraste (Nike/Adidas style), focado em ação e clareza visual.
3. **SSoT (Single Source of Truth):** Toda aula ou resultado depende do marcador `validated_at`. Nada é deletado, apenas invalidado ou inacessível.
4. **Resiliência UTC-3:** Operações de tempo centralizadas para garantir paridade entre fuso do servidor e do box.

---

## 🚀 ESTRUTURA DE DIRETÓRIOS

- `src/app/(student)`: Experiência mobile do aluno (Fundo Branco/Neo-Brutalism).
- `src/app/(coach)`: Interface operacional para coaches no tatame.
- `src/app/(admin)`: Painel de gestão estratégica e financeira.
- `docs/`: Sistema de conhecimento distribuído (Playbooks e SOPs).

---
---
**Versão do Sistema:** 2.6.5 (Audit 1.0.2 Locked)  
**Status da Auditoria:** 🏛️ LEGACY PROOF (Protocolo 1.0.2) - 100% Concluído  
**Equipe:** Antigravity AI & Coliseu Engineering Team

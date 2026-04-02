# 🏛️ COLISEU CLUBE V2

Bem-vindo à "Monolito de Ferro", a infraestrutura digital de elite do Coliseu. Este repositório centraliza o dashboard do aluno, o Portal do Coach e as fundações de dados da plataforma.

---

## 📚 ÍNDICE DE DOCUMENTAÇÃO E PLAYBOOKS

A documentação segue o protocolo "Legacy Proof", garantindo manutenibilidade e excelência operacional:

### 🏛️ Mapeamento Operacional
- [PLAYBOOK: Admin Hub (Painel Geral)](docs/PLAYBOOKS/ADMIN_HUB.md) - Controle de KPIs, matrículas e visão macro do box.
- [PLAYBOOK: Portal do Coach (Live Operations)](docs/PLAYBOOKS/COACH_PORTAL.md) - **[ESTADO DA ARTE]** Gestão em tempo real, validação de presenças e busca rápida de alunos.
- [PLAYBOOK: App do Aluno (Experience)](docs/PLAYBOOKS/STUDENT_APP.md) - **[ATHLETIC NEO-BRUTALISM]** Rebranding total, Streaks e Engine de adaptação de WOD.
- [PLAYBOOK: Fechamento de Aula](docs/PLAYBOOKS/FECHAMENTO_AULA.md) - Procedimento SSoT para validação de resultados e entrega de pontos.

### ⚙️ Engenharia e Regras
- [PLAYBOOK: WOD Engine](docs/PLAYBOOKS/ADMIN_WOD_ENGINE.md) - **[NOVO]** Detalhamento técnico do builder e lógica de escalonamento (L1-L5).
- [PLAYBOOK: Gestão de Alunos](docs/PLAYBOOKS/ADMIN_STUDENT_MANAGEMENT.md) - CRUD avançado e Drawer de edição com validação Zod.
- [PLAYBOOK: Sistema de Pontuação](docs/PLAYBOOKS/PONTUACAO.md) - Economia de pontos (Points), ranking e Score Engine.
- [PLAYBOOK: Coliseu Levels](docs/PLAYBOOKS/coliseu-levels.md) - Regras de progressão e SSoT dos níveis atléticos.

### 📐 Arquitetura & Design
- [GUIA: Iron Monolith Architecture](docs/PLAYBOOKS/IRON_MONOLITH_GUIDE.md) - **[FILOSOFIA 2.0]** Estética Brutalista Light & Dark, tokens CSS e paridade visual.
- [ARCHITECTURE: Iron Engine](docs/ARCHITECTURE/ACTIVITY_ENGINE.md) - Engenharia de dados e arquitetura de componentes Server/Client.
- [SQL SCHEMA: Contratos de Dados](docs/schema.sql) - Definição de Tabelas, RLS e Policies de segurança.

## 🛠️ ARQUITETURA DO SISTEMA

O projeto utiliza um stack moderno focado em performance extrema e isolamento de dados:

```mermaid
graph TD
    A[Next.js App Router] -->|Server Actions + Zod| B[Supabase Auth]
    A -->|Parallel Data Loading| C[Supabase Postgres]
    C -->|RLS Row Isolation| D[Profiles & Score]
    C -->|RLS Row Isolation| E[WODs & Benchmarks]
    C -->|RLS Row Isolation| F[Check-ins & Goals]
    A -->|Bucket Storage| G[Athlete Photos]
    H[Coach: Live Portal] -->|manualCheckin Action| F
    H -->|closeClass Action| F
    F -->|Validated_at Marker| I[Student App: Results Unlocked]
    K[Student: Neo-Brutalist] -->|WOD Scalability Regex| E
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
**Versão do Sistema:** 2.5.0 (Ecosystem Documentation Audit)  
**Equipe:** Antigravity AI & Coliseu Engineering Team

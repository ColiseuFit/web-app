# 🏛️ COLISEU CLUBE V2

Bem-vindo à "Monolito de Ferro", a infraestrutura digital de elite do Coliseu. Este repositório centraliza o dashboard do aluno, gestão administrativa e as fundações de dados da plataforma.

---

## 📚 ÍNDICE DE DOCUMENTAÇÃO E PLAYBOOKS

A documentação segue o protocolo "Legacy Proof", garantindo manutenibilidade:
- [PLAYBOOK: Dashboard do Aluno](docs/PLAYBOOKS/STUDENT_DASHBOARD.md) - Guia operacional do App do Aluno.
- [GUIA: Iron Monolith Architecture](docs/PLAYBOOKS/IRON_MONOLITH_GUIDE.md) - Filosofia visual, tokens CSS e estética brutalista.
- [ARCHITECTURE: Iron Engine](docs/ARCHITECTURE/ACTIVITY_ENGINE.md) - Engenharia de dados, gamificação (XP/PRs) e arquitetura Server/Client.

## 🛠️ ARQUITETURA DO SISTEMA

O projeto segue um padrão de engenharia focado em performance, isolamento de dados e interatividade em tempo real:

`mermaid
graph TD
    A[Next.js App Router] -->|Server Actions| B[Supabase Auth]
    A -->|Promise.all / Parallel Queries| C[Supabase Postgres]
    C -->|RLS Enforced| D[Profiles & PRs]
    C -->|RLS Enforced| E[Physical Evaluations & Benchmarks]
    C -->|RLS Enforced| F[Check-ins & Goals]
    A -->|Bucket Storage| G[Athlete Photos]
`

### Princípios Inegociáveis (A Doutrina do Código):
1. **Isolamento de Tenant (RLS):** Garantido por políticas granulares no banco de dados. Nunca cruzar dados sem bypass explícito (service_role).
2. **Design Brutalista (Iron Monolith):** Performance instantânea e zero carregamentos em branco (Skeleton Screens). Estética militar, alto contraste e recortes geométricos (clip-path).
3. **Segurança de Mutação:** Uso de Zod para todo payload processado por Server Actions.
4. **Resiliência de Estado:** Uso tático de Optimistic UI para feedbacks imediatos (Ex: seleção tática de treinos semanais).

---

## 🚀 ESTRUTURA DE DIRETÓRIOS

- src/app/: Camada de Roteamento Next.js (Dashboard do Aluno, Perfil, Autenticação).
- src/components/: Componentes modulares brutalistas, divididos por nicho (Progresso, Atleta, Layout).
- docs/: Motor de conhecimento. Contém os SOPs, Playbooks arquiteturais e esquemas do sistema.
- public/levels/: Ativos de marca oficiais para a subida de níveis Coliseu.

---
**Versão do Sistema:** 2.1.0 (The Iron Monolith Unification)  
**Equipe:** Antigravity AI & Coliseu Engineering

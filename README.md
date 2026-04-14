# 🏛️ COLISEU CLUBE V2

Bem-vindo à "Monolito de Ferro", a infraestrutura digital de elite do Coliseu. Este repositório centraliza o dashboard do aluno, o Portal do Coach e as fundações de dados da plataforma.

---

## 🚀 ESTRUTURA DO PROJETO

O Coliseu Clube V2 é construído sobre uma arquitetura de Monolito de Ferro, focada em performance extrema, isolamento de dados e estética Neo-Brutalista.

---

## 🛠️ ARQUITETURA DO SISTEMA

O projeto utiliza um stack moderno focado em performance extrema e isolamento de dados:

```mermaid
graph TD
    A[Next.js App Router] -->|src/proxy.ts| B[Mult-Portal Routing]
    B -->|/login| C[Student App]
    B -->|/admin-portal| D[Admin Hub]
    B -->|/coach-portal| E[Coach Portal]
    E -->|Legacy Hardware Detect| ELite[Coach Lite SSR]
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
5. **Progressive Enhancement:** Suporte a hardware legado via modo `/coach-lite` (100% SSR).

---

## 🚀 ESTRUTURA DE DIRETÓRIOS

- `src/app/(student)`: Experiência mobile do aluno (Fundo Branco/Neo-Brutalism).
- `src/app/(coach)`: Interface operacional para coaches no tatame. Inclui `/coach-lite`.
- `src/app/(admin)`: Painel de gestão estratégica e financeira.
- `docs/`: Sistema de conhecimento distribuído (Playbooks e SOPs).
  - `docs/PLAYBOOKS/COACH_LITE_LEGACY.md`: Guia para suporte a iPad 2/iOS 9.
  - `docs/PLAYBOOKS/STUDENT_APP.md`: Guia mestre da experiência do aluno.
  ... (outros playbooks)

---
---
**Versão: 3.1.0 (Abril/2026) - Legacy Hardware Stabilization & PWA Optimization**  
**Status da Auditoria:** 🏛️ LEGACY PROOF (Protocolo 1.0.3) - Em Auditoria Final  
**Equipe:** Antigravity AI & Coliseu Engineering Team


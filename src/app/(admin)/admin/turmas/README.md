# Architecture: Turmas Module (Classes Management)

Este diretório contém a lógica de front-end e as ações de servidor para a gestão da grade de horários e matrículas do Coliseu.

---

## 🏗️ Fluxo de Dados (Data Flow)

O módulo utiliza um padrão de **Single Source of Truth** vindo do banco de dados, com revalidação de cache via Next.js `revalidatePath`.

```mermaid
sequenceDiagram
    participant UI as TurmasClient (Client)
    participant SA as Server Actions (actions.ts)
    participant SB as Supabase (Postgres)
    
    UI->>SA: handleSaveSlot(formData)
    Note over SA: Zod Validation (classSlotSchema)
    SA->>SB: upsertClassSlot (Admin Auth)
    SB-->>SA: Success/Error
    SA->>UI: revalidatePath('/admin/turmas')
    Note right of UI: UI Refresh (Server Component)
```

## 🛠️ Componentes Principais

- **`page.tsx`**: Server component que busca a grade inicial, ocupação e WODs.
- **`TurmasClient.tsx`**: Gerenciador de estado da UI. Controla abas, modais e feedback visual.
- **`actions.ts`**: Camada de persistência. Contém a lógica de segurança e permissões.

---

## 🔒 Segurança

1. **Role Check**: Todas as ações verificam se o usuário logado possui e-mail administrativo ou role `admin`/`reception`.
2. **Service Role**: Para permitir que administradores editem a grade (que possui RLS restritivo para usuários comuns), utilizamos o `createAdminClient` com a `SUPABASE_SERVICE_ROLE_KEY`.

---
**Protocolo:** Agente Protocolo Doc 1.0.1

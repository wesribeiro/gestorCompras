## 22/11/2025: feat(app): Lançamento da v4.1 - Portal do Solicitante & Triagem

Atualização massiva transformando a aplicação em um sistema multi-usuário com fluxos de trabalho definidos.

### 🚀 Novas Funcionalidades (Major)

- **Portal do Solicitante:**
  - Nova interface (`portal.html`) para usuários comuns criarem e acompanharem pedidos.
  - Dashboard simplificado com status visuais (Em Análise, Aprovado, Recusado).
- **Sistema de Triagem (Inbox):**
  - "Caixa de Entrada" no painel do Comprador para receber novas solicitações.
  - Notificações visuais (Badge contador e Toasts) para novos pedidos.
  - Fluxo de **Aprovação** (cria card no Kanban) e **Rejeição** (com justificativa).
  - Histórico de Rejeitados com opção de **Reabrir** solicitação.
- **Gestão Administrativa (v3.2):**
  - Novo painel `admin.html` com gestão completa (CRUD) de Usuários, Grupos e Filas do Kanban.
  - Capacidade de criar/editar/excluir filas dinamicamente.
  - Busca Avançada de pedidos finalizados/arquivados.
- **Relatórios Profissionais:**
  - Página de impressão (`report.html`) atualizada com dados completos.
  - Inclusão de logotipo personalizado (`logonilo.png`).

### 🎨 Interface & UX

- **Modais Estilizados:** Substituição total de `alert()` e `confirm()` nativos por modais customizados com a identidade visual.
- **Sidebar Retrátil:** Melhor aproveitamento de tela com menu colapsável.
- **Dark Mode Nativo:** Suporte completo a temas Claro/Escuro em todas as telas.
- **Edição In-Place:** Modais de detalhes agora permitem edição direta de Título, Descrição, Prioridade e Grupo.

### ⚙️ Backend & Banco de Dados

- **Schema v3.2:**
  - Novas tabelas: `KanbanColumns`, `Groups`.
  - Novos campos: `description`, `priority`, `solicitante_name`, `is_final_destination`.
  - Migração para IDs relacionais (`group_id`, `column_id`) ao invés de texto fixo.
- **Novas Rotas de API:**
  - `/api/requests`: Gestão de solicitações pendentes.
  - `/api/groups`: CRUD de grupos.
  - `/api/columns`: CRUD de colunas dinâmicas.
  - `/api/pedidos/admin/search`: Busca avançada de arquivados.

---

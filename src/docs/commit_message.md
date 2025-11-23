## 23/11/2025: feat(app): Lançamento da v5.0 - Gestão de Perfil & UX Refinada

Expansão das capacidades de usuário e preparação estrutural para relatórios e notificações.

### 👤 Gestão de Usuários e Perfil (Major)

- **Perfil de Usuário Editável:**
  - Novos campos no banco de dados: `display_name` (Nome de Exibição), `email`, `phone`, `gender`.
  - Nova rota de API `PUT /api/users/profile` permitindo que qualquer usuário atualize seus próprios dados e altere sua senha de forma segura.
  - Interface de **"Meu Perfil"** (Modal) implementada tanto no Painel Administrativo/Comprador quanto no Portal do Solicitante.
- **UX do Cabeçalho:**
  - Substituição do botão "Sair" estático por um **Menu Dropdown** no avatar do usuário.
  - Exibição do `display_name` (ex: "Wesley Ribeiro") ao invés do `username` de login (ex: "wesley.ribeiro") na interface.

### ⚙️ Backend & Banco de Dados

- **Schema v5.0:**
  - Migração automática adicionando colunas de perfil à tabela `Users`.
  - Criação da tabela `NotificationQueue` para futuro sistema de envio de e-mails (Job Queue).
- **Segurança de Sessão:**
  - Objeto de sessão atualizado para carregar dados de perfil (`display_name`, `email`, etc.) no login, reduzindo queries desnecessárias.

### 🔧 Admin

- **Gestão Avançada de Usuários:**
  - Modais de criação e edição de usuários no painel Admin atualizados para incluir os novos campos.
  - Listagem de usuários agora exibe Nome de Exibição e Email.

---

## 23/11/2025: feat(app): Lançamento da v4.5 - Auditoria, Histórico & UX Compliance

Atualização focada em transparência, rastreabilidade e experiência do usuário.

### 🛡️ Auditoria & Segurança

- **Sistema de Logs (`AuditLog`):** Rastreabilidade completa para Mover, Editar, Finalizar, Entregar e Excluir.
- **Histórico no Card:** Nova aba nos detalhes do pedido mostrando a linha do tempo das ações.

### 👁️ Portal do Solicitante 2.0

- **Status Real:** Solicitantes agora veem a etapa exata do Kanban (ex: "Em Cotação").
- **Chat em Tempo Real:** Comunicação fluida entre comprador e solicitante.

### 🎨 Interface

- **Modais Customizados:** Fim dos `alert()` e `prompt()` nativos.
- **Toasts:** Notificações visuais não intrusivas.

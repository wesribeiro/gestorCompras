# Gestor de Compras - Documentação Mestre

**Versão Atual:** v6.0 (Fase 1 - Configurações Gerais)
**Data da Última Atualização:** 23/11/2025
**Desenvolvedor:** Pair Programming 2.0 (AI)

---

## 1. Visão Geral do Projeto

O **Gestor de Compras** é uma aplicação web full-stack desenvolvida para centralizar, organizar e auditar o processo de aquisições de uma empresa. O sistema substitui planilhas e e-mails dispersos por um fluxo estruturado baseado em quadros Kanban e painéis de triagem.

### 1.1 Tecnologias Utilizadas (Core)

Mantemos a stack simples, leve e sem frameworks pesados no frontend para garantir performance e facilidade de manutenção:

- **Backend:** Node.js com Express.
- **Banco de Dados:** SQLite3 (Arquivo local `compras_v3_final.db`).
- **Frontend:** HTML5, Vanilla JavaScript (ES6+).
- **Estilização:** Tailwind CSS (via CDN ou build process).
- **Segurança:** `bcrypt` para hash de senhas, `express-session` para gestão de sessões.
- **Uploads:** `multer` para gestão de arquivos locais.

---

## 2. Arquitetura e Fluxos

### 2.1 Perfis de Usuário

O sistema implementa Controle de Acesso Baseado em Função (RBAC):

1.  **Solicitante:** Acesso restrito ao **Portal**. Pode criar solicitações e acompanhar seus pedidos.
2.  **Comprador:** Acesso ao **Kanban** e **Triagem**. Pode aprovar solicitações, cotar, comprar e entregar.
3.  **Administrador:** Acesso total, incluindo gestão de usuários, grupos, filas, configurações globais e logs de auditoria.
4.  **Diretor/Assistente:** (Permissões intermediárias configuráveis no futuro).

### 2.2 Fluxo Principal (Happy Path)

1.  **Solicitação:** Usuário abre o Portal e preenche o formulário de necessidade.
2.  **Triagem:** Comprador recebe notificação na "Caixa de Entrada". Ele pode **Aprovar** (definindo prioridade) ou **Rejeitar** (com motivo).
3.  **Kanban:** Ao ser aprovada, a solicitação vira um **Card** na coluna inicial do Kanban.
4.  **Processo:** O card é movido entre colunas (Cotação -> Compra -> Entrega).
5.  **Finalização:** Comprador insere dados da compra (Link, Valor, Nota) e arquiva o pedido.

---

## 3. Diário de Desenvolvimento (Changelog Cronológico)

### v1.0 a v3.x - Fundação

- Estrutura básica do Kanban.
- Sistema de login simples.
- Banco de dados SQLite inicial.

### v4.1 - Portal & Triagem (22/11/2025)

- **Portal do Solicitante:** Interface dedicada para quem não é do time de compras.
- **Sistema de Triagem:** Separação entre "Desejo de Compra" (Solicitação) e "Tarefa de Trabalho" (Card Kanban).
- **Edição In-Place:** Melhoria na UX para editar títulos e descrições nos modais.

### v4.5 - Auditoria & Histórico (23/11/2025)

- **Tabela `AuditLog`:** Registro imutável de ações críticas (Quem, Quando, O Que).
- **Histórico Visual:** Aba "Histórico" no detalhe do pedido mostrando a linha do tempo.
- **Chat em Tempo Real:** Comunicação bidirecional entre Comprador e Solicitante dentro do pedido.
- **Status Real:** Solicitantes agora veem o nome da coluna do Kanban (ex: "Em Cotação") e não apenas "Aprovado".
- **Remoção de Alerts:** Substituição por Modais e Toasts modernos.

### v5.0 - Gestão de Perfil (23/11/2025)

- **Perfil Rico:** Adição de `display_name`, `email`, `phone`, `gender` na tabela `Users`.
- **Auto-Gestão:** Usuários podem editar seus próprios dados e senha via Modal de Perfil.
- **UX:** Avatar no cabeçalho com menu dropdown (Perfil / Sair).
- **Infra de Notificação:** Criação da tabela `NotificationQueue` para envio assíncrono de e-mails.

### v6.0 - Configurações Globais (Atual - Fase 1)

- **Painel de Configurações:** Nova seção para Admin definir parâmetros globais.
- **Parâmetros:**
  - `image_retention_days`: Tempo para manter anexos de pedidos finalizados.
  - `notification_sender_email`: E-mail remetente para o futuro sistema de notificações.

---

## 4. Manual de Uso (Recursos Atuais)

### 4.1 Para o Solicitante

- **Criar Pedido:** Botão "Nova Solicitação" no topo direito. Preencha Título, Descrição e Link.
- **Acompanhar:** O painel mostra o status real. Clique no card para ver detalhes.
- **Interagir:** Use a aba "Chat" dentro do pedido para falar com o comprador ou enviar arquivos.

### 4.2 Para o Comprador

- **Triagem:** Verifique o ícone de "Inbox" no topo. Aprove pedidos definindo a prioridade ou rejeite com justificativa.
- **Kanban:** Arraste cards para mudar o status. Clique para ver detalhes, editar ou adicionar notas.
- **Finalizar:** Mova para a coluna final e preencha os dados de compra (Valor/Link) na aba "Finalizar".

### 4.3 Para o Administrador

- **Gestão de Usuários/Grupos:** Acesse o menu "Administração" no sidebar.
- **Gestão de Filas:** Crie ou edite colunas do Kanban, definindo cores e regras (se permite finalizar, se é fila inicial).
- **Auditoria:** Consulte a aba "Logs de Auditoria" para ver quem deletou ou modificou itens.
- **Configurações:** Ative/Desative o fluxo de aprovação de diretor e configure a retenção de dados no menu "Configurações".

---

## 5. Roadmap (Plano de Ação Futuro)

O projeto está robusto, mas para atingir a excelência total (v7.0+), definimos as seguintes prioridades:

### Curto Prazo (Produtividade)

- [ ] **Paste-to-Upload:** Permitir colar imagens (Ctrl+V) direto no chat e notas.
- [ ] **Busca no Kanban:** Barra de pesquisa para filtrar cards em tempo real na tela principal.

### Médio Prazo (Automação)

- [ ] **Worker de E-mail:** Script para ler a `NotificationQueue` e disparar e-mails reais via SMTP.
- [ ] **Job de Limpeza:** Script para deletar imagens antigas baseado na configuração `image_retention_days`.

### Longo Prazo (Inteligência)

- [ ] **Relatórios Financeiros:** Dashboard com gráficos de gastos por Setor/Mês.
- [ ] **SLA:** Medição de tempo que um pedido fica em cada coluna.

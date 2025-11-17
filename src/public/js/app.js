document.addEventListener("DOMContentLoaded", () => {
  // --- Elementos da UI ---
  const userAvatar = document.getElementById("user-avatar");
  const logoutButton = document.getElementById("logout-button");
  const adminSettingsLink = document.getElementById("admin-settings-link");
  const sidebarCreateButton = document.getElementById("sidebar-create-button");

  // --- Elementos do Modal de CRIAÇÃO (NOVOS) ---
  const createModal = document.getElementById("create-pedido-modal");
  const createModalCloseButton = document.getElementById(
    "create-modal-close-button"
  );
  const createModalCancelButton = document.getElementById(
    "create-modal-cancel-button"
  );
  const createPedidoForm = document.getElementById("create-pedido-form");
  const createPedidoTitle = document.getElementById("create-pedido-title");
  const createPedidoDepartment = document.getElementById(
    "create-pedido-department"
  );
  const createPedidoError = document.getElementById("create-pedido-error");

  // --- Elementos do Modal de DETALHES ---
  const modal = document.getElementById("pedido-modal");
  const modalCloseButton = document.getElementById("modal-close-button");
  const modalTitle = document.getElementById("modal-title");
  const modalStatus = document.getElementById("modal-status");
  const modalDepartment = document.getElementById("modal-department");
  const modalResponsible = document.getElementById("modal-responsible");
  const modalTabs = document.getElementById("modal-tabs");
  const modalTabPanes = document.querySelectorAll(".modal-tab-pane");
  const modalNotesList = document.getElementById("modal-notes-list");
  const modalAddNoteForm = document.getElementById("modal-add-note-form");
  const modalNewNoteInput = document.getElementById("modal-new-note");
  const modalResearchList = document.getElementById("modal-research-list");
  const modalAddResearchForm = document.getElementById(
    "modal-add-research-form"
  );
  const modalNewResearchInput = document.getElementById("modal-new-research");
  const modalFinalizeTab = document.querySelector(
    'button[data-tab="tab-finalize"]'
  );
  const modalFinalizePane = document.getElementById("tab-finalize");
  const modalFinalizeError = document.getElementById("modal-finalize-error");
  const modalFinalizeForm = document.getElementById("modal-finalize-form");
  const modalFinalizeSuccess = document.getElementById(
    "modal-finalize-success"
  );
  const modalReportButton = document.getElementById("modal-report-button");

  // Mapeia os IDs das colunas no HTML
  const kanbanColumns = {
    pedido_compra: document.getElementById("kanban-col-pedido_compra"),
    em_cotacao: document.getElementById("kanban-col-em_cotacao"),
    estagnado: document.getElementById("kanban-col-estagnado"),
    compra_efetuada: document.getElementById("kanban-col-compra_efetuada"),
  };

  // --- Armazenamento Global ---
  let globalSettings = {};
  let globalDepartments = [];
  let currentUser = null;
  let currentPedidoId = null;
  let currentPedidoData = null;

  /**
   * Função principal: Verifica a sessão do utilizador
   */
  async function checkAuthentication() {
    try {
      const response = await fetch("/api/auth/check");
      if (!response.ok) throw new Error("Falha na verificação da sessão");

      const data = await response.json();
      if (data.loggedIn && data.user) {
        currentUser = data.user;
        initializeUI(currentUser);

        globalSettings = await fetchSettings();
        globalDepartments = await fetchDepartments();

        await loadKanbanPedidos();
        initializeDragDropListeners();
        initializeSidebarCreateButton();

        // Configura os listeners dos dois modais
        setupModalEventListeners(); // (Modal de Detalhes)
        setupCreateModalListeners(); // (NOVO - Modal de Criação)
      } else {
        redirectToLogin();
      }
    } catch (error) {
      console.error("Erro ao verificar autenticação:", error);
      redirectToLogin();
    }
  }

  /**
   * Inicializa a interface do utilizador (avatar, botões, links de admin)
   */
  function initializeUI(user) {
    if (user.username && userAvatar) {
      userAvatar.textContent = user.username.charAt(0).toUpperCase();
      userAvatar.title = user.username;
    }
    if (logoutButton) {
      logoutButton.addEventListener("click", handleLogout);
    }
    if (user.role === "admin" && adminSettingsLink) {
      adminSettingsLink.style.display = "block";
    }
  }

  // (Funções fetchSettings e fetchDepartments permanecem inalteradas)
  async function fetchSettings() {
    try {
      const response = await fetch("/api/settings");
      if (!response.ok) throw new Error("Falha ao buscar configurações");
      return await response.json();
    } catch (error) {
      console.error(error);
      return {};
    }
  }
  async function fetchDepartments() {
    try {
      const response = await fetch("/api/departments");
      if (!response.ok) throw new Error("Falha ao buscar setores");
      return await response.json();
    } catch (error) {
      console.error(error);
      return [];
    }
  }

  /**
   * Carrega e exibe os pedidos do Kanban
   */
  async function loadKanbanPedidos() {
    try {
      const response = await fetch("/api/pedidos");
      if (!response.ok) throw new Error("Não foi possível buscar os pedidos.");
      const pedidos = await response.json();

      Object.values(kanbanColumns).forEach((column) => {
        const placeholder = column.querySelector(".text-center");
        if (placeholder) placeholder.remove();
        column
          .querySelectorAll(".kanban-card")
          .forEach((card) => card.remove());
      });

      if (pedidos.length > 0) {
        pedidos.forEach((pedido) => {
          const card = createPedidoCard(pedido);
          if (kanbanColumns[pedido.column]) {
            kanbanColumns[pedido.column].appendChild(card);
          }
        });
      }
    } catch (error) {
      console.error("Erro ao carregar pedidos do Kanban:", error);
    }
  }

  /**
   * Cria o elemento HTML para um cartão de pedido
   */
  function createPedidoCard(pedido) {
    const card = document.createElement("div");
    card.id = `pedido-${pedido.id}`;
    card.draggable = true;
    card.className =
      "kanban-card bg-light p-3 rounded-lg shadow mb-3 border-l-4 border-accent cursor-pointer hover:bg-gray-600";

    const title = document.createElement("p");
    title.textContent = pedido.title;
    title.className = "font-semibold text-text-primary mb-2";
    card.appendChild(title);

    const info = document.createElement("p");
    info.textContent = `Resp: ${pedido.responsible_username || "???"}`;
    info.className = "text-xs text-text-secondary";
    card.appendChild(info);

    const dept = document.createElement("p");
    dept.textContent = `Setor: ${pedido.department_name || "N/A"}`;
    dept.className = "text-xs text-text-secondary";
    card.appendChild(dept);

    const date = document.createElement("p");
    date.textContent = `Criado: ${formatTimestamp(pedido.task_created_at)}`;
    date.className = "text-xs text-text-secondary mt-2";
    card.appendChild(date);

    card.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text/plain", card.id);
      setTimeout(() => card.classList.add("opacity-50"), 0);
    });
    card.addEventListener("dragend", () => {
      card.classList.remove("opacity-50");
    });

    // Adiciona listener para abrir o modal de DETALHES
    card.addEventListener("click", (e) => {
      if (e.target.closest(".dragging")) return;
      openPedidoModal(pedido.id);
    });

    return card;
  }

  /**
   * Adiciona listeners de Drop (soltar) às colunas
   */
  function initializeDragDropListeners() {
    Object.entries(kanbanColumns).forEach(([columnName, columnElement]) => {
      columnElement.addEventListener("dragover", (e) => e.preventDefault());
      columnElement.addEventListener("dragenter", (e) => {
        e.preventDefault();
        columnElement.classList.add("bg-light", "rounded-lg");
      });
      columnElement.addEventListener("dragleave", () => {
        columnElement.classList.remove("bg-light", "rounded-lg");
      });
      columnElement.addEventListener("drop", async (e) => {
        e.preventDefault();
        columnElement.classList.remove("bg-light", "rounded-lg");
        const cardId = e.dataTransfer.getData("text/plain");
        const card = document.getElementById(cardId);
        const pedidoId = cardId.split("-")[1];
        if (card && columnElement.contains(card) === false) {
          card.classList.add("dragging");
          columnElement.appendChild(card);
          await movePedidoInAPI(pedidoId, columnName);
          card.classList.remove("dragging");
        }
      });
    });
  }

  /**
   * ATUALIZADO: Ativa o botão "Criar Pedido" da barra lateral
   */
  function initializeSidebarCreateButton() {
    // Só ativa se o modo de aprovação estiver DESLIGADO
    if (
      globalSettings.approval_workflow_enabled === false &&
      sidebarCreateButton
    ) {
      sidebarCreateButton.style.display = "flex"; // Garante que é visível
      // ATUALIZADO: Chama o 'openCreateModal' em vez do 'handleCreatePedido'
      sidebarCreateButton.addEventListener("click", openCreateModal);
    } else if (sidebarCreateButton) {
      sidebarCreateButton.style.display = "none"; // Esconde se o Modo Completo estiver ativo
    }
  }

  /**
   * Função helper para chamar a API de criação
   * (Esta função permanece, pois é usada pelo novo handler do modal)
   */
  async function callCreatePedidoAPI(title, department_id) {
    const response = await fetch("/api/pedidos/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, department_id }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Falha ao criar pedido");
    }
    return data;
  }

  /**
   * Função helper para chamar a API de movimentação
   */
  async function movePedidoInAPI(pedidoId, newColumn) {
    try {
      const response = await fetch(`/api/pedidos/${pedidoId}/move`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newColumn }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.message || "Falha ao mover pedido");
      console.log(`Auditoria registrada: ${data.message}`);
      if (currentPedidoId === pedidoId) {
        currentPedidoData.column = newColumn;
        checkFinalizeLogic(currentPedidoData);
      }
    } catch (error) {
      console.error(`Erro ao salvar movimento do pedido ${pedidoId}:`, error);
      alert("Erro ao salvar a mudança. Por favor, atualize a página.");
    }
  }

  /**
   * Função de Logout
   */
  async function handleLogout() {
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      const data = await response.json();
      if (data.success) redirectToLogin();
    } catch (error) {
      console.error("Erro de rede ao fazer logout:", error);
    }
  }

  /**
   * Função de Redirecionamento de Login
   */
  function redirectToLogin() {
    window.location.href = "login.html";
  }

  /**
   * Função para formatar Timestamps
   */
  function formatTimestamp(isoString) {
    if (!isoString) return "N/A";
    return new Date(isoString).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  // -----------------------------------------------------------------
  // NOVO (ETAPA 21): LÓGICA DO MODAL DE CRIAÇÃO
  // -----------------------------------------------------------------

  /**
   * NOVO: Configura os listeners do modal de criação (botões de fechar, etc)
   */
  function setupCreateModalListeners() {
    if (!createModal) return; // Proteção
    createModalCloseButton.addEventListener("click", closeCreateModal);
    createModalCancelButton.addEventListener("click", closeCreateModal);
    createPedidoForm.addEventListener("submit", handleCreatePedidoSubmit);
  }

  /**
   * NOVO: Abre o modal de criação e preenche os setores
   */
  function openCreateModal() {
    // Preenche o dropdown de setores
    createPedidoDepartment.innerHTML = ""; // Limpa opções antigas

    if (globalDepartments.length === 0) {
      createPedidoDepartment.innerHTML =
        '<option value="">Erro: Setores não encontrados</option>';
    } else {
      createPedidoDepartment.innerHTML =
        '<option value="">-- Selecione um setor --</option>';
      globalDepartments.forEach((dept) => {
        const option = document.createElement("option");
        option.value = dept.id;
        option.textContent = dept.name;
        createPedidoDepartment.appendChild(option);
      });
    }

    // Limpa o formulário e exibe o modal
    createPedidoForm.reset();
    createPedidoError.textContent = "";
    createPedidoError.style.display = "none";
    createModal.classList.remove("hidden");
    createPedidoTitle.focus(); // Foco no primeiro campo
  }

  /**
   * NOVO: Fecha o modal de criação
   */
  function closeCreateModal() {
    createModal.classList.add("hidden");
    createPedidoForm.reset();
  }

  /**
   * NOVO: Manipula o envio (submit) do formulário de criação
   */
  async function handleCreatePedidoSubmit(e) {
    e.preventDefault(); // Impede o recarregamento da página

    const title = createPedidoTitle.value;
    const department_id = createPedidoDepartment.value;

    // Validação
    if (!title.trim() || !department_id) {
      createPedidoError.textContent = "Título e Setor são obrigatórios.";
      createPedidoError.style.display = "block";
      return;
    }

    try {
      // Chama a API helper que já tínhamos
      await callCreatePedidoAPI(title, department_id);

      // Sucesso!
      closeCreateModal();
      await loadKanbanPedidos(); // Recarrega o Kanban para mostrar o novo pedido
    } catch (error) {
      // Mostra o erro da API
      createPedidoError.textContent = error.message;
      createPedidoError.style.display = "block";
    }
  }

  // -----------------------------------------------------------------
  // LÓGICA DO MODAL DE DETALHES (ETAPA 15)
  // (Este bloco permanece inalterado da etapa anterior)
  // -----------------------------------------------------------------

  /**
   * Configura os listeners principais do modal de DETALHES
   */
  function setupModalEventListeners() {
    modalCloseButton.addEventListener("click", closePedidoModal);

    modalTabs.addEventListener("click", (e) => {
      if (e.target.tagName !== "BUTTON") return;
      document.querySelectorAll(".modal-tab-button").forEach((btn) => {
        btn.classList.remove("border-accent", "text-accent");
        btn.classList.add(
          "border-transparent",
          "text-text-secondary",
          "hover:text-text-primary",
          "hover:border-gray-500"
        );
      });
      modalTabPanes.forEach((pane) => pane.classList.add("hidden"));
      e.target.classList.add("border-accent", "text-accent");
      e.target.classList.remove(
        "border-transparent",
        "text-text-secondary",
        "hover:text-text-primary",
        "hover:border-gray-500"
      );
      document
        .getElementById(e.target.getAttribute("data-tab"))
        .classList.remove("hidden");
    });

    modalAddNoteForm.addEventListener("submit", handleAddNote);
    modalAddResearchForm.addEventListener("submit", handleAddResearch);
    modalFinalizeForm.addEventListener("submit", handleFinalize);
  }

  /**
   * Abre e preenche o modal de DETALHES com dados
   */
  async function openPedidoModal(pedidoId) {
    currentPedidoId = pedidoId;
    modal.classList.remove("hidden");

    modalTitle.textContent = "Carregando detalhes do pedido...";
    modalStatus.textContent = "...";
    modalDepartment.textContent = "...";
    modalResponsible.textContent = "...";
    modalNotesList.innerHTML =
      '<li class="text-center text-text-secondary">Carregando notas...</li>';
    modalResearchList.innerHTML =
      '<li class="text-center text-text-secondary">Carregando links...</li>';

    try {
      const [pedidoRes, notesRes, researchRes] = await Promise.all([
        fetch(`/api/pedidos/${pedidoId}`),
        fetch(`/api/pedidos/${pedidoId}/notes`),
        fetch(`/api/pedidos/${pedidoId}/research`),
      ]);
      if (!pedidoRes.ok || !notesRes.ok || !researchRes.ok)
        throw new Error("Falha ao carregar dados do pedido.");

      currentPedidoData = await pedidoRes.json();
      const notes = await notesRes.json();
      const research = await researchRes.json();

      renderModalDetails(currentPedidoData);
      renderModalNotes(notes);
      renderModalResearch(research);
      checkFinalizeLogic(currentPedidoData);
    } catch (error) {
      console.error(error);
      modalTitle.textContent = "Erro ao carregar pedido";
    }
  }

  function closePedidoModal() {
    modal.classList.add("hidden");
    currentPedidoId = null;
    currentPedidoData = null;
    modalAddNoteForm.reset();
    modalAddResearchForm.reset();
    modalFinalizeForm.reset();
  }

  function renderModalDetails(pedido) {
    modalTitle.textContent = pedido.title;
    modalStatus.textContent = pedido.column
      .replace("_", " ")
      .replace(/^\w/, (c) => c.toUpperCase());
    modalDepartment.textContent = pedido.department_name || "N/A";
    modalResponsible.textContent = pedido.responsible_username || "N/A";
  }

  function renderModalNotes(notes) {
    modalNotesList.innerHTML = "";
    if (notes.length === 0) {
      modalNotesList.innerHTML =
        '<li class="text-center text-text-secondary">Nenhuma nota de status adicionada.</li>';
      return;
    }
    notes.forEach((note) => {
      const li = document.createElement("li");
      li.className = "p-3 bg-light rounded-md";
      li.innerHTML = `
                <p class="text-text-primary">${note.content}</p>
                <p class="text-xs text-text-secondary mt-1">
                    Por: <span class="font-medium text-text-primary">${
                      note.username
                    }</span> 
                    em ${formatTimestamp(note.created_at)}
                </p>
            `;
      modalNotesList.appendChild(li);
    });
  }

  function renderModalResearch(researchItems) {
    modalResearchList.innerHTML = "";
    if (researchItems.length === 0) {
      modalResearchList.innerHTML =
        '<li class="text-center text-text-secondary">Nenhum link de pesquisa salvo.</li>';
      return;
    }
    researchItems.forEach((item) => {
      const li = document.createElement("li");
      li.className = "p-3 bg-light rounded-md";
      let contentHTML = item.content;
      if (
        item.content.startsWith("http://") ||
        item.content.startsWith("https://")
      ) {
        contentHTML = `<a href="${item.content}" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:underline">${item.content}</a>`;
      }
      li.innerHTML = `
                <p class="text-text-primary break-all">${contentHTML}</p>
                <p class="text-xs text-text-secondary mt-1">
                    Por: <span class="font-medium text-text-primary">${
                      item.username
                    }</span> 
                    em ${formatTimestamp(item.created_at)}
                </p>
            `;
      modalResearchList.appendChild(li);
    });
  }

  async function handleAddNote(e) {
    e.preventDefault();
    const content = modalNewNoteInput.value;
    if (!content.trim()) return;
    try {
      const response = await fetch(`/api/pedidos/${currentPedidoId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!response.ok) throw new Error("Falha ao salvar nota");
      const newNote = await response.json();
      if (modalNotesList.querySelector(".text-text-secondary"))
        modalNotesList.innerHTML = "";
      const li = document.createElement("li");
      li.className = "p-3 bg-light rounded-md";
      li.innerHTML = `
                <p class="text-text-primary">${newNote.content}</p>
                <p class="text-xs text-text-secondary mt-1">
                    Por: <span class="font-medium text-text-primary">${
                      newNote.username
                    }</span> 
                    em ${formatTimestamp(newNote.created_at)}
                </p>
            `;
      modalNotesList.prepend(li);
      modalNewNoteInput.value = "";
    } catch (error) {
      alert(error.message);
    }
  }

  async function handleAddResearch(e) {
    e.preventDefault();
    const content = modalNewResearchInput.value;
    if (!content.trim()) return;
    try {
      await fetch(`/api/pedidos/${currentPedidoId}/research`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const researchRes = await fetch(
        `/api/pedidos/${currentPedidoId}/research`
      );
      const researchItems = await researchRes.json();
      renderModalResearch(researchItems);
      modalNewResearchInput.value = "";
    } catch (error) {
      alert(error.message);
    }
  }

  async function handleFinalize(e) {
    e.preventDefault();
    const formData = {
      purchase_link: document.getElementById("modal-link").value,
      purchased_price: document.getElementById("modal-price").value,
      purchased_quantity: document.getElementById("modal-quantity").value,
    };
    try {
      const response = await fetch(`/api/pedidos/${currentPedidoId}/finalize`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      currentPedidoData.purchase_link = formData.purchase_link;
      checkFinalizeLogic(currentPedidoData);
    } catch (error) {
      alert(`Erro ao finalizar: ${error.message}`);
    }
  }

  function checkFinalizeLogic(pedido) {
    const allowedColumns = ["estagnado", "compra_efetuada"];
    if (pedido.purchase_link) {
      modalFinalizeForm.classList.add("hidden");
      modalFinalizeError.classList.add("hidden");
      modalFinalizeSuccess.classList.remove("hidden");
      modalReportButton.onclick = () => {
        window.open(`report.html?id=${pedido.id}`, "_blank");
      };
    } else {
      modalFinalizeSuccess.classList.add("hidden");
      if (allowedColumns.includes(pedido.column)) {
        modalFinalizeForm.classList.remove("hidden");
        modalFinalizeError.classList.add("hidden");
      } else {
        modalFinalizeForm.classList.add("hidden");
        modalFinalizeError.classList.remove("hidden");
      }
    }
  }

  // --- Ponto de Entrada ---
  checkAuthentication();
});

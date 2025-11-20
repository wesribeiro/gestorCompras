document.addEventListener("DOMContentLoaded", () => {
  // =================================================================
  // 1. ELEMENTOS GLOBAIS DA UI
  // =================================================================
  const userAvatar = document.getElementById("user-avatar");
  const logoutButton = document.getElementById("logout-button");
  const adminSettingsLink = document.getElementById("admin-settings-link");
  const adminPanelLinks = document.getElementById("admin-panel-links");
  const sidebarCreateButton = document.getElementById("sidebar-create-button");
  const sidebarNewColumnButton = document.getElementById(
    "sidebar-new-column-button"
  );

  const kanbanContainer = document.getElementById("kanban-board-container");
  const sidebarLists = document.getElementById("sidebar-lists");

  // Dark Mode
  const themeToggleBtn = document.getElementById("theme-toggle");
  const themeToggleDarkIcon = document.getElementById("theme-toggle-dark-icon");
  const themeToggleLightIcon = document.getElementById(
    "theme-toggle-light-icon"
  );

  // --- MODAL CRIAÇÃO PEDIDO ---
  const createModal = document.getElementById("create-pedido-modal");
  const createModalCloseButton = document.getElementById(
    "create-modal-close-button"
  );
  const createModalCancelButton = document.getElementById(
    "create-modal-cancel-button"
  );
  const createPedidoForm = document.getElementById("create-pedido-form");
  const createPedidoTitle = document.getElementById("create-pedido-title");
  const createPedidoGroup = document.getElementById("create-pedido-group");
  const createPedidoPriority = document.getElementById(
    "create-pedido-priority"
  );
  const createPedidoSolicitante = document.getElementById(
    "create-pedido-solicitante"
  );
  const createPedidoError = document.getElementById("create-pedido-error");

  // --- MODAL DETALHES DA FILA ---
  const colDetailModal = document.getElementById("column-detail-modal");
  const colModalCloseBtn = document.getElementById("col-modal-close-button");
  const colEditForm = document.getElementById("col-edit-form");
  const colDeleteBtn = document.getElementById("col-delete-btn");
  const colPedidosList = document.getElementById("col-pedidos-list");
  const colEditId = document.getElementById("col-edit-id");
  const colEditTitle = document.getElementById("col-edit-title");
  const colEditColor = document.getElementById("col-edit-color");
  const colEditPosition = document.getElementById("col-edit-position");
  const colEditInitial = document.getElementById("col-edit-initial");
  const colEditComplete = document.getElementById("col-edit-complete");

  // --- MODAL DETALHES PEDIDO ---
  const modal = document.getElementById("pedido-modal");
  const modalCloseButton = document.getElementById("modal-close-button");
  const modalDeleteButton = document.getElementById("modal-delete-button");
  const modalSaveChangesBtn = document.getElementById("modal-save-changes-btn");

  // Campos Editáveis
  const modalEditTitle = document.getElementById("modal-edit-title");
  const modalEditSolicitante = document.getElementById(
    "modal-edit-solicitante"
  );
  const modalEditPriority = document.getElementById("modal-edit-priority");
  const modalEditGroup = document.getElementById("modal-edit-group");

  // Abas
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
  const modalFinalizeForm = document.getElementById("modal-finalize-form");
  const modalFinalizeSuccess = document.getElementById(
    "modal-finalize-success"
  );
  const modalReportButton = document.getElementById("modal-report-button");
  const modalFinalizeError = document.getElementById("modal-finalize-error");
  const modalDeliverButton = document.getElementById("modal-deliver-button");

  // --- ESTADO GLOBAL ---
  let globalColumns = [];
  let globalPedidos = [];
  let globalGroups = [];
  let globalSettings = {};
  let currentUser = null;
  let currentPedidoId = null;
  let currentPedidoData = null;

  // =================================================================
  // 1. INICIALIZAÇÃO E AUTENTICAÇÃO
  // =================================================================

  async function checkAuthentication() {
    try {
      const response = await fetch("/api/auth/check");

      if (response.status === 401 || response.status === 403) {
        throw new Error("AUTH_FAIL");
      }
      if (!response.ok) {
        throw new Error(`Erro no servidor: ${response.status}`);
      }

      const data = await response.json();

      if (data.loggedIn && data.user) {
        currentUser = data.user;
        initializeUI(currentUser);
        initializeDarkMode();

        try {
          globalSettings = await fetchSettings();
          globalGroups = await fetchGroups();
          await loadBoard();

          initializeSidebarCreateButton();
          initializeSidebarNewColumnButton();

          setupModalEventListeners();
          setupCreateModalListeners();
          setupColumnDetailListeners();
        } catch (dataError) {
          console.error("Erro ao carregar dados:", dataError);
          showCustomAlert(
            "Erro crítico ao carregar dados: " + dataError.message
          );
        }
      } else {
        redirectToLogin();
      }
    } catch (error) {
      console.error("Erro de autenticação:", error);
      if (error.message === "AUTH_FAIL") {
        redirectToLogin();
      } else {
        document.body.innerHTML = `<div style="color: white; padding: 20px; text-align: center;"><h1>Erro ao iniciar</h1><p>${error.message}</p></div>`;
      }
    }
  }

  function initializeUI(user) {
    if (user.username && userAvatar) {
      userAvatar.textContent = user.username.charAt(0).toUpperCase();
      userAvatar.title = user.username;
    }
    if (logoutButton) logoutButton.addEventListener("click", handleLogout);
    if (user.role === "admin") {
      if (adminPanelLinks) adminPanelLinks.style.display = "block";
      if (adminSettingsLink) adminSettingsLink.style.display = "block";
    }
  }

  function initializeDarkMode() {
    if (
      localStorage.getItem("theme") === "dark" ||
      (!("theme" in localStorage) &&
        window.matchMedia("(prefers-color-scheme: dark)").matches)
    ) {
      document.documentElement.classList.add("dark");
      themeToggleDarkIcon.classList.add("hidden");
      themeToggleLightIcon.classList.remove("hidden");
    } else {
      document.documentElement.classList.remove("dark");
      themeToggleDarkIcon.classList.remove("hidden");
      themeToggleLightIcon.classList.add("hidden");
    }
    themeToggleBtn.addEventListener("click", () => {
      themeToggleDarkIcon.classList.toggle("hidden");
      themeToggleLightIcon.classList.toggle("hidden");
      if (localStorage.getItem("theme") === "dark") {
        document.documentElement.classList.remove("dark");
        localStorage.setItem("theme", "light");
      } else {
        document.documentElement.classList.add("dark");
        localStorage.setItem("theme", "dark");
      }
    });
  }

  // =================================================================
  // 2. CARREGAMENTO DE DADOS (API)
  // =================================================================

  async function fetchSettings() {
    const res = await fetch("/api/settings");
    if (!res.ok) return {};
    return await res.json();
  }
  async function fetchGroups() {
    const res = await fetch("/api/groups");
    if (!res.ok) return [];
    return await res.json();
  }

  async function loadBoard() {
    const colRes = await fetch("/api/columns");
    if (!colRes.ok) throw new Error("Erro ao buscar colunas");
    globalColumns = await colRes.json();

    const pedRes = await fetch("/api/pedidos");
    if (!pedRes.ok) throw new Error("Erro ao buscar pedidos");
    globalPedidos = await pedRes.json();

    renderBoardStructure();
    renderSidebarLinks();
    distributePedidos();
    initializeDragDropListeners();
  }

  // =================================================================
  // 3. RENDERIZAÇÃO
  // =================================================================

  function renderBoardStructure() {
    if (!kanbanContainer) return;
    kanbanContainer.innerHTML = globalColumns
      .map(
        (col) => `
            <div class="flex w-80 flex-shrink-0 flex-col rounded-lg bg-medium border border-light/50 transition-all duration-300 kanban-column" 
                 id="col-container-${col.id}" 
                 data-col-id="${col.id}" 
                 data-allows-completion="${col.allows_completion}">
                
                <div class="flex items-center justify-between p-3 border-b border-light">
                    <h3 class="font-semibold text-text-primary flex items-center gap-2">
                        <span class="w-3 h-3 rounded-full bg-${col.color}-500"></span>
                        ${col.title}
                    </h3>
                    <span class="text-xs text-text-secondary count-badge" id="count-${col.id}">0</span>
                </div>
                
                <div class="flex-1 overflow-y-auto p-3 min-h-[100px]" id="kanban-col-${col.id}">
                    </div>
            </div>
        `
      )
      .join("");
  }

  function renderSidebarLinks() {
    if (!sidebarLists) return;
    sidebarLists.innerHTML = globalColumns
      .map(
        (col) => `
            <li>
                <div class="flex items-center group">
                    <button onclick="toggleColumnVisibility(${col.id})" class="p-2 text-text-secondary hover:text-text-primary transition-colors" title="Ocultar/Mostrar">
                         <svg id="icon-eye-${col.id}" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>
                    </button>
                    <button onclick="openColumnDetail(${col.id})" class="flex-1 text-left p-2 text-sm text-text-secondary hover:text-accent hover:bg-light rounded-r-md transition-colors flex items-center">
                        <span class="mr-2 h-2 w-2 rounded-full bg-${col.color}-500"></span>
                        ${col.title}
                    </button>
                </div>
            </li>
        `
      )
      .join("");
  }

  window.toggleColumnVisibility = (colId) => {
    const colEl = document.getElementById(`col-container-${colId}`);
    const icon = document.getElementById(`icon-eye-${colId}`);
    if (colEl.classList.contains("hidden")) {
      colEl.classList.remove("hidden");
      icon.classList.remove("text-red-500");
      icon.innerHTML =
        '<path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />';
    } else {
      colEl.classList.add("hidden");
      icon.classList.add("text-red-500");
      icon.innerHTML =
        '<path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />';
    }
  };

  function distributePedidos() {
    globalColumns.forEach((col) => {
      const badge = document.getElementById(`count-${col.id}`);
      if (badge) badge.textContent = "0";
    });
    globalPedidos.forEach((pedido) => {
      const container = document.getElementById(
        `kanban-col-${pedido.column_id}`
      );
      if (container) {
        container.appendChild(createPedidoCard(pedido));
        const badge = document.getElementById(`count-${pedido.column_id}`);
        if (badge) badge.textContent = parseInt(badge.textContent) + 1;
      }
    });
  }

  function createPedidoCard(pedido) {
    const card = document.createElement("div");
    card.id = `pedido-${pedido.id}`;
    card.draggable = true;
    const colColor = pedido.column_color || "gray";
    const priorityIndicator =
      pedido.priority === "alta"
        ? "🔴"
        : pedido.priority === "media"
        ? "🟡"
        : "🔵";

    card.className = `kanban-card bg-light p-3 rounded-lg shadow mb-3 border-l-4 border-${colColor}-500 cursor-pointer hover:bg-gray-600 transition-colors`;

    card.innerHTML = `
            <div class="flex justify-between items-start">
                <p class="font-semibold text-text-primary mb-1 text-sm">${
                  pedido.title
                }</p>
                <span class="text-xs" title="Prioridade ${
                  pedido.priority
                }">${priorityIndicator}</span>
            </div>
            <div class="flex justify-between items-center mt-1">
                 <p class="text-xs text-text-secondary">Solicitante: ${
                   pedido.solicitante_display || "N/A"
                 }</p>
                 ${
                   pedido.purchase_link
                     ? '<span class="text-[10px] bg-green-900 text-green-300 px-1 rounded">Pago</span>'
                     : ""
                 }
            </div>
            <p class="text-[10px] text-text-secondary mt-1 text-right">${formatTimestamp(
              pedido.task_created_at
            )}</p>
        `;
    card.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text/plain", card.id);
      card.classList.add("opacity-50");
    });
    card.addEventListener("dragend", () => card.classList.remove("opacity-50"));
    card.addEventListener("click", (e) => {
      if (!e.target.closest(".dragging")) openPedidoModal(pedido.id);
    });
    return card;
  }

  function initializeDragDropListeners() {
    const cols = document.querySelectorAll(".kanban-column");
    cols.forEach((col) => {
      col.ondragover = (e) => e.preventDefault();
      col.ondrop = async (e) => {
        e.preventDefault();
        const cardId = e.dataTransfer.getData("text/plain");
        if (!cardId) return;
        const id = cardId.split("-")[1];
        const card = document.getElementById(cardId);
        const targetBody = col.querySelector('[id^="kanban-col-"]');
        if (card && targetBody && !targetBody.contains(card)) {
          targetBody.appendChild(card);
          const targetColId = col.dataset.colId;
          const allowsCompletion = col.dataset.allowsCompletion === "1";
          await fetch(`/api/pedidos/${id}/move`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ newColumnId: targetColId }),
          });
          if (allowsCompletion) openPedidoModal(id, "tab-finalize");
        }
      };
    });
  }

  // =================================================================
  // 4. MODAL DETALHES DA FILA (NOVO)
  // =================================================================

  function initializeSidebarNewColumnButton() {
    if (sidebarNewColumnButton) {
      sidebarNewColumnButton.onclick = async () => {
        // Simplificação: Cria via prompt, idealmente seria um modal
        // Mas como o modal do admin é complexo, mantemos simples para o MVP
        // OU podemos reusar o modal de criação se ele estivesse no HTML.
        // Para consistência com a "UI Modais", vamos fazer um prompt estilizado "fake" ou direto API.
        // Vou usar um prompt nativo por brevidade, mas em produção usaríamos um modal.
        const name = prompt("Nome da Nova Fila:");
        if (name) {
          const res = await fetch("/api/columns", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: name, color: "gray", position: 99 }),
          });
          if (res.ok) await loadBoard();
          else showCustomAlert("Erro ao criar fila.");
        }
      };
    }
  }

  function setupColumnDetailListeners() {
    if (!colDetailModal) return;
    colModalCloseBtn.onclick = () => colDetailModal.classList.add("hidden");
    colEditForm.onsubmit = async (e) => {
      e.preventDefault();
      const id = colEditId.value;
      const data = {
        title: colEditTitle.value,
        color: colEditColor.value,
        position: colEditPosition.value,
        is_initial: colEditInitial.checked,
        allows_completion: colEditComplete.checked,
      };
      const res = await fetch(`/api/columns/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        colDetailModal.classList.add("hidden");
        await loadBoard();
      } else showCustomAlert("Erro ao atualizar fila.");
    };
    colDeleteBtn.onclick = async () => {
      const confirmed = await showCustomConfirm(
        "Excluir esta fila permanentemente?"
      );
      if (!confirmed) return;
      const id = colEditId.value;
      const res = await fetch(`/api/columns/${id}`, { method: "DELETE" });
      if (res.ok) {
        colDetailModal.classList.add("hidden");
        await loadBoard();
      } else {
        const json = await res.json();
        showCustomAlert(json.message);
      }
    };
  }

  window.openColumnDetail = async (colId) => {
    colDetailModal.classList.remove("hidden");
    const col = globalColumns.find((c) => c.id === colId);
    if (col) {
      colEditId.value = col.id;
      colEditTitle.value = col.title;
      colEditColor.value = col.color;
      colEditPosition.value = col.position;
      colEditInitial.checked = col.is_initial === 1;
      colEditComplete.checked = col.allows_completion === 1;
    }
    colPedidosList.innerHTML = "Carregando...";
    const pedidosDaFila = globalPedidos.filter((p) => p.column_id === colId);

    if (pedidosDaFila.length === 0) {
      colPedidosList.innerHTML =
        '<p class="text-sm text-text-secondary">Nenhum pedido nesta fila.</p>';
    } else {
      colPedidosList.innerHTML = pedidosDaFila
        .map(
          (p) => `
                <div class="bg-light p-3 rounded border-l-4 border-${
                  col.color
                }-500 cursor-pointer hover:bg-dark mb-2" onclick="openPedidoModal(${
            p.id
          })">
                    <div class="flex justify-between">
                        <span class="font-semibold text-text-primary">${
                          p.title
                        }</span>
                        <span class="text-xs text-text-secondary">${formatTimestamp(
                          p.task_created_at
                        )}</span>
                    </div>
                    ${
                      p.last_note
                        ? `<p class="text-xs text-text-secondary mt-1 italic">" ${p.last_note} "</p>`
                        : ""
                    }
                </div>
            `
        )
        .join("");
    }
  };

  // =================================================================
  // 5. MODAL CRIAÇÃO PEDIDO
  // =================================================================
  function initializeSidebarCreateButton() {
    if (sidebarCreateButton) {
      sidebarCreateButton.style.display = "flex";
      sidebarCreateButton.onclick = openCreateModal;
    }
  }
  function setupCreateModalListeners() {
    if (!createModal) return;
    createModalCloseButton.onclick = closeCreateModal;
    createModalCancelButton.onclick = closeCreateModal;
    createPedidoForm.onsubmit = handleCreatePedidoSubmit;
  }
  function openCreateModal() {
    createPedidoGroup.innerHTML = globalGroups.length
      ? '<option value="">-- Selecione --</option>'
      : '<option value="">Sem grupos</option>';
    globalGroups.forEach((g) => {
      const opt = document.createElement("option");
      opt.value = g.id;
      opt.textContent = g.name;
      createPedidoGroup.appendChild(opt);
    });
    createPedidoForm.reset();
    createPedidoError.style.display = "none";
    createModal.classList.remove("hidden");
  }
  function closeCreateModal() {
    createModal.classList.add("hidden");
  }
  async function handleCreatePedidoSubmit(e) {
    e.preventDefault();
    const data = {
      title: createPedidoTitle.value,
      group_id: createPedidoGroup.value,
      priority: createPedidoPriority.value,
      solicitante_name: createPedidoSolicitante.value,
    };
    if (!data.title.trim() || !data.group_id) return;
    try {
      const res = await fetch("/api/pedidos/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error((await res.json()).message);
      closeCreateModal();
      await loadBoard();
    } catch (error) {
      createPedidoError.textContent = error.message;
      createPedidoError.style.display = "block";
    }
  }

  // =================================================================
  // 6. MODAL DETALHES PEDIDO (COM EDIÇÃO)
  // =================================================================
  function setupModalEventListeners() {
    modalCloseButton.onclick = closePedidoModal;
    if (modalDeleteButton) modalDeleteButton.onclick = handleDeletePedido;
    if (modalSaveChangesBtn)
      modalSaveChangesBtn.onclick = handleSavePedidoChanges;

    modalTabs.onclick = (e) => {
      if (e.target.tagName !== "BUTTON") return;
      document.querySelectorAll(".modal-tab-button").forEach((btn) => {
        btn.classList.remove("border-accent", "text-accent");
        btn.classList.add("border-transparent", "text-text-secondary");
      });
      modalTabPanes.forEach((p) => p.classList.add("hidden"));
      e.target.classList.add("border-accent", "text-accent");
      e.target.classList.remove("border-transparent", "text-text-secondary");
      document
        .getElementById(e.target.getAttribute("data-tab"))
        .classList.remove("hidden");
    };
    modalAddNoteForm.onsubmit = handleAddNote;
    modalAddResearchForm.onsubmit = handleAddResearch;
    modalFinalizeForm.onsubmit = handleFinalizeSave;
    if (modalDeliverButton) modalDeliverButton.onclick = handleDeliver;
  }

  async function openPedidoModal(pedidoId, forceTab = null) {
    currentPedidoId = pedidoId;
    modal.classList.remove("hidden");
    modalNotesList.innerHTML = "<li>...</li>";
    try {
      const [pedidoRes, notesRes, researchRes] = await Promise.all([
        fetch(`/api/pedidos/${pedidoId}`),
        fetch(`/api/pedidos/${pedidoId}/notes`),
        fetch(`/api/pedidos/${pedidoId}/research`),
      ]);
      if (!pedidoRes.ok) throw new Error("Erro ao carregar");
      currentPedidoData = await pedidoRes.json();
      renderModalDetails(currentPedidoData);
      renderModalNotes(await notesRes.json());
      renderModalResearch(await researchRes.json());
      checkFinalizeDisplay(currentPedidoData);
      if (forceTab) {
        const b = document.querySelector(`button[data-tab="${forceTab}"]`);
        if (b) b.click();
      } else {
        const b = document.querySelector(`button[data-tab="tab-notes"]`);
        if (b) b.click();
      }
    } catch (error) {
      console.error(error);
    }
  }

  function renderModalDetails(pedido) {
    // Campos editáveis
    modalEditTitle.value = pedido.title;
    modalEditSolicitante.value = pedido.solicitante_display || "";
    modalEditPriority.value = pedido.priority || "baixa";

    modalEditGroup.innerHTML = "";
    globalGroups.forEach((g) => {
      const opt = document.createElement("option");
      opt.value = g.id;
      opt.textContent = g.name;
      if (g.id === pedido.group_id) opt.selected = true;
      modalEditGroup.appendChild(opt);
    });
  }

  async function handleSavePedidoChanges() {
    const data = {
      title: modalEditTitle.value,
      solicitante_name: modalEditSolicitante.value,
      priority: modalEditPriority.value,
      group_id: modalEditGroup.value,
    };
    try {
      const res = await fetch(`/api/pedidos/${currentPedidoId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        showCustomAlert("Alterações salvas!");
        await loadBoard();
      } else {
        showCustomAlert("Erro ao salvar.");
      }
    } catch (e) {
      showCustomAlert(e.message);
    }
  }

  function closePedidoModal() {
    modal.classList.add("hidden");
    currentPedidoId = null;
  }

  function renderModalNotes(notes) {
    modalNotesList.innerHTML = notes.length
      ? ""
      : '<li class="text-center text-text-secondary">Sem notas.</li>';
    notes.forEach((n) => {
      const li = document.createElement("li");
      li.className = "p-3 bg-light rounded-md mb-2";
      li.innerHTML = `<p class="text-text-primary">${
        n.content
      }</p><p class="text-xs text-text-secondary mt-1">${
        n.username
      } - ${formatTimestamp(n.created_at)}</p>`;
      modalNotesList.appendChild(li);
    });
  }
  async function handleAddNote(e) {
    e.preventDefault();
    if (!modalNewNoteInput.value.trim()) return;
    await fetch(`/api/pedidos/${currentPedidoId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: modalNewNoteInput.value }),
    });
    modalNewNoteInput.value = "";
    const res = await fetch(`/api/pedidos/${currentPedidoId}/notes`);
    renderModalNotes(await res.json());
  }

  function renderModalResearch(items) {
    modalResearchList.innerHTML = items.length
      ? ""
      : '<li class="text-center text-text-secondary">Sem links.</li>';
    items.forEach((i) => {
      const li = document.createElement("li");
      li.className = "p-3 bg-light rounded-md mb-2";
      li.innerHTML = `<p class="text-text-primary break-all"><a href="${
        i.content
      }" target="_blank" class="text-blue-400 underline">${
        i.content
      }</a></p><p class="text-xs text-text-secondary mt-1">${
        i.username
      } - ${formatTimestamp(i.created_at)}</p>`;
      modalResearchList.appendChild(li);
    });
  }
  async function handleAddResearch(e) {
    e.preventDefault();
    if (!modalNewResearchInput.value.trim()) return;
    await fetch(`/api/pedidos/${currentPedidoId}/research`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: modalNewResearchInput.value }),
    });
    modalNewResearchInput.value = "";
    const res = await fetch(`/api/pedidos/${currentPedidoId}/research`);
    renderModalResearch(await res.json());
  }

  async function handleFinalizeSave(e) {
    e.preventDefault();
    const data = {
      purchase_link: document.getElementById("modal-link").value,
      purchased_price: document.getElementById("modal-price").value,
      purchased_quantity: document.getElementById("modal-quantity").value,
    };
    try {
      const res = await fetch(`/api/pedidos/${currentPedidoId}/finalize`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error((await res.json()).message);
      currentPedidoData.purchase_link = data.purchase_link;
      checkFinalizeDisplay(currentPedidoData);
      showCustomAlert("Dados salvos.");
    } catch (e) {
      showCustomAlert(e.message);
    }
  }
  async function handleDeliver() {
    const confirmed = await showCustomConfirm(
      "Tem certeza? O pedido será arquivado."
    );
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/pedidos/${currentPedidoId}/deliver`, {
        method: "PUT",
      });
      if (!res.ok) throw new Error((await res.json()).message);
      closePedidoModal();
      await loadBoard();
      showCustomAlert("Pedido entregue!");
    } catch (e) {
      showCustomAlert(e.message);
    }
  }

  function checkFinalizeDisplay(pedido) {
    const allowsCompletion =
      globalColumns.find((c) => c.id === pedido.column_id)
        ?.allows_completion === 1;
    if (pedido.purchase_link) {
      modalFinalizeForm.classList.add("hidden");
      modalFinalizeSuccess.classList.remove("hidden");
      if (modalDeliverButton)
        modalDeliverButton.parentElement.classList.remove("hidden");
      modalReportButton.onclick = () =>
        window.open(`report.html?id=${pedido.id}`, "_blank");
    } else {
      modalFinalizeSuccess.classList.add("hidden");
      if (modalDeliverButton)
        modalDeliverButton.parentElement.classList.add("hidden");
      if (allowsCompletion) {
        modalFinalizeForm.classList.remove("hidden");
        modalFinalizeError.classList.add("hidden");
      } else {
        modalFinalizeForm.classList.add("hidden");
        modalFinalizeError.classList.remove("hidden");
      }
    }
  }

  async function handleDeletePedido() {
    const confirmed = await showCustomConfirm("Excluir pedido?");
    if (!confirmed) return;
    await fetch(`/api/pedidos/${currentPedidoId}`, { method: "DELETE" });
    closePedidoModal();
    await loadBoard();
  }
  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    redirectToLogin();
  }
  function redirectToLogin() {
    window.location.href = "login.html";
  }
  function formatTimestamp(iso) {
    if (!iso) return "N/A";
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  // --- HELPERS: MODAIS CUSTOMIZADOS ---
  function showCustomAlert(message, title = "Atenção") {
    return new Promise((resolve) => {
      const alertModal = document.getElementById("custom-alert-modal");
      if (!alertModal) {
        alert(message);
        resolve();
        return;
      }
      document.getElementById("custom-alert-title").textContent = title;
      document.getElementById("custom-alert-message").textContent = message;
      alertModal.classList.remove("hidden");
      const okBtn = document.getElementById("custom-alert-ok");
      const newBtn = okBtn.cloneNode(true);
      okBtn.parentNode.replaceChild(newBtn, okBtn);
      newBtn.addEventListener("click", () => {
        alertModal.classList.add("hidden");
        resolve();
      });
    });
  }

  function showCustomConfirm(message, title = "Confirmar") {
    return new Promise((resolve) => {
      const confirmModal = document.getElementById("custom-confirm-modal");
      if (!confirmModal) {
        resolve(confirm(message));
        return;
      }
      document.getElementById("custom-confirm-title").textContent = title;
      document.getElementById("custom-confirm-message").textContent = message;
      confirmModal.classList.remove("hidden");
      const okBtn = document.getElementById("custom-confirm-ok");
      const cancelBtn = document.getElementById("custom-confirm-cancel");
      const newOk = okBtn.cloneNode(true);
      const newCancel = cancelBtn.cloneNode(true);
      okBtn.parentNode.replaceChild(newOk, okBtn);
      cancelBtn.parentNode.replaceChild(newCancel, cancelBtn);
      newOk.addEventListener("click", () => {
        confirmModal.classList.add("hidden");
        resolve(true);
      });
      newCancel.addEventListener("click", () => {
        confirmModal.classList.add("hidden");
        resolve(false);
      });
    });
  }

  checkAuthentication();
});

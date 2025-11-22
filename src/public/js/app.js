document.addEventListener("DOMContentLoaded", () => {
  // =================================================================
  // 1. ELEMENTOS GLOBAIS DA UI
  // =================================================================
  const userAvatar = document.getElementById("user-avatar");
  const logoutButton = document.getElementById("logout-button");
  const adminSettingsLink = document.getElementById("admin-settings-link");
  const adminPanelLinks = document.getElementById("admin-panel-links");

  const sidebar = document.getElementById("sidebar");
  const sidebarToggle = document.getElementById("sidebar-toggle");
  const sidebarCreateButton = document.getElementById("sidebar-create-button");
  const sidebarNewColumnButton = document.getElementById(
    "sidebar-new-column-button"
  );
  const sidebarLists = document.getElementById("sidebar-lists");

  const kanbanContainer = document.getElementById("kanban-board-container");

  // Header & Notifications
  const inboxButton = document.getElementById("inbox-button");
  const inboxBadge = document.getElementById("inbox-badge");
  const toastNotification = document.getElementById("toast-notification");
  const toastMsg = document.getElementById("toast-msg");

  // Dark Mode
  const themeToggleBtn = document.getElementById("theme-toggle");
  const themeToggleDarkIcon = document.getElementById("theme-toggle-dark-icon");
  const themeToggleLightIcon = document.getElementById(
    "theme-toggle-light-icon"
  );

  // --- MODAL TRIAGEM (CAIXA DE ENTRADA) ---
  const triageModal = document.getElementById("triage-modal");
  const triageCloseButton = document.getElementById("triage-close-button");
  const triageList = document.getElementById("triage-list");
  const triageDetails = document.getElementById("triage-details");
  const triageTabPending = document.getElementById("triage-tab-pending");
  const triageTabRejected = document.getElementById("triage-tab-rejected");

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
  const createPedidoDescription = document.getElementById(
    "create-pedido-description"
  );
  const createPedidoGroup = document.getElementById("create-pedido-group");
  const createPedidoPriority = document.getElementById(
    "create-pedido-priority"
  );
  const createPedidoSolicitante = document.getElementById(
    "create-pedido-solicitante"
  );
  const createPedidoError = document.getElementById("create-pedido-error");

  // --- MODAL CRIAÇÃO FILA (NOVO) ---
  const createColModal = document.getElementById("create-column-modal");
  const createColCloseBtn = document.getElementById("create-col-close-btn");
  const createColCancelBtn = document.getElementById("create-col-cancel-btn");
  const createColForm = document.getElementById("create-column-form");
  // Campos do form criação
  const createColTitle = document.getElementById("create-col-title");
  const createColColor = document.getElementById("create-col-color");
  const createColPos = document.getElementById("create-col-pos");
  const createColInitial = document.getElementById("create-col-initial");
  const createColComplete = document.getElementById("create-col-complete");
  const createColFinal = document.getElementById("create-col-final");

  // --- MODAL DETALHES DA FILA ---
  const colDetailModal = document.getElementById("column-detail-modal");
  const colModalCloseBtn = document.getElementById("col-modal-close-button");
  const colEditForm = document.getElementById("col-edit-form");
  const colDeleteBtn = document.getElementById("col-delete-btn");
  const colPedidosList = document.getElementById("col-pedidos-list");
  // Campos Edição Fila
  const colEditId = document.getElementById("col-edit-id");
  const colEditTitle = document.getElementById("col-edit-title");
  const colEditColor = document.getElementById("col-edit-color");
  const colEditPosition = document.getElementById("col-edit-position");
  const colEditInitial = document.getElementById("col-edit-initial");
  const colEditComplete = document.getElementById("col-edit-complete");
  const colEditFinal = document.getElementById("col-edit-final");

  // --- MODAL DETALHES PEDIDO ---
  const modal = document.getElementById("pedido-modal");
  const modalCloseButton = document.getElementById("modal-close-button");
  const modalDeleteButton = document.getElementById("modal-delete-button");
  const modalSaveChangesBtn = document.getElementById("modal-save-changes-btn");

  // Campos Editáveis do Pedido
  const modalEditTitle = document.getElementById("modal-edit-title");
  const modalEditDescription = document.getElementById(
    "modal-edit-description"
  );
  const modalEditSolicitante = document.getElementById(
    "modal-edit-solicitante"
  );
  const modalEditPriority = document.getElementById("modal-edit-priority");
  const modalEditGroup = document.getElementById("modal-edit-group");

  // Abas e Conteúdo
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

  // Finalização
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
  let pendingRequests = [];
  let triageRequests = [];
  let currentTriageTab = "pending";
  let currentUser = null;
  let currentPedidoId = null;
  let currentPedidoData = null;
  let isSidebarCollapsed = false;

  // =================================================================
  // 1. INICIALIZAÇÃO E AUTENTICAÇÃO
  // =================================================================

  async function checkAuthentication() {
    try {
      const response = await fetch("/api/auth/check");

      if (response.status === 401 || response.status === 403)
        throw new Error("AUTH_FAIL");
      if (!response.ok) throw new Error(`Erro no servidor: ${response.status}`);

      const data = await response.json();

      if (data.loggedIn && data.user) {
        currentUser = data.user;
        initializeUI(currentUser);
        initializeDarkMode();
        initializeSidebarState();

        try {
          globalGroups = await fetchGroups();
          await loadBoard();

          initializeSidebarCreateButton();
          initializeSidebarNewColumnButton();

          // Inicializa a Triagem
          if (currentUser.role === "admin" || currentUser.role === "buyer") {
            await checkInbox();
            setInterval(checkInbox, 30000);
            setupTriageListeners();
          }

          setupModalEventListeners();
          setupCreateModalListeners();
          setupCreateColumnListeners(); // NOVO
          setupColumnDetailListeners();
        } catch (dataError) {
          console.error("Erro dados:", dataError);
          showCustomAlert("Erro ao carregar dados: " + dataError.message);
        }
      } else {
        redirectToLogin();
      }
    } catch (error) {
      if (error.message === "AUTH_FAIL") redirectToLogin();
      else
        document.body.innerHTML = `<div style="color: white; padding: 20px; text-align: center;"><h1>Erro ao iniciar</h1><p>${error.message}</p></div>`;
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

  // --- DARK MODE ---
  function initializeDarkMode() {
    const isDark =
      localStorage.getItem("theme") === "dark" ||
      (!("theme" in localStorage) &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);
    updateThemeUI(isDark);
    themeToggleBtn.addEventListener("click", () => {
      const currentDark = document.documentElement.classList.contains("dark");
      updateThemeUI(!currentDark);
    });
  }
  function updateThemeUI(isDark) {
    if (isDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
      themeToggleDarkIcon.classList.add("hidden");
      themeToggleLightIcon.classList.remove("hidden");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
      themeToggleDarkIcon.classList.remove("hidden");
      themeToggleLightIcon.classList.add("hidden");
    }
  }

  // --- SIDEBAR RETRÁTIL ---
  function initializeSidebarState() {
    isSidebarCollapsed = localStorage.getItem("sidebarCollapsed") === "true";
    updateSidebarUI();
    sidebarToggle.addEventListener("click", () => {
      isSidebarCollapsed = !isSidebarCollapsed;
      localStorage.setItem("sidebarCollapsed", isSidebarCollapsed);
      updateSidebarUI();
    });
  }
  function updateSidebarUI() {
    const texts = document.querySelectorAll(".sidebar-text");
    const icon = sidebarToggle.querySelector("svg");
    if (isSidebarCollapsed) {
      sidebar.classList.remove("w-64");
      sidebar.classList.add("w-20");
      texts.forEach((el) => el.classList.add("hidden"));
      icon.innerHTML =
        '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />';
      sidebarCreateButton.classList.add("px-0");
      sidebarCreateButton.classList.remove("px-4");
    } else {
      sidebar.classList.remove("w-20");
      sidebar.classList.add("w-64");
      texts.forEach((el) => el.classList.remove("hidden"));
      icon.innerHTML =
        '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />';
      sidebarCreateButton.classList.remove("px-0");
      sidebarCreateButton.classList.add("px-4");
    }
  }

  // =================================================================
  // 2. CARREGAMENTO DE DADOS
  // =================================================================

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
  // 3. LÓGICA DE TRIAGEM (INBOX)
  // =================================================================

  async function checkInbox() {
    try {
      const res = await fetch("/api/requests/pending");
      if (res.ok) {
        const newRequests = await res.json();
        const oldCount = parseInt(inboxBadge.textContent) || 0;

        if (newRequests.length > oldCount) {
          showToastNotification(
            `Você tem ${newRequests.length} pedidos pendentes.`
          );
        }

        pendingRequests = newRequests; // Atualiza lista global de pendentes

        if (newRequests.length > 0) {
          inboxButton.classList.remove("hidden");
          inboxBadge.textContent = newRequests.length;
          inboxBadge.classList.remove("hidden");
        } else {
          inboxBadge.classList.add("hidden");
        }

        if (
          !triageModal.classList.contains("hidden") &&
          currentTriageTab === "pending"
        ) {
          triageRequests = newRequests;
          renderTriageList();
        }
      }
    } catch (e) {
      console.error("Erro inbox", e);
    }
  }

  function showToastNotification(message) {
    if (!toastNotification) return;
    toastMsg.textContent = message;
    toastNotification.classList.remove("hidden");
    setTimeout(() => {
      toastNotification.classList.add("hidden");
    }, 5000);
  }

  function setupTriageListeners() {
    if (inboxButton) inboxButton.addEventListener("click", openTriageModal);
    if (triageCloseButton)
      triageCloseButton.addEventListener("click", () =>
        triageModal.classList.add("hidden")
      );

    if (triageTabPending)
      triageTabPending.addEventListener("click", () =>
        switchTriageTab("pending")
      );
    if (triageTabRejected)
      triageTabRejected.addEventListener("click", () =>
        switchTriageTab("rejected")
      );
  }

  function openTriageModal() {
    triageModal.classList.remove("hidden");
    switchTriageTab("pending");
  }

  async function switchTriageTab(tab) {
    currentTriageTab = tab;
    if (tab === "pending") {
      triageTabPending.className =
        "px-3 py-1 text-xs font-bold rounded-md bg-white text-indigo-700 shadow-sm transition-all";
      triageTabRejected.className =
        "px-3 py-1 text-xs font-bold rounded-md text-indigo-200 hover:text-white hover:bg-indigo-600 transition-all";
    } else {
      triageTabRejected.className =
        "px-3 py-1 text-xs font-bold rounded-md bg-white text-indigo-700 shadow-sm transition-all";
      triageTabPending.className =
        "px-3 py-1 text-xs font-bold rounded-md text-indigo-200 hover:text-white hover:bg-indigo-600 transition-all";
    }

    triageList.innerHTML =
      '<p class="p-4 text-sm text-gray-500 text-center">Carregando...</p>';
    triageDetails.innerHTML = "";

    try {
      const endpoint =
        tab === "pending" ? "/api/requests/pending" : "/api/requests/rejected";
      const res = await fetch(endpoint);
      if (res.ok) {
        triageRequests = await res.json();
        renderTriageList();
      }
    } catch (e) {
      console.error(e);
    }
  }

  function renderTriageList() {
    if (triageRequests.length === 0) {
      triageList.innerHTML =
        '<p class="p-4 text-sm text-gray-500 text-center">Nenhum item encontrado.</p>';
      return;
    }

    triageList.innerHTML = triageRequests
      .map(
        (req) => `
            <div class="p-4 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition-colors group" onclick="window.selectTriageRequest(${
              req.id
            })">
                <div class="flex justify-between items-start mb-1">
                    <span class="font-semibold text-gray-900 dark:text-gray-100 text-sm line-clamp-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">${
                      req.title
                    }</span>
                    <span class="text-xs text-gray-400 whitespace-nowrap ml-2">${new Date(
                      req.created_at
                    ).toLocaleDateString("pt-BR")}</span>
                </div>
                <p class="text-xs text-gray-500 dark:text-gray-400">${
                  req.requester_name
                } (${req.group_name || "N/A"})</p>
            </div>
        `
      )
      .join("");
  }

  window.selectTriageRequest = (id) => {
    const req = triageRequests.find((r) => r.id === id);
    if (!req) return;

    const isRejected = currentTriageTab === "rejected";

    triageDetails.innerHTML = `
            <div class="space-y-6 animate-[fadeIn_0.2s_ease-out]">
                <div>
                    <h3 class="text-2xl font-bold text-gray-900 dark:text-white">${
                      req.title
                    }</h3>
                    <div class="flex flex-wrap items-center gap-2 mt-1 text-sm text-gray-500 dark:text-gray-400">
                        <span class="bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-xs">ID: ${
                          req.id
                        }</span>
                        <span>Solicitante: <strong>${
                          req.requester_name
                        }</strong></span>
                        <span>&bull;</span>
                        <span>Grupo: <strong>${
                          req.group_name || "N/A"
                        }</strong></span>
                    </div>
                </div>

                <div class="bg-gray-50 dark:bg-gray-900 p-4 rounded-md border border-gray-200 dark:border-gray-700">
                    <h4 class="text-xs font-bold text-gray-500 uppercase mb-1">Descrição</h4>
                    <p class="text-gray-800 dark:text-gray-200 text-sm whitespace-pre-wrap leading-relaxed">${
                      req.description || "Sem descrição."
                    }</p>
                </div>

                ${
                  req.reference_links
                    ? `<div class="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-md border border-indigo-100 dark:border-indigo-800"><h4 class="text-xs font-bold text-indigo-500 uppercase mb-1">Link</h4><a href="${req.reference_links}" target="_blank" class="text-indigo-600 dark:text-indigo-400 text-sm hover:underline break-all">${req.reference_links}</a></div>`
                    : ""
                }
                ${
                  req.justification
                    ? `<div><h4 class="text-xs font-bold text-gray-500 uppercase mb-1">Justificativa</h4><p class="text-gray-600 dark:text-gray-400 text-sm italic">"${req.justification}"</p></div>`
                    : ""
                }
                
                ${
                  isRejected
                    ? `<div class="bg-red-50 dark:bg-red-900/20 p-4 rounded-md border border-red-200 dark:border-red-800"><h4 class="text-xs font-bold text-red-500 uppercase mb-1">Motivo da Recusa</h4><p class="text-red-800 dark:text-red-200 text-sm">${
                        req.approval_notes || "Não informado."
                      }</p></div>`
                    : ""
                }

                <hr class="border-gray-200 dark:border-gray-700">

                <div class="flex flex-col gap-4">
                    ${
                      !isRejected
                        ? `
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Definir Prioridade</label>
                            <select id="triage-priority" class="w-full md:w-1/3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md p-2 text-gray-900 dark:text-white">
                                <option value="baixa">Baixa</option><option value="media">Média</option><option value="alta">Alta</option>
                            </select>
                        </div>
                        <div class="flex gap-3">
                            <button onclick="handleRejectRequest(${req.id})" class="px-4 py-2 border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md text-sm font-semibold">Rejeitar</button>
                            <button onclick="handleApproveRequest(${req.id})" class="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-bold shadow-sm flex-1 md:flex-none">Aprovar e Criar Pedido</button>
                        </div>
                    `
                        : `
                        <div class="flex justify-end">
                            <button onclick="handleReopenRequest(${req.id})" class="px-6 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md text-sm font-bold">Reabrir Solicitação</button>
                        </div>
                    `
                    }
                </div>
            </div>
        `;
  };

  window.handleApproveRequest = async (id) => {
    const priority = document.getElementById("triage-priority").value;
    const confirmed = await showCustomConfirm(
      "Aprovar e enviar para o Kanban?"
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/requests/${id}/approve`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priority }),
      });
      if (res.ok) {
        showCustomAlert("Aprovado com sucesso!");
        await checkInbox();
        switchTriageTab("pending");
        await loadBoard();
      } else showCustomAlert("Erro ao aprovar.");
    } catch (e) {
      showCustomAlert(e.message);
    }
  };

  window.handleRejectRequest = async (id) => {
    const reason = prompt("Motivo da recusa?");
    if (reason === null) return;
    try {
      const res = await fetch(`/api/requests/${id}/reject`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (res.ok) {
        showCustomAlert("Rejeitado.");
        await checkInbox();
        switchTriageTab("pending");
      } else showCustomAlert("Erro ao rejeitar.");
    } catch (e) {
      showCustomAlert(e.message);
    }
  };

  window.handleReopenRequest = async (id) => {
    const confirmed = await showCustomConfirm("Reabrir solicitação?");
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/requests/${id}/reopen`, { method: "PUT" });
      if (res.ok) {
        showCustomAlert("Reaberto.");
        await checkInbox();
        switchTriageTab("rejected");
      } else showCustomAlert("Erro ao reabrir.");
    } catch (e) {
      showCustomAlert(e.message);
    }
  };

  // =================================================================
  // 4. RENDERIZAÇÃO DO BOARD
  // =================================================================

  function renderBoardStructure() {
    if (!kanbanContainer) return;
    kanbanContainer.innerHTML = globalColumns
      .map(
        (col) => `
            <div class="flex w-80 flex-shrink-0 flex-col rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 transition-all duration-300 kanban-column" 
                 id="col-container-${col.id}" 
                 data-col-id="${col.id}" 
                 data-allows-completion="${col.allows_completion}"
                 data-is-final="${col.is_final_destination}">
                
                <div class="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
                    <h3 class="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                        <span class="w-3 h-3 rounded-full bg-${col.color}-500"></span>
                        ${col.title}
                    </h3>
                    <span class="text-xs text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-900 px-2 py-0.5 rounded-full" id="count-${col.id}">0</span>
                </div>
                
                <div class="flex-1 overflow-y-auto p-3 min-h-[100px] space-y-3" id="kanban-col-${col.id}"></div>
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
                    <button onclick="toggleColumnVisibility(${col.id})" class="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors" title="Ocultar/Mostrar">
                         <svg id="icon-eye-${col.id}" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>
                    </button>
                    <button onclick="openColumnDetail(${col.id})" class="flex-1 text-left p-2 text-sm text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-r-md transition-colors flex items-center sidebar-text">
                        <span class="mr-2 h-2 w-2 rounded-full bg-${col.color}-500"></span>
                        ${col.title}
                    </button>
                </div>
            </li>
        `
      )
      .join("");
    updateSidebarUI();
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

    const priorityMap = {
      alta: { color: "border-red-500", label: "🔴 Alta" },
      media: { color: "border-yellow-500", label: "🟡 Média" },
      baixa: { color: "border-blue-500", label: "🔵 Baixa" },
    };
    const priorityInfo = priorityMap[pedido.priority] || priorityMap["baixa"];
    const colColor = pedido.column_color || "gray";

    card.className = `kanban-card bg-white dark:bg-gray-700 p-3 rounded-lg shadow-sm border-l-4 border-${colColor}-500 hover:shadow-md cursor-pointer transition-all group`;

    card.innerHTML = `
            <div class="flex justify-between items-start mb-1">
                <p class="font-semibold text-gray-800 dark:text-gray-100 text-sm line-clamp-2">${
                  pedido.title
                }</p>
                <span class="text-[10px] whitespace-nowrap ml-1 opacity-75">${
                  priorityInfo.label
                }</span>
            </div>
            <div class="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400 mb-1">
                 <span>${pedido.solicitante_display || "N/A"}</span>
                 ${
                   pedido.purchase_link
                     ? '<span class="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 px-1.5 rounded text-[10px]">Pago</span>'
                     : ""
                 }
            </div>
            <p class="text-[10px] text-gray-400 dark:text-gray-500 text-right border-t border-gray-100 dark:border-gray-600 pt-1 mt-1">
                ${formatTimestamp(pedido.task_created_at)}
            </p>
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
  // 5. MODAL NOVA FILA
  // =================================================================

  function initializeSidebarNewColumnButton() {
    if (sidebarNewColumnButton) {
      sidebarNewColumnButton.onclick = openCreateColumnModal;
    }
  }

  function setupCreateColumnListeners() {
    if (!createColModal) return;
    const close = () => createColModal.classList.add("hidden");
    createColCloseBtn.onclick = close;
    createColCancelBtn.onclick = close;

    if (createColForm) {
      createColForm.onsubmit = async (e) => {
        e.preventDefault();
        const data = {
          title: document.getElementById("create-col-title").value,
          color: document.getElementById("create-col-color").value,
          position: document.getElementById("create-col-pos").value,
          is_initial: document.getElementById("create-col-initial").checked,
          allows_completion: document.getElementById("create-col-complete")
            .checked,
          is_final_destination:
            document.getElementById("create-col-final").checked,
        };

        try {
          const res = await fetch("/api/columns", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          });
          if (res.ok) {
            close();
            await loadBoard();
            showCustomAlert("Fila criada!");
          } else {
            showCustomAlert("Erro ao criar fila.");
          }
        } catch (err) {
          showCustomAlert(err.message);
        }
      };
    }
  }

  function openCreateColumnModal() {
    if (createColForm) createColForm.reset();
    createColModal.classList.remove("hidden");
  }

  // =================================================================
  // 6. MODAL DETALHES DA FILA
  // =================================================================

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
        is_final_destination: colEditFinal ? colEditFinal.checked : false,
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
      if (colEditFinal) colEditFinal.checked = col.is_final_destination === 1;
    }
    colPedidosList.innerHTML = "Carregando...";
    const pedidosDaFila = globalPedidos.filter((p) => p.column_id === colId);

    if (pedidosDaFila.length === 0) {
      colPedidosList.innerHTML =
        '<p class="text-sm text-gray-500 dark:text-gray-400">Nenhum pedido nesta fila.</p>';
    } else {
      colPedidosList.innerHTML = pedidosDaFila
        .map(
          (p) => `
                <div class="bg-gray-50 dark:bg-gray-700 p-3 rounded border-l-4 border-${
                  col.color
                }-500 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 mb-2" onclick="openPedidoModal(${
            p.id
          })">
                    <div class="flex justify-between">
                        <span class="font-semibold text-gray-900 dark:text-gray-100">${
                          p.title
                        }</span>
                        <span class="text-xs text-gray-500 dark:text-gray-400">${formatTimestamp(
                          p.task_created_at
                        )}</span>
                    </div>
                    ${
                      p.last_note
                        ? `<p class="text-xs text-gray-600 dark:text-gray-300 mt-1 italic">" ${p.last_note} "</p>`
                        : ""
                    }
                </div>
            `
        )
        .join("");
    }
  };

  // =================================================================
  // 7. MODAL CRIAÇÃO PEDIDO
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
      description: createPedidoDescription.value,
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
  // 8. MODAL DETALHES PEDIDO (COM EDIÇÃO E DESCRIÇÃO)
  // =================================================================
  function setupModalEventListeners() {
    modalCloseButton.onclick = closePedidoModal;
    if (modalDeleteButton) modalDeleteButton.onclick = handleDeletePedido;
    if (modalSaveChangesBtn)
      modalSaveChangesBtn.onclick = handleSavePedidoChanges;

    modalTabs.onclick = (e) => {
      if (e.target.tagName !== "BUTTON") return;
      document.querySelectorAll(".modal-tab-button").forEach((btn) => {
        btn.classList.remove(
          "border-indigo-600",
          "text-indigo-600",
          "dark:text-indigo-400"
        );
        btn.classList.add("border-transparent", "text-gray-500");
      });
      modalTabPanes.forEach((p) => p.classList.add("hidden"));
      e.target.classList.add(
        "border-indigo-600",
        "text-indigo-600",
        "dark:text-indigo-400"
      );
      e.target.classList.remove("border-transparent", "text-gray-500");
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
    const isFinal =
      globalColumns.find((c) => c.id === pedido.column_id)
        ?.is_final_destination === 1;
    const disabled = isFinal;

    modalEditTitle.value = pedido.title;
    modalEditDescription.value = pedido.description || "";
    modalEditSolicitante.value = pedido.solicitante_display || "";
    modalEditPriority.value = pedido.priority || "baixa";

    modalEditTitle.disabled = disabled;
    modalEditDescription.disabled = disabled;
    modalEditSolicitante.disabled = disabled;
    modalEditPriority.disabled = disabled;
    modalEditGroup.disabled = disabled;

    modalSaveChangesBtn.style.display = disabled ? "none" : "block";

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
      description: modalEditDescription.value,
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
      : '<li class="text-center text-gray-500">Sem notas.</li>';
    notes.forEach((n) => {
      const li = document.createElement("li");
      li.className = "p-3 bg-gray-50 dark:bg-gray-700 rounded-md mb-2";
      li.innerHTML = `<p class="text-gray-900 dark:text-gray-100">${
        n.content
      }</p><p class="text-xs text-gray-500 dark:text-gray-400 mt-1">${
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
      : '<li class="text-center text-gray-500">Sem links.</li>';
    items.forEach((i) => {
      const li = document.createElement("li");
      li.className = "p-3 bg-gray-50 dark:bg-gray-700 rounded-md mb-2";
      li.innerHTML = `<p class="text-gray-900 dark:text-gray-100 break-all"><a href="${
        i.content
      }" target="_blank" class="text-indigo-500 hover:underline">${
        i.content
      }</a></p><p class="text-xs text-gray-500 dark:text-gray-400 mt-1">${
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
    const isFinal =
      globalColumns.find((c) => c.id === currentPedidoData.column_id)
        ?.is_final_destination === 1;
    if (isFinal) {
      showCustomAlert("Não é possível excluir pedidos na fila final.");
      return;
    }
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

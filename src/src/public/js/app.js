document.addEventListener("DOMContentLoaded", () => {
  // =================================================================
  // 0. FUNÇÕES AUXILIARES E ESSENCIAIS (DEFINIDAS NO INÍCIO)
  // =================================================================

  // Formata data
  function formatTimestamp(iso) {
    if (!iso) return "N/A";
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  // Alerta Customizado
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

      // Clona para remover listeners antigos
      const okBtn = document.getElementById("custom-alert-ok");
      const newBtn = okBtn.cloneNode(true);
      okBtn.parentNode.replaceChild(newBtn, okBtn);

      newBtn.addEventListener("click", () => {
        alertModal.classList.add("hidden");
        resolve();
      });
    });
  }

  // Confirmação Customizada
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

  // Função de Logout (Movida para o topo para evitar ReferenceError)
  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "login.html";
    } catch (err) {
      console.error("Erro logout", err);
      window.location.href = "login.html";
    }
  }

  // Redirecionamento
  function redirectToLogin() {
    window.location.href = "login.html";
  }

  // Função Global para Lightbox (Tela Cheia)
  window.openLightbox = (src) => {
    const lightbox = document.getElementById("image-lightbox");
    const lightboxImage = document.getElementById("lightbox-image");
    if (lightbox && lightboxImage) {
      lightboxImage.src = src;
      lightbox.classList.remove("hidden");
    }
  };

  // Formata texto com imagens inline
  function formatMessageContent(content) {
    if (!content) return "";
    // Regex para encontrar [imagem: caminho]
    const imageRegex = /\[imagem:([^\]]+)\]/g;

    // Escapa HTML básico para segurança (evita XSS), mas permite nossa tag de imagem
    let safeContent = content
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

    // Substitui a tag pela imagem real
    return safeContent.replace(imageRegex, (match, path) => {
      const cleanPath = path.trim();
      // Adiciona a imagem com evento onclick para o lightbox
      return `<div class="my-2 group">
                <img 
                  src="/${cleanPath}" 
                  class="max-h-48 max-w-full rounded-lg border border-gray-200 dark:border-gray-600 cursor-pointer hover:opacity-90 transition-opacity shadow-sm" 
                  onclick="window.openLightbox(this.src)" 
                  alt="Imagem anexa" 
                  loading="lazy"
                >
              </div>`;
    });
  }

  // =================================================================
  // 1. ELEMENTOS GLOBAIS DA UI (SELEÇÃO)
  // =================================================================
  const userAvatar = document.getElementById("user-avatar");
  const adminSettingsLink = document.getElementById("admin-settings-link");
  const adminPanelLinks = document.getElementById("admin-panel-links");

  // Menu de Usuário
  const userMenuButton = document.getElementById("user-menu-button");
  const userMenuDropdown = document.getElementById("user-menu-dropdown");
  const profileButton = document.getElementById("profile-button");
  const logoutButtons = document.querySelectorAll("#logout-button");

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

  // Busca
  const searchInput = document.getElementById("search-kanban");

  // Dark Mode
  const themeToggleBtn = document.getElementById("theme-toggle");
  const themeToggleDarkIcon = document.getElementById("theme-toggle-dark-icon");
  const themeToggleLightIcon = document.getElementById(
    "theme-toggle-light-icon"
  );

  // Lightbox
  const lightbox = document.getElementById("image-lightbox");
  const lightboxClose = document.getElementById("lightbox-close");

  // Modais (Referências)
  const profileModal = document.getElementById("profile-modal");
  const profileCloseBtn = document.getElementById("profile-close-btn");
  const profileCancelBtn = document.getElementById("profile-cancel-btn");
  const profileForm = document.getElementById("profile-form");

  const triageModal = document.getElementById("triage-modal");
  const triageCloseButton = document.getElementById("triage-close-button");
  const triageList = document.getElementById("triage-list");
  const triageDetails = document.getElementById("triage-details");
  const triageTabPending = document.getElementById("triage-tab-pending");
  const triageTabRejected = document.getElementById("triage-tab-rejected");

  const triageRejectModal = document.getElementById("triage-reject-modal");
  const triageRejectReason = document.getElementById("triage-reject-reason");
  const triageRejectCancel = document.getElementById("triage-reject-cancel");
  const triageRejectConfirm = document.getElementById("triage-reject-confirm");

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

  const createColModal = document.getElementById("create-column-modal");
  const createColCloseBtn = document.getElementById("create-col-close-btn");
  const createColCancelBtn = document.getElementById("create-col-cancel-btn");
  const createColForm = document.getElementById("create-column-form");
  const createColTitle = document.getElementById("create-col-title");
  const createColColor = document.getElementById("create-col-color");
  const createColPos = document.getElementById("create-col-pos");
  const createColInitial = document.getElementById("create-col-initial");
  const createColComplete = document.getElementById("create-col-complete");
  const createColFinal = document.getElementById("create-col-final");

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
  const colEditFinal = document.getElementById("col-edit-final");

  const modal = document.getElementById("pedido-modal");
  const modalCloseButton = document.getElementById("modal-close-button");
  const modalDeleteButton = document.getElementById("modal-delete-button");
  const modalSaveChangesBtn = document.getElementById("modal-save-changes-btn");

  const modalEditTitle = document.getElementById("modal-edit-title");
  const modalEditDescription = document.getElementById(
    "modal-edit-description"
  );
  const modalEditSolicitante = document.getElementById(
    "modal-edit-solicitante"
  );
  const modalEditPriority = document.getElementById("modal-edit-priority");
  const modalEditGroup = document.getElementById("modal-edit-group");

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
  const modalHistoryList = document.getElementById("modal-history-list");

  const modalChatList = document.getElementById("modal-chat-list");
  const modalChatForm = document.getElementById("modal-chat-form");
  const modalChatInput = document.getElementById("modal-chat-input");
  const modalAttachmentsList = document.getElementById(
    "modal-attachments-list"
  );
  const modalUploadForm = document.getElementById("modal-upload-form");
  const modalUploadFile = document.getElementById("modal-upload-file");

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
  let filteredPedidos = [];
  let pendingRequests = [];
  let triageRequests = [];
  let currentTriageTab = "pending";
  let currentUser = null;
  let currentPedidoId = null;
  let currentPedidoData = null;
  let isSidebarCollapsed = false;
  let requestToRejectId = null;
  let chatInterval = null;
  let kanbanInterval = null;

  // =================================================================
  // 2. CONFIGURAÇÃO INICIAL
  // =================================================================

  function initializeUI(user) {
    if (userAvatar) {
      const nameToUse = user.display_name || user.username;
      userAvatar.textContent = nameToUse.charAt(0).toUpperCase();
      userAvatar.title = nameToUse;
    }

    // Anexar evento de logout com segurança
    if (logoutButtons) {
      logoutButtons.forEach((btn) => {
        // Remove listener antigo se houver (clonagem não é necessária aqui se for init unico, mas boa prática)
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        newBtn.addEventListener("click", handleLogout);
      });
    }

    if (user.role === "admin") {
      if (adminPanelLinks) adminPanelLinks.style.display = "block";
      if (adminSettingsLink) adminSettingsLink.style.display = "block";
    }
  }

  function initializeDarkMode() {
    const isDark =
      localStorage.getItem("theme") === "dark" ||
      (!("theme" in localStorage) &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);
    updateThemeUI(isDark);
    if (themeToggleBtn) {
      themeToggleBtn.addEventListener("click", () => {
        const currentDark = document.documentElement.classList.contains("dark");
        updateThemeUI(!currentDark);
      });
    }
  }

  function updateThemeUI(isDark) {
    if (isDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
      if (themeToggleDarkIcon) themeToggleDarkIcon.classList.add("hidden");
      if (themeToggleLightIcon) themeToggleLightIcon.classList.remove("hidden");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
      if (themeToggleDarkIcon) themeToggleDarkIcon.classList.remove("hidden");
      if (themeToggleLightIcon) themeToggleLightIcon.classList.add("hidden");
    }
  }

  function initializeSidebarState() {
    isSidebarCollapsed = localStorage.getItem("sidebarCollapsed") === "true";
    updateSidebarUI();
    if (sidebarToggle) {
      sidebarToggle.addEventListener("click", () => {
        isSidebarCollapsed = !isSidebarCollapsed;
        localStorage.setItem("sidebarCollapsed", isSidebarCollapsed);
        updateSidebarUI();
      });
    }
  }

  function updateSidebarUI() {
    if (!sidebar) return;
    const texts = document.querySelectorAll(".sidebar-text");
    const icon = sidebarToggle.querySelector("svg");
    if (isSidebarCollapsed) {
      sidebar.classList.remove("w-64");
      sidebar.classList.add("w-20");
      texts.forEach((el) => el.classList.add("hidden"));
      icon.innerHTML =
        '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />';
      if (sidebarCreateButton) {
        sidebarCreateButton.classList.add("px-0");
        sidebarCreateButton.classList.remove("px-4");
      }
    } else {
      sidebar.classList.remove("w-20");
      sidebar.classList.add("w-64");
      texts.forEach((el) => el.classList.remove("hidden"));
      icon.innerHTML =
        '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />';
      if (sidebarCreateButton) {
        sidebarCreateButton.classList.remove("px-0");
        sidebarCreateButton.classList.add("px-4");
      }
    }
  }

  // =================================================================
  // 3. LÓGICA DO SISTEMA
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

          // Polling
          kanbanInterval = setInterval(silentBoardRefresh, 15000);

          initializeSidebarCreateButton();
          initializeSidebarNewColumnButton();

          if (currentUser.role === "admin" || currentUser.role === "buyer") {
            await checkInbox();
            setInterval(checkInbox, 30000);
            setupTriageListeners();
            setupRejectModalListeners();
          }

          setupModalEventListeners();
          setupCreateModalListeners();
          setupCreateColumnListeners();
          setupColumnDetailListeners();
          setupProfileListeners();
          setupLightboxListeners();
          setupSearchListener();
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

  async function fetchGroups() {
    const res = await fetch("/api/groups");
    if (!res.ok) return [];
    return await res.json();
  }

  async function loadBoard() {
    const colRes = await fetch("/api/columns");
    if (!colRes.ok) throw new Error("Erro colunas");
    globalColumns = await colRes.json();

    const pedRes = await fetch("/api/pedidos");
    if (!pedRes.ok) throw new Error("Erro pedidos");
    globalPedidos = await pedRes.json();
    filteredPedidos = globalPedidos;

    renderBoardStructure();
    renderSidebarLinks();
    distributePedidos(globalPedidos);
    initializeDragDropListeners();
  }

  async function silentBoardRefresh() {
    if (document.querySelector(".dragging")) return;
    if (searchInput && searchInput.value.trim() !== "") return;

    try {
      const pedRes = await fetch("/api/pedidos");
      if (pedRes.ok) {
        globalPedidos = await pedRes.json();
        filteredPedidos = globalPedidos;
        distributePedidos(globalPedidos);
        initializeDragDropListeners();
      }
    } catch (e) {
      console.error("Erro no auto-refresh:", e);
    }
  }

  // --- FUNCIONALIDADES ESPECÍFICAS ---

  function setupLightboxListeners() {
    if (lightboxClose) {
      lightboxClose.addEventListener("click", () => {
        lightbox.classList.add("hidden");
        if (lightboxImage) lightboxImage.src = "";
      });
    }
    if (lightbox) {
      lightbox.addEventListener("click", (e) => {
        if (e.target === lightbox) {
          lightbox.classList.add("hidden");
          if (lightboxImage) lightboxImage.src = "";
        }
      });
    }
  }

  function setupProfileListeners() {
    if (userMenuButton && userMenuDropdown) {
      userMenuButton.addEventListener("click", (e) => {
        e.stopPropagation();
        userMenuDropdown.classList.toggle("hidden");
      });
      document.addEventListener("click", (e) => {
        if (
          !userMenuButton.contains(e.target) &&
          !userMenuDropdown.contains(e.target)
        ) {
          userMenuDropdown.classList.add("hidden");
        }
      });
    }
    if (profileButton) {
      profileButton.addEventListener("click", () => {
        userMenuDropdown.classList.add("hidden");
        openProfileModal();
      });
    }
    const closeProfile = () => profileModal.classList.add("hidden");
    if (profileCloseBtn)
      profileCloseBtn.addEventListener("click", closeProfile);
    if (profileCancelBtn)
      profileCancelBtn.addEventListener("click", closeProfile);
    if (profileForm)
      profileForm.addEventListener("submit", handleProfileUpdate);
  }

  async function openProfileModal() {
    try {
      const res = await fetch("/api/users/profile");
      if (res.ok) {
        const data = await res.json();
        document.getElementById("profile-display-name").value =
          data.display_name || "";
        document.getElementById("profile-email").value = data.email || "";
        document.getElementById("profile-phone").value = data.phone || "";
        document.getElementById("profile-gender").value = data.gender || "";
        document.getElementById("profile-password").value = "";
      }
    } catch (e) {
      console.error(e);
    }
    profileModal.classList.remove("hidden");
  }

  async function handleProfileUpdate(e) {
    e.preventDefault();
    const formData = {
      display_name: document.getElementById("profile-display-name").value,
      email: document.getElementById("profile-email").value,
      phone: document.getElementById("profile-phone").value,
      gender: document.getElementById("profile-gender").value,
      password: document.getElementById("profile-password").value,
    };
    try {
      const res = await fetch("/api/users/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        showCustomAlert("Perfil atualizado!", "Sucesso");
        profileModal.classList.add("hidden");
        if (formData.display_name) {
          userAvatar.textContent = formData.display_name
            .charAt(0)
            .toUpperCase();
          userAvatar.title = formData.display_name;
        }
        currentUser.display_name = formData.display_name;
      } else {
        showCustomAlert("Erro ao atualizar perfil.");
      }
    } catch (err) {
      showCustomAlert("Erro de conexão.");
    }
  }

  function setupSearchListener() {
    if (!searchInput) return;
    searchInput.addEventListener("input", (e) => {
      const term = e.target.value.toLowerCase().trim();
      if (!term) {
        filteredPedidos = globalPedidos;
      } else {
        filteredPedidos = globalPedidos.filter(
          (p) =>
            p.title.toLowerCase().includes(term) ||
            String(p.id).includes(term) ||
            (p.solicitante_display &&
              p.solicitante_display.toLowerCase().includes(term))
        );
      }
      distributePedidos(filteredPedidos);
    });
  }

  function renderBoardStructure() {
    if (!kanbanContainer) return;
    kanbanContainer.innerHTML = globalColumns
      .map(
        (col) => `
      <div class="flex w-80 flex-shrink-0 flex-col rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 transition-all duration-300 kanban-column" id="col-container-${col.id}" data-col-id="${col.id}" data-allows-completion="${col.allows_completion}" data-is-final="${col.is_final_destination}">
        <div class="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
          <h3 class="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2"><span class="w-3 h-3 rounded-full bg-${col.color}-500"></span>${col.title}</h3>
          <span class="text-xs text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-900 px-2 py-0.5 rounded-full" id="count-${col.id}">0</span>
        </div>
        <div class="flex-1 overflow-y-auto p-3 min-h-[100px] space-y-3" id="kanban-col-${col.id}"></div>
      </div>`
      )
      .join("");
  }

  function renderSidebarLinks() {
    if (!sidebarLists) return;
    sidebarLists.innerHTML = globalColumns
      .map(
        (col) => `
      <li><div class="flex items-center group">
        <button onclick="toggleColumnVisibility(${col.id})" class="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors">
          <svg id="icon-eye-${col.id}" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>
        </button>
        <button onclick="openColumnDetail(${col.id})" class="flex-1 text-left p-2 text-sm text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-r-md transition-colors flex items-center sidebar-text">
          <span class="mr-2 h-2 w-2 rounded-full bg-${col.color}-500"></span>${col.title}
        </button>
      </div></li>`
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

  function distributePedidos(pedidosToRender) {
    globalColumns.forEach((col) => {
      const container = document.getElementById(`kanban-col-${col.id}`);
      const badge = document.getElementById(`count-${col.id}`);
      if (container) container.innerHTML = "";
      if (badge) badge.textContent = "0";
    });

    pedidosToRender.forEach((pedido) => {
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
    card.classList.add("kanban-card");

    const priorityMap = {
      alta: { label: "🔴 Alta" },
      media: { label: "🟡 Média" },
      baixa: { label: "🔵 Baixa" },
    };
    const priorityInfo = priorityMap[pedido.priority] || priorityMap["baixa"];
    const colColor = pedido.column_color || "gray";

    card.className = `kanban-card bg-white dark:bg-gray-700 p-3 rounded-lg shadow-sm border-l-4 border-${colColor}-500 hover:shadow-md cursor-pointer transition-all group`;
    card.innerHTML = `
      <div class="flex justify-between items-start mb-1"><p class="font-semibold text-gray-800 dark:text-gray-100 text-sm line-clamp-2">${
        pedido.title
      }</p><span class="text-[10px] whitespace-nowrap ml-1 opacity-75">${
      priorityInfo.label
    }</span></div>
      <div class="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400 mb-1"><span>${
        pedido.solicitante_display || "N/A"
      }</span>${
      pedido.purchase_link
        ? '<span class="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 px-1.5 rounded text-[10px]">Pago</span>'
        : ""
    }</div>
      <p class="text-[10px] text-gray-400 dark:text-gray-500 text-right border-t border-gray-100 dark:border-gray-600 pt-1 mt-1">${formatTimestamp(
        pedido.task_created_at
      )}</p>`;

    card.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text/plain", card.id);
      card.classList.add("opacity-50", "dragging");
    });
    card.addEventListener("dragend", () =>
      card.classList.remove("opacity-50", "dragging")
    );
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
          const oldColId = card.parentElement.id.replace("kanban-col-", "");
          const newColId = col.dataset.colId;
          if (oldColId) {
            const oldBadge = document.getElementById(`count-${oldColId}`);
            if (oldBadge)
              oldBadge.textContent = Math.max(
                0,
                parseInt(oldBadge.textContent) - 1
              );
          }
          targetBody.appendChild(card);
          const newBadge = document.getElementById(`count-${newColId}`);
          if (newBadge)
            newBadge.textContent = parseInt(newBadge.textContent) + 1;

          const allowsCompletion = col.dataset.allowsCompletion === "1";
          await fetch(`/api/pedidos/${id}/move`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ newColumnId: newColId }),
          });
          const targetColColor = globalColumns.find(
            (c) => c.id == newColId
          )?.color;
          if (targetColColor)
            card.className = card.className.replace(
              /border-\w+-500/g,
              `border-${targetColColor}-500`
            );
          if (allowsCompletion) openPedidoModal(id, "tab-finalize");
        }
      };
    });
  }

  // --- MODAIS E AÇÕES ---
  function initializeSidebarCreateButton() {
    if (sidebarCreateButton) sidebarCreateButton.onclick = openCreateModal;
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

  function initializeSidebarNewColumnButton() {
    if (sidebarNewColumnButton)
      sidebarNewColumnButton.onclick = openCreateColumnModal;
  }
  function setupCreateColumnListeners() {
    if (!createColModal) return;
    createColCloseBtn.onclick = () => createColModal.classList.add("hidden");
    createColCancelBtn.onclick = () => createColModal.classList.add("hidden");
    if (createColForm)
      createColForm.onsubmit = async (e) => {
        e.preventDefault();
        const data = {
          title: createColTitle.value,
          color: createColColor.value,
          position: createColPos.value,
          is_initial: createColInitial.checked,
          allows_completion: createColComplete.checked,
          is_final_destination: createColFinal.checked,
        };
        try {
          const res = await fetch("/api/columns", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          });
          if (res.ok) {
            createColModal.classList.add("hidden");
            await loadBoard();
            showCustomAlert("Fila criada!");
          } else showCustomAlert("Erro ao criar fila.");
        } catch (err) {
          showCustomAlert(err.message);
        }
      };
  }
  function openCreateColumnModal() {
    if (createColForm) createColForm.reset();
    createColModal.classList.remove("hidden");
  }

  function setupColumnDetailListeners() {
    if (!colDetailModal) return;
    colModalCloseBtn.onclick = () => colDetailModal.classList.add("hidden");
    colEditForm.onsubmit = async (e) => {
      e.preventDefault();
      const data = {
        title: colEditTitle.value,
        color: colEditColor.value,
        position: colEditPosition.value,
        is_initial: colEditInitial.checked,
        allows_completion: colEditComplete.checked,
        is_final_destination: colEditFinal.checked,
      };
      const res = await fetch(`/api/columns/${colEditId.value}`, {
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
      if (!(await showCustomConfirm("Excluir esta fila?"))) return;
      const res = await fetch(`/api/columns/${colEditId.value}`, {
        method: "DELETE",
      });
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
      colEditFinal.checked = col.is_final_destination === 1;
    }
    colPedidosList.innerHTML = "Carregando...";
    const pedidosDaFila = globalPedidos.filter((p) => p.column_id === colId);
    if (pedidosDaFila.length === 0)
      colPedidosList.innerHTML =
        '<p class="text-sm text-gray-500 dark:text-gray-400">Nenhum pedido nesta fila.</p>';
    else
      colPedidosList.innerHTML = pedidosDaFila
        .map(
          (p) => `
        <div class="bg-gray-50 dark:bg-gray-700 p-3 rounded border-l-4 border-${
          col.color
        }-500 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 mb-2" onclick="openPedidoModal(${
            p.id
          })">
            <div class="flex justify-between"><span class="font-semibold text-gray-900 dark:text-gray-100">${
              p.title
            }</span><span class="text-xs text-gray-500 dark:text-gray-400">${formatTimestamp(
            p.task_created_at
          )}</span></div>
            ${
              p.last_note
                ? `<p class="text-xs text-gray-600 dark:text-gray-300 mt-1 italic">" ${p.last_note} "</p>`
                : ""
            }
        </div>`
        )
        .join("");
  };

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
      const tabId = e.target.getAttribute("data-tab");
      document.getElementById(tabId).classList.remove("hidden");
      if (tabId === "tab-chat") {
        loadChatTab();
        if (chatInterval) clearInterval(chatInterval);
        chatInterval = setInterval(loadChatTab, 3000);
      } else {
        if (chatInterval) clearInterval(chatInterval);
      }
      if (tabId === "tab-history") loadOrderHistory(currentPedidoId);
    };

    if (modalChatInput)
      modalChatInput.addEventListener("paste", (e) =>
        handlePasteAttachment(e, currentPedidoId, "chat")
      );
    if (modalNewNoteInput)
      modalNewNoteInput.addEventListener("paste", (e) =>
        handlePasteAttachment(e, currentPedidoId, "note")
      );

    modalAddNoteForm.onsubmit = handleAddNote;
    modalAddResearchForm.onsubmit = handleAddResearch;
    modalChatForm.onsubmit = handleChatSubmit;
    if (modalUploadForm) modalUploadForm.onsubmit = handleUploadSubmit;
    modalFinalizeForm.onsubmit = handleFinalizeSave;
    if (modalDeliverButton) modalDeliverButton.onclick = handleDeliver;
  }

  // --- PASTE TO UPLOAD (COM INSERÇÃO DE TAG) ---
  async function handlePasteAttachment(e, pedidoId, type) {
    const items = (e.clipboardData || e.originalEvent.clipboardData).items;
    let blob = null;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") === 0) {
        blob = items[i].getAsFile();
        break;
      }
    }
    if (blob) {
      e.preventDefault();
      if (!pedidoId) {
        showCustomAlert("Salve o pedido antes de colar imagens.");
        return;
      }

      const formData = new FormData();
      formData.append("file", blob);
      const originalPlaceholder = e.target.placeholder;
      e.target.placeholder = "Enviando imagem...";
      e.target.disabled = true;

      try {
        const uploadRes = await fetch(`/api/pedidos/${pedidoId}/upload`, {
          method: "POST",
          body: formData,
        });
        if (uploadRes.ok) {
          const fileData = await uploadRes.json();
          // INSERE A TAG NA POSIÇÃO DO CURSOR
          const imageTag = `[imagem:${fileData.file_path}]`;
          const cursorPos = e.target.selectionStart;
          const textBefore = e.target.value.substring(0, cursorPos);
          const textAfter = e.target.value.substring(cursorPos);
          e.target.value = textBefore + imageTag + textAfter;
        } else {
          showCustomAlert("Erro ao enviar imagem.");
        }
      } catch (err) {
        console.error(err);
        showCustomAlert("Erro ao processar imagem colada.");
      } finally {
        e.target.disabled = false;
        e.target.placeholder = originalPlaceholder;
        e.target.focus();
      }
    }
  }

  async function openPedidoModal(pedidoId, forceTab = null) {
    currentPedidoId = pedidoId;
    modal.classList.remove("hidden");
    if (!forceTab) {
      const defaultTab = document.querySelector('button[data-tab="tab-notes"]');
      if (defaultTab) defaultTab.click();
    }
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
      } else showCustomAlert("Erro ao salvar.");
    } catch (e) {
      showCustomAlert(e.message);
    }
  }

  function closePedidoModal() {
    modal.classList.add("hidden");
    currentPedidoId = null;
    if (chatInterval) clearInterval(chatInterval);
  }

  function renderModalNotes(notes) {
    modalNotesList.innerHTML = notes.length
      ? ""
      : '<li class="text-center text-gray-500">Sem notas.</li>';
    notes.forEach((n) => {
      const li = document.createElement("li");
      li.className = "p-3 bg-gray-50 dark:bg-gray-700 rounded-md mb-2";
      li.innerHTML = `<div class="text-gray-900 dark:text-gray-100 text-sm">${formatMessageContent(
        n.content
      )}</div><p class="text-xs text-gray-500 dark:text-gray-400 mt-1">${
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

  async function loadChatTab() {
    if (!modalChatList) return;
    if (modalChatList.children.length === 0)
      modalChatList.innerHTML =
        '<p class="text-center text-gray-500 text-sm py-4">Carregando mensagens...</p>';
    try {
      const res = await fetch(`/api/pedidos/${currentPedidoId}/comments`);
      if (!res.ok) throw new Error("Erro chat");
      const comments = await res.json();
      renderChatMessages(comments);
    } catch (e) {
      modalChatList.innerHTML =
        '<p class="text-center text-red-500 text-sm">Erro ao carregar chat.</p>';
    }
  }

  // Oculta lista de anexos separada se estiver vazia, já que usamos inline
  function handleUploadSubmit(e) {
    e.preventDefault();
    const formData = new FormData();
    formData.append("file", modalUploadFile.files[0]);
    try {
      fetch(`/api/pedidos/${currentPedidoId}/upload`, {
        method: "POST",
        body: formData,
      }).then((res) => {
        if (res.ok) {
          modalUploadFile.value = "";
          loadChatTab();
        } else alert("Erro upload");
      });
    } catch (e) {
      alert("Erro upload");
    }
  }

  function renderChatMessages(comments) {
    if (comments.length === 0) {
      modalChatList.innerHTML =
        '<p class="text-center text-gray-400 text-xs italic py-10">Nenhuma mensagem.</p>';
      return;
    }
    const isAtBottom =
      modalChatList.scrollHeight - modalChatList.scrollTop <=
      modalChatList.clientHeight + 50;

    modalChatList.innerHTML = comments
      .map((c) => {
        const isMe = c.username === currentUser.username;
        return `
            <div class="flex flex-col ${
              isMe ? "items-end" : "items-start"
            } mb-3">
                <div class="max-w-[85%] rounded-lg p-3 text-sm ${
                  isMe
                    ? "bg-indigo-600 text-white rounded-br-none shadow-md"
                    : "bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-none shadow-sm border border-gray-200 dark:border-gray-600"
                }">
                    ${formatMessageContent(c.content)}
                </div>
                <span class="text-[10px] text-gray-400 mt-1 px-1">
                    ${isMe ? "Você" : c.username} - ${new Date(
          c.created_at
        ).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
            </div>
        `;
      })
      .join("");

    if (isAtBottom) modalChatList.scrollTop = modalChatList.scrollHeight;
  }

  async function handleChatSubmit(e) {
    e.preventDefault();
    const content = modalChatInput.value.trim();
    if (!content) return;
    try {
      const res = await fetch(`/api/pedidos/${currentPedidoId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (res.ok) {
        modalChatInput.value = "";
        modalChatInput.focus();
        loadChatTab();
      }
    } catch (e) {
      alert("Erro ao enviar mensagem.");
    }
  }

  async function loadOrderHistory(id) {
    if (!modalHistoryList) return;
    modalHistoryList.innerHTML =
      '<li class="text-center text-gray-500 text-sm py-2">Carregando histórico...</li>';
    try {
      const res = await fetch(`/api/pedidos/${id}/history`);
      if (!res.ok) throw new Error("Erro ao buscar histórico");
      const logs = await res.json();
      renderOrderHistory(logs);
    } catch (e) {
      console.error(e);
      modalHistoryList.innerHTML =
        '<li class="text-center text-red-500 text-sm py-2">Erro ao carregar histórico.</li>';
    }
  }

  function renderOrderHistory(logs) {
    if (!modalHistoryList) return;
    if (logs.length === 0) {
      modalHistoryList.innerHTML =
        '<li class="text-center text-gray-500 text-sm py-2">Nenhum registro encontrado.</li>';
      return;
    }
    modalHistoryList.innerHTML = logs
      .map(
        (log) => `
        <li class="relative pl-4 pb-4 border-l border-gray-200 dark:border-gray-700 last:pb-0 last:border-0">
            <div class="absolute -left-1.5 top-1.5 h-3 w-3 rounded-full bg-gray-200 dark:bg-gray-600 border border-white dark:border-gray-800"></div>
            <div class="text-sm text-gray-600 dark:text-gray-300">
                <span class="font-semibold text-gray-900 dark:text-white">${
                  log.username || "Sistema"
                }</span>
                ${log.action}
            </div>
            <div class="text-xs text-gray-400 dark:text-gray-500 mt-0.5">${new Date(
              log.timestamp
            ).toLocaleString()}</div>
        </li>
    `
      )
      .join("");
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
    if (!(await showCustomConfirm("Tem certeza? O pedido será arquivado.")))
      return;
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
    if (!(await showCustomConfirm("Excluir pedido?"))) return;
    await fetch(`/api/pedidos/${currentPedidoId}`, { method: "DELETE" });
    closePedidoModal();
    await loadBoard();
  }

  async function checkInbox() {
    try {
      const res = await fetch("/api/requests/pending");
      if (res.ok) {
        const newRequests = await res.json();
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
      console.error(e);
    }
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

  function setupRejectModalListeners() {
    if (triageRejectCancel) {
      triageRejectCancel.onclick = () => {
        triageRejectModal.classList.add("hidden");
        requestToRejectId = null;
      };
    }
    if (triageRejectConfirm) {
      triageRejectConfirm.onclick = confirmRejectRequest;
    }
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
            <div class="flex justify-between items-start mb-1"><span class="font-semibold text-gray-900 dark:text-gray-100 text-sm line-clamp-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">${
              req.title
            }</span><span class="text-xs text-gray-400 whitespace-nowrap ml-2">${new Date(
          req.created_at
        ).toLocaleDateString("pt-BR")}</span></div>
            <p class="text-xs text-gray-500 dark:text-gray-400">${
              req.requester_name
            } (${req.group_name || "N/A"})</p>
        </div>`
      )
      .join("");
  }

  window.selectTriageRequest = (id) => {
    const req = triageRequests.find((r) => r.id === id);
    if (!req) return;
    const isRejected = currentTriageTab === "rejected";
    triageDetails.innerHTML = `
        <div class="space-y-6 animate-[fadeIn_0.2s_ease-out]">
            <div><h3 class="text-2xl font-bold text-gray-900 dark:text-white">${
              req.title
            }</h3><div class="flex flex-wrap items-center gap-2 mt-1 text-sm text-gray-500 dark:text-gray-400"><span class="bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-xs">ID: ${
      req.id
    }</span><span>Solicitante: <strong>${
      req.requester_name
    }</strong></span><span>&bull;</span><span>Grupo: <strong>${
      req.group_name || "N/A"
    }</strong></span></div></div>
            <div class="bg-gray-50 dark:bg-gray-900 p-4 rounded-md border border-gray-200 dark:border-gray-700"><h4 class="text-xs font-bold text-gray-500 uppercase mb-1">Descrição</h4><p class="text-gray-800 dark:text-gray-200 text-sm whitespace-pre-wrap leading-relaxed">${
              req.description || "Sem descrição."
            }</p></div>
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
                    ? `<div><label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Definir Prioridade</label><select id="triage-priority" class="w-full md:w-1/3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md p-2 text-gray-900 dark:text-white"><option value="baixa">Baixa</option><option value="media">Média</option><option value="alta">Alta</option></select></div><div class="flex gap-3"><button onclick="openRejectModal(${req.id})" class="px-4 py-2 border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md text-sm font-semibold">Rejeitar</button><button onclick="handleApproveRequest(${req.id})" class="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-bold shadow-sm flex-1 md:flex-none">Aprovar e Criar Pedido</button></div>`
                    : `<div class="flex justify-end"><button onclick="handleReopenRequest(${req.id})" class="px-6 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md text-sm font-bold">Reabrir Solicitação</button></div>`
                }
            </div>
        </div>`;
  };

  window.handleApproveRequest = async (id) => {
    const priority = document.getElementById("triage-priority").value;
    if (!(await showCustomConfirm("Aprovar e enviar para o Kanban?"))) return;
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

  async function confirmRejectRequest() {
    if (!requestToRejectId) return;
    const reason = triageRejectReason.value.trim();
    if (!reason) {
      showCustomAlert("Informe o motivo.");
      return;
    }
    triageRejectConfirm.disabled = true;
    try {
      const res = await fetch(`/api/requests/${requestToRejectId}/reject`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (res.ok) {
        showCustomAlert("Rejeitado.");
        triageRejectModal.classList.add("hidden");
        requestToRejectId = null;
        await checkInbox();
        switchTriageTab("pending");
      } else showCustomAlert("Erro ao rejeitar.");
    } catch (e) {
      showCustomAlert(e.message);
    } finally {
      triageRejectConfirm.disabled = false;
    }
  }

  window.openRejectModal = (id) => {
    requestToRejectId = id;
    triageRejectReason.value = "";
    triageRejectModal.classList.remove("hidden");
  };
  window.handleReopenRequest = async (id) => {
    if (!(await showCustomConfirm("Reabrir solicitação?"))) return;
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

  // Execução Inicial
  checkAuthentication();
});

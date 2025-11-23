document.addEventListener("DOMContentLoaded", () => {
  // =================================================================
  // 1. ELEMENTOS DA UI
  // =================================================================
  const userAvatar = document.getElementById("user-avatar");
  const logoutButtons = document.querySelectorAll("#logout-button");

  const requestsGrid = document.getElementById("requests-grid");
  const emptyState = document.getElementById("empty-state");

  // Elementos do Menu de Usuário (Dropdown)
  const userMenuButton = document.getElementById("user-menu-button");
  const userMenuDropdown = document.getElementById("user-menu-dropdown");
  const profileButton = document.getElementById("profile-button");

  // Modal Perfil
  const profileModal = document.getElementById("profile-modal");
  const profileCloseBtn = document.getElementById("profile-close-btn");
  const profileCancelBtn = document.getElementById("profile-cancel-btn");
  const profileForm = document.getElementById("profile-form");

  // Modal Nova Solicitação
  const newRequestModal = document.getElementById("new-request-modal");
  const newRequestForm = document.getElementById("new-request-form");

  // Modal Detalhes
  const detailModal = document.getElementById("request-detail-modal");
  const closeDetailModalBtn = document.getElementById("close-detail-modal");
  const detailTabs = document.querySelectorAll(".portal-tab-btn");
  const detailTabContents = document.querySelectorAll(".tab-content");

  // Elementos da Aba Informações
  const viewTitle = document.getElementById("view-title");
  const viewStatus = document.getElementById("view-status");
  const viewDate = document.getElementById("view-date");
  const viewDesc = document.getElementById("view-desc");
  const viewLinkContainer = document.getElementById("view-link-container");
  const viewLink = document.getElementById("view-link");
  const viewRejectionContainer = document.getElementById(
    "view-rejection-container"
  );
  const viewRejection = document.getElementById("view-rejection");

  // Elementos da Aba Histórico
  const historyList = document.getElementById("history-list");

  // Elementos da Aba Chat
  const chatList = document.getElementById("chat-list");
  const chatForm = document.getElementById("chat-form");
  const chatInput = document.getElementById("chat-input");
  const chatSubmit = document.getElementById("chat-submit");
  const chatDisabledMsg = document.getElementById("chat-disabled-msg");

  // Anexos do Chat
  const modalAttachmentsList = document.getElementById(
    "modal-attachments-list"
  );
  const modalUploadForm = document.getElementById("modal-upload-form");
  const modalUploadFile = document.getElementById("modal-upload-file");

  // Toast
  const toast = document.getElementById("toast-success");
  const toastMsg = document.getElementById("toast-message");

  // Dark Mode
  const themeToggleBtn = document.getElementById("theme-toggle");
  const themeToggleDarkIcon = document.getElementById("theme-toggle-dark-icon");
  const themeToggleLightIcon = document.getElementById(
    "theme-toggle-light-icon"
  );

  // Estado Global Local
  let currentDetailId = null; // ID da SOLICITAÇÃO (request_id)
  let currentPedidoId = null; // ID do PEDIDO vinculado (para buscar histórico/chat)
  let currentUser = null;

  // Polling para chat
  let chatInterval = null;

  // =================================================================
  // 2. INICIALIZAÇÃO
  // =================================================================
  checkAuthentication();
  initializeDarkMode();
  setupEventListeners();
  setupProfileListeners();

  function setupEventListeners() {
    // Logout
    logoutButtons.forEach((btn) => {
      btn.addEventListener("click", async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        window.location.href = "login.html";
      });
    });

    // Fechar Modal Detalhes
    if (closeDetailModalBtn) {
      closeDetailModalBtn.addEventListener("click", () => {
        detailModal.classList.add("hidden");
        currentDetailId = null;
        currentPedidoId = null;
        if (chatInterval) clearInterval(chatInterval);
      });
    }

    // Navegação por Abas no Modal Detalhes
    detailTabs.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        // Remove ativo de todos
        detailTabs.forEach((t) => {
          t.classList.remove(
            "text-indigo-600",
            "border-indigo-600",
            "dark:text-indigo-400",
            "dark:border-indigo-400"
          );
          t.classList.add(
            "text-gray-500",
            "border-transparent",
            "hover:text-gray-700",
            "dark:text-gray-400",
            "dark:hover:text-gray-200"
          );
        });
        detailTabContents.forEach((c) => c.classList.add("hidden"));

        // Ativa o clicado
        e.target.classList.add(
          "text-indigo-600",
          "border-indigo-600",
          "dark:text-indigo-400",
          "dark:border-indigo-400"
        );
        e.target.classList.remove(
          "text-gray-500",
          "border-transparent",
          "hover:text-gray-700"
        );

        const tabId = e.target.getAttribute("data-tab");
        document.getElementById(tabId).classList.remove("hidden");

        // Carrega dados específicos da aba se necessário
        if (tabId === "detail-history") loadHistoryTab();

        if (tabId === "detail-chat") {
          loadChatTab();
          if (chatInterval) clearInterval(chatInterval);
          chatInterval = setInterval(loadChatTab, 3000);
        } else {
          if (chatInterval) clearInterval(chatInterval);
        }
      });
    });

    // Envio de Chat
    if (chatForm) {
      chatForm.addEventListener("submit", handleChatSubmit);
    }

    // Paste-to-Upload no Chat (NOVO)
    if (chatInput) {
      chatInput.addEventListener("paste", (e) => handlePasteAttachment(e));
    }

    // Upload de Arquivo via Form
    if (modalUploadForm) {
      modalUploadForm.addEventListener("submit", handleUploadSubmit);
    }

    // Envio de Nova Solicitação
    if (newRequestForm) {
      newRequestForm.addEventListener("submit", handleNewRequestSubmit);
    }
  }

  // =================================================================
  // 3. GESTÃO DE PERFIL
  // =================================================================
  function setupProfileListeners() {
    // Toggle Dropdown
    if (userMenuButton && userMenuDropdown) {
      userMenuButton.addEventListener("click", (e) => {
        e.stopPropagation();
        userMenuDropdown.classList.toggle("hidden");
      });

      // Fechar ao clicar fora
      document.addEventListener("click", (e) => {
        if (
          !userMenuButton.contains(e.target) &&
          !userMenuDropdown.contains(e.target)
        ) {
          userMenuDropdown.classList.add("hidden");
        }
      });
    }

    // Abrir Modal de Perfil
    if (profileButton) {
      profileButton.addEventListener("click", () => {
        userMenuDropdown.classList.add("hidden");
        openProfileModal();
      });
    }

    // Fechar Modal de Perfil
    const closeProfile = () => profileModal.classList.add("hidden");
    if (profileCloseBtn)
      profileCloseBtn.addEventListener("click", closeProfile);
    if (profileCancelBtn)
      profileCancelBtn.addEventListener("click", closeProfile);

    // Salvar Perfil
    if (profileForm) {
      profileForm.addEventListener("submit", handleProfileUpdate);
    }
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
      console.error("Erro ao buscar perfil:", e);
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

      const result = await res.json();

      if (res.ok) {
        showToast("Perfil atualizado com sucesso!");
        profileModal.classList.add("hidden");

        // Atualiza UI localmente
        if (formData.display_name) {
          userAvatar.textContent = formData.display_name
            .charAt(0)
            .toUpperCase();
          userAvatar.title = formData.display_name;
        }
        currentUser.display_name = formData.display_name;
        currentUser.email = formData.email;
      } else {
        alert(result.message || "Erro ao atualizar perfil.");
      }
    } catch (err) {
      alert("Erro de conexão.");
    }
  }

  // =================================================================
  // 4. AUTENTICAÇÃO & UI BÁSICA
  // =================================================================
  async function checkAuthentication() {
    try {
      const res = await fetch("/api/auth/check");
      if (!res.ok) throw new Error("Auth fail");
      const data = await res.json();

      if (data.loggedIn) {
        currentUser = data.user;
        const nameToUse = currentUser.display_name || currentUser.username;
        userAvatar.textContent = nameToUse.charAt(0).toUpperCase();
        userAvatar.title = nameToUse;
        loadRequests();
      } else {
        window.location.href = "login.html";
      }
    } catch (e) {
      window.location.href = "login.html";
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
  // 5. LISTAGEM DE SOLICITAÇÕES (DASHBOARD)
  // =================================================================
  async function loadRequests() {
    try {
      const res = await fetch("/api/requests/my");
      if (!res.ok) throw new Error("Erro API");
      const requests = await res.json();
      renderRequests(requests);
    } catch (error) {
      console.error(error);
      requestsGrid.innerHTML =
        '<div class="col-span-full text-center text-red-500 py-10">Não foi possível carregar seus pedidos.</div>';
    }
  }

  function renderRequests(requests) {
    if (requests.length === 0) {
      requestsGrid.classList.add("hidden");
      emptyState.classList.remove("hidden");
      return;
    }

    requestsGrid.classList.remove("hidden");
    emptyState.classList.add("hidden");
    requestsGrid.innerHTML = "";

    requests.forEach((req) => {
      let statusConfig;

      if (req.status === "pending_buyer_review") {
        statusConfig = {
          label: "Em Análise",
          classes:
            "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 ring-yellow-600/20",
          icon: "🟡",
        };
      } else if (req.status === "buyer_rejected") {
        statusConfig = {
          label: "Recusado",
          classes:
            "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400 ring-red-600/20",
          icon: "🔴",
        };
      } else if (req.status === "approved") {
        if (req.kanban_status) {
          statusConfig = {
            label: req.kanban_status,
            classes: `bg-${req.kanban_color}-50 text-${req.kanban_color}-700 dark:bg-${req.kanban_color}-900/30 dark:text-${req.kanban_color}-400 ring-${req.kanban_color}-600/20`,
            icon: "🔵",
          };
        } else {
          statusConfig = {
            label: "Em Processo",
            classes:
              "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 ring-blue-600/20",
            icon: "🔵",
          };
        }
      } else {
        statusConfig = {
          label: "Desconhecido",
          classes: "bg-gray-100 text-gray-800",
          icon: "⚪",
        };
      }

      const date = new Date(req.created_at).toLocaleDateString("pt-BR");

      const card = document.createElement("div");
      card.className =
        "bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-all duration-200 flex flex-col h-full cursor-pointer group";
      card.onclick = () => openRequestDetails(req);

      card.innerHTML = `
            <div class="flex justify-between items-start mb-3">
                <span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  statusConfig.classes
                } ring-1 ring-inset">
                    <span class="mr-1.5">${statusConfig.icon}</span>
                    ${statusConfig.label}
                </span>
                <span class="text-xs text-gray-400 dark:text-gray-500">${date}</span>
            </div>
            
            <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-2 line-clamp-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">${
              req.title
            }</h3>
            
            <div class="flex-1">
                <p class="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 mb-3">${
                  req.description || "Sem descrição."
                }</p>
            </div>

            ${
              req.status === "buyer_rejected"
                ? `
                <div class="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 bg-red-50 dark:bg-red-900/10 -mx-5 -mb-5 p-4 rounded-b-xl">
                    <p class="text-xs text-red-600 dark:text-red-400 font-bold uppercase mb-1">Motivo da Recusa</p>
                    <p class="text-xs text-red-800 dark:text-red-200 truncate">${
                      req.approval_notes || "Não informado."
                    }</p>
                </div>
            `
                : ""
            }
        `;
      requestsGrid.appendChild(card);
    });
  }

  // =================================================================
  // 6. MODAL DE DETALHES DA SOLICITAÇÃO
  // =================================================================

  function openRequestDetails(req) {
    currentDetailId = req.id;
    currentPedidoId = req.pedido_id;

    if (detailTabs[0]) detailTabs[0].click();

    viewTitle.textContent = req.title;
    viewDate.textContent = new Date(req.created_at).toLocaleString();
    viewDesc.textContent = req.description || "Nenhuma descrição fornecida.";

    let statusText = "Em Análise";
    let statusClass = "bg-yellow-100 text-yellow-800";

    if (req.status === "approved") {
      statusText = req.kanban_status || "Em Processo";
      const color = req.kanban_color || "blue";
      statusClass = `bg-${color}-100 text-${color}-800 dark:bg-${color}-900 dark:text-${color}-200`;
    } else if (req.status === "buyer_rejected") {
      statusText = "Recusado";
      statusClass = "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
    }

    viewStatus.textContent = statusText;
    viewStatus.className = `inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusClass}`;

    if (req.reference_links) {
      viewLinkContainer.classList.remove("hidden");
      viewLink.href = req.reference_links;
      viewLink.textContent = req.reference_links;
    } else {
      viewLinkContainer.classList.add("hidden");
    }

    if (req.status === "buyer_rejected" && req.approval_notes) {
      viewRejectionContainer.classList.remove("hidden");
      viewRejection.textContent = req.approval_notes;
    } else {
      viewRejectionContainer.classList.add("hidden");
    }

    detailModal.classList.remove("hidden");
  }

  // --- LÓGICA DA ABA HISTÓRICO ---
  async function loadHistoryTab() {
    historyList.innerHTML =
      '<li class="text-center text-gray-500 text-sm py-4">Carregando histórico...</li>';

    if (!currentPedidoId) {
      historyList.innerHTML =
        '<li class="text-center text-gray-500 text-sm py-4">Histórico detalhado disponível apenas após aprovação.</li>';
      return;
    }

    try {
      const res = await fetch(`/api/pedidos/${currentPedidoId}/history`);
      if (!res.ok) throw new Error("Falha ao buscar histórico");
      const logs = await res.json();

      if (logs.length === 0) {
        historyList.innerHTML =
          '<li class="text-center text-gray-500 text-sm py-4">Nenhum registro encontrado.</li>';
        return;
      }

      historyList.innerHTML = logs
        .map(
          (log) => `
            <li class="mb-4 ml-4">
                <div class="absolute w-3 h-3 bg-gray-200 rounded-full mt-1.5 -left-1.5 border border-white dark:border-gray-900 dark:bg-gray-700"></div>
                <time class="mb-1 text-xs font-normal leading-none text-gray-400 dark:text-gray-500">${new Date(
                  log.timestamp
                ).toLocaleString()}</time>
                <h3 class="text-sm font-semibold text-gray-900 dark:text-white">${
                  log.username || "Sistema"
                }</h3>
                <p class="mb-4 text-sm font-normal text-gray-500 dark:text-gray-400">${
                  log.action
                }</p>
            </li>
        `
        )
        .join("");
    } catch (e) {
      console.error(e);
      historyList.innerHTML =
        '<li class="text-center text-red-500 text-sm py-4">Erro ao carregar histórico.</li>';
    }
  }

  // --- LÓGICA DA ABA CHAT ---
  async function loadChatTab() {
    if (!currentPedidoId) {
      chatList.innerHTML = "";
      chatInput.disabled = true;
      chatSubmit.disabled = true;
      chatDisabledMsg.classList.remove("hidden");
      return;
    }

    chatInput.disabled = false;
    chatSubmit.disabled = false;
    chatDisabledMsg.classList.add("hidden");

    try {
      const attachRes = await fetch(
        `/api/pedidos/${currentPedidoId}/attachments`
      );
      const attachments = await attachRes.json();
      renderAttachments(attachments);
    } catch (e) {
      console.error(e);
    }

    if (chatList.children.length === 0) {
      chatList.innerHTML =
        '<p class="text-center text-gray-500 text-sm py-4">Carregando mensagens...</p>';
    }

    try {
      const res = await fetch(`/api/pedidos/${currentPedidoId}/comments`);
      if (!res.ok) throw new Error("Erro chat");
      const comments = await res.json();
      renderChatMessages(comments);
    } catch (e) {
      chatList.innerHTML =
        '<p class="text-center text-red-500 text-sm">Erro ao carregar chat.</p>';
    }
  }

  function renderAttachments(list) {
    if (!modalAttachmentsList) return;
    modalAttachmentsList.innerHTML = "";
    list.forEach((file) => {
      const li = document.createElement("li");
      li.className =
        "flex items-center justify-between bg-gray-100 dark:bg-gray-700 p-2 rounded";
      li.innerHTML = `
            <a href="${file.file_path}" target="_blank" class="text-indigo-600 dark:text-indigo-400 hover:underline truncate max-w-[80%]">${file.file_name}</a>
            <button onclick="deleteAttachment(${file.id})" class="text-red-500 hover:text-red-700">×</button>
        `;
      modalAttachmentsList.appendChild(li);
    });
  }

  window.deleteAttachment = async (id) => {
    if (!confirm("Excluir anexo?")) return;
    await fetch(`/api/pedidos/attachments/${id}`, { method: "DELETE" });
    loadChatTab();
  };

  async function handleUploadSubmit(e) {
    e.preventDefault();
    const formData = new FormData();
    formData.append("file", modalUploadFile.files[0]);

    try {
      const res = await fetch(`/api/pedidos/${currentPedidoId}/upload`, {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        modalUploadFile.value = "";
        loadChatTab();
      } else alert("Erro upload");
    } catch (e) {
      alert("Erro upload");
    }
  }

  function renderChatMessages(comments) {
    if (comments.length === 0) {
      chatList.innerHTML =
        '<p class="text-center text-gray-400 text-xs italic py-10">Nenhuma mensagem. Inicie a conversa.</p>';
      return;
    }

    const isAtBottom =
      chatList.scrollHeight - chatList.scrollTop <= chatList.clientHeight + 50;

    chatList.innerHTML = comments
      .map((c) => {
        const isMe = c.username === currentUser.username;
        return `
            <div class="flex flex-col ${
              isMe ? "items-end" : "items-start"
            } mb-3">
                <div class="max-w-[85%] rounded-lg p-3 text-sm ${
                  isMe
                    ? "bg-indigo-600 text-white rounded-br-none shadow-md"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-none shadow-sm border border-gray-200 dark:border-gray-600"
                }">
                    <p>${c.content}</p>
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

    if (isAtBottom) {
      chatList.scrollTop = chatList.scrollHeight;
    }
  }

  // PASTE-TO-UPLOAD (NOVO - SOLICITANTE)
  async function handlePasteAttachment(e) {
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

      if (!currentPedidoId) {
        showToast("O pedido precisa ser aprovado antes de enviar imagens.");
        return;
      }

      const formData = new FormData();
      formData.append("file", blob);

      const originalPlaceholder = e.target.placeholder;
      e.target.placeholder = "Enviando imagem...";
      e.target.disabled = true;

      try {
        const res = await fetch(`/api/pedidos/${currentPedidoId}/upload`, {
          method: "POST",
          body: formData,
        });

        if (res.ok) {
          showToast("Imagem anexada com sucesso!");
          loadChatTab();
        } else {
          showToast("Erro ao enviar imagem.");
        }
      } catch (err) {
        console.error(err);
        showToast("Erro ao colar imagem.");
      } finally {
        e.target.disabled = false;
        e.target.placeholder = originalPlaceholder;
        e.target.focus();
      }
    }
  }

  async function handleChatSubmit(e) {
    e.preventDefault();
    const content = chatInput.value.trim();
    if (!content || !currentPedidoId) return;

    try {
      const res = await fetch(`/api/pedidos/${currentPedidoId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      if (res.ok) {
        chatInput.value = "";
        chatInput.focus();
        loadChatTab();
      }
    } catch (e) {
      alert("Erro ao enviar mensagem.");
    }
  }

  // =================================================================
  // 7. NOVA SOLICITAÇÃO
  // =================================================================
  window.openNewRequestModal = () => {
    newRequestForm.reset();
    newRequestModal.classList.remove("hidden");
  };

  window.closeNewRequestModal = () => {
    newRequestModal.classList.add("hidden");
  };

  async function handleNewRequestSubmit(e) {
    e.preventDefault();

    // Botão Loading State
    const btn = newRequestForm.querySelector('button[type="submit"]');
    const originalText = btn.innerText;
    btn.disabled = true;
    btn.innerHTML = `<svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Enviando...`;

    const data = {
      title: document.getElementById("req-title").value,
      description: document.getElementById("req-desc").value,
      reference_links: document.getElementById("req-link").value,
      justification: document.getElementById("req-justification").value,
    };

    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        closeNewRequestModal();
        showToast("Solicitação enviada com sucesso!");
        loadRequests();
      } else {
        alert("Erro ao enviar solicitação. Tente novamente.");
      }
    } catch (error) {
      console.error(error);
      alert("Erro de conexão.");
    } finally {
      btn.disabled = false;
      btn.innerText = originalText;
    }
  }

  function showToast(msg) {
    if (!toast) return;
    toastMsg.textContent = msg;
    toast.classList.remove("hidden");
    toast.classList.add("animate-bounce-in");

    setTimeout(() => {
      toast.classList.add("hidden");
    }, 3000);
  }
});

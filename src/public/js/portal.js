document.addEventListener("DOMContentLoaded", () => {
  // Elementos UI
  const userAvatar = document.getElementById("user-avatar");
  const logoutButton = document.getElementById("logout-button");
  const requestsGrid = document.getElementById("requests-grid");
  const emptyState = document.getElementById("empty-state");
  const modal = document.getElementById("new-request-modal");
  const form = document.getElementById("new-request-form");
  const toast = document.getElementById("toast-success");
  const toastMsg = document.getElementById("toast-message");

  // Dark Mode Elements
  const themeToggleBtn = document.getElementById("theme-toggle");
  const themeToggleDarkIcon = document.getElementById("theme-toggle-dark-icon");
  const themeToggleLightIcon = document.getElementById(
    "theme-toggle-light-icon"
  );

  // --- INICIALIZAÇÃO ---
  checkAuthentication();
  initializeDarkMode();

  // --- AUTENTICAÇÃO ---
  async function checkAuthentication() {
    try {
      const res = await fetch("/api/auth/check");
      if (!res.ok) throw new Error("Auth fail");
      const data = await res.json();

      if (data.loggedIn) {
        userAvatar.textContent = data.user.username.charAt(0).toUpperCase();
        loadRequests();
      } else {
        window.location.href = "login.html";
      }
    } catch (e) {
      window.location.href = "login.html";
    }
  }

  logoutButton.addEventListener("click", async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "login.html";
  });

  // --- DARK MODE ---
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

  // --- CARREGAMENTO DE DADOS ---
  async function loadRequests() {
    try {
      const res = await fetch("/api/requests/my");
      if (!res.ok) throw new Error("Erro API");
      const requests = await res.json();
      renderRequests(requests);
    } catch (error) {
      console.error(error);
      requestsGrid.innerHTML =
        '<div class="col-span-full text-center text-red-500 py-10">Não foi possível carregar seus pedidos. Tente recarregar a página.</div>';
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
      const status = getStatusConfig(req.status);
      const date = new Date(req.created_at).toLocaleDateString("pt-BR");

      const card = document.createElement("div");
      card.className =
        "bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-all duration-200 flex flex-col h-full";

      card.innerHTML = `
                <div class="flex justify-between items-start mb-3">
                    <span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      status.classes
                    } ring-1 ring-inset ${status.ring}">
                        ${status.icon}
                        ${status.label}
                    </span>
                    <span class="text-xs text-gray-400 dark:text-gray-500" title="${new Date(
                      req.created_at
                    ).toLocaleString()}">${date}</span>
                </div>
                
                <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-2 line-clamp-1" title="${
                  req.title
                }">${req.title}</h3>
                
                <div class="flex-1">
                    <p class="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 mb-3">${
                      req.description ||
                      '<span class="italic text-gray-400">Sem descrição.</span>'
                    }</p>
                </div>

                ${
                  req.approval_notes
                    ? `
                    <div class="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 bg-red-50 dark:bg-red-900/10 -mx-5 -mb-5 p-4 rounded-b-xl">
                        <p class="text-xs text-red-600 dark:text-red-400 font-bold uppercase mb-1">Motivo da Recusa</p>
                        <p class="text-xs text-red-800 dark:text-red-200">${req.approval_notes}</p>
                    </div>
                `
                    : ""
                }
            `;
      requestsGrid.appendChild(card);
    });
  }

  function getStatusConfig(status) {
    const configs = {
      pending_buyer_review: {
        label: "Em Análise",
        classes:
          "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
        ring: "ring-yellow-600/20",
        icon: '<svg class="mr-1.5 h-2 w-2 fill-yellow-500" viewBox="0 0 6 6" aria-hidden="true"><circle cx="3" cy="3" r="3" /></svg>',
      },
      approved: {
        label: "Em Processo",
        classes:
          "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
        ring: "ring-blue-600/20",
        icon: '<svg class="mr-1.5 h-2 w-2 fill-blue-500" viewBox="0 0 6 6" aria-hidden="true"><circle cx="3" cy="3" r="3" /></svg>',
      },
      buyer_rejected: {
        label: "Recusado",
        classes: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400",
        ring: "ring-red-600/20",
        icon: '<svg class="mr-1.5 h-2 w-2 fill-red-500" viewBox="0 0 6 6" aria-hidden="true"><circle cx="3" cy="3" r="3" /></svg>',
      },
      completed: {
        label: "Entregue",
        classes:
          "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400",
        ring: "ring-green-600/20",
        icon: '<svg class="mr-1.5 h-2 w-2 fill-green-500" viewBox="0 0 6 6" aria-hidden="true"><circle cx="3" cy="3" r="3" /></svg>',
      },
    };
    // Fallback
    return (
      configs[status] || {
        label: status,
        classes: "bg-gray-50 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
        ring: "ring-gray-500/20",
        icon: "",
      }
    );
  }

  // --- MODAL E FORMULÁRIO ---
  window.openNewRequestModal = () => {
    form.reset();
    modal.classList.remove("hidden");
  };

  window.closeNewRequestModal = () => {
    modal.classList.add("hidden");
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Botão Loading State
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerText;
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Enviando...`;

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
      submitBtn.disabled = false;
      submitBtn.innerText = originalText;
    }
  });

  function showToast(msg) {
    toastMsg.textContent = msg;
    toast.classList.remove("hidden");
    // Animação de entrada
    toast.classList.add("animate-bounce-in");

    setTimeout(() => {
      toast.classList.add("hidden");
    }, 3000);
  }
});

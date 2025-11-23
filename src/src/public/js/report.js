document.addEventListener("DOMContentLoaded", () => {
  // =================================================================
  // 1. ELEMENTOS DO DOM
  // =================================================================
  const reportId = document.getElementById("report-id");
  const reportOrigin = document.getElementById("report-origin"); // NOVO
  const reportTitle = document.getElementById("report-title");
  const reportStatus = document.getElementById("report-status");
  const reportResponsible = document.getElementById("report-responsible");
  const reportDepartment = document.getElementById("report-department");
  const reportCreatedAt = document.getElementById("report-created-at");
  const reportPriority = document.getElementById("report-priority"); // NOVO
  const reportDescription = document.getElementById("report-description"); // NOVO

  const reportPrice = document.getElementById("report-price");
  const reportQuantity = document.getElementById("report-quantity");
  const reportFinalizedAt = document.getElementById("report-finalized-at");
  const reportLink = document.getElementById("report-link");

  const reportNotesList = document.getElementById("report-notes-list");
  const reportResearchList = document.getElementById("report-research-list");

  const printButton = document.getElementById("print-button");

  // =================================================================
  // 2. FUNÇÕES UTILITÁRIAS (FORMATADORES)
  // =================================================================

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

  function formatCurrency(value) {
    if (!value && value !== 0) return "R$ 0,00";
    return parseFloat(value).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  // =================================================================
  // 3. CARREGAMENTO DE DADOS
  // =================================================================

  async function loadReport() {
    // A. Verificar Autenticação (Segurança básica)
    try {
      const authRes = await fetch("/api/auth/check");
      const authData = await authRes.json();
      if (!authData.loggedIn) {
        // Se não logado, redireciona para login e volta para cá depois
        window.location.href = `login.html?redirect=${encodeURIComponent(
          window.location.pathname + window.location.search
        )}`;
        return;
      }
    } catch (e) {
      document.body.innerHTML = `<div class="flex h-screen items-center justify-center"><h1 class="text-xl font-bold text-red-500">Erro de autenticação.</h1></div>`;
      return;
    }

    // B. Obter ID da URL
    const urlParams = new URLSearchParams(window.location.search);
    const pedidoId = urlParams.get("id");
    if (!pedidoId) {
      document.body.innerHTML = `<div class="flex h-screen items-center justify-center"><h1 class="text-xl font-bold text-red-500">ID do pedido não fornecido.</h1></div>`;
      return;
    }

    // C. Buscar Dados da API (em paralelo para rapidez)
    try {
      const [pedidoRes, notesRes, researchRes] = await Promise.all([
        fetch(`/api/pedidos/${pedidoId}`),
        fetch(`/api/pedidos/${pedidoId}/notes`),
        fetch(`/api/pedidos/${pedidoId}/research`),
      ]);

      if (!pedidoRes.ok)
        throw new Error("Não foi possível carregar os detalhes do pedido.");

      const pedido = await pedidoRes.json();
      const notes = await notesRes.json();
      const research = await researchRes.json();

      // D. Preencher o Relatório com os Dados

      // -- Cabeçalho --
      document.title = `Relatório #${pedido.id} - ${pedido.title}`;
      reportId.textContent = `ID: ${pedido.id}`;

      // Lógica de Origem (Manual vs Portal)
      if (pedido.is_from_portal === 1) {
        reportOrigin.textContent = "Origem: Solicitação via Portal";
        reportOrigin.className =
          "text-xs font-bold tracking-wider mt-1 uppercase text-indigo-600 dark:text-indigo-400";
      } else {
        const creator = pedido.creator_name || "Desconhecido";
        reportOrigin.textContent = `Origem: Lançamento Manual por ${creator}`;
        reportOrigin.className =
          "text-xs font-bold tracking-wider mt-1 uppercase text-gray-500 dark:text-gray-400";
      }

      // -- Detalhes Principais --
      reportTitle.textContent = pedido.title;
      reportStatus.textContent = (
        pedido.column_title || "Desconhecido"
      ).toUpperCase();
      reportResponsible.textContent = pedido.solicitante_display || "N/A";
      reportDepartment.textContent = pedido.group_name || "N/A";
      reportCreatedAt.textContent = formatTimestamp(pedido.task_created_at);
      reportPriority.textContent = (pedido.priority || "Normal").toUpperCase();

      // Cores da Prioridade
      reportPriority.className =
        "block uppercase font-bold " +
        (pedido.priority === "alta"
          ? "text-red-600 dark:text-red-400"
          : pedido.priority === "media"
          ? "text-yellow-600 dark:text-yellow-400"
          : "text-blue-600 dark:text-blue-400");

      // -- Descrição (Novo Campo) --
      if (pedido.description && pedido.description.trim() !== "") {
        reportDescription.textContent = pedido.description;
        reportDescription.classList.remove("italic", "text-gray-400");
      } else {
        reportDescription.textContent =
          "Nenhuma descrição ou especificação informada.";
        reportDescription.classList.add("italic", "text-gray-400");
      }

      // -- Dados da Compra --
      reportPrice.textContent = formatCurrency(pedido.purchased_price);
      reportQuantity.textContent = pedido.purchased_quantity || "-";
      reportFinalizedAt.textContent = formatTimestamp(
        pedido.report_generated_at
      );

      if (pedido.purchase_link) {
        reportLink.textContent = pedido.purchase_link;
        reportLink.href = pedido.purchase_link;
      } else {
        reportLink.textContent = "-";
        reportLink.removeAttribute("href");
        reportLink.classList.remove("text-blue-600", "underline"); // Remove estilo de link se vazio
      }

      // -- Lista de Notas --
      reportNotesList.innerHTML = "";
      if (notes.length > 0) {
        notes.forEach((note) => {
          const li = document.createElement("li");
          li.className =
            "py-3 border-b border-gray-200 dark:border-gray-700 last:border-0";
          li.innerHTML = `
                        <p class="text-gray-800 dark:text-gray-200 text-sm whitespace-pre-wrap">${
                          note.content
                        }</p>
                        <p class="text-xs text-gray-500 mt-1">
                            Registrado por <span class="font-medium text-gray-700 dark:text-gray-300">${
                              note.username
                            }</span> 
                            em ${formatTimestamp(note.created_at)}
                        </p>
                    `;
          reportNotesList.appendChild(li);
        });
      } else {
        reportNotesList.innerHTML =
          '<li class="py-3 text-gray-500 italic text-sm">Nenhuma nota registrada no histórico.</li>';
      }

      // -- Lista de Pesquisa --
      reportResearchList.innerHTML = "";
      if (research.length > 0) {
        research.forEach((item) => {
          const li = document.createElement("li");
          li.className =
            "py-3 border-b border-gray-200 dark:border-gray-700 last:border-0";

          // Verifica se é link para criar tag <a>
          let contentHTML = item.content;
          if (
            item.content.startsWith("http://") ||
            item.content.startsWith("https://")
          ) {
            contentHTML = `<a href="${item.content}" target="_blank" class="text-blue-600 dark:text-blue-400 hover:underline break-all">${item.content}</a>`;
          }

          li.innerHTML = `
                        <div class="text-gray-800 dark:text-gray-200 text-sm">${contentHTML}</div>
                        <p class="text-xs text-gray-500 mt-1">
                            Adicionado por <span class="font-medium text-gray-700 dark:text-gray-300">${
                              item.username
                            }</span> 
                            em ${formatTimestamp(item.created_at)}
                        </p>
                    `;
          reportResearchList.appendChild(li);
        });
      } else {
        reportResearchList.innerHTML =
          '<li class="py-3 text-gray-500 italic text-sm">Nenhum link de pesquisa registrado.</li>';
      }
    } catch (error) {
      console.error(error);
      document.body.innerHTML = `<div class="text-center p-10"><h2 class="text-xl font-bold text-red-600">Erro ao gerar relatório</h2><p class="text-gray-600 mt-2">${error.message}</p></div>`;
    }
  }

  // =================================================================
  // 4. INICIALIZAÇÃO
  // =================================================================

  if (printButton) {
    printButton.addEventListener("click", () => {
      window.print();
    });
  }

  // Aplica Dark Mode se necessário (para consistência visual na tela antes de imprimir)
  if (
    localStorage.theme === "dark" ||
    (!("theme" in localStorage) &&
      window.matchMedia("(prefers-color-scheme: dark)").matches)
  ) {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }

  loadReport();
});

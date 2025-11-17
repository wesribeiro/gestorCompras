document.addEventListener("DOMContentLoaded", () => {
  // Elementos do Relatório
  const reportId = document.getElementById("report-id");
  const reportTitle = document.getElementById("report-title");
  const reportDepartment = document.getElementById("report-department");
  const reportResponsible = document.getElementById("report-responsible");
  const reportCreatedAt = document.getElementById("report-created-at");
  const reportStatus = document.getElementById("report-status");

  const reportPrice = document.getElementById("report-price");
  const reportQuantity = document.getElementById("report-quantity");
  const reportFinalizedAt = document.getElementById("report-finalized-at");
  const reportLink = document.getElementById("report-link");

  const reportNotesList = document.getElementById("report-notes-list");
  const reportResearchList = document.getElementById("report-research-list");

  const printButton = document.getElementById("print-button");

  /**
   * Função helper para formatar timestamps
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

  /**
   * Função helper para formatar moeda
   */
  function formatCurrency(value) {
    if (!value) return "N/A";
    return parseFloat(value).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  /**
   * Função principal para carregar os dados
   */
  async function loadReport() {
    // 1. Verificar autenticação (para proteger o relatório)
    try {
      const authResponse = await fetch("/api/auth/check");
      const authData = await authResponse.json();
      if (!authData.loggedIn) {
        // Se não estiver logado, redireciona para o login
        // e passa este relatório como destino após o login
        window.location.href = `login.html?redirect=${encodeURIComponent(
          window.location.pathname + window.location.search
        )}`;
        return;
      }
    } catch (e) {
      document.body.innerHTML = `<h1 class="text-red-500 text-center p-10">Erro de autenticação.</h1>`;
      return;
    }

    // 2. Obter o ID do pedido da URL
    const urlParams = new URLSearchParams(window.location.search);
    const pedidoId = urlParams.get("id");
    if (!pedidoId) {
      document.body.innerHTML = `<h1 class="text-red-500 text-center p-10">ID do pedido não fornecido.</h1>`;
      return;
    }

    // 3. Buscar todos os dados do pedido em paralelo
    try {
      const [pedidoRes, notesRes, researchRes] = await Promise.all([
        fetch(`/api/pedidos/${pedidoId}`),
        fetch(`/api/pedidos/${pedidoId}/notes`),
        fetch(`/api/pedidos/${pedidoId}/research`),
      ]);

      if (!pedidoRes.ok || !notesRes.ok || !researchRes.ok) {
        throw new Error("Falha ao carregar dados do pedido.");
      }

      const pedido = await pedidoRes.json();
      const notes = await notesRes.json();
      const research = await researchRes.json();

      // 4. Preencher o template HTML com os dados

      // Seção 1: Detalhes
      document.title = `Relatório: ${pedido.title}`;
      reportId.textContent = `ID do Pedido: ${pedido.id}`;
      reportTitle.textContent = pedido.title;
      reportDepartment.textContent = pedido.department_name || "N/A";
      reportResponsible.textContent = pedido.responsible_username || "N/A";
      reportCreatedAt.textContent = formatTimestamp(pedido.task_created_at);
      reportStatus.textContent = pedido.column
        .replace("_", " ")
        .replace(/^\w/, (c) => c.toUpperCase());

      // Seção 2: Compra
      reportPrice.textContent = formatCurrency(pedido.purchased_price);
      reportQuantity.textContent = pedido.purchased_quantity || "N/A";
      reportFinalizedAt.textContent = formatTimestamp(
        pedido.report_generated_at
      );
      reportLink.textContent = pedido.purchase_link || "N/A";
      if (pedido.purchase_link) {
        reportLink.href = pedido.purchase_link;
      }

      // Seção 3: Notas de Status
      reportNotesList.innerHTML = ""; // Limpar
      if (notes.length > 0) {
        notes.forEach((note) => {
          const li = document.createElement("li");
          li.className = "py-2 border-b";
          li.innerHTML = `
                        <p>${note.content}</p>
                        <p class="text-sm text-gray-600">
                            Por: ${note.username} em ${formatTimestamp(
            note.created_at
          )}
                        </p>
                    `;
          reportNotesList.appendChild(li);
        });
      } else {
        reportNotesList.innerHTML =
          "<li>Nenhuma nota de status registrada.</li>";
      }

      // Seção 4: Links de Pesquisa
      reportResearchList.innerHTML = ""; // Limpar
      if (research.length > 0) {
        research.forEach((item) => {
          const li = document.createElement("li");
          li.className = "py-2 border-b";

          let contentHTML = item.content;
          if (
            item.content.startsWith("http://") ||
            item.content.startsWith("https://")
          ) {
            contentHTML = `<a href="${item.content}" target="_blank" class="text-blue-600 hover:underline">${item.content}</a>`;
          }

          li.innerHTML = `
                        <p>${contentHTML}</p>
                        <p class="text-sm text-gray-600">
                            Por: ${item.username} em ${formatTimestamp(
            item.created_at
          )}
                        </p>
                    `;
          reportResearchList.appendChild(li);
        });
      } else {
        reportResearchList.innerHTML =
          "<li>Nenhum link de pesquisa registrado.</li>";
      }
    } catch (error) {
      console.error(error);
      document.body.innerHTML = `<h1 class="text-red-500 text-center p-10">${error.message}</h1>`;
    }
  }

  // 5. Ativar o botão de impressão
  printButton.addEventListener("click", () => {
    window.print();
  });

  // --- Ponto de Entrada ---
  loadReport();
});

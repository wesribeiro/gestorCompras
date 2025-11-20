document.addEventListener("DOMContentLoaded", () => {
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
    if (!value) return "N/A";
    return parseFloat(value).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  async function loadReport() {
    try {
      const authResponse = await fetch("/api/auth/check");
      const authData = await authResponse.json();
      if (!authData.loggedIn) {
        window.location.href = `login.html?redirect=${encodeURIComponent(
          window.location.pathname + window.location.search
        )}`;
        return;
      }
    } catch (e) {
      document.body.innerHTML = `<h1 class="text-red-500 text-center p-10">Erro de autenticação.</h1>`;
      return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const pedidoId = urlParams.get("id");
    if (!pedidoId) {
      document.body.innerHTML = `<h1 class="text-red-500 text-center p-10">ID do pedido não fornecido.</h1>`;
      return;
    }

    try {
      const [pedidoRes, notesRes, researchRes] = await Promise.all([
        fetch(`/api/pedidos/${pedidoId}`),
        fetch(`/api/pedidos/${pedidoId}/notes`),
        fetch(`/api/pedidos/${pedidoId}/research`),
      ]);

      if (!pedidoRes.ok) throw new Error("Falha ao carregar dados do pedido.");

      const pedido = await pedidoRes.json();
      const notes = await notesRes.json();
      const research = await researchRes.json();

      // --- CORREÇÃO AQUI ---
      // Usamos pedido.column_title em vez de pedido.column
      const statusText = (pedido.column_title || "Desconhecido")
        .replace("_", " ")
        .toUpperCase();

      document.title = `Relatório: ${pedido.title}`;
      reportId.textContent = `ID do Pedido: ${pedido.id}`;
      reportTitle.textContent = pedido.title;
      reportDepartment.textContent = pedido.group_name || "N/A";
      reportResponsible.textContent = pedido.solicitante_display || "N/A";
      reportCreatedAt.textContent = formatTimestamp(pedido.task_created_at);
      reportStatus.textContent = statusText;

      reportPrice.textContent = formatCurrency(pedido.purchased_price);
      reportQuantity.textContent = pedido.purchased_quantity || "N/A";
      reportFinalizedAt.textContent = formatTimestamp(
        pedido.report_generated_at
      );
      reportLink.textContent = pedido.purchase_link || "N/A";
      if (pedido.purchase_link) {
        reportLink.href = pedido.purchase_link;
      }

      reportNotesList.innerHTML = "";
      if (notes.length > 0) {
        notes.forEach((note) => {
          const li = document.createElement("li");
          li.className = "py-2 border-b";
          li.innerHTML = `<p>${
            note.content
          }</p><p class="text-sm text-gray-600">Por: ${
            note.username
          } em ${formatTimestamp(note.created_at)}</p>`;
          reportNotesList.appendChild(li);
        });
      } else {
        reportNotesList.innerHTML =
          "<li>Nenhuma nota de status registrada.</li>";
      }

      reportResearchList.innerHTML = "";
      if (research.length > 0) {
        research.forEach((item) => {
          const li = document.createElement("li");
          li.className = "py-2 border-b";
          let contentHTML = item.content;
          if (item.content.startsWith("http")) {
            contentHTML = `<a href="${item.content}" target="_blank" class="text-blue-600 hover:underline">${item.content}</a>`;
          }
          li.innerHTML = `<p>${contentHTML}</p><p class="text-sm text-gray-600">Por: ${
            item.username
          } em ${formatTimestamp(item.created_at)}</p>`;
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

  printButton.addEventListener("click", () => window.print());

  loadReport();
});

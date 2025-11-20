document.addEventListener("DOMContentLoaded", () => {
  // Elementos da UI
  const toggleButton = document.getElementById("toggle-approval");
  const toggleHandle = document.getElementById("toggle-approval-handle");
  const statusMessage = document.getElementById("status-message");
  const backButton = document.querySelector('a[href="index.html"]');

  let currentUser = null;
  let currentSettings = {};

  // Estado local para o toggle
  let isApprovalEnabled = false;

  /**
   * Função principal: Verifica a sessão e autorização
   */
  async function initializePage() {
    try {
      // 1. Verificar quem está logado
      const authResponse = await fetch("/api/auth/check");
      if (!authResponse.ok) throw new Error("Falha na autenticação");

      const authData = await authResponse.json();
      if (!authData.loggedIn || !authData.user) {
        redirectToLogin();
        return;
      }
      currentUser = authData.user;

      // 2. VERIFICAR AUTORIZAÇÃO (MUITO IMPORTANTE)
      if (currentUser.role !== "admin") {
        document.body.innerHTML = `<div class="p-10 text-center text-red-400">
                                            <h1 class="text-2xl font-bold">Acesso Negado</h1>
                                            <p class="mt-2">Apenas administradores podem aceder a esta página.</p>
                                            <a href="index.html" class="mt-4 inline-block rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-500">Voltar ao Kanban</a>
                                           </div>`;
        return;
      }

      // 3. Se for admin, buscar as configurações
      const settingsResponse = await fetch("/api/settings");
      if (!settingsResponse.ok)
        throw new Error("Falha ao buscar configurações");

      currentSettings = await settingsResponse.json();
      isApprovalEnabled = currentSettings.approval_workflow_enabled || false;

      // 4. Atualizar a UI com o estado atual
      updateToggleUI(isApprovalEnabled, false); // false = sem transição

      // 5. Adicionar o listener ao botão
      toggleButton.addEventListener("click", handleToggleClick);
    } catch (error) {
      console.error("Erro ao inicializar página de configurações:", error);
      statusMessage.textContent = `Erro: ${error.message}`;
      statusMessage.className = "text-sm text-red-400";
    }
  }

  /**
   * Atualiza a aparência do botão toggle
   */
  function updateToggleUI(isEnabled, useTransition = true) {
    // Atualiza o estado visual
    if (isEnabled) {
      toggleButton.classList.remove("bg-gray-600");
      toggleButton.classList.add("bg-indigo-600");
      toggleHandle.classList.add("translate-x-5");
    } else {
      toggleButton.classList.remove("bg-indigo-600");
      toggleButton.classList.add("bg-gray-600");
      toggleHandle.classList.remove("translate-x-5");
    }

    // Adiciona/Remove classes de transição (útil na carga inicial)
    const transitionClass = "transition";
    if (useTransition) {
      toggleButton.classList.add(transitionClass);
      toggleHandle.classList.add(transitionClass);
    } else {
      toggleButton.classList.remove(transitionClass);
      toggleHandle.classList.remove(transitionClass);
    }

    // Atualiza o atributo 'aria-checked' para acessibilidade
    toggleButton.setAttribute("aria-checked", isEnabled.toString());
  }

  /**
   * Chamado quando o botão toggle é clicado
   */
  async function handleToggleClick() {
    const newState = !isApprovalEnabled; // O estado que queremos salvar

    // Desativa o botão temporariamente para evitar cliques duplos
    toggleButton.disabled = true;
    statusMessage.textContent = "A guardar...";
    statusMessage.className = "text-sm text-yellow-400";

    try {
      // Chamar a API para salvar a nova configuração
      const response = await fetch("/api/settings/approval_workflow", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: newState }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Falha ao guardar configuração");
      }

      // Sucesso!
      isApprovalEnabled = newState; // Atualiza o estado local
      updateToggleUI(isApprovalEnabled); // Atualiza a UI
      statusMessage.textContent = "Configuração guardada com sucesso!";
      statusMessage.className = "text-sm text-green-400";
    } catch (error) {
      console.error("Erro ao guardar configuração:", error);
      statusMessage.textContent = `Erro: ${error.message}`;
      statusMessage.className = "text-sm text-red-400";
      // Reverte a UI para o estado antigo (já que falhou)
      updateToggleUI(isApprovalEnabled);
    } finally {
      // Reativa o botão
      toggleButton.disabled = false;
      // Limpa a mensagem de status após alguns segundos
      setTimeout(() => {
        if (statusMessage.className.includes("green")) {
          statusMessage.textContent = "";
        }
      }, 3000);
    }
  }

  /**
   * Redireciona para o login
   */
  function redirectToLogin() {
    window.location.href = "login.html";
  }

  // --- Ponto de Entrada ---
  initializePage();
});

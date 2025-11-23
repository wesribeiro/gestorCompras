document.addEventListener("DOMContentLoaded", () => {
  // Elementos da UI - Fluxo de Aprovação
  const toggleButton = document.getElementById("toggle-approval");
  const toggleHandle = document.getElementById("toggle-approval-handle");

  // Elementos da UI - Configurações Gerais (NOVO)
  const generalSettingsForm = document.getElementById("general-settings-form");
  const retentionInput = document.getElementById("setting-retention");
  const emailInput = document.getElementById("setting-email");
  const saveGeneralBtn = document.getElementById("btn-save-general");

  // Elementos Globais
  const statusMessage = document.getElementById("status-message");

  let currentUser = null;
  let currentSettings = {};

  // Estado local para o toggle
  let isApprovalEnabled = false;

  /**
   * Função principal: Verifica a sessão, autorização e carrega dados
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

      // 2. VERIFICAR AUTORIZAÇÃO (Admin apenas)
      if (currentUser.role !== "admin") {
        document.body.innerHTML = `<div class="p-10 text-center text-red-400">
                                            <h1 class="text-2xl font-bold">Acesso Negado</h1>
                                            <p class="mt-2">Apenas administradores podem aceder a esta página.</p>
                                            <a href="index.html" class="mt-4 inline-block rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-500">Voltar ao Kanban</a>
                                           </div>`;
        return;
      }

      // 3. Buscar as configurações atuais
      const settingsResponse = await fetch("/api/settings");
      if (!settingsResponse.ok)
        throw new Error("Falha ao buscar configurações");

      currentSettings = await settingsResponse.json();

      // 4. Configurar Estado Inicial da UI

      // -- Fluxo de Aprovação --
      isApprovalEnabled = currentSettings.approval_workflow_enabled || false;
      updateToggleUI(isApprovalEnabled, false);

      // -- Configurações Gerais (NOVO) --
      if (retentionInput) {
        retentionInput.value = currentSettings.image_retention_days || "90";
      }
      if (emailInput) {
        emailInput.value =
          currentSettings.notification_sender_email || "noreply@empresa.com";
      }

      // 5. Adicionar Listeners
      if (toggleButton) {
        toggleButton.addEventListener("click", handleToggleClick);
      }
      if (generalSettingsForm) {
        generalSettingsForm.addEventListener(
          "submit",
          handleSaveGeneralSettings
        );
      }
    } catch (error) {
      console.error("Erro ao inicializar página de configurações:", error);
      showStatus(`Erro: ${error.message}`, "error");
    }
  }

  /**
   * Atualiza a aparência do botão toggle
   */
  function updateToggleUI(isEnabled, useTransition = true) {
    if (!toggleButton || !toggleHandle) return;

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

    // Adiciona/Remove classes de transição
    const transitionClass = "transition";
    if (useTransition) {
      toggleButton.classList.add(transitionClass);
      toggleHandle.classList.add(transitionClass);
    } else {
      toggleButton.classList.remove(transitionClass);
      toggleHandle.classList.remove(transitionClass);
    }

    // Acessibilidade
    toggleButton.setAttribute("aria-checked", isEnabled.toString());
  }

  /**
   * Handler: Salvar Alterações Gerais (Retenção e Email)
   */
  async function handleSaveGeneralSettings(e) {
    e.preventDefault();

    const retention = parseInt(retentionInput.value);
    const email = emailInput.value.trim();

    if (isNaN(retention) || retention < 1) {
      showStatus("Dias de retenção inválidos.", "error");
      return;
    }
    if (!email || !email.includes("@")) {
      showStatus("E-mail inválido.", "error");
      return;
    }

    // UI Loading
    if (saveGeneralBtn) {
      saveGeneralBtn.disabled = true;
      saveGeneralBtn.innerText = "Salvando...";
    }

    try {
      const res = await fetch("/api/settings/general", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_retention_days: retention,
          notification_sender_email: email,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        showStatus("Configurações gerais salvas com sucesso!", "success");
        // Atualiza cache local
        currentSettings.image_retention_days = retention;
        currentSettings.notification_sender_email = email;
      } else {
        throw new Error(data.message || "Erro ao salvar.");
      }
    } catch (err) {
      console.error(err);
      showStatus(`Erro: ${err.message}`, "error");
    } finally {
      if (saveGeneralBtn) {
        saveGeneralBtn.disabled = false;
        saveGeneralBtn.innerText = "Salvar Alterações Gerais";
      }
    }
  }

  /**
   * Handler: Botão Toggle (Fluxo de Aprovação)
   */
  async function handleToggleClick() {
    const newState = !isApprovalEnabled;

    toggleButton.disabled = true;
    showStatus("A guardar fluxo...", "warning");

    try {
      const response = await fetch("/api/settings/approval_workflow", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: newState }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Falha ao guardar configuração");
      }

      isApprovalEnabled = newState;
      updateToggleUI(isApprovalEnabled);
      showStatus("Fluxo de aprovação atualizado!", "success");

      // Atualiza cache local
      currentSettings.approval_workflow_enabled = newState;
    } catch (error) {
      console.error("Erro ao guardar configuração:", error);
      showStatus(`Erro: ${error.message}`, "error");
      updateToggleUI(isApprovalEnabled); // Reverte visualmente
    } finally {
      toggleButton.disabled = false;
    }
  }

  /**
   * Helper: Exibe mensagens de status
   */
  function showStatus(msg, type) {
    if (!statusMessage) return;
    statusMessage.textContent = msg;

    statusMessage.classList.remove(
      "text-green-400",
      "text-red-400",
      "text-yellow-400",
      "text-gray-400"
    );

    if (type === "success") statusMessage.classList.add("text-green-400");
    else if (type === "error") statusMessage.classList.add("text-red-400");
    else if (type === "warning") statusMessage.classList.add("text-yellow-400");
    else statusMessage.classList.add("text-gray-400");

    // Limpa mensagem de sucesso após 3s
    if (type === "success") {
      setTimeout(() => {
        statusMessage.textContent = "";
      }, 3000);
    }
  }

  function redirectToLogin() {
    window.location.href = "login.html";
  }

  // Inicializa
  initializePage();
});

document.addEventListener("DOMContentLoaded", async () => {
  // 1. VERIFICAÇÃO DE SEGURANÇA (Admin Check)
  try {
    const authRes = await fetch("/api/auth/check");
    const authData = await authRes.json();
    if (!authData.loggedIn || authData.user.role !== "admin") {
      window.location.href = "index.html";
      return;
    }
  } catch (e) {
    window.location.href = "index.html";
    return;
  }

  // 2. ELEMENTOS DA DOM
  const tabUsersBtn = document.getElementById("tab-users-btn");
  const tabGroupsBtn = document.getElementById("tab-groups-btn");
  const contentUsers = document.getElementById("tab-users-content");
  const contentGroups = document.getElementById("tab-groups-content");

  const usersListBody = document.getElementById("users-list-body");
  const groupsListBody = document.getElementById("groups-list-body");

  // Selects de Grupo (Criar e Editar)
  const userGroupSelect = document.getElementById("user-group-select");
  const editUserGroupSelect = document.getElementById("edit-user-group-select");

  // Estado local para dados (para facilitar preenchimento de edições)
  let localGroups = [];
  let localUsers = [];

  // 3. INICIALIZAÇÃO
  await loadGroups(); // Carrega grupos primeiro para preencher os selects
  await loadUsers();

  // 4. CONTROLE DE ABAS
  tabUsersBtn.onclick = () => switchTab("users");
  tabGroupsBtn.onclick = () => switchTab("groups");

  function switchTab(tab) {
    if (tab === "users") {
      contentUsers.classList.remove("hidden");
      contentGroups.classList.add("hidden");
      tabUsersBtn.classList.add("border-accent", "text-accent");
      tabUsersBtn.classList.remove("border-transparent", "text-text-secondary");
      tabGroupsBtn.classList.remove("border-accent", "text-accent");
      tabGroupsBtn.classList.add("border-transparent", "text-text-secondary");
    } else {
      contentUsers.classList.add("hidden");
      contentGroups.classList.remove("hidden");
      tabGroupsBtn.classList.add("border-accent", "text-accent");
      tabGroupsBtn.classList.remove(
        "border-transparent",
        "text-text-secondary"
      );
      tabUsersBtn.classList.remove("border-accent", "text-accent");
      tabUsersBtn.classList.add("border-transparent", "text-text-secondary");
    }
  }

  // =================================================================
  // LÓGICA DE GRUPOS
  // =================================================================

  async function loadGroups() {
    try {
      const res = await fetch("/api/groups");
      localGroups = await res.json();

      // 1. Renderiza Tabela
      groupsListBody.innerHTML = localGroups
        .map(
          (g) => `
                <tr class="hover:bg-light/30 border-b border-light/10">
                    <td class="p-3 text-text-primary">${g.name}</td>
                    <td class="p-3 text-right space-x-2">
                        <button onclick="openEditGroup(${g.id})" class="text-blue-400 hover:text-blue-300 text-xs font-medium">Editar</button>
                        <button onclick="deleteGroup(${g.id})" class="text-red-400 hover:text-red-300 text-xs font-medium">Excluir</button>
                    </td>
                </tr>
            `
        )
        .join("");

      // 2. Preenche os Selects de Grupo (Novo e Editar Usuário)
      const options = localGroups
        .map((g) => `<option value="${g.id}">${g.name}</option>`)
        .join("");
      if (userGroupSelect)
        userGroupSelect.innerHTML =
          '<option value="">Selecione...</option>' + options;
      if (editUserGroupSelect)
        editUserGroupSelect.innerHTML =
          '<option value="">Selecione...</option>' + options;
    } catch (e) {
      console.error(e);
    }
  }

  // CRIAR GRUPO
  const newGroupForm = document.getElementById("new-group-form");
  if (newGroupForm) {
    newGroupForm.onsubmit = async (e) => {
      e.preventDefault();
      const name = e.target.name.value;

      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      if (res.ok) {
        document.getElementById("new-group-modal").classList.add("hidden");
        e.target.reset();
        await loadGroups(); // Recarrega para atualizar lista e selects
      } else {
        const err = await res.json();
        alert("Erro: " + err.message);
      }
    };
  }

  // EDITAR GRUPO
  window.openEditGroup = (id) => {
    const group = localGroups.find((g) => g.id === id);
    if (!group) return;

    document.getElementById("edit-group-id").value = group.id;
    document.getElementById("edit-group-name").value = group.name;
    document.getElementById("edit-group-modal").classList.remove("hidden");
  };

  const editGroupForm = document.getElementById("edit-group-form");
  if (editGroupForm) {
    editGroupForm.onsubmit = async (e) => {
      e.preventDefault();
      const id = document.getElementById("edit-group-id").value;
      const name = document.getElementById("edit-group-name").value;

      const res = await fetch(`/api/groups/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      if (res.ok) {
        document.getElementById("edit-group-modal").classList.add("hidden");
        await loadGroups();
        // Se mudou nome de grupo, recarrega usuários também para atualizar a tabela deles
        await loadUsers();
      } else {
        alert("Erro ao atualizar grupo.");
      }
    };
  }

  // EXCLUIR GRUPO
  window.deleteGroup = async (id) => {
    if (!confirm("Tem certeza? Usuários neste grupo ficarão sem grupo."))
      return;
    const res = await fetch(`/api/groups/${id}`, { method: "DELETE" });
    if (res.ok) {
      await loadGroups();
      await loadUsers();
    } else {
      alert("Erro ao excluir.");
    }
  };

  // =================================================================
  // LÓGICA DE USUÁRIOS
  // =================================================================

  async function loadUsers() {
    try {
      const res = await fetch("/api/users");
      localUsers = await res.json();

      usersListBody.innerHTML = localUsers
        .map(
          (u) => `
                <tr class="hover:bg-light/30 border-b border-light/10">
                    <td class="p-3 font-medium text-text-primary">${
                      u.username
                    }</td>
                    <td class="p-3 capitalize text-text-secondary">${TranslateRole(
                      u.role
                    )}</td>
                    <td class="p-3 text-text-secondary">${
                      u.group_name || "-"
                    }</td>
                    <td class="p-3 text-right space-x-2">
                        <button onclick="openEditUser(${
                          u.id
                        })" class="text-blue-400 hover:text-blue-300 text-xs font-medium">Editar</button>
                        ${
                          u.role !== "admin"
                            ? `<button onclick="deleteUser(${u.id})" class="text-red-400 hover:text-red-300 text-xs font-medium">Excluir</button>`
                            : ""
                        }
                    </td>
                </tr>
            `
        )
        .join("");
    } catch (e) {
      console.error(e);
    }
  }

  function TranslateRole(role) {
    const roles = {
      admin: "Administrador",
      buyer: "Comprador",
      director: "Diretor",
      assistant: "Assistente",
      requester: "Solicitante",
    };
    return roles[role] || role;
  }

  // CRIAR USUÁRIO
  const newUserForm = document.getElementById("new-user-form");
  if (newUserForm) {
    newUserForm.onsubmit = async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const data = Object.fromEntries(formData.entries());

      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        document.getElementById("new-user-modal").classList.add("hidden");
        e.target.reset();
        await loadUsers();
      } else {
        const err = await res.json();
        alert("Erro: " + err.message);
      }
    };
  }

  // EDITAR USUÁRIO
  window.openEditUser = (id) => {
    const user = localUsers.find((u) => u.id === id);
    if (!user) return;

    document.getElementById("edit-user-id").value = user.id;
    document.getElementById("edit-user-username").value = user.username;
    document.getElementById("edit-user-role").value = user.role;

    // Seleciona o grupo correto (garantindo que o select já esteja preenchido)
    if (editUserGroupSelect) editUserGroupSelect.value = user.group_id;

    document.getElementById("edit-user-modal").classList.remove("hidden");
  };

  const editUserForm = document.getElementById("edit-user-form");
  if (editUserForm) {
    editUserForm.onsubmit = async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const data = Object.fromEntries(formData.entries());
      const id = data.id;

      const res = await fetch(`/api/users/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        document.getElementById("edit-user-modal").classList.add("hidden");
        // Limpa a senha do form para segurança
        e.target.password.value = "";
        await loadUsers();
      } else {
        const err = await res.json();
        alert("Erro: " + err.message);
      }
    };
  }

  // ... dentro do DOMContentLoaded ...

  const tabArchivedBtn = document.getElementById("tab-archived-btn");
  const contentArchived = document.getElementById("tab-archived-content");
  const archivedListBody = document.getElementById("archived-list-body");

  // ... loadGroups, loadUsers ...

  tabUsersBtn.onclick = () => switchTab("users");
  tabGroupsBtn.onclick = () => switchTab("groups");
  tabArchivedBtn.onclick = () => switchTab("archived"); // NOVO

  function switchTab(tab) {
    // Reset classes
    [tabUsersBtn, tabGroupsBtn, tabArchivedBtn].forEach((btn) => {
      btn.classList.remove("border-accent", "text-accent");
      btn.classList.add("border-transparent", "text-text-secondary");
    });
    [contentUsers, contentGroups, contentArchived].forEach((div) =>
      div.classList.add("hidden")
    );

    // Activate
    if (tab === "users") {
      contentUsers.classList.remove("hidden");
      tabUsersBtn.classList.add("border-accent", "text-accent");
      tabUsersBtn.classList.remove("border-transparent", "text-text-secondary");
    } else if (tab === "groups") {
      contentGroups.classList.remove("hidden");
      tabGroupsBtn.classList.add("border-accent", "text-accent");
      tabGroupsBtn.classList.remove(
        "border-transparent",
        "text-text-secondary"
      );
    } else if (tab === "archived") {
      contentArchived.classList.remove("hidden");
      tabArchivedBtn.classList.add("border-accent", "text-accent");
      tabArchivedBtn.classList.remove(
        "border-transparent",
        "text-text-secondary"
      );
      loadArchived(); // Carrega ao clicar
    }
  }

  // --- ARQUIVADOS ---
  async function loadArchived() {
    const res = await fetch("/api/pedidos/archived/all");
    const pedidos = await res.json();

    archivedListBody.innerHTML = pedidos
      .map(
        (p) => `
            <tr class="hover:bg-light/30 border-b border-light/10">
                <td class="p-3 font-medium text-text-primary">${p.title}</td>
                <td class="p-3">${p.solicitante_display}</td>
                <td class="p-3">${new Date(
                  p.report_generated_at
                ).toLocaleDateString()}</td>
                <td class="p-3 text-right space-x-2">
                    <a href="report.html?id=${
                      p.id
                    }" target="_blank" class="text-blue-400 hover:text-blue-300 text-xs">Ver</a>
                    <button onclick="restorePedido(${
                      p.id
                    })" class="text-green-400 hover:text-green-300 text-xs">Restaurar</button>
                </td>
            </tr>
        `
      )
      .join("");
  }

  window.restorePedido = async (id) => {
    if (!confirm("Restaurar este pedido para o Kanban?")) return;
    await fetch(`/api/pedidos/${id}/restore`, { method: "PUT" });
    loadArchived();
  };

  // EXCLUIR USUÁRIO
  window.deleteUser = async (id) => {
    if (!confirm("Tem certeza que deseja excluir este usuário?")) return;
    const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
    if (res.ok) {
      await loadUsers();
    } else {
      alert("Erro ao excluir.");
    }
  };
});

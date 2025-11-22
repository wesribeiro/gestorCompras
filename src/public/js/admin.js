document.addEventListener("DOMContentLoaded", async () => {
  // 1. VERIFICAÇÃO DE SEGURANÇA
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
  const tabColumnsBtn = document.getElementById("tab-columns-btn");
  const tabArchivedBtn = document.getElementById("tab-archived-btn");

  const contentUsers = document.getElementById("tab-users-content");
  const contentGroups = document.getElementById("tab-groups-content");
  const contentColumns = document.getElementById("tab-columns-content");
  const contentArchived = document.getElementById("tab-archived-content");

  const usersListBody = document.getElementById("users-list-body");
  const groupsListBody = document.getElementById("groups-list-body");
  const columnsListBody = document.getElementById("columns-list-body");
  const archivedListBody = document.getElementById("archived-list-body");

  const userGroupSelect = document.getElementById("user-group-select");
  const editUserGroupSelect = document.getElementById("edit-user-group-select");

  // Elementos de Busca (Arquivados)
  const searchBtn = document.getElementById("btn-search-archived");
  const searchTermInput = document.getElementById("search-term");
  const searchDateStartInput = document.getElementById("search-date-start");
  const searchDateEndInput = document.getElementById("search-date-end");

  let localGroups = [];
  let localUsers = [];
  let localColumns = [];

  // 3. INICIALIZAÇÃO
  await loadGroups();
  await loadUsers();
  await loadColumns();

  // 4. CONTROLE DE ABAS
  tabUsersBtn.onclick = () => switchTab("users");
  tabGroupsBtn.onclick = () => switchTab("groups");
  tabColumnsBtn.onclick = () => switchTab("columns");
  tabArchivedBtn.onclick = () => switchTab("archived");

  function switchTab(tab) {
    // Reset
    [tabUsersBtn, tabGroupsBtn, tabColumnsBtn, tabArchivedBtn].forEach(
      (btn) => {
        btn.classList.remove(
          "border-indigo-600",
          "text-indigo-600",
          "dark:text-indigo-400"
        );
        btn.classList.add(
          "border-transparent",
          "text-gray-500",
          "dark:text-gray-400"
        );
      }
    );
    [contentUsers, contentGroups, contentColumns, contentArchived].forEach(
      (div) => div.classList.add("hidden")
    );

    // Active Logic
    let activeBtn, activeContent;
    if (tab === "users") {
      activeBtn = tabUsersBtn;
      activeContent = contentUsers;
    } else if (tab === "groups") {
      activeBtn = tabGroupsBtn;
      activeContent = contentGroups;
    } else if (tab === "columns") {
      activeBtn = tabColumnsBtn;
      activeContent = contentColumns;
    } else if (tab === "archived") {
      activeBtn = tabArchivedBtn;
      activeContent = contentArchived;
      loadArchived();
    }

    activeContent.classList.remove("hidden");
    activeBtn.classList.remove(
      "border-transparent",
      "text-gray-500",
      "dark:text-gray-400"
    );
    activeBtn.classList.add(
      "border-indigo-600",
      "text-indigo-600",
      "dark:text-indigo-400"
    );
  }

  // =================================================================
  // LÓGICA DE GRUPOS
  // =================================================================
  async function loadGroups() {
    try {
      const res = await fetch("/api/groups");
      localGroups = await res.json();

      groupsListBody.innerHTML = localGroups
        .map(
          (g) => `
                <tr class="hover:bg-gray-50 dark:hover:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                    <td class="p-3 text-gray-900 dark:text-gray-100">${g.name}</td>
                    <td class="p-3 text-right space-x-2">
                        <button onclick="openEditGroup(${g.id})" class="text-blue-600 dark:text-blue-400 hover:underline text-xs font-medium">Editar</button>
                        <button onclick="deleteGroup(${g.id})" class="text-red-600 dark:text-red-400 hover:underline text-xs font-medium">Excluir</button>
                    </td>
                </tr>
            `
        )
        .join("");

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
        await loadGroups();
        await loadUsers();
      } else alert((await res.json()).message);
    };
  }

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
        await loadUsers();
      } else alert("Erro ao atualizar.");
    };
  }

  window.deleteGroup = async (id) => {
    if (!confirm("Tem certeza? Usuários neste grupo ficarão sem grupo."))
      return;
    const res = await fetch(`/api/groups/${id}`, { method: "DELETE" });
    if (res.ok) {
      await loadGroups();
      await loadUsers();
    } else alert("Erro ao excluir.");
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
                <tr class="hover:bg-gray-50 dark:hover:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                    <td class="p-3 font-medium text-gray-900 dark:text-gray-100">${
                      u.username
                    }</td>
                    <td class="p-3 capitalize text-gray-500 dark:text-gray-400">${TranslateRole(
                      u.role
                    )}</td>
                    <td class="p-3 text-gray-500 dark:text-gray-400">${
                      u.group_name || "-"
                    }</td>
                    <td class="p-3 text-right space-x-2">
                        <button onclick="openEditUser(${
                          u.id
                        })" class="text-blue-600 dark:text-blue-400 hover:underline text-xs font-medium">Editar</button>
                        ${
                          u.role !== "admin"
                            ? `<button onclick="deleteUser(${u.id})" class="text-red-600 dark:text-red-400 hover:underline text-xs font-medium">Excluir</button>`
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
      } else alert((await res.json()).message);
    };
  }

  window.openEditUser = (id) => {
    const user = localUsers.find((u) => u.id === id);
    if (!user) return;
    document.getElementById("edit-user-id").value = user.id;
    document.getElementById("edit-user-username").value = user.username;
    document.getElementById("edit-user-role").value = user.role;
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
        e.target.password.value = "";
        await loadUsers();
      } else alert((await res.json()).message);
    };
  }

  window.deleteUser = async (id) => {
    if (!confirm("Excluir usuário?")) return;
    const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
    if (res.ok) await loadUsers();
    else alert("Erro ao excluir.");
  };

  // =================================================================
  // LÓGICA DE FILAS (KANBAN COLUMNS)
  // =================================================================
  async function loadColumns() {
    try {
      const res = await fetch("/api/columns");
      localColumns = await res.json();
      columnsListBody.innerHTML = localColumns
        .map(
          (c) => `
                <tr class="hover:bg-gray-50 dark:hover:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                    <td class="p-3 text-gray-500">${c.position}</td>
                    <td class="p-3 font-medium text-gray-900 dark:text-gray-100 flex items-center">
                        <span class="w-3 h-3 rounded-full bg-${
                          c.color
                        }-500 mr-2"></span>${c.title}
                    </td>
                    <td class="p-3 capitalize text-gray-500">${c.color}</td>
                    <td class="p-3 text-center">${c.is_initial ? "✅" : ""}</td>
                    <td class="p-3 text-center">${
                      c.allows_completion ? "✅" : ""
                    }</td>
                    <td class="p-3 text-center">${
                      c.is_final_destination ? "🏁" : ""
                    }</td>
                    <td class="p-3 text-right space-x-2">
                        <button onclick="openEditColumn(${
                          c.id
                        })" class="text-blue-600 dark:text-blue-400 hover:underline text-xs font-medium">Editar</button>
                    </td>
                </tr>
            `
        )
        .join("");
    } catch (e) {
      console.error(e);
    }
  }

  const newColumnForm = document.getElementById("new-column-form");
  if (newColumnForm) {
    newColumnForm.onsubmit = async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const data = {
        title: formData.get("title"),
        color: formData.get("color"),
        position: formData.get("position"),
        is_initial: !!formData.get("is_initial"),
        allows_completion: !!formData.get("allows_completion"),
        is_final_destination: !!formData.get("is_final_destination"),
      };
      const res = await fetch("/api/columns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        document.getElementById("new-column-modal").classList.add("hidden");
        e.target.reset();
        await loadColumns();
      } else alert("Erro ao criar fila.");
    };
  }

  window.openEditColumn = (id) => {
    const col = localColumns.find((c) => c.id === id);
    if (!col) return;
    document.getElementById("edit-column-id").value = col.id;
    document.getElementById("edit-column-title").value = col.title;
    document.getElementById("edit-column-color").value = col.color;
    document.getElementById("edit-column-position").value = col.position;
    document.getElementById("edit-column-initial").checked =
      col.is_initial === 1;
    document.getElementById("edit-column-complete").checked =
      col.allows_completion === 1;
    document.getElementById("edit-column-final").checked =
      col.is_final_destination === 1;
    document.getElementById("edit-column-modal").classList.remove("hidden");
  };

  const editColumnForm = document.getElementById("edit-column-form");
  if (editColumnForm) {
    editColumnForm.onsubmit = async (e) => {
      e.preventDefault();
      const id = document.getElementById("edit-column-id").value;
      const data = {
        title: document.getElementById("edit-column-title").value,
        color: document.getElementById("edit-column-color").value,
        position: document.getElementById("edit-column-position").value,
        is_initial: document.getElementById("edit-column-initial").checked,
        allows_completion: document.getElementById("edit-column-complete")
          .checked,
        is_final_destination:
          document.getElementById("edit-column-final").checked,
      };
      const res = await fetch(`/api/columns/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        document.getElementById("edit-column-modal").classList.add("hidden");
        await loadColumns();
      } else alert("Erro ao atualizar fila.");
    };
  }

  // =================================================================
  // LÓGICA DE ARQUIVADOS (BUSCA AVANÇADA)
  // =================================================================
  if (searchBtn) {
    searchBtn.onclick = loadArchived;
  }

  async function loadArchived() {
    const term = searchTermInput.value;
    const dateStart = searchDateStartInput.value;
    const dateEnd = searchDateEndInput.value;

    try {
      const res = await fetch("/api/pedidos/admin/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ term, dateStart, dateEnd }),
      });
      const pedidos = await res.json();

      archivedListBody.innerHTML = pedidos
        .map(
          (p) => `
                <tr class="hover:bg-gray-50 dark:hover:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                    <td class="p-3 font-medium text-gray-900 dark:text-gray-100">
                        ${p.title}
                        ${
                          p.description
                            ? `<div class="text-xs text-gray-500 truncate max-w-xs">${p.description}</div>`
                            : ""
                        }
                    </td>
                    <td class="p-3 text-gray-600 dark:text-gray-400">${
                      p.group_name || "-"
                    }</td>
                    <td class="p-3 text-gray-600 dark:text-gray-400">${
                      p.solicitante_display || "-"
                    }</td>
                    <td class="p-3 text-gray-600 dark:text-gray-400">${new Date(
                      p.report_generated_at
                    ).toLocaleDateString()}</td>
                    <td class="p-3 text-right space-x-2">
                        <a href="report.html?id=${
                          p.id
                        }" target="_blank" class="text-blue-600 dark:text-blue-400 hover:underline text-xs font-medium">Ver</a>
                        <button onclick="restorePedido(${
                          p.id
                        })" class="text-green-600 dark:text-green-400 hover:underline text-xs font-medium">Restaurar</button>
                    </td>
                </tr>
            `
        )
        .join("");

      if (pedidos.length === 0) {
        archivedListBody.innerHTML =
          '<tr><td colspan="5" class="p-4 text-center text-gray-500">Nenhum pedido encontrado.</td></tr>';
      }
    } catch (e) {
      console.error(e);
      alert("Erro na busca.");
    }
  }

  window.restorePedido = async (id) => {
    if (!confirm("Restaurar este pedido para o Kanban?")) return;
    await fetch(`/api/pedidos/${id}/restore`, { method: "PUT" });
    loadArchived(); // Recarrega a lista
  };
});

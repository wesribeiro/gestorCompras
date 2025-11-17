document.addEventListener("DOMContentLoaded", () => {
  // Primeiro, verifica se o usuário JÁ está logado
  fetch("/api/auth/check")
    .then((res) => res.json())
    .then((data) => {
      if (data.loggedIn) {
        // Se já estiver logado, redireciona para a página principal
        window.location.href = "index.html";
      }
    })
    .catch((err) => console.error("Erro ao verificar sessão:", err));

  // Seleciona os elementos do formulário
  const loginForm = document.getElementById("login-form");
  const usernameInput = document.getElementById("username");
  const passwordInput = document.getElementById("password");
  const errorMessageDiv = document.getElementById("error-message");

  // Adiciona o listener para o evento 'submit'
  loginForm.addEventListener("submit", async (e) => {
    // Impede o comportamento padrão de recarregar a página
    e.preventDefault();

    const username = usernameInput.value;
    const password = passwordInput.value;

    // Limpa mensagens de erro anteriores
    errorMessageDiv.textContent = "";

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Sucesso! Redireciona para a página principal
        window.location.href = "index.html";
      } else {
        // Falha! Exibe a mensagem de erro vinda da API
        errorMessageDiv.textContent = data.message || "Erro desconhecido.";
      }
    } catch (error) {
      console.error("Erro ao fazer login:", error);
      errorMessageDiv.textContent = "Não foi possível conectar ao servidor.";
    }
  });
});

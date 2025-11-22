document.addEventListener("DOMContentLoaded", () => {
  // Verifica se já está logado ao abrir a página
  fetch("/api/auth/check")
    .then((res) => res.json())
    .then((data) => {
      if (data.loggedIn) {
        handleRedirect(data.user.role);
      }
    })
    .catch((err) => console.error("Erro ao verificar sessão:", err));

  const loginForm = document.getElementById("login-form");
  const usernameInput = document.getElementById("username");
  const passwordInput = document.getElementById("password");
  const errorMessageDiv = document.getElementById("error-message");

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = usernameInput.value;
    const password = passwordInput.value;

    // Feedback visual de carregamento
    const submitBtn = loginForm.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerText;
    submitBtn.disabled = true;
    submitBtn.innerText = "Entrando...";
    errorMessageDiv.textContent = "";

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Verifica se havia um redirecionamento pendente na URL
        const urlParams = new URLSearchParams(window.location.search);
        const redirectUrl = urlParams.get("redirect");

        if (redirectUrl) {
          window.location.href = redirectUrl;
        } else {
          // Redirecionamento baseado no papel (Role)
          handleRedirect(data.user.role);
        }
      } else {
        errorMessageDiv.textContent = data.message || "Credenciais inválidas.";
        submitBtn.disabled = false;
        submitBtn.innerText = originalBtnText;
      }
    } catch (error) {
      console.error("Erro ao fazer login:", error);
      errorMessageDiv.textContent = "Não foi possível conectar ao servidor.";
      submitBtn.disabled = false;
      submitBtn.innerText = originalBtnText;
    }
  });

  /**
   * Função que define para onde o usuário vai
   */
  function handleRedirect(role) {
    if (role === "requester") {
      // Solicitantes vão para o Portal Simplificado
      window.location.href = "portal.html";
    } else {
      // Compradores, Admins e Diretores vão para o Kanban
      window.location.href = "index.html";
    }
  }
});

const express = require("express");
const bcrypt = require("bcrypt");
const db = require("../database/database"); // Nosso conector do banco

const router = express.Router();

/**
 * Rota de Login: POST /api/auth/login
 * Recebe { username, password } no corpo.
 */
router.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res
      .status(400)
      .json({ message: "Usuário e senha são obrigatórios." });
  }

  const sql = `SELECT * FROM Users WHERE username = ?`;

  db.get(sql, [username], async (err, user) => {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ message: "Erro interno do servidor." });
    }

    // Caso 1: Usuário não encontrado
    if (!user) {
      // Usamos uma mensagem genérica para evitar "user enumeration"
      return res.status(401).json({ message: "Credenciais inválidas." });
    }

    // Caso 2: Usuário encontrado, comparar a senha
    try {
      const match = await bcrypt.compare(password, user.password_hash);

      if (match) {
        // Senha correta! Armazenar dados do usuário na sessão.
        // ATUALIZAÇÃO v5.0: Adicionando novos campos de perfil à sessão
        req.session.user = {
          id: user.id,
          username: user.username,
          role: user.role,
          group_id: user.group_id, // Corrigido para bater com o schema (era department_id)
          display_name: user.display_name || user.username, // Fallback se nulo
          email: user.email,
          phone: user.phone,
          gender: user.gender,
        };

        // Envia dados básicos do usuário de volta para o front-end
        res.json({
          success: true,
          user: req.session.user,
        });
      } else {
        // Senha incorreta
        return res.status(401).json({ message: "Credenciais inválidas." });
      }
    } catch (compareError) {
      console.error("Erro ao comparar hash:", compareError);
      return res.status(500).json({ message: "Erro interno do servidor." });
    }
  });
});

/**
 * Rota de Logout: POST /api/auth/logout
 */
router.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res
        .status(500)
        .json({ message: "Não foi possível fazer logout." });
    }
    // Limpa o cookie do lado do cliente
    res.clearCookie("connect.sid"); // 'connect.sid' é o nome padrão do cookie do express-session
    res.json({ success: true, message: "Logout efetuado com sucesso." });
  });
});

/**
 * Rota de Verificação: GET /api/auth/check
 * Verifica se o usuário já tem uma sessão ativa.
 */
router.get("/check", (req, res) => {
  if (req.session.user) {
    res.json({
      loggedIn: true,
      user: req.session.user,
    });
  } else {
    res.json({
      loggedIn: false,
    });
  }
});

module.exports = router;

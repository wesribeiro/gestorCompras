const express = require("express");
const bcrypt = require("bcrypt");
const db = require("../database/database");
const { isAuthenticated, isAdmin } = require("../middleware/authMiddleware");

const router = express.Router();
const saltRounds = 10;

// Aplica autenticação para TODAS as rotas
router.use(isAuthenticated);

// =================================================================
// ROTAS DE PERFIL (Qualquer usuário logado)
// =================================================================

/**
 * Rota: GET /api/users/profile
 * Objetivo: Retornar os dados do perfil do usuário logado.
 */
router.get("/profile", (req, res) => {
  const userId = req.session.user.id;
  const sql = `SELECT id, username, role, group_id, display_name, email, phone, gender FROM Users WHERE id = ?`;

  db.get(sql, [userId], (err, row) => {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ message: "Erro ao buscar perfil." });
    }
    if (!row) {
      return res.status(404).json({ message: "Usuário não encontrado." });
    }
    res.json(row);
  });
});

/**
 * Rota: PUT /api/users/profile
 * Objetivo: Atualizar o próprio perfil (Nome, Email, Senha, etc).
 */
router.put("/profile", async (req, res) => {
  const userId = req.session.user.id;
  const { display_name, email, phone, gender, password } = req.body;

  try {
    // Se o usuário enviou uma nova senha, precisamos criptografá-la
    if (password && password.trim() !== "") {
      const hash = await bcrypt.hash(password, saltRounds);
      const sql = `
        UPDATE Users 
        SET display_name = ?, email = ?, phone = ?, gender = ?, password_hash = ? 
        WHERE id = ?
      `;
      db.run(
        sql,
        [display_name, email, phone, gender, hash, userId],
        function (err) {
          if (err) {
            console.error(err);
            return res
              .status(500)
              .json({ message: "Erro ao atualizar perfil." });
          }

          // Atualiza a sessão com o novo display_name (importante para a UI)
          req.session.user.display_name = display_name;
          req.session.user.email = email;

          res.json({ success: true, message: "Perfil e senha atualizados." });
        }
      );
    } else {
      // Atualização sem senha
      const sql = `
        UPDATE Users 
        SET display_name = ?, email = ?, phone = ?, gender = ? 
        WHERE id = ?
      `;
      db.run(sql, [display_name, email, phone, gender, userId], function (err) {
        if (err) {
          console.error(err);
          return res.status(500).json({ message: "Erro ao atualizar perfil." });
        }

        // Atualiza a sessão
        req.session.user.display_name = display_name;
        req.session.user.email = email;

        res.json({ success: true, message: "Perfil atualizado." });
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro no servidor." });
  }
});

// =================================================================
// ROTAS ADMINISTRATIVAS (Apenas Admin)
// =================================================================
router.use(isAdmin);

// Listar Usuários
router.get("/", (req, res) => {
  const sql = `
        SELECT u.id, u.username, u.role, u.group_id, u.display_name, u.email, g.name as group_name 
        FROM Users u
        LEFT JOIN Groups g ON u.group_id = g.id
        ORDER BY u.username ASC
    `;
  db.all(sql, [], (err, rows) => {
    if (err)
      return res.status(500).json({ message: "Erro ao buscar usuários." });
    res.json(rows);
  });
});

// Criar Usuário (Admin)
router.post("/", async (req, res) => {
  const {
    username,
    password,
    role,
    group_id,
    display_name,
    email,
    phone,
    gender,
  } = req.body;

  if (!username || !password || !role || !group_id)
    return res
      .status(400)
      .json({ message: "Campos obrigatórios: Usuário, Senha, Papel e Grupo." });

  try {
    const hash = await bcrypt.hash(password, saltRounds);

    // Se display_name não for fornecido, usa o username como fallback ou tenta formatar
    // Ex: wesley.ribeiro -> Wesley Ribeiro (lógica simples)
    let finalDisplayName = display_name;
    if (!finalDisplayName) {
      // Tenta capitalizar e remover pontos se for padrão nome.sobrenome
      finalDisplayName = username
        .split(".")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
    }

    db.run(
      `INSERT INTO Users (username, password_hash, role, group_id, display_name, email, phone, gender) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [username, hash, role, group_id, finalDisplayName, email, phone, gender],
      function (err) {
        if (err) {
          console.error(err);
          return res
            .status(500)
            .json({ message: "Erro ao criar usuário (usuário já existe?)." });
        }
        res.json({ success: true, id: this.lastID });
      }
    );
  } catch (err) {
    res.status(500).json({ message: "Erro servidor." });
  }
});

// Editar Usuário (Admin)
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const {
    username,
    role,
    group_id,
    password,
    display_name,
    email,
    phone,
    gender,
  } = req.body;

  try {
    if (password && password.trim() !== "") {
      // Com senha
      const hash = await bcrypt.hash(password, saltRounds);
      db.run(
        `UPDATE Users 
         SET username=?, role=?, group_id=?, password_hash=?, display_name=?, email=?, phone=?, gender=? 
         WHERE id=?`,
        [
          username,
          role,
          group_id,
          hash,
          display_name,
          email,
          phone,
          gender,
          id,
        ],
        function (err) {
          if (err)
            return res
              .status(500)
              .json({ message: "Erro ao atualizar usuário." });
          res.json({ success: true });
        }
      );
    } else {
      // Sem senha
      db.run(
        `UPDATE Users 
         SET username=?, role=?, group_id=?, display_name=?, email=?, phone=?, gender=? 
         WHERE id=?`,
        [username, role, group_id, display_name, email, phone, gender, id],
        function (err) {
          if (err)
            return res
              .status(500)
              .json({ message: "Erro ao atualizar usuário." });
          res.json({ success: true });
        }
      );
    }
  } catch (err) {
    res.status(500).json({ message: "Erro servidor." });
  }
});

// Excluir Usuário (Admin)
router.delete("/:id", (req, res) => {
  const { id } = req.params;
  if (parseInt(id) === req.session.user.id)
    return res.status(400).json({ message: "Não pode excluir a si mesmo." });
  db.run(`DELETE FROM Users WHERE id = ?`, [id], function (err) {
    if (err) return res.status(500).json({ message: "Erro ao excluir." });
    res.json({ success: true });
  });
});

module.exports = router;

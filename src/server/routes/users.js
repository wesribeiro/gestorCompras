const express = require("express");
const bcrypt = require("bcrypt");
const db = require("../database/database");
const { isAuthenticated, isAdmin } = require("../middleware/authMiddleware");

const router = express.Router();
const saltRounds = 10;

router.use(isAuthenticated);
router.use(isAdmin);

// Listar
router.get("/", (req, res) => {
  const sql = `
        SELECT u.id, u.username, u.role, u.group_id, g.name as group_name 
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

// Criar
router.post("/", async (req, res) => {
  const { username, password, role, group_id } = req.body;
  if (!username || !password || !role || !group_id)
    return res.status(400).json({ message: "Campos obrigatórios." });

  try {
    const hash = await bcrypt.hash(password, saltRounds);
    db.run(
      `INSERT INTO Users (username, password_hash, role, group_id) VALUES (?, ?, ?, ?)`,
      [username, hash, role, group_id],
      function (err) {
        if (err)
          return res.status(500).json({ message: "Erro ao criar usuário." });
        res.json({ success: true, id: this.lastID });
      }
    );
  } catch (err) {
    res.status(500).json({ message: "Erro servidor." });
  }
});

// Editar (NOVO)
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { username, role, group_id, password } = req.body; // Password é opcional na edição

  try {
    if (password && password.trim() !== "") {
      // Se enviou senha, atualiza tudo
      const hash = await bcrypt.hash(password, saltRounds);
      db.run(
        `UPDATE Users SET username=?, role=?, group_id=?, password_hash=? WHERE id=?`,
        [username, role, group_id, hash, id],
        function (err) {
          if (err)
            return res
              .status(500)
              .json({ message: "Erro ao atualizar usuário." });
          res.json({ success: true });
        }
      );
    } else {
      // Sem senha, atualiza só dados
      db.run(
        `UPDATE Users SET username=?, role=?, group_id=? WHERE id=?`,
        [username, role, group_id, id],
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

// Excluir
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

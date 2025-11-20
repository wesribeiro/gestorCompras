const express = require("express");
const db = require("../database/database");
const { isAuthenticated, isAdmin } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(isAuthenticated);

// Listar (Público para logados)
router.get("/", (req, res) => {
  db.all(
    "SELECT * FROM KanbanColumns ORDER BY position ASC",
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ message: err.message });
      res.json(rows);
    }
  );
});

// --- Rotas de Admin ---

// Criar Coluna
router.post("/", isAdmin, (req, res) => {
  const { title, color, position, is_initial, allows_completion } = req.body;
  const sql = `INSERT INTO KanbanColumns (title, color, position, is_initial, allows_completion) VALUES (?, ?, ?, ?, ?)`;

  db.run(
    sql,
    [
      title,
      color || "gray",
      position || 99,
      is_initial ? 1 : 0,
      allows_completion ? 1 : 0,
    ],
    function (err) {
      if (err)
        return res.status(500).json({ message: "Erro ao criar coluna." });
      res.json({ success: true, id: this.lastID });
    }
  );
});

// Editar Coluna
router.put("/:id", isAdmin, (req, res) => {
  const { id } = req.params;
  const { title, color, position, is_initial, allows_completion } = req.body;
  const sql = `UPDATE KanbanColumns SET title=?, color=?, position=?, is_initial=?, allows_completion=? WHERE id=?`;

  db.run(
    sql,
    [title, color, position, is_initial ? 1 : 0, allows_completion ? 1 : 0, id],
    function (err) {
      if (err)
        return res.status(500).json({ message: "Erro ao atualizar coluna." });
      res.json({ success: true });
    }
  );
});

// Excluir Coluna
router.delete("/:id", isAdmin, (req, res) => {
  const { id } = req.params;
  // Verifica se tem pedidos antes de excluir
  db.get(
    "SELECT count(*) as count FROM KanbanPedidos WHERE column_id = ?",
    [id],
    (err, row) => {
      if (row && row.count > 0) {
        return res
          .status(400)
          .json({
            message: "Não é possível excluir uma coluna que contém pedidos.",
          });
      }
      db.run("DELETE FROM KanbanColumns WHERE id = ?", [id], function (err) {
        if (err)
          return res.status(500).json({ message: "Erro ao excluir coluna." });
        res.json({ success: true });
      });
    }
  );
});

module.exports = router;

const express = require("express");
const db = require("../database/database");
const { isAuthenticated, isAdmin } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(isAuthenticated);

// Listar
router.get("/", (req, res) => {
  db.all(`SELECT * FROM Groups ORDER BY name ASC`, [], (err, rows) => {
    if (err) return res.status(500).json({ message: "Erro ao buscar grupos." });
    res.json(rows);
  });
});

// Criar
router.post("/", isAdmin, (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ message: "Nome é obrigatório." });

  db.run(`INSERT INTO Groups (name) VALUES (?)`, [name], function (err) {
    if (err)
      return res
        .status(500)
        .json({ message: "Erro ao criar grupo (nome duplicado?)." });
    res.json({ success: true, id: this.lastID, name });
  });
});

// Editar (NOVO)
router.put("/:id", isAdmin, (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  if (!name) return res.status(400).json({ message: "Nome é obrigatório." });

  db.run(`UPDATE Groups SET name = ? WHERE id = ?`, [name, id], function (err) {
    if (err)
      return res.status(500).json({ message: "Erro ao atualizar grupo." });
    res.json({ success: true });
  });
});

// Excluir
router.delete("/:id", isAdmin, (req, res) => {
  const { id } = req.params;
  db.run(`DELETE FROM Groups WHERE id = ?`, [id], function (err) {
    if (err) return res.status(500).json({ message: "Erro ao excluir grupo." });
    res.json({ success: true });
  });
});

module.exports = router;

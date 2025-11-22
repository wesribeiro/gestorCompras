const express = require("express");
const db = require("../database/database");
const { isAuthenticated, isAdmin } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(isAuthenticated);

// --- ROTAS PÚBLICAS (Leitura para montar o Kanban) ---

/**
 * Rota: GET /api/columns
 * Objetivo: Listar todas as colunas ativas do Kanban em ordem.
 */
router.get("/", (req, res) => {
  const sql = "SELECT * FROM KanbanColumns ORDER BY position ASC";

  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error("Erro ao buscar colunas:", err.message);
      return res
        .status(500)
        .json({ message: "Erro interno ao buscar colunas." });
    }
    res.json(rows);
  });
});

// --- ROTAS ADMINISTRATIVAS (Gestão de Filas) ---

/**
 * Rota: POST /api/columns
 * Objetivo: Criar uma nova fila no Kanban.
 */
router.post("/", isAdmin, (req, res) => {
  const {
    title,
    color,
    position,
    is_initial,
    allows_completion,
    is_final_destination,
  } = req.body;

  if (!title) {
    return res.status(400).json({ message: "O nome da fila é obrigatório." });
  }

  const sql = `
        INSERT INTO KanbanColumns (title, color, position, is_initial, allows_completion, is_final_destination) 
        VALUES (?, ?, ?, ?, ?, ?)
    `;

  db.run(
    sql,
    [
      title,
      color || "gray",
      position || 99,
      is_initial ? 1 : 0,
      allows_completion ? 1 : 0,
      is_final_destination ? 1 : 0, // NOVO: Define se é fila de finalizados (bloqueada)
    ],
    function (err) {
      if (err) {
        console.error("Erro ao criar coluna:", err.message);
        return res.status(500).json({ message: "Erro ao criar coluna." });
      }
      res.status(201).json({ success: true, id: this.lastID });
    }
  );
});

/**
 * Rota: PUT /api/columns/:id
 * Objetivo: Editar uma fila existente.
 */
router.put("/:id", isAdmin, (req, res) => {
  const { id } = req.params;
  const {
    title,
    color,
    position,
    is_initial,
    allows_completion,
    is_final_destination,
  } = req.body;

  const sql = `
        UPDATE KanbanColumns 
        SET title=?, color=?, position=?, is_initial=?, allows_completion=?, is_final_destination=? 
        WHERE id=?
    `;

  db.run(
    sql,
    [
      title,
      color,
      position,
      is_initial ? 1 : 0,
      allows_completion ? 1 : 0,
      is_final_destination ? 1 : 0,
      id,
    ],
    function (err) {
      if (err) {
        console.error("Erro ao atualizar coluna:", err.message);
        return res.status(500).json({ message: "Erro ao atualizar coluna." });
      }
      res.json({ success: true });
    }
  );
});

/**
 * Rota: DELETE /api/columns/:id
 * Objetivo: Excluir uma fila.
 */
router.delete("/:id", isAdmin, (req, res) => {
  const { id } = req.params;

  // 1. Verificar se há pedidos nesta coluna antes de excluir
  db.get(
    "SELECT count(*) as count FROM KanbanPedidos WHERE column_id = ?",
    [id],
    (err, row) => {
      if (err) {
        return res
          .status(500)
          .json({ message: "Erro ao verificar dependências." });
      }

      if (row && row.count > 0) {
        return res
          .status(400)
          .json({
            message:
              "Não é possível excluir uma fila que contém pedidos. Mova-os primeiro.",
          });
      }

      // 2. Excluir a coluna
      db.run("DELETE FROM KanbanColumns WHERE id = ?", [id], function (err) {
        if (err) {
          console.error("Erro ao excluir coluna:", err.message);
          return res.status(500).json({ message: "Erro ao excluir coluna." });
        }
        res.json({ success: true });
      });
    }
  );
});

module.exports = router;

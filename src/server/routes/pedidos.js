const express = require("express");
const db = require("../database/database");
const {
  isAuthenticated,
  isBuyerOrAdmin,
} = require("../middleware/authMiddleware");

// 1. DECLARAÇÃO DO ROUTER (Deve vir antes das rotas)
const router = express.Router();

// Aplica segurança em todas as rotas
router.use(isAuthenticated);

// -----------------------------------------------------------------
// 2. LISTAGEM E CRIAÇÃO (KANBAN)
// -----------------------------------------------------------------

/**
 * Rota: GET /api/pedidos
 * Objetivo: Buscar todos os pedidos ATIVOS para o Kanban.
 */
router.get("/", (req, res) => {
  const sql = `
        SELECT 
            kp.id, 
            kp.title, 
            kp.column_id, 
            kp.priority,
            kp.task_created_at,
            kp.purchase_link,
            kp.solicitante_name,
            kp.purchased_price,
            kp.purchased_quantity,
            kp.report_generated_at,
            
            kc.title as column_title,
            kc.color as column_color,
            kc.allows_completion,
            
            kp.group_id,
            g.name as group_name,
            
            COALESCE(kp.solicitante_name, u_requester.username, u_creator.username) as solicitante_display,

            -- Subquery para pegar a última nota
            (SELECT content FROM PedidoNotes WHERE pedido_id = kp.id ORDER BY created_at DESC LIMIT 1) as last_note
            
        FROM KanbanPedidos kp
        LEFT JOIN KanbanColumns kc ON kp.column_id = kc.id
        LEFT JOIN Groups g ON kp.group_id = g.id
        LEFT JOIN Users u_creator ON kp.created_by_user_id = u_creator.id
        LEFT JOIN PurchaseRequests pr ON kp.request_id = pr.id
        LEFT JOIN Users u_requester ON pr.requester_id = u_requester.id
        
        WHERE kp.lifecycle_status = 'active' -- Apenas pedidos ativos no Kanban
        ORDER BY kp.task_created_at DESC
    `;

  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error("Erro ao buscar pedidos:", err.message);
      return res.status(500).json({ message: "Erro interno do servidor." });
    }
    res.json(rows);
  });
});

/**
 * Rota: POST /api/pedidos/create
 */
router.post("/create", (req, res) => {
  const { title, group_id, priority, solicitante_name } = req.body;
  const userId = req.session.user.id;

  if (!title || !group_id) {
    return res
      .status(400)
      .json({ message: "Título e Grupo são obrigatórios." });
  }

  db.serialize(() => {
    // Busca a coluna inicial dinamicamente
    db.get(
      "SELECT id FROM KanbanColumns WHERE is_initial = 1 LIMIT 1",
      [],
      (err, col) => {
        if (err || !col) {
          return res
            .status(500)
            .json({ message: "Erro: Nenhuma coluna inicial configurada." });
        }

        const insertSql = `
                INSERT INTO KanbanPedidos (title, column_id, group_id, priority, solicitante_name, created_by_user_id, lifecycle_status)
                VALUES (?, ?, ?, ?, ?, ?, 'active')
            `;

        db.run(
          insertSql,
          [
            title,
            col.id,
            group_id,
            priority || "baixa",
            solicitante_name,
            userId,
          ],
          function (err) {
            if (err)
              return res.status(500).json({ message: "Erro ao criar pedido." });

            const newPedidoId = this.lastID;
            db.run(
              `INSERT INTO AuditLog (user_id, action, target_type, target_id) VALUES (?, ?, 'Pedido', ?)`,
              [userId, `Lançou pedido #${newPedidoId}`, newPedidoId]
            );

            res.status(201).json({ success: true, newPedidoId: newPedidoId });
          }
        );
      }
    );
  });
});

// -----------------------------------------------------------------
// 3. GESTÃO E MOVIMENTAÇÃO
// -----------------------------------------------------------------

router.put("/:id/move", (req, res) => {
  const pedidoId = req.params.id;
  const { newColumnId } = req.body;
  const userId = req.session.user.id;

  if (!newColumnId)
    return res.status(400).json({ message: "ID da coluna inválido." });

  db.run(
    `UPDATE KanbanPedidos SET column_id = ? WHERE id = ?`,
    [newColumnId, pedidoId],
    function (err) {
      if (err)
        return res.status(500).json({ message: "Erro ao mover pedido." });

      // Log opcional da movimentação
      db.get(
        "SELECT title FROM KanbanColumns WHERE id = ?",
        [newColumnId],
        (err, col) => {
          if (col) {
            db.run(
              `INSERT INTO AuditLog (user_id, action, target_type, target_id) VALUES (?, ?, 'Pedido', ?)`,
              [
                userId,
                `Moveu pedido #${pedidoId} para '${col.title}'`,
                pedidoId,
              ]
            );
          }
        }
      );

      res.json({ success: true });
    }
  );
});

router.put("/:id/finalize", (req, res) => {
  const { id } = req.params;
  const { purchase_link, purchased_price, purchased_quantity } = req.body;
  const userId = req.session.user.id;

  const updateSql = `
        UPDATE KanbanPedidos 
        SET purchase_link = ?, purchased_price = ?, purchased_quantity = ?, report_generated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `;

  db.run(
    updateSql,
    [purchase_link, purchased_price, purchased_quantity, id],
    function (err) {
      if (err)
        return res.status(500).json({ message: "Erro ao salvar dados." });

      db.run(
        `INSERT INTO AuditLog (user_id, action, target_type, target_id) VALUES (?, ?, 'Pedido', ?)`,
        [userId, `Atualizou dados de compra do pedido #${id}`, id]
      );

      res.json({ success: true });
    }
  );
});

router.put("/:id/deliver", (req, res) => {
  const { id } = req.params;
  const userId = req.session.user.id;

  // Marca como concluído (sai do Kanban principal, vai para Arquivo)
  db.run(
    `UPDATE KanbanPedidos SET lifecycle_status = 'completed' WHERE id = ?`,
    [id],
    function (err) {
      if (err) return res.status(500).json({ message: "Erro ao entregar." });

      db.run(
        `INSERT INTO AuditLog (user_id, action, target_type, target_id) VALUES (?, ?, 'Pedido', ?)`,
        [userId, `Entregou e arquivou pedido #${id}`, id]
      );

      res.json({ success: true });
    }
  );
});

// -----------------------------------------------------------------
// 4. CRUD GERAL (EDITAR/EXCLUIR)
// -----------------------------------------------------------------

router.delete("/:id", isBuyerOrAdmin, (req, res) => {
  const { id } = req.params;
  const userId = req.session.user.id;

  db.run(`DELETE FROM KanbanPedidos WHERE id = ?`, [id], function (err) {
    if (err)
      return res.status(500).json({ message: "Erro ao excluir pedido." });

    db.run(
      `INSERT INTO AuditLog (user_id, action, target_type, target_id) VALUES (?, ?, 'Pedido', ?)`,
      [userId, `Excluiu pedido #${id}`, id]
    );

    res.json({ success: true });
  });
});

router.put("/:id", isBuyerOrAdmin, (req, res) => {
  const { id } = req.params;
  const { title, group_id, priority, solicitante_name } = req.body;

  const sql = `
        UPDATE KanbanPedidos 
        SET title = ?, group_id = ?, priority = ?, solicitante_name = ?
        WHERE id = ?
    `;

  db.run(
    sql,
    [title, group_id, priority, solicitante_name, id],
    function (err) {
      if (err)
        return res.status(500).json({ message: "Erro ao atualizar pedido." });
      res.json({ success: true });
    }
  );
});

// -----------------------------------------------------------------
// 5. DETALHES E SUB-RECURSOS
// -----------------------------------------------------------------

router.get("/:id", (req, res) => {
  const { id } = req.params;
  const sql = `
        SELECT 
            kp.*, 
            kc.title as column_title,
            g.name as group_name,
            COALESCE(kp.solicitante_name, u_requester.username, u_creator.username) as solicitante_display
        FROM KanbanPedidos kp
        LEFT JOIN KanbanColumns kc ON kp.column_id = kc.id
        LEFT JOIN Groups g ON kp.group_id = g.id
        LEFT JOIN Users u_creator ON kp.created_by_user_id = u_creator.id
        LEFT JOIN PurchaseRequests pr ON kp.request_id = pr.id
        LEFT JOIN Users u_requester ON pr.requester_id = u_requester.id
        WHERE kp.id = ?
    `;
  db.get(sql, [id], (err, row) => {
    if (err) return res.status(500).json({ message: "Erro interno." });
    if (!row) return res.status(404).json({ message: "Não encontrado." });
    res.json(row);
  });
});

router.get("/:id/notes", (req, res) => {
  const sql = `SELECT pn.id, pn.content, pn.created_at, u.username FROM PedidoNotes pn JOIN Users u ON pn.user_id = u.id WHERE pn.pedido_id = ? ORDER BY pn.created_at DESC`;
  db.all(sql, [req.params.id], (err, rows) => res.json(rows || []));
});

router.post("/:id/notes", (req, res) => {
  db.run(
    `INSERT INTO PedidoNotes (pedido_id, user_id, content) VALUES (?, ?, ?)`,
    [req.params.id, req.session.user.id, req.body.content],
    function (err) {
      if (err) return res.status(500).json({ message: "Erro ao criar nota." });
      db.get(
        `SELECT pn.id, pn.content, pn.created_at, u.username FROM PedidoNotes pn JOIN Users u ON pn.user_id = u.id WHERE pn.id = ?`,
        [this.lastID],
        (err, row) => res.json(row)
      );
    }
  );
});

router.get("/:id/research", (req, res) => {
  const sql = `SELECT pr.id, pr.content, pr.created_at, u.username FROM PedidoResearch pr JOIN Users u ON pr.user_id = u.id WHERE pr.pedido_id = ? ORDER BY pr.created_at DESC`;
  db.all(sql, [req.params.id], (err, rows) => res.json(rows || []));
});

router.post("/:id/research", (req, res) => {
  db.run(
    `INSERT INTO PedidoResearch (pedido_id, user_id, content) VALUES (?, ?, ?)`,
    [req.params.id, req.session.user.id, req.body.content],
    function (err) {
      if (err) return res.status(500).json({ message: "Erro ao criar link." });
      db.get(
        `SELECT pr.id, pr.content, pr.created_at, u.username FROM PedidoResearch pr JOIN Users u ON pr.user_id = u.id WHERE pr.id = ?`,
        [this.lastID],
        (err, row) => res.json(row)
      );
    }
  );
});

// -----------------------------------------------------------------
// 6. ROTAS DE ARQUIVO (PEDIDOS FINALIZADOS)
// -----------------------------------------------------------------

/**
 * Rota: GET /api/pedidos/archived/all
 * Objetivo: Listar pedidos finalizados/arquivados.
 */
router.get("/archived/all", isBuyerOrAdmin, (req, res) => {
  const sql = `
        SELECT 
            kp.id, kp.title, kp.task_created_at, kp.report_generated_at,
            kc.title as column_title,
            g.name as group_name,
            COALESCE(kp.solicitante_name, u_requester.username, u_creator.username) as solicitante_display
        FROM KanbanPedidos kp
        LEFT JOIN KanbanColumns kc ON kp.column_id = kc.id
        LEFT JOIN Groups g ON kp.group_id = g.id
        LEFT JOIN Users u_creator ON kp.created_by_user_id = u_creator.id
        LEFT JOIN PurchaseRequests pr ON kp.request_id = pr.id
        LEFT JOIN Users u_requester ON pr.requester_id = u_requester.id
        WHERE kp.lifecycle_status = 'completed'
        ORDER BY kp.report_generated_at DESC
    `;
  db.all(sql, [], (err, rows) => {
    if (err)
      return res.status(500).json({ message: "Erro ao buscar arquivados." });
    res.json(rows);
  });
});

/**
 * Rota: PUT /api/pedidos/:id/restore
 * Objetivo: Restaurar um pedido arquivado para o Kanban.
 */
router.put("/:id/restore", isBuyerOrAdmin, (req, res) => {
  const { id } = req.params;
  const userId = req.session.user.id;

  db.run(
    `UPDATE KanbanPedidos SET lifecycle_status = 'active' WHERE id = ?`,
    [id],
    function (err) {
      if (err)
        return res.status(500).json({ message: "Erro ao restaurar pedido." });

      db.run(
        `INSERT INTO AuditLog (user_id, action, target_type, target_id) VALUES (?, ?, 'Pedido', ?)`,
        [userId, `Restaurou pedido #${id} do arquivo`, id]
      );

      res.json({ success: true });
    }
  );
});

module.exports = router;

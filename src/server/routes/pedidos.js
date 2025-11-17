const express = require("express");
const db = require("../database/database");
const {
  isAuthenticated,
  isBuyerOrAdmin,
} = require("../middleware/authMiddleware");

const router = express.Router();

// -----------------------------------------------------------------
// APLICAÇÃO DE SEGURANÇA
// -----------------------------------------------------------------
// Aplica o middleware 'isAuthenticated' a TODAS as rotas neste arquivo.
router.use(isAuthenticated);

// -----------------------------------------------------------------
// ROTAS DE LISTAGEM E CRIAÇÃO (Já implementadas)
// -----------------------------------------------------------------

/**
 * Rota: GET /api/pedidos
 * Objetivo: Buscar todos os pedidos (cartões) do Kanban.
 */
router.get("/", (req, res) => {
  const sql = `
        SELECT 
            kp.id, 
            kp.title, 
            kp.column, 
            kp.task_created_at,
            kp.department_id,
            dep.name as department_name,
            COALESCE(u_creator.username, u_requester.username) as responsible_username
        FROM KanbanPedidos kp
        LEFT JOIN Departments dep ON kp.department_id = dep.id
        LEFT JOIN Users u_creator ON kp.created_by_user_id = u_creator.id
        LEFT JOIN PurchaseRequests pr ON kp.request_id = pr.id
        LEFT JOIN Users u_requester ON pr.requester_id = u_requester.id
        ORDER BY kp.task_created_at DESC
    `;

  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error("Erro ao buscar pedidos do Kanban:", err.message);
      return res.status(500).json({ message: "Erro interno do servidor." });
    }
    res.json(rows);
  });
});

/**
 * Rota: POST /api/pedidos/create
 * Objetivo: Criar um novo pedido diretamente no Kanban (Modo Simples).
 */
router.post("/create", (req, res) => {
  const { title, department_id } = req.body;
  const userId = req.session.user.id;
  const defaultColumn = "pedido_compra";

  if (!title || !department_id) {
    return res
      .status(400)
      .json({ message: "Título e setor são obrigatórios." });
  }

  db.serialize(() => {
    db.get(
      `SELECT setting_value FROM ApplicationSettings WHERE setting_key = 'approval_workflow_enabled'`,
      [],
      async (err, setting) => {
        if (err) {
          return res
            .status(500)
            .json({ message: "Erro ao verificar configurações." });
        }

        if (setting && setting.setting_value === "true") {
          return res
            .status(403)
            .json({
              message:
                "Criação direta bloqueada. Novos pedidos devem passar pelo fluxo de aprovação.",
            });
        }

        const insertSql = `
                INSERT INTO KanbanPedidos (title, column, department_id, created_by_user_id, request_id)
                VALUES (?, ?, ?, ?, NULL)
            `;

        db.run(
          insertSql,
          [title, defaultColumn, department_id, userId],
          function (err) {
            if (err) {
              console.error("Erro ao criar pedido:", err.message);
              return res.status(500).json({ message: "Erro ao criar pedido." });
            }

            const newPedidoId = this.lastID;

            const auditAction = `Criou o pedido #${newPedidoId} ('${title}') no Modo Simples.`;
            const auditSql = `
                    INSERT INTO AuditLog (user_id, action, target_type, target_id)
                    VALUES (?, ?, ?, ?)
                `;

            db.run(
              auditSql,
              [userId, auditAction, "Pedido", newPedidoId],
              (auditErr) => {
                if (auditErr) {
                  console.error(
                    "Erro ao salvar no log de auditoria:",
                    auditErr.message
                  );
                }
                res
                  .status(201)
                  .json({ success: true, newPedidoId: newPedidoId });
              }
            );
          }
        );
      }
    );
  });
});

/**
 * Rota: PUT /api/pedidos/:id/move
 * Objetivo: Mover um cartão para uma nova coluna.
 */
router.put("/:id/move", (req, res) => {
  const pedidoId = req.params.id;
  const { newColumn } = req.body;
  const userId = req.session.user.id;

  const validColumns = [
    "pedido_compra",
    "em_cotacao",
    "estagnado",
    "compra_efetuada",
  ];
  if (!validColumns.includes(newColumn)) {
    return res.status(400).json({ message: "Coluna de destino inválida." });
  }

  db.serialize(() => {
    const updateSql = `UPDATE KanbanPedidos SET column = ? WHERE id = ?`;

    db.run(updateSql, [newColumn, pedidoId], function (err) {
      if (err) {
        console.error("Erro ao mover pedido:", err.message);
        return res.status(500).json({ message: "Erro ao mover pedido." });
      }
      if (this.changes === 0) {
        return res.status(404).json({ message: "Pedido não encontrado." });
      }

      const auditAction = `Moveu o pedido #${pedidoId} para a coluna '${newColumn}'.`;
      const auditSql = `
                INSERT INTO AuditLog (user_id, action, target_type, target_id)
                VALUES (?, ?, ?, ?)
            `;

      db.run(
        auditSql,
        [userId, auditAction, "Pedido", pedidoId],
        (auditErr) => {
          if (auditErr) {
            console.error(
              "Erro ao salvar no log de auditoria:",
              auditErr.message
            );
            return res
              .status(500)
              .json({
                message: "Pedido movido, mas falha ao registrar auditoria.",
              });
          }

          res.json({
            success: true,
            message: `Pedido ${pedidoId} movido para ${newColumn}.`,
          });
        }
      );
    });
  });
});

// -----------------------------------------------------------------
// NOVAS ROTAS (ETAPA 13) - DETALHES DO PEDIDO (MODAL)
// -----------------------------------------------------------------

/**
 * Rota: GET /api/pedidos/:id
 * Objetivo: Buscar os dados detalhados de UM pedido.
 */
router.get("/:id", (req, res) => {
  const { id } = req.params;
  const sql = `
        SELECT 
            kp.*, 
            dep.name as department_name,
            COALESCE(u_creator.username, u_requester.username) as responsible_username
        FROM KanbanPedidos kp
        LEFT JOIN Departments dep ON kp.department_id = dep.id
        LEFT JOIN Users u_creator ON kp.created_by_user_id = u_creator.id
        LEFT JOIN PurchaseRequests pr ON kp.request_id = pr.id
        LEFT JOIN Users u_requester ON pr.requester_id = u_requester.id
        WHERE kp.id = ?
    `;
  db.get(sql, [id], (err, row) => {
    if (err) {
      console.error("Erro ao buscar detalhes do pedido:", err.message);
      return res.status(500).json({ message: "Erro interno do servidor." });
    }
    if (!row) {
      return res.status(404).json({ message: "Pedido não encontrado." });
    }
    res.json(row);
  });
});

/**
 * Rota: GET /api/pedidos/:id/notes
 * Objetivo: Buscar as notas de status de um pedido.
 */
router.get("/:id/notes", (req, res) => {
  const { id } = req.params;
  const sql = `
        SELECT pn.id, pn.content, pn.created_at, u.username 
        FROM PedidoNotes pn
        JOIN Users u ON pn.user_id = u.id
        WHERE pn.pedido_id = ?
        ORDER BY pn.created_at DESC
    `;
  db.all(sql, [id], (err, rows) => {
    if (err) {
      console.error("Erro ao buscar notas do pedido:", err.message);
      return res.status(500).json({ message: "Erro interno do servidor." });
    }
    res.json(rows);
  });
});

/**
 * Rota: POST /api/pedidos/:id/notes
 * Objetivo: Adicionar uma nova nota de status a um pedido.
 * Recebe: { content: '...' }
 * O backend adiciona o timestamp e o user_id.
 */
router.post("/:id/notes", (req, res) => {
  const { id } = req.params; // pedido_id
  const { content } = req.body;
  const userId = req.session.user.id;

  if (!content) {
    return res
      .status(400)
      .json({ message: "O conteúdo da nota é obrigatório." });
  }

  const sql = `INSERT INTO PedidoNotes (pedido_id, user_id, content) VALUES (?, ?, ?)`;

  db.run(sql, [id, userId, content], function (err) {
    if (err) {
      console.error("Erro ao adicionar nota:", err.message);
      return res.status(500).json({ message: "Erro ao adicionar nota." });
    }

    // Retorna a nota recém-criada (com timestamp e username)
    const newNoteId = this.lastID;
    const getSql = `
            SELECT pn.id, pn.content, pn.created_at, u.username 
            FROM PedidoNotes pn
            JOIN Users u ON pn.user_id = u.id
            WHERE pn.id = ?
        `;
    db.get(getSql, [newNoteId], (err, row) => {
      if (err) {
        return res
          .status(500)
          .json({ message: "Nota criada, mas erro ao buscá-la." });
      }
      res.status(201).json(row); // Retorna a nota completa
    });
  });
});

/**
 * Rota: GET /api/pedidos/:id/research
 * Objetivo: Buscar os links de pesquisa de um pedido.
 */
router.get("/:id/research", (req, res) => {
  const { id } = req.params;
  const sql = `
        SELECT pr.id, pr.content, pr.created_at, u.username 
        FROM PedidoResearch pr
        JOIN Users u ON pr.user_id = u.id
        WHERE pr.pedido_id = ?
        ORDER BY pr.created_at DESC
    `;
  db.all(sql, [id], (err, rows) => {
    if (err) {
      console.error("Erro ao buscar links de pesquisa:", err.message);
      return res.status(500).json({ message: "Erro interno do servidor." });
    }
    res.json(rows);
  });
});

/**
 * Rota: POST /api/pedidos/:id/research
 * Objetivo: Adicionar um novo link/nota de pesquisa.
 * Recebe: { content: '...' }
 */
router.post("/:id/research", (req, res) => {
  const { id } = req.params; // pedido_id
  const { content } = req.body;
  const userId = req.session.user.id;

  if (!content) {
    return res
      .status(400)
      .json({ message: "O conteúdo da pesquisa é obrigatório." });
  }

  const sql = `INSERT INTO PedidoResearch (pedido_id, user_id, content) VALUES (?, ?, ?)`;

  db.run(sql, [id, userId, content], function (err) {
    if (err) {
      console.error("Erro ao adicionar pesquisa:", err.message);
      return res.status(500).json({ message: "Erro ao adicionar pesquisa." });
    }

    // Retorna o item recém-criado
    const newResearchId = this.lastID;
    const getSql = `
            SELECT pr.id, pr.content, pr.created_at, u.username 
            FROM PedidoResearch pr
            JOIN Users u ON pr.user_id = u.id
            WHERE pr.id = ?
        `;
    db.get(getSql, [newResearchId], (err, row) => {
      if (err) {
        return res
          .status(500)
          .json({ message: "Item de pesquisa criado, mas erro ao buscá-lo." });
      }
      res.status(201).json(row);
    });
  });
});

/**
 * Rota: PUT /api/pedidos/:id/finalize
 * Objetivo: Finalizar um pedido, adicionando dados da compra.
 * IMPLEMENTA REGRA DE NEGÓCIO: Só permite se a coluna for 'estagnado' ou 'compra_efetuada'.
 */
router.put("/:id/finalize", (req, res) => {
  const { id } = req.params;
  const { purchase_link, purchased_price, purchased_quantity } = req.body;
  const userId = req.session.user.id;

  // 1. Buscar o pedido para verificar a sua coluna
  db.get(
    `SELECT column FROM KanbanPedidos WHERE id = ?`,
    [id],
    (err, pedido) => {
      if (err) {
        console.error("Erro ao buscar pedido para finalizar:", err.message);
        return res.status(500).json({ message: "Erro interno do servidor." });
      }
      if (!pedido) {
        return res.status(404).json({ message: "Pedido não encontrado." });
      }

      // 2. APLICAÇÃO DA REGRA DE NEGÓCIO
      const allowedColumns = ["estagnado", "compra_efetuada"];
      if (!allowedColumns.includes(pedido.column)) {
        return res.status(403).json({
          message: `Finalização não permitida. O pedido deve estar na coluna 'Estagnado' ou 'Compra efetuada' (atualmente está em '${pedido.column}').`,
        });
      }

      // 3. Validação dos inputs
      if (!purchase_link || !purchased_price || !purchased_quantity) {
        return res
          .status(400)
          .json({
            message:
              "Link de compra, preço e quantidade são obrigatórios para finalizar.",
          });
      }

      // 4. Atualizar o pedido no banco
      const updateSql = `
            UPDATE KanbanPedidos 
            SET purchase_link = ?, purchased_price = ?, purchased_quantity = ?, report_generated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `;

      db.run(
        updateSql,
        [purchase_link, purchased_price, purchased_quantity, id],
        function (err) {
          if (err) {
            console.error("Erro ao finalizar pedido:", err.message);
            return res
              .status(500)
              .json({ message: "Erro ao salvar finalização." });
          }

          // 5. Registrar no Log de Auditoria
          const auditAction = `Finalizou o pedido #${id} com preço ${purchased_price}, Qtd ${purchased_quantity}.`;
          const auditSql = `INSERT INTO AuditLog (user_id, action, target_type, target_id) VALUES (?, ?, ?, ?)`;

          db.run(auditSql, [userId, auditAction, "Pedido", id], (auditErr) => {
            if (auditErr) {
              console.error(
                "Erro ao salvar auditoria de finalização:",
                auditErr.message
              );
            }
          });

          res.json({
            success: true,
            message: "Pedido finalizado com sucesso.",
          });
        }
      );
    }
  );
});

module.exports = router;

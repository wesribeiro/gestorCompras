const express = require("express");
const db = require("../database/database");
const {
  isAuthenticated,
  isBuyerOrAdmin,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.use(isAuthenticated);

// -----------------------------------------------------------------
// ROTAS DO SOLICITANTE (Quem pede)
// -----------------------------------------------------------------

/**
 * Rota: POST /api/requests
 * Objetivo: Criar uma nova solicitação de compra (Rascunho para aprovação).
 */
router.post("/", (req, res) => {
  const { title, description, reference_links, justification } = req.body;
  const requesterId = req.session.user.id;

  if (!title) {
    return res
      .status(400)
      .json({ message: "O título do pedido é obrigatório." });
  }

  const sql = `
        INSERT INTO PurchaseRequests (requester_id, title, description, reference_links, justification, status)
        VALUES (?, ?, ?, ?, ?, 'pending_buyer_review')
    `;

  db.run(
    sql,
    [requesterId, title, description, reference_links, justification],
    function (err) {
      if (err) {
        console.error("Erro ao criar solicitação:", err.message);
        return res.status(500).json({ message: "Erro ao enviar solicitação." });
      }
      res.status(201).json({ success: true, id: this.lastID });
    }
  );
});

/**
 * Rota: GET /api/requests/my
 * Objetivo: Listar as solicitações do próprio usuário logado.
 */
router.get("/my", (req, res) => {
  const requesterId = req.session.user.id;
  const sql = `
        SELECT * FROM PurchaseRequests 
        WHERE requester_id = ? 
        ORDER BY created_at DESC
    `;
  db.all(sql, [requesterId], (err, rows) => {
    if (err)
      return res
        .status(500)
        .json({ message: "Erro ao buscar suas solicitações." });
    res.json(rows);
  });
});

// -----------------------------------------------------------------
// ROTAS DO COMPRADOR (Triagem)
// -----------------------------------------------------------------

/**
 * Rota: GET /api/requests/pending
 * Objetivo: Listar todas as solicitações pendentes de revisão.
 */
router.get("/pending", isBuyerOrAdmin, (req, res) => {
  const sql = `
        SELECT pr.*, u.username as requester_name, g.name as group_name
        FROM PurchaseRequests pr
        JOIN Users u ON pr.requester_id = u.id
        JOIN Groups g ON u.group_id = g.id
        WHERE pr.status = 'pending_buyer_review'
        ORDER BY pr.created_at ASC
    `;
  db.all(sql, [], (err, rows) => {
    if (err)
      return res.status(500).json({ message: "Erro ao buscar pendências." });
    res.json(rows);
  });
});

/**
 * Rota: GET /api/requests/rejected
 * Objetivo: Listar solicitações rejeitadas (Histórico).
 */
router.get("/rejected", isBuyerOrAdmin, (req, res) => {
  const sql = `
        SELECT pr.*, u.username as requester_name, g.name as group_name
        FROM PurchaseRequests pr
        JOIN Users u ON pr.requester_id = u.id
        JOIN Groups g ON u.group_id = g.id
        WHERE pr.status = 'buyer_rejected'
        ORDER BY pr.approval_date DESC
    `;
  db.all(sql, [], (err, rows) => {
    if (err)
      return res.status(500).json({ message: "Erro ao buscar rejeitados." });
    res.json(rows);
  });
});

/**
 * Rota: PUT /api/requests/:id/approve
 * Objetivo: Aprovar solicitação -> Transforma em Card no Kanban.
 * Lógica: Usa transação para garantir consistência.
 */
router.put("/:id/approve", isBuyerOrAdmin, (req, res) => {
  const requestId = req.params.id;
  const buyerId = req.session.user.id;
  const { priority } = req.body;

  db.serialize(() => {
    // 1. Buscar dados da solicitação original
    db.get(
      `SELECT * FROM PurchaseRequests WHERE id = ?`,
      [requestId],
      (err, request) => {
        if (err || !request)
          return res
            .status(404)
            .json({ message: "Solicitação não encontrada." });

        // 2. Buscar coluna inicial do Kanban
        db.get(
          "SELECT id FROM KanbanColumns WHERE is_initial = 1 LIMIT 1",
          [],
          (err, col) => {
            if (err || !col)
              return res
                .status(500)
                .json({ message: "Erro: Sem coluna inicial no Kanban." });

            // 3. Buscar ID do grupo do solicitante
            db.get(
              "SELECT group_id, username FROM Users WHERE id = ?",
              [request.requester_id],
              (err, user) => {
                const groupId = user ? user.group_id : null;
                const solicitanteName = user ? user.username : "Desconhecido";

                // 4. Iniciar Transação
                db.run("BEGIN TRANSACTION");

                // A. Atualiza status da solicitação para Aprovado
                db.run(
                  `UPDATE PurchaseRequests SET status = 'approved', approver_id = ?, approval_date = CURRENT_TIMESTAMP WHERE id = ?`,
                  [buyerId, requestId],
                  (err) => {
                    if (err) {
                      db.run("ROLLBACK");
                      return res
                        .status(500)
                        .json({ message: "Erro ao atualizar status." });
                    }

                    // B. Cria o card no Kanban
                    const insertKanban = `
                            INSERT INTO KanbanPedidos (
                                request_id, title, description, column_id, group_id, 
                                priority, solicitante_name, created_by_user_id, lifecycle_status
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')
                        `;

                    db.run(
                      insertKanban,
                      [
                        requestId,
                        request.title,
                        request.description,
                        col.id,
                        groupId,
                        priority || "baixa",
                        solicitanteName,
                        buyerId,
                      ],
                      function (err) {
                        if (err) {
                          db.run("ROLLBACK");
                          return res
                            .status(500)
                            .json({ message: "Erro ao criar card no Kanban." });
                        }

                        // C. Log de Auditoria
                        db.run(
                          `INSERT INTO AuditLog (user_id, action, target_type, target_id) VALUES (?, ?, 'Request', ?)`,
                          [
                            buyerId,
                            `Aprovou solicitação #${requestId} -> Kanban #${this.lastID}`,
                            requestId,
                          ]
                        );

                        db.run("COMMIT");
                        res.json({
                          success: true,
                          message:
                            "Solicitação aprovada e enviada para o Kanban.",
                        });
                      }
                    );
                  }
                );
              }
            );
          }
        );
      }
    );
  });
});

/**
 * Rota: PUT /api/requests/:id/reject
 * Objetivo: Recusar solicitação.
 */
router.put("/:id/reject", isBuyerOrAdmin, (req, res) => {
  const requestId = req.params.id;
  const buyerId = req.session.user.id;
  const { reason } = req.body;

  db.run(
    `UPDATE PurchaseRequests SET status = 'buyer_rejected', approver_id = ?, approval_date = CURRENT_TIMESTAMP, approval_notes = ? WHERE id = ?`,
    [buyerId, reason || "", requestId],
    function (err) {
      if (err) return res.status(500).json({ message: "Erro ao rejeitar." });

      db.run(
        `INSERT INTO AuditLog (user_id, action, target_type, target_id) VALUES (?, ?, 'Request', ?)`,
        [
          buyerId,
          `Rejeitou solicitação #${requestId}. Motivo: ${reason}`,
          requestId,
        ]
      );

      res.json({ success: true });
    }
  );
});

/**
 * Rota: PUT /api/requests/:id/reopen
 * Objetivo: Reabrir uma solicitação rejeitada (voltar para pendente).
 */
router.put("/:id/reopen", isBuyerOrAdmin, (req, res) => {
  const requestId = req.params.id;
  const buyerId = req.session.user.id;

  db.run(
    `UPDATE PurchaseRequests SET status = 'pending_buyer_review', approver_id = NULL, approval_date = NULL WHERE id = ?`,
    [requestId],
    function (err) {
      if (err) return res.status(500).json({ message: "Erro ao reabrir." });

      db.run(
        `INSERT INTO AuditLog (user_id, action, target_type, target_id) VALUES (?, ?, 'Request', ?)`,
        [buyerId, `Reabriu solicitação #${requestId}`, requestId]
      );

      res.json({ success: true });
    }
  );
});

module.exports = router;

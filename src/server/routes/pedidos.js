const express = require("express");
const db = require("../database/database");
const {
  isAuthenticated,
  isBuyerOrAdmin,
} = require("../middleware/authMiddleware");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const router = express.Router();

// --- CONFIGURAÇÃO DO MULTER (UPLOADS) ---
// Define onde os arquivos serão salvos e com que nome
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Certifique-se de que a pasta 'src/public/uploads' existe!
    cb(null, "src/public/uploads/");
  },
  filename: function (req, file, cb) {
    // Adiciona timestamp para evitar nomes duplicados
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname);
  },
});

const upload = multer({ storage: storage });

// Aplica segurança em todas as rotas
router.use(isAuthenticated);

// -----------------------------------------------------------------
// 1. LISTAGEM E CRIAÇÃO (KANBAN)
// -----------------------------------------------------------------

router.get("/", (req, res) => {
  const sql = `
        SELECT 
            kp.*, 
            kc.title as column_title,
            kc.color as column_color,
            kc.allows_completion,
            g.name as group_name,
            u_creator.username as creator_name,
            u_requester.username as requester_user,
            COALESCE(kp.solicitante_name, u_requester.username, u_creator.username) as solicitante_display,
            CASE WHEN kp.request_id IS NOT NULL THEN 1 ELSE 0 END as is_from_portal,
            (SELECT content FROM PedidoNotes WHERE pedido_id = kp.id ORDER BY created_at DESC LIMIT 1) as last_note,
            -- Contadores para a UI
            (SELECT count(*) FROM PedidoComments WHERE pedido_id = kp.id) as comments_count,
            (SELECT count(*) FROM PedidoAttachments WHERE pedido_id = kp.id) as attachments_count
        FROM KanbanPedidos kp
        LEFT JOIN KanbanColumns kc ON kp.column_id = kc.id
        LEFT JOIN Groups g ON kp.group_id = g.id
        LEFT JOIN Users u_creator ON kp.created_by_user_id = u_creator.id
        LEFT JOIN PurchaseRequests pr ON kp.request_id = pr.id
        LEFT JOIN Users u_requester ON pr.requester_id = u_requester.id
        WHERE kp.lifecycle_status = 'active'
        ORDER BY kp.task_created_at DESC
    `;

  db.all(sql, [], (err, rows) => {
    if (err)
      return res.status(500).json({ message: "Erro ao buscar pedidos." });
    res.json(rows);
  });
});

router.post("/create", (req, res) => {
  const { title, description, group_id, priority, solicitante_name } = req.body;
  const userId = req.session.user.id;

  if (!title || !group_id) {
    return res
      .status(400)
      .json({ message: "Título e Grupo são obrigatórios." });
  }

  db.serialize(() => {
    db.get(
      "SELECT id FROM KanbanColumns WHERE is_initial = 1 LIMIT 1",
      [],
      (err, col) => {
        if (err || !col)
          return res.status(500).json({ message: "Erro: Sem coluna inicial." });

        const insertSql = `
                INSERT INTO KanbanPedidos (
                    title, description, column_id, group_id, priority, 
                    solicitante_name, created_by_user_id, lifecycle_status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, 'active')
            `;

        db.run(
          insertSql,
          [
            title,
            description || "",
            col.id,
            group_id,
            priority || "baixa",
            solicitante_name,
            userId,
          ],
          function (err) {
            if (err)
              return res.status(500).json({ message: "Erro ao criar pedido." });

            const newId = this.lastID;
            db.run(
              `INSERT INTO AuditLog (user_id, action, target_type, target_id) VALUES (?, ?, 'Pedido', ?)`,
              [userId, `Lançou pedido manual #${newId}`, newId]
            );

            res.status(201).json({ success: true, newPedidoId: newId });
          }
        );
      }
    );
  });
});

// -----------------------------------------------------------------
// 2. DETALHES E GESTÃO
// -----------------------------------------------------------------

router.get("/:id", (req, res) => {
  const sql = `
        SELECT 
            kp.*, 
            kc.title as column_title,
            g.name as group_name,
            u_creator.username as creator_name,
            u_requester.username as requester_user,
            COALESCE(kp.solicitante_name, u_requester.username, u_creator.username) as solicitante_display,
            CASE WHEN kp.request_id IS NOT NULL THEN 1 ELSE 0 END as is_from_portal
        FROM KanbanPedidos kp
        LEFT JOIN KanbanColumns kc ON kp.column_id = kc.id
        LEFT JOIN Groups g ON kp.group_id = g.id
        LEFT JOIN Users u_creator ON kp.created_by_user_id = u_creator.id
        LEFT JOIN PurchaseRequests pr ON kp.request_id = pr.id
        LEFT JOIN Users u_requester ON pr.requester_id = u_requester.id
        WHERE kp.id = ?
    `;
  db.get(sql, [req.params.id], (err, row) => {
    if (err || !row)
      return res.status(404).json({ message: "Não encontrado." });
    res.json(row);
  });
});

router.put("/:id/move", (req, res) => {
  const { newColumnId } = req.body;
  db.run(
    `UPDATE KanbanPedidos SET column_id = ? WHERE id = ?`,
    [newColumnId, req.params.id],
    (err) => {
      if (err) return res.status(500).json({ message: "Erro ao mover." });
      res.json({ success: true });
    }
  );
});

router.put("/:id/finalize", (req, res) => {
  const { purchase_link, purchased_price, purchased_quantity } = req.body;
  const sql = `UPDATE KanbanPedidos SET purchase_link=?, purchased_price=?, purchased_quantity=?, report_generated_at=CURRENT_TIMESTAMP WHERE id=?`;
  db.run(
    sql,
    [purchase_link, purchased_price, purchased_quantity, req.params.id],
    (err) => {
      if (err) return res.status(500).json({ message: "Erro ao salvar." });
      res.json({ success: true });
    }
  );
});

router.put("/:id/deliver", (req, res) => {
  db.run(
    `UPDATE KanbanPedidos SET lifecycle_status = 'completed' WHERE id = ?`,
    [req.params.id],
    (err) => {
      if (err) return res.status(500).json({ message: "Erro ao entregar." });
      res.json({ success: true });
    }
  );
});

router.put("/:id", isBuyerOrAdmin, (req, res) => {
  const { title, description, group_id, priority, solicitante_name } = req.body;
  const sql = `UPDATE KanbanPedidos SET title=?, description=?, group_id=?, priority=?, solicitante_name=? WHERE id=?`;
  db.run(
    sql,
    [title, description, group_id, priority, solicitante_name, req.params.id],
    (err) => {
      if (err) return res.status(500).json({ message: "Erro ao atualizar." });
      res.json({ success: true });
    }
  );
});

router.delete("/:id", isBuyerOrAdmin, (req, res) => {
  db.run(`DELETE FROM KanbanPedidos WHERE id = ?`, [req.params.id], (err) => {
    if (err) return res.status(500).json({ message: "Erro ao excluir." });
    res.json({ success: true });
  });
});

// -----------------------------------------------------------------
// 3. SUB-RECURSOS EXISTENTES (Notas, Links)
// -----------------------------------------------------------------

router.get("/:id/notes", (req, res) => {
  db.all(
    `SELECT pn.id, pn.content, pn.created_at, u.username FROM PedidoNotes pn JOIN Users u ON pn.user_id = u.id WHERE pn.pedido_id = ? ORDER BY pn.created_at DESC`,
    [req.params.id],
    (err, r) => res.json(r || [])
  );
});
router.post("/:id/notes", (req, res) => {
  db.run(
    `INSERT INTO PedidoNotes (pedido_id, user_id, content) VALUES (?, ?, ?)`,
    [req.params.id, req.session.user.id, req.body.content],
    function (err) {
      if (err) return res.status(500).json({ message: "Erro" });
      db.get(
        `SELECT pn.*, u.username FROM PedidoNotes pn JOIN Users u ON pn.user_id=u.id WHERE pn.id=?`,
        [this.lastID],
        (e, r) => res.json(r)
      );
    }
  );
});

router.get("/:id/research", (req, res) => {
  db.all(
    `SELECT pr.id, pr.content, pr.created_at, u.username FROM PedidoResearch pr JOIN Users u ON pr.user_id = u.id WHERE pr.pedido_id = ? ORDER BY pr.created_at DESC`,
    [req.params.id],
    (err, r) => res.json(r || [])
  );
});
router.post("/:id/research", (req, res) => {
  db.run(
    `INSERT INTO PedidoResearch (pedido_id, user_id, content) VALUES (?, ?, ?)`,
    [req.params.id, req.session.user.id, req.body.content],
    function (err) {
      if (err) return res.status(500).json({ message: "Erro" });
      db.get(
        `SELECT pr.*, u.username FROM PedidoResearch pr JOIN Users u ON pr.user_id=u.id WHERE pr.id=?`,
        [this.lastID],
        (e, r) => res.json(r)
      );
    }
  );
});

// -----------------------------------------------------------------
// 4. NOVOS SUB-RECURSOS v4.5 (CHAT E ANEXOS)
// -----------------------------------------------------------------

// --- COMENTÁRIOS (CHAT) ---
router.get("/:id/comments", (req, res) => {
  const sql = `
        SELECT pc.id, pc.content, pc.created_at, u.username, u.role 
        FROM PedidoComments pc 
        JOIN Users u ON pc.user_id = u.id 
        WHERE pc.pedido_id = ? 
        ORDER BY pc.created_at ASC
    `;
  db.all(sql, [req.params.id], (err, rows) => {
    if (err) return res.status(500).json({ message: "Erro ao buscar chat." });
    res.json(rows || []);
  });
});

router.post("/:id/comments", (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ message: "Mensagem vazia." });

  db.run(
    `INSERT INTO PedidoComments (pedido_id, user_id, content) VALUES (?, ?, ?)`,
    [req.params.id, req.session.user.id, content],
    function (err) {
      if (err)
        return res.status(500).json({ message: "Erro ao enviar mensagem." });

      // Retorna a mensagem criada com dados do usuário para atualização em tempo real
      db.get(
        `SELECT pc.*, u.username, u.role FROM PedidoComments pc JOIN Users u ON pc.user_id=u.id WHERE pc.id=?`,
        [this.lastID],
        (e, row) => res.json(row)
      );
    }
  );
});

// --- ANEXOS (UPLOADS) ---
router.get("/:id/attachments", (req, res) => {
  const sql = `
        SELECT pa.id, pa.file_name, pa.file_type, pa.created_at, u.username 
        FROM PedidoAttachments pa 
        JOIN Users u ON pa.user_id = u.id 
        WHERE pa.pedido_id = ? 
        ORDER BY pa.created_at DESC
    `;
  db.all(sql, [req.params.id], (err, rows) => {
    if (err) return res.status(500).json({ message: "Erro ao buscar anexos." });
    res.json(rows || []);
  });
});

router.post("/:id/upload", upload.single("file"), (req, res) => {
  if (!req.file)
    return res.status(400).json({ message: "Nenhum arquivo enviado." });

  const { originalname, filename, mimetype } = req.file;
  // O caminho relativo que será salvo no banco (ex: uploads/123-arquivo.pdf)
  // O 'filename' gerado pelo Multer já é único.
  const dbPath = `uploads/${filename}`;

  db.run(
    `INSERT INTO PedidoAttachments (pedido_id, user_id, file_path, file_name, file_type) VALUES (?, ?, ?, ?, ?)`,
    [req.params.id, req.session.user.id, dbPath, originalname, mimetype],
    function (err) {
      if (err)
        return res
          .status(500)
          .json({ message: "Erro ao salvar anexo no banco." });

      db.get(
        `SELECT pa.*, u.username FROM PedidoAttachments pa JOIN Users u ON pa.user_id=u.id WHERE pa.id=?`,
        [this.lastID],
        (e, row) => res.json(row)
      );
    }
  );
});

router.delete("/attachments/:attachId", (req, res) => {
  // Primeiro busca o arquivo para pegar o caminho e deletar do disco
  db.get(
    `SELECT file_path FROM PedidoAttachments WHERE id = ?`,
    [req.params.attachId],
    (err, row) => {
      if (err || !row)
        return res.status(404).json({ message: "Anexo não encontrado." });

      const filePath = path.join(__dirname, "../../public", row.file_path);

      // Deleta do banco
      db.run(
        `DELETE FROM PedidoAttachments WHERE id = ?`,
        [req.params.attachId],
        (delErr) => {
          if (delErr)
            return res.status(500).json({ message: "Erro ao excluir anexo." });

          // Tenta deletar do disco (não falha a requisição se der erro aqui, apenas loga)
          fs.unlink(filePath, (fsErr) => {
            if (fsErr) console.error("Erro ao apagar arquivo físico:", fsErr);
          });

          res.json({ success: true });
        }
      );
    }
  );
});

// -----------------------------------------------------------------
// 5. ADMIN (Busca e Restore)
// -----------------------------------------------------------------

router.post("/admin/search", isBuyerOrAdmin, (req, res) => {
  const { term, dateStart, dateEnd } = req.body;
  let sql = `SELECT kp.*, kc.title as column_title, g.name as group_name, COALESCE(kp.solicitante_name, u_requester.username, u_creator.username) as solicitante_display FROM KanbanPedidos kp LEFT JOIN KanbanColumns kc ON kp.column_id = kc.id LEFT JOIN Groups g ON kp.group_id = g.id LEFT JOIN Users u_creator ON kp.created_by_user_id = u_creator.id LEFT JOIN PurchaseRequests pr ON kp.request_id = pr.id LEFT JOIN Users u_requester ON pr.requester_id = u_requester.id WHERE kp.lifecycle_status = 'completed'`;
  const params = [];
  if (term) {
    sql += ` AND (kp.title LIKE ? OR kp.description LIKE ? OR solicitante_display LIKE ?)`;
    params.push(`%${term}%`, `%${term}%`, `%${term}%`);
  }
  if (dateStart) {
    sql += ` AND date(kp.report_generated_at) >= date(?)`;
    params.push(dateStart);
  }
  if (dateEnd) {
    sql += ` AND date(kp.report_generated_at) <= date(?)`;
    params.push(dateEnd);
  }
  sql += ` ORDER BY kp.report_generated_at DESC LIMIT 50`;
  db.all(sql, params, (err, rows) => res.json(rows || []));
});

router.put("/:id/restore", isBuyerOrAdmin, (req, res) => {
  db.run(
    `UPDATE KanbanPedidos SET lifecycle_status = 'active' WHERE id = ?`,
    [req.params.id],
    (err) => res.json({ success: !err })
  );
});

module.exports = router;

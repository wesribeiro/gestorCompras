const express = require("express");
const db = require("../database/database");
const { isAuthenticated, isAdmin } = require("../middleware/authMiddleware");

const router = express.Router();

// Segurança: Apenas usuários logados e administradores podem acessar logs
router.use(isAuthenticated);
router.use(isAdmin);

/**
 * Rota: GET /api/audit
 * Objetivo: Buscar os últimos registros de auditoria para exibição no painel.
 * Limite: 100 últimos registros para não sobrecarregar a view inicial.
 */
router.get("/", (req, res) => {
  const sql = `
        SELECT 
            al.id,
            al.action,
            al.target_type,
            al.target_id,
            al.timestamp,
            u.username
        FROM AuditLog al
        LEFT JOIN Users u ON al.user_id = u.id
        ORDER BY al.timestamp DESC
        LIMIT 100
    `;

  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error("Erro ao buscar logs de auditoria:", err.message);
      return res
        .status(500)
        .json({ message: "Erro interno ao carregar logs." });
    }
    res.json(rows);
  });
});

module.exports = router;

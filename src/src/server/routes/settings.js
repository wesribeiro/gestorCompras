const express = require("express");
const db = require("../database/database");
const { isAuthenticated, isAdmin } = require("../middleware/authMiddleware");

const router = express.Router();

// Aplica o middleware 'isAuthenticated'
router.use(isAuthenticated);

/**
 * Rota: GET /api/settings
 * Objetivo: Buscar todas as configurações da aplicação.
 */
router.get("/", (req, res) => {
  const sql = `SELECT setting_key, setting_value FROM ApplicationSettings`;

  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error("Erro ao buscar configurações:", err.message);
      return res.status(500).json({ message: "Erro interno do servidor." });
    }

    const settings = rows.reduce((acc, row) => {
      if (row.setting_value === "true") {
        acc[row.setting_key] = true;
      } else if (row.setting_value === "false") {
        acc[row.setting_key] = false;
      } else {
        acc[row.setting_key] = row.setting_value;
      }
      return acc;
    }, {});

    res.json(settings);
  });
});

/**
 * Rota: PUT /api/settings/approval_workflow
 * Objetivo: Atualizar a configuração do fluxo de aprovação.
 * Protegido: Apenas Admin
 */
router.put("/approval_workflow", isAdmin, (req, res) => {
  const { value } = req.body;
  const userId = req.session.user.id;

  if (typeof value !== "boolean") {
    return res
      .status(400)
      .json({ message: "Valor inválido. Esperado um booleano (true/false)." });
  }

  const settingValueString = value ? "true" : "false";
  const settingKey = "approval_workflow_enabled";

  db.serialize(() => {
    const updateSql = `UPDATE ApplicationSettings SET setting_value = ? WHERE setting_key = ?`;

    db.run(updateSql, [settingValueString, settingKey], function (err) {
      if (err) {
        console.error("Erro ao atualizar configuração:", err.message);
        return res
          .status(500)
          .json({ message: "Erro ao atualizar configuração." });
      }

      const auditAction = `Alterou a configuração '${settingKey}' para '${settingValueString}'.`;
      const auditSql = `INSERT INTO AuditLog (user_id, action, target_type) VALUES (?, ?, ?)`;

      db.run(auditSql, [userId, auditAction, "Setting"], (auditErr) => {
        if (auditErr) {
          console.error(
            "Erro ao salvar no log de auditoria:",
            auditErr.message
          );
          return res
            .status(500)
            .json({
              message:
                "Configuração atualizada, mas falha ao registrar auditoria.",
            });
        }

        res.json({
          success: true,
          message: "Configuração atualizada com sucesso.",
        });
      });
    });
  });
});

module.exports = router;

const express = require("express");
const db = require("../database/database");
const { isAuthenticated } = require("../middleware/authMiddleware");

const router = express.Router();

// -----------------------------------------------------------------
// APLICAÇÃO DE SEGURANÇA
// -----------------------------------------------------------------
// Aplica o middleware 'isAuthenticated' a TODAS as rotas neste arquivo.
// Apenas usuários logados podem ver a lista de setores.
router.use(isAuthenticated);

// -----------------------------------------------------------------
// ROTAS DA API DE SETORES (DEPARTMENTS)
// -----------------------------------------------------------------

/**
 * Rota: GET /api/departments
 * Objetivo: Buscar todos os setores (centros de custo) disponíveis.
 * Retorna: Um array de objetos de setor (ex: [{ id: 1, name: 'T.I.' }])
 */
router.get("/", (req, res) => {
  const sql = `SELECT id, name FROM Departments ORDER BY name ASC`;

  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error("Erro ao buscar setores:", err.message);
      return res.status(500).json({ message: "Erro interno do servidor." });
    }
    res.json(rows);
  });
});

// Futuramente, podemos adicionar rotas POST, PUT, DELETE aqui
// para o Admin gerenciar os setores, mas por enquanto, GET é o suficiente.

module.exports = router;

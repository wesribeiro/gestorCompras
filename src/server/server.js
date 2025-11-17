const express = require("express");
const path = require("path");
const session = require("express-session");
const { initializeDatabase } = require("./database/schema");

// Importação das rotas
const authRoutes = require("./routes/auth");
const pedidoRoutes = require("./routes/pedidos"); // <-- ATUALIZADO
const settingsRoutes = require("./routes/settings");
const departmentRoutes = require("./routes/departments");

const app = express();
const PORT = process.env.PORT || 3002;

// Configuração do Express-Session
app.use(
  session({
    secret: "seu-secret-super-seguro-aqui-mude-depois",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // Em produção, mude para 'true' se usar HTTPS
      maxAge: 1000 * 60 * 60 * 24, // 1 dia de duração
    },
  })
);

// Define o caminho para a pasta 'public'
const publicPath = path.join(__dirname, "..", "public");

// Middlewares
app.use(express.static(publicPath)); // Servir arquivos estáticos
app.use(express.json()); // Parsear JSON

// --- ROTAS DA API ---
// Rotas de Autenticação (públicas e de sessão)
app.use("/api/auth", authRoutes);

// Rotas do Kanban (Protegidas)
app.use("/api/pedidos", pedidoRoutes); // <-- ATUALIZADO

// Rotas de Configurações (Protegidas)
app.use("/api/settings", settingsRoutes);

// Rotas de Setores (Protegidas)
app.use("/api/departments", departmentRoutes);

// --- ROTAS DO FRONTEND ---
// Rota principal - por enquanto, ela serve a página de login
app.get("/", (req, res) => {
  res.sendFile(path.join(publicPath, "login.html"));
});

// Inicia o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`Acesse http://localhost:${PORT}`);

  // Inicializa o banco de dados
  initializeDatabase();
});

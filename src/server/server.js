const express = require("express");
const path = require("path");
const session = require("express-session");
const { initializeDatabase } = require("./database/schema");

// Importação das rotas
const authRoutes = require("./routes/auth");
const pedidoRoutes = require("./routes/pedidos");
const settingsRoutes = require("./routes/settings");
const groupRoutes = require("./routes/groups");
const userRoutes = require("./routes/users");
const columnRoutes = require("./routes/columns"); // <--- NOVO (Etapa v3)

const app = express();
const PORT = process.env.PORT || 3002;

// Configuração do Express-Session
app.use(
  session({
    secret: "seu-secret-super-seguro-aqui-mude-depois",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      maxAge: 1000 * 60 * 60 * 24, // 1 dia
    },
  })
);

// Define o caminho para a pasta 'public'
const publicPath = path.join(__dirname, "..", "public");

// Middlewares
app.use(express.static(publicPath));
app.use(express.json());

// --- ROTAS DA API ---
app.use("/api/auth", authRoutes);
app.use("/api/pedidos", pedidoRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/users", userRoutes);
app.use("/api/columns", columnRoutes); // <--- REGISTRO DA NOVA ROTA

// --- ROTAS DO FRONTEND ---
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

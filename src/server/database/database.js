const sqlite3 = require("sqlite3").verbose();
const path = require("path");

// Define o caminho para o nosso arquivo de banco de dados
// Ele ficará dentro de /src/server/database/compras.db
const dbPath = path.resolve(__dirname, "compras.db");

// Cria uma nova instância do banco de dados
// O modo verbose() é útil para debugging, pois dá mais informações em caso de erro
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Erro ao conectar ao banco de dados SQLite:", err.message);
  } else {
    console.log("Conectado ao banco de dados SQLite.");
    // Habilita chaves estrangeiras (essencial para nossos relacionamentos)
    db.run("PRAGMA foreign_keys = ON;", (err) => {
      if (err) {
        console.error("Erro ao habilitar chaves estrangeiras:", err.message);
      }
    });
  }
});

// Exporta a instância do banco de dados para ser usada em outros arquivos
module.exports = db;

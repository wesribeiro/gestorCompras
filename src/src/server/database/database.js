const sqlite3 = require("sqlite3").verbose();
const path = require("path");

// Usamos um nome novo para garantir que o sistema crie tudo do zero
const dbPath = path.resolve(__dirname, "compras_v3_final.db");

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Erro ao conectar ao banco de dados SQLite:", err.message);
  } else {
    console.log("Conectado ao banco de dados SQLite:", dbPath);
    db.run("PRAGMA foreign_keys = ON;", (err) => {
      if (err) {
        console.error("Erro ao habilitar chaves estrangeiras:", err.message);
      }
    });
  }
});

module.exports = db;

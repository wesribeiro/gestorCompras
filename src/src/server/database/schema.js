const db = require("./database");
const bcrypt = require("bcrypt");

const saltRounds = 10;
const adminPassword = "nilo@@";
const adminUsername = "admin";

const createTablesQueries = `
    CREATE TABLE IF NOT EXISTS Groups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS Users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        group_id INTEGER NOT NULL,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('admin', 'director', 'buyer', 'assistant', 'requester')),
        
        -- NOVOS CAMPOS DE PERFIL (v5.0)
        display_name TEXT,
        email TEXT,
        phone TEXT,
        gender TEXT,

        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (group_id) REFERENCES Groups (id)
    );

    CREATE TABLE IF NOT EXISTS KanbanColumns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        color TEXT NOT NULL,
        position INTEGER NOT NULL,
        is_initial BOOLEAN DEFAULT 0,
        allows_completion BOOLEAN DEFAULT 0,
        is_final_destination BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS PurchaseRequests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        requester_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        justification TEXT,
        reference_links TEXT,
        status TEXT NOT NULL DEFAULT 'pending_buyer_review',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        approver_id INTEGER,
        approval_date DATETIME,
        approval_notes TEXT,
        FOREIGN KEY (requester_id) REFERENCES Users (id),
        FOREIGN KEY (approver_id) REFERENCES Users (id)
    );

    CREATE TABLE IF NOT EXISTS KanbanPedidos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        request_id INTEGER, 
        title TEXT NOT NULL,
        description TEXT,
        
        column_id INTEGER NOT NULL, 
        priority TEXT NOT NULL DEFAULT 'baixa',
        solicitante_name TEXT,
        
        lifecycle_status TEXT NOT NULL DEFAULT 'active', 

        task_created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        purchase_link TEXT,
        purchased_price REAL,
        purchased_quantity INTEGER,
        
        rating INTEGER, 
        rating_comment TEXT,

        report_generated_at DATETIME,
        
        created_by_user_id INTEGER, 
        group_id INTEGER,

        FOREIGN KEY (column_id) REFERENCES KanbanColumns (id),
        FOREIGN KEY (request_id) REFERENCES PurchaseRequests (id) ON DELETE SET NULL,
        FOREIGN KEY (created_by_user_id) REFERENCES Users (id) ON DELETE SET NULL,
        FOREIGN KEY (group_id) REFERENCES Groups (id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS PedidoNotes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pedido_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (pedido_id) REFERENCES KanbanPedidos (id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES Users (id)
    );

    CREATE TABLE IF NOT EXISTS PedidoResearch (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pedido_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (pedido_id) REFERENCES KanbanPedidos (id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES Users (id)
    );

    CREATE TABLE IF NOT EXISTS PedidoComments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pedido_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (pedido_id) REFERENCES KanbanPedidos (id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES Users (id)
    );

    CREATE TABLE IF NOT EXISTS PedidoAttachments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pedido_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        file_path TEXT NOT NULL,
        file_name TEXT NOT NULL,
        file_type TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (pedido_id) REFERENCES KanbanPedidos (id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES Users (id)
    );

    CREATE TABLE IF NOT EXISTS AuditLog (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        action TEXT NOT NULL,
        target_type TEXT,
        target_id INTEGER,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES Users (id)
    );

    CREATE TABLE IF NOT EXISTS ApplicationSettings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        setting_key TEXT UNIQUE NOT NULL,
        setting_value TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- NOVA TABELA: Fila de Notificações (v5.0)
    CREATE TABLE IF NOT EXISTS NotificationQueue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        type TEXT NOT NULL, -- 'pedido_update', 'new_message', etc
        reference_id INTEGER, -- ID do pedido ou solicitação
        message_content TEXT,
        status TEXT DEFAULT 'pending', -- 'pending', 'sent', 'failed'
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        processed_at DATETIME,
        FOREIGN KEY (user_id) REFERENCES Users (id)
    );
`;

function initializeDatabase() {
  db.serialize(async () => {
    console.log("Verificando schema v5.0 (Perfil, Notificações e Configs)...");
    db.exec(createTablesQueries, (err) => {
      if (err) console.error("Erro tabelas:", err.message);
      else {
        runMigrations();
        insertInitialData();
      }
    });
  });
}

// Função simples para adicionar colunas novas em tabelas existentes (SQLite não tem 'IF NOT EXISTS' para colunas)
function runMigrations() {
  const columnsToAdd = [
    { table: "Users", column: "display_name", type: "TEXT" },
    { table: "Users", column: "email", type: "TEXT" },
    { table: "Users", column: "phone", type: "TEXT" },
    { table: "Users", column: "gender", type: "TEXT" },
  ];

  columnsToAdd.forEach((col) => {
    const sql = `ALTER TABLE ${col.table} ADD COLUMN ${col.column} ${col.type}`;
    db.run(sql, (err) => {
      // Ignora erro se a coluna já existir
      if (err && !err.message.includes("duplicate column name")) {
        console.error(
          `Erro migração (${col.table}.${col.column}):`,
          err.message
        );
      } else if (!err) {
        console.log(`Coluna adicionada: ${col.table}.${col.column}`);
      }
    });
  });
}

async function insertInitialData() {
  try {
    const groupName = "Administração";
    await new Promise((resolve) => {
      db.run(
        `INSERT INTO Groups (name) VALUES (?) ON CONFLICT(name) DO NOTHING`,
        [groupName],
        resolve
      );
    });
    const group = await new Promise((resolve) =>
      db.get(`SELECT id FROM Groups WHERE name = ?`, [groupName], (err, row) =>
        resolve(row)
      )
    );

    const user = await new Promise((resolve) =>
      db.get(
        `SELECT id FROM Users WHERE username = ?`,
        [adminUsername],
        (err, row) => resolve(row)
      )
    );
    if (!user) {
      const hash = await bcrypt.hash(adminPassword, saltRounds);
      db.run(
        `INSERT INTO Users (group_id, username, password_hash, role, display_name) VALUES (?, ?, ?, 'admin', 'Administrador')`,
        [group.id, adminUsername, hash]
      );
      console.log("Usuário Admin criado.");
    }

    const colsExist = await new Promise((resolve) =>
      db.get("SELECT count(*) as count FROM KanbanColumns", (err, row) =>
        resolve(row.count)
      )
    );
    if (colsExist === 0) {
      console.log("Inserindo colunas padrão...");
      const stmt = db.prepare(
        `INSERT INTO KanbanColumns (title, color, position, is_initial, allows_completion, is_final_destination) VALUES (?, ?, ?, ?, ?, ?)`
      );
      stmt.run("Pedido de compra", "blue", 1, 1, 0, 0);
      stmt.run("Em cotação", "yellow", 2, 0, 0, 0);
      stmt.run("Estagnado", "red", 3, 0, 0, 0);
      stmt.run("Compra efetuada", "green", 4, 0, 1, 1);
      stmt.finalize();
    }

    const defaultSettings = [
      { key: "module_kanban_enabled", value: "true" },
      { key: "module_solicitacao_enabled", value: "false" },
      { key: "module_aprovacao_diretor_enabled", value: "false" },
      // NOVAS CONFIGURAÇÕES (v6.0)
      { key: "image_retention_days", value: "90" },
      { key: "notification_sender_email", value: "noreply@empresa.com" },
    ];
    defaultSettings.forEach((s) => {
      db.run(
        `INSERT INTO ApplicationSettings (setting_key, setting_value) VALUES (?, ?) ON CONFLICT(setting_key) DO NOTHING`,
        [s.key, s.value]
      );
    });
  } catch (err) {
    console.error("Erro dados iniciais:", err.message);
  }
}

module.exports = { initializeDatabase };

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
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (group_id) REFERENCES Groups (id)
    );

    -- NOVA TABELA: Colunas do Kanban (Filas Dinâmicas)
    CREATE TABLE IF NOT EXISTS KanbanColumns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        color TEXT NOT NULL, -- Ex: 'blue', 'yellow', 'red', 'green'
        position INTEGER NOT NULL,
        is_initial BOOLEAN DEFAULT 0, -- Se é a fila onde novos pedidos caem
        allows_completion BOOLEAN DEFAULT 0, -- Se permite preencher dados de compra
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
        
        -- MUDANÇA: Referência à tabela de colunas em vez de texto fixo
        column_id INTEGER NOT NULL, 
        
        priority TEXT NOT NULL DEFAULT 'baixa',
        solicitante_name TEXT,
        
        -- Status do ciclo de vida ('active' = na fila, 'completed' = entregue/arquivado)
        lifecycle_status TEXT NOT NULL DEFAULT 'active', 

        task_created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        purchase_link TEXT,
        purchased_price REAL,
        purchased_quantity INTEGER,
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
`;

function initializeDatabase() {
  db.serialize(async () => {
    console.log("Executando script de schema v3.0 (Dinâmico)...");
    db.exec(createTablesQueries, (err) => {
      if (err) console.error("Erro tabelas:", err.message);
      else insertInitialData();
    });
  });
}

async function insertInitialData() {
  try {
    // 1. Criar Grupo Admin
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

    // 2. Criar Usuário Admin
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
        `INSERT INTO Users (group_id, username, password_hash, role) VALUES (?, ?, ?, 'admin')`,
        [group.id, adminUsername, hash]
      );
      console.log("Usuário Admin criado.");
    }

    // 3. INSERIR COLUNAS PADRÃO (Se não existirem)
    // Cores disponíveis no Tailwind: blue, yellow, red, green, purple, pink, gray
    const defaultColumns = [
      {
        title: "Pedido de compra",
        color: "blue",
        pos: 1,
        initial: 1,
        complete: 0,
      },
      { title: "Em cotação", color: "yellow", pos: 2, initial: 0, complete: 0 },
      { title: "Estagnado", color: "red", pos: 3, initial: 0, complete: 0 },
      {
        title: "Compra efetuada",
        color: "green",
        pos: 4,
        initial: 0,
        complete: 1,
      }, // allows_completion = 1
    ];

    const colsExist = await new Promise((resolve) =>
      db.get("SELECT count(*) as count FROM KanbanColumns", (err, row) =>
        resolve(row.count)
      )
    );

    if (colsExist === 0) {
      console.log("Inserindo colunas padrão...");
      const stmt = db.prepare(
        `INSERT INTO KanbanColumns (title, color, position, is_initial, allows_completion) VALUES (?, ?, ?, ?, ?)`
      );
      defaultColumns.forEach((c) =>
        stmt.run(c.title, c.color, c.pos, c.initial, c.complete)
      );
      stmt.finalize();
    }

    // 4. Configurações
    const defaultSettings = [
      { key: "module_kanban_enabled", value: "true" },
      { key: "module_solicitacao_enabled", value: "false" },
      { key: "module_aprovacao_diretor_enabled", value: "false" },
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

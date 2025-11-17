const db = require("./database");
const bcrypt = require("bcrypt");

const saltRounds = 10;
const adminPassword = "nilo@@";
const adminUsername = "admin";

// Queries para criar as tabelas
const createTablesQueries = `
    -- Tabela de Setores (Centros de Custo)
    CREATE TABLE IF NOT EXISTS Departments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Tabela de Usuários
    CREATE TABLE IF NOT EXISTS Users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        department_id INTEGER NOT NULL,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('admin', 'director', 'buyer', 'assistant', 'requester')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (department_id) REFERENCES Departments (id)
    );

    -- Tabela de Solicitações de Compra (Feitas pelos solicitantes)
    CREATE TABLE IF NOT EXISTS PurchaseRequests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        requester_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        justification TEXT,
        reference_links TEXT,
        status TEXT NOT NULL DEFAULT 'pending_approval' CHECK(status IN ('pending_approval', 'denied', 'approved')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        approver_id INTEGER,
        approval_date DATETIME,
        approval_notes TEXT,
        FOREIGN KEY (requester_id) REFERENCES Users (id),
        FOREIGN KEY (approver_id) REFERENCES Users (id)
    );

    -- Tabela dos Cartões do Kanban (RENOMEADA)
    CREATE TABLE IF NOT EXISTS KanbanPedidos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        request_id INTEGER, 
        title TEXT NOT NULL,
        column TEXT NOT NULL DEFAULT 'pedido_compra' CHECK(column IN ('pedido_compra', 'em_cotacao', 'estagnado', 'compra_efetuada')),
        task_created_at DATETIME DEFAULT CURRENT_TIMESTAMP, -- (Nome da coluna mantido por consistência interna, mas representa 'pedido')
        purchase_link TEXT,
        purchased_price REAL,
        purchased_quantity INTEGER,
        report_generated_at DATETIME,
        created_by_user_id INTEGER, 
        department_id INTEGER, 

        FOREIGN KEY (request_id) REFERENCES PurchaseRequests (id) ON DELETE SET NULL,
        FOREIGN KEY (created_by_user_id) REFERENCES Users (id) ON DELETE SET NULL,
        FOREIGN KEY (department_id) REFERENCES Departments (id) ON DELETE SET NULL
    );

    -- Tabela de Notas de Status (RENOMEADA)
    CREATE TABLE IF NOT EXISTS PedidoNotes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pedido_id INTEGER NOT NULL, -- (RENOMEADO de task_id)
        user_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (pedido_id) REFERENCES KanbanPedidos (id) ON DELETE CASCADE, -- (ATUALIZADO)
        FOREIGN KEY (user_id) REFERENCES Users (id)
    );

    -- Tabela de Pesquisas (RENOMEADA)
    CREATE TABLE IF NOT EXISTS PedidoResearch (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pedido_id INTEGER NOT NULL, -- (RENOMEADO de task_id)
        user_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (pedido_id) REFERENCES KanbanPedidos (id) ON DELETE CASCADE, -- (ATUALIZADO)
        FOREIGN KEY (user_id) REFERENCES Users (id)
    );

    -- Tabela de Log de Auditoria
    CREATE TABLE IF NOT EXISTS AuditLog (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        action TEXT NOT NULL,
        target_type TEXT, -- (Ex: 'Pedido', 'User', 'Setting')
        target_id INTEGER,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES Users (id)
    );

    -- Tabela de Configurações
    CREATE TABLE IF NOT EXISTS ApplicationSettings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        setting_key TEXT UNIQUE NOT NULL,
        setting_value TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
`;

// Função para inicializar o banco de dados
function initializeDatabase() {
  db.serialize(async () => {
    console.log("Executando script de schema...");

    db.exec(createTablesQueries, (err) => {
      if (err) {
        console.error("Erro ao criar tabelas:", err.message);
      } else {
        console.log("Tabelas verificadas/criadas com sucesso.");
        insertInitialData();
      }
    });
  });
}

// Função para inserir dados iniciais (Admin, Setor Padrão e Configurações)
async function insertInitialData() {
  const defaultDeptName = "Administração";

  try {
    // 2. Cria o setor padrão
    const deptInsert = await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO Departments (name) VALUES (?)
                    ON CONFLICT(name) DO NOTHING`,
        [defaultDeptName],
        function (err) {
          if (err) return reject(err);
          resolve(this.lastID);
        }
      );
    });

    let deptId = deptInsert;
    if (deptId === 0) {
      const row = await new Promise((resolve, reject) => {
        db.get(
          `SELECT id FROM Departments WHERE name = ?`,
          [defaultDeptName],
          (err, row) => {
            if (err) return reject(err);
            resolve(row);
          }
        );
      });
      deptId = row.id;
    }

    if (!deptId)
      throw new Error("Não foi possível obter o ID do setor de Administração");
    console.log(`Setor '${defaultDeptName}' pronto (ID: ${deptId}).`);

    // 3. Cria o usuário admin
    const user = await new Promise((resolve, reject) => {
      db.get(
        `SELECT id FROM Users WHERE username = ?`,
        [adminUsername],
        (err, row) => {
          if (err) return reject(err);
          resolve(row);
        }
      );
    });

    if (!user) {
      const hash = await bcrypt.hash(adminPassword, saltRounds);
      await new Promise((resolve, reject) => {
        db.run(
          `INSERT INTO Users (department_id, username, password_hash, role)
                        VALUES (?, ?, ?, 'admin')`,
          [deptId, adminUsername, hash],
          function (err) {
            if (err) return reject(err);
            console.log(
              `Usuário 'admin' (ID: ${this.lastID}) criado com sucesso.`
            );
            resolve();
          }
        );
      });
    } else {
      console.log("Usuário 'admin' já existe.");
    }

    // 4. Insere a configuração padrão
    const settingKey = "approval_workflow_enabled";
    const settingValue = "false";

    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO ApplicationSettings (setting_key, setting_value)
                    VALUES (?, ?)
                    ON CONFLICT(setting_key) DO NOTHING`,
        [settingKey, settingValue],
        function (err) {
          if (err) return reject(err);
          if (this.changes > 0) {
            console.log(
              `Configuração padrão '${settingKey}' definida como '${settingValue}'.`
            );
          } else {
            console.log(`Configuração '${settingKey}' já existente.`);
          }
          resolve();
        }
      );
    });

    console.log("Inicialização do banco de dados concluída.");
  } catch (err) {
    console.error("Erro ao inserir dados iniciais:", err.message);
  }
}

module.exports = { initializeDatabase };

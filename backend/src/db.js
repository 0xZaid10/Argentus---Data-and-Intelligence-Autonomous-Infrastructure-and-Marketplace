import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_PATH = process.env.DATABASE_URL || path.join(__dirname, '../../agentmesh.db')

let db

export function getDb() {
  if (!db) db = new Database(DB_PATH)
  return db
}

export function initDb() {
  const db = getDb()

  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'received',
      worker_agent TEXT,
      escrow_uid TEXT,
      fulfillment_uid TEXT,
      result_cid TEXT,
      arbitrate_tx TEXT,
      collect_tx TEXT,
      error TEXT,
      user_chat_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS positions (
      id TEXT PRIMARY KEY,
      symbol TEXT NOT NULL,
      direction TEXT NOT NULL,
      entry_price REAL NOT NULL,
      current_price REAL,
      size_usdt REAL NOT NULL,
      stop_loss REAL,
      take_profit REAL,
      unrealized_pnl_usdt REAL DEFAULT 0,
      unrealized_pnl_pct REAL DEFAULT 0,
      realized_pnl_usdt REAL,
      realized_pnl_pct REAL,
      status TEXT NOT NULL DEFAULT 'open',
      exit_price REAL,
      telegram_chat_id TEXT,
      opened_at TEXT NOT NULL,
      closed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS agent_stats (
      agent_id TEXT PRIMARY KEY,
      tasks_completed INTEGER DEFAULT 0,
      tasks_failed INTEGER DEFAULT 0,
      earnings_usdc REAL DEFAULT 0,
      reputation_score REAL DEFAULT 100,
      last_active TEXT
    );

    CREATE TABLE IF NOT EXISTS deliverables (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      cid TEXT NOT NULL,
      type TEXT NOT NULL,
      size_bytes INTEGER,
      verified INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (task_id) REFERENCES tasks(id)
    );

    -- Seed agent stats if empty
    INSERT OR IGNORE INTO agent_stats (agent_id, last_active) VALUES
      ('coordinator', datetime('now')),
      ('research', datetime('now')),
      ('trading', datetime('now')),
      ('verifier', datetime('now'));
  `)

  console.log(`✅ Database initialized at ${DB_PATH}`)
}

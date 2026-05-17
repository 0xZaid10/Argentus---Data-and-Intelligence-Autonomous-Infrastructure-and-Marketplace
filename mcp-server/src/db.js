import 'dotenv/config'
import Database from 'better-sqlite3'
import { mkdirSync } from 'fs'
import { dirname } from 'path'

let db

export function getDb() {
  if (!db) {
    const dbPath = process.env.MCP_DB_PATH || './argentus-memory.db'
    mkdirSync(dirname(dbPath === './argentus-memory.db' ? './argentus-memory.db' : dbPath), { recursive: true })
    db = new Database(dbPath)
    db.pragma('journal_mode = WAL')
    initSchema()
  }
  return db
}

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      agent_id TEXT NOT NULL DEFAULT 'research',
      goal TEXT NOT NULL,
      summary TEXT,
      status TEXT NOT NULL DEFAULT 'completed',
      ipfs_cid TEXT,
      capabilities TEXT,
      duration_ms INTEGER,
      created_at TEXT NOT NULL,
      tags TEXT
    );

    CREATE TABLE IF NOT EXISTS deliverables (
      id TEXT PRIMARY KEY,
      task_id TEXT,
      session_id TEXT,
      agent_id TEXT NOT NULL,
      type TEXT NOT NULL,
      cid TEXT NOT NULL UNIQUE,
      summary TEXT,
      verified INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS agent_context (
      agent_id TEXT PRIMARY KEY,
      learned_patterns TEXT,
      last_updated TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_agent ON sessions(agent_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_created ON sessions(created_at);
    CREATE INDEX IF NOT EXISTS idx_deliverables_cid ON deliverables(cid);
    CREATE INDEX IF NOT EXISTS idx_deliverables_type ON deliverables(type);

    INSERT OR IGNORE INTO agent_context (agent_id, learned_patterns, last_updated)
    VALUES
      ('research', '[]', datetime('now')),
      ('trading', '[]', datetime('now')),
      ('coordinator', '[]', datetime('now')),
      ('verifier', '[]', datetime('now'));
  `)
}

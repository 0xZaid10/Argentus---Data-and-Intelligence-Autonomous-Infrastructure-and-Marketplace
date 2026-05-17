import 'dotenv/config';
import { logger } from './utils/logger.js';
import { initLocalMemory } from './memory/local.js';
import { initLLM } from './services/llm.js';
import { startServer } from './api/server.js';

// ─── AgentMesh Research Service ───────────────────────────────────────────────
// Pure intelligence engine — no AXL, no 0G, no KeeperHub
// Provides: onchain analysis, market research, community intelligence
// Called by: OpenClaw Research Agent via HTTP

async function main() {
  logger.info('AgentMesh Research Service starting', { version: '1.0.0' });

  const port = parseInt(process.env.PORT ?? '3000', 10);
  const dbPath = process.env.SQLITE_PATH ?? './.agentmesh/research.db';

  // ── Local memory (SQLite) ─────────────────────────────────────────────────
  const local = initLocalMemory(dbPath);
  logger.info('[Memory] SQLite ready', local.getStats());

  // ── LLM (TokenRouter → Claude Opus 4.7) ──────────────────────────────────
  const llm = initLLM();
  const smoke = await llm.prompt(
    'Reply with exactly: AgentMesh Research online',
    'Reply with exactly what is asked.',
    { maxTokens: 20, temperature: 0 }
  );
  logger.info('[LLM] Ready', { response: smoke.trim() });

  // ── API Server ────────────────────────────────────────────────────────────
  startServer(port);

  logger.info('AgentMesh Research Service ready', {
    port,
    model: process.env.LLM_MODEL ?? 'anthropic/claude-opus-4.7',
    baseUrl: process.env.ANTHROPIC_BASE_URL ?? 'https://api.tokenrouter.com/v1',
  });

  // ── Graceful shutdown ─────────────────────────────────────────────────────
  const shutdown = () => {
    logger.info('Shutting down research service...');
    local.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  logger.error('Fatal startup error', { error: err.message, stack: err.stack });
  process.exit(1);
});

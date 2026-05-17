import express from 'express';
import cors from 'cors';
import { errorHandler, notFound } from './middleware/error.js';
import researchRoutes from './routes/research.js';
import { logger } from '../utils/logger.js';
import { getQueueStatus } from '../agent/orchestrator.js';

// ─── Express Server ───────────────────────────────────────────────────────────

export function createServer() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  app.use((req, _res, next) => {
    logger.debug('[API] Request', { method: req.method, path: req.path });
    next();
  });

  // ── Health check ───────────────────────────────────────────────────────────
  app.get('/health', (_req, res) => {
    const queue = getQueueStatus();
    res.json({
      status: 'ok',
      service: 'agentmesh-research',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      queue: {
        size: queue.size,
        pending: queue.pending,
        activeJobs: queue.activeJobs.length,
      },
    });
  });

  // ── Routes ─────────────────────────────────────────────────────────────────
  app.use('/api/research', researchRoutes);

  // ── Error handlers ─────────────────────────────────────────────────────────
  app.use(notFound);
  app.use(errorHandler);

  return app;
}

export function startServer(port: number): void {
  const app = createServer();

  app.listen(port, () => {
    logger.info('[API] AgentMesh Research Service started', {
      port,
      endpoints: [
        'POST /api/research/sync    — run research, wait for result',
        'POST /api/research         — run research in background',
        'GET  /api/research/sessions/:userId — list user sessions',
        'GET  /api/research/session/:sessionId — get session',
        'GET  /api/research/queue   — queue status',
        'GET  /health               — service health',
      ],
    });
  });
}

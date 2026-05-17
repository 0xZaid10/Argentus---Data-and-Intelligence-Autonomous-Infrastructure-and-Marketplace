import { Router, type Request, type Response, type NextFunction } from 'express';
import { runResearch, getQueueStatus } from '../../agent/orchestrator.js';
import { getLocalMemory } from '../../memory/local.js';
import { createError } from '../middleware/error.js';
import { logger } from '../../utils/logger.js';

const router = Router();

// ─── POST /api/research ───────────────────────────────────────────────────────
// Kick off research in background, return immediately with poll URL

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { goal, userId } = req.body;

    if (!goal || typeof goal !== 'string' || goal.trim().length < 10) {
      throw createError('goal must be at least 10 characters', 400, 'INVALID_GOAL');
    }
    if (!userId || typeof userId !== 'string') {
      throw createError('userId is required', 400, 'INVALID_USER');
    }

    logger.info('[API] Research request received', { userId, goal: goal.slice(0, 100) });

    // Fire and forget — caller polls /sessions/:userId
    runResearch(userId, goal.trim())
      .then((result) => {
        logger.info('[API] Background research complete', {
          sessionId: result.sessionId,
          duration_ms: result.duration_ms,
        });
      })
      .catch((err) => {
        logger.error('[API] Background research failed', { userId, error: err.message });
      });

    res.status(202).json({
      success: true,
      message: 'Research started',
      userId,
      goal: goal.trim(),
      status: 'running',
      poll_url: `/api/research/sessions/${userId}`,
      timestamp: new Date().toISOString(),
    });

  } catch (err) {
    next(err);
  }
});

// ─── POST /api/research/sync ──────────────────────────────────────────────────
// Run research and wait for full result — used by OpenClaw Research Agent skill

router.post('/sync', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { goal, userId } = req.body;

    if (!goal || typeof goal !== 'string' || goal.trim().length < 10) {
      throw createError('goal must be at least 10 characters', 400, 'INVALID_GOAL');
    }
    if (!userId || typeof userId !== 'string') {
      throw createError('userId is required', 400, 'INVALID_USER');
    }

    logger.info('[API] Sync research request', { userId, goal: goal.slice(0, 100) });

    const result = await runResearch(userId, goal.trim());

    // Parse summary as JSON if possible
    let structuredReport = null;
    if (result.summary) {
      try {
        const cleaned = result.summary.replace(/```json|```/g, '').trim();
        structuredReport = JSON.parse(cleaned);
      } catch {
        // keep as string if not valid JSON
      }
    }

    res.json({
      success: true,
      ...result,
      report: structuredReport || result.summary,
    });

  } catch (err) {
    next(err);
  }
});

// ─── GET /api/research/sessions/:userId ───────────────────────────────────────

router.get('/sessions/:userId', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    const local = getLocalMemory();
    const sessions = local.getSessionsByUser(userId, 20);

    res.json({
      success: true,
      userId,
      sessions: sessions.map((s) => ({
        id: s.id,
        goal: s.goal,
        status: s.status,
        createdAt: s.createdAt,
        completedAt: s.completedAt,
        summary: s.summary,
      })),
      total: sessions.length,
    });

  } catch (err) {
    next(err);
  }
});

// ─── GET /api/research/session/:sessionId ─────────────────────────────────────

router.get('/session/:sessionId', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId } = req.params;
    const local = getLocalMemory();
    const session = local.getSession(sessionId);

    if (!session) {
      throw createError(`Session not found: ${sessionId}`, 404, 'SESSION_NOT_FOUND');
    }

    res.json({
      success: true,
      session: {
        id: session.id,
        userId: session.userId,
        goal: session.goal,
        status: session.status,
        createdAt: session.createdAt,
        completedAt: session.completedAt,
        summary: session.summary,
        results: session.results,
      },
    });

  } catch (err) {
    next(err);
  }
});

// ─── GET /api/research/queue ──────────────────────────────────────────────────

router.get('/queue', (_req: Request, res: Response) => {
  const status = getQueueStatus();
  res.json({ success: true, queue: status });
});

export default router;

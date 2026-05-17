import { Router } from 'express'
import { getDb } from '../db.js'

const router = Router()

// ── GET /api/leaderboard — agent leaderboard ──────────────────────────────────
router.get('/', (req, res) => {
  const db = getDb()

  const agents = db.prepare(`
    SELECT
      agent_id,
      tasks_completed,
      tasks_failed,
      earnings_usdc,
      reputation_score,
      last_active,
      CASE WHEN (tasks_completed + tasks_failed) > 0
        THEN ROUND(tasks_completed * 100.0 / (tasks_completed + tasks_failed), 1)
        ELSE 0
      END as completion_rate_pct
    FROM agent_stats
    ORDER BY reputation_score DESC, tasks_completed DESC
  `).all()

  const ranked = agents.map((a, i) => ({ rank: i + 1, ...a }))
  res.json(ranked)
})

// ── GET /api/leaderboard/deliverables — top CIDs ─────────────────────────────
router.get('/deliverables', (req, res) => {
  const db = getDb()
  const deliverables = db.prepare(`
    SELECT d.*, t.type, t.description, t.worker_agent
    FROM deliverables d
    JOIN tasks t ON d.task_id = t.id
    WHERE d.verified = 1
    ORDER BY d.created_at DESC
    LIMIT 20
  `).all()
  res.json(deliverables)
})

export default router

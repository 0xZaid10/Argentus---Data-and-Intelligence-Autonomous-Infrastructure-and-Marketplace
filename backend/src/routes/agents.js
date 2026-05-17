import { Router } from 'express'
import { getDb } from '../db.js'
import { getGatewayStatus } from '../services/gateway.js'

const router = Router()

const AGENT_META = {
  coordinator: {
    name: 'Coordinator',
    role: 'Task routing, orchestration, escrow tracking',
    heartbeat: '5m',
    telegram: '@agent_mesh_coordinator_bot',
    skills: ['task-router', 'filecoin-upload', 'escrow-settle'],
  },
  research: {
    name: 'Research Agent',
    role: 'Market intelligence, onchain analysis, ecosystem reports',
    heartbeat: '10m',
    telegram: null,
    skills: ['web-search', 'onchain-intel', 'filecoin-upload'],
  },
  trading: {
    name: 'Trading Agent',
    role: 'Paper trading, backtesting, strategy analysis',
    heartbeat: '1m',
    telegram: '@agent_mesh_trading_bot',
    skills: ['binance-data', 'paper-trade', 'backtest', 'filecoin-upload'],
  },
  verifier: {
    name: 'Verifier Agent',
    role: 'CID validation, escrow arbitration',
    heartbeat: '5m',
    telegram: null,
    skills: ['verify-cid', 'escrow-settle'],
  },
}

// ── GET /api/agents — list all agents with stats ──────────────────────────────
router.get('/', async (req, res) => {
  const db = getDb()
  const stats = db.prepare('SELECT * FROM agent_stats').all()
  const gateway = await getGatewayStatus()

  const agents = stats.map(s => ({
    ...AGENT_META[s.agent_id],
    id: s.agent_id,
    tasks_completed: s.tasks_completed,
    tasks_failed: s.tasks_failed,
    earnings_usdc: s.earnings_usdc,
    reputation_score: s.reputation_score,
    last_active: s.last_active,
    gateway_online: gateway.online,
  }))

  res.json(agents)
})

// ── GET /api/agents/:id — single agent ───────────────────────────────────────
router.get('/:id', async (req, res) => {
  const db = getDb()
  const stats = db.prepare('SELECT * FROM agent_stats WHERE agent_id = ?').get(req.params.id)
  if (!stats) return res.status(404).json({ error: 'Agent not found' })

  const recentTasks = db.prepare(`
    SELECT * FROM tasks WHERE worker_agent = ? ORDER BY updated_at DESC LIMIT 10
  `).all(req.params.id)

  res.json({
    ...AGENT_META[req.params.id],
    id: req.params.id,
    ...stats,
    recent_tasks: recentTasks,
  })
})

// ── GET /api/agents/gateway/status ───────────────────────────────────────────
router.get('/gateway/status', async (req, res) => {
  const status = await getGatewayStatus()
  res.json(status)
})

export default router

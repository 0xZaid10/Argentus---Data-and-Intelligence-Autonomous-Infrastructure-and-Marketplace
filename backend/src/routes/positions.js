import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { getDb } from '../db.js'

const router = Router()

// ── GET /api/positions — list positions ───────────────────────────────────────
router.get('/', (req, res) => {
  const { status = 'open' } = req.query
  const db = getDb()
  const positions = db.prepare(
    'SELECT * FROM positions WHERE status = ? ORDER BY opened_at DESC'
  ).all(status)
  res.json(positions)
})

// ── POST /api/positions — open a new paper position ──────────────────────────
router.post('/', (req, res) => {
  const { symbol, direction, entry_price, size_usdt, stop_loss, take_profit, telegram_chat_id } = req.body

  if (!symbol || !direction || !entry_price || !size_usdt) {
    return res.status(400).json({ error: 'symbol, direction, entry_price, size_usdt required' })
  }

  const id = `pos_${Date.now()}_${symbol}`
  const now = new Date().toISOString()
  const db = getDb()

  db.prepare(`
    INSERT INTO positions (id, symbol, direction, entry_price, current_price, size_usdt, stop_loss, take_profit, status, telegram_chat_id, opened_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?)
  `).run(id, symbol.toUpperCase(), direction, entry_price, entry_price, size_usdt, stop_loss || null, take_profit || null, telegram_chat_id || null, now)

  res.status(201).json(db.prepare('SELECT * FROM positions WHERE id = ?').get(id))
})

// ── PATCH /api/positions/:id — update position (price, close) ────────────────
router.patch('/:id', (req, res) => {
  const { current_price, status, exit_price, realized_pnl_usdt, realized_pnl_pct } = req.body
  const db = getDb()

  const pos = db.prepare('SELECT * FROM positions WHERE id = ?').get(req.params.id)
  if (!pos) return res.status(404).json({ error: 'Position not found' })

  const now = new Date().toISOString()

  // Calculate unrealized P&L if price updated
  let unrealized_pnl_usdt = pos.unrealized_pnl_usdt
  let unrealized_pnl_pct = pos.unrealized_pnl_pct

  if (current_price && pos.status === 'open') {
    if (pos.direction === 'long') {
      unrealized_pnl_usdt = (current_price - pos.entry_price) / pos.entry_price * pos.size_usdt
    } else {
      unrealized_pnl_usdt = (pos.entry_price - current_price) / pos.entry_price * pos.size_usdt
    }
    unrealized_pnl_pct = unrealized_pnl_usdt / pos.size_usdt * 100
  }

  db.prepare(`
    UPDATE positions SET
      current_price = COALESCE(?, current_price),
      status = COALESCE(?, status),
      exit_price = COALESCE(?, exit_price),
      realized_pnl_usdt = COALESCE(?, realized_pnl_usdt),
      realized_pnl_pct = COALESCE(?, realized_pnl_pct),
      unrealized_pnl_usdt = ?,
      unrealized_pnl_pct = ?,
      closed_at = CASE WHEN ? = 'closed' THEN ? ELSE closed_at END
    WHERE id = ?
  `).run(
    current_price, status, exit_price,
    realized_pnl_usdt, realized_pnl_pct,
    unrealized_pnl_usdt, unrealized_pnl_pct,
    status, now,
    req.params.id
  )

  res.json(db.prepare('SELECT * FROM positions WHERE id = ?').get(req.params.id))
})

// ── GET /api/positions/stats/summary — P&L summary ───────────────────────────
router.get('/stats/summary', (req, res) => {
  const db = getDb()
  const open = db.prepare(`
    SELECT COUNT(*) as count, SUM(unrealized_pnl_usdt) as total_unrealized
    FROM positions WHERE status = 'open'
  `).get()

  const closed = db.prepare(`
    SELECT
      COUNT(*) as total_trades,
      SUM(CASE WHEN realized_pnl_usdt > 0 THEN 1 ELSE 0 END) as winning_trades,
      SUM(realized_pnl_usdt) as total_realized_pnl,
      MAX(realized_pnl_pct) as best_trade_pct,
      MIN(realized_pnl_pct) as worst_trade_pct
    FROM positions WHERE status = 'closed'
  `).get()

  const win_rate = closed.total_trades > 0
    ? (closed.winning_trades / closed.total_trades * 100).toFixed(1)
    : 0

  res.json({
    open_positions: open.count,
    total_unrealized_pnl: open.total_unrealized || 0,
    total_trades: closed.total_trades,
    winning_trades: closed.winning_trades,
    win_rate_pct: Number(win_rate),
    total_realized_pnl: closed.total_realized_pnl || 0,
    best_trade_pct: closed.best_trade_pct || 0,
    worst_trade_pct: closed.worst_trade_pct || 0,
  })
})

export default router

import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { getDb } from '../db.js'
import { sendToAgent } from '../services/gateway.js'

const router = Router()

// ── Detect task type from description ────────────────────────────────────────
function detectTaskType(description) {
  const d = description.toLowerCase()
  if (d.includes('backtest') || d.includes('paper trade') || d.includes('strategy') || d.includes('trading')) {
    return 'trading'
  }
  if (d.includes('wallet') || d.includes('whale') || d.includes('onchain') || d.includes('token flow')) {
    return 'onchain_intelligence'
  }
  return 'market_research'
}

// ── POST /api/tasks — create a new task ──────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { description, escrow_uid, user_chat_id } = req.body

    if (!description) {
      return res.status(400).json({ error: 'description is required' })
    }

    const id = uuidv4()
    const type = detectTaskType(description)
    const now = new Date().toISOString()

    const db = getDb()
    db.prepare(`
      INSERT INTO tasks (id, type, description, status, escrow_uid, user_chat_id, created_at, updated_at)
      VALUES (?, ?, ?, 'received', ?, ?, ?, ?)
    `).run(id, type, description, escrow_uid || null, user_chat_id || null, now, now)

    // No escrow for agent tasks — escrow is marketplace-only
    const escrowUID = escrow_uid || null

    // Task created — coordinator picks it up via heartbeat or direct message
    console.log(`[Task] Created: ${id} | type: ${type} | escrow: ${escrowUID || 'none'}`)

    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id)
    res.status(201).json(task)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// ── GET /api/tasks — list all tasks ──────────────────────────────────────────
router.get('/', (req, res) => {
  const { status, limit = 50 } = req.query
  const db = getDb()

  let tasks
  if (status) {
    tasks = db.prepare('SELECT * FROM tasks WHERE status = ? ORDER BY created_at DESC LIMIT ?').all(status, Number(limit))
  } else {
    tasks = db.prepare('SELECT * FROM tasks ORDER BY created_at DESC LIMIT ?').all(Number(limit))
  }

  res.json(tasks)
})

// ── GET /api/tasks/:id — get a single task ───────────────────────────────────
router.get('/:id', (req, res) => {
  const db = getDb()
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id)
  if (!task) return res.status(404).json({ error: 'Task not found' })

  // Also get deliverables
  const deliverables = db.prepare('SELECT * FROM deliverables WHERE task_id = ?').all(req.params.id)
  res.json({ ...task, deliverables })
})

// ── PATCH /api/tasks/:id — update task status (called by agents) ─────────────
router.patch('/:id', (req, res) => {
  const { status, worker_agent, result_cid, fulfillment_uid, error } = req.body
  const db = getDb()

  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id)
  if (!task) return res.status(404).json({ error: 'Task not found' })

  const now = new Date().toISOString()
  db.prepare(`
    UPDATE tasks SET
      status = COALESCE(?, status),
      worker_agent = COALESCE(?, worker_agent),
      result_cid = COALESCE(?, result_cid),
      fulfillment_uid = COALESCE(?, fulfillment_uid),
      error = COALESCE(?, error),
      updated_at = ?
    WHERE id = ?
  `).run(status, worker_agent, result_cid, fulfillment_uid, error, now, req.params.id)

  // If result_cid is provided, log as deliverable
  if (result_cid) {
    db.prepare(`
      INSERT OR IGNORE INTO deliverables (id, task_id, cid, type, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(uuidv4(), req.params.id, result_cid, task.type, now)
  }

  // Update agent stats
  if (status === 'completed' && task.worker_agent) {
    db.prepare(`
      UPDATE agent_stats SET tasks_completed = tasks_completed + 1, last_active = ?
      WHERE agent_id = ?
    `).run(now, task.worker_agent)
  }
  if (status === 'failed' && task.worker_agent) {
    db.prepare(`
      UPDATE agent_stats SET tasks_failed = tasks_failed + 1, last_active = ?
      WHERE agent_id = ?
    `).run(now, task.worker_agent)
  }

  const _updatedTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id)
  if (_updatedTask.result_cid && _updatedTask.result_cid.startsWith('bafy') && _updatedTask.status !== 'completed' && _updatedTask.status !== 'failed') {
    setImmediate(async () => {
      try {
        console.log('[AutoPipeline] Starting for task:', req.params.id)
        const db2 = getDb()
        const t = db2.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id)
        db2.prepare('UPDATE tasks SET status = ?, updated_at = ? WHERE id = ?')
          .run('completed', new Date().toISOString(), req.params.id)
        const { generateAndSendReports } = await import('../services/reports.js')
        await generateAndSendReports({ taskId: t.id, cid: t.result_cid, escrowUID: null, fulfillmentUID: null, arbitrateTx: null, collectTx: null, chatId: t.user_chat_id })
        console.log('[AutoPipeline] Complete:', req.params.id)
      } catch (err) { console.error('[AutoPipeline] Error:', err.message) }
    })
  }
  res.json(_updatedTask)
})

// ── GET /api/tasks/stats/summary — task stats ────────────────────────────────
router.get('/stats/summary', (req, res) => {
  const db = getDb()
  const stats = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
      SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
      SUM(CASE WHEN status IN ('received','routing','in_progress','verifying') THEN 1 ELSE 0 END) as active
    FROM tasks
  `).get()
  res.json(stats)
})


// POST /api/tasks/:id/upload-to-filecoin
router.post('/:id/upload-to-filecoin', async (req, res) => {
  try {
    const db = getDb()
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id)
    if (!task) return res.status(404).json({ error: 'Task not found' })
    
    const { sessionId, reportJson } = req.body
    if (!reportJson) return res.status(400).json({ error: 'reportJson required' })
    
    // Write to temp file
    const { writeFileSync, mkdirSync } = await import('fs')
    const { join } = await import('path')
    const { execSync } = await import('child_process')
    const tmpDir = '/tmp/argentus-uploads'
    mkdirSync(tmpDir, { recursive: true })
    const tmpFile = join(tmpDir, `deliverable-${Date.now()}.json`)
    writeFileSync(tmpFile, JSON.stringify(reportJson, null, 2))
    
    // Run filecoin-pin
    const FILECOIN_KEY = process.env.FILECOIN_PRIVATE_KEY
    if (!FILECOIN_KEY) return res.status(500).json({ error: 'FILECOIN_PRIVATE_KEY not set' })
    
    console.log(`[Upload] Pinning to Filecoin for task ${req.params.id}`)
    const output = execSync(
      `PRIVATE_KEY=${FILECOIN_KEY} filecoin-pin add ${tmpFile} 2>&1`,
      { timeout: 120000, env: { ...process.env, PRIVATE_KEY: FILECOIN_KEY } }
    ).toString()
    
    console.log('[Upload] filecoin-pin output:', output.slice(-200))
    
    // Extract CID
    const cidMatch = output.match(/Root CID:\s+(baf[a-zA-Z0-9]+)/)
    if (!cidMatch) {
      console.error('[Upload] Could not extract CID from output:', output)
      return res.status(500).json({ error: 'Could not extract CID', output: output.slice(-500) })
    }
    
    const cid = cidMatch[1].trim()
    console.log(`[Upload] CID: ${cid}`)
    
    // Update task with real CID
    db.prepare('UPDATE tasks SET result_cid = ?, updated_at = ? WHERE id = ?')
      .run(cid, new Date().toISOString(), req.params.id)
    
    res.json({ success: true, cid, taskId: req.params.id })
  } catch (err) {
    console.error('[Upload] Error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// POST /api/tasks/:id/generate-reports — trigger PDF generation for a completed task
// Coordinator calls this after collect succeeds
router.post('/:id/generate-reports', async (req, res) => {
  try {
    const db = getDb()
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id)
    if (!task) return res.status(404).json({ error: 'Task not found' })
    if (!task.result_cid) return res.status(400).json({ error: 'Task has no CID yet' })

    // Update collect_tx and arbitrate_tx if provided
    const { collect_tx, arbitrate_tx } = req.body
    if (collect_tx || arbitrate_tx) {
      const updates = []
      const vals = []
      if (collect_tx) { updates.push('collect_tx = ?'); vals.push(collect_tx) }
      if (arbitrate_tx) { updates.push('arbitrate_tx = ?'); vals.push(arbitrate_tx) }
      updates.push('status = ?'); vals.push('completed')
      updates.push('updated_at = ?'); vals.push(new Date().toISOString())
      vals.push(req.params.id)
      db.prepare(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`).run(...vals)
    }

    // Re-fetch with updated data
    const updated = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id)

    // Trigger PDF generation
    const { generateAndSendReports } = await import('../services/reports.js')
    const reports = await generateAndSendReports({
      taskId: updated.id,
      cid: updated.result_cid,
      escrowUID: updated.escrow_uid,
      fulfillmentUID: updated.fulfillment_uid,
      arbitrateTx: updated.arbitrate_tx || arbitrate_tx,
      collectTx: updated.collect_tx || collect_tx,
      chatId: updated.user_chat_id,
    })

    if (reports) {
      res.json({ success: true, files: reports.files, dir: reports.taskDir })
    } else {
      res.status(500).json({ error: 'PDF generation failed' })
    }
  } catch (err) {
    console.error('[Reports] Generate failed:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// GET /api/tasks/active — returns tasks that are genuinely in-progress
// Used by coordinator to check if same task is already running
router.get('/active', (req, res) => {
  try {
    const db = getDb()
    const cutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString() // 30 min ago
    const tasks = db.prepare(`
      SELECT * FROM tasks
      WHERE status IN ('routing', 'in_progress', 'verifying')
      AND updated_at > ?
      ORDER BY created_at DESC
    `).all(cutoff)
    res.json({ active: tasks.length, tasks })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/tasks/search — search tasks by description keyword
router.get('/search', (req, res) => {
  try {
    const { q, status } = req.query
    const db = getDb()
    let sql = 'SELECT * FROM tasks WHERE 1=1'
    const params = []
    if (q) { sql += ' AND LOWER(description) LIKE ?'; params.push(`%${q.toLowerCase()}%`) }
    if (status) { sql += ' AND status = ?'; params.push(status) }
    sql += ' ORDER BY created_at DESC LIMIT 10'
    const tasks = db.prepare(sql).all(...params)
    res.json({ tasks, total: tasks.length })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router

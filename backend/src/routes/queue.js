// Queue persistence route
// Coordinator calls these to back up and restore task queue from SQLite
// Survives gateway restarts

import { Router } from 'express'
import { getDb } from '../db.js'

const router = Router()

// ── POST /api/queue/sync ──────────────────────────────────────────────────────
// Coordinator pushes its full queue.json here for persistence
router.post('/sync', (req, res) => {
  try {
    const { tasks } = req.body
    if (!Array.isArray(tasks)) return res.status(400).json({ error: 'tasks array required' })

    const db = getDb()
    const now = new Date().toISOString()

    // Upsert each task
    const upsert = db.prepare(`
      INSERT INTO tasks (id, type, description, status, worker_agent, escrow_uid,
        fulfillment_uid, result_cid, user_chat_id, created_at, updated_at)
      VALUES (@id, @type, @description, @status, @worker_agent, @escrow_uid,
        @fulfillment_uid, @result_cid, @user_chat_id, @created_at, @updated_at)
      ON CONFLICT(id) DO UPDATE SET
        status = excluded.status,
        worker_agent = excluded.worker_agent,
        escrow_uid = COALESCE(excluded.escrow_uid, tasks.escrow_uid),
        fulfillment_uid = COALESCE(excluded.fulfillment_uid, tasks.fulfillment_uid),
        result_cid = COALESCE(excluded.result_cid, tasks.result_cid),
        updated_at = excluded.updated_at
    `)

    const syncMany = db.transaction((tasks) => {
      for (const t of tasks) {
        upsert.run({
          id: t.taskId || t.id,
          type: t.type || 'market_research',
          description: t.description || '',
          status: t.status || 'received',
          worker_agent: t.workerAgent || t.worker_agent || null,
          escrow_uid: t.onchainEscrowUid || t.escrowUid || t.escrow_uid || null,
          fulfillment_uid: t.fulfillmentUid || t.fulfillment_uid || null,
          result_cid: t.resultCid || t.result_cid || null,
          user_chat_id: t.userId || t.user_chat_id || null,
          created_at: t.createdAt || t.created_at || now,
          updated_at: t.updatedAt || t.updated_at || now,
        })
      }
    })

    syncMany(tasks)
    res.json({ success: true, synced: tasks.length })
  } catch (err) {
    console.error('[Queue] Sync failed:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// ── GET /api/queue/restore ────────────────────────────────────────────────────
// Coordinator calls this on startup to restore queue from DB
router.get('/restore', (req, res) => {
  try {
    const db = getDb()
    const tasks = db.prepare(`
      SELECT * FROM tasks
      WHERE status NOT IN ('completed', 'failed')
      ORDER BY created_at DESC
      LIMIT 50
    `).all()

    const queue = tasks.map(t => ({
      taskId: t.id,
      type: t.type,
      description: t.description,
      status: t.status,
      workerAgent: t.worker_agent,
      escrowUid: t.escrow_uid,
      fulfillmentUid: t.fulfillment_uid,
      resultCid: t.result_cid,
      userId: t.user_chat_id,
      createdAt: t.created_at,
      updatedAt: t.updated_at,
    }))

    res.json({ success: true, tasks: queue, total: queue.length })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── GET /api/queue/active ─────────────────────────────────────────────────────
// Returns tasks needing action (in_progress with CID, or verifying)
router.get('/active', (req, res) => {
  try {
    const db = getDb()
    const tasks = db.prepare(`
      SELECT * FROM tasks
      WHERE status IN ('received', 'routing', 'in_progress', 'verifying')
      ORDER BY created_at ASC
    `).all()

    const needsVerification = tasks.filter(t =>
      t.status === 'in_progress' && t.result_cid
    )

    res.json({
      success: true,
      active: tasks.length,
      needs_verification: needsVerification.length,
      tasks: tasks.map(t => ({
        taskId: t.id,
        status: t.status,
        resultCid: t.result_cid,
        fulfillmentUid: t.fulfillment_uid,
        escrowUid: t.escrow_uid,
        workerAgent: t.worker_agent,
        age_minutes: Math.round((Date.now() - new Date(t.created_at).getTime()) / 60000),
      }))
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router

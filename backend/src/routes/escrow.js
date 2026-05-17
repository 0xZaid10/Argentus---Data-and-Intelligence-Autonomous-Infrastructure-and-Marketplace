import { readdirSync } from 'fs'
import { generateAndSendReports } from '../services/reports.js'
import { Router } from 'express'
import { getDb } from '../db.js'
import {
  createEscrow,
  submitFulfillment,
  arbitrateFulfillment,
  collectPayment,
  reclaimEscrow,
  getEscrowStatus,
} from '../services/escrow/alkahest.js'

const router = Router()

// POST /api/escrow/create
router.post('/create', async (req, res) => {
  try {
    const { taskId, amountUsdc = 1, expiryHours = 24 } = req.body
    if (!taskId) return res.status(400).json({ error: 'taskId required' })

    const db = getDb()
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId)
    if (!task) return res.status(404).json({ error: 'Task not found' })

    const verifierAddress = process.env.VERIFIER_WALLET_ADDRESS
    const userPrivateKey = process.env.USER_PRIVATE_KEY
    if (!verifierAddress || !userPrivateKey) {
      return res.status(500).json({ error: 'Missing VERIFIER_WALLET_ADDRESS or USER_PRIVATE_KEY' })
    }

    const escrow = await createEscrow({ userPrivateKey, verifierAddress, amountUsdc, expiryHours })

    db.prepare('UPDATE tasks SET escrow_uid = ?, updated_at = ? WHERE id = ?')
      .run(escrow.escrowUid, new Date().toISOString(), taskId)

    res.json({ success: true, ...escrow, taskId })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/escrow/fulfill
router.post('/fulfill', async (req, res) => {
  try {
    const { taskId, escrowUid, ipfsCid, workerAgent } = req.body
    if (!escrowUid || !ipfsCid) return res.status(400).json({ error: 'escrowUid and ipfsCid required' })

    const workerPrivateKey = process.env[`${workerAgent?.toUpperCase()}_PRIVATE_KEY`]
      || process.env.WORKER_PRIVATE_KEY
    if (!workerPrivateKey) return res.status(500).json({ error: 'Missing worker private key' })

    const fulfillment = await submitFulfillment({ workerPrivateKey, escrowUID: escrowUid, ipfsCid })

    if (taskId) {
      const db = getDb()
      db.prepare('UPDATE tasks SET fulfillment_uid = ?, result_cid = ?, status = ?, updated_at = ? WHERE id = ?')
        .run(fulfillment.fulfillmentUid, ipfsCid, 'verifying', new Date().toISOString(), taskId)
    }

    res.json({ success: true, ...fulfillment })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/escrow/arbitrate
router.post('/arbitrate', async (req, res) => {
  try {
    const { taskId, fulfillmentUid, decision, demandHex } = req.body
    if (!fulfillmentUid || decision === undefined) {
      return res.status(400).json({ error: 'fulfillmentUid and decision required' })
    }

    const verifierPrivateKey = process.env.VERIFIER_PRIVATE_KEY
    if (!verifierPrivateKey) return res.status(500).json({ error: 'Missing VERIFIER_PRIVATE_KEY' })

    const result = await arbitrateFulfillment({ verifierPrivateKey, fulfillmentUID: fulfillmentUid, decision, innerData: demandHex })

    if (taskId) {
      const db = getDb()
      const status = decision ? 'completed' : 'failed'
      db.prepare('UPDATE tasks SET status = ?, updated_at = ? WHERE id = ?')
        .run(status, new Date().toISOString(), taskId)

      if (decision) {
        const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId)
        if (task?.worker_agent) {
          db.prepare('UPDATE agent_stats SET tasks_completed = tasks_completed + 1, last_active = ? WHERE agent_id = ?')
            .run(new Date().toISOString(), task.worker_agent)
        }
        db.prepare('UPDATE deliverables SET verified = 1 WHERE task_id = ?').run(taskId)
      }
    }

    res.json({ success: true, ...result })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/escrow/collect
router.post('/collect', async (req, res) => {
  try {
    const { escrowUid, fulfillmentUid, workerAgent } = req.body
    if (!escrowUid || !fulfillmentUid) return res.status(400).json({ error: 'escrowUid and fulfillmentUid required' })

    const workerPrivateKey = process.env[`${workerAgent?.toUpperCase()}_PRIVATE_KEY`]
      || process.env.WORKER_PRIVATE_KEY
    if (!workerPrivateKey) return res.status(500).json({ error: 'Missing worker private key' })

    const result = await collectPayment({ workerPrivateKey, escrowUID: escrowUid, fulfillmentUID: fulfillmentUid })

    const db = getDb()
    const task = db.prepare('SELECT * FROM tasks WHERE escrow_uid = ?').get(escrowUid)
    if (task?.worker_agent) {
      db.prepare('UPDATE agent_stats SET earnings_usdc = earnings_usdc + 1, last_active = ? WHERE agent_id = ?')
        .run(new Date().toISOString(), task.worker_agent)
    }

    res.json({ success: true, ...result })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/escrow/reclaim
router.post('/reclaim', async (req, res) => {
  try {
    const { escrowUid } = req.body
    if (!escrowUid) return res.status(400).json({ error: 'escrowUid required' })

    const userPrivateKey = process.env.USER_PRIVATE_KEY
    if (!userPrivateKey) return res.status(500).json({ error: 'Missing USER_PRIVATE_KEY' })

    const result = await reclaimEscrow({ userPrivateKey, escrowUid })
    res.json({ success: true, ...result })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/escrow/:uid
router.get('/:uid', async (req, res) => {
  try {
    const status = await getEscrowStatus(req.params.uid)
    res.json({ success: true, ...status })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router

// GET /api/escrow/reports/:taskId — get generated PDFs for a task
router.get('/reports/:taskId', (req, res) => {
  try {
    const dir = `/tmp/argentus-reports/${req.params.taskId}`
    const files = readdirSync(dir).filter(f => f.endsWith('.pdf'))
    res.json({ success: true, taskId: req.params.taskId, files, dir })
  } catch {
    res.status(404).json({ error: 'No reports found for this task' })
  }
})

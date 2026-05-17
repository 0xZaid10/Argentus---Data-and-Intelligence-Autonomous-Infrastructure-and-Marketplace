import express from 'express'
import { getDb } from '../db.js'
import { createEscrow, arbitrateFulfillment, collectPayment, submitFulfillment } from '../services/escrow/alkahest.js'

const router = express.Router()

// ── LLM Verification ──────────────────────────────────────────────────────────
async function autoVerifySubmission(submission, request) {
  try {
    console.log('[Marketplace] Auto-verifying submission:', submission.id)

    // Get content — raw_content takes priority, then fetch from IPFS
    let content = submission.raw_content || null

    if (!content && submission.cid && submission.cid.startsWith('bafy')) {
      for (const gw of [`https://gateway.pinata.cloud/ipfs/${submission.cid}`, `https://ipfs.io/ipfs/${submission.cid}`]) {
        try {
          const res = await fetch(gw, { signal: AbortSignal.timeout(30000) })
          if (!res.ok) continue
          const text = await res.text()
          if (text.includes('<!DOCTYPE') || text.includes('<html')) {
            const match = text.match(/deliverable-[\d]+\.json|[\w-]+\.json/)
            if (match) {
              const fileRes = await fetch(`${gw}/${match[0]}`, { signal: AbortSignal.timeout(20000) })
              if (fileRes.ok) content = await fileRes.text()
            }
          } else {
            content = text
          }
          if (content) break
        } catch {}
      }
    }

    if (!content) return { decision: false, reason: 'No content provided and CID not accessible' }

    const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY
    const ANTHROPIC_BASE = process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com/v1'

    const verifyPrompt = `You are a data quality verifier for a decentralized marketplace.

REQUEST: "${request.title}"
DESCRIPTION: "${request.description}"
CATEGORY: "${request.category}"

SUBMITTED CONTENT:
${content.slice(0, 3000)}

Evaluate if this submission satisfactorily answers the request.
Consider:
- Does it address the topic directly?
- Is it substantive with specific numbers/data points?
- Does it make a reasonable attempt to answer?

Do NOT reject for: lack of cited sources, subjective interpretations, unverifiable claims.
Approve if relevant and substantive. Reject only if spam, off-topic, or no real data.

Reply with ONLY valid JSON (no markdown):
{"approved": true, "reason": "one sentence", "quality_score": 0.0}`

    let decision = false
    let reason = 'Auto-verification failed'
    let quality_score = 0

    if (ANTHROPIC_KEY) {
      try {
        const res = await fetch(`${ANTHROPIC_BASE}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01' },
          body: JSON.stringify({ model: 'anthropic/claude-haiku-4.5', max_tokens: 200, messages: [{ role: 'user', content: verifyPrompt }] }),
          signal: AbortSignal.timeout(30000)
        })
        const data = await res.json()
        const text = data?.content?.[0]?.text || ''
        console.log('[Marketplace] LLM response:', text.slice(0, 150))
        const clean = text.replace(/```json|```/g, '').trim()
        const result = JSON.parse(clean)
        decision = !!result.approved
        reason = result.reason || 'LLM evaluated'
        quality_score = result.quality_score || 0
      } catch (err) {
        console.warn('[Marketplace] LLM failed:', err.message)
        decision = content.length > 100
        reason = decision ? 'Content is substantive' : 'Content too short'
      }
    } else {
      decision = content.length > 100
      reason = decision ? 'Content is substantive' : 'Content too short'
      quality_score = Math.min(content.length / 2000, 1.0)
    }

    console.log('[Marketplace] Auto-verify result:', { decision, reason, quality_score })
    return { decision, reason, quality_score, content }
  } catch (err) {
    console.error('[Marketplace] Auto-verify error:', err.message)
    return { decision: false, reason: `Verification error: ${err.message}` }
  }
}

// ── Upload to Filecoin ─────────────────────────────────────────────────────────
async function uploadToFilecoin(submission, request) {
  try {
    const { writeFileSync, mkdirSync } = await import('fs')
    const { execSync } = await import('child_process')
    mkdirSync('/tmp/marketplace-uploads', { recursive: true })
    const tmpFile = `/tmp/marketplace-uploads/submission-${submission.id}-${Date.now()}.json`
    const payload = {
      request_id: submission.request_id,
      request_title: request?.title,
      request_description: request?.description,
      submission_id: submission.id,
      content: submission.raw_content,
      submitter: submission.submitter_address,
      verified_at: new Date().toISOString()
    }
    writeFileSync(tmpFile, JSON.stringify(payload, null, 2))
    const FILECOIN_KEY = process.env.FILECOIN_PRIVATE_KEY
    if (!FILECOIN_KEY) { console.warn('[Marketplace] No FILECOIN_PRIVATE_KEY'); return null }
    console.log('[Marketplace] Uploading to Filecoin...')
    const output = execSync(`PRIVATE_KEY=${FILECOIN_KEY} filecoin-pin add ${tmpFile} 2>&1`, { timeout: 120000 }).toString()
    const cidMatch = output.match(/Root CID:\s+(baf[a-zA-Z0-9]+)/)
    if (cidMatch) {
      const cid = cidMatch[1].trim()
      console.log('[Marketplace] Filecoin upload complete:', cid)
      return cid
    }
    console.warn('[Marketplace] Could not extract CID from filecoin-pin output')
    return null
  } catch (err) {
    console.warn('[Marketplace] Filecoin upload failed:', err.message)
    return null
  }
}

// ── On-chain Settlement ────────────────────────────────────────────────────────
async function settleOnChain(submission, request, decision) {
  let arbitrate_tx = null
  let collect_tx = null
  let fulfillment_uid = submission.fulfillment_uid

  if (!request.escrow_uid) {
    console.log('[Marketplace] No escrow — skipping on-chain settlement')
    return { arbitrate_tx, collect_tx, fulfillment_uid }
  }

  try {
    // Submit fulfillment if not done yet
    if (!fulfillment_uid || !fulfillment_uid.startsWith('0x')) {
      const cid = submission.cid
      if (!cid || !cid.startsWith('bafy')) {
        console.warn('[Marketplace] No valid CID for fulfillment — skipping')
        return { arbitrate_tx, collect_tx, fulfillment_uid }
      }
      const fulfill = await submitFulfillment({
        workerPrivateKey: process.env.WORKER_PRIVATE_KEY,
        escrowUID: request.escrow_uid,
        ipfsCid: cid
      })
      fulfillment_uid = fulfill.fulfillmentUID
      console.log('[Marketplace] Fulfillment submitted:', fulfillment_uid)
    }

    // Arbitrate
    const arb = await arbitrateFulfillment({
      verifierPrivateKey: process.env.VERIFIER_PRIVATE_KEY,
      fulfillmentUID: fulfillment_uid,
      decision,
      innerData: '0x'
    })
    arbitrate_tx = arb?.txHash || null
    console.log('[Marketplace] Arbitrated:', arbitrate_tx)

    // Collect if approved
    if (decision && arbitrate_tx) {
      const col = await collectPayment({
        workerPrivateKey: process.env.WORKER_PRIVATE_KEY,
        escrowUID: request.escrow_uid,
        fulfillmentUID: fulfillment_uid
      })
      collect_tx = col?.txHash || null
      console.log('[Marketplace] Collected:', collect_tx)
    }
  } catch (err) {
    console.warn('[Marketplace] On-chain settlement failed:', err.message)
  }

  return { arbitrate_tx, collect_tx, fulfillment_uid }
}

// ── Init Tables ────────────────────────────────────────────────────────────────
export function initMarketplaceTables() {
  const db = getDb()
  db.exec(`
    CREATE TABLE IF NOT EXISTS marketplace_requests (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT DEFAULT 'research',
      reward_usdc REAL DEFAULT 1.0,
      escrow_uid TEXT,
      requester_address TEXT,
      requester_chat_id TEXT,
      status TEXT DEFAULT 'open',
      deadline TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS marketplace_submissions (
      id TEXT PRIMARY KEY,
      request_id TEXT NOT NULL,
      cid TEXT,
      raw_content TEXT,
      submitter_address TEXT,
      submitter_chat_id TEXT,
      fulfillment_uid TEXT,
      description TEXT,
      status TEXT DEFAULT 'pending',
      arbitrate_tx TEXT,
      collect_tx TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (request_id) REFERENCES marketplace_requests(id)
    );
  `)
}

// ── POST /api/marketplace/requests ────────────────────────────────────────────
router.post('/requests', async (req, res) => {
  try {
    const db = getDb()
    const { title, description, category, reward_usdc, requester_address, requester_chat_id, deadline } = req.body
    if (!title || !description) return res.status(400).json({ error: 'title and description required' })

    const id = crypto.randomUUID()
    let escrow_uid = null
    try {
      const escrow = await createEscrow({
        userPrivateKey: process.env.USER_PRIVATE_KEY,
        verifierAddress: process.env.VERIFIER_WALLET_ADDRESS,
        amountUsdc: reward_usdc || 1.0,
        expiryHours: 24 * 7,
      })
      escrow_uid = escrow?.escrowUID || null
      if (escrow_uid) console.log('[Marketplace] Escrow created:', escrow_uid)
    } catch (err) {
      console.warn('[Marketplace] Escrow creation failed:', err.message)
    }

    db.prepare(`
      INSERT INTO marketplace_requests (id, title, description, category, reward_usdc, escrow_uid, requester_address, requester_chat_id, deadline)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, title, description, category || 'research', reward_usdc || 1.0, escrow_uid, requester_address || null, requester_chat_id || null, deadline || null)

    res.json({ success: true, request: db.prepare('SELECT * FROM marketplace_requests WHERE id = ?').get(id) })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── GET /api/marketplace/requests ─────────────────────────────────────────────
router.get('/requests', (req, res) => {
  try {
    const db = getDb()
    const { status, category, limit = 20 } = req.query
    const statusFilter = status || 'open'
    let sql = `SELECT * FROM marketplace_requests WHERE status = '${statusFilter}'`
    const params = []
    if (category) { sql += ' AND category = ?'; params.push(category) }
    sql += ' ORDER BY created_at DESC LIMIT ?'
    params.push(parseInt(limit))
    const requests = db.prepare(sql).all(...params)
    const withCounts = requests.map(r => ({
      ...r,
      submission_count: db.prepare('SELECT COUNT(*) as c FROM marketplace_submissions WHERE request_id = ?').get(r.id)?.c || 0
    }))
    res.json({ requests: withCounts, total: withCounts.length })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── GET /api/marketplace/requests/:id ─────────────────────────────────────────
router.get('/requests/:id', (req, res) => {
  try {
    const db = getDb()
    const request = db.prepare('SELECT * FROM marketplace_requests WHERE id = ?').get(req.params.id)
    if (!request) return res.status(404).json({ error: 'Not found' })
    const submissions = db.prepare('SELECT * FROM marketplace_submissions WHERE request_id = ? ORDER BY created_at DESC').all(req.params.id)
    res.json({ request, submissions })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── POST /api/marketplace/submit ──────────────────────────────────────────────
router.post('/submit', async (req, res) => {
  try {
    const db = getDb()
    const { request_id, cid, raw_content, submitter_address, submitter_chat_id, description } = req.body
    if (!request_id) return res.status(400).json({ error: 'request_id required' })
    if (!cid && !raw_content) return res.status(400).json({ error: 'Either cid or raw_content required' })
    if (cid && !cid.startsWith('bafy')) return res.status(400).json({ error: 'Invalid CID — must start with bafy' })

    const request = db.prepare('SELECT * FROM marketplace_requests WHERE id = ?').get(request_id)
    if (!request) return res.status(404).json({ error: 'Request not found' })
    if (request.status !== 'open') return res.status(400).json({ error: `Request is ${request.status}` })

    const id = crypto.randomUUID()

    db.prepare(`
      INSERT INTO marketplace_submissions (id, request_id, cid, raw_content, submitter_address, submitter_chat_id, description)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, request_id, cid || null, raw_content || null, submitter_address || null, submitter_chat_id || null, description || null)

    db.prepare(`UPDATE marketplace_requests SET status = 'reviewing', updated_at = datetime('now') WHERE id = ?`).run(request_id)

    const submission = db.prepare('SELECT * FROM marketplace_submissions WHERE id = ?').get(id)
    res.json({ success: true, submission, message: 'Submission received. Auto-verification in progress.' })

    // Auto-verify + settle in background
    setImmediate(async () => {
      try {
        const db2 = getDb()

        // 1. Verify content with LLM
        const { decision, reason, quality_score } = await autoVerifySubmission(submission, request)

        let cid_final = submission.cid
        let arbitrate_tx = null
        let collect_tx = null
        let fulfillment_uid = null

        if (decision) {
          // 2. Upload to Filecoin if only raw_content
          if (!cid_final && submission.raw_content) {
            cid_final = await uploadToFilecoin(submission, request)
            if (cid_final) {
              db2.prepare(`UPDATE marketplace_submissions SET cid = ?, updated_at = datetime('now') WHERE id = ?`).run(cid_final, id)
            }
          }

          // 3. On-chain settlement (needs valid CID)
          if (cid_final && request.escrow_uid) {
            const updatedSubmission = { ...submission, cid: cid_final }
            const settlement = await settleOnChain(updatedSubmission, request, true)
            arbitrate_tx = settlement.arbitrate_tx
            collect_tx = settlement.collect_tx
            fulfillment_uid = settlement.fulfillment_uid
          }
        }

        // 4. Update DB
        db2.prepare(`
          UPDATE marketplace_submissions 
          SET status = ?, arbitrate_tx = ?, collect_tx = ?, fulfillment_uid = ?, updated_at = datetime('now') 
          WHERE id = ?
        `).run(decision ? 'approved' : 'rejected', arbitrate_tx, collect_tx, fulfillment_uid, id)

        db2.prepare(`UPDATE marketplace_requests SET status = ?, updated_at = datetime('now') WHERE id = ?`)
          .run(decision ? 'completed' : 'open', request_id)

        console.log(`[Marketplace] Auto-verify complete: ${decision ? 'APPROVED' : 'REJECTED'} — ${reason}`)
        if (cid_final) console.log(`[Marketplace] CID: ${cid_final}`)
        if (collect_tx) console.log(`[Marketplace] Collect TX: ${collect_tx}`)

        // 5. Telegram notification
        const chatId = (submission.submitter_chat_id || request.requester_chat_id || '').replace('telegram:', '')
        const botToken = process.env.COORDINATOR_BOT_TOKEN
        if (chatId && botToken) {
          const msg = decision
            ? `✅ Marketplace submission APPROVED!\n\nRequest: ${request.title}\nCID: ${cid_final || 'uploading...'}\nReason: ${reason}${collect_tx ? `\nCollect TX: https://sepolia.basescan.org/tx/${collect_tx}` : ''}`
            : `❌ Marketplace submission REJECTED\n\nRequest: ${request.title}\nReason: ${reason}\n\nResubmit with better data.`
          await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: msg })
          }).catch(() => {})
        }
      } catch (err) {
        console.error('[Marketplace] Background verify failed:', err.message)
      }
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── POST /api/marketplace/verify (manual) ─────────────────────────────────────
router.post('/verify', async (req, res) => {
  try {
    const db = getDb()
    const { submission_id, decision, reason } = req.body
    if (!submission_id || decision === undefined) return res.status(400).json({ error: 'submission_id and decision required' })

    const submission = db.prepare('SELECT * FROM marketplace_submissions WHERE id = ?').get(submission_id)
    if (!submission) return res.status(404).json({ error: 'Submission not found' })
    const request = db.prepare('SELECT * FROM marketplace_requests WHERE id = ?').get(submission.request_id)

    let cid_final = submission.cid
    if (decision && !cid_final && submission.raw_content) {
      cid_final = await uploadToFilecoin(submission, request)
      if (cid_final) db.prepare(`UPDATE marketplace_submissions SET cid = ?, updated_at = datetime('now') WHERE id = ?`).run(cid_final, submission_id)
    }

    let arbitrate_tx = null, collect_tx = null, fulfillment_uid = null
    if (cid_final && request?.escrow_uid) {
      const updatedSubmission = { ...submission, cid: cid_final }
      const settlement = await settleOnChain(updatedSubmission, request, !!decision)
      arbitrate_tx = settlement.arbitrate_tx
      collect_tx = settlement.collect_tx
      fulfillment_uid = settlement.fulfillment_uid
    }

    db.prepare(`UPDATE marketplace_submissions SET status = ?, arbitrate_tx = ?, collect_tx = ?, fulfillment_uid = ?, updated_at = datetime('now') WHERE id = ?`)
      .run(decision ? 'approved' : 'rejected', arbitrate_tx, collect_tx, fulfillment_uid, submission_id)
    db.prepare(`UPDATE marketplace_requests SET status = ?, updated_at = datetime('now') WHERE id = ?`)
      .run(decision ? 'completed' : 'open', submission.request_id)

    res.json({ success: true, decision: !!decision, reason, cid: cid_final, arbitrate_tx, collect_tx,
      basescan: arbitrate_tx ? `https://sepolia.basescan.org/tx/${arbitrate_tx}` : null })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── GET /api/marketplace/stats ────────────────────────────────────────────────
router.get('/stats', (req, res) => {
  try {
    const db = getDb()
    res.json({
      open_requests: db.prepare(`SELECT COUNT(*) as c FROM marketplace_requests WHERE status = 'open'`).get()?.c || 0,
      total_requests: db.prepare('SELECT COUNT(*) as c FROM marketplace_requests').get()?.c || 0,
      total_submissions: db.prepare('SELECT COUNT(*) as c FROM marketplace_submissions').get()?.c || 0,
      approved_submissions: db.prepare(`SELECT COUNT(*) as c FROM marketplace_submissions WHERE status = 'approved'`).get()?.c || 0,
      total_rewarded_usdc: db.prepare(`SELECT COALESCE(SUM(r.reward_usdc),0) as s FROM marketplace_requests r JOIN marketplace_submissions s ON r.id = s.request_id WHERE s.status = 'approved'`).get()?.s || 0,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── GET /api/marketplace/leaderboard ──────────────────────────────────────────
router.get('/leaderboard', (req, res) => {
  try {
    const db = getDb()
    const leaders = db.prepare(`
      SELECT submitter_address, COUNT(*) as total,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved
      FROM marketplace_submissions WHERE submitter_address IS NOT NULL
      GROUP BY submitter_address ORDER BY approved DESC LIMIT 20
    `).all()
    res.json({ leaderboard: leaders })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router

// Report generation — called ONLY after full escrow lifecycle completes
// Requires: CID + arbitrateTx + collectTx + escrowUID + fulfillmentUID

import { execSync } from 'child_process'
import { mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import fetch from 'node-fetch'

const REPORTS_DIR = process.env.REPORTS_DIR || '/tmp/argentus-reports'
const GENERATOR = `${process.env.HOME}/ipfs/research/generate_report.py`

export async function generateAndSendReports({ taskId, cid, escrowUID, fulfillmentUID, arbitrateTx, collectTx, chatId }) {
  try {
    console.log(`[Reports] Generating for task ${taskId}`)

    mkdirSync(REPORTS_DIR, { recursive: true })
    const taskDir = join(REPORTS_DIR, taskId)
    mkdirSync(taskDir, { recursive: true })

    // Fetch deliverable from IPFS
    let deliverable = null
    if (cid && !cid.startsWith('local-') && !cid.startsWith('session-')) {
      const gateways = [
        `https://gateway.pinata.cloud/ipfs/${cid}`,
        `https://ipfs.io/ipfs/${cid}`,
        `https://dweb.link/ipfs/${cid}`,
      ]
      for (const gw of gateways) {
        try {
          const res = await fetch(gw, { timeout: 20000 })
          if (!res.ok) continue
          const text = await res.text()

          // Directory listing — find the JSON file
          const match = text.match(/deliverable-[\d]+\.json/)
          if (match) {
            const fileRes = await fetch(`${gw}/${match[0]}`, { timeout: 20000 })
            if (fileRes.ok) deliverable = await fileRes.json()
          } else {
            try { deliverable = JSON.parse(text) } catch {}
          }
          if (deliverable) break
        } catch {}
      }
    }

    // Fallback: fetch from research service session store
    if (!deliverable) {
      console.warn(`[Reports] Could not fetch from IPFS, trying research service...`)
      try {
        const sessions = await fetch(`http://localhost:3000/api/research/sessions/coordinator`, { timeout: 10000 })
        const data = await sessions.json()
        const recent = (data.sessions || []).find(s => s.goal && cid)
        if (recent && recent.report) {
          deliverable = recent.report
          deliverable.sessionId = recent.sessionId
          deliverable.goal = recent.goal
          console.log(`[Reports] Got deliverable from research service session`)
        }
      } catch (err) {
        console.warn(`[Reports] Research service fallback failed:`, err.message)
      }
    }

    if (!deliverable) {
      console.warn(`[Reports] Could not fetch deliverable from IPFS or research service for ${taskId}`)
      return null
    }

    // Enrich with on-chain data
    deliverable.cid = cid
    deliverable.escrowUID = escrowUID
    deliverable.fulfillmentUID = fulfillmentUID
    deliverable.arbitrateTx = arbitrateTx
    deliverable.collectTx = collectTx
    if (arbitrateTx) deliverable.arbitrateTxUrl = `https://sepolia.basescan.org/tx/${arbitrateTx}`
    if (collectTx) deliverable.collectTxUrl = `https://sepolia.basescan.org/tx/${collectTx}`

    // Write enriched deliverable to disk
    const deliverablePath = join(taskDir, 'deliverable.json')
    writeFileSync(deliverablePath, JSON.stringify(deliverable, null, 2))

    // Generate PDFs
    execSync(`python3 ${GENERATOR} ${deliverablePath} ${taskDir}`, { timeout: 60000 })

    // Find generated PDFs
    const { execSync: exec } = await import('child_process')
    const files = execSync(`ls ${taskDir}/*.pdf 2>/dev/null || echo ""`).toString().trim().split('\n').filter(Boolean)

    if (files.length === 0) {
      console.warn(`[Reports] No PDFs generated for ${taskId}`)
      return null
    }

    console.log(`[Reports] Generated ${files.length} PDFs for ${taskId}:`, files)

    // Auto-send to Telegram if chatId provided
    if (chatId && files.length > 0) {
      const botToken = process.env.COORDINATOR_BOT_TOKEN || '8480584073:AAGJq3yYHqnNfxh_1_-qvo8FItWRiDe65jI'
      const captions = {
        summary: '📄 Summary Report',
        report: '📊 Full Intelligence Report',
      }

      for (const filePath of files) {
        const label = filePath.includes('summary') ? 'summary' : 'report'
        try {
          // Use curl for multipart — most reliable for file uploads
          const { execSync } = await import('child_process')
          const caption = captions[label] || '📎 Report'
          const cleanChatId = String(chatId).replace('telegram:', '')
          execSync(
            `curl -s -X POST "https://api.telegram.org/bot${botToken}/sendDocument" ` +
            `-F "chat_id=${cleanChatId}" ` +
            `-F "document=@${filePath}" ` +
            `-F "caption=${caption}"`,
            { timeout: 30000 }
          )
          console.log(`[Reports] Sent ${label} PDF to chat ${chatId}`)
        } catch (err) {
          console.warn(`[Reports] Failed to send ${label} PDF:`, err.message)
        }
      }
    }

    return { files, taskDir }

  } catch (err) {
    console.error(`[Reports] Generation failed for ${taskId}:`, err.message)
    return null
  }
}

// HTTP wrapper for MCP tools
// Agents call this via curl instead of stdio
import 'dotenv/config'
import express from 'express'
import { searchMemory, getSession, getRecentSessions, storeSession, searchDeliverables, getAgentContext } from './tools.js'
import { getDb } from './db.js'

const app = express()
app.use(express.json())

const PORT = process.env.MCP_PORT || 3002

// Initialize DB
getDb()

// ── Routes ────────────────────────────────────────────────────────────────────
app.post('/search', async (req, res) => {
  try { res.json(await searchMemory(req.body)) }
  catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/session', async (req, res) => {
  try { res.json(await getSession(req.body)) }
  catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/sessions/recent', async (req, res) => {
  try { res.json(await getRecentSessions(req.body)) }
  catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/sessions/store', async (req, res) => {
  try { res.json(await storeSession(req.body)) }
  catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/deliverables', async (req, res) => {
  try { res.json(await searchDeliverables(req.body)) }
  catch (e) { res.status(500).json({ error: e.message }) }
})

app.get('/context/:agentId', async (req, res) => {
  try { res.json(await getAgentContext({ agentId: req.params.agentId })) }
  catch (e) { res.status(500).json({ error: e.message }) }
})

app.get('/health', (_, res) => res.json({ status: 'ok', service: 'argentus-mcp', port: PORT }))

app.listen(PORT, () => {
  console.log(`🧠 Argentus MCP HTTP server running on http://localhost:${PORT}`)
  console.log(`   POST /search          — search_memory`)
  console.log(`   POST /session         — get_session`)
  console.log(`   POST /sessions/recent — get_recent_sessions`)
  console.log(`   POST /sessions/store  — store_session`)
  console.log(`   POST /deliverables    — search_deliverables`)
  console.log(`   GET  /context/:agent  — get_agent_context`)
})

import { getDb } from './db.js'
import { fetchFromIPFS, checkCIDAccessible } from './ipfs.js'

// ── Tool: search_memory ───────────────────────────────────────────────────────
export async function searchMemory({ query, userId, agentId, limit = 5, days = 30 }) {
  const db = getDb()

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

  let sql = `
    SELECT id, user_id, agent_id, goal, summary, ipfs_cid, capabilities, duration_ms, created_at
    FROM sessions
    WHERE created_at > ? AND status = 'completed'
  `
  const params = [since]

  if (userId) { sql += ' AND user_id = ?'; params.push(userId) }
  if (agentId) { sql += ' AND agent_id = ?'; params.push(agentId) }

  // Case-insensitive keyword search across goal and summary
  // Split multi-word query and match any word
  if (query) {
    const words = query.trim().split(/\s+/).filter(w => w.length > 1)
    const conditions = words.map(() => '(LOWER(goal) LIKE ? OR LOWER(summary) LIKE ?)').join(' OR ')
    sql += ` AND (${conditions})`
    for (const word of words) {
      params.push(`%${word.toLowerCase()}%`, `%${word.toLowerCase()}%`)
    }
  }

  sql += ' ORDER BY created_at DESC LIMIT ?'
  params.push(limit)

  const rows = db.prepare(sql).all(...params)

  return {
    results: rows.map(r => ({
      sessionId: r.id,
      agentId: r.agent_id,
      goal: r.goal,
      summary: r.summary ? r.summary.slice(0, 300) : null,
      cid: r.ipfs_cid,
      capabilities: r.capabilities ? JSON.parse(r.capabilities) : [],
      createdAt: r.created_at,
    })),
    total: rows.length,
    query,
    days,
  }
}

// ── Tool: get_session ─────────────────────────────────────────────────────────
export async function getSession({ sessionId, cid }) {
  const db = getDb()

  // Look up by sessionId or CID
  let session
  if (sessionId) {
    session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId)
  } else if (cid) {
    session = db.prepare('SELECT * FROM sessions WHERE ipfs_cid = ?').get(cid)
  }

  if (!session) {
    return { error: `Session not found: ${sessionId || cid}` }
  }

  // If has IPFS CID, fetch full content
  let fullContent = null
  if (session.ipfs_cid) {
    const ipfsResult = await fetchFromIPFS(session.ipfs_cid)
    if (ipfsResult.success) {
      fullContent = ipfsResult.data
    }
  }

  return {
    sessionId: session.id,
    agentId: session.agent_id,
    userId: session.user_id,
    goal: session.goal,
    summary: session.summary,
    cid: session.ipfs_cid,
    capabilities: session.capabilities ? JSON.parse(session.capabilities) : [],
    durationMs: session.duration_ms,
    createdAt: session.created_at,
    fullContent,
  }
}

// ── Tool: get_recent_sessions ─────────────────────────────────────────────────
export async function getRecentSessions({ userId, agentId, limit = 10 }) {
  const db = getDb()

  let sql = 'SELECT id, agent_id, goal, summary, ipfs_cid, capabilities, created_at FROM sessions WHERE status = ?'
  const params = ['completed']

  if (userId) { sql += ' AND user_id = ?'; params.push(userId) }
  if (agentId) { sql += ' AND agent_id = ?'; params.push(agentId) }

  sql += ' ORDER BY created_at DESC LIMIT ?'
  params.push(limit)

  const rows = db.prepare(sql).all(...params)

  return {
    sessions: rows.map(r => ({
      sessionId: r.id,
      agentId: r.agent_id,
      goal: r.goal,
      summary: r.summary ? r.summary.slice(0, 200) : null,
      cid: r.ipfs_cid,
      capabilities: r.capabilities ? JSON.parse(r.capabilities) : [],
      createdAt: r.created_at,
    })),
    total: rows.length,
  }
}

// ── Tool: store_session ───────────────────────────────────────────────────────
export async function storeSession({ sessionId, userId, agentId, goal, summary, cid, capabilities, durationMs, tags }) {
  const db = getDb()

  db.prepare(`
    INSERT INTO sessions (id, user_id, agent_id, goal, summary, ipfs_cid, capabilities, duration_ms, created_at, tags, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed')
    ON CONFLICT(id) DO UPDATE SET
      summary = excluded.summary,
      ipfs_cid = excluded.ipfs_cid,
      capabilities = excluded.capabilities,
      duration_ms = excluded.duration_ms,
      tags = excluded.tags
  `).run(
    sessionId,
    userId || 'system',
    agentId || 'research',
    goal,
    summary || null,
    cid || null,
    capabilities ? JSON.stringify(capabilities) : null,
    durationMs || null,
    new Date().toISOString(),
    tags ? JSON.stringify(tags) : null,
  )

  return { success: true, sessionId, cid: cid || null }
}

// ── Tool: search_deliverables ─────────────────────────────────────────────────
export async function searchDeliverables({ query, type, agentId, limit = 10, verifiedOnly = false }) {
  const db = getDb()

  let sql = 'SELECT * FROM deliverables WHERE 1=1'
  const params = []

  if (type) { sql += ' AND type = ?'; params.push(type) }
  if (agentId) { sql += ' AND agent_id = ?'; params.push(agentId) }
  if (verifiedOnly) { sql += ' AND verified = 1' }
  if (query) {
    sql += ' AND (summary LIKE ?)'
    params.push(`%${query}%`)
  }

  sql += ' ORDER BY created_at DESC LIMIT ?'
  params.push(limit)

  const rows = db.prepare(sql).all(...params)

  return {
    deliverables: rows.map(r => ({
      id: r.id,
      agentId: r.agent_id,
      type: r.type,
      cid: r.cid,
      summary: r.summary ? r.summary.slice(0, 200) : null,
      verified: r.verified === 1,
      createdAt: r.created_at,
      ipfsUrl: `https://ipfs.io/ipfs/${r.cid}`,
    })),
    total: rows.length,
  }
}

// ── Tool: get_agent_context ───────────────────────────────────────────────────
export async function getAgentContext({ agentId }) {
  const db = getDb()

  const ctx = db.prepare('SELECT * FROM agent_context WHERE agent_id = ?').get(agentId)
  if (!ctx) return { agentId, patterns: [], lastUpdated: null }

  // Get recent session stats
  const stats = db.prepare(`
    SELECT
      COUNT(*) as total_sessions,
      COUNT(ipfs_cid) as sessions_with_cid,
      MAX(created_at) as last_active
    FROM sessions WHERE agent_id = ? AND status = 'completed'
  `).get(agentId)

  // Get top goals/topics
  const recentGoals = db.prepare(`
    SELECT goal FROM sessions
    WHERE agent_id = ? AND status = 'completed'
    ORDER BY created_at DESC LIMIT 5
  `).all(agentId).map(r => r.goal)

  return {
    agentId,
    patterns: ctx.learned_patterns ? JSON.parse(ctx.learned_patterns) : [],
    lastUpdated: ctx.last_updated,
    stats: {
      totalSessions: stats.total_sessions,
      sessionsWithCID: stats.sessions_with_cid,
      lastActive: stats.last_active,
    },
    recentGoals,
  }
}

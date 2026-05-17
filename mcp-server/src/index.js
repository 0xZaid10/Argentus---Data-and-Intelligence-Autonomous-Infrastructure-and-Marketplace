import 'dotenv/config'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import {
  searchMemory,
  getSession,
  getRecentSessions,
  storeSession,
  searchDeliverables,
  getAgentContext,
} from './tools.js'
import { getDb } from './db.js'

// ── MCP Server ────────────────────────────────────────────────────────────────
const server = new McpServer({
  name: 'argentus-memory',
  version: '1.0.0',
})

// ── Tool: search_memory ───────────────────────────────────────────────────────
server.tool(
  'search_memory',
  'Search past research sessions and intelligence reports by keyword. Returns relevant session summaries and IPFS CIDs. Use this instead of loading all past context.',
  {
    query: z.string().describe('Keywords to search for in past sessions (e.g. "BTC whale", "ETH market", "vitalik wallet")'),
    userId: z.string().optional().describe('Filter by user ID'),
    agentId: z.string().optional().describe('Filter by agent: research, trading, coordinator, verifier'),
    limit: z.number().optional().default(5).describe('Max results to return (default 5)'),
    days: z.number().optional().default(30).describe('Look back N days (default 30)'),
  },
  async (params) => {
    const result = await searchMemory(params)
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2),
      }]
    }
  }
)

// ── Tool: get_session ─────────────────────────────────────────────────────────
server.tool(
  'get_session',
  'Retrieve a specific research session by sessionId or IPFS CID. Fetches full content from IPFS if available. Use this when you need the complete report for a specific session.',
  {
    sessionId: z.string().optional().describe('Session ID to retrieve'),
    cid: z.string().optional().describe('IPFS CID of the session report'),
  },
  async (params) => {
    const result = await getSession(params)
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2),
      }]
    }
  }
)

// ── Tool: get_recent_sessions ─────────────────────────────────────────────────
server.tool(
  'get_recent_sessions',
  'Get the most recent completed sessions for an agent or user. Returns summaries only — use get_session for full content.',
  {
    userId: z.string().optional().describe('Filter by user ID'),
    agentId: z.string().optional().describe('Filter by agent ID'),
    limit: z.number().optional().default(10).describe('Number of sessions to return'),
  },
  async (params) => {
    const result = await getRecentSessions(params)
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2),
      }]
    }
  }
)

// ── Tool: store_session ───────────────────────────────────────────────────────
server.tool(
  'store_session',
  'Store a completed research session in memory with its IPFS CID. Call this after uploading a deliverable to Filecoin.',
  {
    sessionId: z.string().describe('Unique session identifier'),
    userId: z.string().describe('User who requested the research'),
    agentId: z.string().describe('Agent that completed the session'),
    goal: z.string().describe('The research goal or task description'),
    summary: z.string().optional().describe('Brief summary of findings (max 500 chars)'),
    cid: z.string().optional().describe('IPFS CID of the pinned deliverable'),
    capabilities: z.array(z.string()).optional().describe('Capabilities used: ["onchain", "market", etc]'),
    durationMs: z.number().optional().describe('How long the session took in milliseconds'),
    tags: z.array(z.string()).optional().describe('Topic tags for better search: ["BTC", "whale", "DeFi"]'),
  },
  async (params) => {
    const result = await storeSession(params)
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2),
      }]
    }
  }
)

// ── Tool: search_deliverables ─────────────────────────────────────────────────
server.tool(
  'search_deliverables',
  'Search the marketplace of verified intelligence deliverables stored on IPFS. Find past reports by type or keyword.',
  {
    query: z.string().optional().describe('Search keywords'),
    type: z.string().optional().describe('Filter by type: market_research, onchain_intelligence, backtest, daily_pnl'),
    agentId: z.string().optional().describe('Filter by producing agent'),
    limit: z.number().optional().default(10).describe('Max results'),
    verifiedOnly: z.boolean().optional().default(false).describe('Only return Verifier-approved deliverables'),
  },
  async (params) => {
    const result = await searchDeliverables(params)
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2),
      }]
    }
  }
)

// ── Tool: get_agent_context ───────────────────────────────────────────────────
server.tool(
  'get_agent_context',
  'Get learned patterns and context for a specific agent. Use this to understand what an agent has learned from past sessions before starting a new task.',
  {
    agentId: z.string().describe('Agent ID: research, trading, coordinator, verifier'),
  },
  async (params) => {
    const result = await getAgentContext(params)
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2),
      }]
    }
  }
)

// ── Initialize DB and start server ────────────────────────────────────────────
getDb() // Initialize SQLite
console.error('Argentus Memory MCP server starting...')

const transport = new StdioServerTransport()
await server.connect(transport)
console.error('Argentus Memory MCP server ready')

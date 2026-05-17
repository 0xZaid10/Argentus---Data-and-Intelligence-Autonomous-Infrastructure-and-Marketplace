import { getLLM } from '../services/llm.js';
import { planResearch } from './planner.js';
import { executePlan } from './executor.js';
import { ContextManager } from './context.js';
import { getLocalMemory } from '../memory/local.js';
import { enqueue, getQueueStatus } from '../utils/queue.js';
import { logger } from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';
import type { ExecutionPlan } from './types.js';

// ─── AgentMesh Research Orchestrator ─────────────────────────────────────────
//
// Stripped of: 0G storage, AXL privacy routing, KeeperHub, x402 payments
// Pure intelligence pipeline: plan → execute → summarize → return
//
// Flow:
//   1. Load previous sessions from local memory
//   2. Plan: goal → capabilities via LLM
//   3. Execute: run capabilities, build context
//   4. Summarize: generate structured intelligence report
//   5. Persist locally
//   6. Return result (caller handles Filecoin upload)

export interface OrchestratorOptions {
  skipStorage?: boolean;
}

export interface OrchestratorResult {
  sessionId: string;
  userId: string;
  goal: string;
  run_at: string;
  plan: {
    task_summary: string;
    output_type: string;
    capabilities_run: string[];
  };
  summary: string;
  results: Array<{
    capability: string;
    success: boolean;
    error?: string;
    data: unknown;
    duration_ms: number;
  }>;
  duration_ms: number;
}

export async function runResearch(
  userId: string,
  goal: string,
  options: OrchestratorOptions = {}
): Promise<OrchestratorResult> {
  return enqueue(userId, () => _runResearch(userId, goal, options));
}

async function _runResearch(
  userId: string,
  goal: string,
  options: OrchestratorOptions
): Promise<OrchestratorResult> {
  const sessionId = uuidv4();
  const startTime = Date.now();
  const llm = getLLM();
  const local = getLocalMemory();

  logger.info('[Orchestrator] Research started', { sessionId, userId, goal: goal.slice(0, 100) });

  // ── 1. Create session ─────────────────────────────────────────────────────
  local.createSession({
    id: sessionId,
    userId,
    goal,
    status: 'running',
    createdAt: new Date().toISOString(),
  });

  // ── 1b. Fetch live market data ───────────────────────────────────────────
  let liveMarketData = ''
  try {
    const { fetchAllMarketData } = await import('../services/dataAggregator.js')

    // Detect what the goal is about
    const goalLower = goal.toLowerCase()
    const focus: any = { tokens: [], symbols: [], protocols: [], chain: undefined }

    if (goalLower.includes('btc') || goalLower.includes('bitcoin')) {
      focus.tokens.push('bitcoin'); focus.symbols.push('BTC')
    }
    if (goalLower.includes('eth') || goalLower.includes('ethereum') || goalLower.includes('defi')) {
      focus.tokens.push('ethereum'); focus.symbols.push('ETH')
      focus.chain = 'Ethereum'
      focus.protocols.push(...['aave', 'lido', 'uniswap', 'eigenlayer', 'pendle'])
    }
    if (goalLower.includes('sol') || goalLower.includes('solana')) {
      focus.tokens.push('solana'); focus.symbols.push('SOL')
      focus.chain = 'Solana'
      focus.protocols.push(...['jito', 'kamino', 'raydium', 'jupiter', 'marinade'])
    }
    // Always include global market data
    if (focus.tokens.length === 0) {
      focus.tokens = ['bitcoin', 'ethereum', 'solana']
      focus.symbols = ['BTC', 'ETH', 'SOL']
    }

    liveMarketData = await fetchAllMarketData(focus)
    
    // Supplement with SerpApi web search for current news/data
    try {
      const { fetchMarketIntelligence } = await import('../services/webSearch.js')
      const token = focus.tokens?.[0] || 'crypto'
      const chain = focus.chain || ''
      const webData = await fetchMarketIntelligence(token, chain)
      if (webData) {
        liveMarketData += '\n\n=== WEB SEARCH DATA ===\n' + webData
      }
    } catch (e) {
      logger.warn('[Orchestrator] Web search failed', { error: (e as Error).message })
    }
    logger.info('[Orchestrator] Live market data fetched', { chars: liveMarketData.length })
  } catch (err) {
    logger.warn('[Orchestrator] Market data fetch failed', { error: (err as Error).message })
  }

  // ── 2. Load previous context (MCP first, SQLite fallback) ───────────────
  let previousContext: string | undefined;
  try {
    const mcpUrl = process.env.MCP_SERVICE_URL || 'http://localhost:3002';
    // Extract meaningful keywords — skip common words, keep crypto/finance terms
    const stopWords = new Set(['analyze','analysis','provide','identify','cover','signals','patterns','trends','please','the','for','and','with','past','days','over','last','week']);
    const keywords = goal.split(/\s+/)
      .map(w => w.replace(/[^a-zA-Z0-9]/g, '').toLowerCase())
      .filter(w => w.length > 2 && !stopWords.has(w))
      .slice(0, 4)
      .join(' ');
    const mcpRes = await fetch(`${mcpUrl}/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: keywords, agentId: 'research', limit: 10, days: 30 }),
    });
    const mcpData = await mcpRes.json() as any;
    if (mcpData.results?.length > 0) {
      previousContext = `Relevant past research (from MCP memory):\n${
        mcpData.results.map((r: any) => `- ${r.goal}: ${r.summary?.slice(0, 100)}`).join('\n')
      }`;
      logger.info('[Orchestrator] MCP context loaded', { results: mcpData.results.length });
    }
  } catch {
    // Fall back to local SQLite
    const previousSessions = local.getCompletedSessions(userId, 3);
    previousContext = previousSessions.length
      ? `Previous research:\n${previousSessions.map(s => `- ${s.goal}: ${s.summary?.slice(0, 100)}`).join('\n')}`
      : undefined;
  }

  // ── 3. Init context manager ───────────────────────────────────────────────
  const ctx = new ContextManager(goal);

  // ── 4. Plan ───────────────────────────────────────────────────────────────
  let plan: ExecutionPlan;
  try {
    plan = await planResearch(goal, userId, previousContext);
  } catch (err) {
    local.updateSession(sessionId, { status: 'failed', completedAt: new Date().toISOString() });
    throw err;
  }

  if (!plan.capabilities?.length) {
    local.updateSession(sessionId, { status: 'failed', completedAt: new Date().toISOString() });
    return {
      sessionId, userId, goal,
      run_at: new Date().toISOString(),
      plan: { task_summary: 'Could not determine plan', output_type: 'research', capabilities_run: [] },
      summary: 'Could not determine what to do. Please be more specific.',
      results: [],
      duration_ms: Date.now() - startTime,
    };
  }

  // ── 5. Execute ────────────────────────────────────────────────────────────
  const executionResults = await executePlan(plan, userId, ctx);

  // ── 6. Summarize ──────────────────────────────────────────────────────────
  logger.info('[Orchestrator] Generating summary', { sessionId });

  const resultSnippets = executionResults.map((r) => {
    if (!r.success) return `${r.capability}: FAILED — ${r.error}`;
    return ctx.getContextSummary();
  }).join('\n\n');

  const summary = await llm.streamToString(
    [
      ...ctx.getHistory(),
      {
        role: 'user',
        content: `All research complete. Generate a structured intelligence report as a JSON object.

ORIGINAL GOAL: "${goal}"

RESEARCH RESULTS:
${liveMarketData ? `LIVE MARKET DATA:\n${liveMarketData}\n\n` : ""}${resultSnippets}

Return ONLY a valid JSON object with these exact fields:
{
  "taskId": "${sessionId}",
  "type": "market_research",
  "topic": "<topic from goal>",
  "executive_summary": "<2-3 sentences>",
  "market_narrative": "<detailed analysis paragraph>",
  "key_findings": ["<finding 1>", "<finding 2>", "<finding 3>"],
  "key_tokens": [
    {"symbol": "<SYMBOL>", "thesis": "<thesis>", "sentiment": "bullish|bearish|neutral", "risk_level": "low|medium|high"}
  ],
  "risks": ["<risk 1>", "<risk 2>"],
  "smart_money_signal": "bullish|bearish|neutral",
  "confidence_score": <strict scoring: 0.9+ only if you have real-time wallet addresses/tx hashes proving whale activity; 0.7-0.89 if you have live price+TVL+sentiment with specific numbers; 0.5-0.69 if you have some live data but missing whale flows or exchange netflows; 0.3-0.49 if mostly web article snippets without raw onchain data; below 0.3 if no live data at all>,
  "data_sources": ["<source 1>", "<source 2>"],
  "generated_at": "${new Date().toISOString()}"
}

Return ONLY the JSON. No markdown, no preamble, no backticks.`,
      },
    ],
    {
      systemPrompt: 'You are an autonomous research agent for AgentMesh. You MUST return valid JSON only. No markdown, no backticks, no preamble. Only a valid JSON object.',
      temperature: 0.4,
    }
  );

  // ── 7. Persist locally ────────────────────────────────────────────────────
  local.updateSession(sessionId, {
    status: 'completed',
    completedAt: new Date().toISOString(),
    results: executionResults,
    summary: summary.slice(0, 500),
  });

  // ── Store in MCP memory (non-blocking) ────────────────────────────────────
  const mcpUrl = process.env.MCP_SERVICE_URL || 'http://localhost:3002';
  const summaryText = typeof summary === 'string'
    ? summary.slice(0, 300)
    : JSON.stringify(summary).slice(0, 300);

  fetch(`${mcpUrl}/sessions/store`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId,
      userId,
      agentId: 'research',
      goal,
      summary: summaryText,
      capabilities: executionResults.map(r => r.capability),
      durationMs: Date.now() - startTime,
      tags: goal.split(' ').filter(w => w.length > 4).slice(0, 5),
    }),
  }).then(() => {
    logger.info('[Orchestrator] MCP session stored', { sessionId });
  }).catch(err => {
    logger.warn('[Orchestrator] MCP store failed (non-critical)', { error: err.message });
  });

  const duration = Date.now() - startTime;

  logger.info('[Orchestrator] Research complete', {
    sessionId, userId,
    capabilities: executionResults.length,
    success: executionResults.filter((r) => r.success).length,
    duration_ms: duration,
  });

  // Upload to Filecoin and get real CID
  let cid: string | null = null;
  try {
    const { execSync } = await import('child_process');
    const { writeFileSync, mkdirSync } = await import('fs');
    const { join } = await import('path');
    const tmpDir = '/tmp/argentus-research';
    mkdirSync(tmpDir, { recursive: true });
    const timestamp = Date.now();
    const deliverablePath = join(tmpDir, `deliverable-${timestamp}.json`);
    const deliverable = { sessionId, goal, report: summary ? JSON.parse(summary.replace(/```json|```/g, '').trim()) : {}, duration_ms: duration, generated_at: new Date().toISOString() };
    writeFileSync(deliverablePath, JSON.stringify(deliverable, null, 2));
    const FILECOIN_KEY = process.env.FILECOIN_PRIVATE_KEY;
    if (FILECOIN_KEY) {
      logger.info('[Orchestrator] Uploading to Filecoin...');
      const output = execSync(`PRIVATE_KEY=${FILECOIN_KEY} filecoin-pin add ${deliverablePath} 2>&1`, { timeout: 120000 }).toString();
      const cidMatch = output.match(/Root CID:\s+(baf[a-zA-Z0-9]+)/);
      if (cidMatch) {
        cid = cidMatch[1].trim();
        logger.info('[Orchestrator] Filecoin upload complete', { cid });
      } else {
        logger.warn('[Orchestrator] Could not extract CID from filecoin-pin output');
      }
    }
  } catch (err: any) {
    logger.warn('[Orchestrator] Filecoin upload failed', { error: err.message });
  }

  return {
    sessionId,
    userId,
    goal,
    cid,
    run_at: new Date().toISOString(),
    plan: {
      task_summary: plan.task_summary,
      output_type: plan.output_type,
      capabilities_run: plan.capabilities.map((c) => c.id),
    },
    summary,
    results: executionResults.map((r) => ({
      capability: r.capability,
      success: r.success,
      error: r.error,
      data: r.data,
      duration_ms: r.duration_ms,
    })),
    duration_ms: duration,
  };
}

export { getQueueStatus };

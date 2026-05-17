import { getLLM } from '../services/llm.js';
import { listCapabilities } from './capabilities/index.js';
import { logger } from '../utils/logger.js';
import type { ExecutionPlan } from './types.js';

// ─── Planner ──────────────────────────────────────────────────────────────────
// Parses a research goal into a structured execution plan
// Uses LLM to determine which capabilities to run and in what order

const STRICT = '\nRaw JSON only. Start {. End }. No markdown.';

export async function planResearch(
  goal: string,
  userId: string,
  contextSummary?: string
): Promise<ExecutionPlan> {
  const llm = getLLM();
  const capList = listCapabilities()
    .map((c) => `- ${c.id}: ${c.description} [keywords: ${c.keywords.slice(0, 4).join(', ')}]`)
    .join('\n');

  const userContext = contextSummary
    ? `\nContext from previous sessions:\n${contextSummary}`
    : '';

  logger.info('[Planner] Planning research', { userId, goal: goal.slice(0, 100) });

  const raw = await llm.prompt(`Parse this research goal into an execution plan.

GOAL: "${goal}"
USER: ${userId}
${userContext}

AVAILABLE CAPABILITIES:
${capList}

Rules:
- Select only capabilities that directly serve this goal
- Max 3 capabilities per plan
- If research feeds content generation, chain them (research first, content second)
- Extract specific params from the goal text
- onchain: needs target (wallet/token address) and type (wallet/token)
- competitive/market: needs company, competitors array
- reddit/blog/twitter/linkedin: needs topic string

JSON:
{
  "task_summary": "what this accomplishes, max 15 words",
  "capabilities": [
    {
      "id": "onchain|market|reddit|community", // MUST be exactly one of these strings, no suffixes
      "order": 1,
      "name": "human readable name",
      "params": {
        "topic": "extracted topic or null",
        "company": "company name if relevant",
        "competitors": ["list if relevant"],
        "target": "wallet/token address if onchain",
        "type": "wallet/token if onchain",
        "chain": "ethereum/base/arbitrum if onchain",
        "tweets": 12,
        "tone": "if blog post",
        "keyword": "if blog seo"
      },
      "depends_on": null,
      "reason": "why this capability, max 10 words"
    }
  ],
  "estimated_time_seconds": 60,
  "output_type": "research/content/mixed"
}${STRICT}`,
    'Research planner for Nexis private agent. Raw JSON only. Be precise.',
    { temperature: 0.2 }
  );

  try {
    const f = raw.indexOf('{');
    const l = raw.lastIndexOf('}');
    if (f === -1) throw new Error('No JSON found in planner response');

    const plan = JSON.parse(raw.slice(f, l + 1)) as ExecutionPlan;

    if (!plan.capabilities?.length) {
      throw new Error('Planner returned empty capabilities');
    }

    // Normalize capability IDs — Gemini sometimes appends _1, _2 suffixes
    const VALID_CAPS = ['onchain', 'market', 'reddit', 'community', 'blog', 'twitter'];
    plan.capabilities = plan.capabilities.map((c: any) => {
      const normalized = VALID_CAPS.find(v => c.id?.toLowerCase().startsWith(v))
      if (normalized && c.id !== normalized) {
        logger.info('[Planner] Normalized capability', { from: c.id, to: normalized })
        return { ...c, id: normalized }
      }
      return c
    }).filter((c: any) => VALID_CAPS.includes(c.id))

    if (!plan.capabilities?.length) {
      plan.capabilities = [
        { id: 'onchain', order: 1, name: 'Onchain Analysis', params: {}, depends_on: null, reason: 'default' },
        { id: 'market', order: 2, name: 'Market Analysis', params: {}, depends_on: null, reason: 'default' },
      ]
    }

    // Ensure onchain capabilities always have required params
    const goalLower = goal.toLowerCase()
    plan.capabilities = plan.capabilities.map((c: any) => {
      if (c.id === 'onchain' && (!c.params?.type || !c.params?.target)) {
        if (goalLower.includes('btc') || goalLower.includes('bitcoin')) {
          c.params = { ...c.params, type: 'token', target: 'BTC', chain: 'bitcoin' }
        } else if (goalLower.includes('eth') || goalLower.includes('ethereum') || goalLower.includes('defi')) {
          c.params = { ...c.params, type: 'token', target: 'ethereum', chain: 'ethereum' }
        } else if (goalLower.includes('sol') || goalLower.includes('solana')) {
          c.params = { ...c.params, type: 'token', target: 'SOL', chain: 'solana' }
        } else {
          c.params = { ...c.params, type: 'token', target: 'BTC', chain: 'bitcoin' }
        }
      }
      return c
    })

    logger.info('[Planner] Plan created', {
      userId,
      summary: plan.task_summary,
      capabilities: plan.capabilities.map((c) => c.id),
      estimated: plan.estimated_time_seconds,
    });

    return plan;
  } catch (err) {
    logger.error('[Planner] Failed to parse plan', { error: (err as Error).message, raw: raw.slice(0, 200) });
    throw new Error(`Planner failed: ${(err as Error).message}`);
  }
}

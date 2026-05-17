// Kimi web search service for Argentus Research
// Wire into ~/ipfs/research/src/services/kimi.ts

import axios from 'axios'
import { logger } from '../utils/logger.js'

const KIMI_API_KEY = process.env.KIMI_API_KEY || process.env.MOONSHOT_API_KEY || ''
const BASE_URL = 'https://api.moonshot.ai/v1'

export interface KimiSearchResult {
  title: string
  url: string
  snippet: string
  content: string
}

export async function kimiSearch(query: string, maxResults = 5): Promise<KimiSearchResult[]> {
  if (!KIMI_API_KEY) {
    logger.warn('[Kimi] No API key configured (set KIMI_API_KEY)')
    return []
  }
  try {
    const res = await axios.post(`${BASE_URL}/chat/completions`, {
      model: 'moonshot-v1-8k',
      messages: [
        {
          role: 'system',
          content: 'You are a financial research assistant. Search the web and return factual, data-rich answers with specific numbers, percentages, and sources.',
        },
        { role: 'user', content: query },
      ],
      tools: [{ type: 'builtin_function', function: { name: '$web_search' } }],
      tool_choice: 'auto',
      max_tokens: 3000,
      temperature: 0.3,
    }, {
      headers: { Authorization: `Bearer ${KIMI_API_KEY}`, 'Content-Type': 'application/json' },
      timeout: 45000,
    })

    const msg = res.data.choices?.[0]?.message
    if (!msg) return []

    // Tool call results
    const results: KimiSearchResult[] = []
    for (const call of (msg.tool_calls || [])) {
      if (call.function?.name === '$web_search' && call.function?.arguments) {
        try {
          const args = JSON.parse(call.function.arguments)
          if (args.results) {
            for (const r of args.results.slice(0, maxResults)) {
              results.push({ title: r.title || '', url: r.url || '', snippet: r.snippet || '', content: r.content || r.snippet || '' })
            }
          }
        } catch {}
      }
    }

    // Fallback: assistant reply as content
    if (results.length === 0 && msg.content) {
      results.push({ title: query, url: '', snippet: msg.content.slice(0, 300), content: msg.content })
    }

    logger.info('[Kimi] Search complete', { query: query.slice(0, 60), results: results.length })
    return results
  } catch (err: any) {
    logger.warn('[Kimi] Search failed', { error: err.message?.slice(0, 100) })
    return []
  }
}

// Batch market data search — covers all key data points for a research task
export async function fetchMarketIntelligence(token: string, chain: string): Promise<string> {
  const today = new Date().toISOString().slice(0, 10)
  const queries = [
    `${token} price market cap 24h volume ${today}`,
    `${token} ${chain} whale large wallet transactions exchange flows ${today}`,
    `${token} DeFi TVL onchain metrics exchange reserves ${today}`,
    `${token} market sentiment crypto fear greed index ${today}`,
  ]

  const sections: string[] = []
  for (const q of queries) {
    const results = await kimiSearch(q, 3)
    if (results.length > 0) {
      sections.push(`### ${q}\n${results.map(r => `- ${r.title}: ${r.snippet}`).join('\n')}`)
    }
    await new Promise(r => setTimeout(r, 800))
  }

  return sections.join('\n\n')
}

// DeFi protocol TVL search
export async function fetchProtocolTVL(protocols: string[]): Promise<string> {
  const today = new Date().toISOString().slice(0, 10)
  const query = `${protocols.join(' ')} TVL DeFiLlama total value locked ranking ${today}`
  const results = await kimiSearch(query, 5)
  return results.map(r => `${r.title}: ${r.snippet}`).join('\n')
}

// Web search service for Argentus Research
// Uses SerpApi (Google Search) — 250 free searches/month
// Wire into ~/ipfs/research/src/services/webSearch.ts

import axios from 'axios'
import { logger } from '../utils/logger.js'

const SERP_KEY = process.env.SERPAPI_KEY || ''
const BASE_URL = 'https://serpapi.com/search'

export interface SearchResult {
  title: string
  url: string
  snippet: string
}

export async function webSearch(query: string, num = 5): Promise<SearchResult[]> {
  if (!SERP_KEY) {
    logger.warn('[WebSearch] No SERPAPI_KEY configured')
    return []
  }
  try {
    const res = await axios.get(BASE_URL, {
      params: { q: query, api_key: SERP_KEY, engine: 'google', num },
      timeout: 15000,
    })
    const results = res.data.organic_results || []
    logger.info('[WebSearch] Results', { query: query.slice(0, 60), count: results.length })
    return results.map((r: any) => ({
      title: r.title || '',
      url: r.link || '',
      snippet: r.snippet || '',
    }))
  } catch (err: any) {
    logger.warn('[WebSearch] Failed', { error: err.message?.slice(0, 100) })
    return []
  }
}

// Fetch real market intelligence via web search
export async function fetchMarketIntelligence(token: string, chain: string): Promise<string> {
  const today = new Date().toISOString().slice(0, 10)
  const queries = [
    `${token} price market analysis ${today}`,
    `${token} ${chain} whale on-chain data ${today}`,
    `${token} DeFi TVL trend ${today}`,
    `${token} market sentiment crypto ${today}`,
  ]

  const sections: string[] = []
  for (const q of queries) {
    const results = await webSearch(q, 3)
    if (results.length > 0) {
      sections.push(`**${q}**\n${results.map(r => `- ${r.title}: ${r.snippet}`).join('\n')}`)
    }
    await new Promise(r => setTimeout(r, 300))
  }
  return sections.join('\n\n')
}

// Fetch protocol TVL and news
export async function fetchProtocolData(protocols: string[]): Promise<string> {
  const today = new Date().toISOString().slice(0, 10)
  const q = `${protocols.join(' ')} DeFi TVL protocol data ${today}`
  const results = await webSearch(q, 5)
  return results.map(r => `- [${r.title}](${r.url}): ${r.snippet}`).join('\n')
}

// Smart URL discovery — find real URLs for any protocol
export async function discoverProtocolURL(protocol: string): Promise<string | null> {
  const results = await webSearch(`${protocol} DeFi protocol official website`, 3)
  for (const r of results) {
    const url = r.url
    if (url && !url.includes('wikipedia') && !url.includes('twitter') && !url.includes('reddit')) {
      return url
    }
  }
  return null
}

// Aliases for backward compatibility with community.ts
export async function multiSearch(queries: string[]): Promise<SearchResult[][]> {
  const results = await Promise.all(queries.map(q => webSearch(q, 5)))
  return results
}

export function formatWebResults(results: SearchResult[]): string {
  if (!results.length) return ''
  return results.map(r => `**${r.title}**\n${r.snippet}\n${r.url}`).join('\n\n')
}

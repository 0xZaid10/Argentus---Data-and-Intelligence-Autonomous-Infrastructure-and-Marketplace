import axios from 'axios';
import { logger } from '../utils/logger.js';

// ─── DeFiLlama API Service ────────────────────────────────────────────────────
// Free, no API key needed. Used for real TVL data on DeFi protocols.

const BASE = 'https://api.llama.fi';
const TIMEOUT = 15000;

// Protocol slug mappings (DeFiLlama uses slugs not names)
const PROTOCOL_SLUGS: Record<string, string> = {
  'aave': 'aave',
  'lido': 'lido',
  'eigenlayer': 'eigenlayer',
  'uniswap': 'uniswap',
  'curve': 'curve-dex',
  'maker': 'makerdao',
  'sky': 'sky',
  'morpho': 'morpho',
  'pendle': 'pendle',
  'ethena': 'ethena',
  'spark': 'spark',
  'rocketpool': 'rocket-pool',
  'rocket pool': 'rocket-pool',
  'balancer': 'balancer',
  'sushiswap': 'sushiswap',
  'compound': 'compound-finance',
  // Solana
  'jupiter': 'jupiter',
  'raydium': 'raydium',
  'orca': 'orca',
  'marinade': 'marinade-finance',
  'jito': 'jito',
  'kamino': 'kamino',
  'drift': 'drift',
  'meteora': 'meteora',
  'marginfi': 'marginfi',
  'sanctum': 'sanctum',
  'solend': 'solend',
}

async function get<T>(path: string): Promise<T | null> {
  try {
    const res = await axios.get(`${BASE}${path}`, { timeout: TIMEOUT })
    return res.data as T
  } catch (err) {
    logger.warn('[DeFiLlama] Request failed', { path, error: (err as Error).message })
    return null
  }
}

export interface ProtocolTVL {
  name: string
  slug: string
  tvl: number
  tvl_1d_change: number
  tvl_7d_change: number
  chains: string[]
  category: string
}

// Get TVL for a list of protocol names
export async function getProtocolTVLs(protocols: string[]): Promise<ProtocolTVL[]> {
  const all = await get<any[]>('/protocols')
  if (!all) return []

  const results: ProtocolTVL[] = []

  for (const name of protocols) {
    const slug = PROTOCOL_SLUGS[name.toLowerCase()]
    if (!slug) continue

    const match = all.find((p: any) =>
      p.slug === slug || p.name?.toLowerCase() === name.toLowerCase()
    )

    if (match) {
      results.push({
        name: match.name,
        slug: match.slug,
        tvl: match.tvl || 0,
        tvl_1d_change: match.change_1d || 0,
        tvl_7d_change: match.change_7d || 0,
        chains: match.chains || [],
        category: match.category || 'Unknown',
      })
    }
  }

  return results.sort((a, b) => b.tvl - a.tvl)
}

// Get top protocols by TVL for a chain
export async function getChainTopProtocols(chain: string, limit = 10): Promise<ProtocolTVL[]> {
  const all = await get<any[]>('/protocols')
  if (!all) return []

  return all
    .filter((p: any) => p.chains?.includes(chain) && p.tvl > 0)
    .sort((a: any, b: any) => b.tvl - a.tvl)
    .slice(0, limit)
    .map((p: any) => ({
      name: p.name,
      slug: p.slug,
      tvl: p.tvl,
      tvl_1d_change: p.change_1d || 0,
      tvl_7d_change: p.change_7d || 0,
      chains: p.chains || [],
      category: p.category || 'Unknown',
    }))
}

// Get global TVL stats
export async function getGlobalTVL(): Promise<{ total: number; defi: number } | null> {
  const data = await get<any>('/v2/historicalChainTvl')
  if (!data || !Array.isArray(data)) return null
  const latest = data[data.length - 1]
  return { total: latest?.tvl || 0, defi: latest?.tvl || 0 }
}

// Format TVL for display
export function formatTVL(tvl: number): string {
  if (tvl >= 1e9) return `$${(tvl / 1e9).toFixed(2)}B`
  if (tvl >= 1e6) return `$${(tvl / 1e6).toFixed(1)}M`
  return `$${tvl.toLocaleString()}`
}

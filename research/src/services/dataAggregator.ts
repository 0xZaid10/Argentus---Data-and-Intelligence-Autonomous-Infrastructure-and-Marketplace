// Argentus Free Data Aggregator
// Pulls from all available free APIs and returns structured market data
// Wire into ~/ipfs/research/src/services/dataAggregator.ts

import axios from 'axios'
import { logger } from '../utils/logger.js'

const ETHERSCAN_KEY = process.env.ETHERSCAN_API_KEY || ''
const TIMEOUT = 10000

async function fetchJSON(url: string, headers: Record<string, string> = {}): Promise<any> {
  try {
    const res = await axios.get(url, {
      timeout: TIMEOUT,
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json', ...headers },
    })
    return res.data
  } catch {
    return null
  }
}

// ── DeFiLlama ────────────────────────────────────────────────────────────────
async function getTopProtocols(limit = 10) {
  const data = await fetchJSON('https://api.llama.fi/protocols')
  if (!data) return []
  return data
    .filter((p: any) => p.tvl > 0)
    .sort((a: any, b: any) => b.tvl - a.tvl)
    .slice(0, limit)
    .map((p: any) => ({
      name: p.name,
      tvl: p.tvl,
      tvl_formatted: `$${(p.tvl / 1e9).toFixed(2)}B`,
      change_1d: p.change_1d || 0,
      change_7d: p.change_7d || 0,
      category: p.category,
      chains: p.chains?.slice(0, 3),
    }))
}

async function getChainTVL(chain: string) {
  const data = await fetchJSON(`https://api.llama.fi/v2/historicalChainTvl/${chain}`)
  if (!data || !data.length) return null
  const latest = data[data.length - 1]
  const weekAgo = data[Math.max(0, data.length - 8)]
  return {
    current: latest.tvl,
    current_formatted: `$${(latest.tvl / 1e9).toFixed(2)}B`,
    week_ago: weekAgo.tvl,
    change_7d_pct: ((latest.tvl - weekAgo.tvl) / weekAgo.tvl * 100).toFixed(2),
  }
}

async function getProtocolTVL(protocol: string) {
  const data = await fetchJSON(`https://api.llama.fi/protocol/${protocol}`)
  if (!data) return null
  const tvlArr = data.tvl || []
  const current = tvlArr[tvlArr.length - 1]?.totalLiquidityUSD || 0
  const weekAgo = tvlArr[Math.max(0, tvlArr.length - 8)]?.totalLiquidityUSD || 0
  return {
    name: data.name,
    tvl: current,
    tvl_formatted: `$${(current / 1e9).toFixed(2)}B`,
    change_7d_pct: weekAgo ? ((current - weekAgo) / weekAgo * 100).toFixed(2) : 'N/A',
    category: data.category,
  }
}

// ── CoinGecko ────────────────────────────────────────────────────────────────
async function getPrices(tokens: string[]) {
  const ids = tokens.join(',')
  const data = await fetchJSON(
    `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true`
  )
  if (!data) return {}
  const result: Record<string, any> = {}
  for (const [k, v] of Object.entries(data as Record<string, any>)) {
    result[k] = {
      price: v.usd,
      price_formatted: `$${v.usd?.toLocaleString()}`,
      change_24h: v.usd_24h_change?.toFixed(2),
      market_cap: v.usd_market_cap,
      market_cap_formatted: `$${(v.usd_market_cap / 1e9).toFixed(1)}B`,
      volume_24h: v.usd_24h_vol,
    }
  }
  return result
}

async function getGlobalMarket() {
  const data = await fetchJSON('https://api.coingecko.com/api/v3/global')
  if (!data) return null
  const d = data.data
  return {
    total_market_cap: `$${(d.total_market_cap?.usd / 1e12).toFixed(2)}T`,
    total_volume: `$${(d.total_volume?.usd / 1e9).toFixed(0)}B`,
    btc_dominance: `${d.market_cap_percentage?.btc?.toFixed(1)}%`,
    eth_dominance: `${d.market_cap_percentage?.eth?.toFixed(1)}%`,
    active_cryptos: d.active_cryptocurrencies,
    market_cap_change_24h: `${d.market_cap_change_percentage_24h_usd?.toFixed(2)}%`,
  }
}

async function getTrending() {
  const data = await fetchJSON('https://api.coingecko.com/api/v3/search/trending')
  if (!data) return []
  return data.coins?.slice(0, 7).map((c: any) => ({
    symbol: c.item.symbol,
    name: c.item.name,
    rank: c.item.market_cap_rank,
  })) || []
}

// ── Fear & Greed ─────────────────────────────────────────────────────────────
async function getFearAndGreed() {
  const data = await fetchJSON('https://api.alternative.me/fng/?limit=7&format=json')
  if (!data) return null
  const latest = data.data[0]
  const weekData = data.data
  return {
    value: parseInt(latest.value),
    classification: latest.value_classification,
    week_avg: Math.round(weekData.reduce((s: number, d: any) => s + parseInt(d.value), 0) / weekData.length),
    trend: weekData.map((d: any) => `${d.value}(${d.value_classification.slice(0,4)})`).join(' → '),
  }
}

// ── Etherscan ────────────────────────────────────────────────────────────────
async function getEthStats() {
  if (!ETHERSCAN_KEY) return null
  const base = `https://api.etherscan.io/v2/api?chainid=1&apikey=${ETHERSCAN_KEY}`

  const [supply, gas, nodes, txns] = await Promise.all([
    fetchJSON(`${base}&module=stats&action=ethsupply2`),
    fetchJSON(`${base}&module=gastracker&action=gasoracle`),
    fetchJSON(`${base}&module=stats&action=nodecount`),
    fetchJSON(`${base}&module=stats&action=dailytx&startdate=2026-05-15&enddate=2026-05-16&sort=desc`),
  ])

  return {
    supply: supply?.result ? {
      total: `${(parseInt(supply.result.EthSupply) / 1e18).toFixed(2)}M ETH`,
      staked: `${(parseInt(supply.result.Eth2Staking || 0) / 1e18).toFixed(2)}M ETH`,
      burned: `${(parseInt(supply.result.BurntFees || 0) / 1e18).toFixed(2)}M ETH`,
    } : null,
    gas: gas?.result ? {
      fast: `${gas.result.FastGasPrice} gwei`,
      safe: `${gas.result.SafeGasPrice} gwei`,
      base: `${parseFloat(gas.result.suggestBaseFee || 0).toFixed(2)} gwei`,
    } : null,
    nodes: nodes?.result?.TotalNodeCount,
    daily_txns: txns?.result?.[0]?.transactionCount,
  }
}

// ── Bitcoin (Mempool + Blockchain.info + CryptoCompare) ──────────────────────
async function getBitcoinData() {
  const [fees, hashrate, price, difficulty, stats, ohlcv] = await Promise.all([
    fetchJSON('https://mempool.space/api/v1/fees/recommended'),
    fetchJSON('https://mempool.space/api/v1/mining/hashrate/3d'),
    fetchJSON('https://mempool.space/api/v1/prices'),
    fetchJSON('https://mempool.space/api/v1/difficulty-adjustment'),
    fetchJSON('https://blockchain.info/stats?format=json'),
    fetchJSON('https://min-api.cryptocompare.com/data/v2/histoday?fsym=BTC&tsym=USD&limit=7'),
  ])

  const prices7d = ohlcv?.Data?.Data || []

  return {
    price: price?.USD ? `$${price.USD.toLocaleString()}` : null,
    fees: fees ? { fast: `${fees.fastestFee} sat/vB`, economy: `${fees.economyFee} sat/vB` } : null,
    hashrate: hashrate ? `${(hashrate.currentHashrate / 1e18).toFixed(0)} EH/s` : null,
    difficulty_change: difficulty ? `${difficulty.difficultyChange?.toFixed(2)}%` : null,
    daily_txns: stats?.n_tx?.toLocaleString(),
    mempool_size: stats?.mempool_size?.toLocaleString(),
    ohlcv_7d: prices7d.length ? {
      open: `$${prices7d[0].open?.toLocaleString()}`,
      close: `$${prices7d[prices7d.length - 1].close?.toLocaleString()}`,
      avg_volume: `$${(prices7d.reduce((s: number, p: any) => s + p.volumeto, 0) / prices7d.length / 1e9).toFixed(1)}B/day`,
      high: `$${Math.max(...prices7d.map((p: any) => p.high))?.toLocaleString()}`,
      low: `$${Math.min(...prices7d.map((p: any) => p.low))?.toLocaleString()}`,
    } : null,
  }
}

// ── CryptoCompare OHLCV ───────────────────────────────────────────────────────
async function getOHLCV(symbol: string, days = 7) {
  const data = await fetchJSON(`https://min-api.cryptocompare.com/data/v2/histoday?fsym=${symbol}&tsym=USD&limit=${days}`)
  if (!data) return null
  const prices = data.Data?.Data || []
  if (!prices.length) return null
  return {
    open: prices[0].open,
    close: prices[prices.length - 1].close,
    high: Math.max(...prices.map((p: any) => p.high)),
    low: Math.min(...prices.map((p: any) => p.low)),
    avg_volume_usd: prices.reduce((s: number, p: any) => s + p.volumeto, 0) / prices.length,
    change_pct: ((prices[prices.length - 1].close - prices[0].open) / prices[0].open * 100).toFixed(2),
  }
}

// ── MAIN: fetch all data for a research task ──────────────────────────────────
export async function fetchAllMarketData(focus: {
  tokens?: string[]    // e.g. ['bitcoin', 'ethereum', 'solana']
  symbols?: string[]   // e.g. ['BTC', 'ETH', 'SOL']
  protocols?: string[] // e.g. ['aave', 'lido', 'uniswap']
  chain?: string       // e.g. 'Ethereum', 'Solana'
}): Promise<string> {

  const { tokens = [], symbols = [], protocols = [], chain } = focus

  logger.info('[DataAggregator] Fetching market data', { tokens, protocols, chain })

  const [
    prices,
    global,
    trending,
    fearGreed,
    topProtocols,
    chainTVL,
    ethStats,
    btcData,
  ] = await Promise.allSettled([
    tokens.length ? getPrices(tokens) : Promise.resolve({}),
    getGlobalMarket(),
    getTrending(),
    getFearAndGreed(),
    getTopProtocols(10),
    chain ? getChainTVL(chain) : Promise.resolve(null),
    getEthStats(),
    symbols.includes('BTC') || tokens.includes('bitcoin') ? getBitcoinData() : Promise.resolve(null),
  ])

  // Fetch protocol TVLs
  const protocolData: Record<string, any> = {}
  for (const p of protocols) {
    protocolData[p] = await getProtocolTVL(p)
    await new Promise(r => setTimeout(r, 200)) // rate limit
  }

  // Fetch OHLCV for symbols
  const ohlcvData: Record<string, any> = {}
  for (const sym of symbols.filter(s => s !== 'BTC')) { // BTC handled above
    ohlcvData[sym] = await getOHLCV(sym, 7)
    await new Promise(r => setTimeout(r, 200))
  }

  // Format as structured text for LLM
  const sections: string[] = ['=== LIVE MARKET DATA ===\n']

  // Global
  const g = global.status === 'fulfilled' ? global.value : null
  if (g) {
    sections.push(`GLOBAL MARKET\n${Object.entries(g).map(([k,v]) => `  ${k}: ${v}`).join('\n')}\n`)
  }

  // Prices
  const p = prices.status === 'fulfilled' ? prices.value : {}
  if (Object.keys(p).length) {
    sections.push('PRICES\n' + Object.entries(p).map(([k,v]: [string, any]) =>
      `  ${k.toUpperCase()}: ${v.price_formatted} (24h: ${v.change_24h}%, mcap: ${v.market_cap_formatted})`
    ).join('\n') + '\n')
  }

  // Fear & Greed
  const fg = fearGreed.status === 'fulfilled' ? fearGreed.value : null
  if (fg) {
    sections.push(`SENTIMENT\n  Fear & Greed: ${fg.value} (${fg.classification})\n  7d avg: ${fg.week_avg}\n  Trend: ${fg.trend}\n`)
  }

  // Trending
  const tr = trending.status === 'fulfilled' ? trending.value : []
  if (tr?.length) {
    sections.push(`TRENDING\n  ${tr.map((t: any) => `${t.symbol}(#${t.rank})`).join(', ')}\n`)
  }

  // Bitcoin
  const btc = btcData.status === 'fulfilled' ? btcData.value : null
  if (btc) {
    sections.push(`BITCOIN ON-CHAIN\n` +
      `  Price: ${btc.price}\n` +
      `  Hashrate: ${btc.hashrate}\n` +
      `  Fees: ${btc.fees?.fast} fast / ${btc.fees?.economy} economy\n` +
      `  Daily txns: ${btc.daily_txns}\n` +
      `  Next difficulty: ${btc.difficulty_change}\n` +
      (btc.ohlcv_7d ? `  7d OHLCV: ${btc.ohlcv_7d.open} → ${btc.ohlcv_7d.close} (vol: ${btc.ohlcv_7d.avg_volume})\n` : '') +
      '\n')
  }

  // Ethereum
  const eth = ethStats.status === 'fulfilled' ? ethStats.value : null
  if (eth) {
    sections.push(`ETHEREUM ON-CHAIN\n` +
      (eth.supply ? `  Supply: ${eth.supply.total} | Staked: ${eth.supply.staked}\n` : '') +
      (eth.gas ? `  Gas: ${eth.gas.fast} fast / ${eth.gas.base} base\n` : '') +
      (eth.nodes ? `  Nodes: ${eth.nodes}\n` : '') +
      (eth.daily_txns ? `  Daily txns: ${eth.daily_txns}\n` : '') +
      '\n')
  }

  // Chain TVL
  const ctv = chainTVL.status === 'fulfilled' ? chainTVL.value : null
  if (ctv && chain) {
    sections.push(`${chain.toUpperCase()} DEFI TVL\n  Current: ${ctv.current_formatted}\n  7d change: ${ctv.change_7d_pct}%\n\n`)
  }

  // Top protocols
  const tp = topProtocols.status === 'fulfilled' ? topProtocols.value : []
  if (tp?.length) {
    sections.push('TOP DEFI PROTOCOLS BY TVL\n' +
      tp.map((p: any) => `  ${p.name} (${p.category}): ${p.tvl_formatted} | 7d: ${p.change_7d?.toFixed(1)}%`).join('\n') + '\n\n')
  }

  // Protocol specific
  if (Object.keys(protocolData).length) {
    sections.push('PROTOCOL TVL DETAIL\n' +
      Object.entries(protocolData).map(([k, v]) =>
        v ? `  ${v.name}: ${v.tvl_formatted} (7d: ${v.change_7d_pct}%)` : `  ${k}: unavailable`
      ).join('\n') + '\n\n')
  }

  // OHLCV
  if (Object.keys(ohlcvData).length) {
    sections.push('7-DAY PRICE ACTION\n' +
      Object.entries(ohlcvData).map(([sym, v]) =>
        v ? `  ${sym}: $${v.open?.toLocaleString()} → $${v.close?.toLocaleString()} (${v.change_pct}%) vol: $${(v.avg_volume_usd/1e9).toFixed(1)}B/day` : `  ${sym}: unavailable`
      ).join('\n') + '\n')
  }

  const result = sections.join('\n')
  logger.info('[DataAggregator] Complete', { sections: sections.length, chars: result.length })
  return result
}

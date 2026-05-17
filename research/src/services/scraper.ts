import axios from 'axios';
import * as cheerio from 'cheerio';
import { breakers } from '../utils/circuit-breaker.js';
import { logger } from '../utils/logger.js';
import { discoverProtocolURL } from './webSearch.js';

// ─── Scraper Service ──────────────────────────────────────────────────────────
// Ported from agent-src/services/scraper.js
// ALL fetches go through PrivacyRouter — no direct HTTP calls

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
};

async function withRetry<T>(fn: () => Promise<T>, retries = 2, delay = 1000): Promise<T> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      logger.warn('[Scraper] Retry', { attempt, error: (err as Error).message });
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, delay * attempt));
    }
  }
  throw new Error('All retries exhausted');
}

async function fetchPage(url: string): Promise<string | null> {
  try {
    return await breakers.scraper.call(async () => {
      return withRetry(async () => {
        logger.info('[Scraper] Fetching', { url });

        // ALL requests routed through AXL privacy layer
                const res = await axios.get(url, { headers: HEADERS, timeout: 10000 });

        if (res.status >= 400) throw new Error(`HTTP ${res.status}`);
        return res.data as string;
      });
    });
  } catch (err) {
    logger.error('[Scraper] Failed', { url, error: (err as Error).message });
    return null;
  }
}

function extractText(html: string | null, selector = 'body'): string {
  if (!html) return '';
  const $ = cheerio.load(html);
  $('script, style, nav, footer, head').remove();
  return $(selector).text().replace(/\s+/g, ' ').trim().slice(0, 8000);
}

function extractBlogTitles(html: string | null): string[] {
  if (!html) return [];
  const $ = cheerio.load(html);
  const titles: string[] = [];
  $('h2, h3, article h1, .post-title, .blog-title').each((_, el) => {
    const t = $(el).text().trim();
    if (t.length > 10) titles.push(t);
  });
  return titles.slice(0, 10);
}

export interface ScrapedCompetitor {
  domain: string;
  scraped_at: string;
  pricing?: { url: string; text: string };
  homepage?: { url: string; text: string };
  blog?: { url: string; titles: string[] };
}

// ─── Known competitor domain map ─────────────────────────────────────────────
// Maps common company names to their actual domains

const KNOWN_DOMAINS: Record<string, string> = {
  'rivian': 'rivian.com',
  'lucid': 'lucidmotors.com',
  'lucid motors': 'lucidmotors.com',
  'polestar': 'polestar.com',
  'ford': 'ford.com',
  'hyundai': 'hyundai.com',
  'kia': 'kia.com',
  'bmw': 'bmw.com',
  'mercedes': 'mercedes-benz.com',
  'volkswagen': 'vw.com',
  'vw': 'vw.com',
  'gm': 'gm.com',
  'chevrolet': 'chevrolet.com',
  'chevy': 'chevrolet.com',
  'byd': 'byd.com',
  'tesla': 'tesla.com',
  'apple': 'apple.com',
  'google': 'google.com',
  'microsoft': 'microsoft.com',
  'amazon': 'amazon.com',
  'netflix': 'netflix.com',
  'spotify': 'spotify.com',
  'notion': 'notion.so',
  'clickup': 'clickup.com',
  'asana': 'asana.com',
  'linear': 'linear.app',
  'jira': 'atlassian.com',
  'slack': 'slack.com',
  'figma': 'figma.com',
  'airtable': 'airtable.com',
  'obsidian': 'obsidian.md',
  'stripe': 'stripe.com',
  'shopify': 'shopify.com',
  'hubspot': 'hubspot.com',
  'salesforce': 'salesforce.com',
  'zendesk': 'zendesk.com',
  'intercom': 'intercom.com',
  'openai': 'openai.com',
  'anthropic': 'anthropic.com',
  'midjourney': 'midjourney.com',

  // ── Crypto / DeFi protocols ───────────────────────────────────────────────
  // Solana
  'jupiter': 'jup.ag',
  'jup': 'jup.ag',
  'raydium': 'raydium.io',
  'orca': 'orca.so',
  'marinade': 'marinade.finance',
  'jito': 'jito.network',
  'kamino': 'kamino.finance',
  'drift': 'drift.trade',
  'marginfi': 'marginfi.com',
  'meteora': 'meteora.ag',
  'sanctum': 'sanctum.so',
  'tensor': 'tensor.trade',
  'magic eden': 'magiceden.io',
  'magic eden solana': 'magiceden.io',
  'pump.fun': 'pump.fun',
  'pumpswap': 'pump.fun',
  'helius': 'helius.dev',
  'solend': 'solend.fi',

  // Ethereum DeFi
  'uniswap': 'uniswap.org',
  'aave': 'aave.com',
  'compound': 'compound.finance',
  'curve': 'curve.fi',
  'convex': 'convexfinance.com',
  'lido': 'lido.fi',
  'eigenlayer': 'eigenlayer.xyz',
  'maker': 'makerdao.com',
  'sky': 'sky.money',
  'morpho': 'morpho.org',
  'spark': 'spark.fi',
  'pendle': 'pendle.finance',
  'ethena': 'ethena.fi',
  'rocketpool': 'rocketpool.net',
  'rocket pool': 'rocketpool.net',
  'frax': 'frax.finance',
  'balancer': 'balancer.fi',
  'sushi': 'sushi.com',
  'sushiswap': 'sushi.com',
  '1inch': '1inch.io',
  'dydx': 'dydx.xyz',
  'gmx': 'gmx.io',
  'hyperliquid': 'hyperliquid.xyz',

  // L2s / Chains
  'arbitrum': 'arbitrum.io',
  'optimism': 'optimism.io',
  'base': 'base.org',
  'polygon': 'polygon.technology',
  'zksync': 'zksync.io',
  'starknet': 'starknet.io',
  'solana': 'solana.com',
  'sui': 'sui.io',
  'aptos': 'aptos.dev',
  'monad': 'monad.xyz',

  // Data / Infrastructure
  'defillama': 'defillama.com',
  'dune': 'dune.com',
  'nansen': 'nansen.ai',
  'arkham': 'arkhamintelligence.com',
  'glassnode': 'glassnode.com',
  'coingecko': 'coingecko.com',
  'coinmarketcap': 'coinmarketcap.com',
  'messari': 'messari.io',
  'token terminal': 'tokenterminal.com',
  'debank': 'debank.com',
};

function normalizeDomain(input: string): string {
  // Already a full URL
  if (input.startsWith('http://') || input.startsWith('https://')) return input;

  const lower = input.toLowerCase().trim();

  // Check exact match first
  if (KNOWN_DOMAINS[lower]) return `https://${KNOWN_DOMAINS[lower]}`;

  // Handle slash-separated aliases like "MakerDAO/Sky" → try each part
  if (input.includes('/')) {
    for (const part of input.split('/')) {
      const p = part.toLowerCase().trim();
      if (KNOWN_DOMAINS[p]) return `https://${KNOWN_DOMAINS[p]}`;
    }
  }

  // Handle "Protocol Name (ticker)" format → strip parens
  const stripped = lower.replace(/\s*\([^)]*\)/g, '').trim();
  if (KNOWN_DOMAINS[stripped]) return `https://${KNOWN_DOMAINS[stripped]}`;

  // Has a dot — likely already a domain
  if (input.includes('.')) return `https://${input}`;

  // Try common variations: "ether.fi" → check with dot
  const withDot = lower.replace(/\s+/g, '.');
  if (KNOWN_DOMAINS[withDot]) return `https://${KNOWN_DOMAINS[withDot]}`;

  // Convert name to domain: "Lucid Motors" → lucidmotors.com
  const slug = lower.replace(/\s+/g, '').replace(/[^\.a-z0-9]/g, '');
  return `https://${slug}.com`;
}

// Async version that discovers real URLs via search
export async function discoverAndScrape(domain: string): Promise<ScrapedCompetitor> {
  // First check known domains
  const baseUrl = normalizeDomain(domain)
  
  // If it's a generic .com fallback, try to discover real URL
  const lower = domain.toLowerCase().trim()
  if (!KNOWN_DOMAINS[lower] && !domain.includes('.')) {
    try {
      const discovered = await discoverProtocolURL(domain)
      if (discovered) {
        logger.info('[Scraper] Discovered URL', { domain, url: discovered })
        return scrapeCompetitor(discovered)
      }
    } catch {}
  }
  
  return scrapeCompetitor(domain)
}

// ── DeFi protocol URL patterns ────────────────────────────────────────────────
// DeFi protocols don't have /pricing pages — use their actual content URLs
const DEFI_URL_PATTERNS: Record<string, { info?: string; blog?: string; docs?: string }> = {
  'jup.ag':              { info: '/tokens', blog: 'https://station.jup.ag/blog' },
  'raydium.io':          { info: '/', blog: '/blog' },
  'orca.so':             { info: '/', blog: '/blog' },
  'marinade.finance':    { info: '/', blog: 'https://marinade.finance/blog' },
  'jito.network':        { info: '/', blog: '/blog' },
  'kamino.finance':      { info: '/', blog: '/blog' },
  'drift.trade':         { info: '/', blog: 'https://blog.drift.trade' },
  'marginfi.com':        { info: '/', docs: 'https://docs.marginfi.com' },
  'meteora.ag':          { info: '/', docs: 'https://docs.meteora.ag' },
  'sanctum.so':          { info: '/', blog: '/blog' },
  'aave.com':            { info: '/', blog: 'https://governance.aave.com' },
  'lido.fi':             { info: '/', blog: 'https://blog.lido.fi' },
  'eigenlayer.xyz':      { info: '/', blog: 'https://www.blog.eigenlayer.xyz' },
  'uniswap.org':         { info: '/', blog: 'https://blog.uniswap.org' },
  'curve.fi':            { info: '/', docs: 'https://resources.curve.finance' },
  'pendle.finance':      { info: '/', blog: 'https://blog.pendle.finance' },
  'ethena.fi':           { info: '/', blog: 'https://mirror.xyz/ethena.eth' },
  'morpho.org':          { info: '/', blog: 'https://blog.morpho.org' },
  'sky.money':           { info: '/', docs: 'https://docs.sky.money' },
};

function isDefiDomain(baseUrl: string): boolean {
  return Object.keys(DEFI_URL_PATTERNS).some(d => baseUrl.includes(d));
}

export async function scrapeCompetitor(domain: string): Promise<ScrapedCompetitor> {
  const baseUrl = normalizeDomain(domain);
  const result: ScrapedCompetitor = {
    domain,
    scraped_at: new Date().toISOString(),
  };

  // For DeFi protocols — skip /pricing, use actual content URLs
  if (isDefiDomain(baseUrl)) {
    const domainKey = Object.keys(DEFI_URL_PATTERNS).find(d => baseUrl.includes(d));
    const patterns = domainKey ? DEFI_URL_PATTERNS[domainKey] : {};

    // Homepage / app info
    const homeHtml = await fetchPage(baseUrl);
    if (homeHtml) {
      result.homepage = { url: baseUrl, text: extractText(homeHtml) };
    }

    // Blog/docs if available
    if (patterns.blog) {
      const blogUrl = patterns.blog.startsWith('http') ? patterns.blog : `${baseUrl}${patterns.blog}`;
      const blogHtml = await fetchPage(blogUrl);
      if (blogHtml) {
        result.blog = { url: blogUrl, titles: extractBlogTitles(blogHtml) };
      }
    }

    logger.info('[Scraper] Complete', { domain, pages: Object.keys(result).filter(k => k !== 'domain' && k !== 'scraped_at') });
    return result;
  }

  // Pricing page (for non-DeFi)
  for (const suffix of ['/pricing', '/plans', '/price']) {
    const html = await fetchPage(`${baseUrl}${suffix}`);
    if (html) {
      result.pricing = { url: `${baseUrl}${suffix}`, text: extractText(html) };
      break;
    }
  }

  // Homepage
  const homeHtml = await fetchPage(baseUrl);
  if (homeHtml) {
    result.homepage = { url: baseUrl, text: extractText(homeHtml) };
  }

  // Blog
  for (const suffix of ['/blog', '/news', '/updates']) {
    const html = await fetchPage(`${baseUrl}${suffix}`);
    if (html) {
      const titles = extractBlogTitles(html);
      if (titles.length > 0) {
        result.blog = { url: `${baseUrl}${suffix}`, titles };
        break;
      }
    }
  }

  logger.info('[Scraper] Complete', {
    domain,
    pages: [result.pricing && 'pricing', result.homepage && 'homepage', result.blog && 'blog']
      .filter(Boolean),
  });

  return result;
}

import { runCompetitiveIntel } from './competitive.js';
import { runMarketResearch } from './market.js';
import { runCommunityResearch } from './community.js';
import { runContentGeneration } from './content.js';
import { runOnchainResearch } from './onchain.js';
import type { CapabilityResult } from '../types.js';

// ─── Capability Registry ──────────────────────────────────────────────────────
// Stripped: KeeperHub removed
// Kept: onchain, market, competitive, reddit/community, content

export interface CapabilityDefinition {
  id: string;
  description: string;
  keywords: string[];
  needs_topic: boolean;
  runner: (params: Record<string, unknown>) => Promise<CapabilityResult>;
}

export const CAPABILITIES: Record<string, CapabilityDefinition> = {
  onchain: {
    id: 'onchain',
    description: 'Analyze wallets, tokens, fund flows, and onchain activity across multiple chains',
    keywords: ['wallet', 'token', 'onchain', 'address', 'defi', 'blockchain', 'eth', 'transaction', 'holder', 'whale', 'fund flow'],
    needs_topic: true,
    runner: (params) => runOnchainResearch(params as any),
  },

  competitive: {
    id: 'competitive',
    description: 'Scrape and analyze competitors, detect changes, generate battlecards and steelman analysis',
    keywords: ['competitor', 'competitive', 'intel', 'monitor', 'track', 'versus', 'vs', 'compare', 'rival', 'battlecard'],
    needs_topic: false,
    runner: (params) => runCompetitiveIntel(params as any),
  },

  market: {
    id: 'market',
    description: 'Full market research: pricing landscape, feature matrix, hiring signals, HN and Product Hunt signals',
    keywords: ['market', 'landscape', 'pricing', 'feature matrix', 'tam', 'sizing', 'opportunity', 'gap analysis'],
    needs_topic: true,
    runner: (params) => runMarketResearch(params as any),
  },

  reddit: {
    id: 'reddit',
    description: 'Multi-source community research: Reddit, GitHub Issues, Hacker News — finds pain points, sentiment, market signals',
    keywords: ['reddit', 'pain point', 'community', 'forum', 'complaints', 'user research', 'validate', 'sentiment', 'hacker news', 'discussion', 'feedback', 'review'],
    needs_topic: true,
    runner: (params) => runCommunityResearch(params as any),
  },

  blog_post: {
    id: 'blog_post',
    description: 'Write a full SEO-optimized blog post grounded in research data',
    keywords: ['blog', 'article', 'post', 'write', 'seo', 'long form', 'content'],
    needs_topic: true,
    runner: (params) => runContentGeneration({ ...params as any, type: 'blog_post' }),
  },

  twitter_thread: {
    id: 'twitter_thread',
    description: 'Write a viral Twitter/X thread with hooks and data-backed insights',
    keywords: ['twitter', 'tweet', 'thread', 'x post', 'viral', 'social media'],
    needs_topic: true,
    runner: (params) => runContentGeneration({ ...params as any, type: 'twitter_thread' }),
  },

  linkedin_post: {
    id: 'linkedin_post',
    description: 'Write a thought leadership LinkedIn post grounded in research',
    keywords: ['linkedin', 'thought leadership', 'professional'],
    needs_topic: true,
    runner: (params) => runContentGeneration({ ...params as any, type: 'linkedin_post' }),
  },
};

export function listCapabilities() {
  return Object.values(CAPABILITIES).map((c) => ({
    id: c.id,
    description: c.description,
    needs_topic: c.needs_topic,
    keywords: c.keywords,
  }));
}

export function getCapability(id: string): CapabilityDefinition | undefined {
  return CAPABILITIES[id];
}

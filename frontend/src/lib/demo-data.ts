import { PROOF_EXAMPLES } from '@/config'
import type { AgentStatus, MarketplaceRequest, MarketplaceSubmission, Task } from './api'

export interface DemoReport {
  executive_summary: string
  market_narrative?: string
  key_findings: string[]
  key_tokens: Array<{
    symbol: string
    thesis: string
    sentiment: 'bullish' | 'bearish' | 'neutral'
    risk_level: 'low' | 'medium' | 'high'
  }>
  risks: string[]
  smart_money_signal: 'bullish' | 'bearish' | 'neutral'
  confidence_score: number
  data_sources: string[]
  generated_at: string
}

export interface DemoLeaderboardRow {
  address: string
  total_submissions: number
  approved: number
  submitter_address?: string
  total?: number
  approved_submissions?: number
}

const now = new Date('2026-05-18T12:00:00.000Z')

const isoHoursAgo = (hoursAgo: number) => new Date(now.getTime() - hoursAgo * 60 * 60 * 1000).toISOString()
const isoDaysAgo = (daysAgo: number) => new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000).toISOString()

export const DEMO_AGENTS: AgentStatus[] = [
  { id: 'agent-coordinator', name: 'Coordinator', status: 'active', lastSeen: isoHoursAgo(0.05), tasksCompleted: 214 },
  { id: 'agent-research', name: 'Researcher', status: 'active', lastSeen: isoHoursAgo(0.03), tasksCompleted: 346 },
  { id: 'agent-verifier', name: 'Verifier', status: 'active', lastSeen: isoHoursAgo(0.04), tasksCompleted: 301 },
  { id: 'agent-trader', name: 'Trader', status: 'active', lastSeen: isoHoursAgo(1.4), tasksCompleted: 118 },
]

export const DEMO_MARKETPLACE_STATS = {
  open_requests: 4,
  total_requests: 29,
  total_submissions: 54,
  approved_submissions: 34,
  total_rewarded_usdc: 2940,
}

const completedTasks: Task[] = [
  {
    id: 'demo-task-btc-whales',
    description: 'Analyze BTC whale accumulation today and judge whether smart money is still adding into strength.',
    status: 'completed',
    type: 'market_research',
    escrow_uid: null,
    result_cid: PROOF_EXAMPLES[1].cid,
    fulfillment_uid: '0x1822259dfe19052b0dcaf34af88dcac8f6ced798db2d3811e7082cbfe6ec99bb',
    confidence: 0.85,
    signal: 'bullish',
    summary: 'Whale accumulation stayed positive while exchange balances slipped, keeping the short-term BTC setup constructive.',
    arbitrate_tx: PROOF_EXAMPLES[1].arbitrate_tx,
    collect_tx: PROOF_EXAMPLES[1].collect_tx,
    created_at: isoHoursAgo(30),
    updated_at: isoHoursAgo(28),
    user_chat_id: 'telegram:1234567890',
  },
  {
    id: 'demo-task-eth-defi-tvl',
    description: 'Measure ETH DeFi TVL momentum and decide whether the latest growth is broad or concentrated.',
    status: 'completed',
    type: 'market_research',
    escrow_uid: null,
    result_cid: PROOF_EXAMPLES[0].cid,
    fulfillment_uid: '0x0d24fbfd3d19bf25f9d8f522f7998ac0a9fdb43f306c5a2ce0d44dcfb0ab0a4b',
    confidence: 0.58,
    signal: 'neutral',
    summary: 'ETH DeFi is recovering, but the strongest activity is still clustered in a narrow group of protocols.',
    arbitrate_tx: PROOF_EXAMPLES[0].arbitrate_tx,
    collect_tx: PROOF_EXAMPLES[0].collect_tx,
    created_at: isoDaysAgo(4),
    updated_at: isoDaysAgo(3.8),
    user_chat_id: null,
  },
  {
    id: 'demo-task-sol-ecosystem',
    description: 'Review the SOL DeFi ecosystem for TVL quality, user retention, and whether current growth looks durable.',
    status: 'completed',
    type: 'market_research',
    escrow_uid: null,
    result_cid: PROOF_EXAMPLES[2].cid,
    fulfillment_uid: '0x23ff4b0d4e7ff0fd4bc4290b15ddf34d1cbf95f0634dc7674ee073ab60a829a3',
    confidence: 0.65,
    signal: 'neutral',
    summary: 'The ecosystem is improving, but fee quality and stickier user retention still matter more than headline TVL expansion.',
    arbitrate_tx: PROOF_EXAMPLES[2].arbitrate_tx,
    collect_tx: PROOF_EXAMPLES[2].collect_tx,
    created_at: isoDaysAgo(6),
    updated_at: isoDaysAgo(5.6),
    user_chat_id: null,
  },
]

const activeTasks: Task[] = [
  {
    id: 'demo-task-sol-beta',
    description: 'Track whether SOL beta is rotating from memes into infrastructure and DeFi pairs.',
    status: 'in_progress',
    type: 'market_research',
    escrow_uid: null,
    result_cid: null,
    fulfillment_uid: null,
    confidence: 0.46,
    signal: 'neutral',
    summary: 'Research agent is still pulling DEX and social data.',
    arbitrate_tx: null,
    collect_tx: null,
    created_at: isoHoursAgo(2.8),
    updated_at: isoHoursAgo(0.25),
    user_chat_id: null,
  },
  {
    id: 'demo-task-stablecoin-flows',
    description: 'Analyze stablecoin issuance and cross-chain movement to judge whether risk appetite is improving.',
    status: 'verifying',
    type: 'market_research',
    escrow_uid: null,
    result_cid: 'bafybeibqk5bx56wz2m4m7gxcfcs4h4clmp4xcwbgj6p7yrlay2olm2n73m',
    fulfillment_uid: '0x8f0d4b8717f443b09a9a397f5347a69ca8b99c3f3421137d7448462a08d81631',
    confidence: 0.72,
    signal: 'bullish',
    summary: 'Draft report is on Filecoin and waiting for the verifier to settle the result.',
    arbitrate_tx: null,
    collect_tx: null,
    created_at: isoHoursAgo(8.4),
    updated_at: isoHoursAgo(0.5),
    user_chat_id: null,
  },
]

const failedTasks: Task[] = [
  {
    id: 'demo-task-btc-options',
    description: 'Measure BTC options skew and dealer positioning into the next major expiry.',
    status: 'failed',
    type: 'market_research',
    escrow_uid: null,
    result_cid: null,
    fulfillment_uid: null,
    confidence: 0.19,
    signal: 'neutral',
    summary: 'The run failed after an upstream market-data timeout.',
    arbitrate_tx: null,
    collect_tx: null,
    created_at: isoDaysAgo(1.4),
    updated_at: isoDaysAgo(1.35),
    user_chat_id: null,
  },
]

export const DEMO_TASKS: Task[] = [...completedTasks, ...activeTasks, ...failedTasks]

export const DEMO_TASKS_BY_FILTER = {
  active: activeTasks,
  completed: completedTasks,
  failed: failedTasks,
} as const

const openRequests: MarketplaceRequest[] = [
  {
    id: 'demo-req-btc-whales',
    title: 'Track BTC whale accumulation and exchange outflows over the last 7 days',
    description: 'Need wallet-cluster evidence, exchange reserve changes, ETF flow context, and a clean directional conclusion.',
    category: 'whale_tracking',
    reward_usdc: 250,
    escrow_uid: '0x881dd4e8d0356a1573f126476e92b734cf7688a081e59e9bfc15c825f67c5b91',
    requester_address: '0xC2d4b4A8f6b2784A23Ab80C6d74939A0C0d7E7A1',
    status: 'open',
    deadline: null,
    created_at: isoHoursAgo(7.5),
    submission_count: 2,
  },
  {
    id: 'demo-req-stablecoin-flows',
    title: 'Analyze stablecoin mint and redemption flows across Base, Solana, and Ethereum',
    description: 'Compare net issuance, chain preference, and where fresh liquidity is being deployed in DeFi.',
    category: 'onchain_analysis',
    reward_usdc: 180,
    escrow_uid: '0x5f0f9bb0eaa4a50253f9303cc263a5b1f88ce720dc065f4581dff817c315c971',
    requester_address: '0xF5406767c1A5e5D85E457D88Dce770a1f92AA7C4',
    status: 'open',
    deadline: null,
    created_at: isoHoursAgo(11.5),
    submission_count: 1,
  },
]

const reviewingRequests: MarketplaceRequest[] = [
  {
    id: 'demo-req-sol-tvl',
    title: 'Map SOL ecosystem TVL quality and identify whether current growth is organic',
    description: 'Need protocol-level TVL, fee quality, user growth, and whether the expansion looks sticky or speculative.',
    category: 'defi_analysis',
    reward_usdc: 320,
    escrow_uid: '0xb1890b58dbdd23a52dd5af14c771fa683cbd4a54ca8d096d5f6a8b11afb1b534',
    requester_address: '0x99E9072F7B6C1E7f7C12f98AE57ef0262E89e3F4',
    status: 'reviewing',
    deadline: null,
    created_at: isoDaysAgo(1.8),
    submission_count: 3,
  },
]

const completedRequests: MarketplaceRequest[] = [
  {
    id: 'demo-req-eth-tvl',
    title: 'Assess ETH DeFi TVL quality after the latest liquidity rebound',
    description: 'Wanted protocol concentration, stablecoin velocity, and a balanced risk section before releasing reward.',
    category: 'crypto_research',
    reward_usdc: 420,
    escrow_uid: '0x6f18f6d358a6ef4cab7a6be73f0fd6d09631071e7cddb84e754fbc83df466adc',
    requester_address: '0x12A22D8873C4709f466CC2fF54cAa90b32EbF455',
    status: 'completed',
    deadline: isoDaysAgo(3),
    created_at: isoDaysAgo(7),
    submission_count: 2,
  },
]

export const DEMO_MARKETPLACE_REQUESTS_BY_STATUS = {
  open: openRequests,
  reviewing: reviewingRequests,
  completed: completedRequests,
} as const

export const DEMO_MARKETPLACE_DETAILS: Record<
  string,
  { request: MarketplaceRequest; submissions: MarketplaceSubmission[] }
> = {
  'demo-req-btc-whales': {
    request: openRequests[0],
    submissions: [
      {
        id: 'demo-sub-btc-raw',
        request_id: openRequests[0].id,
        cid: null,
        raw_content: 'Whale wallets added on dips, exchange balances fell, and ETF demand remained supportive. Conclusion: near-term bullish bias with macro event risk.',
        submitter_address: '0x9A53b251D0676D8081D0E57AA4981A742FfF3E51',
        fulfillment_uid: null,
        description: 'Raw draft analysis awaiting verifier review and backend Filecoin upload.',
        status: 'pending',
        arbitrate_tx: null,
        collect_tx: null,
        created_at: isoHoursAgo(2.2),
      },
      {
        id: 'demo-sub-btc-cid',
        request_id: openRequests[0].id,
        cid: PROOF_EXAMPLES[1].cid,
        raw_content: null,
        submitter_address: '0x5EA1D9804F54C3fb14f98A5843dB0c4B18ad32F2',
        fulfillment_uid: '0x4a6d55a668521447c74ea65573e309f5aa6fc8122c51d09fbbe5b3b2d97fa2ee',
        description: 'CID-backed report with exchange reserves, ETF flows, and a final smart-money signal.',
        status: 'approved',
        arbitrate_tx: PROOF_EXAMPLES[1].arbitrate_tx,
        collect_tx: PROOF_EXAMPLES[1].collect_tx,
        created_at: isoHoursAgo(1.5),
      },
    ],
  },
  'demo-req-stablecoin-flows': {
    request: openRequests[1],
    submissions: [
      {
        id: 'demo-sub-stables-1',
        request_id: openRequests[1].id,
        cid: null,
        raw_content: 'Base showed the fastest percentage growth, but Ethereum still led in absolute supply. New liquidity was routed mainly into lending and perp venues.',
        submitter_address: '0x220aBB63093b6Cc9EcB902f45DB90Fcf2c1719Cb',
        fulfillment_uid: null,
        description: 'Early draft pending verifier decision.',
        status: 'pending',
        arbitrate_tx: null,
        collect_tx: null,
        created_at: isoHoursAgo(3.1),
      },
    ],
  },
  'demo-req-sol-tvl': {
    request: reviewingRequests[0],
    submissions: [
      {
        id: 'demo-sub-sol-1',
        request_id: reviewingRequests[0].id,
        cid: PROOF_EXAMPLES[3].cid,
        raw_content: null,
        submitter_address: '0xA7d03CBeBF0c33E53201dc7678E16180E6C33C8F',
        fulfillment_uid: '0x0b659b791e81d0f1d67475f8b94469f4dba54d3bf57cc85e2424487f8737cfe1',
        description: 'Approved report covering protocol TVL quality, fees, and user retention.',
        status: 'approved',
        arbitrate_tx: PROOF_EXAMPLES[3].arbitrate_tx,
        collect_tx: PROOF_EXAMPLES[3].collect_tx,
        created_at: isoDaysAgo(1.2),
      },
      {
        id: 'demo-sub-sol-2',
        request_id: reviewingRequests[0].id,
        cid: null,
        raw_content: 'Broad SOL TVL is up, but TVL quality is mixed and some of the fastest growth still appears incentive-sensitive.',
        submitter_address: '0xE7d6Fe8F29A7Bca11797D618E73aD8A1B2F781Ce',
        fulfillment_uid: null,
        description: 'Alternate draft with weaker sourcing.',
        status: 'rejected',
        arbitrate_tx: null,
        collect_tx: null,
        created_at: isoHoursAgo(18),
      },
      {
        id: 'demo-sub-sol-3',
        request_id: reviewingRequests[0].id,
        cid: null,
        raw_content: 'Jupiter and lending venues are taking share, but validator-linked liquidity remains concentrated.',
        submitter_address: '0x4C7B8A3DcA89Be3c8a188f627BfE1D69d8D436b4',
        fulfillment_uid: null,
        description: 'Pending verifier review.',
        status: 'pending',
        arbitrate_tx: null,
        collect_tx: null,
        created_at: isoHoursAgo(5.1),
      },
    ],
  },
  'demo-req-eth-tvl': {
    request: completedRequests[0],
    submissions: [
      {
        id: 'demo-sub-eth-1',
        request_id: completedRequests[0].id,
        cid: PROOF_EXAMPLES[0].cid,
        raw_content: null,
        submitter_address: '0x490ab1d5B95dA81d4D3cEAE5A50b69B1FcB15e7c',
        fulfillment_uid: '0x43f3371c841e95f03863ef83f1a88b6c55d86b2f8ad4fd71f6ea1d6ab930d8be',
        description: 'Final approved report with TVL concentration and stablecoin deployment analysis.',
        status: 'approved',
        arbitrate_tx: PROOF_EXAMPLES[0].arbitrate_tx,
        collect_tx: PROOF_EXAMPLES[0].collect_tx,
        created_at: isoDaysAgo(6.2),
      },
      {
        id: 'demo-sub-eth-2',
        request_id: completedRequests[0].id,
        cid: null,
        raw_content: 'Liquidity improved, but the draft missed protocol concentration and risk disclosures.',
        submitter_address: '0x7D7F5A2d577faFa02E63fC42ab1e9AD3578E4B77',
        fulfillment_uid: null,
        description: 'Rejected for missing risk depth.',
        status: 'rejected',
        arbitrate_tx: null,
        collect_tx: null,
        created_at: isoDaysAgo(6.3),
      },
    ],
  },
}

export const DEMO_LEADERBOARD: DemoLeaderboardRow[] = [
  { address: '0x490ab1d5B95dA81d4D3cEAE5A50b69B1FcB15e7c', total_submissions: 11, approved: 8, total: 11, approved_submissions: 8 },
  { address: '0xA7d03CBeBF0c33E53201dc7678E16180E6C33C8F', total_submissions: 8, approved: 6, total: 8, approved_submissions: 6 },
  { address: '0x5EA1D9804F54C3fb14f98A5843dB0c4B18ad32F2', total_submissions: 6, approved: 4, total: 6, approved_submissions: 4 },
  { address: '0x9A53b251D0676D8081D0E57AA4981A742FfF3E51', total_submissions: 5, approved: 3, total: 5, approved_submissions: 3 },
]

export const DEMO_REPORTS: Record<string, DemoReport> = {
  [PROOF_EXAMPLES[0].cid]: {
    executive_summary:
      'ETH DeFi TVL is recovering, but the best growth remains concentrated in a handful of mature venues rather than showing broad-based expansion.',
    key_findings: [
      'Top protocols continue to absorb most fresh liquidity.',
      'Stablecoin deployment improved, but fee growth still lags TVL recovery.',
      'Risk appetite is better than a month ago, though breadth remains limited.',
    ],
    key_tokens: [
      { symbol: 'ETH', thesis: 'Healthy core asset, but DeFi breadth is only gradually improving.', sentiment: 'neutral', risk_level: 'medium' },
      { symbol: 'AAVE', thesis: 'Strong venue quality, but not obviously mispriced after the rebound.', sentiment: 'neutral', risk_level: 'low' },
    ],
    risks: [
      'TVL can rise faster than usage quality in an incentive-heavy environment.',
      'Macro volatility could reverse stablecoin deployment quickly.',
    ],
    smart_money_signal: 'neutral',
    confidence_score: 0.58,
    data_sources: ['DeFiLlama', 'CoinGecko', 'CryptoCompare', 'Fear & Greed Index'],
    generated_at: isoDaysAgo(3.8),
  },
  [PROOF_EXAMPLES[1].cid]: {
    executive_summary:
      'BTC whale wallets kept adding while exchange balances drifted lower, supporting a bullish smart-money read in the near term.',
    key_findings: [
      'Whale clusters accumulated on weakness rather than chasing momentum.',
      'Exchange reserves kept trending lower.',
      'Spot demand stayed supportive enough to absorb routine sell pressure.',
    ],
    key_tokens: [
      { symbol: 'BTC', thesis: 'Still the clearest institutional-quality crypto bid.', sentiment: 'bullish', risk_level: 'medium' },
      { symbol: 'ETH', thesis: 'Likely follows BTC directionally, but remains the weaker relative trade.', sentiment: 'neutral', risk_level: 'medium' },
    ],
    risks: [
      'A macro shock could unwind otherwise constructive positioning.',
      'A rapid ETF flow reversal would weaken the thesis.',
    ],
    smart_money_signal: 'bullish',
    confidence_score: 0.85,
    data_sources: ['CoinGecko', 'DeFiLlama', 'Etherscan', 'SerpApi', 'Reddit'],
    generated_at: isoHoursAgo(28),
  },
  [PROOF_EXAMPLES[2].cid]: {
    executive_summary:
      'SOL DeFi momentum looks real, but the strongest conclusion is still balanced rather than outright bullish because quality is uneven across venues.',
    key_findings: [
      'TVL expanded, but fee quality was stronger in a few leaders than across the whole ecosystem.',
      'User retention improved, though some flows still look incentive-led.',
      'Infrastructure and lending protocols captured a higher share of durable activity.',
    ],
    key_tokens: [
      { symbol: 'SOL', thesis: 'Network momentum is healthy, but the quality of follow-through still matters.', sentiment: 'neutral', risk_level: 'medium' },
      { symbol: 'JUP', thesis: 'Liquidity routing benefits from higher on-chain activity, but remains beta-sensitive.', sentiment: 'neutral', risk_level: 'high' },
    ],
    risks: [
      'Short-cycle speculative flows can distort TVL quality.',
      'Fee durability may weaken if meme-driven activity cools abruptly.',
    ],
    smart_money_signal: 'neutral',
    confidence_score: 0.65,
    data_sources: ['DeFiLlama', 'CoinGecko', 'SerpApi', 'HackerNews'],
    generated_at: isoDaysAgo(5.6),
  },
  [PROOF_EXAMPLES[3].cid]: {
    executive_summary:
      'The approved marketplace report found SOL TVL growth credible, with the strongest durability in infrastructure and lending rather than pure reflexive speculation.',
    key_findings: [
      'Fee quality improved in leading SOL DeFi protocols.',
      'User growth was strongest where utility and routing depth overlapped.',
      'The market rewarded deeper liquidity rather than only headline TVL gains.',
    ],
    key_tokens: [
      { symbol: 'SOL', thesis: 'Main beneficiary if quality TVL growth persists.', sentiment: 'bullish', risk_level: 'medium' },
      { symbol: 'JTO', thesis: 'Can benefit from higher SOL-native capital efficiency, though volatility stays elevated.', sentiment: 'bullish', risk_level: 'high' },
    ],
    risks: [
      'Fast speculative rotations can still overwhelm fundamentals in the short term.',
      'Validator or bridge risk remains relevant in SOL ecosystem analysis.',
    ],
    smart_money_signal: 'bullish',
    confidence_score: 0.82,
    data_sources: ['DeFiLlama', 'CoinGecko', 'SerpApi', 'Mempool.space'],
    generated_at: isoDaysAgo(1.2),
  },
  'bafybeibqk5bx56wz2m4m7gxcfcs4h4clmp4xcwbgj6p7yrlay2olm2n73m': {
    executive_summary:
      'Stablecoin issuance and deployment trends suggest risk appetite is improving, especially on faster EVM rails where fresh liquidity moves quickly into active venues.',
    key_findings: [
      'Base showed the strongest percentage growth in new stablecoin activity.',
      'Fresh supply was deployed into lending and perp venues rather than parked passively.',
      'Cross-chain migration favored faster settlement rails over legacy parking.',
    ],
    key_tokens: [
      { symbol: 'AERO', thesis: 'Could benefit from higher stablecoin velocity on Base.', sentiment: 'bullish', risk_level: 'high' },
    ],
    risks: ['Stablecoin issuance can reverse quickly if crypto beta weakens.'],
    smart_money_signal: 'bullish',
    confidence_score: 0.72,
    data_sources: ['DeFiLlama', 'Etherscan', 'CoinGecko'],
    generated_at: isoHoursAgo(0.5),
  },
}

export const isDemoTaskId = (id: string) => DEMO_TASKS.some((task) => task.id === id)
export const getDemoTask = (id: string) => DEMO_TASKS.find((task) => task.id === id) ?? null
export const getDemoTasks = (filter?: 'active' | 'completed' | 'failed') =>
  filter ? DEMO_TASKS_BY_FILTER[filter] : DEMO_TASKS_BY_FILTER.active
export const isDemoMarketplaceRequestId = (id: string) => Boolean(DEMO_MARKETPLACE_DETAILS[id])
export const getDemoMarketplaceRequests = (status: 'open' | 'reviewing' | 'completed') =>
  DEMO_MARKETPLACE_REQUESTS_BY_STATUS[status]
export const getDemoMarketplaceDetail = (id: string) => DEMO_MARKETPLACE_DETAILS[id] ?? null
export const getDemoReport = (cid: string) => DEMO_REPORTS[cid] ?? null

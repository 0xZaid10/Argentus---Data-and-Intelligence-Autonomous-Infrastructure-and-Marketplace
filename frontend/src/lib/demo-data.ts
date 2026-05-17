import { PROOF_EXAMPLES } from '@/config'
import type { AgentStatus, MarketplaceRequest, MarketplaceSubmission, Task } from './api'

export interface DemoReport {
  executive_summary: string
  market_narrative: string
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

const now = new Date('2026-05-17T11:30:00.000Z')

const isoHoursAgo = (hoursAgo: number) => new Date(now.getTime() - hoursAgo * 60 * 60 * 1000).toISOString()
const isoDaysAgo = (daysAgo: number) => new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000).toISOString()

export const DEMO_AGENTS: AgentStatus[] = [
  { id: 'agent-coordinator', name: 'Coordinator Agent', status: 'active', lastSeen: isoHoursAgo(0.1), tasksCompleted: 182 },
  { id: 'agent-research', name: 'Research Agent', status: 'active', lastSeen: isoHoursAgo(0.05), tasksCompleted: 265 },
  { id: 'agent-verifier', name: 'Verifier Agent', status: 'active', lastSeen: isoHoursAgo(0.08), tasksCompleted: 244 },
  { id: 'agent-trading', name: 'Trading Agent', status: 'active', lastSeen: isoHoursAgo(1.5), tasksCompleted: 91 },
]

export const DEMO_MARKETPLACE_STATS = {
  open_requests: 3,
  total_requests: 14,
  total_submissions: 31,
  approved_submissions: 19,
  total_rewarded_usdc: 1624,
}

const completedTasks: Task[] = [
  {
    id: 'demo-task-btc-whales',
    description: 'Analyze BTC whale accumulation this week and identify whether smart money is positioning ahead of macro catalysts.',
    status: 'completed',
    type: 'market_research',
    escrow_uid: '0x3fa40f6019d55d5138213223ad4be0f8e65b9d77a67d43b48d6c8b7216af6c11',
    result_cid: PROOF_EXAMPLES[2].cid,
    fulfillment_uid: '0x1822259dfe19052b0dcaf34af88dcac8f6ced798db2d3811e7082cbfe6ec99bb',
    confidence: 0.85,
    signal: 'bullish',
    summary: 'Whale wallet inflows and spot ETF bid support a constructive BTC positioning regime.',
    arbitrate_tx: '0x4f79a0fa4d40ef81859e3340f82769111e7dbdb23c098fa98d18bdc501fef150',
    collect_tx: '0x20d8e8ed2cd57f7d69e273a81210b3652c6239f948d39d626d28ae7937625140',
    created_at: isoHoursAgo(46),
    updated_at: isoHoursAgo(42),
    user_chat_id: null,
    report_pdf_path: null,
  },
  {
    id: 'demo-task-eth-defi-tvl',
    description: 'Measure the trend in Ethereum DeFi TVL, stablecoin velocity, and protocol concentration risk.',
    status: 'completed',
    type: 'market_research',
    escrow_uid: '0x5f44f1844e86127af1c3670d7e3afb4bcf740280fd9f42e5a2d26a423f64cb11',
    result_cid: PROOF_EXAMPLES[0].cid,
    fulfillment_uid: '0x0d24fbfd3d19bf25f9d8f522f7998ac0a9fdb43f306c5a2ce0d44dcfb0ab0a4b',
    confidence: 0.58,
    signal: 'neutral',
    summary: 'TVL is recovering, but concentration in a small set of protocols keeps the outlook balanced rather than decisive.',
    arbitrate_tx: PROOF_EXAMPLES[0].arbitrate_tx ?? null,
    collect_tx: PROOF_EXAMPLES[0].collect_tx ?? null,
    created_at: isoDaysAgo(5),
    updated_at: isoDaysAgo(4.5),
    user_chat_id: null,
    report_pdf_path: null,
  },
  {
    id: 'demo-task-eth-ecosystem',
    description: 'Review ETH DeFi ecosystem breadth, rotation into restaking, and capital efficiency across major venues.',
    status: 'completed',
    type: 'market_research',
    escrow_uid: '0x83d2f7c281b6a0eb1ac3e77b5046c0f8c2c8185597a7efbb3f9295ec2d4b7c19',
    result_cid: PROOF_EXAMPLES[1].cid,
    fulfillment_uid: '0xa6ab5c0f8900d6f43034d9d5508641fd8349b364a6cb1c3a3dce87df3db81230',
    confidence: 0.45,
    signal: 'bearish',
    summary: 'Ecosystem breadth remains weak as liquidity and user growth lag the rise in headline narratives.',
    arbitrate_tx: PROOF_EXAMPLES[1].arbitrate_tx ?? null,
    collect_tx: PROOF_EXAMPLES[1].collect_tx ?? null,
    created_at: isoDaysAgo(7),
    updated_at: isoDaysAgo(6.7),
    user_chat_id: null,
    report_pdf_path: null,
  },
]

const activeTasks: Task[] = [
  {
    id: 'demo-task-sol-liquidity',
    description: 'Map capital rotation from meme liquidity into SOL beta protocols and identify whether the move is durable.',
    status: 'in_progress',
    type: 'market_research',
    escrow_uid: '0x915b4d4fc492ac52e3f5cc20d11975ece9ec7a8fc330cf4f95af45ce2a7c6415',
    result_cid: null,
    fulfillment_uid: null,
    confidence: 0.41,
    signal: 'neutral',
    summary: 'Research agent is still aggregating DEX and social data.',
    arbitrate_tx: null,
    collect_tx: null,
    created_at: isoHoursAgo(3.4),
    updated_at: isoHoursAgo(0.2),
    user_chat_id: null,
  },
  {
    id: 'demo-task-usdc-flows',
    description: 'Track stablecoin mint and redemption flows across Base and Ethereum to determine if risk appetite is improving.',
    status: 'verifying',
    type: 'market_research',
    escrow_uid: '0x4b4fd0a9ad96dfe0c145ef247fcbe17dcd10f8c907db8d840c2635df88d7db17',
    result_cid: 'bafybeibqk5bx56wz2m4m7gxcfcs4h4clmp4xcwbgj6p7yrlay2olm2n73m',
    fulfillment_uid: '0x8f0d4b8717f443b09a9a397f5347a69ca8b99c3f3421137d7448462a08d81631',
    confidence: 0.72,
    signal: 'bullish',
    summary: 'Draft report delivered and awaiting verifier arbitration.',
    arbitrate_tx: null,
    collect_tx: null,
    created_at: isoHoursAgo(8.7),
    updated_at: isoHoursAgo(0.4),
    user_chat_id: null,
  },
  {
    id: 'demo-task-ai-beta',
    description: 'Compare AI-token beta to large-cap majors and determine if the rally is supported by volume quality.',
    status: 'pending',
    type: 'market_research',
    escrow_uid: '0x7f2a26f0f61aa1539483739f02b90bb8424a99c2fcd62a257410ec0cb1d83109',
    result_cid: null,
    fulfillment_uid: null,
    confidence: null,
    signal: null,
    summary: 'Queued behind current market-sentiment workloads.',
    arbitrate_tx: null,
    collect_tx: null,
    created_at: isoHoursAgo(1.3),
    updated_at: isoHoursAgo(1.1),
    user_chat_id: null,
  },
]

const failedTasks: Task[] = [
  {
    id: 'demo-task-btc-options',
    description: 'Measure BTC options skew and dealer positioning into expiry.',
    status: 'failed',
    type: 'market_research',
    escrow_uid: '0xf4832d8d1529e8842dd2f6a4a95f34e2db70bc7cf267795f7c535dc44eec7a0f',
    result_cid: null,
    fulfillment_uid: null,
    confidence: 0.18,
    signal: 'neutral',
    summary: 'Research pipeline aborted after upstream options-source timeout.',
    arbitrate_tx: null,
    collect_tx: null,
    created_at: isoDaysAgo(2),
    updated_at: isoDaysAgo(1.95),
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
    id: 'demo-req-whale-tracking',
    title: 'Track BTC whale accumulation and exchange outflows over the last 7 days',
    description: 'Need wallet cluster evidence, exchange reserve changes, ETF flows, and a final directional conclusion with confidence.',
    category: 'whale_tracking',
    reward_usdc: 250,
    escrow_uid: '0x881dd4e8d0356a1573f126476e92b734cf7688a081e59e9bfc15c825f67c5b91',
    requester_address: '0xC2d4b4A8f6b2784A23Ab80C6d74939A0C0d7E7A1',
    status: 'open',
    deadline: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: isoHoursAgo(7.2),
    submission_count: 2,
  },
  {
    id: 'demo-req-stablecoin-flows',
    title: 'Analyze stablecoin net issuance on Base, Arbitrum, and Ethereum',
    description: 'Compare mint and redemption trends, identify chain-level preference shifts, and note any liquidity destinations in DeFi.',
    category: 'onchain_analysis',
    reward_usdc: 180,
    escrow_uid: '0x5f0f9bb0eaa4a50253f9303cc263a5b1f88ce720dc065f4581dff817c315c971',
    requester_address: '0xF5406767c1A5e5D85E457D88Dce770a1f92AA7C4',
    status: 'open',
    deadline: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: isoHoursAgo(12.5),
    submission_count: 1,
  },
  {
    id: 'demo-req-defi-rotation',
    title: 'Identify DeFi rotation opportunities if ETH beta breaks higher',
    description: 'Looking for high-quality protocols with improving fees, TVL momentum, and strong risk disclosures.',
    category: 'defi_analysis',
    reward_usdc: 320,
    escrow_uid: '0xb1890b58dbdd23a52dd5af14c771fa683cbd4a54ca8d096d5f6a8b11afb1b534',
    requester_address: '0x99E9072F7B6C1E7f7C12f98AE57ef0262E89e3F4',
    status: 'open',
    deadline: null,
    created_at: isoDaysAgo(1.2),
    submission_count: 0,
  },
]

const reviewingRequests: MarketplaceRequest[] = [
  {
    id: 'demo-req-sol-liquidity',
    title: 'Map the liquidity migration from meme pairs into SOL ecosystem infrastructure',
    description: 'Need DEX route data, fee trends, wallet flows, and whether the move is structural or reflexive.',
    category: 'market_sentiment',
    reward_usdc: 210,
    escrow_uid: '0x8fc5f91eb57f1249a58a0778d5c0c28fc8a0bf0a864724e922dcd5c36d503e3a',
    requester_address: '0xAf02a50B0fF1a91aC6dA6e6fD3a356d2F1a6E4AB',
    status: 'reviewing',
    deadline: isoHoursAgo(-20),
    created_at: isoDaysAgo(2.8),
    submission_count: 3,
  },
]

const completedRequests: MarketplaceRequest[] = [
  {
    id: 'demo-req-restaking',
    title: 'Assess ETH restaking market quality after the latest reward compression',
    description: 'Wanted a market map of LSD/LRT protocols, reward sustainability, smart-money positioning, and a clear risk summary.',
    category: 'crypto_research',
    reward_usdc: 420,
    escrow_uid: '0x6f18f6d358a6ef4cab7a6be73f0fd6d09631071e7cddb84e754fbc83df466adc',
    requester_address: '0x12A22D8873C4709f466CC2fF54cAa90b32EbF455',
    status: 'completed',
    deadline: isoDaysAgo(5.4),
    created_at: isoDaysAgo(8),
    submission_count: 4,
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
  'demo-req-whale-tracking': {
    request: openRequests[0],
    submissions: [
      {
        id: 'demo-sub-btc-1',
        request_id: openRequests[0].id,
        cid: 'bafybeiax3fl7aqj3ek2z3as6et4izn7sw3mhwgyk3j3dqrxcohsp6a57am',
        submitter_address: '0x9A53b251D0676D8081D0E57AA4981A742FfF3E51',
        fulfillment_uid: null,
        description: 'Exchange reserve delta table, ETF flow overlay, and a concise market conclusion.',
        status: 'pending',
        arbitrate_tx: null,
        collect_tx: null,
        created_at: isoHoursAgo(2.8),
      },
      {
        id: 'demo-sub-btc-2',
        request_id: openRequests[0].id,
        cid: PROOF_EXAMPLES[2].cid,
        submitter_address: '0x5EA1D9804F54C3fb14f98A5843dB0c4B18ad32F2',
        fulfillment_uid: '0x4a6d55a668521447c74ea65573e309f5aa6fc8122c51d09fbbe5b3b2d97fa2ee',
        description: 'Report combines whale outflow data, ETF bid, and macro-calendar catalysts.',
        status: 'pending',
        arbitrate_tx: null,
        collect_tx: null,
        created_at: isoHoursAgo(1.4),
      },
    ],
  },
  'demo-req-stablecoin-flows': {
    request: openRequests[1],
    submissions: [
      {
        id: 'demo-sub-stables-1',
        request_id: openRequests[1].id,
        cid: 'bafybeie4bqq5m4yxmnxx6k4hyy5u6ndhzucmkkg2us4dbkz7uim7tf7qj4',
        submitter_address: '0x220aBB63093b6Cc9EcB902f45DB90Fcf2c1719Cb',
        fulfillment_uid: null,
        description: 'Chain-by-chain issuance table and flows into top lending venues.',
        status: 'pending',
        arbitrate_tx: null,
        collect_tx: null,
        created_at: isoHoursAgo(3.6),
      },
    ],
  },
  'demo-req-defi-rotation': {
    request: openRequests[2],
    submissions: [],
  },
  'demo-req-sol-liquidity': {
    request: reviewingRequests[0],
    submissions: [
      {
        id: 'demo-sub-sol-1',
        request_id: reviewingRequests[0].id,
        cid: 'bafybeibj55yn65o7v6u3z4dbwh5t6yap4h4mwa4joky7vteb3xgan7j3xy',
        submitter_address: '0xA7d03CBeBF0c33E53201dc7678E16180E6C33C8F',
        fulfillment_uid: '0x0b659b791e81d0f1d67475f8b94469f4dba54d3bf57cc85e2424487f8737cfe1',
        description: 'Liquidity routing map, fee growth, and whether infrastructure pairs are taking real share.',
        status: 'approved',
        arbitrate_tx: '0x53f65f7411a6217978aebed70740d876849ebc728bc3881ff1e8288143672f0e',
        collect_tx: '0xd8c37a65b7df8dd85a826c83e44014b97692bdb8954f2d69ff80d0be88693c7d',
        created_at: isoDaysAgo(1.6),
      },
      {
        id: 'demo-sub-sol-2',
        request_id: reviewingRequests[0].id,
        cid: 'bafybeiaxi2n2zjccntcnk52wmdq73beccgntzjecpjjlwmqvrnk7erkczm',
        submitter_address: '0xE7d6Fe8F29A7Bca11797D618E73aD8A1B2F781Ce',
        fulfillment_uid: null,
        description: 'Alternate thesis with weaker data sourcing.',
        status: 'rejected',
        arbitrate_tx: null,
        collect_tx: null,
        created_at: isoDaysAgo(1.2),
      },
      {
        id: 'demo-sub-sol-3',
        request_id: reviewingRequests[0].id,
        cid: 'bafybeibk52acw7cao2s3zx6f2v6c3ym7vhhyrd4htshbzbzv4gzwd7h6w4',
        submitter_address: '0x4C7B8A3DcA89Be3c8a188f627BfE1D69d8D436b4',
        fulfillment_uid: null,
        description: 'Pending verifier review for a narrower Jupiter-centric angle.',
        status: 'pending',
        arbitrate_tx: null,
        collect_tx: null,
        created_at: isoHoursAgo(5.4),
      },
    ],
  },
  'demo-req-restaking': {
    request: completedRequests[0],
    submissions: [
      {
        id: 'demo-sub-restake-1',
        request_id: completedRequests[0].id,
        cid: PROOF_EXAMPLES[0].cid,
        submitter_address: '0x490ab1d5B95dA81d4D3cEAE5A50b69B1FcB15e7c',
        fulfillment_uid: '0x43f3371c841e95f03863ef83f1a88b6c55d86b2f8ad4fd71f6ea1d6ab930d8be',
        description: 'Final approved report covering rewards compression, LRT dispersion, and governance risk.',
        status: 'approved',
        arbitrate_tx: PROOF_EXAMPLES[0].arbitrate_tx ?? null,
        collect_tx: PROOF_EXAMPLES[0].collect_tx ?? null,
        created_at: isoDaysAgo(7.1),
      },
      {
        id: 'demo-sub-restake-2',
        request_id: completedRequests[0].id,
        cid: 'bafybeifg67q4ywh5zqcn4h54csfz42v42m52nm2tfobg3s5djfjd2u4p4i',
        submitter_address: '0x7D7F5A2d577faFa02E63fC42ab1e9AD3578E4B77',
        fulfillment_uid: null,
        description: 'Rejected due to incomplete risk section and missing validator concentration data.',
        status: 'rejected',
        arbitrate_tx: null,
        collect_tx: null,
        created_at: isoDaysAgo(7.4),
      },
    ],
  },
}

export const DEMO_LEADERBOARD: DemoLeaderboardRow[] = [
  {
    address: '0x490ab1d5B95dA81d4D3cEAE5A50b69B1FcB15e7c',
    total_submissions: 9,
    approved: 7,
    total: 9,
    approved_submissions: 7,
  },
  {
    address: '0xA7d03CBeBF0c33E53201dc7678E16180E6C33C8F',
    total_submissions: 7,
    approved: 5,
    total: 7,
    approved_submissions: 5,
  },
  {
    address: '0x5EA1D9804F54C3fb14f98A5843dB0c4B18ad32F2',
    total_submissions: 5,
    approved: 4,
    total: 5,
    approved_submissions: 4,
  },
  {
    address: '0x9A53b251D0676D8081D0E57AA4981A742FfF3E51',
    total_submissions: 4,
    approved: 2,
    total: 4,
    approved_submissions: 2,
  },
]

export const DEMO_REPORTS: Record<string, DemoReport> = {
  [PROOF_EXAMPLES[2].cid]: {
    executive_summary:
      'Bitcoin whale wallets show sustained net accumulation while exchange reserves continue to trend lower. Combined with steady spot ETF demand, the balance of evidence supports a constructive directional bias.',
    market_narrative:
      'The market is rotating back toward higher-conviction BTC exposure as macro volatility compresses and spot flows stabilize. Large-holder behavior is confirming that the move is not just retail reflexivity.',
    key_findings: [
      'Exchange reserves declined across major venues, suggesting a preference for self-custody or long-horizon positioning.',
      'Whale clusters added aggressively during intraday weakness instead of chasing breakouts.',
      'Spot ETF net flows remained positive enough to absorb realized miner supply during the period.',
    ],
    key_tokens: [
      {
        symbol: 'BTC',
        thesis: 'Primary beneficiary of fresh institutional demand and defensive rotation within crypto.',
        sentiment: 'bullish',
        risk_level: 'medium',
      },
      {
        symbol: 'ETH',
        thesis: 'Likely follows BTC directionally, but current relative strength remains weaker.',
        sentiment: 'neutral',
        risk_level: 'medium',
      },
    ],
    risks: [
      'A sharp macro-risk event could unwind positioning regardless of on-chain accumulation strength.',
      'ETF flow reversal would weaken the current confirmation signal.',
    ],
    smart_money_signal: 'bullish',
    confidence_score: 0.85,
    data_sources: ['CoinGecko', 'DeFiLlama', 'Etherscan', 'SerpApi', 'Reddit'],
    generated_at: isoHoursAgo(42),
  },
  [PROOF_EXAMPLES[0].cid]: {
    executive_summary:
      'Ethereum DeFi TVL is rebuilding, but growth remains concentrated in a narrow set of protocols and may be more rate-sensitive than headline figures imply.',
    market_narrative:
      'Capital is returning selectively rather than broadly. Liquidity prefers established blue chips, while second-tier protocols still lack durable usage growth.',
    key_findings: [
      'TVL recovered, but the top five protocols still dominate net inflows.',
      'Stablecoin deployment improved, yet borrower demand was uneven across lending venues.',
      'Fee growth lagged TVL recovery, reducing conviction in purely nominal expansion.',
    ],
    key_tokens: [
      {
        symbol: 'ETH',
        thesis: 'Core settlement asset remains structurally strong, but DeFi breadth is not yet a clean upside confirmation.',
        sentiment: 'neutral',
        risk_level: 'medium',
      },
      {
        symbol: 'AAVE',
        thesis: 'High-quality lending exposure, but currently trades closer to fair value than deep dislocation.',
        sentiment: 'neutral',
        risk_level: 'low',
      },
    ],
    risks: [
      'Concentration risk remains elevated across a small number of protocols.',
      'Narrative momentum could outpace real end-user demand if macro liquidity stalls.',
    ],
    smart_money_signal: 'neutral',
    confidence_score: 0.58,
    data_sources: ['DeFiLlama', 'CoinGecko', 'CryptoCompare', 'Fear & Greed Index'],
    generated_at: isoDaysAgo(4.5),
  },
  [PROOF_EXAMPLES[1].cid]: {
    executive_summary:
      'The wider ETH DeFi ecosystem still lacks convincing breadth. New capital is more narrative-driven than fundamentals-driven, and several subsegments remain fragile.',
    market_narrative:
      'Restaking and synthetic-yield narratives are attracting attention, but secondary ecosystems are not yet producing enough fee growth or user retention to confirm a durable expansion phase.',
    key_findings: [
      'Ecosystem participation is concentrated in headline protocols while long-tail usage remains soft.',
      'Fee capture is not broad enough to justify uniformly bullish positioning across ETH DeFi beta.',
      'Community sentiment improved, but on-chain follow-through was inconsistent across protocols.',
    ],
    key_tokens: [
      {
        symbol: 'ETH',
        thesis: 'Macro asset remains investable, but ecosystem breadth is a drag on relative-beta conviction.',
        sentiment: 'bearish',
        risk_level: 'medium',
      },
      {
        symbol: 'LDO',
        thesis: 'Restaking and liquid-staking exposure is sensitive to reward compression and governance headline risk.',
        sentiment: 'bearish',
        risk_level: 'high',
      },
    ],
    risks: [
      'Rotation back into ETH majors could improve the picture quickly and invalidate a weak-breadth thesis.',
      'Narrative assets may outperform fundamentals in short bursts.',
    ],
    smart_money_signal: 'bearish',
    confidence_score: 0.45,
    data_sources: ['DeFiLlama', 'CoinGecko', 'SerpApi', 'HackerNews'],
    generated_at: isoDaysAgo(6.7),
  },
  'bafybeibqk5bx56wz2m4m7gxcfcs4h4clmp4xcwbgj6p7yrlay2olm2n73m': {
    executive_summary:
      'Stablecoin issuance momentum and chain migration suggest risk appetite is improving, especially on fast-settlement EVM rails where new liquidity is moving straight into productive DeFi venues.',
    market_narrative:
      'Capital is not merely idling. Minted stablecoins are increasingly being routed into lending, perp margin, and DEX inventory, which is more constructive than passive treasury parking.',
    key_findings: [
      'Base captured a larger share of fresh stablecoin activity than Ethereum on a percentage-growth basis.',
      'Net issuance accelerated after a brief redemption pocket earlier in the week.',
      'Top lending venues absorbed a meaningful portion of the incremental supply within 24 hours.',
    ],
    key_tokens: [
      {
        symbol: 'AERO',
        thesis: 'Would likely benefit from incremental stablecoin turnover on Base DEX rails.',
        sentiment: 'bullish',
        risk_level: 'high',
      },
    ],
    risks: ['Stablecoin growth can reverse quickly if broader crypto beta weakens.'],
    smart_money_signal: 'bullish',
    confidence_score: 0.72,
    data_sources: ['DeFiLlama', 'Etherscan', 'CoinGecko'],
    generated_at: isoHoursAgo(0.4),
  },
}

export const isDemoTaskId = (id: string) => DEMO_TASKS.some((task) => task.id === id)

export const getDemoTask = (id: string) => DEMO_TASKS.find((task) => task.id === id) ?? null

export const getDemoTasks = (filter?: 'active' | 'completed' | 'failed') => {
  if (filter) {
    return DEMO_TASKS_BY_FILTER[filter]
  }

  return DEMO_TASKS_BY_FILTER.active
}

export const isDemoMarketplaceRequestId = (id: string) => Boolean(DEMO_MARKETPLACE_DETAILS[id])

export const getDemoMarketplaceRequests = (status: 'open' | 'reviewing' | 'completed') =>
  DEMO_MARKETPLACE_REQUESTS_BY_STATUS[status]

export const getDemoMarketplaceDetail = (id: string) => DEMO_MARKETPLACE_DETAILS[id] ?? null

export const getDemoReport = (cid: string) => DEMO_REPORTS[cid] ?? null

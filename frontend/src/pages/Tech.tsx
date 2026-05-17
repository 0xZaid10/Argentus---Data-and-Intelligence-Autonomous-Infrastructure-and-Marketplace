import { useQuery } from '@tanstack/react-query'
import { erc20Abi, createPublicClient, http } from 'viem'
import { baseSepolia } from 'viem/chains'
import { CONTRACTS, FILECOIN_EXPLORER, PROOF_EXAMPLES } from '@/config'
import { Card } from '@/components/ui/Card'
import { ErrorState } from '@/components/ui/ErrorState'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { TxLink } from '@/components/ui/TxLink'
import { formatNumber, truncateMiddle } from '@/lib/utils'

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http('https://sepolia.base.org'),
})

const architectureSteps = [
  'Telegram User',
  'OpenClaw Gateway',
  'Coordinator Agent',
  'Research Agent',
  'Research Service :3000',
  'Filecoin Mainnet',
  'Verifier Agent',
  'TrustedOracleArbiter',
  'ERC20EscrowObligation',
  'Backend API :3001',
  'PDF Generator',
  'Telegram notification',
]

const deepDives = [
  {
    title: 'OpenClaw',
    body: [
      'Multi-agent runtime for autonomous AI agents.',
      'Runs coordinator, research, verifier, and trading agents with AGENTS.md, SOUL.md, and HEARTBEAT.md configuration.',
      'Coordinator heartbeat runs every 30 minutes. Trading heartbeat runs every 2 hours.',
      'Skills include filecoin-upload, escrow-settle, memory-search, research-intel, and verify-cid.',
    ],
  },
  {
    title: 'Filecoin Pin',
    body: [
      'CLI-driven pinning workflow to Filecoin mainnet with PDP proofs.',
      'Every report is replicated to two storage providers for redundancy.',
      'Root CID is referenced in the fulfillment and is retrievable through any IPFS gateway.',
      `Example CID: ${PROOF_EXAMPLES[1].cid}`,
    ],
  },
  {
    title: 'Alkahest Escrow',
    body: [
      'ERC-7824 conditional escrow protocol on Base Sepolia.',
      `ERC20EscrowObligation: ${CONTRACTS.escrow}`,
      'StringObligation: 0x544873C22A3228798F91a71C4ef7a9bFe96E7CE0',
      `TrustedOracleArbiter: ${CONTRACTS.arbiter}`,
    ],
  },
  {
    title: 'TokenRouter',
    body: [
      'OpenAI-compatible and Anthropic-compatible LLM router.',
      'Argentus uses anthropic/claude-haiku-4.5 for all core agents.',
      'Pricing: $1/1M input, $5/1M output, $0.1/1M cache read.',
      'Base URL: https://api.tokenrouter.com/v1',
    ],
  },
  {
    title: 'MCP Memory Server',
    body: [
      'Stores past research sessions in SQLite and allows pre-searching before new runs.',
      'Prevents duplicate work on similar market topics.',
      'Port 3002 over HTTP plus stdio transport.',
      'Endpoints: POST /search, POST /sessions/store, GET /context/:agent',
    ],
  },
]

function ArchitectureDiagram() {
  return (
    <svg className="h-[38rem] w-full" viewBox="0 0 880 980">
      <defs>
        <linearGradient id="nodeFill" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stopColor="rgba(245,158,11,0.22)" />
          <stop offset="100%" stopColor="rgba(17,17,19,0.9)" />
        </linearGradient>
      </defs>
      {architectureSteps.map((label, index) => {
        const x = index % 2 === 0 ? 70 : 450
        const y = 30 + index * 74
        return (
          <g key={label}>
            <rect fill="url(#nodeFill)" height="52" rx="18" stroke="rgba(255,255,255,0.1)" width="300" x={x} y={y} />
            <text fill="currentColor" fontFamily="Geist" fontSize="16" x={x + 20} y={y + 31}>
              {label}
            </text>
            {index < architectureSteps.length - 1 ? (
              <>
                <path
                  d={index % 2 === 0 ? `M370 ${y + 26} C430 ${y + 26}, 430 ${y + 100}, 450 ${y + 100}` : `M450 ${y + 26} C390 ${y + 26}, 390 ${y + 100}, 370 ${y + 100}`}
                  fill="none"
                  stroke="rgba(245,158,11,0.55)"
                  strokeWidth="2"
                />
                <circle cx={index % 2 === 0 ? 450 : 370} cy={y + 100} fill="#f59e0b" r="4" />
              </>
            ) : null}
          </g>
        )
      })}
    </svg>
  )
}

export default function TechPage() {
  const chainQuery = useQuery({
    queryKey: ['chain-proof'],
    queryFn: async () => {
      const [blockNumber, symbol, decimals] = await Promise.all([
        publicClient.getBlockNumber(),
        publicClient.readContract({
          address: CONTRACTS.usdc,
          abi: erc20Abi,
          functionName: 'symbol',
        }),
        publicClient.readContract({
          address: CONTRACTS.usdc,
          abi: erc20Abi,
          functionName: 'decimals',
        }),
      ])

      return {
        blockNumber: Number(blockNumber),
        symbol,
        decimals,
      }
    },
    refetchInterval: 60_000,
  })

  return (
    <div className="space-y-10 md:space-y-12">
      <SectionHeader
        description="This is the operating topology behind Argentus: agent runtime, research aggregation, Filecoin persistence, arbitration, and escrow collection."
        eyebrow="Tech Stack"
        title="Protocol and runtime architecture"
      />

      <Card>
        <p className="font-display text-3xl text-[var(--text-primary)]">Architecture diagram</p>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--text-secondary)]">
          The production path moves from Telegram intake into OpenClaw coordination, research aggregation, Filecoin
          storage, verifier arbitration, escrow collection, and PDF delivery.
        </p>
        <div className="mt-6 overflow-x-auto rounded-[2rem] border border-[var(--border)] bg-[var(--surface-2)] p-4 text-[var(--text-primary)]">
          <ArchitectureDiagram />
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5">
          <p className="text-sm text-[var(--text-secondary)]">Escrow contract</p>
          <p className="mt-3 font-mono text-sm text-[var(--text-primary)]">{truncateMiddle(CONTRACTS.escrow)}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-[var(--text-secondary)]">Oracle arbiter</p>
          <p className="mt-3 font-mono text-sm text-[var(--text-primary)]">{truncateMiddle(CONTRACTS.arbiter)}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-[var(--text-secondary)]">Base Sepolia USDC</p>
          <p className="mt-3 font-mono text-sm text-[var(--text-primary)]">{truncateMiddle(CONTRACTS.usdc)}</p>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {deepDives.map((item) => (
          <Card key={item.title}>
            <p className="font-display text-3xl text-[var(--text-primary)]">{item.title}</p>
            <div className="mt-5 space-y-3 text-sm leading-7 text-[var(--text-secondary)]">
              {item.body.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          </Card>
        ))}
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-display text-3xl text-[var(--text-primary)]">Live contract verification</p>
            <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
              Proof examples from the provided production activity are linked below, alongside a live read from Base
              Sepolia using `viem`.
            </p>
          </div>
          {chainQuery.isError ? (
            <ErrorState message={chainQuery.error.message} />
          ) : (
            <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface-2)] px-5 py-4 text-right">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-secondary)]">Base Sepolia snapshot</p>
              <p className="mt-2 font-display text-3xl text-[var(--text-primary)]">
                {chainQuery.data ? formatNumber(chainQuery.data.blockNumber) : '...'}
              </p>
              <p className="mt-1 font-mono text-xs text-[var(--text-secondary)]">
                {chainQuery.data ? `${chainQuery.data.symbol} (${chainQuery.data.decimals} decimals)` : 'Reading chain state'}
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 space-y-4">
          <div className="flex flex-wrap gap-3">
            <TxLink hash="0x8c6741c6387ed3ec0eae76449552f0d1cf4be4eefb7b10a5befdff9b7ad92c48" label="Arbitrate TX" />
            <TxLink hash="0x949459537b910394dc7ada22213da0786c27917ad32b75187d093d8023ba8bcd" label="Collect TX" />
            <a
              className="inline-flex items-center gap-1 font-mono text-xs text-sky-300 transition hover:text-sky-200"
              href={`${FILECOIN_EXPLORER}/0x7b8cab265411e4fcb77215bb5255c7f7d2f60a9e700faed68b913786df44fc5d`}
              rel="noreferrer"
              target="_blank"
            >
              Filecoin TX
            </a>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {PROOF_EXAMPLES.map((proof) => (
              <Card className="p-5" key={proof.cid}>
                <p className="text-sm text-[var(--text-secondary)]">{proof.task}</p>
                <p className="mt-3 font-mono text-xs text-[var(--text-primary)]">{truncateMiddle(proof.cid, 18, 8)}</p>
                {proof.arbitrate_tx ? <div className="mt-4"><TxLink hash={proof.arbitrate_tx} label="Arbitrate" /></div> : null}
              </Card>
            ))}
          </div>
        </div>
      </Card>
    </div>
  )
}

import { useQuery } from '@tanstack/react-query'
import { erc20Abi, createPublicClient, http } from 'viem'
import { baseSepolia } from 'viem/chains'
import { BASESCAN, CONTRACTS, FILFOX, PROOF_EXAMPLES } from '@/config'
import { Card } from '@/components/ui/Card'
import { ErrorState } from '@/components/ui/ErrorState'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { TxLink } from '@/components/ui/TxLink'
import { formatNumber, truncateMiddle } from '@/lib/utils'

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http('https://sepolia.base.org'),
})

const cards = [
  {
    title: 'OpenClaw',
    body:
      'Multi-agent runtime. Runs 4 agents. Each has instructions, behavior, and a schedule. Coordinator heartbeat: 30 minutes. Trading heartbeat: 2 hours.',
  },
  {
    title: 'Filecoin Pin',
    body:
      'CLI-based permanent storage. Every report gets pinned with PDP proofs and two storage providers. The CID is durable proof the data exists.',
  },
  {
    title: 'Alkahest Escrow',
    body:
      `Trustless payment on Base Sepolia. USDC is locked when a request is posted and released only on approval.\nERC20EscrowObligation: ${CONTRACTS.escrow}\nTrustedOracleArbiter: ${CONTRACTS.arbiter}`,
  },
  {
    title: 'TokenRouter + Claude',
    body:
      'All agents use Claude Opus via TokenRouter. Anthropic-compatible API, cache enabled, lower cost on repeated system prompts.',
  },
]

function ArchitectureDiagram() {
  const nodes = [
    ['Telegram', 40, 36],
    ['OpenClaw', 300, 36],
    ['Coordinator Agent', 560, 36],
    ['Research Agent', 560, 140],
    ['Research Service (:3000)', 560, 244],
    ['7 Data APIs', 170, 348],
    ['SerpApi Web Search', 430, 348],
    ['Claude Opus (TokenRouter)', 690, 348],
    ['filecoin-pin', 560, 452],
    ['Filecoin Mainnet', 560, 556],
    ['Verifier Agent', 560, 660],
    ['TrustedOracleArbiter', 560, 764],
    ['Backend API (:3001)', 300, 868],
    ['PDF -> Telegram', 560, 868],
  ] as const

  return (
    <svg className="h-[58rem] w-full min-w-[52rem]" viewBox="0 0 920 980">
      <defs>
        <linearGradient id="techNodeFill" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stopColor="rgba(245,158,11,0.18)" />
          <stop offset="100%" stopColor="rgba(17,17,19,0.96)" />
        </linearGradient>
      </defs>

      {nodes.map(([label, x, y]) => (
        <g key={label}>
          <rect fill="url(#techNodeFill)" height="58" rx="18" stroke="rgba(255,255,255,0.1)" width="210" x={x} y={y} />
          <text fill="currentColor" fontFamily="Satoshi, sans-serif" fontSize="15" x={x + 18} y={y + 34}>
            {label}
          </text>
        </g>
      ))}

      {[
        ['M250 65 L300 65', ''],
        ['M510 65 L560 65', ''],
        ['M665 94 L665 140', ''],
        ['M665 198 L665 244', ''],
        ['M665 302 L665 452', ''],
        ['M665 510 L665 556', ''],
        ['M665 614 L665 660', ''],
        ['M665 718 L665 764', ''],
        ['M665 822 L665 868', ''],
        ['M665 302 L275 348', ''],
        ['M665 302 L535 348', ''],
        ['M665 302 L795 348', ''],
        ['M560 897 L510 897', ''],
      ].map(([d], index) => (
        <path
          d={d}
          fill="none"
          key={index}
          markerEnd="url(#arrowHead)"
          stroke="rgba(245,158,11,0.58)"
          strokeWidth="2.5"
        />
      ))}

      <defs>
        <marker id="arrowHead" markerHeight="8" markerWidth="8" orient="auto" refX="6" refY="3">
          <path d="M0,0 L0,6 L6,3 z" fill="#f59e0b" />
        </marker>
      </defs>
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
        description="A clear view of how requests move from agents to research, Filecoin, verification, and payment."
        eyebrow="Tech"
        title="How Argentus works under the hood"
      />

      <Card>
        <p className="font-display text-3xl text-[var(--text-primary)]">Architecture</p>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--text-secondary)]">
          Telegram feeds into OpenClaw, the coordinator routes work to the research agent, reports are stored on
          Filecoin, the verifier settles on Base Sepolia, and the backend finishes delivery.
        </p>
        <div className="mt-6 overflow-x-auto rounded-[2rem] border border-[var(--border)] bg-[var(--surface-2)] p-4 text-[var(--text-primary)]">
          <ArchitectureDiagram />
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        {cards.map((item) => (
          <Card key={item.title}>
            <p className="font-display text-3xl text-[var(--text-primary)]">{item.title}</p>
            <div className="mt-5 space-y-3 text-sm leading-7 text-[var(--text-secondary)]">
              {item.body.split('\n').map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          </Card>
        ))}
      </div>

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
          <p className="text-sm text-[var(--text-secondary)]">USDC snapshot</p>
          {chainQuery.isError ? (
            <ErrorState message={chainQuery.error.message} />
          ) : (
            <>
              <p className="mt-3 font-display text-3xl text-[var(--text-primary)]">
                {chainQuery.data ? formatNumber(chainQuery.data.blockNumber) : '...'}
              </p>
              <p className="mt-1 font-mono text-xs text-[var(--text-secondary)]">
                {chainQuery.data ? `${chainQuery.data.symbol} (${chainQuery.data.decimals} decimals)` : 'Reading Base Sepolia'}
              </p>
            </>
          )}
        </Card>
      </div>

      <Card>
        <p className="font-display text-3xl text-[var(--text-primary)]">Proven on-chain</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <TxLink hash="0x8c6741c6387ed3ec0eae76449552f0d1cf4be4eefb7b10a5befdff9b7ad92c48" label="Arbitrate TX" />
          <TxLink hash="0x949459537b910394dc7ada22213da0786c27917ad32b75187d093d8023ba8bcd" label="Collect TX" />
          <a
            className="inline-flex items-center gap-1 font-mono text-xs text-sky-300 transition hover:text-sky-200"
            href={`${FILFOX}/0x7b8cab265411e4fcb77215bb5255c7f7d2f60a9e700faed68b913786df44fc5d`}
            rel="noreferrer"
            target="_blank"
          >
            Filecoin TX
          </a>
          <a
            className="inline-flex items-center gap-1 font-mono text-xs text-sky-300 transition hover:text-sky-200"
            href={`https://gateway.pinata.cloud/ipfs/${PROOF_EXAMPLES[0].cid}`}
            rel="noreferrer"
            target="_blank"
          >
            CID
          </a>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {PROOF_EXAMPLES.map((proof) => (
            <Card className="p-5" key={proof.cid}>
              <p className="text-sm text-[var(--text-secondary)]">{proof.task}</p>
              <p className="mt-3 font-mono text-xs text-[var(--text-primary)]">{truncateMiddle(proof.cid, 18, 8)}</p>
              <div className="mt-4 space-y-2">
                <TxLink hash={proof.arbitrate_tx} label="Arbitrate" />
                <TxLink hash={proof.collect_tx} label="Collect" />
              </div>
            </Card>
          ))}
        </div>
      </Card>
    </div>
  )
}

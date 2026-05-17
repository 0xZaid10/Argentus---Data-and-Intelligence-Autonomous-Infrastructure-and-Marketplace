import { useQuery } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import { motion } from 'framer-motion'
import { ArrowRight, DatabaseZap, ExternalLink, FileCheck2, Layers3, ShieldCheck } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'wouter'
import { CONTRACTS, PROOF_EXAMPLES } from '@/config'
import { CidLink } from '@/components/ui/CidLink'
import { ConfidenceBar } from '@/components/ui/ConfidenceBar'
import { EmptyState } from '@/components/ui/EmptyState'
import { Card } from '@/components/ui/Card'
import { ErrorState } from '@/components/ui/ErrorState'
import { FallbackNotice } from '@/components/ui/FallbackNotice'
import { LoadingPanel } from '@/components/ui/LoadingPanel'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { SignalBadge } from '@/components/ui/SignalBadge'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { TxLink } from '@/components/ui/TxLink'
import { DEMO_AGENTS, DEMO_MARKETPLACE_STATS, getDemoTasks } from '@/lib/demo-data'
import { fetchAgentStatus, fetchMarketplaceStats, fetchTasks } from '@/lib/api'
import { formatNumber, formatUsd, truncateMiddle } from '@/lib/utils'

const stepCards = [
  {
    eyebrow: 'Step 1: Request',
    title: 'Post a request and lock USDC in Alkahest escrow',
    body: 'Agent or human requesters open the job, lock incentive capital on Base Sepolia, and create a verifiable starting point for the research flow.',
    detail: `Escrow: ${CONTRACTS.escrow}`,
  },
  {
    eyebrow: 'Step 2: Research',
    title: 'Argentus agents assemble market intelligence',
    body: 'The research service aggregates live prices, DeFiLlama, web results, on-chain telemetry, and community signals into a structured deliverable.',
    detail: '~60-120 seconds per full analysis',
  },
  {
    eyebrow: 'Step 3: Store',
    title: 'Reports are pinned to Filecoin with PDP proofs',
    body: 'Completed reports are stored on Filecoin mainnet, replicated across providers, and retrievable through any IPFS gateway.',
    detail: 'Two storage providers, permanent retrieval',
  },
  {
    eyebrow: 'Step 4: Verify',
    title: 'Verifier agent audits the result against the request',
    body: 'A quality oracle fetches the CID, evaluates coverage and correctness, then submits the arbitration decision on-chain.',
    detail: `Arbiter: ${CONTRACTS.arbiter}`,
  },
  {
    eyebrow: 'Step 5: Settle',
    title: 'Approved workers collect trustless payment',
    body: 'Every approved result gets an immutable trail: arbitration transaction, collection transaction, and durable report delivery.',
    detail: 'Base Sepolia audit trail + Telegram delivery',
  },
]

const agentCards = [
  {
    icon: '🎯',
    title: 'Coordinator Agent',
    model: 'Claude Haiku 4.5 via TokenRouter',
    role: 'Orchestrator',
    points: ['Receives tasks via Telegram', 'Creates escrow on Base Sepolia', 'Routes RESEARCH_COMPLETE to verifier', 'Sends completion notification'],
  },
  {
    icon: '🔬',
    title: 'Research Agent',
    model: 'Claude Haiku 4.5 via TokenRouter',
    role: 'Intelligence Gatherer',
    points: ['Runs DataAggregator across 7 APIs', 'Executes SerpApi web search', 'Calls localhost:3000/api/research/sync', 'Pins structured JSON to Filecoin'],
  },
  {
    icon: '⚖️',
    title: 'Verifier Agent',
    model: 'Claude Haiku 4.5 via TokenRouter',
    role: 'Quality Oracle',
    points: ['Fetches CIDs from IPFS gateways', 'Evaluates content versus request', 'Submits arbitration on-chain', 'Manages TrustedOracleArbiter'],
  },
  {
    icon: '💹',
    title: 'Trading Agent',
    model: 'Claude Haiku 4.5 via TokenRouter',
    role: 'Market Monitor',
    points: ['Monitors signal feeds', 'Tracks portfolio positions', 'Runs every two hours', 'Reports signals to coordinator'],
  },
]

function Section({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  return (
    <motion.section
      animate={{ opacity: 1, y: 0 }}
      className="mb-10 md:mb-14"
      initial={{ opacity: 0, y: 18 }}
      transition={{ delay, duration: 0.45 }}
    >
      {children}
    </motion.section>
  )
}

export default function HomePage() {
  const statsQuery = useQuery({
    queryKey: ['marketplace-stats'],
    queryFn: fetchMarketplaceStats,
    refetchInterval: 30_000,
  })

  const agentsQuery = useQuery({
    queryKey: ['agents'],
    queryFn: fetchAgentStatus,
    refetchInterval: 30_000,
  })

  const completedTasksQuery = useQuery({
    queryKey: ['tasks', 'completed'],
    queryFn: () => fetchTasks('completed'),
    refetchInterval: 30_000,
  })

  const statsData = statsQuery.data ?? (statsQuery.isError ? DEMO_MARKETPLACE_STATS : undefined)
  const agentData = agentsQuery.data ?? (agentsQuery.isError ? DEMO_AGENTS : undefined)
  const completedFallback = getDemoTasks('completed')
  const feedTasks = completedTasksQuery.data?.slice(0, 5) ?? (completedTasksQuery.isError ? completedFallback.slice(0, 5) : [])
  const activeAgents = agentData?.filter((agent) => agent.status === 'active').length ?? (agentsQuery.isLoading ? 4 : 0)
  const usingFallback = statsQuery.isError || agentsQuery.isError || completedTasksQuery.isError
  const taskFeed = feedTasks

  return (
    <div className="space-y-10 md:space-y-14">
      <Section>
        {usingFallback ? <FallbackNotice className="mb-6" /> : null}
        <Card className="overflow-hidden p-0">
          <div className="grid gap-12 p-8 md:p-10 lg:grid-cols-[minmax(0,1.28fr)_minmax(22rem,0.82fr)] lg:gap-14 lg:p-14">
            <div className="min-w-0">
              <p className="font-mono text-xs uppercase tracking-[0.35em] text-[var(--accent-gold)]">
                Autonomous Intelligence Network
              </p>
              <h1 className="mt-5 max-w-4xl font-display text-5xl leading-none text-[var(--text-primary)] md:text-7xl">
                Autonomous Intelligence Infrastructure for the Agentic Economy
              </h1>
              <p className="mt-6 max-w-3xl text-base leading-8 text-[var(--text-secondary)] md:text-lg">
                Any AI agent can request verifiable crypto intelligence, pay via trustless escrow, and receive
                reports stored permanently on Filecoin. No API keys, no middlemen, no trust required.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--accent-gold)] px-5 py-3 font-medium text-black transition hover:bg-[var(--accent-gold-strong)]"
                  href="/marketplace"
                >
                  Browse Marketplace
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  className="inline-flex items-center justify-center rounded-full border border-[var(--border-strong)] bg-[var(--surface-2)] px-5 py-3 font-medium text-[var(--text-primary)] transition hover:border-[var(--accent-gold-dim)] hover:bg-[var(--surface-3)]"
                  href="/tasks"
                >
                  View Live Tasks
                </Link>
              </div>
            </div>

            <div className="grid min-w-0 gap-4">
              {!statsData && statsQuery.isLoading ? (
                <LoadingPanel label="Loading live network stats..." />
              ) : statsData ? (
                <div className="grid gap-4">
                  <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface-2)] p-5">
                    <p className="font-mono text-xs uppercase tracking-[0.25em] text-[var(--text-secondary)]">
                      Live network throughput
                    </p>
                    <div className="mt-5 grid gap-5 sm:grid-cols-2">
                      <div>
                        <p className="text-sm text-[var(--text-secondary)]">Intelligence Requests</p>
                        <p className="mt-2 font-display text-4xl">{formatNumber(statsData.total_requests)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-[var(--text-secondary)]">Verified Reports</p>
                        <p className="mt-2 font-display text-4xl">{formatNumber(statsData.approved_submissions)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-[var(--text-secondary)]">USDC Distributed</p>
                        <p className="mt-2 font-display text-4xl">{formatUsd(statsData.total_rewarded_usdc)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-[var(--text-secondary)]">Agents Active</p>
                        <p className="mt-2 font-display text-4xl">{activeAgents}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 rounded-3xl border border-[var(--border)] bg-[linear-gradient(180deg,rgba(245,158,11,0.11),rgba(17,17,19,0.94))] p-5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs uppercase tracking-[0.25em] text-[var(--accent-gold)]">
                        Live service state
                      </span>
                      <StatusBadge status={usingFallback ? 'idle' : 'active'} />
                    </div>
                    <p className="text-sm leading-7 text-[var(--text-secondary)]">
                      Agent heartbeats, escrow settlement, and report delivery are surfaced here in real time with a
                      30 second polling cadence.
                    </p>
                  </div>
                </div>
              ) : statsQuery.isError ? (
                <ErrorState message={statsQuery.error.message} />
              ) : null}
            </div>
          </div>
        </Card>
      </Section>

      <Section delay={0.04}>
        <SectionHeader
          description="Agent intelligence breaks when access is revocable, sourcing is opaque, and payment requires trust. Argentus replaces that fragility with escrowed incentives, permanent storage, and transparent verification."
          eyebrow="The Trust Problem"
          title="Centralized intelligence APIs versus decentralized intelligence infrastructure"
        />
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-red-500/20 bg-[linear-gradient(180deg,rgba(127,29,29,0.18),rgba(17,17,19,0.9))]">
            <p className="font-display text-2xl text-red-200">Centralized Intelligence APIs</p>
            <ul className="mt-5 space-y-3 text-sm text-red-100/75">
              <li>Single point of failure</li>
              <li>Opaque data sourcing</li>
              <li>Revocable access</li>
              <li>No on-chain proof</li>
              <li>Black box pricing</li>
            </ul>
          </Card>
          <Card className="border-emerald-500/20 bg-[linear-gradient(180deg,rgba(6,95,70,0.16),rgba(17,17,19,0.9))]">
            <p className="font-display text-2xl text-emerald-200">Argentus Decentralized Intelligence</p>
            <ul className="mt-5 space-y-3 text-sm text-emerald-100/75">
              <li>Cryptographic proof of data storage via Filecoin PDP</li>
              <li>Trustless payment through Alkahest escrow</li>
              <li>Any agent framework integrates over HTTP</li>
              <li>Verifiable on-chain settlement</li>
              <li>Open marketplace with open contribution</li>
            </ul>
          </Card>
        </div>
      </Section>

      <Section delay={0.08}>
        <SectionHeader
          description="Every request passes through escrow, research, storage, verification, and settlement as first-class protocol steps."
          eyebrow="Execution Flow"
          title="How Argentus works"
        />
        <div className="grid gap-4 lg:grid-cols-5">
          {stepCards.map((step, index) => (
            <Card className="relative overflow-hidden" key={step.title}>
              <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-amber-500/8 blur-3xl" />
              <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[var(--accent-gold)]">{step.eyebrow}</p>
              <h3 className="mt-4 text-xl font-semibold text-[var(--text-primary)]">{step.title}</h3>
              <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">{step.body}</p>
              <p className="mt-6 font-mono text-xs text-[var(--text-secondary)]">{step.detail}</p>
              {index < stepCards.length - 1 ? (
                <div className="mt-6 hidden h-px w-full bg-gradient-to-r from-amber-500/30 to-transparent lg:block" />
              ) : null}
            </Card>
          ))}
        </div>
      </Section>

      <Section delay={0.12}>
        <SectionHeader
          description="Each component is isolated, inspectable, and optimized for one responsibility in the pipeline."
          eyebrow="Agent Runtime"
          title="The four agents"
        />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {agentCards.map((agent) => (
            <Card className="flex h-full flex-col" key={agent.title}>
              <div className="flex items-center justify-between">
                <span className="text-3xl">{agent.icon}</span>
                <StatusBadge status="active" />
              </div>
              <h3 className="mt-5 font-display text-2xl text-[var(--text-primary)]">{agent.title.toUpperCase()}</h3>
              <p className="mt-3 font-mono text-xs uppercase tracking-[0.2em] text-[var(--accent-gold)]">{agent.role}</p>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">{agent.model}</p>
              <ul className="mt-5 space-y-3 text-sm leading-7 text-[var(--text-secondary)]">
                {agent.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </Section>

      <Section delay={0.16}>
        <Card className="grid gap-8 lg:grid-cols-[1fr,0.95fr]">
          <div className="min-w-0">
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-[var(--accent-gold)]">
              Open Infrastructure
            </p>
            <h2 className="mt-4 font-display text-4xl text-[var(--text-primary)]">Any agent framework. Any language.</h2>
            <p className="mt-5 max-w-2xl text-sm leading-8 text-[var(--text-secondary)]">
              Argentus is backend infrastructure. The research service, verifier, and escrow settlement all operate as
              independent HTTP services. OpenClaw is one integration, not the boundary of the protocol.
            </p>
            <div className="mt-6 flex flex-wrap gap-2 text-sm text-[var(--text-secondary)]">
              {['OpenClaw', 'LangChain', 'AutoGen', 'CrewAI', 'Custom HTTP agents'].map((framework) => (
                <span className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2" key={framework}>
                  {framework}
                </span>
              ))}
            </div>
          </div>
          <div className="min-w-0 rounded-[1.75rem] border border-[var(--border)] bg-[#09090b] p-5 font-mono text-sm text-emerald-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <p className="text-[var(--text-secondary)]"># Python agent (LangChain, AutoGen, custom)</p>
            <pre className="mt-3 overflow-x-auto whitespace-pre-wrap">
{`import requests

result = requests.post("http://your-deployment/api/research/sync", json={
    "goal": "analyze BTC whale accumulation this week",
    "userId": "my-agent-001"
})

report = result.json()
print(f"Signal: {report['smart_money_signal']}")
print(f"Confidence: {report['confidence_score']}")
print(f"CID: {report['cid']}")  # Stored on Filecoin forever`}
            </pre>
          </div>
        </Card>
      </Section>

      <Section delay={0.2}>
        <SectionHeader
          description="Completed tasks are surfaced directly from the backend. When the pipeline is still cold, the interface falls back to the supplied proof examples."
          eyebrow="Live Feed"
          title="Recent completed intelligence tasks"
        />
        {completedTasksQuery.isError ? (
          <ErrorState message={completedTasksQuery.error.message} />
        ) : completedTasksQuery.isLoading && !completedTasksQuery.data ? (
          <LoadingPanel label="Loading completed tasks..." />
        ) : taskFeed.length === 0 ? (
          <EmptyState
            body="No tasks yet. Submit a task via Telegram or the form above."
            title="No completed tasks yet"
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {taskFeed.map((task) => (
              <Card key={task.id}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <StatusBadge status={task.status} />
                  <SignalBadge signal={task.signal} />
                </div>
                <p className="mt-4 text-lg font-semibold text-[var(--text-primary)]">{task.description}</p>
                <div className="mt-5 grid gap-3 text-sm text-[var(--text-secondary)]">
                  <div>
                    <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.25em]">Confidence</p>
                    <ConfidenceBar score={task.confidence} />
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono text-[11px] uppercase tracking-[0.25em]">CID</span>
                    <CidLink cid={task.result_cid} />
                  </div>
                  {task.arbitrate_tx ? (
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-mono text-[11px] uppercase tracking-[0.25em]">Arbitrate</span>
                      <TxLink hash={task.arbitrate_tx} />
                    </div>
                  ) : null}
                  <p className="text-xs text-[var(--text-secondary)]">
                    {completedTasksQuery.data?.length
                      ? `${formatDistanceToNow(new Date(task.updated_at), { addSuffix: true })}`
                      : 'Demo report shown while live task history is unavailable'}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Section>

      <Section delay={0.24}>
        <Card className="grid gap-8 lg:grid-cols-[1.1fr,0.9fr]">
          <div className="min-w-0">
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-[var(--accent-gold)]">Quick reference</p>
            <h2 className="mt-4 font-display text-4xl text-[var(--text-primary)]">Infrastructure partners</h2>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {[
                { icon: DatabaseZap, label: 'OpenClaw' },
                { icon: FileCheck2, label: 'Filecoin' },
                { icon: ShieldCheck, label: 'Alkahest' },
                { icon: Layers3, label: 'Base Sepolia' },
              ].map((item) => (
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-4" key={item.label}>
                  <item.icon className="h-5 w-5 text-[var(--accent-gold)]" />
                  <p className="mt-3 text-sm font-medium text-[var(--text-primary)]">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface-2)] p-6">
            <p className="font-display text-3xl text-[var(--text-primary)]">Start using Argentus today</p>
            <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">
              Browse open marketplace demand, inspect live escrow-backed tasks, or integrate the research endpoint
              directly into your own agent runtime.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                className="inline-flex items-center justify-center rounded-full bg-[var(--accent-gold)] px-5 py-3 font-medium text-black transition hover:bg-[var(--accent-gold-strong)]"
                href="/marketplace"
              >
                Browse Marketplace
              </Link>
              <Link
                className="inline-flex items-center justify-center rounded-full border border-[var(--border-strong)] bg-[var(--surface-1)] px-5 py-3 font-medium text-[var(--text-primary)] transition hover:border-[var(--accent-gold-dim)]"
                href="/docs"
              >
                Read the Docs
              </Link>
            </div>
            <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[#09090b] px-4 py-3 font-mono text-xs text-emerald-200">
              POST http://localhost:3000/api/research/sync
            </div>
            <div className="mt-6 space-y-3">
              {PROOF_EXAMPLES.map((proof) => (
                <div className="flex items-center justify-between gap-3 text-sm" key={proof.cid}>
                  <span className="text-[var(--text-secondary)]">{truncateMiddle(proof.task, 18, 10)}</span>
                  <a
                    className="inline-flex items-center gap-1 font-mono text-xs text-sky-300 transition hover:text-sky-200"
                    href={`https://gateway.pinata.cloud/ipfs/${proof.cid}`}
                    rel="noreferrer"
                    target="_blank"
                  >
                    View CID
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </Section>
    </div>
  )
}

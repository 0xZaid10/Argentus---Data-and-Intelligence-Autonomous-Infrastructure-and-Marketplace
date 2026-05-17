import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { ArrowRight, Database, FileCheck2, LockKeyhole, SearchCheck, WalletCards } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'wouter'
import { API_BASE, PROOF_EXAMPLES } from '@/config'
import { Card } from '@/components/ui/Card'
import { CidLink } from '@/components/ui/CidLink'
import { ConfidenceBar } from '@/components/ui/ConfidenceBar'
import { ErrorState } from '@/components/ui/ErrorState'
import { FallbackNotice } from '@/components/ui/FallbackNotice'
import { LoadingPanel } from '@/components/ui/LoadingPanel'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { SignalBadge } from '@/components/ui/SignalBadge'
import { TxLink } from '@/components/ui/TxLink'
import { DEMO_MARKETPLACE_STATS } from '@/lib/demo-data'
import { fetchMarketplaceStats } from '@/lib/api'
import { formatNumber, formatUsd } from '@/lib/utils'

const steps = [
  {
    step: '1. Post Request',
    body: 'Someone asks a question and locks a USDC reward.',
    icon: WalletCards,
  },
  {
    step: '2. AI Researches',
    body: 'Four agents pull from APIs, on-chain data, and web search.',
    icon: SearchCheck,
  },
  {
    step: '3. Store on Filecoin',
    body: 'The report is pinned permanently and gets a CID as proof.',
    icon: Database,
  },
  {
    step: '4. Verify Quality',
    body: 'The verifier checks whether the result answers the request.',
    icon: FileCheck2,
  },
  {
    step: '5. Get Paid',
    body: 'Approved work unlocks USDC automatically.',
    icon: LockKeyhole,
  },
]

const agents = [
  ['Coordinator', 'Routes tasks and sends results via Telegram.'],
  ['Researcher', 'Pulls live data and writes the report.'],
  ['Verifier', 'Checks quality and settles payment.'],
  ['Trader', 'Monitors market signals continuously.'],
]

const botSteps = [
  'Open Telegram',
  'Search @agent_mesh_coordinator_bot',
  'Send: /task analyze BTC whale accumulation today',
  'Wait 2-3 minutes - get full report + PDF',
]

const exampleTasks = [
  '/task analyze BTC whale accumulation today',
  '/task analyze ETH DeFi TVL trends this week',
  '/task analyze SOL ecosystem and whale movements',
  '/task analyze wallet 0x742d... ethereum activity',
]

function Section({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  return (
    <motion.section
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
      initial={{ opacity: 0, y: 16 }}
      transition={{ delay, duration: 0.4 }}
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

  const stats = statsQuery.data ?? (statsQuery.isError ? DEMO_MARKETPLACE_STATS : undefined)

  return (
    <div className="space-y-10 md:space-y-14">
      <Section>
        {statsQuery.isError ? <FallbackNotice message="Live stats are unavailable right now. Showing placeholder proof data." /> : null}
        <Card className="overflow-hidden p-0">
          <div className="grid gap-10 p-8 md:p-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(20rem,0.8fr)] lg:p-14">
            <div className="min-w-0">
              <p className="font-mono text-xs uppercase tracking-[0.35em] text-[var(--accent-gold)]">Argentus</p>
              <h1 className="mt-5 max-w-4xl font-display text-5xl leading-none text-[var(--text-primary)] md:text-7xl">
                Ask. Verify. Trust.
              </h1>
              <p className="mt-6 max-w-3xl text-base leading-8 text-[var(--text-secondary)] md:text-lg">
                Argentus lets any AI agent request crypto market intelligence, pay only when the data is verified,
                and store it permanently on Filecoin.
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
                  className="inline-flex items-center justify-center rounded-full border border-[var(--border-strong)] bg-[var(--surface-2)] px-5 py-3 font-medium text-[var(--text-primary)] transition hover:border-[var(--accent-gold-dim)]"
                  href="/tasks"
                >
                  See Live Tasks
                </Link>
              </div>
            </div>

            <div className="min-w-0">
              {!stats && statsQuery.isLoading ? (
                <LoadingPanel label="Loading live stats..." />
              ) : stats ? (
                <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface-2)] p-6">
                  <p className="font-mono text-xs uppercase tracking-[0.24em] text-[var(--accent-gold)]">Live Stats</p>
                  <div className="mt-5 space-y-4 text-sm text-[var(--text-secondary)]">
                    <div className="flex items-center justify-between gap-4">
                      <span>Requests</span>
                      <span className="font-display text-3xl text-[var(--text-primary)]">{formatNumber(stats.total_requests)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span>Verified</span>
                      <span className="font-display text-3xl text-[var(--text-primary)]">{formatNumber(stats.approved_submissions)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span>USDC Paid</span>
                      <span className="font-display text-3xl text-[var(--text-primary)]">{formatUsd(stats.total_rewarded_usdc)}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <ErrorState message="Service offline. VPS: 104.207.76.143" />
              )}
            </div>
          </div>
        </Card>
      </Section>

      <Section delay={0.03}>
        <SectionHeader
          description="The old model makes data quality and payment trust somebody else's word. Argentus makes both verifiable."
          eyebrow="The Problem"
          title="Old way versus Argentus"
        />
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-red-500/20 bg-[linear-gradient(180deg,rgba(127,29,29,0.16),rgba(17,17,19,0.92))]">
            <p className="font-display text-2xl text-red-200">Old way</p>
            <ul className="mt-5 space-y-3 text-sm leading-7 text-red-100/80">
              <li>API goes down? You are stuck.</li>
              <li>No proof the data is real.</li>
              <li>You can still pay for bad output.</li>
            </ul>
          </Card>
          <Card className="border-emerald-500/20 bg-[linear-gradient(180deg,rgba(6,95,70,0.16),rgba(17,17,19,0.92))]">
            <p className="font-display text-2xl text-emerald-200">Argentus</p>
            <ul className="mt-5 space-y-3 text-sm leading-7 text-emerald-100/80">
              <li>Data stored permanently on Filecoin.</li>
              <li>On-chain proof of quality and settlement.</li>
              <li>Pay only when the work is verified.</li>
            </ul>
          </Card>
        </div>
      </Section>

      <Section delay={0.06}>
        <SectionHeader
          description="A request becomes a paid, verified intelligence artifact in five straightforward steps."
          eyebrow="How It Works"
          title="Simple end-to-end flow"
        />
        <div className="grid gap-4 xl:grid-cols-5">
          {steps.map((item) => (
            <Card className="h-full" key={item.step}>
              <item.icon className="h-5 w-5 text-[var(--accent-gold)]" />
              <p className="mt-5 font-display text-2xl text-[var(--text-primary)]">{item.step}</p>
              <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">{item.body}</p>
            </Card>
          ))}
        </div>
      </Section>

      <Section delay={0.09}>
        <SectionHeader
          description="All four agents run autonomously on Claude Opus via TokenRouter."
          eyebrow="Agents"
          title="The four agents"
        />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {agents.map(([title, body]) => (
            <Card key={title}>
              <p className="font-display text-2xl text-[var(--text-primary)]">{title}</p>
              <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">{body}</p>
            </Card>
          ))}
        </div>
      </Section>

      <Section delay={0.12}>
        <Card className="grid gap-8 lg:grid-cols-[1fr,0.95fr]">
          <div className="min-w-0">
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-[var(--accent-gold)]">Anyone Can Integrate</p>
            <h2 className="mt-4 font-display text-4xl text-[var(--text-primary)]">Any language. Any agent framework.</h2>
            <p className="mt-5 max-w-2xl text-sm leading-8 text-[var(--text-secondary)]">
              Argentus is infrastructure. Your agent can call a single HTTP endpoint and get back a structured report
              plus a permanent Filecoin CID.
            </p>
          </div>
          <div className="rounded-[1.75rem] border border-[var(--border)] bg-[#09090b] p-5 font-mono text-sm text-emerald-200">
            <pre className="overflow-x-auto whitespace-pre-wrap">
{`curl -X POST ${API_BASE}/api/research/sync \\
  -H "Content-Type: application/json" \\
  -d '{"goal":"analyze BTC whale activity","userId":"my-agent"}'

# Returns: report JSON + Filecoin CID (permanent proof)`}
            </pre>
          </div>
        </Card>
      </Section>

      <Section delay={0.15}>
        <Card className="overflow-hidden border-amber-500/20 bg-[linear-gradient(135deg,rgba(245,158,11,0.16),rgba(17,17,19,0.96)_38%,rgba(17,17,19,0.98))]">
          <p className="font-mono text-xs uppercase tracking-[0.32em] text-[var(--accent-gold)]">Try It Now</p>
          <h2 className="mt-4 font-display text-4xl text-[var(--text-primary)]">Test Argentus in 30 seconds</h2>
          <div className="mt-8 grid gap-4 lg:grid-cols-4">
            {botSteps.map((step, index) => (
              <div className="rounded-[1.5rem] border border-amber-500/15 bg-[rgba(9,9,11,0.72)] p-5" key={step}>
                <p className="font-display text-2xl text-[var(--accent-gold)]">{index + 1}.</p>
                <p className="mt-3 text-sm leading-7 text-[var(--text-primary)]">{step}</p>
              </div>
            ))}
          </div>
          <div className="mt-8">
            <a
              className="inline-flex items-center justify-center rounded-full bg-[var(--accent-gold)] px-5 py-3 font-medium text-black transition hover:bg-[var(--accent-gold-strong)]"
              href="https://t.me/agent_mesh_coordinator_bot"
              rel="noreferrer"
              target="_blank"
            >
              Open @agent_mesh_coordinator_bot
            </a>
            <p className="mt-4 text-sm text-[var(--text-secondary)]">
              Free to use. No signup. Results stored permanently on Filecoin.
            </p>
          </div>
        </Card>
      </Section>

      <Section delay={0.17}>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <p className="font-display text-2xl text-[var(--text-primary)]">Bot Commands</p>
            <div className="mt-5 rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface-2)] p-5">
              <p className="font-mono text-sm text-[var(--text-primary)]">Telegram: @agent_mesh_coordinator_bot</p>
              <div className="mt-5 space-y-5">
                <div>
                  <p className="font-mono text-sm text-[var(--accent-gold)]">/task &lt;question&gt;</p>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">Run autonomous crypto research</p>
                </div>
                <div>
                  <p className="font-mono text-sm text-[var(--accent-gold)]">/help</p>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">Show available commands</p>
                </div>
                <div>
                  <p className="font-mono text-sm text-[var(--accent-gold)]">/status</p>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">Check if services are running</p>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <p className="font-display text-2xl text-[var(--text-primary)]">Example Tasks</p>
            <div className="mt-5 rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface-2)] p-5">
              <p className="text-sm text-[var(--text-secondary)]">Try these:</p>
              <div className="mt-5 space-y-5">
                {exampleTasks.map((task) => (
                  <div key={task}>
                    <p className="font-mono text-sm text-[var(--accent-gold)]">-&gt; {task}</p>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
        <p className="text-center text-sm text-[var(--text-secondary)]">
          Results arrive as: Signal + confidence   PDF report   Filecoin CID
        </p>
      </Section>

      <Section delay={0.19}>
        <SectionHeader
          description="These proof cards stay visible even when the backend is offline, so the site still demonstrates the real workflow."
          eyebrow="Live Proof"
          title="Verified examples"
        />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {PROOF_EXAMPLES.map((proof) => (
            <Card key={proof.cid}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <SignalBadge signal={proof.signal} />
                <span className="font-mono text-xs text-[var(--text-secondary)]">{proof.task}</span>
              </div>
              <div className="mt-5">
                <ConfidenceBar score={proof.confidence} />
              </div>
              <div className="mt-5 flex flex-col gap-3 text-sm">
                <CidLink cid={proof.cid} />
                <TxLink hash={proof.arbitrate_tx} label="Arbitrate" />
                <TxLink hash={proof.collect_tx} label="Collect" />
              </div>
            </Card>
          ))}
        </div>
      </Section>

      <Section delay={0.21}>
        <Card className="grid gap-8 lg:grid-cols-[1.05fr,0.95fr]">
          <div>
            <p className="font-display text-4xl text-[var(--text-primary)]">Build on Argentus</p>
            <p className="mt-4 text-sm leading-8 text-[var(--text-secondary)]">
              Browse live demand, inspect agent tasks, or integrate the research API directly into your own runtime.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                className="inline-flex items-center justify-center rounded-full bg-[var(--accent-gold)] px-5 py-3 font-medium text-black transition hover:bg-[var(--accent-gold-strong)]"
                href="/marketplace"
              >
                Browse Marketplace
              </Link>
              <Link
                className="inline-flex items-center justify-center rounded-full border border-[var(--border-strong)] bg-[var(--surface-2)] px-5 py-3 font-medium text-[var(--text-primary)] transition hover:border-[var(--accent-gold-dim)]"
                href="/docs"
              >
                Read the Docs
              </Link>
            </div>
          </div>
          <div className="rounded-[1.75rem] border border-[var(--border)] bg-[#09090b] px-4 py-4 font-mono text-xs text-emerald-200">
            API endpoint: {API_BASE}/api/research/sync
          </div>
        </Card>
      </Section>
    </div>
  )
}

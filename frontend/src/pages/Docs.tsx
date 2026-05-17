import * as Tabs from '@radix-ui/react-tabs'
import { API_BASE, RESEARCH_BASE } from '@/config'
import { Card } from '@/components/ui/Card'
import { SectionHeader } from '@/components/ui/SectionHeader'

const sections = {
  research: `POST /api/research/sync
  Body: { "goal": string (min 10 chars), "userId": string }
  Returns: { sessionId, cid, report: { smart_money_signal, confidence_score,
             executive_summary, key_findings, key_tokens, risks, data_sources } }
  Timeout: ~60-180s, use --max-time 300

POST /api/research  (background, returns immediately)
GET  /api/research/sessions/:userId
GET  /api/research/session/:sessionId
GET  /health`,
  tasks: `POST /api/tasks
  Body: { "description": string, "user_chat_id": string|null }
  Returns: Task object

GET /api/tasks/active
GET /api/tasks/:id

PATCH /api/tasks/:id
  Body: { "status": "verifying", "result_cid": "bafybei..." }
  -> Triggers auto-pipeline: mark complete + generate PDF`,
  marketplace: `POST /api/marketplace/requests
  Body: { title, description, category, reward_usdc, requester_address? }
  -> Escrow created automatically

GET /api/marketplace/requests?status=open
GET /api/marketplace/requests/:id

POST /api/marketplace/submit
  Body: { request_id, raw_content?, cid?, submitter_address? }
  -> LLM auto-verifies in background
  -> If approved: uploads to Filecoin + settles escrow + pays submitter

GET /api/marketplace/stats
GET /api/marketplace/leaderboard`,
  selfHosting: `git clone https://github.com/0xZaid10/Argentus
cd Argentus

# Backend
cd da/backend && npm install && npm run dev

# Research
cd da/research && npm install && npm run dev

# MCP memory
cd da/mcp-server && npm install && npm run dev

# OpenClaw agents
export VERIFIER_PRIVATE_KEY=0x...
export WORKER_PRIVATE_KEY=0x...
export FILECOIN_PRIVATE_KEY=0x...
openclaw gateway`,
} as const

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="mt-4 overflow-x-auto rounded-3xl border border-[var(--border)] bg-[#09090b] px-4 py-4 font-mono text-xs leading-7 text-emerald-200">
      {children}
    </pre>
  )
}

export default function DocsPage() {
  return (
    <div className="space-y-10 md:space-y-12">
      <SectionHeader
        description="Quick integration details, API reference, and self-hosting notes for the full Argentus stack."
        eyebrow="Docs"
        title="Integrate Argentus fast"
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-6 lg:col-span-2">
          <p className="font-display text-2xl text-[var(--text-primary)]">Telegram Bot</p>
          <p className="mt-4 text-sm leading-8 text-[var(--text-secondary)]">
            The fastest way to use Argentus - no code needed.
          </p>
          <CodeBlock>{`Bot: @agent_mesh_coordinator_bot
Link: https://t.me/agent_mesh_coordinator_bot

COMMANDS:
  /task <description>   Run autonomous research (2-3 min)
  /help                 Show commands
  /status               Check system health

EXAMPLE:
  /task analyze BTC whale accumulation today

WHAT YOU GET BACK:
  - Signal: bullish / bearish / neutral
  - Confidence score (0-100%)
  - Executive summary
  - Filecoin CID - permanent proof of storage
  - PDF report sent directly to your Telegram
  - Basescan links for on-chain verification

HOW IT WORKS:
  Your message -> Coordinator Agent -> Research Service ->
  Filecoin mainnet -> Verifier -> PDF -> back to your Telegram

  All autonomous. No human in the loop.`}</CodeBlock>
        </Card>

        <Card className="p-6">
          <p className="font-display text-2xl text-[var(--text-primary)]">Quick start</p>
          <CodeBlock>{`import requests
result = requests.post("${API_BASE}/api/research/sync",
    json={"goal": "analyze BTC whale accumulation today", "userId": "my-agent"})
cid = result.json()["cid"]  # permanent Filecoin proof`}</CodeBlock>
        </Card>

        <Card className="p-6">
          <p className="font-display text-2xl text-[var(--text-primary)]">Current defaults</p>
          <div className="mt-5 space-y-3 font-mono text-xs text-[var(--text-secondary)]">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3">{API_BASE}</div>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3">{RESEARCH_BASE}</div>
          </div>
        </Card>
      </div>

      <Tabs.Root className="space-y-6" defaultValue="research">
        <Tabs.List className="inline-flex flex-wrap rounded-full border border-[var(--border)] bg-[var(--surface-2)] p-1">
          {[
            ['research', 'Research API'],
            ['tasks', 'Tasks API'],
            ['marketplace', 'Marketplace API'],
            ['selfHosting', 'Self-hosting'],
          ].map(([value, label]) => (
            <Tabs.Trigger
              className="rounded-full px-4 py-2 text-sm text-[var(--text-secondary)] data-[state=active]:bg-[var(--surface-3)] data-[state=active]:text-[var(--text-primary)]"
              key={value}
              value={value}
            >
              {label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        {(Object.keys(sections) as Array<keyof typeof sections>).map((key) => (
          <Tabs.Content key={key} value={key}>
            <Card className="p-6">
              <CodeBlock>{sections[key]}</CodeBlock>
            </Card>
          </Tabs.Content>
        ))}
      </Tabs.Root>

      <Card className="p-6">
        <p className="font-display text-2xl text-[var(--text-primary)]">Required API keys</p>
        <div className="mt-5 overflow-x-auto rounded-3xl border border-[var(--border)]">
          <table className="min-w-full text-left">
            <thead className="border-b border-[var(--border)] bg-[var(--surface-2)]">
              <tr className="text-xs uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                <th className="px-4 py-3">Key</th>
                <th className="px-4 py-3">Purpose</th>
                <th className="px-4 py-3">Free</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['TokenRouter', 'LLM (Claude)', '$1 credit'],
                ['SerpApi', 'Web search', '250/month'],
                ['Etherscan', 'On-chain data', 'Yes'],
                ['Filecoin wallet', 'Storage', '~$0.07/pin'],
                ['Base Sepolia ETH', 'Gas', 'Faucet'],
                ['Base Sepolia USDC', 'Escrow', 'Faucet'],
              ].map(([key, purpose, free]) => (
                <tr className="border-b border-[var(--border)] text-sm text-[var(--text-secondary)]" key={key}>
                  <td className="px-4 py-3 text-[var(--text-primary)]">{key}</td>
                  <td className="px-4 py-3">{purpose}</td>
                  <td className="px-4 py-3">{free}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

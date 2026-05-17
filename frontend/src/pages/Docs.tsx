import ReactMarkdown from 'react-markdown'
import { API_BASE, RESEARCH_BASE } from '@/config'
import { Card } from '@/components/ui/Card'
import { SectionHeader } from '@/components/ui/SectionHeader'

const quickStart = `## Integrate in 3 lines

\`\`\`python
import requests

result = requests.post("http://YOUR_DEPLOYMENT/api/research/sync", json={
    "goal": "analyze BTC whale accumulation this week",
    "userId": "my-agent-001"
})
\`\`\`
`

const apiReference = `## Research Service (port 3000)

### POST /api/research/sync
Synchronous research. Waits 60-150 seconds for a result.

\`\`\`json
Request:
{
  "goal": "string (min 10 chars)",
  "userId": "string"
}

Response:
{
  "sessionId": "uuid",
  "goal": "string",
  "report": {
    "taskId": "uuid",
    "type": "market_research",
    "topic": "string",
    "executive_summary": "string",
    "market_narrative": "string",
    "key_findings": ["string"],
    "key_tokens": [
      {
        "symbol": "BTC",
        "thesis": "string",
        "sentiment": "bullish|bearish|neutral",
        "risk_level": "low|medium|high"
      }
    ],
    "risks": ["string"],
    "smart_money_signal": "bullish|bearish|neutral",
    "confidence_score": 0.0,
    "data_sources": ["string"],
    "generated_at": "ISO8601"
  },
  "cid": "bafybei...",
  "duration_ms": 120000
}
\`\`\`

### POST /api/research
Background, non-blocking research run. Same request body, returns a sessionId immediately.

### GET /api/research/sessions/:userId
List past sessions for a user.

### GET /api/research/session/:sessionId
Get a specific session.

### GET /health
Service health check.

---

## Backend API (port 3001)

### POST /api/tasks
Create a new intelligence task.

\`\`\`json
Request: { "description": "string", "user_chat_id": "string|null" }
Response: Task object with escrow_uid
\`\`\`

### GET /api/tasks/active
List active or recent tasks.

\`\`\`json
Response: { "tasks": Task[] }
\`\`\`

### GET /api/tasks/:id
Get task by ID.

### PATCH /api/tasks/:id
Update task status. When \`status=verifying\` + \`result_cid\` + \`escrow_uid\` are all present, the backend automatically runs arbitrate, collect, and PDF generation.

\`\`\`json
{
  "status": "verifying",
  "result_cid": "bafybei...",
  "fulfillment_uid": "0x..."
}
\`\`\`

### POST /api/tasks/:id/generate-reports
Manually trigger PDF generation.

### POST /api/marketplace/requests
Post a new intelligence request.

\`\`\`json
{
  "title": "string",
  "description": "string",
  "category": "crypto_research|defi_analysis|onchain_analysis|market_sentiment|whale_tracking",
  "reward_usdc": 1.0,
  "requester_address": "0x...|null",
  "deadline": "ISO8601|null"
}
\`\`\`

### GET /api/marketplace/requests
Query params: \`status=open|reviewing|completed&limit=20\`

### GET /api/marketplace/requests/:id
Get a request with submissions.

### POST /api/marketplace/submit
Submit a CID to a request.

\`\`\`json
{
  "request_id": "uuid",
  "cid": "bafybei...",
  "submitter_address": "0x...|null",
  "description": "string|null"
}
\`\`\`

### POST /api/marketplace/verify
Manual admin or agent verification.

\`\`\`json
{
  "submission_id": "uuid",
  "decision": true,
  "reason": "string"
}
\`\`\`

### GET /api/marketplace/stats

\`\`\`json
{
  "open_requests": 0,
  "total_requests": 0,
  "total_submissions": 0,
  "approved_submissions": 0,
  "total_rewarded_usdc": 0
}
\`\`\`

### GET /api/marketplace/leaderboard
Top submitters by approved submissions.

### POST /api/escrow/arbitrate

\`\`\`json
{
  "fulfillmentUid": "0x...",
  "decision": true,
  "demandHex": "0x",
  "taskId": "uuid|null"
}
\`\`\`

### POST /api/escrow/collect

\`\`\`json
{
  "escrowUid": "0x...",
  "fulfillmentUid": "0x..."
}
\`\`\`
`

const selfHosting = `## Self-hosting guide

\`\`\`bash
# 1. Clone and install
git clone https://github.com/0xZaid10/argentus
cd argentus

# 2. Configure environment
cp ipfs/backend/.env.example ipfs/backend/.env
cp ipfs/research/.env.example ipfs/research/.env

# 3. Start backend
cd ipfs/backend && npm install && npm run dev

# 4. Start research service
cd ipfs/research && npm install && npm run dev

# 5. Start MCP memory server
cd ipfs/mcp-server && npm install && npm run dev

# 6. Start OpenClaw agents (optional)
export VERIFIER_PRIVATE_KEY=0x...
export WORKER_PRIVATE_KEY=0x...
export FILECOIN_PRIVATE_KEY=0x...
export ALKAHEST_CHAIN=base-sepolia
openclaw gateway

# 7. Start frontend
cd frontend && pnpm install && pnpm dev
\`\`\`

## Required API keys

| Key | Purpose | Free tier |
| --- | --- | --- |
| TokenRouter API Key | LLM calls (Claude Haiku) | $1 free credit |
| SerpApi Key | Web search | 250 searches/month free |
| Etherscan API Key | On-chain data | Free |
| Filecoin wallet | Storage payments | ~0.07 USDFC per pin |
| Base Sepolia wallet | Escrow gas | Free testnet ETH |
| Base Sepolia USDC | Escrow payments | Free from faucet.circle.com |
`

function MarkdownCard({ children }: { children: string }) {
  return (
    <Card>
      <div className="prose-report max-w-none text-sm">
        <ReactMarkdown
          components={{
            h2: ({ children: content }) => <h2 className="font-display text-3xl text-[var(--text-primary)]">{content}</h2>,
            h3: ({ children: content }) => <h3 className="mt-8 font-display text-2xl text-[var(--text-primary)]">{content}</h3>,
            p: ({ children: content }) => <p className="mt-3 text-sm leading-8 text-[var(--text-secondary)]">{content}</p>,
            ul: ({ children: content }) => <ul className="mt-3 space-y-2 text-sm text-[var(--text-secondary)]">{content}</ul>,
            li: ({ children: content }) => <li>{content}</li>,
            pre: ({ children: content }) => (
              <pre className="mt-4 overflow-x-auto rounded-3xl border border-[var(--border)] bg-[#09090b] px-4 py-4 font-mono text-xs text-emerald-200">
                {content}
              </pre>
            ),
            code: ({ children: content }) => <code>{content}</code>,
            table: ({ children: content }) => (
              <div className="mt-5 overflow-x-auto rounded-3xl border border-[var(--border)]">
                <table className="min-w-full text-left">{content}</table>
              </div>
            ),
            thead: ({ children: content }) => <thead className="bg-[var(--surface-2)]">{content}</thead>,
            tbody: ({ children: content }) => <tbody>{content}</tbody>,
            tr: ({ children: content }) => <tr className="border-b border-[var(--border)]">{content}</tr>,
            th: ({ children: content }) => <th className="px-4 py-3 text-xs uppercase tracking-[0.18em] text-[var(--text-secondary)]">{content}</th>,
            td: ({ children: content }) => <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">{content}</td>,
            hr: () => <div className="my-8 border-t border-[var(--border)]" />,
          }}
        >
          {children}
        </ReactMarkdown>
      </div>
    </Card>
  )
}

export default function DocsPage() {
  return (
    <div className="space-y-10 md:space-y-12">
      <SectionHeader
        description="Everything needed to integrate Argentus from another agent runtime or self-host the full stack."
        eyebrow="Documentation"
        title="Quick start and API reference"
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-6">
          <p className="font-display text-2xl text-[var(--text-primary)]">Current deployment defaults</p>
          <div className="mt-5 space-y-3 font-mono text-xs text-[var(--text-secondary)]">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3">{API_BASE}</div>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3">{RESEARCH_BASE}</div>
          </div>
        </Card>
        <Card className="p-6">
          <p className="font-display text-2xl text-[var(--text-primary)]">Deployment rule</p>
          <p className="mt-4 text-sm leading-8 text-[var(--text-secondary)]">
            Change `VITE_API_BASE`, `VITE_RESEARCH_BASE`, and `VITE_IPFS_GATEWAY` in one place. Every fetch path in the
            app resolves from `src/config.ts`.
          </p>
        </Card>
      </div>

      <MarkdownCard>{quickStart}</MarkdownCard>
      <MarkdownCard>{apiReference}</MarkdownCard>
      <MarkdownCard>{selfHosting}</MarkdownCard>
    </div>
  )
}

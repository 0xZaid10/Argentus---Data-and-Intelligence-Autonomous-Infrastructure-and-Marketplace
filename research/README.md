# Argentus Research Service

**Autonomous crypto intelligence engine — core research infrastructure for the Argentus marketplace.**

Give it a goal and it plans, executes, and delivers structured intelligence reports — stored permanently on Filecoin mainnet with cryptographic proof.

---

## How it works
Goal → Planner → Orchestrator → Capabilities → LLM Summary → Filecoin Pin → CID
↓
DataAggregator (7 APIs) + SerpApi (web search)
Onchain (Etherscan) + Community (Reddit/HackerNews)

---

## Stack

| Layer | Technology |
|---|---|
| Agent brain | TypeScript orchestrator + capability registry |
| Persistent memory | SQLite + MCP memory server |
| Storage | Filecoin mainnet via filecoin-pin (PDP proofs) |
| LLM | Claude Opus via TokenRouter |
| Web search | SerpApi (250 free/month) |
| Onchain data | Etherscan V2, Mempool.space |
| Market data | CoinGecko, DeFiLlama, Fear & Greed |

---

## API
POST /api/research/sync     — run research, wait for result (returns CID)
POST /api/research          — run in background
GET  /api/research/sessions/:userId
GET  /api/research/session/:sessionId
GET  /api/research/queue
GET  /health

### Example

```bash
curl -X POST http://localhost:3000/api/research/sync \
  -H "Content-Type: application/json" \
  -d '{"goal": "analyze BTC whale accumulation today", "userId": "my-agent"}'
```

Response includes `cid` — a real Filecoin CID proving permanent storage.

---

## Capabilities

- **Onchain** — wallet analysis, token tracking, multi-chain data
- **Market** — pricing, TVL, sentiment, competitive analysis
- **Community** — Reddit/HackerNews sentiment, pain points
- **Web search** — live SerpApi results, 4 queries per run

---

## Getting started

```bash
npm install
cp .env.example .env
# Fill in ANTHROPIC_API_KEY, SERPAPI_KEY, ETHERSCAN_API_KEY, FILECOIN_PRIVATE_KEY
npm run dev
```

---

## Part of Argentus

This service is the intelligence layer of the [Argentus](https://github.com/0xZaid10/Argentus) decentralized data marketplace. Any AI agent can call this service to get verifiable crypto intelligence stored on Filecoin.

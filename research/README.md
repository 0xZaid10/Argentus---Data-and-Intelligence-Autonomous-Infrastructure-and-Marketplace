# Argentus Research Service

Autonomous crypto intelligence engine — the core research infrastructure for the Argentus marketplace. Any AI agent can call this service to get verifiable intelligence stored permanently on Filecoin.

## Quick start

```bash
npm install
cp .env.example .env
npm run dev
# Running on http://localhost:3000
```

## Environment variables

```env
ANTHROPIC_API_KEY=...       # TokenRouter or Anthropic key
ANTHROPIC_BASE_URL=https://api.tokenrouter.com
LLM_MODEL=anthropic/claude-opus-4.5
SERPAPI_KEY=...              # Web search (250 free/month)
ETHERSCAN_API_KEY=...        # On-chain data
FILECOIN_PRIVATE_KEY=0x...  # Filecoin wallet for pinning
FILECOIN_WALLET_ADDRESS=0x...
```

## API

```
POST /api/research/sync          — run research, wait for result (~60-180s)
POST /api/research               — run in background, returns sessionId
GET  /api/research/sessions/:userId
GET  /api/research/session/:sessionId
GET  /api/research/queue
GET  /health
```

### Example

```bash
curl -X POST http://localhost:3000/api/research/sync \
  -H "Content-Type: application/json" \
  -d '{"goal": "analyze BTC whale accumulation today", "userId": "my-agent"}' \
  --max-time 300
```

### Response

```json
{
  "sessionId": "uuid",
  "cid": "bafybei...",
  "report": {
    "executive_summary": "...",
    "smart_money_signal": "bullish",
    "confidence_score": 0.82,
    "key_findings": ["..."],
    "key_tokens": [{"symbol": "BTC", "sentiment": "bullish"}],
    "risks": ["..."],
    "data_sources": ["CoinGecko", "DeFiLlama", "SerpApi"]
  },
  "duration_ms": 120000
}
```

`cid` is a real Filecoin CID — the report is stored permanently on Filecoin mainnet with PDP proofs.

## Data sources

| Source | Data |
|--------|------|
| CoinGecko | Price, market cap, trending |
| DeFiLlama | TVL, protocols, chains |
| Fear & Greed | Sentiment index + 7d trend |
| Etherscan V2 | Gas, supply, node count |
| Mempool.space | BTC fees, hashrate |
| CryptoCompare | 7d OHLCV, social data |
| Blockchain.info | BTC stats |
| SerpApi | Live web search (4 queries × 10 results) |

## Capabilities

- `onchain` — wallet and token analysis via Etherscan
- `market` — competitive and market intelligence
- `community` — Reddit + HackerNews sentiment
- `reddit` — community pain points and signals

## Compatible with any agent framework

```python
# Python
import requests
result = requests.post("http://your-host:3000/api/research/sync", json={
    "goal": "analyze ETH DeFi TVL trends",
    "userId": "my-langchain-agent"
})
cid = result.json()["cid"]  # Filecoin CID — permanent proof
```

```typescript
// TypeScript / Node
const res = await fetch("http://your-host:3000/api/research/sync", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ goal: "analyze SOL whale flows", userId: "agent-1" })
})
const { cid, report } = await res.json()
```

*Part of the [Argentus](https://github.com/0xZaid10/Argentus) decentralized intelligence marketplace.*

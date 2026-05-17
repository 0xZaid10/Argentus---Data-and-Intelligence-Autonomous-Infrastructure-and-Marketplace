# Argentus Backend API

Core backend service for the Argentus decentralized intelligence marketplace. Handles task management, escrow lifecycle, marketplace operations, PDF generation, and Telegram notifications.

## Quick start

```bash
npm install
cp .env.example .env
npm run dev
# Running on http://localhost:3001
```

## Environment variables

```env
USER_PRIVATE_KEY=0x...          # Wallet that locks escrow
WORKER_PRIVATE_KEY=0x...        # Wallet that collects payment
VERIFIER_PRIVATE_KEY=0x...      # Wallet that arbitrates escrow
VERIFIER_WALLET_ADDRESS=0x...   # Verifier wallet address
ALKAHEST_CHAIN=base-sepolia
COORDINATOR_BOT_TOKEN=...       # Telegram bot token
ANTHROPIC_API_KEY=...           # TokenRouter or Anthropic key
ANTHROPIC_BASE_URL=https://api.tokenrouter.com/v1
FILECOIN_PRIVATE_KEY=0x...      # Filecoin wallet
```

## API Reference

### Tasks

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/tasks | Create intelligence task |
| GET | /api/tasks/active | List active tasks |
| GET | /api/tasks/:id | Get task by ID |
| PATCH | /api/tasks/:id | Update task status (triggers auto-pipeline) |
| POST | /api/tasks/:id/generate-reports | Generate PDF reports |
| POST | /api/tasks/:id/upload-to-filecoin | Upload deliverable to Filecoin |

**Auto-pipeline:** When a task is PATCHed with `status=verifying` and a valid `result_cid` (starts with `bafy`), the backend automatically marks it completed and generates PDFs — no agent intervention needed.

### Marketplace

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/marketplace/requests | Post intelligence request + lock escrow |
| GET | /api/marketplace/requests | List open requests |
| GET | /api/marketplace/requests/:id | Get request with submissions |
| POST | /api/marketplace/submit | Submit raw content or CID |
| POST | /api/marketplace/verify | Manual approve/reject |
| GET | /api/marketplace/stats | Marketplace statistics |
| GET | /api/marketplace/leaderboard | Top submitters |

**Auto-verify flow:** On submission → LLM evaluates content vs request → if approved → upload to Filecoin → submit fulfillment attestation → arbitrate escrow → collect USDC → notify via Telegram.

### Escrow

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/escrow/create | Create Alkahest escrow |
| POST | /api/escrow/fulfill | Submit fulfillment attestation |
| POST | /api/escrow/arbitrate | Arbitrate (verifier only) |
| POST | /api/escrow/collect | Collect payment (worker) |

### Other

```
GET  /api/agents       — agent status
GET  /api/positions    — trading positions
GET  /api/leaderboard  — task leaderboard
```

## Architecture

```
index.js
├── routes/
│   ├── tasks.js        — task CRUD + auto-pipeline
│   ├── marketplace.js  — request/submit/verify + escrow
│   ├── escrow.js       — alkahest contract calls
│   ├── agents.js       — agent status
│   └── reports.js      — PDF generation
├── services/
│   ├── escrow/
│   │   └── alkahest.js — viem contract interactions
│   └── reports.js      — pandoc PDF + Telegram send
└── db.js               — SQLite (better-sqlite3)
```

## Contracts (Base Sepolia)

```
ERC20EscrowObligation:  0x1Fe964348Ec42D9Bb1A072503ce8b4744266FF43
StringObligation:       0x544873C22A3228798F91a71C4ef7a9bFe96E7CE0
TrustedOracleArbiter:   0x3664b11BcCCeCA27C21BBAB43548961eD14d4D6D
USDC (testnet):         0x036CbD53842c5426634e7929541eC2318f3dCF7e
```

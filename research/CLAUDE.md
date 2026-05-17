# Research Service — Claude Context

## What this service does

Autonomous crypto intelligence pipeline. Takes a natural language goal, plans capabilities, fetches live data from 7+ APIs + web search, generates a structured JSON report via LLM, uploads to Filecoin mainnet, and returns a CID.

## Critical files

- `src/agent/orchestrator.ts` — main pipeline: plan → execute → summarize → Filecoin upload
- `src/agent/planner.ts` — LLM-based capability selection
- `src/agent/capabilities/` — onchain, market, community, reddit executors
- `src/services/dataAggregator.ts` — all free API calls
- `src/services/webSearch.ts` — SerpApi integration
- `src/services/llm.ts` — TokenRouter/Anthropic LLM service
- `src/api/routes/research.ts` — HTTP endpoints

## Filecoin upload

Added to end of `orchestrator.ts` `_runResearch()` function. Uses `execSync` to call `filecoin-pin add`. Extracts CID from output with regex `Root CID:\s+(baf[a-zA-Z0-9]+)`. Returns `cid` field in response.

## Key patterns

- Research takes 60-180 seconds — use `--max-time 300` on curl
- `cid` in response is always a real `bafybei...` Filecoin CID or null
- LLM model: `anthropic/claude-opus-4.5` via TokenRouter
- Planner normalizes capability names (removes `_analysis`, `_intelligence` suffixes)
- MCP memory server pre-searched before each run to avoid duplicate research

## Common issues

- `MAX_TOKENS is not defined` → add `const MAX_TOKENS = 8192` in llm.ts
- Filecoin upload fails → check `FILECOIN_PRIVATE_KEY` is set and `filecoin-pin` is on PATH
- `goal must be at least 10 characters` → minimum goal length validation
- `userId is required` → always pass userId field

## Environment

Node 22, TypeScript with tsx, ES modules. `filecoin-pin` binary must be installed globally via npm.

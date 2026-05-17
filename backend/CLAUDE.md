# Backend — Claude Context

## What this service does

REST API backend for Argentus. Manages tasks, marketplace requests, escrow settlement, PDF generation, and Telegram delivery. Built with Express + better-sqlite3.

## Critical files

- `src/routes/tasks.js` — task CRUD + auto-pipeline on PATCH
- `src/routes/marketplace.js` — full marketplace lifecycle with LLM verification
- `src/services/escrow/alkahest.js` — all on-chain calls via viem
- `src/services/reports.js` — PDF generation + Telegram delivery

## Auto-pipeline logic

When `PATCH /api/tasks/:id` receives `status=verifying` AND `result_cid` starts with `bafy`:
1. Mark task completed
2. Call `generateAndSendReports()` → pandoc PDF → Telegram

## Marketplace auto-verify

When `POST /api/marketplace/submit` is called:
1. Background: LLM evaluates raw_content vs request description
2. If approved: upload to Filecoin via `filecoin-pin add`
3. Submit fulfillment attestation on-chain
4. Arbitrate via TrustedOracleArbiter
5. Collect USDC from escrow
6. Send Telegram notification

## Key patterns

- All escrow functions use `escrowUID` / `fulfillmentUID` (capital UID) — not `escrowUid`
- `dotenv/config` must be the FIRST import in index.js (ES module hoisting)
- `chat_id` for Telegram must strip `telegram:` prefix before sending
- `filecoin-pin` binary must be on PATH (nvm v22)
- `alkahest` binary must be on PATH (symlinked from nvm v20)

## Common issues

- `Cannot read properties of undefined (reading 'slice')` → missing private key param
- `NOT NULL constraint failed` → check SQLite schema vs INSERT columns
- `[AutoPipeline] Error: Size of bytes "pending"` → fulfillment_uid not set before pipeline fires
- Escrow creation fails → check USDC allowance and balance

## Environment

Node 22, ES modules (`"type": "module"` in package.json), better-sqlite3, viem 2.x, node-fetch.

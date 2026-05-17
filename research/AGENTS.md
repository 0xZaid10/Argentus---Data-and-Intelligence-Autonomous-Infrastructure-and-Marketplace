# Research Service — Agent Integration Guide

## For AI agents calling this service

Base URL: `http://104.207.76.143/research`

## Sync research (recommended)

Blocks until complete. Returns full report + Filecoin CID.

```bash
curl -X POST http://104.207.76.143/research/api/research/sync \
  -H "Content-Type: application/json" \
  -d '{
    "goal": "analyze BTC whale accumulation and smart money signals today",
    "userId": "your-agent-id"
  }' \
  --max-time 300
```

**Goal examples that work well:**
- `analyze BTC whale accumulation today`
- `analyze ETH DeFi TVL trends this week`
- `analyze wallet 0x... ethereum activity`
- `analyze SOL ecosystem and DeFi whale movements`

## Background research

Returns immediately with sessionId. Poll for result.

```bash
# Start
curl -X POST http://104.207.76.143/research/api/research \
  -d '{"goal": "...", "userId": "agent-1"}'
# Response: {"sessionId": "uuid", "pollUrl": "..."}

# Poll
curl http://104.207.76.143/research/api/research/session/{sessionId}
```

## Rules for agents

- Always pass `userId` — used for MCP memory context
- `goal` must be at least 10 characters
- Set `--max-time 300` — research takes 60-180s including Filecoin upload
- The returned `cid` is a real Filecoin CID — use it as proof of storage
- If `cid` is null — Filecoin upload failed, report still valid but no permanent storage
- Never call this service more than once for the same goal in 30 minutes — MCP memory deduplicates

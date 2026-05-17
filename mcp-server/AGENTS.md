# MCP Server — Agent Integration Guide

## For AI agents using memory

### Via HTTP (research service, backend)

```bash
# Search past research before running new analysis
curl -X POST http://104.207.76.143/mcp/search \
  -H "Content-Type: application/json" \
  -d '{"query": "BTC whale accumulation", "limit": 10, "days": 30}'

# Store completed session
curl -X POST http://104.207.76.143/mcp/sessions/store \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "uuid",
    "userId": "coordinator",
    "goal": "analyze BTC...",
    "report": {...},
    "cid": "bafybei...",
    "confidence": 0.82,
    "signal": "bullish"
  }'
```

### Via OpenClaw skill (memory-search)

OpenClaw agents use the `memory-search` skill which connects via stdio MCP transport. The skill is pre-configured in the agent workspace.

## Rules for agents

- Always search memory before running new research on the same topic
- Store every completed session — builds context over time
- Use `days: 30` filter to avoid stale data
- CID field is required for deliverable indexing
- Memory is per-deployment — not shared across instances

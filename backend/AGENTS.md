# Backend API — Agent Integration Guide

## For AI agents calling this service

Base URL: `http://104.207.76.143` (or your deployment URL)

## Creating and running an intelligence task

```bash
# 1. Create task
curl -X POST http://104.207.76.143/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"description": "analyze BTC whale accumulation today", "user_chat_id": "telegram:1234567890"}'

# Response: { "id": "uuid", "escrow_uid": null, ... }

# 2. Run research (via research service)
curl -X POST http://104.207.76.143/research/api/research/sync \
  -H "Content-Type: application/json" \
  -d '{"goal": "analyze BTC whale accumulation today", "userId": "coordinator"}' \
  --max-time 300

# Response: { "cid": "bafybei...", "report": {...}, "sessionId": "..." }

# 3. Patch backend — triggers auto-pipeline
curl -X PATCH http://104.207.76.143/api/tasks/{id} \
  -H "Content-Type: application/json" \
  -d '{"status": "verifying", "result_cid": "bafybei..."}'

# Backend auto-completes: marks done + generates PDF + sends Telegram
```

## Marketplace flow

```bash
# Post a request (locks USDC escrow automatically)
curl -X POST http://104.207.76.143/api/marketplace/requests \
  -H "Content-Type: application/json" \
  -d '{"title": "BTC analysis", "description": "...", "reward_usdc": 1.0}'

# Submit data (triggers LLM verification in background)
curl -X POST http://104.207.76.143/api/marketplace/submit \
  -H "Content-Type: application/json" \
  -d '{"request_id": "...", "raw_content": "BTC price: $78k..."}'

# Check status
curl http://104.207.76.143/api/marketplace/requests/{id}
```

## Rules for agents

- NEVER call escrow endpoints directly — backend handles it automatically
- NEVER make up CIDs — only use CIDs returned by the research service
- CIDs must start with `bafy` — reject anything else
- The auto-pipeline fires when `result_cid` is set on a PATCH — no further action needed
- Marketplace submissions are auto-verified — no manual verification needed

# Argentus MCP Memory Server

Model Context Protocol (MCP) server providing persistent agent memory for the Argentus research pipeline. Stores research sessions, deliverables, and agent context across runs.

## Quick start

```bash
npm install
npm run dev
# HTTP server on http://localhost:3002
# stdio MCP server also available
```

## Endpoints

```
POST /search              — search past sessions by query
POST /session             — get session by ID
POST /sessions/recent     — get recent sessions
POST /sessions/store      — store a new session
POST /deliverables        — search deliverables by CID or topic
GET  /context/:agent      — get agent-specific context
```

## Usage

```bash
# Search past research
curl -X POST http://localhost:3002/search \
  -H "Content-Type: application/json" \
  -d '{"query": "BTC whale accumulation", "limit": 5}'

# Store a session
curl -X POST http://localhost:3002/sessions/store \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "...", "goal": "...", "report": {...}, "cid": "bafybei..."}'

# Get agent context
curl http://localhost:3002/context/research
```

## How it integrates

The research service queries this server before every run:
1. Searches for past sessions matching the goal
2. Injects relevant context into the LLM prompt
3. Stores new session after completion

This prevents duplicate research and improves report quality by referencing historical data.

## Storage

SQLite database at `./src/.nexis/memory.db` (or configured path). Stores:
- Research sessions with full report JSON
- Deliverable CIDs with metadata
- Agent-specific context and preferences
- Memory entries for cross-session learning

*Part of the [Argentus](https://github.com/0xZaid10/Argentus) decentralized intelligence marketplace.*

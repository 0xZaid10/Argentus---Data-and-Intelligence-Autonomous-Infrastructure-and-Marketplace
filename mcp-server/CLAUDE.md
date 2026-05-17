# MCP Server — Claude Context

## What this service does

Persistent memory layer for Argentus agents. Implements Model Context Protocol (MCP) over both stdio (for OpenClaw) and HTTP (for the research service). Stores research sessions in SQLite and provides semantic search over past results.

## Critical files

- `src/http.js` — HTTP server on port 3002
- `src/index.js` — stdio MCP transport
- `src/db.js` — SQLite operations
- `src/tools.js` — MCP tool definitions

## Key patterns

- Research service calls `/search` before each run to avoid duplicates
- Research service calls `/sessions/store` after each run
- OpenClaw agents use stdio transport via `memory-search` skill
- Sessions include full report JSON, CID, goal, and timestamps

## Common issues

- DB not found → check `SQLITE_PATH` env var or default `.nexis/memory.db`
- Search returns no results → normal for first run, memory builds over time
- stdio transport hangs → only one process can connect at a time

## Environment

Node 22, CommonJS (`"type": "commonjs"`), better-sqlite3.

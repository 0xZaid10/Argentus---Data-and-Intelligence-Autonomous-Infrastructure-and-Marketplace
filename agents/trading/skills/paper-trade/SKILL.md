---
name: paper-trade
description: Open, close, and manage simulated paper trading positions. All trades are purely simulated — no real money involved. Positions are persisted in JSON files and monitored by the Heartbeat.
---

# Paper Trade Skill

Manage simulated paper trading positions. All trades are [PAPER TRADING - SIMULATED ONLY].

## Open a Position

1. Fetch current price using binance-data skill
2. Generate a positionId: use timestamp + symbol (e.g., `pos_1748123456_BTCUSDT`)
3. Calculate position details:
   - entry_price = current market price (or user-specified limit price)
   - size_units = size_usdt / entry_price
4. Create position object:
```json
{
  "positionId": "pos_<timestamp>_<symbol>",
  "symbol": "<SYMBOL>",
  "direction": "long|short",
  "entry_price": 0.0,
  "current_price": 0.0,
  "size_usdt": 0.0,
  "size_units": 0.0,
  "stop_loss": 0.0,
  "take_profit": 0.0,
  "unrealized_pnl_usdt": 0.0,
  "unrealized_pnl_pct": 0.0,
  "status": "open",
  "opened_at": "<ISO8601>",
  "telegram_chat_id": "<chat_id>"
}
```
5. Read existing positions/open.json (or start with empty array if missing)
6. Append new position and write back to positions/open.json
7. Confirm: "[PAPER] Position opened: <positionId> | <SYMBOL> <direction> @ <entry_price> | Size: <size_usdt> USDT | SL: <stop_loss> | TP: <take_profit>"

## Close a Position

1. Read positions/open.json
2. Find position by positionId
3. Fetch current price (or use user-provided exit price)
4. Calculate realized P&L:
   - Long: pnl_usdt = (exit_price - entry_price) / entry_price * size_usdt
   - Short: pnl_usdt = (entry_price - exit_price) / entry_price * size_usdt
   - pnl_pct = pnl_usdt / size_usdt * 100
5. Update position with: exit_price, realized_pnl_usdt, realized_pnl_pct, status="closed", closed_at
6. Remove from positions/open.json
7. Append to positions/closed.json
8. Report: "[PAPER] Position CLOSED: <positionId> | <SYMBOL> | Entry: <entry> Exit: <exit> | P&L: <pnl_pct>% (<pnl_usdt> USDT)"

## List Open Positions

1. Read positions/open.json
2. For each position, fetch current price and update unrealized P&L
3. Format summary:
```
[PAPER POSITIONS]
<positionId> | <SYMBOL> <direction> | Entry: <entry> Current: <current> | P&L: <pnl_pct>% | SL: <sl> TP: <tp>
```

## Notes

- All values in USDT
- positions/open.json and positions/closed.json persist across sessions
- Heartbeat monitors positions every 1 minute for SL/TP triggers
- Always include [PAPER TRADING - SIMULATED ONLY] disclaimer in all outputs

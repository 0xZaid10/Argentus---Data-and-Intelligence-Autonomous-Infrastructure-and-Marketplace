tasks:
- name: position-monitor
  interval: 1m
  prompt: |
    Read positions/open.json. If file doesn't exist or is empty, return HEARTBEAT_OK.
    For each open position:
    1. Use binance-data skill to fetch current price for position.symbol
    2. Calculate unrealized P&L: direction=long → (current - entry) / entry * size_usdt, direction=short → (entry - current) / entry * size_usdt
    3. Check if stop_loss hit: long → current <= stop_loss, short → current >= stop_loss
    4. Check if take_profit hit: long → current >= take_profit, short → current <= take_profit
    5. If SL or TP hit:
       - Move position to positions/closed.json with exit_price, realized_pnl, closed_at
       - Remove from positions/open.json
       - Send Telegram alert to position.telegram_chat_id:
         "[PAPER] <symbol> position CLOSED | <long/short> | Entry: <entry> Exit: <current> | P&L: <pnl_pct>% (<pnl_usdt> USDT) | Reason: <SL/TP hit>"
    6. Update unrealized P&L in positions/open.json for all remaining positions
    If no positions triggered, return HEARTBEAT_OK

- name: daily-pnl-report
  interval: 24h
  prompt: |
    Read positions/closed.json for positions closed today (closed_at = today's date).
    Calculate: total_trades, winning_trades, losing_trades, total_pnl_usdt, win_rate_pct, best_trade, worst_trade
    Generate daily report JSON.
    Upload to IPFS via filecoin-upload skill. Get CID.
    Send Telegram message to all known chat IDs in positions/open.json and positions/closed.json:
    "[PAPER] Daily P&L Report
    Trades: <total> | Win Rate: <pct>% | P&L: <total_pnl> USDT
    Report CID: <cid>
    [SIMULATED - NOT REAL TRADING]"
    Return HEARTBEAT_OK after sending.

# CRITICAL: position-monitor must run every 1 minute for real-time SL/TP alerts
# daily-pnl-report uploads to IPFS — this is the Filecoin integration proof point

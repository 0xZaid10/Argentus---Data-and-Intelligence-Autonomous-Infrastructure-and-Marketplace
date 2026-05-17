---
name: backtest
description: Run a paper trading strategy backtest against historical Binance OHLCV data. Calculates full performance metrics including return, win rate, max drawdown, and Sharpe ratio.
---

# Backtest Skill

Run a historical backtest of a trading strategy using real Binance market data.

## Inputs Required

- `symbol` — trading pair (e.g., BTCUSDT)
- `interval` — candle timeframe (1h, 4h, 1d)
- `limit` — number of candles (max 1000)
- `strategy` — natural language description of entry/exit rules
- `initial_capital` — starting capital in USDT
- `position_size_pct` — % of capital per trade (e.g., 10 = 10%)
- `stop_loss_pct` — stop loss % from entry
- `take_profit_pct` — take profit % from entry

## Steps

1. **Fetch OHLCV data** using binance-data skill
   ```
   curl -s "https://api.binance.com/api/v3/klines?symbol=<symbol>&interval=<interval>&limit=<limit>"
   ```
   Parse into array of: [openTime, open, high, low, close, volume]

2. **Parse strategy rules** into clear entry/exit conditions:
   - Common patterns: RSI oversold/overbought, MA crossovers, breakout levels, price action patterns
   - Implement logic as: "enter long when condition A, exit when condition B or SL/TP hit"

3. **Simulate trades** against OHLCV data:
   - Iterate candles in order (no look-ahead bias)
   - Apply entry conditions to each candle
   - Track position, entry price, SL, TP
   - Check SL/TP against candle high/low
   - Record each trade: entry_time, exit_time, entry_price, exit_price, pnl_pct, direction

4. **Calculate metrics**:
   - `total_return_pct` = (final_capital - initial_capital) / initial_capital * 100
   - `win_rate_pct` = winning_trades / total_trades * 100
   - `max_drawdown_pct` = largest peak-to-trough decline
   - `sharpe_ratio` = mean(daily_returns) / std(daily_returns) * sqrt(252) [annualized]
   - `best_trade_pct`, `worst_trade_pct`

5. **Build report JSON** matching the backtest schema

6. **Upload to IPFS** using filecoin-upload skill

7. **Return CID** and summary to user

## Important Rules

- No look-ahead bias — only use data available at each candle's open
- Account for realistic slippage: assume fills at next candle open after signal
- Apply position sizing consistently: position_size_usdt = capital * position_size_pct / 100
- Log every trade in the trades array for full transparency

## Output Format

Full backtest report matching the schema in AGENTS.md, uploaded to IPFS.
Summary for Telegram:
```
[PAPER] Backtest Complete: <SYMBOL> <interval>
Period: <from> → <to> | Candles: <count>
Strategy: <description>
Return: <total_return_pct>% | Win Rate: <win_rate_pct>%
Trades: <total> | Max DD: <max_drawdown_pct>%
Sharpe: <sharpe_ratio>
Report CID: <cid>
[SIMULATED - NOT FINANCIAL ADVICE]
```

---
name: binance-data
description: Fetch real-time and historical market data from Binance public API. No API key required. Use for current prices, OHLCV candlestick data, and 24h ticker stats.
---

# Binance Data Skill

Fetch market data from Binance public REST API. No authentication required.

## Current Price

```
curl -s "https://api.binance.com/api/v3/ticker/price?symbol=<SYMBOL>"
```

Example: `BTCUSDT`, `ETHUSDT`, `SOLUSDT`

Returns: `{"symbol": "BTCUSDT", "price": "67432.50"}`

## 24h Ticker (price change, volume, high, low)

```
curl -s "https://api.binance.com/api/v3/ticker/24hr?symbol=<SYMBOL>"
```

Returns: price, priceChange, priceChangePct, volume, high, low, lastPrice

## OHLCV Candlestick Data (for backtesting)

```
curl -s "https://api.binance.com/api/v3/klines?symbol=<SYMBOL>&interval=<INTERVAL>&limit=<LIMIT>"
```

Intervals: `1m`, `5m`, `15m`, `1h`, `4h`, `1d`, `1w`
Limit: 1-1000 candles (default 500)

Each candle: `[openTime, open, high, low, close, volume, closeTime, ...]`

Example for BTC daily last 30 days:
```
curl -s "https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1d&limit=30"
```

## Multiple Symbols (batch price check)

```
curl -s "https://api.binance.com/api/v3/ticker/price"
```
Returns all symbols. Filter client-side.

## Error Handling

- If API returns error: retry once after 5 seconds
- If symbol not found: report "Symbol <SYMBOL> not found on Binance"
- If connection fails: report "Binance API unavailable — use last known price with [STALE DATA] warning"

## Notes

- All prices in USDT unless symbol specifies otherwise
- Binance API rate limit: 1200 requests/minute (we will never approach this)
- Public endpoints — no key needed
- For backtesting: fetch enough candles to cover the strategy timeframe

---
name: verify-cid
description: Verify an IPFS CID is accessible and content meets AgentMesh quality requirements. Then arbitrate the Alkahest escrow settlement on-chain. This is the core trust enforcement skill.
metadata: {"openclaw": {"requires": {"env": ["VERIFIER_PRIVATE_KEY"]}}}
---

# Verify CID Skill

Validate a deliverable CID and submit the arbitration decision on-chain.

## Inputs

- `fulfillmentUid` — the EAS attestation UID from StringObligation
- `escrowUid` — the original escrow attestation UID
- `taskType` — one of: market_research, onchain_intelligence, backtest, daily_pnl
- `demandHex` — the encoded demand hex from the escrow

## Steps

### 1. Fetch fulfillment attestation
```
alkahest attestation get --uid <fulfillmentUid>
```
Parse JSON response. Extract `item` field — this is the IPFS CID.

### 2. Verify CID accessibility
```
curl -s --max-time 10 -o /tmp/verify-content.json "https://ipfs.io/ipfs/<CID>"
```
Check:
- HTTP response is 200
- File is non-empty (size > 100 bytes)
- If timeout: retry once with `https://gateway.pinata.cloud/ipfs/<CID>`

### 3. Parse and validate content
```
cat /tmp/verify-content.json | python3 -c "import json,sys; d=json.load(sys.stdin); print(json.dumps(d, indent=2))"
```

**Validation rules by taskType:**

`market_research`:
- executive_summary: string, non-empty
- confidence_score: number between 0.0-1.0, must be > 0.3
- generated_at: ISO8601, must be within last 2 hours
- key_tokens: array (can be empty)

`onchain_intelligence`:
- executive_summary: string, non-empty
- smart_money_signal: one of bullish|bearish|neutral
- confidence_score: number > 0.3
- generated_at: ISO8601 within last 2 hours

`backtest`:
- total_return_pct: number
- win_rate_pct: number
- total_trades: number > 0
- generated_at: ISO8601

`daily_pnl`:
- total_pnl_usdt: number
- total_trades: number
- win_rate_pct: number

### 4. Submit arbitration decision

If ALL checks pass:
```
alkahest --private-key $VERIFIER_PRIVATE_KEY arbiter arbitrate \
  --obligation <fulfillmentUid> \
  --demand <demandHex> \
  --decision true
```

If ANY check fails:
```
alkahest --private-key $VERIFIER_PRIVATE_KEY arbiter arbitrate \
  --obligation <fulfillmentUid> \
  --demand <demandHex> \
  --decision false
```

### 5. Log decision
Append to verifier/decisions.json:
```json
{
  "fulfillmentUid": "<uid>",
  "escrowUid": "<uid>",
  "cid": "<cid>",
  "decision": true,
  "reason": "<reason>",
  "timestamp": "<ISO8601>"
}
```

### 6. Report result
Send to Coordinator: "VERIFICATION <APPROVED|REJECTED>: fulfillmentUid=<uid> | Reason: <reason>"

## Clean up
```
rm -f /tmp/verify-content.json
```

## Notes

- Decision is final and on-chain — be thorough before submitting
- If alkahest CLI is unavailable, hold decision and alert Coordinator
- Parse dates carefully — use UTC for comparison

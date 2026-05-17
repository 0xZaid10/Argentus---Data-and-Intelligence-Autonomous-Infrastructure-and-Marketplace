tasks:
- name: pending-validations-check
  interval: 5m
  prompt: |
    Read verifier/pending.json if it exists.
    For each pending validation request older than 10 minutes:
    - Re-attempt the validation workflow (fetch CID, validate, arbitrate)
    - If successful, remove from pending.json
    - If still failing, alert Coordinator: "Validation stuck for fulfillmentUid: <uid>. Reason: <reason>"
    If no pending validations, return HEARTBEAT_OK

- name: arbitration-health-check
  interval: 1h
  prompt: |
    Check last 10 arbitration decisions in verifier/decisions.json
    Calculate approval_rate.
    If approval_rate < 0.3 (less than 30% approved), alert Coordinator:
    "Warning: High rejection rate detected. Last 10 decisions: <approved>/<total> approved. May indicate worker quality issues."
    Otherwise return HEARTBEAT_OK

# Verifier is mostly on-demand (triggered by worker completions)
# Heartbeat handles stuck validations and health monitoring

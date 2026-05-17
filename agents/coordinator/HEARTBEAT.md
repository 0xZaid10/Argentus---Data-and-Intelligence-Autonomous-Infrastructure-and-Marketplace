tasks:
- name: task-queue-monitor
  interval: 5m
  prompt: |
    Read tasks/queue.json. For each task with status IN_PROGRESS:
    - Check if worker has been assigned for more than 30 minutes without a result CID
    - If stalled: send Telegram alert "Task <taskId> appears stalled. Worker: <workerAgent>. Time elapsed: <minutes>m"
    - If all tasks are progressing normally, return HEARTBEAT_OK

- name: escrow-tracker
  interval: 10m
  prompt: |
    Read tasks/queue.json. For each task with status VERIFYING:
    - Check if Verifier has been notified (verifierNotifiedAt field exists)
    - If Verifier notified > 20 minutes ago with no resolution, re-notify Verifier
    - If all verifications are in progress, return HEARTBEAT_OK

- name: agent-health
  interval: 30m
  prompt: |
    Check status of Research, Trading, and Verifier agents via agentToAgent ping.
    If any agent is unresponsive, send Telegram alert: "Agent <name> is unresponsive"
    If all agents healthy, return HEARTBEAT_OK

# Keep Telegram alerts under 300 chars. Return HEARTBEAT_OK if nothing needs attention.

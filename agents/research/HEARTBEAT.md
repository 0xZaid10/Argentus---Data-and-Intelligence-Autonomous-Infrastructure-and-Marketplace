tasks:
- name: active-task-check
  interval: 10m
  prompt: |
    Read memory/active-tasks.json if it exists.
    If any task has been in progress for more than 20 minutes, alert Coordinator via agentToAgent.
    Message: "Research task <taskId> taking longer than expected. Status: in progress."
    If no active tasks or all within time, return HEARTBEAT_OK

# Research agent is mostly on-demand. Heartbeat is lightweight.
# Return HEARTBEAT_OK if nothing to report.

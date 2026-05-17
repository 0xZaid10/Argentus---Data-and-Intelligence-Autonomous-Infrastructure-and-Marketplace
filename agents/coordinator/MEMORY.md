# Coordinator Memory

## Active Escrow Registry
<!-- Updated automatically as tasks are created and settled -->
<!-- Format: taskId | escrowUid | workerAgent | status | createdAt -->

## Agent Roster
- Research Agent: handles market research and onchain intelligence tasks
- Trading Agent: handles paper trading, backtesting, strategy analysis
- Verifier Agent: validates all deliverables and arbitrates escrow settlement

## System Configuration
- Task queue file: tasks/queue.json
- Deliverable storage: IPFS via Filecoin Pin (CIDs logged per task)
- Escrow chain: Base Sepolia (testnet) / Ethereum Mainnet (production)
- Telegram: coordinator-bot handles inbound commands

## Known User Preferences
<!-- Populated from interactions -->

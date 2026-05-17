// Argentus — Alkahest Escrow Service
// Handles full escrow lifecycle: create → fulfill → verify → settle
// Chain: Base Sepolia (testnet) for Arkhai bounty
// All agents call this service via the backend API

import { createWalletClient, http, parseUnits, encodeAbiParameters, parseAbiParameters } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { baseSepolia } from 'viem/chains'
import { makeClient } from '@alkahest/ts-sdk'

// ── Contract addresses (Base Sepolia) ─────────────────────────────────────────
const CONTRACTS = {
  trustedOracleArbiter: '0x3664b11BcCCeCA27C21BBAB43548961eD14d4D6D',
  erc20EscrowObligation: '0x1Fe964348Ec42D9Bb1A072503ce8b4744266FF43',
  stringObligation: '0x544873C22A3228798F91a71C4ef7a9bFe96E7CE0',
  trivialArbiter: '0x50EDa6c29C740bfbA6875422287025D985b96b7b',
}

// ── Token addresses (Base Sepolia testnet USDC) ───────────────────────────────
const USDC_BASE_SEPOLIA = '0x036CbD53842c5426634e7929541eC2318f3dCF7e'

// ── RPC ───────────────────────────────────────────────────────────────────────
const RPC_URL = process.env.BASE_SEPOLIA_RPC || 'https://sepolia.base.org'

// ── Make a client for a given private key ────────────────────────────────────
function makeAlkahestClient(privateKey: string) {
  const account = privateKeyToAccount(privateKey as `0x${string}`)
  const walletClient = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(RPC_URL),
  })
  return { client: makeClient(walletClient), account }
}

// ── Create escrow ─────────────────────────────────────────────────────────────
// Called when user submits a task with payment
export async function createEscrow({
  userPrivateKey,
  verifierAddress,
  amountUsdc,
  taskDescription,
  expiryHours = 24,
}: {
  userPrivateKey: string
  verifierAddress: string
  amountUsdc: number
  taskDescription: string
  expiryHours?: number
}) {
  const { client } = makeAlkahestClient(userPrivateKey)

  // Encode demand: verifier agent is the trusted oracle
  const demand = client.arbiters.general.trustedOracle.encodeDemand({
    oracle: verifierAddress as `0x${string}`,
    data: encodeAbiParameters(
      parseAbiParameters('string'),
      [taskDescription]
    ),
  })

  const expiry = BigInt(Math.floor(Date.now() / 1000) + expiryHours * 3600)
  const amount = parseUnits(amountUsdc.toString(), 6) // USDC = 6 decimals

  const { attested: escrow } = await client.erc20.escrow.nonTierable.approveAndCreate(
    { address: USDC_BASE_SEPOLIA as `0x${string}`, value: amount },
    { arbiter: CONTRACTS.trustedOracleArbiter as `0x${string}`, demand },
    expiry,
  )

  return {
    escrowUid: escrow.uid,
    arbiter: CONTRACTS.trustedOracleArbiter,
    demand: demand,
    expiry: expiry.toString(),
    amount: amountUsdc,
    token: USDC_BASE_SEPOLIA,
  }
}

// ── Submit fulfillment (worker agent submits CID) ─────────────────────────────
export async function submitFulfillment({
  workerPrivateKey,
  escrowUid,
  ipfsCid,
}: {
  workerPrivateKey: string
  escrowUid: string
  ipfsCid: string
}) {
  const { client } = makeAlkahestClient(workerPrivateKey)

  const { attested: fulfillment } = await client.stringObligation.doObligation(
    ipfsCid,
    undefined,
    escrowUid as `0x${string}`,
  )

  return {
    fulfillmentUid: fulfillment.uid,
    cid: ipfsCid,
    escrowUid,
  }
}

// ── Arbitrate (verifier agent approves or rejects) ────────────────────────────
export async function arbitrateFulfillment({
  verifierPrivateKey,
  fulfillmentUid,
  decision,
  demandHex,
}: {
  verifierPrivateKey: string
  fulfillmentUid: string
  decision: boolean
  demandHex: string
}) {
  const { client } = makeAlkahestClient(verifierPrivateKey)

  await client.arbiters.general.trustedOracle.arbitrate(
    fulfillmentUid as `0x${string}`,
    decision,
  )

  return {
    fulfillmentUid,
    decision,
    arbitratedAt: new Date().toISOString(),
  }
}

// ── Collect payment (worker collects after approval) ──────────────────────────
export async function collectPayment({
  workerPrivateKey,
  escrowUid,
  fulfillmentUid,
}: {
  workerPrivateKey: string
  escrowUid: string
  fulfillmentUid: string
}) {
  const { client } = makeAlkahestClient(workerPrivateKey)

  const result = await client.erc20.escrow.nonTierable.collectObligation(
    escrowUid as `0x${string}`,
    fulfillmentUid as `0x${string}`,
  )

  return {
    txHash: result.hash,
    escrowUid,
    fulfillmentUid,
    collectedAt: new Date().toISOString(),
  }
}

// ── Reclaim expired escrow (user gets refund) ─────────────────────────────────
export async function reclaimEscrow({
  userPrivateKey,
  escrowUid,
}: {
  userPrivateKey: string
  escrowUid: string
}) {
  const { client } = makeAlkahestClient(userPrivateKey)

  const result = await client.erc20.escrow.nonTierable.reclaimExpired(
    escrowUid as `0x${string}`,
  )

  return {
    txHash: result.hash,
    escrowUid,
    reclaimedAt: new Date().toISOString(),
  }
}

// ── Get escrow status ─────────────────────────────────────────────────────────
export async function getEscrowStatus(escrowUid: string) {
  // Use alkahest CLI for read-only queries
  const { execSync } = await import('child_process')
  try {
    const output = execSync(
      `alkahest attestation get --uid ${escrowUid} --chain base-sepolia`,
      { encoding: 'utf8' }
    )
    return JSON.parse(output)
  } catch {
    return { uid: escrowUid, status: 'unknown' }
  }
}

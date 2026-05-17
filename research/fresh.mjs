// fresh-escrow-test.mjs
// Complete escrow lifecycle test from scratch
// Uses viem directly - no CLI

import { createWalletClient, createPublicClient, http, parseAbi, encodeAbiParameters, parseAbiParameters, parseUnits } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { baseSepolia } from 'viem/chains'

// Wallets
const USER_KEY = '0xfd6ab7612897eaa8e81806784be70d9ee6d981c57d5a59e742d389360fba7d09'
const WORKER_KEY = '0x3aad34127d72edb1bb38d53c9d573444580cdb2087428fa3ef66380f872e7404'
const VERIFIER_KEY = '0x66fbad8e072eded892505f4d5ecb8694c0e21c530d474b8c2990c28d9932b6a9'

// Contracts
const USDC = '0x036CbD53842c5426634e7929541eC2318f3dCF7e'
const ERC20_ESCROW = '0x1Fe964348Ec42D9Bb1A072503ce8b4744266FF43'
const STRING_OBLIGATION = '0x544873C22A3228798F91a71C4ef7a9bFe96E7CE0'
const TRUSTED_ORACLE_ARBITER = '0x3664b11BcCCeCA27C21BBAB43548961eD14d4D6D'

const userAccount = privateKeyToAccount(USER_KEY)
const workerAccount = privateKeyToAccount(WORKER_KEY)
const verifierAccount = privateKeyToAccount(VERIFIER_KEY)

const transport = http('https://sepolia.base.org')
const userClient = createWalletClient({ account: userAccount, chain: baseSepolia, transport })
const workerClient = createWalletClient({ account: workerAccount, chain: baseSepolia, transport })
const verifierClient = createWalletClient({ account: verifierAccount, chain: baseSepolia, transport })
const publicClient = createPublicClient({ chain: baseSepolia, transport })

const erc20Abi = parseAbi([
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
])

const escrowAbi = parseAbi([
  'function doObligation((address arbiter, bytes demand, address token, uint256 amount) data, uint64 expiration) returns (bytes32)',
  'function collectEscrow(bytes32 escrow, bytes32 fulfillment) returns (bool)',
  'error InvalidEscrow()',
  'error InvalidFulfillment()',
])

const stringAbi = parseAbi([
  'function doObligation(string item, bytes32 schema, bytes32 ref) returns (bytes32)',
])

const arbiterAbi = parseAbi([
  'function arbitrate(bytes32 fulfillment, bool decision) external',
])

async function waitFor(hash) {
  const receipt = await publicClient.waitForTransactionReceipt({ hash })
  console.log('  Block:', receipt.blockNumber.toString(), '| Status:', receipt.status)
  return receipt
}

async function main() {
  console.log('=== Fresh Escrow Test ===')
  console.log('User:    ', userAccount.address)
  console.log('Worker:  ', workerAccount.address)
  console.log('Verifier:', verifierAccount.address)

  const balance = await publicClient.readContract({ address: USDC, abi: erc20Abi, functionName: 'balanceOf', args: [userAccount.address] })
  console.log('User USDC balance:', Number(balance) / 1e6)

  // ── Step 1: Encode demand ─────────────────────────────────────────────────
  console.log('\n[1] Encoding demand...')
  const demand = encodeAbiParameters(
    parseAbiParameters('(address oracle, bytes data)'),
    [{ oracle: verifierAccount.address, data: '0x' }]
  )
  console.log('  Demand encoded:', demand.slice(0, 20), '...')

  // ── Step 2: Approve USDC ──────────────────────────────────────────────────
  console.log('\n[2] Approving USDC...')
  const approveHash = await userClient.writeContract({
    address: USDC,
    abi: erc20Abi,
    functionName: 'approve',
    args: [ERC20_ESCROW, parseUnits('2', 6)],
  })
  await waitFor(approveHash)

  // ── Step 3: Create escrow ─────────────────────────────────────────────────
  console.log('\n[3] Creating escrow...')
  const expiry = BigInt(Math.floor(Date.now() / 1000) + 86400)
  const escrowHash = await userClient.writeContract({
    address: ERC20_ESCROW,
    abi: escrowAbi,
    functionName: 'doObligation',
    args: [
      { arbiter: TRUSTED_ORACLE_ARBITER, demand, token: USDC, amount: parseUnits('1', 6) },
      expiry,
    ],
  })
  const escrowReceipt = await waitFor(escrowHash)

  // Get escrow UID from logs
  const escrowUID = escrowReceipt.logs[escrowReceipt.logs.length - 1]?.topics[1]
  console.log('  Escrow UID:', escrowUID)

  if (!escrowUID) { console.log('❌ Could not get escrow UID'); return }

  // ── Step 4: Worker submits CID as StringObligation ────────────────────────
  console.log('\n[4] Worker submitting fulfillment...')
  const cid = 'bafybeifrhktxnyrciokho6pm6fc3yfde374tmjy4t7kyxiuwb2cqm64odm'
  const fulfillHash = await workerClient.writeContract({
    address: STRING_OBLIGATION,
    abi: stringAbi,
    functionName: 'doObligation',
    args: [cid, '0x0000000000000000000000000000000000000000000000000000000000000000', escrowUID],
  })
  const fulfillReceipt = await waitFor(fulfillHash)

  const fulfillUID = fulfillReceipt.logs[fulfillReceipt.logs.length - 1]?.topics[1]
  console.log('  Fulfillment UID:', fulfillUID)

  if (!fulfillUID) { console.log('❌ Could not get fulfillment UID'); return }

  // ── Step 5: Verifier arbitrates ───────────────────────────────────────────
  console.log('\n[5] Verifier arbitrating...')
  const arbHash = await verifierClient.writeContract({
    address: TRUSTED_ORACLE_ARBITER,
    abi: arbiterAbi,
    functionName: 'arbitrate',
    args: [fulfillUID, true],
  })
  await waitFor(arbHash)
  console.log('  ✅ Arbitration recorded')

  // ── Step 6: Worker collects ───────────────────────────────────────────────
  console.log('\n[6] Worker collecting payment...')
  try {
    const { request } = await publicClient.simulateContract({
      address: ERC20_ESCROW,
      abi: escrowAbi,
      functionName: 'collectEscrow',
      args: [escrowUID, fulfillUID],
      account: workerAccount.address,
    })
    const collectHash = await workerClient.writeContract(request)
    await waitFor(collectHash)

    const workerBal = await publicClient.readContract({ address: USDC, abi: erc20Abi, functionName: 'balanceOf', args: [workerAccount.address] })
    console.log('  ✅ Worker USDC balance:', Number(workerBal) / 1e6)
    console.log('\n🎉 Full escrow lifecycle complete!')
  } catch (err) {
    console.log('  ❌ Collect failed:', err.shortMessage || err.message)
    if (err.cause?.data) console.log('  Error:', err.cause.data)
  }
}

main().catch(console.error)

// arbitrate-and-collect.mjs
// Re-runs arbitration with correct function signature then collects
import { createWalletClient, createPublicClient, http, parseAbi } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { baseSepolia } from 'viem/chains'

const VERIFIER_PRIVATE_KEY = '0x66fbad8e072eded892505f4d5ecb8694c0e21c530d474b8c2990c28d9932b6a9'
const WORKER_PRIVATE_KEY = '0x3aad34127d72edb1bb38d53c9d573444580cdb2087428fa3ef66380f872e7404'
const ESCROW_UID = '0x00c8de145e914a093b611b9a454b599bb77c04372ca695aa7e8ddef0a8ce90d5'
const FULFILLMENT_UID = '0x01786ea2ab1ed20b705d7bc2f5c6b25902c8bf9caee3fe95df78db8864eaf7ed'
const TRUSTED_ORACLE_ARBITER = '0x3664b11BcCCeCA27C21BBAB43548961eD14d4D6D'
const ERC20_ESCROW_OBLIGATION = '0x1Fe964348Ec42D9Bb1A072503ce8b4744266FF43'

const verifierAccount = privateKeyToAccount(VERIFIER_PRIVATE_KEY)
const workerAccount = privateKeyToAccount(WORKER_PRIVATE_KEY)

const verifierClient = createWalletClient({ account: verifierAccount, chain: baseSepolia, transport: http('https://sepolia.base.org') })
const workerClient = createWalletClient({ account: workerAccount, chain: baseSepolia, transport: http('https://sepolia.base.org') })
const publicClient = createPublicClient({ chain: baseSepolia, transport: http('https://sepolia.base.org') })

const arbiterAbi = parseAbi([
  'function arbitrate(bytes32 fulfillment, bool decision) external',
])

const escrowAbi = parseAbi([
  'function collectEscrow(bytes32 escrow, bytes32 fulfillment) returns (bool)',
  'error InvalidEscrow()',
  'error InvalidFulfillment()',
  'error EscrowExpired()',
])

async function main() {
  // Step 1: Re-run arbitrate with correct arg order (fulfillment, decision)
  console.log('Step 1: Re-arbitrating...')
  console.log('Verifier:', verifierAccount.address)

  try {
    const hash = await verifierClient.writeContract({
      address: TRUSTED_ORACLE_ARBITER,
      abi: arbiterAbi,
      functionName: 'arbitrate',
      args: [FULFILLMENT_UID, true],
    })
    console.log('Arbitrate tx:', hash)
    const receipt = await publicClient.waitForTransactionReceipt({ hash })
    console.log('✅ Arbitrated! Block:', receipt.blockNumber.toString())
  } catch (err) {
    console.log('Arbitrate error:', err.shortMessage || err.message)
    console.log('(May already be arbitrated — continuing to collect)')
  }

  // Step 2: Collect
  console.log('\nStep 2: Collecting escrow...')
  console.log('Worker:', workerAccount.address)

  try {
    const { request } = await publicClient.simulateContract({
      address: ERC20_ESCROW_OBLIGATION,
      abi: escrowAbi,
      functionName: 'collectEscrow',
      args: [ESCROW_UID, FULFILLMENT_UID],
      account: workerAccount.address,
    })
    console.log('✅ Simulation passed')

    const hash = await workerClient.writeContract(request)
    console.log('Collect tx:', hash)
    const receipt = await publicClient.waitForTransactionReceipt({ hash })
    console.log('✅ Payment collected! Block:', receipt.blockNumber.toString())
  } catch (err) {
    console.log('❌ Collect failed:', err.shortMessage || err.message)
    if (err.cause?.data) {
      console.log('Error data:', err.cause.data)
    }
  }
}

main().catch(console.error)

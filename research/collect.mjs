// collect-escrow.mjs
import { createWalletClient, createPublicClient, http, parseAbi } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { baseSepolia } from 'viem/chains'

const WORKER_PRIVATE_KEY = '0x3aad34127d72edb1bb38d53c9d573444580cdb2087428fa3ef66380f872e7404'
const ESCROW_UID = '0x00c8de145e914a093b611b9a454b599bb77c04372ca695aa7e8ddef0a8ce90d5'
const FULFILLMENT_UID = '0x01786ea2ab1ed20b705d7bc2f5c6b25902c8bf9caee3fe95df78db8864eaf7ed'
const ERC20_ESCROW_OBLIGATION = '0x1Fe964348Ec42D9Bb1A072503ce8b4744266FF43'
const TRUSTED_ORACLE_ARBITER = '0x3664b11BcCCeCA27C21BBAB43548961eD14d4D6D'

const account = privateKeyToAccount(WORKER_PRIVATE_KEY)
const walletClient = createWalletClient({ account, chain: baseSepolia, transport: http('https://sepolia.base.org') })
const publicClient = createPublicClient({ chain: baseSepolia, transport: http('https://sepolia.base.org') })

const escrowAbi = parseAbi([
  'function collectEscrow(bytes32 escrow, bytes32 fulfillment) returns (bool)',
  'error InvalidEscrow()',
  'error InvalidFulfillment()',
  'error InvalidArbiter()',
  'error EscrowExpired()',
  'error ERC20TransferFailed(address token, address from, address to, uint256 amount)',
])

const oracleAbi = parseAbi([
  'function arbitrations(bytes32 fulfillmentUid) view returns (bool decision, bool arbitrated)',
])

async function main() {
  console.log('Worker:', account.address)

  // Check arbitration status
  try {
    const arb = await publicClient.readContract({
      address: TRUSTED_ORACLE_ARBITER,
      abi: oracleAbi,
      functionName: 'arbitrations',
      args: [FULFILLMENT_UID],
    })
    console.log('Arbitrated:', arb.arbitrated, '| Decision:', arb.decision)
    if (!arb.arbitrated) { console.log('❌ Not arbitrated yet'); return }
    if (!arb.decision) { console.log('❌ Rejected'); return }
    console.log('✅ Approved — collecting...')
  } catch (err) {
    console.log('Could not check arbitration:', err.message)
  }

  // Simulate
  try {
    await publicClient.simulateContract({
      address: ERC20_ESCROW_OBLIGATION,
      abi: escrowAbi,
      functionName: 'collectEscrow',
      args: [ESCROW_UID, FULFILLMENT_UID],
      account: account.address,
    })
  } catch (err) {
    console.log('❌ Simulate failed:', err.shortMessage || err.message)
    return
  }

  const hash = await walletClient.writeContract({
    address: ERC20_ESCROW_OBLIGATION,
    abi: escrowAbi,
    functionName: 'collectEscrow',
    args: [ESCROW_UID, FULFILLMENT_UID],
  })

  console.log('Tx:', hash)
  const receipt = await publicClient.waitForTransactionReceipt({ hash })
  console.log('✅ Collected! Block:', receipt.blockNumber.toString())
}

main().catch(console.error)

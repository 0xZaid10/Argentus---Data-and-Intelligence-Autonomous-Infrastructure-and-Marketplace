// check-arbiter.mjs
// Check if arbitration was recorded by reading contract storage/events
import { createPublicClient, http, parseAbi, parseAbiItem } from 'viem'
import { baseSepolia } from 'viem/chains'

const TRUSTED_ORACLE_ARBITER = '0x3664b11BcCCeCA27C21BBAB43548961eD14d4D6D'
const FULFILLMENT_UID = '0x01786ea2ab1ed20b705d7bc2f5c6b25902c8bf9caee3fe95df78db8864eaf7ed'
const ESCROW_UID = '0x00c8de145e914a093b611b9a454b599bb77c04372ca695aa7e8ddef0a8ce90d5'

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http('https://sepolia.base.org'),
})

// Try different function signatures the arbiter might have
const arbiterAbi = parseAbi([
  'function arbitrate(bytes32 fulfillment, bool decision) external',
  'function getArbitration(bytes32 fulfillmentUid) view returns (bool decision, bool arbitrated)',
  'function decisions(bytes32 fulfillmentUid) view returns (bool)',
  'function checkStatement(address obligation, bytes calldata statement, bytes calldata demand) view returns (bool)',
])

async function main() {
  console.log('Checking TrustedOracleArbiter:', TRUSTED_ORACLE_ARBITER)
  console.log('Fulfillment UID:', FULFILLMENT_UID)
  console.log()

  // Try getArbitration
  try {
    const result = await publicClient.readContract({
      address: TRUSTED_ORACLE_ARBITER,
      abi: arbiterAbi,
      functionName: 'getArbitration',
      args: [FULFILLMENT_UID],
    })
    console.log('getArbitration:', result)
  } catch (e) {
    console.log('getArbitration failed:', e.shortMessage)
  }

  // Try decisions mapping
  try {
    const result = await publicClient.readContract({
      address: TRUSTED_ORACLE_ARBITER,
      abi: arbiterAbi,
      functionName: 'decisions',
      args: [FULFILLMENT_UID],
    })
    console.log('decisions:', result)
  } catch (e) {
    console.log('decisions failed:', e.shortMessage)
  }

  // Check past ArbitrationMade events
  console.log('\nChecking for ArbitrationMade events...')
  try {
    const logs = await publicClient.getLogs({
      address: TRUSTED_ORACLE_ARBITER,
      fromBlock: 41560000n,
      toBlock: 'latest',
    })
    console.log('Total events from arbiter:', logs.length)
    logs.forEach(log => {
      console.log('Event topic:', log.topics[0])
      console.log('Data:', log.data)
    })
  } catch (e) {
    console.log('getLogs failed:', e.message)
  }
}

main().catch(console.error)


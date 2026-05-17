import { createWalletClient, createPublicClient, http, parseAbi } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { baseSepolia } from 'viem/chains'

const WORKER_PRIVATE_KEY = '0x3aad34127d72edb1bb38d53c9d573444580cdb2087428fa3ef66380f872e7404'
const ESCROW_UID = '0xa99f78224cb339cc3940833adbf701b7087f4f063172d99a148d099fc62d1454'
const FULFILLMENT_UID = '0x5f05c7614aabb2b9bb4331fa451fa2eeff68e7209561b5dd929aa6a1a6b303ff'
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

  try {
    const arb = await publicClient.readContract({
      address: TRUSTED_ORACLE_ARBITER,
      abi: oracleAbi,
      functionName: 'arbitrations',
      args: [FULFILLMENT_UID],
    })
    console.log('Arbitrated:', arb.arbitrated, '| Decision:', arb.decision)
    if (!arb.arbitrated) { console.log('NOT_ARBITRATED'); return }
    if (!arb.decision) { console.log('REJECTED'); return }
    console.log('APPROVED — collecting...')
  } catch (err) {
    console.log('arb_check_err:', err.message)
  }

  try {
    await publicClient.simulateContract({
      address: ERC20_ESCROW_OBLIGATION,
      abi: escrowAbi,
      functionName: 'collectEscrow',
      args: [ESCROW_UID, FULFILLMENT_UID],
      account: account.address,
    })
    console.log('SIMULATE_OK')
  } catch (err) {
    console.log('SIMULATE_FAIL:', err.shortMessage || err.message)
    return
  }

  const hash = await walletClient.writeContract({
    address: ERC20_ESCROW_OBLIGATION,
    abi: escrowAbi,
    functionName: 'collectEscrow',
    args: [ESCROW_UID, FULFILLMENT_UID],
  })
  console.log('TX:', hash)
  const receipt = await publicClient.waitForTransactionReceipt({ hash })
  console.log('BLOCK:', receipt.blockNumber.toString(), 'STATUS:', receipt.status)
  console.log('BASESCAN: https://sepolia.basescan.org/tx/' + hash)
}

main().catch((e) => { console.error('FATAL:', e); process.exit(1) })

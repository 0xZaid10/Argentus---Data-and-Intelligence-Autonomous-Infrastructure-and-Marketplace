// fresh-escrow-test.mjs - Fixed log parsing
import { createWalletClient, createPublicClient, http, parseAbi, parseAbiItem, encodeAbiParameters, parseAbiParameters, parseUnits, keccak256, encodePacked, decodeEventLog } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { baseSepolia } from 'viem/chains'

const USER_KEY =     '0xfd6ab7612897eaa8e81806784be70d9ee6d981c57d5a59e742d389360fba7d09'
const WORKER_KEY =   '0x3aad34127d72edb1bb38d53c9d573444580cdb2087428fa3ef66380f872e7404'
const VERIFIER_KEY = '0x66fbad8e072eded892505f4d5ecb8694c0e21c530d474b8c2990c28d9932b6a9'

const USDC =                   '0x036CbD53842c5426634e7929541eC2318f3dCF7e'
const ERC20_ESCROW =           '0x1Fe964348Ec42D9Bb1A072503ce8b4744266FF43'
const STRING_OBLIGATION =      '0x544873C22A3228798F91a71C4ef7a9bFe96E7CE0'
const TRUSTED_ORACLE_ARBITER = '0x3664b11BcCCeCA27C21BBAB43548961eD14d4D6D'
const EAS =                    '0x4200000000000000000000000000000000000021'

const userAccount =     privateKeyToAccount(USER_KEY)
const workerAccount =   privateKeyToAccount(WORKER_KEY)
const verifierAccount = privateKeyToAccount(VERIFIER_KEY)

const t = http('https://sepolia.base.org')
const userClient =     createWalletClient({ account: userAccount,     chain: baseSepolia, transport: t })
const workerClient =   createWalletClient({ account: workerAccount,   chain: baseSepolia, transport: t })
const verifierClient = createWalletClient({ account: verifierAccount, chain: baseSepolia, transport: t })
const publicClient =   createPublicClient({ chain: baseSepolia, transport: t })

const erc20Abi = parseAbi(['function approve(address,uint256) returns (bool)', 'function balanceOf(address) view returns (uint256)'])
const escrowAbi = parseAbi([
  'function doObligation((address arbiter, bytes demand, address token, uint256 amount) data, uint64 expiration) returns (bytes32)',
  'function collectEscrow(bytes32 escrow, bytes32 fulfillment) returns (bool)',
  'error InvalidEscrow()', 'error InvalidFulfillment()',
])
const stringAbi = parseAbi([
  'function doObligation((string item, bytes32 schema) data, bytes32 refUID) returns (bytes32)',
])
const arbiterAbi = parseAbi([
  'function arbitrate(bytes32 obligation, bytes demand, bool decision) external',
])

// EAS Attested event — this is what emits the real UID
const ATTESTED_EVENT = parseAbiItem('event Attested(address indexed recipient, address indexed attester, bytes32 uid, bytes32 indexed schema)')

async function waitFor(hash) {
  const r = await publicClient.waitForTransactionReceipt({ hash })
  console.log('  Block:', r.blockNumber.toString(), '| Status:', r.status)
  return r
}

// Extract UID from EAS Attested event in receipt logs
function extractUID(receipt) {
  for (const log of receipt.logs) {
    if (log.address.toLowerCase() === EAS.toLowerCase()) {
      try {
        const decoded = decodeEventLog({ abi: [ATTESTED_EVENT], data: log.data, topics: log.topics })
        if (decoded.eventName === 'Attested') return decoded.args.uid
      } catch {}
    }
  }
  // fallback: find any 32-byte topic that looks like a UID
  for (const log of receipt.logs) {
    for (const topic of log.topics.slice(1)) {
      if (topic && topic !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
        // not an address (addresses are padded with 12 zero bytes)
        const isAddress = topic.startsWith('0x000000000000000000000000')
        if (!isAddress) return topic
      }
    }
  }
  return null
}

async function main() {
  console.log('=== Fresh Escrow Test ===')

  const ORACLE_DATA = '0x'
  const demand = encodeAbiParameters(
    parseAbiParameters('(address oracle, bytes data)'),
    [{ oracle: verifierAccount.address, data: ORACLE_DATA }]
  )

  // Approve
  console.log('[1] Approving USDC...')
  await waitFor(await userClient.writeContract({ address: USDC, abi: erc20Abi, functionName: 'approve', args: [ERC20_ESCROW, parseUnits('2', 6)] }))

  // Create escrow
  console.log('[2] Creating escrow...')
  const escrowReceipt = await waitFor(await userClient.writeContract({
    address: ERC20_ESCROW, abi: escrowAbi,
    functionName: 'doObligation',
    args: [{ arbiter: TRUSTED_ORACLE_ARBITER, demand, token: USDC, amount: parseUnits('1', 6) }, BigInt(Math.floor(Date.now()/1000) + 86400)],
  }))
  const escrowUID = extractUID(escrowReceipt)
  console.log('  Escrow UID:', escrowUID)
  if (!escrowUID) { console.log('❌ No escrow UID\nLogs:', escrowReceipt.logs); return }

  // Submit fulfillment
  console.log('[3] Submitting CID as fulfillment...')
  const cid = 'bafybeifrhktxnyrciokho6pm6fc3yfde374tmjy4t7kyxiuwb2cqm64odm'
  const fulfillReceipt = await waitFor(await workerClient.writeContract({
    address: STRING_OBLIGATION, abi: stringAbi,
    functionName: 'doObligation',
    args: [{ item: cid, schema: '0x0000000000000000000000000000000000000000000000000000000000000000' }, escrowUID],
  }))
  const fulfillUID = extractUID(fulfillReceipt)
  console.log('  Fulfillment UID:', fulfillUID)
  if (!fulfillUID) { console.log('❌ No fulfillment UID\nLogs:', fulfillReceipt.logs); return }

  // Arbitrate
  // checkObligation: decisionKey = keccak256(abi.encodePacked(obligation.uid, demand_.data))
  // obligation.uid = fulfillUID, demand_.data = ORACLE_DATA = '0x' (empty)
  // So we call arbitrate(fulfillUID, demand_bytes_with_empty_data, true)
  console.log('[4] Arbitrating...')
  const arbReceipt = await waitFor(await verifierClient.writeContract({
    address: TRUSTED_ORACLE_ARBITER, abi: arbiterAbi,
    functionName: 'arbitrate',
    args: [fulfillUID, ORACLE_DATA, true],  // must match demand_.data in checkObligation
  }))
  console.log('  Arbitration tx:', arbReceipt.transactionHash)

  // Collect
  console.log('[5] Collecting...')
  try {
    await waitFor(await workerClient.writeContract({
      address: ERC20_ESCROW, abi: escrowAbi,
      functionName: 'collectEscrow',
      args: [escrowUID, fulfillUID],
    }))
    const bal = await publicClient.readContract({ address: USDC, abi: erc20Abi, functionName: 'balanceOf', args: [workerAccount.address] })
    console.log('  ✅ Worker USDC:', Number(bal)/1e6)
    console.log('\n🎉 COMPLETE!')
  } catch (err) {
    console.log('  ❌', err.shortMessage || err.message)
    if (err.cause?.data) console.log('  Error:', JSON.stringify(err.cause.data))
  }
}

main().catch(console.error)

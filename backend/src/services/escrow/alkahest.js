// Argentus — Alkahest Escrow Service
// Correct ABIs verified against source and tested on Base Sepolia
// Lifecycle: create → fulfill → arbitrate → collect

import { createWalletClient, createPublicClient, http, parseUnits, encodeAbiParameters, decodeAbiParameters, decodeEventLog } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { baseSepolia } from 'viem/chains'

const CONTRACTS = {
  usdc:                 '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  erc20Escrow:          '0x1Fe964348Ec42D9Bb1A072503ce8b4744266FF43',
  stringObligation:     '0x544873C22A3228798F91a71C4ef7a9bFe96E7CE0',
  trustedOracleArbiter: '0x3664b11BcCCeCA27C21BBAB43548961eD14d4D6D',
  eas:                  '0x4200000000000000000000000000000000000021',
}

const getRPC = () => process.env.BASE_SEPOLIA_RPC || 'https://sepolia.base.org'

const erc20Abi = [
  { name: 'approve', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ type: 'bool' }] },
  { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256' }] },
]

const escrowAbi = [
  { name: 'doObligation', type: 'function', stateMutability: 'nonpayable',
    inputs: [{ name: 'data', type: 'tuple', components: [{ name: 'arbiter', type: 'address' }, { name: 'demand', type: 'bytes' }, { name: 'token', type: 'address' }, { name: 'amount', type: 'uint256' }] }, { name: 'expiration', type: 'uint64' }],
    outputs: [{ type: 'bytes32' }] },
  { name: 'collectEscrow', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'escrow', type: 'bytes32' }, { name: 'fulfillment', type: 'bytes32' }], outputs: [{ type: 'bool' }] },
  { name: 'reclaimExpired', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'uid', type: 'bytes32' }], outputs: [{ type: 'bool' }] },
]

const stringAbi = [
  { name: 'doObligation', type: 'function', stateMutability: 'nonpayable',
    inputs: [{ name: 'data', type: 'tuple', components: [{ name: 'item', type: 'string' }, { name: 'schema', type: 'bytes32' }] }, { name: 'refUID', type: 'bytes32' }],
    outputs: [{ type: 'bytes32' }] },
]

const arbiterAbi = [
  { name: 'arbitrate', type: 'function', stateMutability: 'nonpayable',
    inputs: [{ name: 'obligation', type: 'bytes32' }, { name: 'demand', type: 'bytes' }, { name: 'decision', type: 'bool' }],
    outputs: [] },
]

const easAbi = [
  { name: 'getAttestation', type: 'function', stateMutability: 'view',
    inputs: [{ name: 'uid', type: 'bytes32' }],
    outputs: [{ type: 'tuple', components: [{ name: 'uid', type: 'bytes32' }, { name: 'schema', type: 'bytes32' }, { name: 'time', type: 'uint64' }, { name: 'expirationTime', type: 'uint64' }, { name: 'revocationTime', type: 'uint64' }, { name: 'refUID', type: 'bytes32' }, { name: 'recipient', type: 'address' }, { name: 'attester', type: 'address' }, { name: 'revocable', type: 'bool' }, { name: 'data', type: 'bytes' }] }] },
]

const ATTESTED_EVENT = { name: 'Attested', type: 'event', inputs: [{ name: 'recipient', type: 'address', indexed: true }, { name: 'attester', type: 'address', indexed: true }, { name: 'uid', type: 'bytes32', indexed: false }, { name: 'schema', type: 'bytes32', indexed: true }] }

function makeClients(privateKey) {
  const account = privateKeyToAccount(privateKey)
  const transport = http(getRPC())
  return {
    account,
    wallet: createWalletClient({ account, chain: baseSepolia, transport }),
    public: createPublicClient({ chain: baseSepolia, transport }),
  }
}

function extractUID(receipt) {
  for (const log of receipt.logs) {
    if (log.address.toLowerCase() === CONTRACTS.eas.toLowerCase()) {
      try {
        const decoded = decodeEventLog({ abi: [ATTESTED_EVENT], data: log.data, topics: log.topics })
        if (decoded.eventName === 'Attested') return decoded.args.uid
      } catch {}
    }
  }
  return null
}

function encodeDemand(oracleAddress, innerData) {
  return encodeAbiParameters(
    [{ type: 'tuple', components: [{ name: 'oracle', type: 'address' }, { name: 'data', type: 'bytes' }] }],
    [{ oracle: oracleAddress, data: innerData || '0x' }]
  )
}

export async function createEscrow({ userPrivateKey, verifierAddress, amountUsdc = 1, expiryHours = 24 }) {
  const { wallet, public: pub } = makeClients(userPrivateKey)
  const amount = parseUnits(amountUsdc.toString(), 6)
  const demand = encodeDemand(verifierAddress)
  const expiry = BigInt(Math.floor(Date.now() / 1000) + expiryHours * 3600)

  const approveHash = await wallet.writeContract({ address: CONTRACTS.usdc, abi: erc20Abi, functionName: 'approve', args: [CONTRACTS.erc20Escrow, amount * 2n] })
  await pub.waitForTransactionReceipt({ hash: approveHash })

  const escrowHash = await wallet.writeContract({
    address: CONTRACTS.erc20Escrow, abi: escrowAbi, functionName: 'doObligation',
    args: [{ arbiter: CONTRACTS.trustedOracleArbiter, demand, token: CONTRACTS.usdc, amount }, expiry],
  })
  const receipt = await pub.waitForTransactionReceipt({ hash: escrowHash })
  const escrowUID = extractUID(receipt)
  if (!escrowUID) throw new Error('Could not extract escrow UID')

  return { escrowUID, txHash: escrowHash, demand, amount: amountUsdc }
}

export async function submitFulfillment({ workerPrivateKey, escrowUID, ipfsCid }) {
  const { wallet, public: pub } = makeClients(workerPrivateKey)
  const schema = '0x0000000000000000000000000000000000000000000000000000000000000000'

  const hash = await wallet.writeContract({
    address: CONTRACTS.stringObligation, abi: stringAbi, functionName: 'doObligation',
    args: [{ item: ipfsCid, schema }, escrowUID],
  })
  const receipt = await pub.waitForTransactionReceipt({ hash })
  const fulfillmentUID = extractUID(receipt)
  if (!fulfillmentUID) throw new Error('Could not extract fulfillment UID')

  return { fulfillmentUID, txHash: hash, cid: ipfsCid, escrowUID }
}

export async function arbitrateFulfillment({ verifierPrivateKey, fulfillmentUID, decision, innerData }) {
  const { wallet, public: pub } = makeClients(verifierPrivateKey)
  const hash = await wallet.writeContract({
    address: CONTRACTS.trustedOracleArbiter, abi: arbiterAbi, functionName: 'arbitrate',
    args: [fulfillmentUID, innerData || '0x', decision],
  })
  await pub.waitForTransactionReceipt({ hash })
  return { txHash: hash, fulfillmentUID, decision, arbitratedAt: new Date().toISOString() }
}

export async function collectPayment({ workerPrivateKey, escrowUID, fulfillmentUID }) {
  const { wallet, public: pub } = makeClients(workerPrivateKey)
  const hash = await wallet.writeContract({
    address: CONTRACTS.erc20Escrow, abi: escrowAbi, functionName: 'collectEscrow',
    args: [escrowUID, fulfillmentUID],
  })
  const receipt = await pub.waitForTransactionReceipt({ hash })
  return { txHash: hash, escrowUID, fulfillmentUID, collectedAt: new Date().toISOString(), status: receipt.status }
}

export async function reclaimEscrow({ userPrivateKey, escrowUID }) {
  const { wallet, public: pub } = makeClients(userPrivateKey)
  const hash = await wallet.writeContract({ address: CONTRACTS.erc20Escrow, abi: escrowAbi, functionName: 'reclaimExpired', args: [escrowUID] })
  await pub.waitForTransactionReceipt({ hash })
  return { txHash: hash, escrowUID, reclaimedAt: new Date().toISOString() }
}

export async function getEscrowStatus(escrowUID) {
  const pub = createPublicClient({ chain: baseSepolia, transport: http(getRPC()) })
  try {
    const att = await pub.readContract({ address: CONTRACTS.eas, abi: easAbi, functionName: 'getAttestation', args: [escrowUID] })
    const [d] = decodeAbiParameters([{ type: 'tuple', components: [{ name: 'arbiter', type: 'address' }, { name: 'demand', type: 'bytes' }, { name: 'token', type: 'address' }, { name: 'amount', type: 'uint256' }] }], att.data)
    return { uid: escrowUID, status: att.revocationTime > 0n ? 'collected' : 'active', amount: Number(d.amount) / 1e6, expiry: Number(att.expirationTime) }
  } catch {
    return { uid: escrowUID, status: 'unknown' }
  }
}

export { CONTRACTS }

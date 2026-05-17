import { createPublicClient, http, decodeAbiParameters, encodeAbiParameters, parseAbiParameters } from 'viem'
import { baseSepolia } from 'viem/chains'

const ESCROW_UID =      '0x9474dc0c9e472b4e9c2fa5e1255ab2bd6a9115da11daba21761c514e4952e20d'
const FULFILLMENT_UID = '0xd044ab7621e24ad1e1ef578fcb22e5b208deda5a64d1beb4f00f5556f0a71ea9'
const VERIFIER =        '0x50a4813f94A4342b3A0712870626f3d043BEb2b6'
const TRUSTED_ORACLE =  '0x3664b11BcCCeCA27C21BBAB43548961eD14d4D6D'
const EAS =             '0x4200000000000000000000000000000000000021'
const ERC20_ESCROW =    '0x1Fe964348Ec42D9Bb1A072503ce8b4744266FF43'
const WORKER =          '0x282bfBC497Ff777D11fa732e44D8ddC5DB92060E'

const publicClient = createPublicClient({ chain: baseSepolia, transport: http('https://sepolia.base.org') })

const easAbi = [{
  name: 'getAttestation', type: 'function', stateMutability: 'view',
  inputs: [{ name: 'uid', type: 'bytes32' }],
  outputs: [{ type: 'tuple', components: [
    { name: 'uid', type: 'bytes32' }, { name: 'schema', type: 'bytes32' },
    { name: 'time', type: 'uint64' }, { name: 'expirationTime', type: 'uint64' },
    { name: 'revocationTime', type: 'uint64' }, { name: 'refUID', type: 'bytes32' },
    { name: 'recipient', type: 'address' }, { name: 'attester', type: 'address' },
    { name: 'revocable', type: 'bool' }, { name: 'data', type: 'bytes' },
  ]}]
}]

const checkObligationAbi = [{
  name: 'checkObligation', type: 'function', stateMutability: 'view',
  inputs: [
    { name: 'obligation', type: 'tuple', components: [
      { name: 'uid', type: 'bytes32' }, { name: 'schema', type: 'bytes32' },
      { name: 'time', type: 'uint64' }, { name: 'expirationTime', type: 'uint64' },
      { name: 'revocationTime', type: 'uint64' }, { name: 'refUID', type: 'bytes32' },
      { name: 'recipient', type: 'address' }, { name: 'attester', type: 'address' },
      { name: 'revocable', type: 'bool' }, { name: 'data', type: 'bytes' },
    ]},
    { name: 'demand', type: 'bytes' },
    { name: 'fulfilling', type: 'bytes32' },
  ],
  outputs: [{ type: 'bool' }]
}]

const collectAbi = [{
  name: 'collectEscrow', type: 'function', stateMutability: 'nonpayable',
  inputs: [{ name: 'escrow', type: 'bytes32' }, { name: 'fulfillment', type: 'bytes32' }],
  outputs: [{ type: 'bool' }]
}]

async function main() {
  // Get fulfillment attestation
  const fulfillment = await publicClient.readContract({ address: EAS, abi: easAbi, functionName: 'getAttestation', args: [FULFILLMENT_UID] })

  // Get escrow attestation to extract demand
  const escrow = await publicClient.readContract({ address: EAS, abi: easAbi, functionName: 'getAttestation', args: [ESCROW_UID] })

  // Decode demand from escrow
  const [escrowDecoded] = decodeAbiParameters([{ type: 'tuple', components: [
    { name: 'arbiter', type: 'address' }, { name: 'demand', type: 'bytes' },
    { name: 'token', type: 'address' }, { name: 'amount', type: 'uint256' },
  ]}], escrow.data)

  console.log('Calling checkObligation directly...')
  console.log('  fulfillment.uid:', fulfillment.uid)
  console.log('  demand:', escrowDecoded.demand)
  console.log('  fulfilling (escrow.uid):', ESCROW_UID)

  try {
    const result = await publicClient.readContract({
      address: TRUSTED_ORACLE,
      abi: checkObligationAbi,
      functionName: 'checkObligation',
      args: [fulfillment, escrowDecoded.demand, ESCROW_UID],
    })
    console.log('checkObligation result:', result)
  } catch (e) {
    console.log('checkObligation failed:', e.shortMessage || e.message)
  }

  // Also simulate collectEscrow
  console.log('\nSimulating collectEscrow...')
  try {
    const result = await publicClient.simulateContract({
      address: ERC20_ESCROW, abi: collectAbi,
      functionName: 'collectEscrow',
      args: [ESCROW_UID, FULFILLMENT_UID],
      account: WORKER,
    })
    console.log('Simulation passed! Result:', result.result)
  } catch (e) {
    console.log('Simulation failed:', e.shortMessage || e.message)
    console.log('Cause:', e.cause?.reason || e.cause?.shortMessage)
  }
}

main().catch(console.error)

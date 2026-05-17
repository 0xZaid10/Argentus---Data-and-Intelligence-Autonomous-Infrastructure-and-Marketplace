// check-balances.mjs
import { createPublicClient, http, parseAbi } from 'viem'
import { baseSepolia } from 'viem/chains'

const WORKER = '0x282bfBC497Ff777D11fa732e44D8ddC5DB92060E'
const USER = '0xDC4218E0E803FAB93ae65d37FA2e8DdfA8789C85'
const VERIFIER = '0x50a4813f94A4342b3A0712870626f3d043BEb2b6'
const USDC = '0x036CbD53842c5426634e7929541eC2318f3dCF7e'
const ERC20_ESCROW = '0x1Fe964348Ec42D9Bb1A072503ce8b4744266FF43'
const ESCROW_UID = '0x00c8de145e914a093b611b9a454b599bb77c04372ca695aa7e8ddef0a8ce90d5'

const publicClient = createPublicClient({ chain: baseSepolia, transport: http('https://sepolia.base.org') })

const erc20Abi = parseAbi([
  'function balanceOf(address) view returns (uint256)',
])

async function main() {
  const [userBal, workerBal, verifierBal, escrowBal] = await Promise.all([
    publicClient.readContract({ address: USDC, abi: erc20Abi, functionName: 'balanceOf', args: [USER] }),
    publicClient.readContract({ address: USDC, abi: erc20Abi, functionName: 'balanceOf', args: [WORKER] }),
    publicClient.readContract({ address: USDC, abi: erc20Abi, functionName: 'balanceOf', args: [VERIFIER] }),
    publicClient.readContract({ address: USDC, abi: erc20Abi, functionName: 'balanceOf', args: [ERC20_ESCROW] }),
  ])

  console.log('USDC Balances:')
  console.log('  User:           ', Number(userBal) / 1e6, 'USDC')
  console.log('  Worker:         ', Number(workerBal) / 1e6, 'USDC')
  console.log('  Verifier:       ', Number(verifierBal) / 1e6, 'USDC')
  console.log('  Escrow Contract:', Number(escrowBal) / 1e6, 'USDC')
}

main().catch(console.error)

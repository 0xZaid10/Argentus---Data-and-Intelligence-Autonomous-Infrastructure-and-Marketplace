// approve-usdc.mjs
// Approves USDC spending for Alkahest ERC20EscrowObligation on Base Sepolia
// Run: node approve-usdc.mjs

import { createWalletClient, createPublicClient, http, parseAbi } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { baseSepolia } from 'viem/chains'

const PRIVATE_KEY = '0xfd6ab7612897eaa8e81806784be70d9ee6d981c57d5a59e742d389360fba7d09'
const USDC = '0x036CbD53842c5426634e7929541eC2318f3dCF7e'
const ESCROW_CONTRACT = '0x1Fe964348Ec42D9Bb1A072503ce8b4744266FF43'
const AMOUNT = 10_000_000n // 10 USDC (6 decimals)

const account = privateKeyToAccount(PRIVATE_KEY)

const walletClient = createWalletClient({
  account,
  chain: baseSepolia,
  transport: http('https://sepolia.base.org'),
})

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http('https://sepolia.base.org'),
})

const abi = parseAbi([
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function balanceOf(address account) view returns (uint256)',
])

async function main() {
  console.log('Account:', account.address)

  // Check balance
  const balance = await publicClient.readContract({
    address: USDC,
    abi,
    functionName: 'balanceOf',
    args: [account.address],
  })
  console.log('USDC Balance:', Number(balance) / 1e6, 'USDC')

  // Check existing allowance
  const allowance = await publicClient.readContract({
    address: USDC,
    abi,
    functionName: 'allowance',
    args: [account.address, ESCROW_CONTRACT],
  })
  console.log('Current allowance:', Number(allowance) / 1e6, 'USDC')

  if (allowance >= AMOUNT) {
    console.log('✅ Already approved — sufficient allowance')
    return
  }

  // Approve
  console.log('Approving', Number(AMOUNT) / 1e6, 'USDC for escrow contract...')
  const hash = await walletClient.writeContract({
    address: USDC,
    abi,
    functionName: 'approve',
    args: [ESCROW_CONTRACT, AMOUNT],
  })

  console.log('Tx hash:', hash)
  console.log('Waiting for confirmation...')

  const receipt = await publicClient.waitForTransactionReceipt({ hash })
  console.log('✅ Approved! Block:', receipt.blockNumber.toString())
  console.log('Now run the escrow create command.')
}

main().catch(console.error)

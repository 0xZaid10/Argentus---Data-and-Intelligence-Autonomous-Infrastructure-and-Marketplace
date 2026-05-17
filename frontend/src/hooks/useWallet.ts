import { useMemo, useState } from 'react'
import { createWalletClient, custom, type Address } from 'viem'
import { baseSepolia } from 'viem/chains'

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
    }
  }
}

export const useWallet = () => {
  const [address, setAddress] = useState<Address | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)

  const client = useMemo(() => {
    if (typeof window === 'undefined' || !window.ethereum) {
      return null
    }

    return createWalletClient({
      chain: baseSepolia,
      transport: custom(window.ethereum),
    })
  }, [])

  const connect = async () => {
    if (!client || !window.ethereum) {
      setError('No injected wallet detected. Install MetaMask or another EVM wallet.')
      return
    }

    setError(null)
    setIsConnecting(true)

    try {
      await window.ethereum.request({ method: 'eth_requestAccounts' })
      const [nextAddress] = await client.getAddresses()
      setAddress(nextAddress ?? null)
    } catch (walletError) {
      setError(walletError instanceof Error ? walletError.message : 'Wallet connection failed.')
    } finally {
      setIsConnecting(false)
    }
  }

  return {
    address,
    connect,
    error,
    isConnecting,
  }
}

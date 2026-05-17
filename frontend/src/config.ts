export const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:3001'
export const RESEARCH_BASE = import.meta.env.VITE_RESEARCH_BASE ?? 'http://localhost:3000'
export const IPFS_GATEWAY = import.meta.env.VITE_IPFS_GATEWAY ?? 'https://gateway.pinata.cloud/ipfs'
export const BASESCAN_BASE = 'https://sepolia.basescan.org/tx'
export const FILECOIN_EXPLORER = 'https://filfox.info/en/message'

export const CONTRACTS = {
  escrow: '0x1Fe964348Ec42D9Bb1A072503ce8b4744266FF43',
  arbiter: '0x3664b11BcCCeCA27C21BBAB43548961eD14d4D6D',
  usdc: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
} as const

export interface ProofExample {
  task: string
  cid: string
  arbitrate_tx?: string
  collect_tx?: string
  signal: 'bullish' | 'bearish' | 'neutral'
  confidence: number
}

export const PROOF_EXAMPLES: ProofExample[] = [
  {
    task: 'ETH DeFi TVL Analysis',
    cid: 'bafybeiewpvwlcdkh5ycqh6z3uvyi5mii6rus3eqrwvy6n4cfpt53etupdy',
    arbitrate_tx: '0x2acc456df0d96baeb8e5537d78941d8687d3e52cbb6c2a82a029fda260c7a11e',
    collect_tx: '0xf296432625379aac0606aee0dc009d421d5fcb20a533072550006799fb8fafc8',
    signal: 'neutral',
    confidence: 0.58,
  },
  {
    task: 'ETH DeFi Ecosystem Analysis',
    cid: 'bafybeidw7mnxrqefwkdcyumukonh7mm5rngthuehb4rgbcktvlsmvspnl4',
    arbitrate_tx: '0x8c6741c6387ed3ec0eae76449552f0d1cf4be4eefb7b10a5befdff9b7ad92c48',
    collect_tx: '0x949459537b910394dc7ada22213da0786c27917ad32b75187d093d8023ba8bcd',
    signal: 'bearish',
    confidence: 0.45,
  },
  {
    task: 'BTC Whale Accumulation Analysis',
    cid: 'bafybeift4ldyyeoycitlkafm6rsh5ek2tzpeqn3hjza4mkr6tyvxgboka4',
    signal: 'bullish',
    confidence: 0.85,
  },
]

export const APP_COPY = {
  title: 'Argentus',
  subtitle: 'Autonomous Intelligence Infrastructure for the Agentic Economy',
} as const

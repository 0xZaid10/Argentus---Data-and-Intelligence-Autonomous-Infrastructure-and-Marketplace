export const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://104.207.76.143'
export const RESEARCH_BASE = import.meta.env.VITE_RESEARCH_BASE ?? 'http://104.207.76.143/research'
export const IPFS_GATEWAY = import.meta.env.VITE_IPFS_GATEWAY ?? 'https://gateway.pinata.cloud/ipfs'
export const BASESCAN = 'https://sepolia.basescan.org/tx'
export const FILFOX = 'https://filfox.info/en/message'

export const BASESCAN_BASE = BASESCAN
export const FILECOIN_EXPLORER = FILFOX

export const CONTRACTS = {
  escrow: '0x1Fe964348Ec42D9Bb1A072503ce8b4744266FF43',
  arbiter: '0x3664b11BcCCeCA27C21BBAB43548961eD14d4D6D',
  usdc: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
} as const

export interface ProofExample {
  task: string
  cid: string
  arbitrate_tx: string
  collect_tx: string
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
    task: 'BTC Whale Accumulation',
    cid: 'bafybeift4ldyyeoycitlkafm6rsh5ek2tzpeqn3hjza4mkr6tyvxgboka4',
    arbitrate_tx: '0x8c6741c6387ed3ec0eae76449552f0d1cf4be4eefb7b10a5befdff9b7ad92c48',
    collect_tx: '0x949459537b910394dc7ada22213da0786c27917ad32b75187d093d8023ba8bcd',
    signal: 'bullish',
    confidence: 0.85,
  },
  {
    task: 'SOL DeFi Ecosystem',
    cid: 'bafybeidikq7plddqqfdg7r325ezv6ldjif3mnfocho6zraesawthocxh2u',
    arbitrate_tx: '0x11811deeb6c8baa0d6e56a49ff8740442a3b3bcd7b7c55a1dcf801787759ccd1',
    collect_tx: '0xa2864c4c0fb24c0576bca188f7ff52a057e0d5df82b0d5e97af6e0172b9328b7',
    signal: 'neutral',
    confidence: 0.65,
  },
  {
    task: 'Marketplace: SOL TVL',
    cid: 'bafybeic4xkbujppvrn5utvzzcxgyxrxkos2dkkgcsfwyo6rwzecxprzzuu',
    arbitrate_tx: '0x27a279102e30472d4764cd338551a5b6ccc2451ab7fcabbfc398e6f69980e09d',
    collect_tx: '0x72669f1c24875a735173b7d2247dce3db93bf4e55435e94fdde03a8aaf683c8a',
    signal: 'bullish',
    confidence: 0.82,
  },
]

export const APP_COPY = {
  title: 'Argentus',
  subtitle: 'Ask. Verify. Trust.',
} as const

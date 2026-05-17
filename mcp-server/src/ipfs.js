import fetch from 'node-fetch'

const GATEWAYS = [
  'https://ipfs.io/ipfs',
  'https://gateway.pinata.cloud/ipfs',
  'https://cloudflare-ipfs.com/ipfs',
]

// Fetch content from IPFS by CID — tries multiple gateways
export async function fetchFromIPFS(cid, timeoutMs = 15000) {
  for (const gateway of GATEWAYS) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), timeoutMs)

      const res = await fetch(`${gateway}/${cid}`, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      })
      clearTimeout(timeout)

      if (res.ok) {
        const text = await res.text()
        try {
          return { success: true, data: JSON.parse(text), raw: text, gateway }
        } catch {
          return { success: true, data: null, raw: text, gateway }
        }
      }
    } catch {
      continue
    }
  }
  return { success: false, error: `CID ${cid} not accessible on any gateway` }
}

// Check if CID is accessible without fetching full content
export async function checkCIDAccessible(cid, timeoutMs = 10000) {
  for (const gateway of GATEWAYS) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), timeoutMs)
      const res = await fetch(`${gateway}/${cid}`, {
        method: 'HEAD',
        signal: controller.signal,
      })
      clearTimeout(timeout)
      if (res.ok) return { accessible: true, gateway }
    } catch {
      continue
    }
  }
  return { accessible: false }
}

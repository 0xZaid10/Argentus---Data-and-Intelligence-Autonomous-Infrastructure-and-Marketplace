import fetch from 'node-fetch'

const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || 'http://127.0.0.1:18789'
const GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || ''

// Send a message to a specific agent via the OpenClaw gateway
export async function sendToAgent(agentId, message) {
  const res = await fetch(`${GATEWAY_URL}/api/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(GATEWAY_TOKEN ? { Authorization: `Bearer ${GATEWAY_TOKEN}` } : {}),
    },
    body: JSON.stringify({ agentId, message }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Gateway error ${res.status}: ${text}`)
  }

  return res.json()
}

// Get gateway status
export async function getGatewayStatus() {
  try {
    const res = await fetch(`${GATEWAY_URL}/api/status`, {
      headers: GATEWAY_TOKEN ? { Authorization: `Bearer ${GATEWAY_TOKEN}` } : {},
    })
    if (!res.ok) return { online: false }
    const data = await res.json()
    return { online: true, ...data }
  } catch {
    return { online: false }
  }
}

import { API_BASE, RESEARCH_BASE } from '../config'
import {
  DEMO_AGENTS,
  DEMO_LEADERBOARD,
  DEMO_MARKETPLACE_STATS,
  getDemoMarketplaceDetail,
  getDemoReport,
  getDemoTask,
  isDemoMarketplaceRequestId,
  isDemoTaskId,
} from './demo-data'

export interface Task {
  id: string
  description: string
  status: 'pending' | 'in_progress' | 'verifying' | 'completed' | 'failed' | 'rejected'
  type: string
  escrow_uid: string | null
  result_cid: string | null
  fulfillment_uid: string | null
  confidence: number | null
  signal: 'bullish' | 'bearish' | 'neutral' | null
  summary: string | null
  arbitrate_tx: string | null
  collect_tx: string | null
  created_at: string
  updated_at: string
  user_chat_id: string | null
  report_path?: string | null
  report_pdf_path?: string | null
  pdf_path?: string | null
}

export interface MarketplaceRequest {
  id: string
  title: string
  description: string
  category: string
  reward_usdc: number
  escrow_uid: string | null
  requester_address: string | null
  status: 'open' | 'reviewing' | 'completed'
  deadline: string | null
  created_at: string
  submission_count: number
}

export interface MarketplaceSubmission {
  id: string
  request_id: string
  cid: string | null
  raw_content: string | null
  submitter_address: string | null
  fulfillment_uid: string | null
  description: string | null
  status: 'pending' | 'approved' | 'rejected'
  quality_score?: number | null
  reason?: string | null
  arbitrate_tx: string | null
  collect_tx: string | null
  created_at: string
}

export interface ResearchSession {
  sessionId: string
  userId: string
  goal: string
  report: unknown
  summary: string
  confidence_score: number
  smart_money_signal: string
  duration_ms: number
  created_at: string
  cid?: string
}

export interface AgentStatus {
  id: string
  name: string
  status: 'active' | 'idle' | 'error'
  lastSeen: string
  tasksCompleted: number
}

type ServiceName = 'backend' | 'research'

const serviceErrors: Record<ServiceName, string> = {
  backend: 'Service offline. VPS: 104.207.76.143',
  research: 'Service offline. VPS: 104.207.76.143',
}

async function fetchJson<T>(
  url: string,
  init: RequestInit | undefined,
  service: ServiceName,
  timeoutMs = 5_000,
): Promise<T> {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
    })

    if (!response.ok) {
      const payload = await response.text()
      throw new Error(payload || `${response.status} ${response.statusText}`)
    }

    return response.json() as Promise<T>
  } catch (error) {
    if (
      error instanceof Error &&
      (error.name === 'AbortError' || /Failed to fetch|NetworkError|ERR_CONNECTION_REFUSED/i.test(error.message))
    ) {
      throw new Error(serviceErrors[service])
    }

    if (error instanceof Error && error.message.startsWith('{')) {
      throw new Error(serviceErrors[service])
    }

    throw error
  } finally {
    window.clearTimeout(timeout)
  }
}

export const fetchTasks = async (status?: string): Promise<Task[]> => {
  const url = status ? `${API_BASE}/api/tasks?status=${status}` : `${API_BASE}/api/tasks/active`
  const data = await fetchJson<{ tasks?: Task[] } | Task[]>(url, undefined, 'backend')
  return Array.isArray(data) ? data : data.tasks ?? []
}

export const fetchTask = async (id: string): Promise<Task> =>
  (isDemoTaskId(id) ? Promise.resolve(getDemoTask(id)!) : fetchJson<Task>(`${API_BASE}/api/tasks/${id}`, undefined, 'backend'))

export const createTask = async (description: string): Promise<Task> =>
  fetchJson<Task>(
    `${API_BASE}/api/tasks`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description, user_chat_id: null }),
    },
    'backend',
    8_000,
  )

export const fetchMarketplaceRequests = async (status = 'open'): Promise<MarketplaceRequest[]> => {
  const data = await fetchJson<{ requests?: MarketplaceRequest[] }>(
    `${API_BASE}/api/marketplace/requests?status=${status}`,
    undefined,
    'backend',
  )

  return data.requests ?? []
}

export const fetchMarketplaceRequest = async (
  id: string,
): Promise<{ request: MarketplaceRequest; submissions: MarketplaceSubmission[] }> =>
  (isDemoMarketplaceRequestId(id)
    ? Promise.resolve(getDemoMarketplaceDetail(id)!)
    : fetchJson(`${API_BASE}/api/marketplace/requests/${id}`, undefined, 'backend'))

export const createMarketplaceRequest = async (payload: {
  title: string
  description: string
  category: string
  reward_usdc: number
  requester_address?: string
  deadline?: string
}): Promise<MarketplaceRequest> => {
  const data = await fetchJson<{ request: MarketplaceRequest }>(
    `${API_BASE}/api/marketplace/requests`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    'backend',
    8_000,
  )

  return data.request
}

export const submitMarketplaceSubmission = async (payload: {
  request_id: string
  cid?: string
  raw_content?: string
  submitter_address?: string
  description?: string
}): Promise<MarketplaceSubmission> => {
  const data = await fetchJson<{ submission: MarketplaceSubmission }>(
    `${API_BASE}/api/marketplace/submit`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    'backend',
    8_000,
  )

  return data.submission
}

export const fetchMarketplaceStats = async () =>
  fetchJson<{
    open_requests: number
    total_requests: number
    total_submissions: number
    approved_submissions: number
    total_rewarded_usdc: number
  }>(`${API_BASE}/api/marketplace/stats`, undefined, 'backend')

export const fetchLeaderboard = async () => {
  const data = await fetchJson<{ leaderboard?: Array<Record<string, unknown>> }>(
    `${API_BASE}/api/marketplace/leaderboard`,
    undefined,
    'backend',
  )

  return data.leaderboard ?? []
}

export const runResearch = async (goal: string, userId = 'web-user'): Promise<ResearchSession> =>
  fetchJson<ResearchSession>(
    `${RESEARCH_BASE}/api/research/sync`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ goal, userId }),
    },
    'research',
    180_000,
  )

export const fetchRecentSessions = async (userId = 'web-user'): Promise<ResearchSession[]> => {
  const data = await fetchJson<{ sessions?: ResearchSession[] }>(
    `${RESEARCH_BASE}/api/research/sessions/${userId}`,
    undefined,
    'research',
  )

  return data.sessions ?? []
}

export const fetchAgentStatus = async (): Promise<AgentStatus[]> => {
  const data = await fetchJson<{ agents?: AgentStatus[] } | AgentStatus[]>(
    `${API_BASE}/api/agents`,
    undefined,
    'backend',
  )

  return Array.isArray(data) ? data : data.agents ?? []
}

export const fetchStats = async () => {
  const [tasks, marketplace] = await Promise.all([
    fetch(`${API_BASE}/api/tasks/active`)
      .then((response) => response.json())
      .catch(() => ({ tasks: [] })),
    fetchMarketplaceStats().catch(() => DEMO_MARKETPLACE_STATS),
  ])

  return {
    activeTasks: tasks.tasks?.length ?? 0,
    ...marketplace,
  }
}

export const fetchIpfsReport = async <T>(cid: string, gateway: string): Promise<T> => {
  const demoReport = getDemoReport(cid)
  if (demoReport) {
    return demoReport as T
  }

  try {
    const response = await fetch(`${gateway}/${cid}`)
    if (!response.ok) {
      throw new Error('IPFS response not ok')
    }

    return response.json() as Promise<T>
  } catch {
    throw new Error(`Report on Filecoin. Try: ipfs.io/ipfs/${cid}`)
  }
}

export const fetchRequests = fetchMarketplaceRequests
export const fetchRequest = fetchMarketplaceRequest
export const createRequest = createMarketplaceRequest
export const submitToMarketplace = submitMarketplaceSubmission

export const getDemoDefaults = () => ({
  agents: DEMO_AGENTS,
  leaderboard: DEMO_LEADERBOARD,
  marketplaceStats: DEMO_MARKETPLACE_STATS,
})

// ─── Research Session ─────────────────────────────────────────────────────────

export type SessionStatus = 'running' | 'completed' | 'failed';

export interface ResearchSession {
  id: string;
  userId: string;
  goal: string;
  status: SessionStatus;
  createdAt: string;
  completedAt?: string;
  results?: unknown;
  summary?: string;
}

// ─── Memory Entry ─────────────────────────────────────────────────────────────

export interface MemoryEntry {
  key: string;
  value: unknown;
  storedAt: string;
}

// ─── User Profile ─────────────────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  company?: string;
  industry?: string;
  competitors?: string[];
  researchGoals?: string[];
  createdAt: string;
  updatedAt: string;
}

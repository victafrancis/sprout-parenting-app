import type { ApiResponse } from '@/lib/types/api'
import type {
  AuthStatusResponse,
  ChildProfile,
  CreateDailyLogResponse,
  CreateDailyLogInput,
  DailyLogEntry,
  ProfileUpdateCandidates,
  WeeklyPlanMarkdownPayload,
} from '@/lib/types/domain'

async function fetchJson<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    cache: 'no-store',
  })

  const payload = (await response.json()) as ApiResponse<T>

  if (!response.ok || payload.error) {
    const message = payload.error?.message || 'Request failed'
    throw new Error(message)
  }

  return payload
}

export async function getProfile(childId = 'Yumi') {
  const payload = await fetchJson<ChildProfile>(`/api/v1/profile?childId=${encodeURIComponent(childId)}`)
  return payload.data
}

export async function getDailyLogs(params?: {
  childId?: string
  limit?: number
  cursor?: string
}) {
  const search = new URLSearchParams()
  search.set('childId', params?.childId || 'Yumi')
  search.set('limit', String(params?.limit ?? 20))
  if (params?.cursor) {
    search.set('cursor', params.cursor)
  }

  const payload = await fetchJson<DailyLogEntry[]>(`/api/v1/daily-logs?${search.toString()}`)
  return {
    items: payload.data,
    nextCursor: payload.meta?.nextCursor || null,
  }
}

export async function createDailyLog(input: CreateDailyLogInput) {
  const payload = await fetchJson<CreateDailyLogResponse>('/api/v1/daily-logs', {
    method: 'POST',
    body: JSON.stringify(input),
  })

  return payload.data
}

export async function updateProfileWithCandidates(input: {
  childId: string
  selectedCandidates: ProfileUpdateCandidates
}) {
  const payload = await fetchJson<ChildProfile>('/api/v1/profile', {
    method: 'PATCH',
    body: JSON.stringify({
      childId: input.childId,
      milestones: input.selectedCandidates.milestones.map((candidate) => candidate.value),
      activeSchemas: input.selectedCandidates.activeSchemas.map((candidate) => candidate.value),
      interests: input.selectedCandidates.interests.map((candidate) => candidate.value),
    }),
  })

  return payload.data
}

export async function getWeeklyPlan(params?: { childId?: string; objectKey?: string }) {
  const search = new URLSearchParams()
  search.set('childId', params?.childId || 'Yumi')
  if (params?.objectKey) {
    search.set('objectKey', params.objectKey)
  }

  const payload = await fetchJson<WeeklyPlanMarkdownPayload>(
    `/api/v1/weekly-plan?${search.toString()}`,
  )

  return payload.data
}

export async function getAuthStatus() {
  const payload = await fetchJson<AuthStatusResponse>('/api/auth/status')
  return payload.data
}

export async function loginWithPasscode(input: {
  passcode: string
  rememberMe: boolean
}) {
  const payload = await fetchJson<AuthStatusResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(input),
  })

  return payload.data
}

export async function enableDemoMode() {
  const payload = await fetchJson<AuthStatusResponse>('/api/auth/demo', {
    method: 'POST',
  })

  return payload.data
}

export async function logout() {
  const payload = await fetchJson<AuthStatusResponse>('/api/auth/logout', {
    method: 'POST',
  })

  return payload.data
}

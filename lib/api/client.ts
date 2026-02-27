import type { ApiResponse } from '@/lib/types/api'
import type {
  AcceptDailyLogCandidatesResponse,
  AuthStatusResponse,
  ChildProfile,
  CreateDailyLogResponse,
  CreateDailyLogInput,
  DailyLogEntry,
  ProfileUpdateCandidates,
  RemovableProfileField,
  WeeklyPlanMarkdownPayload,
} from '@/lib/types/domain'

function buildNonJsonErrorMessage(url: string, status: number, bodyText: string) {
  const trimmedBody = bodyText.trim()
  const isHtmlResponse =
    trimmedBody.startsWith('<!DOCTYPE') || trimmedBody.startsWith('<html')

  if (isHtmlResponse) {
    return `Request failed: ${url} returned ${status} with HTML instead of JSON. This usually means the API route is unavailable.`
  }

  if (trimmedBody.length === 0) {
    return `Request failed: ${url} returned ${status} with an empty response body.`
  }

  return `Request failed: ${url} returned ${status} with a non-JSON response.`
}

async function fetchJson<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    cache: 'no-store',
  })

  const responseText = await response.text()
  const contentType = response.headers.get('content-type') || ''
  const shouldParseAsJson =
    contentType.includes('application/json') ||
    responseText.trim().startsWith('{') ||
    responseText.trim().startsWith('[')

  if (!shouldParseAsJson) {
    throw new Error(buildNonJsonErrorMessage(url, response.status, responseText))
  }

  let payload: ApiResponse<T>

  try {
    payload = JSON.parse(responseText) as ApiResponse<T>
  } catch {
    throw new Error(
      `Request failed: ${url} returned invalid JSON (status ${response.status}).`,
    )
  }

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

export async function acceptDailyLogCandidates(input: {
  childId: string
  storageKey: string
  selectedCandidates: ProfileUpdateCandidates
}) {
  const payload = await fetchJson<AcceptDailyLogCandidatesResponse>('/api/v1/daily-logs', {
    method: 'PATCH',
    body: JSON.stringify({
      childId: input.childId,
      storageKey: input.storageKey,
      milestones: input.selectedCandidates.milestones.map((candidate) => candidate.value),
      activeSchemas: input.selectedCandidates.activeSchemas.map((candidate) => candidate.value),
      interests: input.selectedCandidates.interests.map((candidate) => candidate.value),
    }),
  })

  return payload.data
}

export async function removeProfileValue(input: {
  childId: string
  field: RemovableProfileField
  value: string
}) {
  const payload = await fetchJson<ChildProfile>('/api/v1/profile', {
    method: 'DELETE',
    body: JSON.stringify({
      childId: input.childId,
      field: input.field,
      value: input.value,
    }),
  })

  return payload.data
}

export async function deleteDailyLog(input: {
  childId: string
  storageKey: string
}) {
  await fetchJson<{ success: boolean }>('/api/v1/daily-logs', {
    method: 'DELETE',
    body: JSON.stringify({
      childId: input.childId,
      storageKey: input.storageKey,
    }),
  })
}

export async function updateDailyLogNote(input: {
  childId: string
  storageKey: string
  rawText: string
}) {
  await fetchJson<{ success: boolean }>('/api/v1/daily-logs', {
    method: 'PATCH',
    body: JSON.stringify({
      action: 'edit-note',
      childId: input.childId,
      storageKey: input.storageKey,
      rawText: input.rawText,
    }),
  })
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
